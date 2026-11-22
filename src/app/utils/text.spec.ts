import { editDistance, normalize, tokenize, truncate } from './text';

describe('text utilities', () => {
  it('normalizes accents, apostrophes and punctuation', () => {
    expect(normalize('Brontë’s  “Jane Eyre”!')).toBe('brontes jane eyre');
    expect(tokenize('Dr. Jekyll & Mr. Hyde')).toEqual(['dr', 'jekyll', 'mr', 'hyde']);
    expect(tokenize('   ')).toEqual([]);
  });

  it('computes bounded edit distance', () => {
    expect(editDistance('dracula', 'dracula')).toBe(0);
    expect(editDistance('dracla', 'dracula')).toBe(1);
    expect(editDistance('frankenstien', 'frankenstein')).toBe(2);
    expect(editDistance('cat', 'elephant', 2)).toBe(3);
  });

  it('truncates on word boundaries', () => {
    expect(truncate('short', 10)).toBe('short');
    expect(truncate('It is a truth universally acknowledged, that a single man', 30)).toBe('It is a truth universally…');
  });
});
