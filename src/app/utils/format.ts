import { WORDS_PER_MINUTE, WORDS_PER_PAGE } from '../config';
import { formatDateLocale, formatNumberLocale, formatRelativeLocale, t } from '../i18n/i18n';

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** "4 h 20 min", "45 min" (localised) */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return t('time.min', { m });
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? t('time.hMin', { h, m: rest }) : t('time.h', { h });
}

/** Compact reading time: "4.5 h", "45 min" (localised) */
export function formatReadingTime(words: number): string {
  const minutes = readingMinutes(words);
  if (minutes < 60) return t('time.min', { m: minutes });
  const hours = minutes / 60;
  return t('time.h', { h: hours < 10 ? Math.round(hours * 2) / 2 : Math.round(hours) });
}

export function estimatePages(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_PAGE));
}

export function formatYear(year: number): string {
  if (year < 0) return t('year.bce', { year: String(Math.abs(year)) });
  if (year < 1000) return t('year.ce', { year: String(year) });
  return String(year);
}

export function formatNumber(n: number): string {
  return formatNumberLocale(n);
}

export function formatPercent(fraction: number): string {
  const pct = fraction * 100;
  if (pct > 0 && pct < 1) return '<1%';
  return `${Math.min(100, Math.floor(pct))}%`;
}

export function easeLabel(score: number): string {
  if (score >= 70) return t('ease.easy');
  if (score >= 55) return t('ease.moderate');
  return t('ease.challenging');
}

export function formatRelative(iso: string, now = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return t('time.justNow');
  if (abs < 3600) return formatRelativeLocale(Math.round(diff / 60), 'minute');
  if (abs < 86400) return formatRelativeLocale(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 7) return formatRelativeLocale(Math.round(diff / 86400), 'day');
  return formatDateLocale(new Date(iso), 'short');
}

export function formatDate(iso: string): string {
  return formatDateLocale(new Date(iso), 'long');
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
