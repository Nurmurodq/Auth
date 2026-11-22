import { Bookmark, LibraryEntry, ReadingProfile, ReadingProgress, UserData } from '../../models/user.model';

/** A pending change to push to the remote store. `null` values mean "delete". */
export interface SyncBatch {
  library: { bookId: string; entry: LibraryEntry | null }[];
  progress: { bookId: string; progress: ReadingProgress | null }[];
  bookmarks: { id: string; bookmark: Bookmark | null }[];
  activity: { day: string; seconds: number }[];
  /** Present only when the reading profile changed. */
  profile?: ReadingProfile | null;
}

export type RemoteData = Pick<UserData, 'library' | 'progress' | 'bookmarks' | 'activity' | 'profile'>;

export interface SyncAdapter {
  pull(userId: string): Promise<RemoteData>;
  push(userId: string, batch: SyncBatch): Promise<void>;
}
