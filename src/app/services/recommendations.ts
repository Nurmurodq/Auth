import { BookRecord, GenreRecord } from '../models/book.model';
import { GOALS, MOODS, occupation } from '../models/profile-options';
import { ReadingProfile, UserData } from '../models/user.model';
import { easeBucket, lengthBucket } from './catalog.service';

export interface Recommendation {
  book: BookRecord;
  score: number;
  /** Human-readable explanation of the strongest signal, e.g. "Because you love Mystery & Crime". */
  reason: string;
}

interface Signal {
  points: number;
  reason: string;
}

const LENGTH_ORDER = ['short', 'medium', 'long'] as const;
const EASE_ORDER = ['easy', 'moderate', 'challenging'] as const;

/**
 * Scores every book against a reader's questionnaire answers and history, then re-ranks for
 * variety (no more than two books per author, gentle penalty for repeating a primary genre).
 *
 * Signals: favourite genres, moods, occupation (curated titles + affinity genres), reading goals,
 * preferred length and difficulty, similarity to books they favourited or finished, and a small
 * prior for widely acclaimed titles. Books already on a shelf or in progress are excluded.
 */
export function recommend(
  books: readonly BookRecord[],
  genres: readonly GenreRecord[],
  profile: ReadingProfile | null,
  data: Pick<UserData, 'library' | 'progress'>,
  limit = 12,
): Recommendation[] {
  const genreName = new Map(genres.map((g) => [g.id, g.name]));
  const seen = new Set([...Object.keys(data.library), ...Object.keys(data.progress)]);
  const liked = Object.values(data.library)
    .filter((e) => e.favorite || e.shelf === 'finished')
    .map((e) => books.find((b) => b.id === e.bookId))
    .filter((b): b is BookRecord => !!b);
  const occ = occupation(profile?.occupation);

  const scored = books
    .filter((b) => !seen.has(b.id))
    .map((book) => {
      const signals: Signal[] = [];
      const add = (points: number, reason: string) => points && signals.push({ points, reason });

      if (profile) {
        // Favourite genres: strongest when it's the book's primary genre.
        for (const g of profile.genres) {
          const i = book.genres.indexOf(g);
          if (i >= 0) add(i === 0 ? 3 : 2, `Because you love ${genreName.get(g) ?? g}`);
        }
        // Moods map onto genres (plus "epic" favours very long books).
        for (const m of profile.moods) {
          const mood = MOODS.find((x) => x.id === m);
          if (!mood) continue;
          const hit = mood.genres.some((g) => book.genres.includes(g));
          if (hit) add(1.5, `Fits your ${mood.label.toLowerCase()} mood`);
          if (m === 'epic' && book.words > 200_000) add(1.5, 'An epic to sink into');
        }
        // Occupation: curated titles and affinity genres.
        if (occ) {
          if (occ.picks.includes(book.id)) add(2.5, `Loved by ${occ.people}`);
          else if (occ.genres.some((g) => book.genres[0] === g)) add(0.8, `Loved by ${occ.people}`);
        }
        // Goals.
        const length = lengthBucket(book.words);
        const ease = easeBucket(book.readingEase);
        for (const goal of profile.goals) {
          const label = GOALS.find((g) => g.id === goal)?.label ?? goal;
          switch (goal) {
            case 'escape':
              if (book.genres.some((g) => ['adventure', 'fantasy', 'mystery', 'science-fiction'].includes(g))) add(1, `Great for when you want to ${label.toLowerCase()}`);
              break;
            case 'unwind':
              if (book.genres.some((g) => ['humor', 'childrens', 'romance'].includes(g)) && ease !== 'challenging') add(1, 'Relaxing company');
              break;
            case 'learn':
              if (book.genres.some((g) => ['philosophy', 'nonfiction'].includes(g))) add(1.5, 'Full of big ideas');
              else if (book.genres.includes('historical')) add(0.5, 'Full of big ideas');
              break;
            case 'classics':
              if (book.collections.length) add(Math.min(2, book.collections.length * 0.7), 'A celebrated classic');
              break;
            case 'study':
              if (occupation('student')?.picks.includes(book.id)) add(2, 'A favourite on reading lists');
              break;
            case 'english':
              if (ease === 'easy') add(2, 'Clear, accessible prose');
              else if (ease === 'challenging') add(-1, '');
              if (length !== 'long') add(0.5, 'Clear, accessible prose');
              break;
            case 'inspiration':
              if (book.genres.some((g) => ['philosophy', 'poetry', 'nonfiction'].includes(g))) add(1.2, 'Wise and inspiring');
              break;
          }
        }
        // Length and difficulty preferences.
        if (profile.length !== 'any') {
          const d = Math.abs(LENGTH_ORDER.indexOf(length) - LENGTH_ORDER.indexOf(profile.length));
          add(d === 0 ? 2 : d === 1 ? 0.3 : -1.5, d === 0 ? (length === 'short' ? 'A satisfying short read' : length === 'long' ? 'A big book to live in' : 'Just the right length') : '');
        }
        if (profile.level !== 'any') {
          const d = Math.abs(EASE_ORDER.indexOf(ease) - EASE_ORDER.indexOf(profile.level));
          add(d === 0 ? 1.5 : d === 1 ? 0 : -1, d === 0 ? 'Matches your preferred reading level' : '');
        }
      }

      // Similarity to books the reader loved.
      let similarity = 0;
      let because: BookRecord | undefined;
      for (const l of liked) {
        let s = 0;
        if (l.authorId === book.authorId) s += 2;
        s += book.genres.filter((g) => l.genres.includes(g)).length * 0.8;
        if (s > similarity) {
          similarity = s;
          because = l;
        }
      }
      if (because && similarity >= 1.6) add(Math.min(3, similarity), `Because you enjoyed ${because.title}`);

      // Small prior for acclaimed titles, so ties favour well-loved books.
      add(Math.min(1.2, book.collections.length * 0.4), '');

      const score = signals.reduce((s, x) => s + x.points, 0);
      // Personal, specific reasons ("Because you enjoyed…") read better than generic ones, so they win close calls.
      const weight = (x: Signal) => x.points + (x.reason.startsWith('Because you enjoyed') ? 0.75 : 0);
      const best = signals.filter((x) => x.reason && x.points > 0).sort((a, b) => weight(b) - weight(a))[0];
      return { book, score, reason: best?.reason ?? 'A reader favourite' };
    })
    .sort((a, b) => b.score - a.score);

  // Variety: at most two titles per author; soften runs of the same primary genre; and make sure
  // every genre the reader chose is represented early on.
  const out: Recommendation[] = [];
  const perAuthor = new Map<string, number>();
  const perGenre = new Map<string, number>();
  const wanted = new Set(profile?.genres ?? []);
  const covered = new Set<string>();
  const pool = [...scored];
  while (out.length < limit && pool.length) {
    let bestIndex = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const r = pool[i];
      if ((perAuthor.get(r.book.authorId) ?? 0) >= 2) continue;
      const coversNew = r.book.genres.some((g) => wanted.has(g) && !covered.has(g));
      const adjusted = r.score - (perGenre.get(r.book.genres[0]) ?? 0) * 1 + (coversNew ? 2 : 0);
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestIndex = i;
      }
    }
    if (bestIndex < 0) break;
    const [pick] = pool.splice(bestIndex, 1);
    out.push(pick);
    perAuthor.set(pick.book.authorId, (perAuthor.get(pick.book.authorId) ?? 0) + 1);
    perGenre.set(pick.book.genres[0], (perGenre.get(pick.book.genres[0]) ?? 0) + 1);
    for (const g of pick.book.genres) if (wanted.has(g)) covered.add(g);
  }
  return out;
}
