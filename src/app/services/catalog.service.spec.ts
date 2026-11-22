import { TestBed } from '@angular/core/testing';
import { CatalogService, easeBucket, eraBucket, lengthBucket } from './catalog.service';

describe('CatalogService', () => {
  let catalog: CatalogService;

  beforeEach(() => {
    catalog = TestBed.inject(CatalogService);
  });

  it('exposes a catalog with unique ids and valid genres', () => {
    const ids = catalog.books.map((b) => b.id);
    expect(ids.length).toBeGreaterThan(150);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of catalog.books) {
      expect(b.genres.every((g) => !!catalog.genre(g))).toBe(true);
      expect(b.words).toBeGreaterThan(1000);
    }
  });

  it('ranks title matches first', () => {
    expect(catalog.search({ q: 'pride' })[0].id).toBe('pride-and-prejudice');
    expect(catalog.search({ q: 'time machine' })[0].id).toBe('the-time-machine');
  });

  it('matches authors, accents and typos', () => {
    expect(catalog.search({ q: 'austen' }).every((b) => b.author === 'Jane Austen')).toBe(true);
    expect(catalog.search({ q: 'bronte' }).map((b) => b.id)).toEqual(expect.arrayContaining(['jane-eyre', 'wuthering-heights']));
    expect(catalog.search({ q: 'dracla' })[0].id).toBe('dracula');
    expect(catalog.search({ q: 'frankenstien' })[0].id).toBe('frankenstein');
  });

  it('requires every word to match', () => {
    expect(catalog.search({ q: 'sherlock zzzzqqq' })).toEqual([]);
  });

  it('filters by genre, length, era, reading level and author', () => {
    expect(catalog.search({ genres: ['drama'] }).every((b) => b.genres.includes('drama'))).toBe(true);
    expect(catalog.search({ lengths: ['short'] }).every((b) => lengthBucket(b.words) === 'short')).toBe(true);
    expect(catalog.search({ eras: ['ancient'] }).every((b) => eraBucket(b.year) === 'ancient')).toBe(true);
    expect(catalog.search({ ease: ['easy'] }).every((b) => easeBucket(b.readingEase) === 'easy')).toBe(true);
    expect(catalog.search({ author: 'arthur-conan-doyle' }).length).toBe(catalog.books.filter((b) => b.authorId === 'arthur-conan-doyle').length);
    expect(catalog.search({ author: 'arthur-conan-doyle' }).length).toBeGreaterThanOrEqual(8);
    const both = catalog.search({ genres: ['mystery', 'horror'] });
    expect(both.every((b) => b.genres.includes('mystery') || b.genres.includes('horror'))).toBe(true);
  });

  it('sorts results', () => {
    const shortest = catalog.search({ sort: 'shortest' });
    expect(shortest[0].words).toBeLessThanOrEqual(shortest[1].words);
    const oldest = catalog.search({ sort: 'oldest' });
    expect(oldest[0].year).toBeLessThanOrEqual(oldest[oldest.length - 1].year);
    const titles = catalog.search({ sort: 'title' }).map((b) => b.title.replace(/^(the|a|an)\s+/i, ''));
    expect([...titles].sort((a, b) => a.localeCompare(b))).toEqual(titles);
  });

  it('suggests related books by other authors', () => {
    const book = catalog.get('dracula')!;
    const related = catalog.related(book);
    expect(related.length).toBeGreaterThan(0);
    expect(related.some((b) => b.id === book.id || b.authorId === book.authorId)).toBe(false);
  });

  it('builds non-empty curated shelves and suggestions', () => {
    expect(catalog.shelves().every((s) => s.books.length > 0)).toBe(true);
    const s = catalog.suggest('poe');
    expect(s.authors.map((a) => a.id)).toContain('edgar-allan-poe');
  });
});
