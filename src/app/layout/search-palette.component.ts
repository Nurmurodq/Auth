import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { t } from '../i18n/i18n';
import { Router } from '@angular/router';
import { BookRecord } from '../models/book.model';
import { CatalogService } from '../services/catalog.service';
import { UiService } from '../services/ui.service';
import { BookCoverComponent } from '../shared/book-cover.component';
import { IconComponent, IconName } from '../shared/icon.component';
import { formatYear } from '../utils/format';
import { readJson, writeJson } from '../utils/storage';

interface PaletteItem {
  key: string;
  group: string;
  label: string;
  hint?: string;
  icon?: IconName;
  book?: BookRecord;
  commands: unknown[];
  query?: Record<string, string>;
}

@Component({
  selector: 'app-search-palette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, BookCoverComponent],
  host: { '(document:keydown)': 'onGlobalKey($event)' },
  template: `
    <dialog #dialog class="palette" [attr.aria-label]="t('search.dialog')" (close)="ui.closeSearch()" (click)="onDialogClick($event)">
      <div class="panel">
        <div class="input-row">
          <app-icon name="search" [size]="20" />
          <input
            #input
            type="search"
            [value]="query()"
            (input)="setQuery($any($event.target).value)"
            (keydown)="onInputKey($event)"
            [placeholder]="t('search.placeholder')"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-autocomplete="list"
            [attr.aria-activedescendant]="activeId()"
            autocomplete="off"
            spellcheck="false"
            enterkeyhint="search"
          />
          <button type="button" class="esc" (click)="close()" [attr.aria-label]="t('search.close')"><span class="kbd">Esc</span></button>
        </div>

        <div class="results" id="palette-results" role="listbox" [attr.aria-label]="t('search.results')">
          @if (items().length === 0) {
            <div class="empty">
              <app-icon name="book-open" [size]="28" />
              <p>{{ t('search.noMatch', { query: query() }) }}</p>
              <span>{{ t('search.noMatchHint') }}</span>
            </div>
          }
          @for (group of groups(); track group.name) {
            <div class="group">
              <div class="group-label">{{ group.name }}</div>
              @for (item of group.items; track item.key) {
                <button
                  type="button"
                  class="item"
                  role="option"
                  [id]="'opt-' + item.key"
                  [class.active]="item === activeItem()"
                  [attr.aria-selected]="item === activeItem()"
                  (mousemove)="setActive(item)"
                  (click)="choose(item)"
                >
                  @if (item.book) {
                    <app-book-cover class="thumb" [book]="item.book" [flat]="true" sizes="40px" />
                  } @else {
                    <span class="item-icon"><app-icon [name]="item.icon ?? 'search'" [size]="18" /></span>
                  }
                  <span class="item-text">
                    <span class="item-label">{{ item.label }}</span>
                    @if (item.hint) {
                      <span class="item-hint">{{ item.hint }}</span>
                    }
                  </span>
                  <app-icon name="arrow-right" [size]="16" class="go" />
                </button>
              }
            </div>
          }
        </div>

        <div class="foot">
          <span><span class="kbd">↑</span><span class="kbd">↓</span> {{ t('search.navigate') }}</span>
          <span><span class="kbd">↵</span> {{ t('search.open') }}</span>
          <span class="total">{{ t('search.total', { count: catalog.books.length }) }}</span>
        </div>
      </div>
    </dialog>
  `,
  styles: `
    .palette {
      width: min(640px, calc(100vw - 24px));
      max-height: min(620px, calc(100dvh - 48px));
      margin: 10vh auto auto;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--bg-elevated);
      color: var(--text);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }
    .palette[open] {
      animation: pop 200ms var(--ease) both;
    }
    .palette::backdrop {
      background: var(--scrim);
      backdrop-filter: blur(3px);
      animation: fade-in 200ms var(--ease) both;
    }
    @keyframes pop {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.985);
      }
    }
    .panel {
      display: flex;
      flex-direction: column;
      max-height: inherit;
    }
    .input-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 14px 0 18px;
      border-bottom: 1px solid var(--border);
      color: var(--text-3);
    }
    .input-row input {
      flex: 1;
      height: 60px;
      border: 0;
      background: transparent;
      font-size: 1.06rem;
      color: var(--text);
      outline: none;
    }
    .input-row input::-webkit-search-cancel-button {
      display: none;
    }
    .esc {
      padding: 6px;
      border-radius: var(--radius-xs);
    }
    .results {
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 8px;
      min-height: 120px;
    }
    .group + .group {
      margin-top: 6px;
    }
    .group-label {
      padding: 10px 10px 6px;
      font-size: 0.72rem;
      font-weight: 650;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-3);
    }
    .item {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      text-align: left;
    }
    .item.active {
      background: var(--surface);
    }
    .thumb {
      width: 34px;
      flex: none;
    }
    .item-icon {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      flex: none;
      border-radius: var(--radius-sm);
      background: var(--surface);
      color: var(--text-2);
    }
    .item.active .item-icon {
      background: var(--bg-elevated);
    }
    .item-text {
      display: grid;
      flex: 1;
      min-width: 0;
    }
    .item-label {
      font-weight: 600;
      font-size: 0.95rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item-hint {
      font-size: 0.84rem;
      color: var(--text-3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .go {
      color: var(--text-3);
      opacity: 0;
      transition: opacity var(--dur-fast) var(--ease);
    }
    .item.active .go {
      opacity: 1;
    }
    .empty {
      display: grid;
      justify-items: center;
      gap: 6px;
      padding: 36px 16px;
      text-align: center;
      color: var(--text-3);
    }
    .empty p {
      color: var(--text);
      font-weight: 600;
    }
    .empty span {
      font-size: 0.88rem;
    }
    .foot {
      display: flex;
      gap: 16px;
      align-items: center;
      padding: 10px 16px;
      border-top: 1px solid var(--border);
      background: var(--surface);
      font-size: 0.78rem;
      color: var(--text-3);
    }
    .foot .kbd {
      margin-right: 3px;
    }
    .total {
      margin-left: auto;
    }
    @media (max-width: 640px) {
      .palette {
        margin-top: 12px;
        max-height: calc(100dvh - 24px);
      }
      .foot span:not(.total) {
        display: none;
      }
    }
  `,
})
export class SearchPaletteComponent {
  protected readonly t = t;
  protected readonly ui = inject(UiService);
  protected readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected readonly query = signal('');
  private readonly recent = signal<string[]>(readJson<string[]>('recent-searches', []));
  private readonly active = signal(0);

  protected readonly items = computed<PaletteItem[]>(() => {
    const q = this.query().trim();
    if (!q) {
      const recent: PaletteItem[] = this.recent().map((r) => ({
        key: `recent-${r}`,
        group: t('search.recent'),
        label: r,
        icon: 'clock',
        commands: ['/browse'],
        query: { q: r },
      }));
      const picks: PaletteItem[] = this.catalog
        .picks()
        .slice(0, 4)
        .map((b) => ({ key: `pick-${b.id}`, group: t('search.popular'), label: b.title, hint: b.author, book: b, commands: ['/book', b.id] }));
      const genres: PaletteItem[] = this.catalog.genres.slice(0, 6).map((g) => ({
        key: `genre-${g.id}`,
        group: t('search.browseGenres'),
        label: g.name,
        hint: t('common.books', { count: g.count }),
        icon: 'compass',
        commands: ['/browse'],
        query: { genre: g.id },
      }));
      return [...recent, ...picks, ...genres];
    }
    const { books, authors, genres } = this.catalog.suggest(q);
    const out: PaletteItem[] = books.map((b) => ({
      key: `book-${b.id}`,
      group: t('search.books'),
      label: b.title,
      hint: `${b.author} · ${formatYear(b.year)}`,
      book: b,
      commands: ['/book', b.id],
    }));
    for (const a of authors) {
      out.push({ key: `author-${a.id}`, group: t('search.authors'), label: a.name, hint: t('common.books', { count: a.count }), icon: 'feather', commands: ['/browse'], query: { author: a.id } });
    }
    for (const g of genres) {
      out.push({ key: `genre-${g.id}`, group: t('search.genres'), label: g.name, hint: t('common.books', { count: g.count }), icon: 'compass', commands: ['/browse'], query: { genre: g.id } });
    }
    if (out.length) {
      out.push({ key: 'all', group: t('nav.search'), label: t('search.seeAll', { query: q }), icon: 'search', commands: ['/browse'], query: { q } });
    }
    return out;
  });

  protected readonly groups = computed(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of this.items()) map.set(item.group, [...(map.get(item.group) ?? []), item]);
    return [...map].map(([name, items]) => ({ name, items }));
  });

  protected readonly activeItem = computed(() => this.items()[Math.min(this.active(), this.items().length - 1)]);
  protected readonly activeId = computed(() => (this.activeItem() ? `opt-${this.activeItem()!.key}` : null));

  constructor() {
    effect(() => {
      const open = this.ui.searchOpen();
      const dlg = this.dialog().nativeElement;
      if (open && !dlg.open) this.show(this.ui.searchSeed());
      else if (!open && dlg.open) dlg.close();
    });
  }

  /** Opens synchronously (e.g. straight from a keyboard shortcut) so no keystrokes are lost. */
  private show(seed = ''): void {
    const dlg = this.dialog().nativeElement;
    if (!dlg.open) {
      this.query.set(seed);
      this.active.set(0);
      const input = this.input().nativeElement;
      input.value = seed;
      dlg.showModal();
      input.focus();
      input.select();
    }
    if (!this.ui.searchOpen()) this.ui.openSearch(seed);
  }

  protected setQuery(value: string): void {
    this.query.set(value);
    this.active.set(0);
  }

  protected setActive(item: PaletteItem): void {
    const i = this.items().indexOf(item);
    if (i >= 0 && i !== this.active()) this.active.set(i);
  }

  protected onInputKey(e: KeyboardEvent): void {
    const n = this.items().length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.active.set((this.active() + 1) % Math.max(1, n));
      this.scrollActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.active.set((this.active() - 1 + n) % Math.max(1, n));
      this.scrollActive();
    } else if (e.key === 'Escape') {
      // A search input would otherwise swallow the first Escape to clear itself.
      e.preventDefault();
      this.close();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = this.activeItem();
      const q = this.query().trim();
      if (item) this.choose(item);
      else if (q) this.choose({ key: 'all', group: '', label: q, commands: ['/browse'], query: { q } });
    }
  }

  protected choose(item: PaletteItem): void {
    const q = this.query().trim();
    if (q) {
      const next = [q, ...this.recent().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 5);
      this.recent.set(next);
      writeJson('recent-searches', next);
    }
    this.close();
    void this.router.navigate(item.commands, { queryParams: item.query });
  }

  protected close(): void {
    this.ui.closeSearch();
  }

  protected onDialogClick(e: MouseEvent): void {
    if (e.target === this.dialog().nativeElement) this.close();
  }

  protected onGlobalKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    const typing = target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (this.ui.searchOpen()) this.close();
      else this.show();
    } else if (e.key === '/' && !typing && !this.ui.searchOpen() && !document.querySelector('app-reader')) {
      e.preventDefault();
      this.show();
    }
  }

  private scrollActive(): void {
    queueMicrotask(() => document.getElementById(this.activeId() ?? '')?.scrollIntoView({ block: 'nearest' }));
  }
}
