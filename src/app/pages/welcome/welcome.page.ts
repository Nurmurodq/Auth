import { ChangeDetectionStrategy, Component, OnInit, WritableSignal, computed, inject, input, signal } from '@angular/core';
import { t } from '../../i18n/i18n';
import { LanguageSwitcherComponent } from '../../i18n/language-switcher.component';
import { Router, RouterLink } from '@angular/router';
import { safeReturnUrl } from '../../guards';
import { GOALS, LENGTH_PREFS, LEVEL_PREFS, MOODS, OCCUPATIONS } from '../../models/profile-options';
import { GoalId, MoodId, OccupationId, ReadingProfile } from '../../models/user.model';
import { AuthService } from '../../services/auth/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { LibraryService } from '../../services/library.service';
import { recommend } from '../../services/recommendations';
import { ToastService } from '../../services/toast.service';
import { BookCoverComponent } from '../../shared/book-cover.component';
import { IconComponent } from '../../shared/icon.component';
import { LogoComponent } from '../../shared/logo.component';

type Step = 0 | 1 | 2 | 3 | 4;

@Component({
  selector: 'app-welcome',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BookCoverComponent, IconComponent, LogoComponent, LanguageSwitcherComponent],
  templateUrl: './welcome.page.html',
  styleUrl: './welcome.page.css',
})
export class WelcomePage implements OnInit {
  protected readonly t = t;
  private readonly auth = inject(AuthService);
  private readonly library = inject(LibraryService);
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly returnUrl = input<string>();
  readonly new = input<string>();

  protected readonly occupations = OCCUPATIONS;
  protected readonly goalOptions = GOALS;
  protected readonly moodOptions = MOODS;
  protected readonly lengthOptions = LENGTH_PREFS;
  protected readonly levelOptions = LEVEL_PREFS;
  protected readonly goalMinutes = [10, 20, 30, 45, 60];
  /** Genre tiles, each illustrated with a different book's cover. */
  protected readonly genreOptions = (() => {
    const used = new Set<string>();
    return this.catalog.genres.map((g) => {
      const books = this.catalog.byGenre(g.id);
      const cover = books.find((b) => b.genres[0] === g.id && !used.has(b.id)) ?? books.find((b) => !used.has(b.id)) ?? books[0];
      if (cover) used.add(cover.id);
      return { genre: g, cover };
    });
  })();

  protected readonly step = signal<Step>(0);
  protected readonly occupation = signal<OccupationId | null>(null);
  protected readonly goals = signal<GoalId[]>([]);
  protected readonly genres = signal<string[]>([]);
  protected readonly moods = signal<MoodId[]>([]);
  protected readonly length = signal<ReadingProfile['length']>('any');
  protected readonly level = signal<ReadingProfile['level']>('any');
  protected readonly dailyGoal = signal(20);
  protected readonly editing = signal(false);

  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? t('welcome.reader'));
  protected readonly canContinue = computed(() => (this.step() === 2 ? this.genres().length > 0 : true));
  protected readonly progress = computed(() => (Math.min(this.step(), 4) / 4) * 100);

  protected readonly picks = computed(() => {
    if (this.step() !== 4) return [];
    const draft = this.draft();
    const data = this.library.data();
    return recommend(this.catalog.books, this.catalog.genres, { ...draft, completedAt: '', updatedAt: '' }, data, 6);
  });

  ngOnInit(): void {
    const existing = this.library.profile();
    if (existing) {
      this.editing.set(true);
      this.occupation.set(existing.occupation);
      this.goals.set([...existing.goals]);
      this.genres.set([...existing.genres]);
      this.moods.set([...existing.moods]);
      this.length.set(existing.length);
      this.level.set(existing.level);
    }
    this.dailyGoal.set(this.library.data().dailyGoal || 20);
  }

  protected pickOccupation(id: OccupationId): void {
    this.occupation.set(this.occupation() === id ? null : id);
  }

  private toggle<T extends string>(list: WritableSignal<T[]>, id: T): void {
    const cur = list();
    list.set(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  protected toggleGoal(id: GoalId): void {
    this.toggle(this.goals, id);
  }

  protected toggleGenre(id: string): void {
    this.toggle(this.genres, id);
  }

  protected toggleMood(id: MoodId): void {
    this.toggle(this.moods, id);
  }

  protected next(): void {
    if (!this.canContinue()) return;
    if (this.step() === 3) {
      this.library.saveProfile(this.draft(), this.dailyGoal());
    }
    this.step.set(Math.min(4, this.step() + 1) as Step);
    this.focusHeading();
  }

  protected back(): void {
    this.step.set(Math.max(0, this.step() - 1) as Step);
    this.focusHeading();
  }

  protected finish(): void {
    this.toast.success(this.editing() ? t('welcome.updated') : t('welcome.done'));
    void this.router.navigateByUrl(this.destination());
  }

  protected skip(): void {
    void this.router.navigateByUrl(this.destination());
  }

  protected destination(): string {
    return safeReturnUrl(this.returnUrl(), '/');
  }

  private draft(): Omit<ReadingProfile, 'updatedAt' | 'completedAt'> {
    return {
      occupation: this.occupation(),
      goals: this.goals(),
      genres: this.genres(),
      moods: this.moods(),
      length: this.length(),
      level: this.level(),
    };
  }

  private focusHeading(): void {
    queueMicrotask(() => requestAnimationFrame(() => document.getElementById('step-title')?.focus()));
  }
}
