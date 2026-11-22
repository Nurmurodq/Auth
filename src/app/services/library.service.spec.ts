import { webcrypto } from 'node:crypto';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { LibraryService } from './library.service';

describe('LibraryService', () => {
  let library: LibraryService;
  let auth: AuthService;

  beforeAll(() => {
    if (!globalThis.crypto?.subtle) vi.stubGlobal('crypto', webcrypto);
  });

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    auth = TestBed.inject(AuthService);
    library = TestBed.inject(LibraryService);
    await auth.whenReady();
    TestBed.tick();
  });

  async function signUp(): Promise<void> {
    await auth.signUp({ name: 'Ada', email: `ada${Math.random()}@example.com`, password: 'Correct-Horse-42' });
    TestBed.tick();
  }

  it('shelves books and removes entries that are neither shelved nor favourite', async () => {
    await signUp();
    library.setShelf('emma', 'want');
    expect(library.entry('emma')?.shelf).toBe('want');
    expect(library.toggleFavorite('emma')).toBe(true);
    library.setShelf('emma', null);
    expect(library.entry('emma')?.favorite).toBe(true);
    expect(library.toggleFavorite('emma')).toBe(false);
    expect(library.entry('emma')).toBeUndefined();
  });

  it('records finished dates', async () => {
    await signUp();
    library.setShelf('dracula', 'finished');
    expect(library.entry('dracula')?.finishedAt).toBeTruthy();
    library.setShelf('dracula', 'reading');
    expect(library.entry('dracula')?.finishedAt).toBeUndefined();
  });

  it('saves progress and auto-shelves the book for signed-in readers', async () => {
    library.saveProgress('frankenstein', 2, 0.5, 0.1);
    expect(library.entry('frankenstein')).toBeUndefined(); // guests get progress only
    await signUp();
    library.saveProgress('frankenstein', 3, 0.25, 0.12);
    expect(library.progress('frankenstein')?.chapter).toBe(3);
    expect(library.entry('frankenstein')?.shelf).toBe('reading');
    expect(library.continueReading().map((p) => p.bookId)).toContain('frankenstein');
  });

  it('carries guest progress into a new account', async () => {
    library.saveProgress('walden', 1, 0.5, 0.08);
    library.addReadingTime(120);
    await signUp();
    expect(library.progress('walden')?.chapter).toBe(1);
    expect(library.stats().todaySeconds).toBe(120);
  });

  it('adds, annotates, removes and restores bookmarks', async () => {
    await signUp();
    const b = library.addBookmark({ bookId: 'emma', chapter: 2, position: 0.3, excerpt: 'Emma Woodhouse…' });
    library.updateBookmarkNote(b.id, 'Great opening');
    expect(library.bookmarksFor('emma')[0].note).toBe('Great opening');
    const removed = library.removeBookmark(b.id)!;
    expect(library.bookmarksFor('emma')).toHaveLength(0);
    library.restoreBookmark(removed);
    expect(library.bookmarksFor('emma')).toHaveLength(1);
  });

  it('saves the reading profile and daily goal from onboarding', async () => {
    await signUp();
    expect(library.profile()).toBeNull();
    library.saveProfile({ occupation: 'tech', goals: ['learn'], genres: ['science-fiction'], moods: ['suspense'], length: 'medium', level: 'any' }, 45);
    expect(library.profile()?.occupation).toBe('tech');
    expect(library.profile()?.completedAt).toBeTruthy();
    expect(library.data().dailyGoal).toBe(45);
    const first = library.profile()!.completedAt;
    library.saveProfile({ ...library.profile()!, genres: ['mystery'] });
    expect(library.profile()?.genres).toEqual(['mystery']);
    expect(library.profile()?.completedAt).toBe(first);
  });

  it('computes reading streaks and clamps the daily goal', async () => {
    await signUp();
    library.addReadingTime(300);
    expect(library.stats().streak).toBe(1);
    library.setDailyGoal(1000);
    expect(library.data().dailyGoal).toBe(240);
    library.clearHistory();
    expect(library.stats().totalSeconds).toBe(0);
  });
});
