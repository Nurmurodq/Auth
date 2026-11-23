import { Location, NgTemplateOutlet } from '@angular/common';
import { t } from '../../i18n/i18n';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  Injector,
  OnDestroy,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { WORDS_PER_MINUTE } from '../../config';
import { TocChapter } from '../../models/book.model';
import { Bookmark } from '../../models/user.model';
import { AuthService } from '../../services/auth/auth.service';
import { BookContentService } from '../../services/book-content.service';
import { CatalogService } from '../../services/catalog.service';
import { LibraryService } from '../../services/library.service';
import {
  LINE_SPACING,
  READER_FONTS,
  READER_THEMES,
  READER_WIDTHS,
  ReaderSettingsService,
} from '../../services/reader-settings.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { BookCoverComponent } from '../../shared/book-cover.component';
import { IconComponent } from '../../shared/icon.component';
import { formatDuration, formatPercent } from '../../utils/format';
import { truncate } from '../../utils/text';
import { ReaderContentsPanelComponent } from './reader-contents-panel.component';
import { ReaderSettingsPanelComponent } from './reader-settings-panel.component';

type Panel = 'contents' | 'settings' | 'shortcuts';
type Target = number | 'end';

const CHROME_TOP = 64;
const CHROME_BOTTOM = 72;
const SAVE_INTERVAL = 1200;
const ACTIVITY_TICK = 15;

@Component({
  selector: 'app-reader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, NgTemplateOutlet, IconComponent, BookCoverComponent, ReaderContentsPanelComponent, ReaderSettingsPanelComponent],
  templateUrl: './reader.page.html',
  styleUrl: './reader.page.css',
  host: {
    '[attr.data-theme]': 'settings().theme',
    '[class.is-paged]': 'isPaged()',
    '[class.chrome-hidden]': '!chromeShown()',
    '[class.is-justified]': 'settings().justify',
    '[class.no-dropcap]': 'plainOpening()',
    '[style.--r-font]': 'fontFamily()',
    '[style.--r-size.px]': 'settings().fontSize',
    '[style.--r-lh]': 'lineHeight()',
    '[style.--r-measure]': 'measure()',
    '(window:keydown)': 'onKey($event)',
    '(window:scroll)': 'onScroll()',
    '(window:resize)': 'onResize()',
    '(document:fullscreenchange)': 'isFullscreen.set(!!document.fullscreenElement)',
  },
})
export class ReaderPage implements OnDestroy {
  protected readonly t = t;
  private readonly catalog = inject(CatalogService);
  private readonly content = inject(BookContentService);
  protected readonly library = inject(LibraryService);
  protected readonly auth = inject(AuthService);
  private readonly readerSettings = inject(ReaderSettingsService);
  private readonly appTheme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly location = inject(Location);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly document = inject(DOCUMENT);

  /* Route inputs: /read/:id?chapter=&pos= */
  readonly id = input.required<string>();
  readonly chapter = input<string>();
  readonly pos = input<string>();

  private readonly contentsDialog = viewChild<ElementRef<HTMLDialogElement>>('contentsDialog');
  private readonly settingsDialog = viewChild<ElementRef<HTMLDialogElement>>('settingsDialog');
  private readonly shortcutsDialog = viewChild<ElementRef<HTMLDialogElement>>('shortcutsDialog');

  /* ------------------------------ state ------------------------------ */

  protected readonly settings = this.readerSettings.settings;
  protected readonly book = computed(() => this.catalog.get(this.id()));
  /** Plays and poetry open with stage directions or verse, where a drop cap looks wrong. */
  protected readonly plainOpening = computed(() => !!this.book()?.genres.some((g) => g === 'drama' || g === 'poetry'));
  protected readonly toc = signal<TocChapter[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly chapterIndex = signal(0);
  protected readonly html = signal('');
  protected readonly loading = signal(true);
  protected readonly position = signal(0);
  protected readonly page = signal(0);
  protected readonly pageCount = signal(1);
  protected readonly chromeVisible = signal(true);
  protected readonly panel = signal<Panel | null>(null);
  protected readonly contentsTab = signal<'contents' | 'bookmarks'>('contents');
  protected readonly instant = signal(true);
  protected readonly isFullscreen = signal(false);
  protected readonly scrub = signal<number | null>(null);
  private readonly viewport = signal({ w: innerWidth, h: innerHeight });

  protected readonly fullscreenSupported = !!this.document.fullscreenEnabled;
  protected readonly isPaged = computed(() => this.settings().mode === 'paged');
  protected readonly chromeShown = computed(() => this.chromeVisible() || this.panel() !== null || this.loading());
  protected readonly fontFamily = computed(() => READER_FONTS.find((f) => f.id === this.settings().font)?.family ?? READER_FONTS[0].family);
  protected readonly lineHeight = computed(() => LINE_SPACING[this.settings().lineSpacing]);
  protected readonly measure = computed(() => READER_WIDTHS[this.settings().width]);
  protected readonly themeColors = computed(() => READER_THEMES.find((t) => t.id === this.settings().theme) ?? READER_THEMES[0]);

  protected readonly cumulative = computed(() => {
    const out = [0];
    for (const c of this.toc() ?? []) out.push(out[out.length - 1] + c.words);
    return out;
  });
  protected readonly totalWords = computed(() => this.cumulative()[this.cumulative().length - 1] || 1);
  protected readonly current = computed(() => this.toc()?.[this.chapterIndex()]);
  protected readonly isFirst = computed(() => this.chapterIndex() === 0);
  protected readonly isLast = computed(() => this.chapterIndex() >= (this.toc()?.length ?? 1) - 1);
  protected readonly nextChapter = computed(() => this.toc()?.[this.chapterIndex() + 1]);

  protected readonly percent = computed(() => {
    const words = this.current()?.words ?? 0;
    return Math.min(1, (this.cumulative()[this.chapterIndex()] + words * this.position()) / this.totalWords());
  });
  protected readonly percentLabel = computed(() => formatPercent(this.percent()));
  protected readonly chapterPercent = computed(() => Math.round(this.position() * 100));
  protected readonly chapterMinutesLeft = computed(() => {
    const words = this.current()?.words ?? 0;
    return Math.max(0, Math.round((words * (1 - this.position())) / WORDS_PER_MINUTE));
  });
  protected readonly bookMinutesLeft = computed(() => formatDuration((this.totalWords() * (1 - this.percent())) / WORDS_PER_MINUTE));

  protected readonly scrubPreview = computed(() => {
    const v = this.scrub();
    if (v === null) return null;
    const { chapter } = this.locate(v / 1000);
    return { label: this.toc()?.[chapter]?.title ?? '', pct: formatPercent(v / 1000) };
  });

  protected readonly bookmarks = computed(() => {
    void this.library.data();
    return this.library.bookmarksFor(this.id());
  });
  protected readonly activeBookmark = computed<Bookmark | undefined>(() => {
    const ch = this.chapterIndex();
    const pos = this.position();
    const tolerance = this.viewTolerance();
    return this.bookmarks().find((b) => b.chapter === ch && Math.abs(b.position - pos) <= tolerance);
  });
  private readonly viewTolerance = signal(0.02);

  protected readonly isFinished = computed(() => this.library.data().library[this.id()]?.shelf === 'finished');
  protected readonly related = computed(() => {
    const b = this.book();
    return b ? this.catalog.related(b, 3) : [];
  });

  /* Paged-mode geometry */
  protected readonly columns = computed(() => {
    const { w } = this.viewport();
    const colWidth = this.settings().fontSize * parseFloat(this.measure());
    const side = w < 640 ? 22 : 48;
    const available = w - side * 2;
    const gap = w < 640 ? 44 : 72;
    if (w >= 1100 && available >= colWidth * 2 + gap) return { count: 2, width: colWidth * 2 + gap, gap };
    if (w >= 1100 && available >= 2 * 520 + gap) return { count: 2, width: available, gap };
    return { count: 1, width: Math.min(colWidth, available), gap };
  });
  /** Vertical margins of the page area in paged mode (clear of the chrome, with breathing room). */
  protected readonly pageInsets = computed(() => (this.viewport().w < 640 ? { top: 76, bottom: 84 } : { top: 92, bottom: 104 }));
  protected readonly pageHeight = computed(() => this.viewport().h - this.pageInsets().top - this.pageInsets().bottom);
  protected readonly stride = computed(() => this.columns().width + this.columns().gap);
  protected readonly translate = computed(() => `translate3d(${-this.page() * this.stride()}px, 0, 0)`);

  /* ---------------------------- internals ---------------------------- */

  private loadToken = 0;
  private ready = false;
  private interacted = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private activityTimer: ReturnType<typeof setInterval>;
  private lastActivity = Date.now();
  private lastScrollY = 0;
  private scrollRaf = 0;
  private resizeRaf = 0;
  private pointer: { x: number; y: number; t: number } | null = null;
  private suppressClick = false;

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.open(id));
    });

    // Reflow when typography, layout mode or the window changes, keeping the reader's place.
    effect(() => {
      this.settings();
      this.viewport();
      untracked(() => this.ready && this.relayout());
    });

    // Paint the page background behind the reader (overscroll, safe areas) in the reading theme.
    effect(() => {
      const { bg } = this.themeColors();
      const root = this.document.documentElement;
      root.style.backgroundColor = bg;
      root.style.overflow = this.isPaged() ? 'hidden' : '';
      this.setThemeColor(bg);
    });

    // Open/close dialogs to match the panel state.
    effect(() => {
      const p = this.panel();
      const pairs: [Panel, ElementRef<HTMLDialogElement> | undefined][] = [
        ['contents', this.contentsDialog()],
        ['settings', this.settingsDialog()],
        ['shortcuts', this.shortcutsDialog()],
      ];
      for (const [name, ref] of pairs) {
        const dlg = ref?.nativeElement;
        if (!dlg) continue;
        if (p === name && !dlg.open) dlg.showModal();
        else if (p !== name && dlg.open) dlg.close();
      }
    });

    this.activityTimer = setInterval(() => {
      if (this.document.visibilityState === 'visible' && Date.now() - this.lastActivity < 120_000 && !this.loading()) {
        this.library.addReadingTime(ACTIVITY_TICK);
      }
    }, ACTIVITY_TICK * 1000);
  }

  ngOnDestroy(): void {
    this.saveNow();
    clearInterval(this.activityTimer);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    cancelAnimationFrame(this.scrollRaf);
    cancelAnimationFrame(this.resizeRaf);
    const root = this.document.documentElement;
    root.style.backgroundColor = '';
    root.style.overflow = '';
    this.setThemeColor(this.appTheme.resolved() === 'dark' ? '#121110' : '#f8f6f1');
    if (this.document.fullscreenElement) void this.document.exitFullscreen().catch(() => undefined);
  }

  /* ------------------------------ loading ---------------------------- */

  private async open(id: string): Promise<void> {
    this.ready = false;
    this.interacted = false;
    this.error.set(null);
    this.toc.set(null);
    this.html.set('');
    this.loading.set(true);
    if (!this.catalog.get(id)) {
      this.loading.set(false);
      return;
    }
    try {
      const toc = await this.content.toc(id);
      if (id !== this.id()) return;
      this.toc.set(toc.chapters);

      const qChapter = Number.parseInt(this.chapter() ?? '', 10);
      const qPos = Number.parseFloat(this.pos() ?? '');
      const saved = this.library.progress(id);
      let start = { chapter: 0, position: 0 };
      if (Number.isInteger(qChapter)) {
        start = { chapter: qChapter, position: Number.isFinite(qPos) ? qPos : 0 };
        this.interacted = true;
      } else if (saved) {
        start = { chapter: saved.chapter, position: saved.percent >= 0.995 ? 0 : saved.position };
        if (saved.percent > 0.005 && saved.percent < 0.995) this.toast.show(t('reader.welcomeBack'));
      }
      start.chapter = Math.min(Math.max(0, start.chapter), toc.chapters.length - 1);
      start.position = Math.min(Math.max(0, start.position), 1);
      if (this.chapter() || this.pos()) this.location.replaceState(`/read/${id}`);
      await this.loadChapter(start.chapter, start.position);
    } catch {
      this.error.set(t('reader.openError'));
      this.loading.set(false);
    }
  }

  protected retry(): void {
    void this.open(this.id());
  }

  private async loadChapter(index: number, target: Target): Promise<void> {
    const toc = this.toc();
    if (!toc || index < 0 || index >= toc.length) return;
    const token = ++this.loadToken;
    const id = this.id();
    const cached = index === this.chapterIndex() && this.html() && this.ready;
    if (!cached) this.loading.set(true);
    try {
      const html = cached ? this.html() : await this.content.chapter(id, index);
      if (token !== this.loadToken) return;
      this.instant.set(true);
      this.chapterIndex.set(index);
      this.html.set(html);
      this.loading.set(false);
      this.error.set(null);
      afterNextRender(() => this.afterRender(target, token), { injector: this.injector });
      if (index + 1 < toc.length) this.content.prefetch(id, index + 1);
      if (index > 0) this.content.prefetch(id, index - 1);
    } catch {
      if (token !== this.loadToken) return;
      this.loading.set(false);
      this.error.set(t('reader.chapterError'));
    }
  }

  private afterRender(target: Target, token: number): void {
    if (token !== this.loadToken) return;
    this.ready = true;
    this.applyPosition(target);
    requestAnimationFrame(() => this.instant.set(false));
    // Webfonts can change line breaks once they arrive; settle the layout again when ready.
    void this.document.fonts?.ready.then(() => token === this.loadToken && this.relayout());
    this.updateTolerance();
    this.scheduleSave();
  }

  /* ----------------------------- geometry ---------------------------- */

  private article(): HTMLElement | null {
    return this.host.nativeElement.querySelector('.r-article');
  }

  private columnsEl(): HTMLElement | null {
    return this.host.nativeElement.querySelector('.r-columns');
  }

  private paginate(): number {
    const cols = this.columnsEl();
    const sentinel = this.host.nativeElement.querySelector<HTMLElement>('.r-sentinel');
    if (!cols || !sentinel) return 1;
    const x = sentinel.getBoundingClientRect().left - cols.getBoundingClientRect().left;
    const count = Math.max(1, Math.floor((x + 1) / this.stride()) + 1);
    this.pageCount.set(count);
    return count;
  }

  private scrollMetrics(): { top: number; scrollable: number } {
    const el = this.article();
    if (!el) return { top: 0, scrollable: 0 };
    const top = el.getBoundingClientRect().top + scrollY;
    return { top, scrollable: el.offsetHeight - innerHeight + CHROME_BOTTOM };
  }

  private applyPosition(target: Target): void {
    if (this.isPaged()) {
      const count = this.paginate();
      const page = target === 'end' ? count - 1 : Math.round(target * (count - 1));
      this.page.set(Math.min(Math.max(0, page), count - 1));
      this.position.set(count > 1 ? this.page() / (count - 1) : 1);
    } else {
      const { top, scrollable } = this.scrollMetrics();
      const frac = target === 'end' ? 1 : target;
      window.scrollTo({ top: scrollable > 0 ? top + frac * scrollable : top, behavior: 'instant' });
      this.lastScrollY = scrollY;
      this.position.set(scrollable > 0 ? frac : 1);
    }
    this.updateTolerance();
  }

  private relayout(): void {
    if (!this.ready || this.loading()) return;
    const keep = this.position();
    this.instant.set(true);
    afterNextRender(
      () => {
        this.applyPosition(keep);
        requestAnimationFrame(() => this.instant.set(false));
      },
      { injector: this.injector },
    );
  }

  private updateTolerance(): void {
    if (this.isPaged()) {
      const n = this.pageCount();
      this.viewTolerance.set(n > 1 ? 0.5 / (n - 1) : 1);
    } else {
      const { scrollable } = this.scrollMetrics();
      this.viewTolerance.set(scrollable > 0 ? Math.min(1, (innerHeight * 0.5) / scrollable) : 1);
    }
  }

  /* ---------------------------- navigation --------------------------- */

  protected next(): void {
    this.markInteraction();
    if (this.isPaged()) {
      if (this.page() < this.pageCount() - 1) this.setPage(this.page() + 1);
      else this.goNextChapter();
    } else {
      this.goNextChapter();
    }
  }

  protected prev(): void {
    this.markInteraction();
    if (this.isPaged()) {
      if (this.page() > 0) this.setPage(this.page() - 1);
      else this.goPrevChapter('end');
    } else {
      this.goPrevChapter(0);
    }
  }

  protected goNextChapter(): void {
    if (this.isLast()) return;
    this.markInteraction();
    void this.loadChapter(this.chapterIndex() + 1, 0);
  }

  protected goPrevChapter(target: Target = 0): void {
    if (this.isFirst()) return;
    this.markInteraction();
    void this.loadChapter(this.chapterIndex() - 1, target);
  }

  protected goToChapter(index: number): void {
    this.panel.set(null);
    this.markInteraction();
    void this.loadChapter(index, 0);
  }

  protected goToBookmark(b: Bookmark): void {
    this.panel.set(null);
    this.markInteraction();
    if (b.chapter === this.chapterIndex() && this.ready) {
      this.applyPosition(b.position);
      this.scheduleSave();
    } else {
      void this.loadChapter(b.chapter, b.position);
    }
  }

  protected onScrubInput(value: number): void {
    this.scrub.set(value);
  }

  protected onScrubChange(value: number): void {
    this.scrub.set(null);
    this.markInteraction();
    const { chapter, position } = this.locate(value / 1000);
    if (chapter === this.chapterIndex() && this.ready) {
      this.applyPosition(position);
      this.scheduleSave();
    } else {
      void this.loadChapter(chapter, position);
    }
  }

  private locate(fraction: number): { chapter: number; position: number } {
    const cum = this.cumulative();
    const toc = this.toc() ?? [];
    const target = fraction * this.totalWords();
    for (let i = 0; i < toc.length; i++) {
      if (target < cum[i + 1] || i === toc.length - 1) {
        return { chapter: i, position: toc[i].words ? Math.min(1, Math.max(0, (target - cum[i]) / toc[i].words)) : 0 };
      }
    }
    return { chapter: 0, position: 0 };
  }

  private setPage(page: number): void {
    const n = this.pageCount();
    const p = Math.min(Math.max(0, page), n - 1);
    this.page.set(p);
    this.position.set(n > 1 ? p / (n - 1) : 1);
    this.chromeVisible.set(false);
    this.scheduleSave();
  }

  /* ------------------------------ events ----------------------------- */

  protected onScroll(): void {
    if (this.isPaged() || !this.ready) return;
    cancelAnimationFrame(this.scrollRaf);
    this.scrollRaf = requestAnimationFrame(() => {
      const y = scrollY;
      const { top, scrollable } = this.scrollMetrics();
      const pos = scrollable > 0 ? Math.min(1, Math.max(0, (y - top) / scrollable)) : 1;
      const delta = y - this.lastScrollY;
      if (Math.abs(delta) > 2) this.markInteraction();
      if (this.panel() === null) {
        if (delta > 8 && y > 120) this.chromeVisible.set(false);
        else if (delta < -8 || y < 60 || pos > 0.995) this.chromeVisible.set(true);
      }
      this.lastScrollY = y;
      if (Math.abs(pos - this.position()) > 0.0005) {
        this.position.set(pos);
        this.scheduleSave();
      }
    });
  }

  protected onResize(): void {
    cancelAnimationFrame(this.resizeRaf);
    this.resizeRaf = requestAnimationFrame(() => this.viewport.set({ w: innerWidth, h: innerHeight }));
  }

  protected onSurfaceClick(e: MouseEvent): void {
    // Touch taps are handled on pointerup; ignore the click the browser may synthesise afterwards.
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    this.handleTap(e.clientX, e.target as HTMLElement);
  }

  protected onPointerDown(e: PointerEvent): void {
    this.suppressClick = false;
    if (e.pointerType === 'mouse') return;
    this.pointer = { x: e.clientX, y: e.clientY, t: Date.now() };
  }

  protected onPointerUp(e: PointerEvent): void {
    const start = this.pointer;
    this.pointer = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = Date.now() - start.t;
    if (this.isPaged() && Math.abs(dx) > 48 && Math.abs(dy) < 64 && dt < 700) {
      this.suppressClick = true;
      if (dx < 0) this.next();
      else this.prev();
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 500) {
      this.suppressClick = true;
      this.handleTap(e.clientX, e.target as HTMLElement);
    }
  }

  /** Paged mode: left/right thirds turn pages, the centre toggles the controls. Scroll mode: toggles the controls. */
  private handleTap(clientX: number, target: HTMLElement): void {
    if (target.closest('a, button, input, select, textarea, .r-chapter-end')) return;
    if (this.document.getSelection()?.toString()) return;
    this.markInteraction();
    if (this.isPaged()) {
      const x = clientX / innerWidth;
      if (x < 0.28) return this.prev();
      if (x > 0.72) return this.next();
    }
    this.chromeVisible.set(!this.chromeVisible());
  }

  protected onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) && target.getAttribute('type') !== 'range') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (this.panel()) {
      if (e.key === 'Escape') this.panel.set(null);
      return;
    }
    const key = e.key;
    const handled = (() => {
      switch (key) {
        case 'ArrowRight':
          this.next();
          return true;
        case 'ArrowLeft':
          this.prev();
          return true;
        case ' ':
        case 'PageDown':
          if (!this.isPaged()) return false;
          if (e.shiftKey) this.prev();
          else this.next();
          return true;
        case 'PageUp':
          if (!this.isPaged()) return false;
          this.prev();
          return true;
        case ']':
          this.goNextChapter();
          return true;
        case '[':
          this.goPrevChapter(0);
          return true;
        case 't':
        case 'T':
          this.openPanel('contents');
          return true;
        case 'a':
        case 'A':
          this.openPanel('settings');
          return true;
        case 'b':
        case 'B':
          this.toggleBookmark();
          return true;
        case 'f':
        case 'F':
          void this.toggleFullscreen();
          return true;
        case '?':
          this.openPanel('shortcuts');
          return true;
        case '+':
        case '=':
          this.readerSettings.update({ fontSize: this.settings().fontSize + 1 });
          return true;
        case '-':
          this.readerSettings.update({ fontSize: this.settings().fontSize - 1 });
          return true;
        case 'Escape':
          this.chromeVisible.set(true);
          return true;
        default:
          return false;
      }
    })();
    if (handled) e.preventDefault();
  }

  /* ------------------------------ actions ---------------------------- */

  protected openPanel(panel: Panel, tab?: 'contents' | 'bookmarks'): void {
    if (tab) this.contentsTab.set(tab);
    this.panel.set(this.panel() === panel ? null : panel);
  }

  protected onDialogClose(name: Panel): void {
    if (this.panel() === name) this.panel.set(null);
  }

  protected onDialogClick(e: MouseEvent, name: Panel): void {
    if ((e.target as HTMLElement).tagName === 'DIALOG') this.onDialogClose(name);
  }

  protected toggleBookmark(): void {
    const book = this.book();
    if (!book || !this.ready) return;
    const existing = this.activeBookmark();
    if (existing) {
      this.library.removeBookmark(existing.id);
      this.toast.show(t('bookmark.removed'), { action: { label: t('common.undo'), run: () => this.library.restoreBookmark(existing) } });
      return;
    }
    if (!this.library.requireAccount(t('reader.signInBookmark'))) return;
    this.library.addBookmark({ bookId: book.id, chapter: this.chapterIndex(), position: this.position(), excerpt: this.visibleExcerpt() });
    this.toast.success(t('reader.bookmarked'));
  }

  protected removeBookmark(id: string): void {
    const removed = this.library.removeBookmark(id);
    if (removed) this.toast.show(t('bookmark.removed'), { action: { label: t('common.undo'), run: () => this.library.restoreBookmark(removed) } });
  }

  protected markFinished(): void {
    if (!this.library.requireAccount(t('reader.signInFinish'))) return;
    this.library.setShelf(this.id(), 'finished');
    this.library.saveProgress(this.id(), this.chapterIndex(), 1, 1);
    this.toast.success(t('reader.finished', { title: this.book()?.title ?? '' }));
  }

  protected async toggleFullscreen(): Promise<void> {
    if (!this.fullscreenSupported) return;
    try {
      if (this.document.fullscreenElement) await this.document.exitFullscreen();
      else await this.document.documentElement.requestFullscreen();
    } catch {
      /* user agent refused — nothing to do */
    }
  }

  /** Text of the first block visible on screen, used as a bookmark excerpt. */
  private visibleExcerpt(): string {
    const blocks = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('.r-content p, .r-content .speech, .r-content h3, .r-content blockquote'));
    let el: HTMLElement | undefined;
    if (this.isPaged()) {
      const vp = this.host.nativeElement.querySelector('.r-viewport')?.getBoundingClientRect();
      el = blocks.find((b) => {
        const r = b.getBoundingClientRect();
        return vp && r.right > vp.left + 4 && r.left < vp.right - 4 && r.height > 0;
      });
    } else {
      el = blocks.find((b) => b.getBoundingClientRect().bottom > CHROME_TOP + 8);
    }
    const text = (el?.textContent ?? this.current()?.title ?? '').replace(/\s+/g, ' ').trim();
    return truncate(text, 180);
  }

  private markInteraction(): void {
    this.interacted = true;
    this.lastActivity = Date.now();
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveNow();
    }, SAVE_INTERVAL);
  }

  private saveNow(): void {
    if (!this.ready || !this.interacted || !this.toc()) return;
    this.library.saveProgress(this.id(), this.chapterIndex(), this.position(), this.percent());
  }

  private setThemeColor(color: string): void {
    this.document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
  }
}
