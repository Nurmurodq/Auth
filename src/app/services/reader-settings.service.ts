import { Injectable, signal } from '@angular/core';
import { readJson, writeJson } from '../utils/storage';

export type ReaderTheme = 'paper' | 'sepia' | 'dusk' | 'night';
export type ReaderFont = 'literata' | 'source-serif' | 'garamond' | 'inter' | 'atkinson';
export type ReaderWidth = 'narrow' | 'medium' | 'wide';
export type ReaderMode = 'scroll' | 'paged';
export type LineSpacing = 'compact' | 'comfortable' | 'airy';

export interface ReaderSettings {
  theme: ReaderTheme;
  font: ReaderFont;
  fontSize: number;
  lineSpacing: LineSpacing;
  width: ReaderWidth;
  justify: boolean;
  mode: ReaderMode;
}

export const READER_THEMES: { id: ReaderTheme; label: string; bg: string; fg: string }[] = [
  { id: 'paper', label: 'Paper', bg: '#fdfcf9', fg: '#22201c' },
  { id: 'sepia', label: 'Sepia', bg: '#f3e9d4', fg: '#5a4632' },
  { id: 'dusk', label: 'Dusk', bg: '#1f1e1c', fg: '#d9d2c5' },
  { id: 'night', label: 'Night', bg: '#000000', fg: '#b3ab9f' },
];

export const READER_FONTS: { id: ReaderFont; label: string; family: string; note: string }[] = [
  { id: 'literata', label: 'Literata', family: "'Literata Variable', Georgia, serif", note: 'Designed for screens' },
  { id: 'source-serif', label: 'Source Serif', family: "'Source Serif 4 Variable', Georgia, serif", note: 'Crisp and modern' },
  { id: 'garamond', label: 'Garamond', family: "'EB Garamond Variable', Garamond, Georgia, serif", note: 'Classic book face' },
  { id: 'inter', label: 'Inter', family: "'Inter Variable', system-ui, sans-serif", note: 'Clean sans-serif' },
  { id: 'atkinson', label: 'Atkinson', family: "'Atkinson Hyperlegible Next Variable', system-ui, sans-serif", note: 'Maximum legibility' },
];

export const LINE_SPACING: Record<LineSpacing, number> = { compact: 1.5, comfortable: 1.7, airy: 1.9 };
export const READER_WIDTHS: Record<ReaderWidth, string> = { narrow: '32em', medium: '38em', wide: '46em' };
export const FONT_SIZE_RANGE = { min: 14, max: 30, step: 1 };

function defaults(): ReaderSettings {
  const dark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  const small = typeof innerWidth !== 'undefined' && innerWidth < 640;
  return {
    theme: dark ? 'dusk' : 'paper',
    font: 'literata',
    fontSize: small ? 18 : 20,
    lineSpacing: 'comfortable',
    width: 'medium',
    justify: false,
    mode: 'scroll',
  };
}

@Injectable({ providedIn: 'root' })
export class ReaderSettingsService {
  readonly settings = signal<ReaderSettings>({ ...defaults(), ...readJson<Partial<ReaderSettings>>('reader-settings', {}) });

  update(patch: Partial<ReaderSettings>): void {
    this.settings.update((s) => {
      const next = { ...s, ...patch };
      next.fontSize = Math.min(FONT_SIZE_RANGE.max, Math.max(FONT_SIZE_RANGE.min, Math.round(next.fontSize)));
      writeJson('reader-settings', next);
      return next;
    });
  }

  reset(): void {
    const d = defaults();
    writeJson('reader-settings', d);
    this.settings.set(d);
  }
}
