import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';
import { readString, writeString } from '../utils/storage';

export type ThemePreference = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly media = this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media?.matches ?? false);

  readonly preference = signal<ThemePreference>((readString('theme') as ThemePreference) || 'system');
  readonly resolved = computed<'light' | 'dark'>(() => {
    const pref = this.preference();
    return pref === 'system' ? (this.systemDark() ? 'dark' : 'light') : pref;
  });

  constructor() {
    this.media?.addEventListener('change', (e) => this.systemDark.set(e.matches));
    effect(() => {
      const theme = this.resolved();
      this.doc.documentElement.dataset['theme'] = theme;
      this.doc.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
        m.setAttribute('content', theme === 'dark' ? '#121110' : '#f8f6f1');
        m.removeAttribute('media');
      });
    });
  }

  set(pref: ThemePreference): void {
    this.preference.set(pref);
    writeString('theme', pref);
  }

  toggle(): void {
    this.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }
}
