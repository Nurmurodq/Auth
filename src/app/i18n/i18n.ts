import { computed, signal } from '@angular/core';
import { en, MessageKey, Messages, Msg } from './messages/en';

export type { MessageKey } from './messages/en';
export type Lang = 'en' | 'ru' | 'uz';
export type Params = Record<string, string | number>;

export interface LanguageInfo {
  id: Lang;
  /** Name of the language in that language. */
  name: string;
  short: string;
  /** BCP 47 tag for Intl formatting and the <html lang> attribute. */
  locale: string;
}

export const LANGUAGES: readonly LanguageInfo[] = [
  { id: 'en', name: 'English', short: 'EN', locale: 'en' },
  { id: 'ru', name: 'Русский', short: 'RU', locale: 'ru' },
  { id: 'uz', name: 'Oʻzbekcha', short: 'UZ', locale: 'uz-Latn' },
];

/** Content that only ships with a translation (loaded lazily alongside its messages). */
export interface Extras {
  /** One-line book summaries keyed by book id. */
  taglines?: Record<string, string>;
}

export interface Dictionary {
  messages: Messages;
  extras: Extras;
}

const STORAGE_KEY = 'folio:lang';

const loaders: Record<Exclude<Lang, 'en'>, () => Promise<Dictionary>> = {
  ru: () => import('./messages/ru').then((m) => m.dictionary),
  uz: () => import('./messages/uz').then((m) => m.dictionary),
};

const state = signal<{ lang: Lang; dict: Dictionary }>({ lang: 'en', dict: { messages: en, extras: {} } });

/** The active language (a signal: templates and computeds that read it update when it changes). */
export const currentLang = computed(() => state().lang);
export const currentLanguage = computed(() => LANGUAGES.find((l) => l.id === state().lang) ?? LANGUAGES[0]);

/** Locale tag for Intl APIs, e.g. "ru" or "uz-Latn". */
export function locale(): string {
  return currentLanguage().locale;
}

const pluralRules = new Map<string, Intl.PluralRules>();
function pluralCategory(n: number): Intl.LDMLPluralRule {
  const loc = locale();
  let rules = pluralRules.get(loc);
  if (!rules) pluralRules.set(loc, (rules = new Intl.PluralRules(loc)));
  return rules.select(n);
}

/*
 * Uzbek locale data is missing from some browsers' Intl (including some Chromium builds), which then
 * fall back to "2026 M11 23" or "5.5". When that happens we format Uzbek ourselves (CLDR patterns).
 */
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const UZ_MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
const UZ_WEEKDAYS_SHORT = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
const UZ_LANGUAGES: Record<string, string> = { en: 'Ingliz', 'en-GB': 'Ingliz (Britaniya)', 'en-US': 'Ingliz (AQSH)' };

const nativeSupport = new Map<string, boolean>();
/** Whether this browser's Intl really has data for the active locale. */
function hasNativeData(): boolean {
  const loc = locale();
  if (!loc.startsWith('uz')) return true;
  let ok = nativeSupport.get(loc);
  if (ok === undefined) {
    try {
      ok = new Intl.DateTimeFormat(loc, { month: 'long' }).format(new Date(2026, 10, 15)).toLowerCase().includes('noyabr');
    } catch {
      ok = false;
    }
    nativeSupport.set(loc, ok);
  }
  return ok;
}

const numberFormats = new Map<string, Intl.NumberFormat>();
export function formatNumberLocale(n: number): string {
  if (!hasNativeData()) {
    // Uzbek: non-breaking space between thousands, comma for decimals.
    return new Intl.NumberFormat('en').format(n).replace(/,/g, '\u00a0').replace('.', ',');
  }
  const loc = locale();
  let f = numberFormats.get(loc);
  if (!f) numberFormats.set(loc, (f = new Intl.NumberFormat(loc)));
  return f.format(n);
}

/** "23 ноября 2026 г." / "23-noyabr, 2026" / "November 23, 2026" (or with short month names). */
export function formatDateLocale(date: Date, month: 'long' | 'short' = 'long'): string {
  if (!hasNativeData()) {
    const m = (month === 'long' ? UZ_MONTHS : UZ_MONTHS_SHORT)[date.getMonth()];
    return `${date.getDate()}-${m}, ${date.getFullYear()}`;
  }
  return date.toLocaleDateString(locale(), { month, day: 'numeric', year: 'numeric' });
}

/** Short weekday name, e.g. "пн", "Dush", "Mon". */
export function formatWeekdayLocale(date: Date): string {
  if (!hasNativeData()) return UZ_WEEKDAYS_SHORT[date.getDay()];
  return date.toLocaleDateString(locale(), { weekday: 'short' });
}

const relativeFormats = new Map<string, Intl.RelativeTimeFormat>();
/** "2 дня назад", "kecha", "in 3 hours"… */
export function formatRelativeLocale(value: number, unit: 'minute' | 'hour' | 'day'): string {
  if (!hasNativeData()) {
    const n = Math.abs(value);
    if (unit === 'day' && value === -1) return 'kecha';
    if (unit === 'day' && value === 1) return 'ertaga';
    if (value === 0) return unit === 'day' ? 'bugun' : unit === 'hour' ? 'shu soatda' : 'shu daqiqada';
    const word = unit === 'day' ? 'kun' : unit === 'hour' ? 'soat' : 'daqiqa';
    return value < 0 ? `${n} ${word} oldin` : `${n} ${word}dan keyin`;
  }
  const loc = locale();
  let f = relativeFormats.get(loc);
  if (!f) relativeFormats.set(loc, (f = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' })));
  return f.format(value, unit);
}

/** The name of a language (BCP 47 code) in the active language, capitalised. */
export function languageName(code: string): string {
  if (!hasNativeData()) return UZ_LANGUAGES[code] ?? UZ_LANGUAGES[code.split('-')[0]] ?? code;
  try {
    const name = new Intl.DisplayNames([locale()], { type: 'language' }).of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase(locale()) + name.slice(1);
  } catch {
    return code;
  }
}

function render(msg: Msg, params?: Params): string {
  let text: string;
  if (typeof msg === 'string') text = msg;
  else {
    const n = Number(params?.['count'] ?? 0);
    text = msg[pluralCategory(n)] ?? msg.other;
  }
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    if (!(name in params)) return whole;
    const v = params[name];
    return typeof v === 'number' ? formatNumberLocale(v) : v;
  });
}

/**
 * Translates a message key into the active language. `{name}` placeholders are filled from
 * `params`; numbers are formatted for the locale, and `count` selects the plural form.
 */
export function t(key: MessageKey, params?: Params): string {
  const { dict } = state();
  return render(dict.messages[key] ?? en[key] ?? key, params);
}

/** Like `t`, for keys built at runtime. Falls back to `fallback` when the key doesn't exist. */
export function tKey(key: string, fallback: string, params?: Params): string {
  const msg = (state().dict.messages as Record<string, Msg>)[key] ?? (en as Record<string, Msg>)[key];
  return msg === undefined ? fallback : render(msg, params);
}

export function hasKey(key: string): boolean {
  return key in en;
}

/** A translated one-line summary of a book, when the active language provides one. */
export function translatedTagline(bookId: string): string | null {
  return state().dict.extras.taglines?.[bookId] ?? null;
}

/**
 * Returns copies of `items` whose `fields` are live getters translating `${prefix}.${id}.${field}`
 * (falling back to the original English text), so existing templates stay unchanged.
 */
export function localized<T extends { id: string }>(items: readonly T[], prefix: string, fields: readonly (keyof T & string)[]): T[] {
  return items.map((item) => {
    const copy = { ...item };
    for (const field of fields) {
      const original = String(item[field]);
      const key = `${prefix}.${item.id}.${field}`;
      Object.defineProperty(copy, field, { get: () => tKey(key, original), enumerable: true, configurable: true });
    }
    return copy;
  });
}

function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'ru' || value === 'uz';
}

/** ?lang= in the URL, then the saved choice, then the browser's preferred languages. */
export function detectLang(): Lang {
  try {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (isLang(fromUrl)) return fromUrl;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  for (const l of navigator.languages ?? [navigator.language]) {
    const base = l.toLowerCase().split('-')[0];
    if (base === 'uz') return 'uz';
    if (base === 'ru') return 'ru';
    if (base === 'en') return 'en';
  }
  return 'en';
}

let pending: Promise<void> | null = null;

/** Switches language, loading its messages first so the UI never shows a half-translated state. */
export async function setLang(lang: Lang, persist = true): Promise<void> {
  const dict = lang === 'en' ? { messages: en, extras: {} } : await loaders[lang]();
  state.set({ lang, dict });
  const info = LANGUAGES.find((l) => l.id === lang)!;
  document.documentElement.lang = info.locale;
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable */
    }
  }
}

/** Loads the reader's language before the app renders. */
export function initI18n(): Promise<void> {
  pending ??= setLang(detectLang(), false).catch(() => setLang('en', false));
  return pending;
}

/** The book's one-line summary in the active language (English when no translation exists). */
export function bookTagline(book: { id: string; tagline: string }): string {
  return translatedTagline(book.id) ?? book.tagline;
}
