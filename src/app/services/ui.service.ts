import { Injectable, signal } from '@angular/core';

/** Cross-cutting UI state (overlays that can be opened from anywhere). */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly searchOpen = signal(false);
  readonly searchSeed = signal('');

  openSearch(seed = ''): void {
    this.searchSeed.set(seed);
    this.searchOpen.set(true);
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }
}
