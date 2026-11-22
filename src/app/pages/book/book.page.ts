import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WORDS_PER_MINUTE } from '../../config';
import { TocChapter } from '../../models/book.model';
import { BookContentService } from '../../services/book-content.service';
import { CatalogService } from '../../services/catalog.service';
import { LibraryService } from '../../services/library.service';
import { ToastService } from '../../services/toast.service';
import { BookCoverComponent } from '../../shared/book-cover.component';
import { BookShelfComponent } from '../../shared/book-shelf.component';
import { IconComponent } from '../../shared/icon.component';
import { ShelfMenuComponent } from '../../shared/shelf-menu.component';
import {
  easeLabel,
  estimatePages,
  formatDuration,
  formatNumber,
  formatPercent,
  formatReadingTime,
  formatRelative,
  formatYear,
  readingMinutes,
} from '../../utils/format';

const LANGUAGES: Record<string, string> = { 'en-GB': 'English (British)', 'en-US': 'English (American)', en: 'English' };
const TOC_PREVIEW = 10;

interface TocRow extends TocChapter {
  index: number;
  minutes: number;
  status: 'read' | 'current' | 'unread';
  showPart: boolean;
}

@Component({
  selector: 'app-book-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BookCoverComponent, BookShelfComponent, IconComponent, ShelfMenuComponent],
  templateUrl: './book.page.html',
  styleUrl: './book.page.css',
})
export class BookPage {
  private readonly catalog = inject(CatalogService);
  private readonly content = inject(BookContentService);
  protected readonly library = inject(LibraryService);
  private readonly toast = inject(ToastService);

  readonly id = input.required<string>();

  protected readonly book = computed(() => this.catalog.get(this.id()));
  protected readonly toc = signal<TocChapter[] | null>(null);
  protected readonly description = signal<string | null>(null);
  protected readonly tocError = signal(false);
  protected readonly tocExpanded = signal(false);
  protected readonly descExpanded = signal(false);

  protected readonly progress = computed(() => this.library.data().progress[this.id()]);
  protected readonly entry = computed(() => this.library.data().library[this.id()]);
  protected readonly isFavorite = computed(() => !!this.entry()?.favorite);
  protected readonly bookmarks = computed(() => {
    void this.library.data();
    return this.library.bookmarksFor(this.id());
  });

  protected readonly genres = computed(() => (this.book()?.genres ?? []).map((g) => this.catalog.genre(g)).filter((g) => !!g));
  protected readonly moreByAuthor = computed(() => {
    const b = this.book();
    return b ? this.catalog.byAuthor(b.authorId, b.id) : [];
  });
  protected readonly related = computed(() => {
    const b = this.book();
    return b ? this.catalog.related(b, 12) : [];
  });

  protected readonly readLabel = computed(() => {
    const p = this.progress();
    if (this.entry()?.shelf === 'finished' || (p && p.percent >= 0.995)) return 'Read again';
    if (p && p.percent > 0) return `Continue reading`;
    return 'Start reading';
  });

  protected readonly readLink = computed(() => {
    const restart = this.readLabel() === 'Read again';
    return { commands: ['/read', this.id()], query: restart ? { chapter: 0 } : {} };
  });

  protected readonly stats = computed(() => {
    const b = this.book();
    if (!b) return [];
    return [
      { label: 'Published', value: formatYear(b.year) },
      { label: 'Length', value: `${formatNumber(estimatePages(b.words))} pages` },
      { label: 'Reading time', value: formatReadingTime(b.words) },
      { label: b.genres.includes('poetry') ? 'Sections' : 'Chapters', value: String(b.chapters) },
      { label: 'Level', value: easeLabel(b.readingEase) },
    ];
  });

  protected readonly progressSummary = computed(() => {
    const b = this.book();
    const p = this.progress();
    if (!b || !p) return '';
    const left = (b.words * (1 - p.percent)) / WORDS_PER_MINUTE;
    return `${formatPercent(p.percent)} complete · ${formatDuration(left)} left · last read ${formatRelative(p.updatedAt)}`;
  });

  protected readonly tocRows = computed<TocRow[]>(() => {
    const toc = this.toc();
    if (!toc) return [];
    const current = this.progress()?.chapter ?? -1;
    return toc.map((c, index) => ({
      ...c,
      index,
      minutes: readingMinutes(c.words),
      status: index < current ? 'read' : index === current ? 'current' : 'unread',
      showPart: !!c.part && c.part !== toc[index - 1]?.part,
    }));
  });

  protected readonly visibleToc = computed(() => (this.tocExpanded() ? this.tocRows() : this.tocRows().slice(0, TOC_PREVIEW)));
  protected readonly language = computed(() => LANGUAGES[this.book()?.language ?? 'en'] ?? this.book()?.language);

  constructor() {
    effect((onCleanup) => {
      const id = this.id();
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.toc.set(null);
      this.description.set(null);
      this.tocError.set(false);
      this.tocExpanded.set(false);
      this.descExpanded.set(false);
      if (!this.catalog.get(id)) return;
      this.content
        .toc(id)
        .then((t) => {
          if (cancelled) return;
          this.toc.set(t.chapters);
          this.description.set(t.description ?? '');
        })
        .catch(() => !cancelled && this.tocError.set(true));
    });
  }

  protected toggleFavorite(): void {
    const b = this.book();
    if (!b || !this.library.requireAccount('Sign in to save favourites.')) return;
    const fav = this.library.toggleFavorite(b.id);
    this.toast.show(fav ? 'Added to favourites' : 'Removed from favourites');
  }

  protected async share(): Promise<void> {
    const b = this.book();
    if (!b) return;
    const url = location.href;
    const data = { title: `${b.title} by ${b.author}`, text: b.tagline, url };
    try {
      if (navigator.share && navigator.canShare?.(data)) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      this.toast.success('Link copied to clipboard');
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') this.toast.error('Couldn’t share this link. Try copying it from the address bar.');
    }
  }

  protected removeBookmark(id: string): void {
    const removed = this.library.removeBookmark(id);
    if (removed) this.toast.show('Bookmark removed', { action: { label: 'Undo', run: () => this.library.restoreBookmark(removed) } });
  }

  protected chapterTitle(index: number): string {
    return this.toc()?.[index]?.title ?? `Chapter ${index + 1}`;
  }

  protected relative(iso: string): string {
    return formatRelative(iso);
  }

  protected percent(n: number): string {
    return formatPercent(n);
  }
}
