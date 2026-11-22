import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BookRecord } from '../../models/book.model';
import { Bookmark, LibraryEntry, Shelf } from '../../models/user.model';
import { AuthService } from '../../services/auth/auth.service';
import { BookContentService } from '../../services/book-content.service';
import { CatalogService } from '../../services/catalog.service';
import { LibraryService } from '../../services/library.service';
import { ToastService } from '../../services/toast.service';
import { BookCoverComponent } from '../../shared/book-cover.component';
import { IconComponent, IconName } from '../../shared/icon.component';
import { ShelfMenuComponent } from '../../shared/shelf-menu.component';
import { formatDate, formatDuration, formatPercent, formatRelative } from '../../utils/format';

type Tab = 'reading' | 'want' | 'finished' | 'favorites' | 'bookmarks';
type Sort = 'recent' | 'title' | 'author' | 'progress';

interface Row {
  book: BookRecord;
  entry?: LibraryEntry;
  percent: number | null;
  lastRead?: string;
}

const TABS: { id: Tab; label: string; icon: IconName; empty: { title: string; body: string; cta: string } }[] = [
  {
    id: 'reading',
    label: 'Reading',
    icon: 'book-open',
    empty: { title: 'Nothing on the go', body: 'Open any book and it will appear here, with your progress saved as you read.', cta: 'Find something to read' },
  },
  {
    id: 'want',
    label: 'Want to read',
    icon: 'bookmark',
    empty: { title: 'Your reading list is empty', body: 'Add books you’d like to get to — use “Add to library” on any book page.', cta: 'Browse the library' },
  },
  {
    id: 'finished',
    label: 'Finished',
    icon: 'trophy',
    empty: { title: 'No finished books yet', body: 'Reach the last page of a book and mark it as finished to celebrate it here.', cta: 'Pick a short read' },
  },
  {
    id: 'favorites',
    label: 'Favourites',
    icon: 'heart',
    empty: { title: 'No favourites yet', body: 'Tap the heart on any book to keep your best-loved titles close at hand.', cta: 'Discover editor’s picks' },
  },
  {
    id: 'bookmarks',
    label: 'Bookmarks',
    icon: 'bookmark',
    empty: { title: 'No bookmarks yet', body: 'While reading, tap the bookmark icon or press B to save a passage.', cta: 'Continue reading' },
  },
];

@Component({
  selector: 'app-library',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgTemplateOutlet, BookCoverComponent, IconComponent, ShelfMenuComponent],
  templateUrl: './library.page.html',
  styleUrl: './library.page.css',
})
export class LibraryPage {
  private readonly catalog = inject(CatalogService);
  private readonly content = inject(BookContentService);
  protected readonly library = inject(LibraryService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly tab = input<string>();

  protected readonly tabs = TABS;
  protected readonly sort = signal<Sort>('recent');
  protected readonly editingNote = signal<string | null>(null);
  private readonly tocTitles = signal<Record<string, string[]>>({});

  protected readonly activeTab = computed<Tab>(() => (TABS.some((t) => t.id === this.tab()) ? (this.tab() as Tab) : 'reading'));
  protected readonly activeMeta = computed(() => TABS.find((t) => t.id === this.activeTab())!);

  private readonly rowsByTab = computed<Record<Exclude<Tab, 'bookmarks'>, Row[]>>(() => {
    const data = this.library.data();
    const toRow = (bookId: string): Row | null => {
      const book = this.catalog.get(bookId);
      if (!book) return null;
      const p = data.progress[bookId];
      return { book, entry: data.library[bookId], percent: p ? p.percent : null, lastRead: p?.updatedAt };
    };
    const entries = Object.values(data.library);
    const readingIds = new Set([
      ...entries.filter((e) => e.shelf === 'reading').map((e) => e.bookId),
      ...Object.values(data.progress)
        .filter((p) => p.percent < 0.995 && data.library[p.bookId]?.shelf !== 'finished' && data.library[p.bookId]?.shelf !== 'want')
        .map((p) => p.bookId),
    ]);
    const pick = (ids: string[]) => ids.map(toRow).filter((r): r is Row => !!r);
    return {
      reading: pick([...readingIds]),
      want: pick(entries.filter((e) => e.shelf === 'want').map((e) => e.bookId)),
      finished: pick(entries.filter((e) => e.shelf === 'finished').map((e) => e.bookId)),
      favorites: pick(entries.filter((e) => e.favorite).map((e) => e.bookId)),
    };
  });

  protected readonly counts = computed<Record<Tab, number>>(() => {
    const r = this.rowsByTab();
    return { reading: r.reading.length, want: r.want.length, finished: r.finished.length, favorites: r.favorites.length, bookmarks: this.library.bookmarks().length };
  });

  protected readonly rows = computed<Row[]>(() => {
    const tab = this.activeTab();
    if (tab === 'bookmarks') return [];
    const rows = [...this.rowsByTab()[tab]];
    const recent = (r: Row) => [r.lastRead ?? '', r.entry?.updatedAt ?? ''].sort().pop() ?? '';
    switch (this.sort()) {
      case 'title':
        return rows.sort((a, b) => a.book.title.localeCompare(b.book.title));
      case 'author':
        return rows.sort((a, b) => a.book.authorSort.localeCompare(b.book.authorSort));
      case 'progress':
        return rows.sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));
      default:
        return rows.sort((a, b) => recent(b).localeCompare(recent(a)));
    }
  });

  protected readonly bookmarkGroups = computed(() => {
    const groups = new Map<string, Bookmark[]>();
    for (const b of this.library.bookmarks()) groups.set(b.bookId, [...(groups.get(b.bookId) ?? []), b]);
    return [...groups]
      .map(([bookId, marks]) => ({ book: this.catalog.get(bookId), marks: marks.sort((a, b) => a.chapter - b.chapter || a.position - b.position) }))
      .filter((g): g is { book: BookRecord; marks: Bookmark[] } => !!g.book);
  });

  protected readonly summary = computed(() => {
    const s = this.library.stats();
    return {
      books: this.library.entries().length,
      finished: s.finished,
      week: formatDuration(s.weekSeconds / 60),
      streak: s.streak,
    };
  });

  constructor() {
    // Load chapter titles for books that have bookmarks, so each bookmark can show where it is.
    effect(() => {
      if (this.activeTab() !== 'bookmarks') return;
      for (const g of this.bookmarkGroups()) {
        if (this.tocTitles()[g.book.id]) continue;
        this.content
          .toc(g.book.id)
          .then((t) => this.tocTitles.update((m) => ({ ...m, [g.book.id]: t.chapters.map((c) => c.title) })))
          .catch(() => undefined);
      }
    });
  }

  protected selectTab(tab: Tab): void {
    void this.router.navigate([], { queryParams: { tab: tab === 'reading' ? null : tab }, replaceUrl: true });
  }

  protected onTabKey(e: KeyboardEvent, index: number): void {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = TABS[(index + dir + TABS.length) % TABS.length];
    this.selectTab(next.id);
    queueMicrotask(() => document.getElementById(`tab-${next.id}`)?.focus());
  }

  protected toggleFavorite(row: Row): void {
    const fav = this.library.toggleFavorite(row.book.id);
    this.toast.show(fav ? 'Added to favourites' : 'Removed from favourites');
  }

  protected removeBookmark(id: string): void {
    const removed = this.library.removeBookmark(id);
    if (removed) this.toast.show('Bookmark removed', { action: { label: 'Undo', run: () => this.library.restoreBookmark(removed) } });
  }

  protected saveNote(id: string, note: string): void {
    this.library.updateBookmarkNote(id, note);
    this.editingNote.set(null);
    this.toast.success(note.trim() ? 'Note saved' : 'Note removed');
  }

  protected chapterTitle(bookId: string, index: number): string {
    return this.tocTitles()[bookId]?.[index] ?? `Chapter ${index + 1}`;
  }

  protected shelfLabel(shelf: Shelf | null | undefined): string {
    return shelf === 'reading' ? 'Reading' : shelf === 'want' ? 'Want to read' : shelf === 'finished' ? 'Finished' : '';
  }

  protected emptyLink(): { commands: unknown[]; query?: Record<string, string> } {
    switch (this.activeTab()) {
      case 'finished':
        return { commands: ['/browse'], query: { length: 'short' } };
      case 'bookmarks':
        return { commands: this.library.continueReading()[0] ? ['/read', this.library.continueReading()[0].bookId] : ['/browse'] };
      case 'favorites':
        return { commands: ['/'] };
      default:
        return { commands: ['/browse'] };
    }
  }

  protected percent(n: number): string {
    return formatPercent(n);
  }

  protected relative(iso: string): string {
    return formatRelative(iso);
  }

  protected date(iso: string): string {
    return formatDate(iso);
  }
}
