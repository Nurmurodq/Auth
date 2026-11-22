import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { BACKEND } from '../config';
import { Bookmark, LibraryEntry, ReadingProgress, Shelf, User, UserData, emptyUserData } from '../models/user.model';
import { dayKey } from '../utils/format';
import { readJson, removeKey, storageKey, writeJson } from '../utils/storage';
import { uid } from '../utils/text';
import { AuthService } from './auth/auth.service';
import { SupabaseSync } from './sync/supabase-sync';
import { SyncAdapter, SyncBatch } from './sync/sync-adapter';
import { ToastService } from './toast.service';

const GUEST = 'guest';

interface DirtySets {
  library: string[];
  progress: string[];
  bookmarks: string[];
  activity: string[];
}

export interface ReadingStats {
  totalSeconds: number;
  todaySeconds: number;
  weekSeconds: number;
  streak: number;
  /** Last 14 days, oldest first. */
  days: { key: string; label: string; seconds: number }[];
  finished: number;
  inProgress: number;
}

/**
 * Owns everything a reader accumulates: shelves, favourites, reading progress,
 * bookmarks and reading time. State is local-first (instant, works offline) and,
 * with the Supabase backend, synchronised in the background.
 */
@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly sync: SyncAdapter | null = BACKEND === 'supabase' ? new SupabaseSync() : null;

  readonly data = signal<UserData>(emptyUserData());
  readonly syncing = signal(false);
  private owner = '';
  /** True when in-memory state has changes not yet written to storage. */
  private unsaved = false;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty: DirtySets = { library: [], progress: [], bookmarks: [], activity: [] };

  /* ---------------------------- selectors ---------------------------- */

  readonly entries = computed(() => Object.values(this.data().library).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  readonly favorites = computed(() => this.entries().filter((e) => e.favorite));
  readonly bookmarks = computed(() => [...this.data().bookmarks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

  /** Books with reading progress that aren't finished, most recent first. */
  readonly continueReading = computed(() => {
    const { progress, library } = this.data();
    return Object.values(progress)
      .filter((p) => p.percent < 0.995 && library[p.bookId]?.shelf !== 'finished')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });

  readonly stats = computed<ReadingStats>(() => {
    const { activity, library } = this.data();
    const today = new Date();
    const days: ReadingStats['days'] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = dayKey(d);
      days.push({ key, label: d.toLocaleDateString('en', { weekday: 'narrow' }), seconds: activity[key] ?? 0 });
    }
    let streak = 0;
    for (let i = 0; i < 3650; i++) {
      const key = dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
      if ((activity[key] ?? 0) >= 60) streak++;
      else if (i > 0) break; // today may still be empty without breaking the streak
    }
    const entries = Object.values(library);
    return {
      totalSeconds: Object.values(activity).reduce((s, v) => s + v, 0),
      todaySeconds: activity[dayKey(today)] ?? 0,
      weekSeconds: days.slice(-7).reduce((s, d) => s + d.seconds, 0),
      streak,
      days,
      finished: entries.filter((e) => e.shelf === 'finished').length,
      inProgress: this.continueReading().length,
    };
  });

  entry(bookId: string): LibraryEntry | undefined {
    return this.data().library[bookId];
  }

  progress(bookId: string): ReadingProgress | undefined {
    return this.data().progress[bookId];
  }

  bookmarksFor(bookId: string): Bookmark[] {
    return this.data()
      .bookmarks.filter((b) => b.bookId === bookId)
      .sort((a, b) => a.chapter - b.chapter || a.position - b.position);
  }

  shelf(shelf: Shelf): LibraryEntry[] {
    return this.entries().filter((e) => e.shelf === shelf);
  }

  constructor() {
    effect(() => {
      if (!this.auth.ready()) return;
      const user = this.auth.user();
      untracked(() => this.switchOwner(user));
    });

    window.addEventListener('storage', (e) => {
      if (e.key === storageKey(`data:${this.owner}`) && e.newValue) {
        try {
          this.data.set(normalizeData(JSON.parse(e.newValue)));
          this.unsaved = false;
        } catch {
          /* ignore malformed */
        }
      }
    });
    window.addEventListener('online', () => this.scheduleFlush(0));
    window.addEventListener('pagehide', () => this.persistNow());
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && this.persistNow());
  }

  /* ---------------------------- auth gate ---------------------------- */

  /** Returns true when signed in; otherwise sends the person to sign in and returns false. */
  requireAccount(message = 'Sign in to save books to your library.'): boolean {
    if (this.auth.isAuthenticated()) return true;
    this.toast.show(message);
    void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    return false;
  }

  /* ---------------------------- mutations ---------------------------- */

  setShelf(bookId: string, shelf: Shelf | null): void {
    this.mutate((d) => {
      const now = new Date().toISOString();
      const prev = d.library[bookId];
      const entry: LibraryEntry = prev
        ? { ...prev, shelf, updatedAt: now }
        : { bookId, shelf, favorite: false, addedAt: now, updatedAt: now };
      if (shelf === 'finished') entry.finishedAt = prev?.finishedAt && prev.shelf === 'finished' ? prev.finishedAt : now;
      else delete entry.finishedAt;
      if (!entry.shelf && !entry.favorite) delete d.library[bookId];
      else d.library[bookId] = entry;
      this.markDirty('library', bookId);
    });
  }

  toggleFavorite(bookId: string): boolean {
    let favorite = false;
    this.mutate((d) => {
      const now = new Date().toISOString();
      const prev = d.library[bookId];
      favorite = !prev?.favorite;
      const entry: LibraryEntry = prev ? { ...prev, favorite, updatedAt: now } : { bookId, shelf: null, favorite, addedAt: now, updatedAt: now };
      if (!entry.shelf && !entry.favorite) delete d.library[bookId];
      else d.library[bookId] = entry;
      this.markDirty('library', bookId);
    });
    return favorite;
  }

  removeFromLibrary(bookId: string): LibraryEntry | undefined {
    const prev = this.data().library[bookId];
    this.mutate((d) => {
      delete d.library[bookId];
      this.markDirty('library', bookId);
    });
    return prev;
  }

  restoreEntry(entry: LibraryEntry): void {
    this.mutate((d) => {
      d.library[entry.bookId] = { ...entry, updatedAt: new Date().toISOString() };
      this.markDirty('library', entry.bookId);
    });
  }

  saveProgress(bookId: string, chapter: number, position: number, percent: number): void {
    this.mutate(
      (d) => {
        const now = new Date().toISOString();
        d.progress[bookId] = { bookId, chapter, position: round(position), percent: round(percent), updatedAt: now };
        this.markDirty('progress', bookId);
        // Signed-in readers get their current book shelved automatically.
        if (this.auth.isAuthenticated()) {
          const entry = d.library[bookId];
          if (!entry || entry.shelf === null || entry.shelf === 'want') {
            d.library[bookId] = entry
              ? { ...entry, shelf: 'reading', updatedAt: now }
              : { bookId, shelf: 'reading', favorite: false, addedAt: now, updatedAt: now };
            this.markDirty('library', bookId);
          }
        }
      },
      { debounce: true },
    );
  }

  addBookmark(input: Omit<Bookmark, 'id' | 'createdAt'>): Bookmark {
    const bookmark: Bookmark = { ...input, id: uid(), createdAt: new Date().toISOString() };
    this.mutate((d) => {
      d.bookmarks = [...d.bookmarks, bookmark];
      this.markDirty('bookmarks', bookmark.id);
    });
    return bookmark;
  }

  updateBookmarkNote(id: string, note: string): void {
    this.mutate((d) => {
      d.bookmarks = d.bookmarks.map((b) => (b.id === id ? { ...b, note: note.trim() || undefined } : b));
      this.markDirty('bookmarks', id);
    });
  }

  removeBookmark(id: string): Bookmark | undefined {
    const removed = this.data().bookmarks.find((b) => b.id === id);
    this.mutate((d) => {
      d.bookmarks = d.bookmarks.filter((b) => b.id !== id);
      this.markDirty('bookmarks', id);
    });
    return removed;
  }

  restoreBookmark(bookmark: Bookmark): void {
    this.mutate((d) => {
      d.bookmarks = [...d.bookmarks.filter((b) => b.id !== bookmark.id), bookmark];
      this.markDirty('bookmarks', bookmark.id);
    });
  }

  addReadingTime(seconds: number): void {
    const key = dayKey();
    this.mutate(
      (d) => {
        d.activity[key] = (d.activity[key] ?? 0) + seconds;
        this.markDirty('activity', key);
      },
      { debounce: true },
    );
  }

  setDailyGoal(minutes: number): void {
    this.mutate((d) => {
      d.dailyGoal = Math.min(240, Math.max(5, Math.round(minutes)));
    });
  }

  clearHistory(): void {
    this.mutate((d) => {
      Object.keys(d.progress).forEach((id) => this.markDirty('progress', id));
      d.progress = {};
      d.activity = {};
    });
  }

  exportData(): string {
    return JSON.stringify({ exportedAt: new Date().toISOString(), user: this.auth.user(), data: this.data() }, null, 2);
  }

  /* ---------------------------- internals ---------------------------- */

  private mutate(fn: (draft: UserData) => void, opts: { debounce?: boolean } = {}): void {
    const draft = structuredClone(this.data());
    fn(draft);
    this.data.set(draft);
    this.unsaved = true;
    if (opts.debounce) this.schedulePersist();
    else this.persistNow();
    this.scheduleFlush(opts.debounce ? 4000 : 800);
  }

  private schedulePersist(): void {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => this.persistNow(), 1000);
  }

  /** Writes state to storage. Without `force`, only when there are unsaved changes, so an idle tab never overwrites newer data. */
  private persistNow(force = false): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = null;
    if (!this.owner || (!this.unsaved && !force)) return;
    this.unsaved = false;
    writeJson(`data:${this.owner}`, this.data());
    if (this.owner !== GUEST) writeJson(`dirty:${this.owner}`, this.dirty);
  }

  private markDirty(kind: keyof DirtySets, id: string): void {
    if (!this.sync || this.owner === GUEST) return;
    if (!this.dirty[kind].includes(id)) this.dirty[kind].push(id);
  }

  private switchOwner(user: User | null): void {
    const next = user?.id ?? GUEST;
    if (next === this.owner) return;
    this.persistNow();
    const previous = this.owner;
    this.owner = next;

    let data = normalizeData(readJson<UserData | null>(`data:${next}`, null));
    this.dirty = readJson<DirtySets>(`dirty:${next}`, { library: [], progress: [], bookmarks: [], activity: [] });

    // Carry reading done as a guest into the account that just signed in.
    if (user && (previous === GUEST || previous === '')) {
      const guest = readJson<UserData | null>(`data:${GUEST}`, null);
      if (guest && (Object.keys(guest.progress).length || Object.keys(guest.activity).length)) {
        data = mergeGuest(data, normalizeData(guest));
        Object.keys(guest.progress).forEach((id) => this.markDirty('progress', id));
        Object.keys(guest.activity).forEach((day) => this.markDirty('activity', day));
        removeKey(`data:${GUEST}`);
      }
    }
    this.data.set(data);
    this.persistNow(true);
    if (user && this.sync) void this.pull(user.id);
  }

  private async pull(userId: string): Promise<void> {
    if (!this.sync) return;
    this.syncing.set(true);
    try {
      const remote = await this.sync.pull(userId);
      if (this.owner !== userId) return;
      const merged = mergeRemote(this.data(), remote, (kind, id) => this.markDirty(kind, id));
      this.data.set(merged);
      this.persistNow(true);
      this.scheduleFlush(0);
    } catch (err) {
      console.warn('Sync pull failed', err);
    } finally {
      this.syncing.set(false);
    }
  }

  private scheduleFlush(delay: number): void {
    if (!this.sync || this.owner === GUEST || !this.owner) return;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => void this.flush(), delay);
  }

  private async flush(): Promise<void> {
    const sync = this.sync;
    const userId = this.owner;
    if (!sync || userId === GUEST || !navigator.onLine) return;
    const taken = this.dirty;
    if (!taken.library.length && !taken.progress.length && !taken.bookmarks.length && !taken.activity.length) return;
    this.dirty = { library: [], progress: [], bookmarks: [], activity: [] };
    const d = this.data();
    const batch: SyncBatch = {
      library: taken.library.map((bookId) => ({ bookId, entry: d.library[bookId] ?? null })),
      progress: taken.progress.map((bookId) => ({ bookId, progress: d.progress[bookId] ?? null })),
      bookmarks: taken.bookmarks.map((id) => ({ id, bookmark: d.bookmarks.find((b) => b.id === id) ?? null })),
      activity: taken.activity.map((day) => ({ day, seconds: d.activity[day] ?? 0 })),
    };
    try {
      await sync.push(userId, batch);
    } catch (err) {
      console.warn('Sync push failed; will retry', err);
      for (const k of Object.keys(taken) as (keyof DirtySets)[]) {
        for (const id of taken[k]) if (!this.dirty[k].includes(id)) this.dirty[k].push(id);
      }
      this.scheduleFlush(30000);
    } finally {
      if (this.owner === userId) writeJson(`dirty:${userId}`, this.dirty);
    }
  }
}

function round(n: number): number {
  return Math.round(Math.min(1, Math.max(0, n)) * 10000) / 10000;
}

function normalizeData(raw: Partial<UserData> | null): UserData {
  const base = emptyUserData();
  if (!raw || typeof raw !== 'object') return base;
  return {
    version: 1,
    library: raw.library ?? base.library,
    progress: raw.progress ?? base.progress,
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : base.bookmarks,
    activity: raw.activity ?? base.activity,
    dailyGoal: typeof raw.dailyGoal === 'number' ? raw.dailyGoal : base.dailyGoal,
  };
}

function mergeGuest(user: UserData, guest: UserData): UserData {
  const out = structuredClone(user);
  for (const p of Object.values(guest.progress)) {
    const mine = out.progress[p.bookId];
    if (!mine || mine.updatedAt < p.updatedAt) out.progress[p.bookId] = p;
  }
  for (const [day, secs] of Object.entries(guest.activity)) out.activity[day] = (out.activity[day] ?? 0) + secs;
  return out;
}

function mergeRemote(
  local: UserData,
  remote: Pick<UserData, 'library' | 'progress' | 'bookmarks' | 'activity'>,
  markDirty: (kind: keyof DirtySets, id: string) => void,
): UserData {
  const out = structuredClone(local);
  for (const [id, r] of Object.entries(remote.library)) {
    const l = out.library[id];
    if (!l || l.updatedAt < r.updatedAt) out.library[id] = r;
  }
  for (const [id, l] of Object.entries(out.library)) {
    const r = remote.library[id];
    if (!r || r.updatedAt < l.updatedAt) markDirty('library', id);
  }
  for (const [id, r] of Object.entries(remote.progress)) {
    const l = out.progress[id];
    if (!l || l.updatedAt < r.updatedAt) out.progress[id] = r;
  }
  for (const [id, l] of Object.entries(out.progress)) {
    const r = remote.progress[id];
    if (!r || r.updatedAt < l.updatedAt) markDirty('progress', id);
  }
  const known = new Set(out.bookmarks.map((b) => b.id));
  for (const b of remote.bookmarks) if (!known.has(b.id)) out.bookmarks.push(b);
  const remoteIds = new Set(remote.bookmarks.map((b) => b.id));
  for (const b of out.bookmarks) if (!remoteIds.has(b.id)) markDirty('bookmarks', b.id);
  for (const [day, secs] of Object.entries(remote.activity)) {
    if ((out.activity[day] ?? 0) < secs) out.activity[day] = secs;
  }
  for (const [day, secs] of Object.entries(out.activity)) if ((remote.activity[day] ?? 0) < secs) markDirty('activity', day);
  return out;
}
