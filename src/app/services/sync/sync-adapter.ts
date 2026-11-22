import { Bookmark, LibraryEntry, ReadingProgress, UserData } from '../../models/user.model';

/** A pending change to push to the remote store. `null` values mean "delete". */
export interface SyncBatch {
  library: { bookId: string; entry: LibraryEntry | null }[];
  progress: { bookId: string; progress: ReadingProgress | null }[];
  bookmarks: { id: string; bookmark: Bookmark | null }[];
  activity: { day: string; seconds: number }[];
}

export interface SyncAdapter {
  pull(userId: string): Promise<Pick<UserData, 'library' | 'progress' | 'bookmarks' | 'activity'>>;
  push(userId: string, batch: SyncBatch): Promise<void>;
}
