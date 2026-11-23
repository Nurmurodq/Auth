import { afterEach, describe, expect, it } from 'vitest';
import { GENRES } from '../data/catalog.data';
import { GOALS, LENGTH_PREFS, LEVEL_PREFS, MOODS, OCCUPATIONS } from '../models/profile-options';
import { ERA_OPTIONS, LENGTH_OPTIONS, SORT_OPTIONS } from '../services/catalog.service';
import { formatDuration, formatYear } from '../utils/format';
import { bookTagline, currentLang, hasKey, localized, setLang, t } from './i18n';
import { en } from './messages/en';
import { dictionary as ru } from './messages/ru';
import { dictionary as uz } from './messages/uz';

describe('i18n', () => {
  afterEach(async () => {
    await setLang('en', false);
  });

  it('fills parameters and picks English plural forms', () => {
    expect(t('common.books', { count: 1 })).toBe('1 book');
    expect(t('common.books', { count: 172 })).toBe('172 books');
    expect(t('card.label', { title: 'Emma', author: 'Jane Austen' })).toBe('Emma by Jane Austen');
  });

  it('uses Russian one/few/many plural forms', async () => {
    await setLang('ru', false);
    expect(currentLang()).toBe('ru');
    expect(t('common.books', { count: 1 })).toBe('1 книга');
    expect(t('common.books', { count: 3 })).toBe('3 книги');
    expect(t('common.books', { count: 11 })).toBe('11 книг');
    expect(t('common.books', { count: 21 })).toBe('21 книга');
    expect(formatDuration(135)).toBe('2 ч 15 мин');
    expect(document.documentElement.lang).toBe('ru');
  });

  it('switches to Uzbek, including localised durations, years and book summaries', async () => {
    await setLang('uz', false);
    expect(t('nav.library')).toBe('Kutubxonam');
    expect(t('common.books', { count: 5 })).toBe('5 ta kitob');
    expect(formatDuration(45)).toBe('45 daq');
    expect(formatYear(-500)).toBe('taxm. mil. avv. 500');
    expect(bookTagline({ id: 'frankenstein', tagline: 'x' })).toContain('maxluq');
    expect(bookTagline({ id: 'not-a-book', tagline: 'fallback' })).toBe('fallback');
  });

  it('keeps localised option labels live when the language changes', async () => {
    const [opt] = localized([{ id: 'short', label: 'Under 3 hours' }], 'filter.length', ['label']);
    expect(opt.label).toBe('Under 3 hours');
    await setLang('ru', false);
    expect(opt.label).toBe('До 3 часов');
    expect(LENGTH_OPTIONS[0].label).toBe('До 3 часов');
  });

  it('has a message for every runtime-built key', () => {
    const keys = [
      ...GENRES.flatMap((g) => [`genre.${g.id}.name`, `genre.${g.id}.blurb`]),
      ...OCCUPATIONS.flatMap((o) => [`occupation.${o.id}.label`, `occupation.${o.id}.people`]),
      ...GOALS.flatMap((g) => [`goal.${g.id}.label`, `goal.${g.id}.description`]),
      ...MOODS.map((m) => `mood.${m.id}.label`),
      ...LENGTH_PREFS.flatMap((o) => [`lengthPref.${o.id}.label`, `lengthPref.${o.id}.hint`]),
      ...LEVEL_PREFS.flatMap((o) => [`levelPref.${o.id}.label`, `levelPref.${o.id}.hint`]),
      ...ERA_OPTIONS.map((o) => `filter.era.${o.id}.label`),
      ...SORT_OPTIONS.map((o) => `sort.${o.id}.label`),
    ];
    expect(keys.filter((k) => !hasKey(k))).toEqual([]);
  });

  it('translates every message into Russian and Uzbek with the same placeholders', () => {
    const placeholders = (m: unknown) => [...new Set(JSON.stringify(m).match(/\{\w+\}/g) ?? [])].filter((p) => p !== '{count}').sort();
    for (const [name, dict] of [
      ['ru', ru],
      ['uz', uz],
    ] as const) {
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        const msg = dict.messages[key];
        expect(msg, `${name}: ${key}`).toBeTruthy();
        expect(placeholders(msg), `${name}: ${key}`).toEqual(placeholders(en[key]));
      }
      expect(Object.keys(dict.extras.taglines ?? {}).length).toBe(172);
    }
  });
});
