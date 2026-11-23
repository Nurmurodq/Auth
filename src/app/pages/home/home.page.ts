import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { t } from '../../i18n/i18n';
import { RouterLink } from '@angular/router';
import { BookRecord } from '../../models/book.model';
import { AuthService } from '../../services/auth/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { LibraryService } from '../../services/library.service';
import { RecommendationService } from '../../services/recommendation.service';
import { READER_FONTS, READER_THEMES, ReaderFont, ReaderSettingsService, ReaderTheme } from '../../services/reader-settings.service';
import { BookCoverComponent } from '../../shared/book-cover.component';
import { BookShelfComponent } from '../../shared/book-shelf.component';
import { IconComponent } from '../../shared/icon.component';
import { CountUpDirective } from '../../shared/motion/count-up.directive';
import { ParallaxDirective } from '../../shared/motion/parallax.directive';
import { RevealDirective } from '../../shared/motion/reveal.directive';
import { SpotlightDirective } from '../../shared/motion/spotlight.directive';
import { WORDS_PER_MINUTE } from '../../config';
import { formatDuration, formatNumber, formatPercent } from '../../utils/format';

interface ContinueItem {
  book: BookRecord;
  percent: number;
  chapter: number;
  minutesLeft: number;
}

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BookCoverComponent, BookShelfComponent, IconComponent, CountUpDirective, ParallaxDirective, RevealDirective, SpotlightDirective],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
})
export class HomePage {
  protected readonly t = t;
  protected readonly catalog = inject(CatalogService);
  protected readonly auth = inject(AuthService);
  private readonly library = inject(LibraryService);
  protected readonly readerSettings = inject(ReaderSettingsService);
  protected readonly recs = inject(RecommendationService);

  protected readonly forYouBooks = computed(() => this.recs.forYou().map((r) => r.book));
  protected readonly forYouNotes = computed(() => Object.fromEntries(this.recs.forYou().map((r) => [r.book.id, r.reason])));

  protected readonly heroBooks = ['the-great-gatsby', 'pride-and-prejudice', 'dracula', 'alices-adventures-in-wonderland', 'the-picture-of-dorian-gray']
    .map((id) => this.catalog.get(id))
    .filter((b): b is BookRecord => !!b);

  protected readonly picks = this.catalog.picks();
  protected readonly shelves = this.catalog.shelves();
  protected readonly genres = this.catalog.genres.map((genre) => ({ genre, books: this.catalog.byGenre(genre.id).slice(0, 3) }));
  protected readonly themes = READER_THEMES;
  protected readonly fonts = READER_FONTS.slice(0, 4);
  protected readonly quoteBook = this.catalog.get('pride-and-prejudice');

  private readonly millionsOfWords = Math.round(this.catalog.books.reduce((s, b) => s + b.words, 0) / 1_000_000);
  private readonly whole = (n: number) => formatNumber(Math.round(n));
  private readonly millions = (n: number) => t('home.statWordsValue', { n: Math.round(n) });
  protected readonly stats = computed(() => [
    { id: 'books', count: this.catalog.books.length, format: this.whole, label: t('home.statBooks', { count: this.catalog.books.length }) },
    { id: 'genres', count: this.catalog.genres.length, format: this.whole, label: t('home.statGenres', { count: this.catalog.genres.length }) },
    { id: 'words', count: this.millionsOfWords, format: this.millions, label: t('home.statWords') },
    { id: 'ads', count: 0, format: this.whole, label: t('home.statAds') },
  ]);

  protected readonly continueReading = computed<ContinueItem[]>(() =>
    this.library
      .continueReading()
      .map((p) => {
        const book = this.catalog.get(p.bookId);
        return book ? { book, percent: p.percent, chapter: p.chapter, minutesLeft: (book.words * (1 - p.percent)) / WORDS_PER_MINUTE } : null;
      })
      .filter((x): x is ContinueItem => !!x)
      .slice(0, 4),
  );

  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');

  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    return t(h < 5 ? 'home.evening' : h < 12 ? 'home.morning' : h < 18 ? 'home.afternoon' : 'home.evening');
  });

  protected readonly previewTheme = computed(() => READER_THEMES.find((t) => t.id === this.readerSettings.settings().theme) ?? READER_THEMES[0]);
  protected readonly previewFont = computed(() => READER_FONTS.find((f) => f.id === this.readerSettings.settings().font) ?? READER_FONTS[0]);

  protected setTheme(id: ReaderTheme): void {
    this.readerSettings.update({ theme: id });
  }

  protected setFont(id: ReaderFont): void {
    this.readerSettings.update({ font: id });
  }

  protected percent(n: number): string {
    return formatPercent(n);
  }

  protected duration(minutes: number): string {
    return formatDuration(minutes);
  }

  protected number(n: number): string {
    return formatNumber(n);
  }
}
