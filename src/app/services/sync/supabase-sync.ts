import { Bookmark, LibraryEntry, ReadingProgress } from '../../models/user.model';
import { getSupabase } from '../auth/supabase-client';
import { SyncAdapter, SyncBatch } from './sync-adapter';

interface LibraryRow {
  user_id: string;
  book_id: string;
  shelf: LibraryEntry['shelf'];
  favorite: boolean;
  added_at: string;
  updated_at: string;
  finished_at: string | null;
}

interface ProgressRow {
  user_id: string;
  book_id: string;
  chapter: number;
  position: number;
  percent: number;
  updated_at: string;
}

interface BookmarkRow {
  id: string;
  user_id: string;
  book_id: string;
  chapter: number;
  position: number;
  excerpt: string;
  note: string | null;
  created_at: string;
}

interface ActivityRow {
  user_id: string;
  day: string;
  seconds: number;
}

/** Syncs reading data with the tables defined in supabase/migrations (row-level security per user). */
export class SupabaseSync implements SyncAdapter {
  async pull(userId: string) {
    const sb = await getSupabase();
    const [lib, prog, marks, act] = await Promise.all([
      sb.from('library_entries').select('*').eq('user_id', userId),
      sb.from('reading_progress').select('*').eq('user_id', userId),
      sb.from('bookmarks').select('*').eq('user_id', userId),
      sb.from('reading_activity').select('*').eq('user_id', userId),
    ]);
    const error = lib.error ?? prog.error ?? marks.error ?? act.error;
    if (error) throw error;

    const library: Record<string, LibraryEntry> = {};
    for (const r of (lib.data ?? []) as LibraryRow[]) {
      library[r.book_id] = {
        bookId: r.book_id,
        shelf: r.shelf,
        favorite: r.favorite,
        addedAt: r.added_at,
        updatedAt: r.updated_at,
        ...(r.finished_at ? { finishedAt: r.finished_at } : {}),
      };
    }
    const progress: Record<string, ReadingProgress> = {};
    for (const r of (prog.data ?? []) as ProgressRow[]) {
      progress[r.book_id] = { bookId: r.book_id, chapter: r.chapter, position: r.position, percent: r.percent, updatedAt: r.updated_at };
    }
    const bookmarks: Bookmark[] = ((marks.data ?? []) as BookmarkRow[]).map((r) => ({
      id: r.id,
      bookId: r.book_id,
      chapter: r.chapter,
      position: r.position,
      excerpt: r.excerpt,
      ...(r.note ? { note: r.note } : {}),
      createdAt: r.created_at,
    }));
    const activity: Record<string, number> = {};
    for (const r of (act.data ?? []) as ActivityRow[]) activity[r.day] = r.seconds;
    return { library, progress, bookmarks, activity };
  }

  async push(userId: string, batch: SyncBatch): Promise<void> {
    const sb = await getSupabase();
    const ops: PromiseLike<{ error: unknown }>[] = [];

    const libUpserts = batch.library.filter((x) => x.entry).map(({ entry: e }) => ({
      user_id: userId,
      book_id: e!.bookId,
      shelf: e!.shelf,
      favorite: e!.favorite,
      added_at: e!.addedAt,
      updated_at: e!.updatedAt,
      finished_at: e!.finishedAt ?? null,
    }));
    const libDeletes = batch.library.filter((x) => !x.entry).map((x) => x.bookId);
    if (libUpserts.length) ops.push(sb.from('library_entries').upsert(libUpserts));
    if (libDeletes.length) ops.push(sb.from('library_entries').delete().eq('user_id', userId).in('book_id', libDeletes));

    const progUpserts = batch.progress.filter((x) => x.progress).map(({ progress: p }) => ({
      user_id: userId,
      book_id: p!.bookId,
      chapter: p!.chapter,
      position: p!.position,
      percent: p!.percent,
      updated_at: p!.updatedAt,
    }));
    const progDeletes = batch.progress.filter((x) => !x.progress).map((x) => x.bookId);
    if (progUpserts.length) ops.push(sb.from('reading_progress').upsert(progUpserts));
    if (progDeletes.length) ops.push(sb.from('reading_progress').delete().eq('user_id', userId).in('book_id', progDeletes));

    const markUpserts = batch.bookmarks.filter((x) => x.bookmark).map(({ bookmark: b }) => ({
      id: b!.id,
      user_id: userId,
      book_id: b!.bookId,
      chapter: b!.chapter,
      position: b!.position,
      excerpt: b!.excerpt,
      note: b!.note ?? null,
      created_at: b!.createdAt,
    }));
    const markDeletes = batch.bookmarks.filter((x) => !x.bookmark).map((x) => x.id);
    if (markUpserts.length) ops.push(sb.from('bookmarks').upsert(markUpserts));
    if (markDeletes.length) ops.push(sb.from('bookmarks').delete().eq('user_id', userId).in('id', markDeletes));

    if (batch.activity.length) {
      ops.push(sb.from('reading_activity').upsert(batch.activity.map((a) => ({ user_id: userId, day: a.day, seconds: a.seconds }))));
    }

    const results = await Promise.all(ops);
    const failed = results.find((r) => r.error);
    if (failed) throw failed.error;
  }
}
