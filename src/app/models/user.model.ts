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

export type OccupationId =
  | 'student'
  | 'educator'
  | 'tech'
  | 'science'
  | 'health'
  | 'business'
  | 'law'
  | 'creative'
  | 'retired'
  | 'other';

export type GoalId = 'escape' | 'learn' | 'study' | 'classics' | 'english' | 'unwind' | 'inspiration';

export type MoodId = 'adventurous' | 'romantic' | 'suspense' | 'thoughtful' | 'dark' | 'funny' | 'uplifting' | 'epic';

/** Answers from the welcome questionnaire, used to personalise recommendations. */
export interface ReadingProfile {
  occupation: OccupationId | null;
  goals: GoalId[];
  genres: string[];
  moods: MoodId[];
  length: 'short' | 'medium' | 'long' | 'any';
  level: 'easy' | 'moderate' | 'challenging' | 'any';
  completedAt: string;
  updatedAt: string;
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
  /** Interests and habits from onboarding; null until the questionnaire is completed. */
  profile: ReadingProfile | null;
}

export const emptyUserData = (): UserData => ({
  version: 1,
  library: {},
  progress: {},
  bookmarks: [],
  activity: {},
  dailyGoal: 20,
  profile: null,
});
