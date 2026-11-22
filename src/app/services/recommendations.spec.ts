import { BOOKS, GENRES } from '../data/catalog.data';
import { OCCUPATIONS } from '../models/profile-options';
import { ReadingProfile, UserData } from '../models/user.model';
import { lengthBucket } from './catalog.service';
import { recommend } from './recommendations';

const empty: Pick<UserData, 'library' | 'progress'> = { library: {}, progress: {} };

function profile(patch: Partial<ReadingProfile>): ReadingProfile {
  return { occupation: null, goals: [], genres: [], moods: [], length: 'any', level: 'any', completedAt: '', updatedAt: '', ...patch };
}

describe('recommend', () => {
  it('only uses curated picks that exist in the catalog', () => {
    const ids = new Set(BOOKS.map((b) => b.id));
    for (const o of OCCUPATIONS) for (const id of o.picks) expect(ids.has(id), `${o.id}: ${id}`).toBe(true);
  });

  it('favours the chosen genres and explains why', () => {
    const recs = recommend(BOOKS, GENRES, profile({ genres: ['science-fiction'] }), empty, 8);
    expect(recs).toHaveLength(8);
    const scifi = recs.filter((r) => r.book.genres.includes('science-fiction')).length;
    expect(scifi).toBeGreaterThanOrEqual(5);
    expect(recs.every((r) => r.reason.length > 0)).toBe(true);
    expect(recs[0].reason).toMatch(/Science Fiction|tech|enjoyed|love/i);
  });

  it('uses occupation picks', () => {
    const recs = recommend(BOOKS, GENRES, profile({ occupation: 'business', genres: ['philosophy'] }), empty, 6);
    const ids = recs.map((r) => r.book.id);
    expect(ids.some((id) => ['the-prince', 'the-art-of-war', 'meditations'].includes(id))).toBe(true);
    expect(recs.some((r) => r.reason === 'Loved by people in business')).toBe(true);
  });

  it('respects length and reading-level preferences', () => {
    const recs = recommend(BOOKS, GENRES, profile({ genres: ['classics'], length: 'short', level: 'easy' }), empty, 10);
    const short = recs.filter((r) => lengthBucket(r.book.words) === 'short').length;
    expect(short).toBeGreaterThanOrEqual(7);
  });

  it('never recommends books the reader already has, and keeps authors varied', () => {
    const now = new Date().toISOString();
    const data: Pick<UserData, 'library' | 'progress'> = {
      library: { 'the-time-machine': { bookId: 'the-time-machine', shelf: 'finished', favorite: true, addedAt: now, updatedAt: now } },
      progress: { 'the-war-of-the-worlds': { bookId: 'the-war-of-the-worlds', chapter: 1, position: 0.2, percent: 0.1, updatedAt: now } },
    };
    const recs = recommend(BOOKS, GENRES, profile({ genres: ['science-fiction'] }), data, 12);
    const ids = recs.map((r) => r.book.id);
    expect(ids).not.toContain('the-time-machine');
    expect(ids).not.toContain('the-war-of-the-worlds');
    const perAuthor = new Map<string, number>();
    for (const r of recs) perAuthor.set(r.book.authorId, (perAuthor.get(r.book.authorId) ?? 0) + 1);
    expect(Math.max(...perAuthor.values())).toBeLessThanOrEqual(2);
    expect(recs.some((r) => r.reason === 'Because you enjoyed The Time Machine')).toBe(true);
  });

  it('still suggests acclaimed books without a profile', () => {
    const recs = recommend(BOOKS, GENRES, null, empty, 6);
    expect(recs).toHaveLength(6);
    expect(recs.every((r) => r.book.collections.length > 0)).toBe(true);
  });
});

describe('recommend variety', () => {
  it('represents every chosen genre near the top', () => {
    const recs = recommend(BOOKS, GENRES, profile({ occupation: 'creative', genres: ['classics', 'poetry', 'romance'], goals: ['classics', 'inspiration'] }), empty, 6);
    for (const g of ['classics', 'poetry', 'romance']) expect(recs.some((r) => r.book.genres.includes(g)), g).toBe(true);
  });
});
