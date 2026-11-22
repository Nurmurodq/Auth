import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { friendlyAuthError } from '../../services/auth/auth-backend';
import { CatalogService } from '../../services/catalog.service';
import { LibraryService } from '../../services/library.service';
import { READER_FONTS, READER_THEMES, ReaderSettingsService } from '../../services/reader-settings.service';
import { ThemePreference, ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { BookCoverComponent } from '../../shared/book-cover.component';
import { IconComponent } from '../../shared/icon.component';
import { MOODS, occupation } from '../../models/profile-options';
import { formatDate, formatDuration, initials } from '../../utils/format';
import { MIN_PASSWORD_LENGTH, passwordsMatch } from '../../utils/password';

@Component({
  selector: 'app-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, BookCoverComponent],
  templateUrl: './account.page.html',
  styleUrl: './account.page.css',
})
export class AccountPage {
  protected readonly auth = inject(AuthService);
  protected readonly library = inject(LibraryService);
  protected readonly theme = inject(ThemeService);
  private readonly catalog = inject(CatalogService);
  private readonly readerSettings = inject(ReaderSettingsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly confirmDialog = viewChild.required<ElementRef<HTMLDialogElement>>('confirmDialog');

  protected readonly user = this.auth.user;
  protected readonly userInitials = computed(() => initials(this.user()?.name ?? ''));
  protected readonly memberSince = computed(() => (this.user() ? formatDate(this.user()!.createdAt) : ''));
  protected readonly stats = this.library.stats;
  protected readonly goal = computed(() => this.library.data().dailyGoal);
  protected readonly goalOptions = [10, 15, 20, 30, 45, 60, 90];

  protected readonly todayMinutes = computed(() => Math.floor(this.stats().todaySeconds / 60));
  protected readonly goalProgress = computed(() => Math.min(1, this.stats().todaySeconds / 60 / this.goal()));
  protected readonly ring = computed(() => {
    const r = 52;
    const c = 2 * Math.PI * r;
    return { r, c, offset: c * (1 - this.goalProgress()) };
  });

  protected readonly chart = computed(() => {
    const days = this.stats().days;
    const max = Math.max(this.goal() * 60, ...days.map((d) => d.seconds));
    return days.map((d, i) => ({
      ...d,
      minutes: Math.round(d.seconds / 60),
      height: max ? Math.max(d.seconds ? 4 : 0, (d.seconds / max) * 100) : 0,
      today: i === days.length - 1,
      metGoal: d.seconds >= this.goal() * 60,
    }));
  });
  protected readonly goalLine = computed(() => {
    const days = this.stats().days;
    const max = Math.max(this.goal() * 60, ...days.map((d) => d.seconds));
    return max ? ((this.goal() * 60) / max) * 100 : 0;
  });

  protected readonly tiles = computed(() => {
    const s = this.stats();
    return [
      { icon: 'flame' as const, label: 'Day streak', value: String(s.streak), hint: s.streak === 1 ? 'day' : 'days' },
      { icon: 'clock' as const, label: 'This week', value: formatDuration(s.weekSeconds / 60), hint: '' },
      { icon: 'book-open' as const, label: 'In progress', value: String(s.inProgress), hint: s.inProgress === 1 ? 'book' : 'books' },
      { icon: 'trophy' as const, label: 'Finished', value: String(s.finished), hint: s.finished === 1 ? 'book' : 'books' },
      { icon: 'bookmark' as const, label: 'Bookmarks', value: String(this.library.bookmarks().length), hint: '' },
      { icon: 'sparkles' as const, label: 'All-time reading', value: formatDuration(s.totalSeconds / 60), hint: '' },
    ];
  });

  protected readonly recentlyFinished = computed(() =>
    this.library
      .shelf('finished')
      .slice(0, 6)
      .map((e) => this.catalog.get(e.bookId))
      .filter((b) => !!b),
  );

  protected readonly readerSummary = computed(() => {
    const s = this.readerSettings.settings();
    const theme = READER_THEMES.find((t) => t.id === s.theme)?.label;
    const font = READER_FONTS.find((f) => f.id === s.font)?.label;
    return `${theme} theme · ${font} ${s.fontSize}px · ${s.mode === 'paged' ? 'Pages' : 'Scrolling'}`;
  });

  protected readonly interests = computed(() => {
    const p = this.library.profile();
    if (!p) return null;
    const occ = occupation(p.occupation);
    const genres = p.genres.map((g) => this.catalog.genre(g)?.name ?? g);
    const moods = p.moods.map((m) => MOODS.find((x) => x.id === m)?.label ?? m);
    return { occupation: occ ? `${occ.emoji} ${occ.label}` : null, genres, moods };
  });

  protected readonly themeOptions: { id: ThemePreference; label: string; icon: 'sun' | 'moon' | 'monitor' }[] = [
    { id: 'light', label: 'Light', icon: 'sun' },
    { id: 'dark', label: 'Dark', icon: 'moon' },
    { id: 'system', label: 'System', icon: 'monitor' },
  ];

  /* Profile */
  protected readonly editingName = signal(false);
  protected readonly savingName = signal(false);
  protected readonly nameForm = this.fb.group({ name: ['', [Validators.required, Validators.maxLength(80)]] });

  /* Password */
  protected readonly minLength = MIN_PASSWORD_LENGTH;
  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly passwordSubmitted = signal(false);
  protected readonly passwordForm = this.fb.group(
    {
      current: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected startEditName(): void {
    this.nameForm.setValue({ name: this.user()?.name ?? '' });
    this.editingName.set(true);
  }

  protected async saveName(): Promise<void> {
    if (this.nameForm.invalid) return;
    this.savingName.set(true);
    try {
      await this.auth.updateProfile({ name: this.nameForm.getRawValue().name });
      this.editingName.set(false);
      this.toast.success('Name updated');
    } catch (err) {
      this.toast.error(friendlyAuthError(err));
    } finally {
      this.savingName.set(false);
    }
  }

  protected setGoal(value: string): void {
    this.library.setDailyGoal(Number(value));
    this.toast.success(`Daily goal set to ${value} minutes`);
  }

  protected resetReader(): void {
    this.readerSettings.reset();
    this.toast.success('Reading appearance reset to defaults');
  }

  protected passwordFieldError(name: 'current' | 'password' | 'confirm'): boolean {
    const c = this.passwordForm.controls[name];
    return c.invalid && (c.touched || this.passwordSubmitted());
  }

  protected passwordMismatch(): boolean {
    return !!this.passwordForm.errors?.['mismatch'] && (this.passwordForm.controls.confirm.touched || this.passwordSubmitted());
  }

  protected async changePassword(): Promise<void> {
    this.passwordSubmitted.set(true);
    this.passwordError.set(null);
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    try {
      const { current, password } = this.passwordForm.getRawValue();
      await this.auth.changePassword(current, password);
      this.passwordForm.reset();
      this.passwordSubmitted.set(false);
      this.toast.success('Password changed');
    } catch (err) {
      this.passwordError.set(friendlyAuthError(err));
    } finally {
      this.savingPassword.set(false);
    }
  }

  protected exportData(): void {
    const blob = new Blob([this.library.exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `folio-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.toast.success('Your data was downloaded');
  }

  protected askClearHistory(): void {
    this.confirmDialog().nativeElement.showModal();
  }

  protected confirmClear(): void {
    this.library.clearHistory();
    this.confirmDialog().nativeElement.close();
    this.toast.show('Reading history cleared');
  }

  protected closeConfirm(): void {
    this.confirmDialog().nativeElement.close();
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    this.toast.show('You’ve been signed out. See you soon.');
    void this.router.navigate(['/']);
  }
}
