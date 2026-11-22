export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export type Shelf = 'want' | 'reading' | 'finished';

export interface LibraryEntry {
  bookId: string;
  shelf: Shelf | null;
  favorite: boolean;
  addedAt: string;
  updatedAt: string;
  finishedAt?: string;
}

export interface ReadingProgress {
  bookId: string;
  /** Zero-based chapter index. */
  chapter: number;
  /** Fraction (0–1) of the current chapter that has been read. */
  position: number;
  /** Fraction (0–1) of the whole book that has been read. */
  percent: number;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapter: number;
  position: number;
  excerpt: string;
  note?: string;
  createdAt: string;
}

export interface UserData {
  version: 1;
  library: Record<string, LibraryEntry>;
  progress: Record<string, ReadingProgress>;
  bookmarks: Bookmark[];
  /** Seconds of active reading per local day (YYYY-MM-DD). */
  activity: Record<string, number>;
  /** Daily reading goal in minutes. */
  dailyGoal: number;
}

export const emptyUserData = (): UserData => ({
  version: 1,
  library: {},
  progress: {},
  bookmarks: [],
  activity: {},
  dailyGoal: 20,
});
