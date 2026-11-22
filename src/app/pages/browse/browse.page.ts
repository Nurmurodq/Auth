import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EaseBucket, EraBucket, LengthBucket } from '../../models/book.model';
import {
  CatalogQuery,
  CatalogService,
  EASE_OPTIONS,
  ERA_OPTIONS,
  LENGTH_OPTIONS,
  SORT_OPTIONS,
  SortKey,
} from '../../services/catalog.service';
import { LibraryService } from '../../services/library.service';
import { ToastService } from '../../services/toast.service';
import { BookCardComponent } from '../../shared/book-card.component';
import { BookCoverComponent } from '../../shared/book-cover.component';
import { IconComponent } from '../../shared/icon.component';
import { easeLabel, formatReadingTime, formatYear } from '../../utils/format';
import { readString, writeString } from '../../utils/storage';

type FacetKey = 'genre' | 'length' | 'era' | 'ease';

interface FacetOption {
  id: string;
  label: string;
  count: number;
}

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);

@Component({
  selector: 'app-browse',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgTemplateOutlet, BookCardComponent, BookCoverComponent, IconComponent],
  templateUrl: './browse.page.html',
  styleUrl: './browse.page.css',
})
export class BrowsePage {
  protected readonly catalog = inject(CatalogService);
  protected readonly library = inject(LibraryService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly sheet = viewChild<ElementRef<HTMLDialogElement>>('sheet');
  private readonly resultsTop = viewChild<ElementRef<HTMLElement>>('resultsTop');

  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly view = signal<'grid' | 'list'>((readString('browse-view') as 'grid' | 'list') || 'grid');
  protected readonly sortOptions = SORT_OPTIONS;

  protected readonly query = computed<CatalogQuery>(() => {
    const p = this.params();
    return {
      q: p.get('q') ?? '',
      genres: list(p.get('genre')),
      lengths: list(p.get('length')) as LengthBucket[],
      eras: list(p.get('era')) as EraBucket[],
      ease: list(p.get('ease')) as EaseBucket[],
      author: p.get('author') ?? undefined,
      sort: (p.get('sort') as SortKey) || undefined,
    };
  });

  protected readonly results = computed(() => this.catalog.search(this.query()));
  protected readonly effectiveSort = computed(() => this.query().sort ?? (this.query().q ? 'relevance' : 'featured'));
  protected readonly visibleSorts = computed(() => this.sortOptions.filter((s) => s.id !== 'relevance' || this.query().q));

  protected readonly author = computed(() => (this.query().author ? this.catalog.author(this.query().author!) : undefined));
  protected readonly singleGenre = computed(() => {
    const g = this.query().genres ?? [];
    return g.length === 1 ? this.catalog.genre(g[0]) : undefined;
  });

  protected readonly facets = computed(() => {
    const q = this.query();
    const count = (patch: Partial<CatalogQuery>) => this.catalog.search({ ...q, ...patch, sort: 'featured' }).length;
    const make = (key: FacetKey, options: { id: string; label: string }[]): FacetOption[] =>
      options.map((o) => ({
        ...o,
        count: count(
          key === 'genre'
            ? { genres: [o.id] }
            : key === 'length'
              ? { lengths: [o.id as LengthBucket] }
              : key === 'era'
                ? { eras: [o.id as EraBucket] }
                : { ease: [o.id as EaseBucket] },
        ),
      }));
    return [
      { key: 'genre' as FacetKey, title: 'Genre', options: make('genre', this.catalog.genres.map((g) => ({ id: g.id, label: g.name }))) },
      { key: 'length' as FacetKey, title: 'Reading time', options: make('length', LENGTH_OPTIONS) },
      { key: 'era' as FacetKey, title: 'Published', options: make('era', ERA_OPTIONS) },
      { key: 'ease' as FacetKey, title: 'Reading level', options: make('ease', EASE_OPTIONS) },
    ];
  });

  protected readonly activeChips = computed(() => {
    const q = this.query();
    const chips: { key: FacetKey | 'q' | 'author'; id: string; label: string }[] = [];
    if (q.q) chips.push({ key: 'q', id: q.q, label: `“${q.q}”` });
    if (q.author) chips.push({ key: 'author', id: q.author, label: this.author()?.name ?? q.author });
    for (const g of q.genres ?? []) chips.push({ key: 'genre', id: g, label: this.catalog.genre(g)?.name ?? g });
    for (const l of q.lengths ?? []) chips.push({ key: 'length', id: l, label: LENGTH_OPTIONS.find((o) => o.id === l)?.label ?? l });
    for (const e of q.eras ?? []) chips.push({ key: 'era', id: e, label: ERA_OPTIONS.find((o) => o.id === e)?.label ?? e });
    for (const e of q.ease ?? []) chips.push({ key: 'ease', id: e, label: EASE_OPTIONS.find((o) => o.id === e)?.label ?? e });
    return chips;
  });

  protected readonly filterCount = computed(() => this.activeChips().filter((c) => c.key !== 'q').length);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // When the results change while the reader is scrolled past their top, bring the
    // top of the new results into view instead of leaving them stranded mid-page.
    let first = true;
    effect(() => {
      this.results();
      if (first) {
        first = false;
        return;
      }
      untracked(() =>
        afterNextRender(() => {
          const el = this.resultsTop()?.nativeElement;
          if (!el) return;
          const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 68;
          const top = el.getBoundingClientRect().top;
          if (top < header) window.scrollTo({ top: scrollY + top - header - 12, behavior: 'smooth' });
        }, { injector: this.injector }),
      );
    });
  }

  protected isSelected(key: FacetKey, id: string): boolean {
    return this.params().get(key)?.split(',').includes(id) ?? false;
  }

  protected toggle(key: FacetKey, id: string): void {
    const current = list(this.params().get(key));
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    this.navigate({ [key]: next.length ? next.join(',') : null });
  }

  protected removeChip(chip: { key: string; id: string }): void {
    if (chip.key === 'q' || chip.key === 'author') this.navigate({ [chip.key]: null });
    else this.toggle(chip.key as FacetKey, chip.id);
  }

  protected clearAll(): void {
    this.navigate({ q: null, genre: null, length: null, era: null, ease: null, author: null, sort: null });
  }

  protected onSearch(value: string): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.navigate({ q: value.trim() ? value : null }, true), 180);
  }

  protected setSort(value: string): void {
    this.navigate({ sort: value === 'featured' && !this.query().q ? null : value });
  }

  protected setView(view: 'grid' | 'list'): void {
    this.view.set(view);
    writeString('browse-view', view);
  }

  protected openFilters(): void {
    this.sheet()?.nativeElement.showModal();
  }

  protected closeFilters(): void {
    this.sheet()?.nativeElement.close();
  }

  protected onSheetClick(e: MouseEvent): void {
    if (e.target === this.sheet()?.nativeElement) this.closeFilters();
  }

  protected toggleFavorite(bookId: string, title: string): void {
    if (!this.library.requireAccount('Sign in to save favourites.')) return;
    const fav = this.library.toggleFavorite(bookId);
    this.toast.show(fav ? `Added “${title}” to favourites` : `Removed “${title}” from favourites`);
  }

  protected progressOf(bookId: string): number | null {
    return this.library.progress(bookId)?.percent ?? null;
  }

  protected meta = {
    year: formatYear,
    time: formatReadingTime,
    ease: easeLabel,
  };

  private navigate(patch: Record<string, string | null>, replaceUrl = false): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: patch, queryParamsHandling: 'merge', replaceUrl });
  }
}
