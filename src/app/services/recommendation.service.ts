import { Injectable, computed, inject } from '@angular/core';
import { BookRecord } from '../models/book.model';
import { AuthService } from './auth/auth.service';
import { CatalogService } from './catalog.service';
import { LibraryService } from './library.service';
import { Recommendation, recommend } from './recommendations';

/** Reactive, personalised recommendations for the signed-in reader. */
@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly catalog = inject(CatalogService);
  private readonly library = inject(LibraryService);
  private readonly auth = inject(AuthService);

  /** True once the reader has answered the welcome questionnaire. */
  readonly hasProfile = computed(() => !!this.library.profile());
  /** Signed-in readers who haven't told us their interests yet. */
  readonly needsProfile = computed(() => this.auth.isAuthenticated() && !this.hasProfile());

  readonly forYou = computed<Recommendation[]>(() => {
    const data = this.library.data();
    return recommend(this.catalog.books, this.catalog.genres, data.profile, data, 12);
  });

  /** "Because you enjoyed X": related titles for the reader's most recent favourite or finished book. */
  readonly becauseYouEnjoyed = computed<{ book: BookRecord; related: BookRecord[] } | null>(() => {
    const data = this.library.data();
    const anchor = Object.values(data.library)
      .filter((e) => e.favorite || e.shelf === 'finished')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((e) => this.catalog.get(e.bookId))
      .find((b): b is BookRecord => !!b);
    if (!anchor) return null;
    const seen = new Set([...Object.keys(data.library), ...Object.keys(data.progress)]);
    const related = this.catalog.related(anchor, 16).filter((b) => !seen.has(b.id)).slice(0, 10);
    return related.length >= 3 ? { book: anchor, related } : null;
  });
}
