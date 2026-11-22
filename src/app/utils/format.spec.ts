import { dayKey, easeLabel, estimatePages, formatDuration, formatPercent, formatReadingTime, formatYear, initials, readingMinutes } from './format';

describe('format utilities', () => {
  it('estimates reading minutes and pages', () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(2380)).toBe(10);
    expect(estimatePages(27500)).toBe(100);
  });

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(135)).toBe('2 h 15 min');
    expect(formatDuration(-5)).toBe('0 min');
  });

  it('formats compact reading time', () => {
    expect(formatReadingTime(2380)).toBe('10 min');
    expect(formatReadingTime(238 * 60 * 4.3)).toBe('4.5 h');
    expect(formatReadingTime(238 * 60 * 14.2)).toBe('14 h');
  });

  it('formats years including antiquity', () => {
    expect(formatYear(1813)).toBe('1813');
    expect(formatYear(180)).toBe('c. 180 CE');
    expect(formatYear(-500)).toBe('c. 500 BCE');
  });

  it('formats percentages without overstating progress', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(0.004)).toBe('<1%');
    expect(formatPercent(0.999)).toBe('99%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('labels reading ease', () => {
    expect(easeLabel(80)).toBe('Easy');
    expect(easeLabel(60)).toBe('Moderate');
    expect(easeLabel(40)).toBe('Challenging');
  });

  it('builds initials and local day keys', () => {
    expect(initials('Ada King Lovelace')).toBe('AL');
    expect(initials('Plato')).toBe('P');
    expect(initials('  ')).toBe('?');
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
