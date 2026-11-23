import { Injectable } from '@angular/core';
import { BOOKS, GENRES } from '../data/catalog.data';
import { BookRecord, EaseBucket, EraBucket, GenreRecord, LengthBucket } from '../models/book.model';
import { WORDS_PER_MINUTE } from '../config';
import { editDistance, normalize, tokenize } from '../utils/text';
import { localized } from '../i18n/i18n';

export type SortKey = 'featured' | 'relevance' | 'title' | 'author' | 'newest' | 'oldest' | 'shortest' | 'longest';

export interface CatalogQuery {
  q?: string;
  genres?: string[];
  lengths?: LengthBucket[];
  eras?: EraBucket[];
  ease?: EaseBucket[];
  author?: string;
  sort?: SortKey;
}

export interface AuthorSummary {
  id: string;
  name: string;
  sort: string;
  count: number;
}

export interface Shelf {
  id: string;
  title: string;
  description: string;
  books: BookRecord[];
}

export const LENGTH_OPTIONS: { id: LengthBucket; label: string }[] = localized([
  { id: 'short', label: 'Under 3 hours' },
  { id: 'medium', label: '3–7 hours' },
  { id: 'long', label: '7+ hours' },
], 'filter.length', ['label']);

export const ERA_OPTIONS: { id: EraBucket; label: string }[] = localized([
  { id: 'ancient', label: 'Before 1500' },
  { id: 'early-modern', label: '1500–1799' },
  { id: 'romantic', label: '1800–1849' },
  { id: 'victorian', label: '1850–1899' },
  { id: 'modern', label: '1900 onwards' },
], 'filter.era', ['label']);

export const EASE_OPTIONS: { id: EaseBucket; label: string }[] = localized([
  { id: 'easy', label: 'Easy going' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'challenging', label: 'Challenging' },
], 'filter.ease', ['label']);

export const SORT_OPTIONS: { id: SortKey; label: string }[] = localized([
  { id: 'featured', label: 'Featured' },
  { id: 'relevance', label: 'Best match' },
  { id: 'title', label: 'Title A–Z' },
  { id: 'author', label: 'Author A–Z' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'newest', label: 'Newest first' },
  { id: 'shortest', label: 'Shortest first' },
  { id: 'longest', label: 'Longest first' },
], 'sort', ['label']);

const EDITORS_PICKS = [
  'pride-and-prejudice',
  'the-great-gatsby',
  'frankenstein',
  'the-adventures-of-sherlock-holmes',
  'the-picture-of-dorian-gray',
  'alices-adventures-in-wonderland',
  'dracula',
  'jane-eyre',
  'the-time-machine',
  'crime-and-punishment',
  'meditations',
  'moby-dick',
];

interface IndexedBook {
  book: BookRecord;
  order: number;
  title: string;
  author: string;
  titleTokens: string[];
  authorTokens: string[];
  creditTokens: string[];
  genreTokens: string[];
  subjectTokens: string[];
  bodyTokens: Set<string>;
}

export function lengthBucket(words: number): LengthBucket {
  const hours = words / WORDS_PER_MINUTE / 60;
  return hours < 3 ? 'short' : hours < 7 ? 'medium' : 'long';
}

export function eraBucket(year: number): EraBucket {
  if (year < 1500) return 'ancient';
  if (year < 1800) return 'early-modern';
  if (year < 1850) return 'romantic';
  if (year < 1900) return 'victorian';
  return 'modern';
}

export function easeBucket(score: number): EaseBucket {
  return score >= 75 ? 'easy' : score >= 65 ? 'moderate' : 'challenging';
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  readonly books: readonly BookRecord[] = BOOKS;
  private readonly allGenres: readonly GenreRecord[] = localized(GENRES, 'genre', ['name', 'blurb']);
  readonly genres: readonly GenreRecord[] = this.allGenres.filter((g) => g.count > 0);

  private readonly byId = new Map(BOOKS.map((b) => [b.id, b]));
  private readonly genreById = new Map(this.allGenres.map((g) => [g.id, g]));
  private readonly index: IndexedBook[] = BOOKS.map((book, order) => {
    // English genre names are indexed here; translated names are matched at query time (see genreTokens).
    const genreNames = book.genres.map((g) => GENRES.find((x) => x.id === g)?.name ?? g).join(' ');
    return {
      book,
      order,
      title: normalize(`${book.title} ${book.subtitle ?? ''}`),
      author: normalize(book.author),
      titleTokens: tokenize(`${book.title} ${book.subtitle ?? ''}`),
      authorTokens: tokenize(book.author),
      creditTokens: tokenize(`${book.translator ?? ''} ${book.illustrator ?? ''}`),
      genreTokens: tokenize(genreNames),
      subjectTokens: tokenize(`${book.subjects.join(' ')} ${book.collections.join(' ')}`),
      bodyTokens: new Set(tokenize(book.tagline)),
    };
  });

  readonly authors: readonly AuthorSummary[] = (() => {
    const map = new Map<string, AuthorSummary>();
    for (const b of BOOKS) {
      const a = map.get(b.authorId) ?? { id: b.authorId, name: b.author, sort: b.authorSort, count: 0 };
      a.count++;
      map.set(b.authorId, a);
    }
    return [...map.values()].sort((a, b) => a.sort.localeCompare(b.sort));
  })();

  get(id: string): BookRecord | undefined {
    return this.byId.get(id);
  }

  genre(id: string): GenreRecord | undefined {
    return this.genreById.get(id);
  }

  author(id: string): AuthorSummary | undefined {
    return this.authors.find((a) => a.id === id);
  }

  coverUrl(book: BookRecord, size: 240 | 480 = 480): string {
    return `covers/${book.id}-${size}.webp`;
  }

  picks(): BookRecord[] {
    return EDITORS_PICKS.map((id) => this.byId.get(id)).filter((b): b is BookRecord => !!b);
  }

  byGenre(genreId: string): BookRecord[] {
    return BOOKS.filter((b) => b.genres.includes(genreId));
  }

  byAuthor(authorId: string, exceptId?: string): BookRecord[] {
    return BOOKS.filter((b) => b.authorId === authorId && b.id !== exceptId);
  }

  /** Books sharing genres and era with the given book, best matches first. */
  related(book: BookRecord, limit = 8): BookRecord[] {
    return BOOKS.filter((b) => b.id !== book.id && b.authorId !== book.authorId)
      .map((b) => {
        let score = 0;
        b.genres.forEach((g, i) => {
          const j = book.genres.indexOf(g);
          if (j >= 0) score += (i === 0 ? 3 : 2) + (j === 0 ? 2 : 0);
        });
        score += b.subjects.filter((s) => book.subjects.includes(s)).length * 1.5;
        score -= Math.abs(b.year - book.year) / 150;
        return { b, score };
      })
      .filter((x) => x.score > 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.b);
  }

  /** Curated shelves for the home page. */
  shelves(): Shelf[] {
    const evening = BOOKS.filter((b) => b.words < 45000 && !b.genres.includes('poetry') && !b.genres.includes('drama'))
      .sort((a, b) => a.words - b.words)
      .slice(0, 12);
    const russians = ['leo-tolstoy', 'fyodor-dostoevsky', 'ivan-turgenev', 'yevgeny-zamyatin'];
    return localized<Shelf>([
      { id: 'evening', title: 'Finish in an evening', description: 'Complete stories you can read in a single sitting.', books: evening },
      { id: 'mystery', title: 'Detectives & dark deeds', description: 'Locked rooms, false alibis and brilliant deductions.', books: this.byGenre('mystery') },
      {
        id: 'worlds',
        title: 'Other worlds',
        description: 'Time machines, Martian deserts and lands beyond the looking-glass.',
        books: BOOKS.filter((b) => b.genres[0] === 'science-fiction' || b.genres[0] === 'fantasy'),
      },
      { id: 'gothic', title: 'Gothic nights', description: 'Candlelit horrors best read with the lights on.', books: this.byGenre('horror') },
      {
        id: 'epics',
        title: 'Epic journeys',
        description: 'The big ones — vast, absorbing novels to live inside for weeks.',
        books: BOOKS.filter((b) => b.words > 250000 && !b.genres.includes('short-stories') && !b.genres.includes('poetry')).sort((a, b) => b.words - a.words),
      },
      { id: 'romance', title: 'Love & manners', description: 'Wit, longing and the art of the proposal.', books: this.byGenre('romance') },
      { id: 'humor', title: 'Laugh out loud', description: 'Comic misadventures, sharp satire and impeccable valets.', books: this.byGenre('humor') },
      { id: 'russians', title: 'The great Russians', description: 'Sweeping, searching novels of conscience.', books: BOOKS.filter((b) => russians.includes(b.authorId)) },
      { id: 'wisdom', title: 'Wisdom for daily life', description: 'Ancient and modern thinking on how to live well.', books: this.byGenre('philosophy') },
    ], 'homeShelf', ['title', 'description']);
  }

  search(query: CatalogQuery): BookRecord[] {
    const qTokens = tokenize(query.q ?? '');
    const qNorm = normalize(query.q ?? '');
    const genres = query.genres ?? [];
    const lengths = query.lengths ?? [];
    const eras = query.eras ?? [];
    const ease = query.ease ?? [];

    const results: { entry: IndexedBook; score: number }[] = [];
    for (const entry of this.index) {
      const b = entry.book;
      if (query.author && b.authorId !== query.author) continue;
      if (genres.length && !genres.some((g) => b.genres.includes(g))) continue;
      if (lengths.length && !lengths.includes(lengthBucket(b.words))) continue;
      if (eras.length && !eras.includes(eraBucket(b.year))) continue;
      if (ease.length && !ease.includes(easeBucket(b.readingEase))) continue;
      const score = qTokens.length ? this.score(entry, qTokens, qNorm) : 0;
      if (score < 0) continue;
      results.push({ entry, score });
    }

    const sort = query.sort ?? (qTokens.length ? 'relevance' : 'featured');
    const cmp: Record<SortKey, (a: (typeof results)[0], b: (typeof results)[0]) => number> = {
      featured: (a, b) => a.entry.order - b.entry.order,
      relevance: (a, b) => b.score - a.score || a.entry.order - b.entry.order,
      title: (a, b) => sortTitle(a.entry.book.title).localeCompare(sortTitle(b.entry.book.title)),
      author: (a, b) => a.entry.book.authorSort.localeCompare(b.entry.book.authorSort) || a.entry.book.year - b.entry.book.year,
      newest: (a, b) => b.entry.book.year - a.entry.book.year,
      oldest: (a, b) => a.entry.book.year - b.entry.book.year,
      shortest: (a, b) => a.entry.book.words - b.entry.book.words,
      longest: (a, b) => b.entry.book.words - a.entry.book.words,
    };
    return results.sort(cmp[sort]).map((r) => r.entry.book);
  }

  /** Quick suggestions for the command palette. */
  suggest(q: string): { books: BookRecord[]; authors: AuthorSummary[]; genres: GenreRecord[] } {
    const norm = normalize(q);
    if (!norm) return { books: [], authors: [], genres: [] };
    const books = this.search({ q, sort: 'relevance' }).slice(0, 6);
    const authors = this.authors.filter((a) => normalize(a.name).split(' ').some((t) => t.startsWith(norm)) || normalize(a.name).startsWith(norm)).slice(0, 4);
    const genres = this.genres
      .filter((g) => [...this.localGenreTokens(g.id), ...tokenize(GENRES.find((x) => x.id === g.id)?.name ?? '')].some((t) => t.startsWith(norm)))
      .slice(0, 3);
    return { books, authors, genres };
  }

  /** Tokens of a genre's name in the active language (cached per name). */
  private localGenreTokens(id: string): string[] {
    const name = this.genreById.get(id)?.name ?? '';
    let tokens = this.genreTokenCache.get(name);
    if (!tokens) this.genreTokenCache.set(name, (tokens = tokenize(name)));
    return tokens;
  }
  private readonly genreTokenCache = new Map<string, string[]>();

  private score(e: IndexedBook, tokens: string[], phrase: string): number {
    let total = 0;
    for (const t of tokens) {
      let best = 0;
      const prefix = (list: string[]) => list.some((w) => w.startsWith(t));
      if (e.titleTokens.includes(t)) best = 30;
      else if (prefix(e.titleTokens)) best = 22;
      if (prefix(e.authorTokens)) best = Math.max(best, e.authorTokens.includes(t) ? 24 : 18);
      if (best < 12 && (prefix(e.genreTokens) || e.book.genres.some((g) => this.localGenreTokens(g).some((w) => w.startsWith(t))))) best = 12;
      if (best < 10 && prefix(e.creditTokens)) best = 10;
      if (best < 8 && prefix(e.subjectTokens)) best = 8;
      if (best < 3 && t.length >= 3 && [...e.bodyTokens].some((w) => w.startsWith(t))) best = 3;
      if (!best && t.length >= 4) {
        const max = t.length >= 7 ? 2 : 1;
        if ([...e.titleTokens, ...e.authorTokens].some((w) => editDistance(t, w, max) <= max)) best = 10;
      }
      if (!best) return -1;
      total += best;
    }
    if (e.title.startsWith(phrase)) total += 40;
    else if (e.title.includes(phrase)) total += 20;
    if (e.author.includes(phrase)) total += 15;
    return total;
  }
}

function sortTitle(title: string): string {
  return title.replace(/^(the|a|an)\s+/i, '');
}
