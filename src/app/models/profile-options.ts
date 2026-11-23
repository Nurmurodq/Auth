import { GoalId, MoodId, OccupationId, ReadingProfile } from './user.model';
import { localized } from '../i18n/i18n';

export interface OccupationOption {
  id: OccupationId;
  label: string;
  emoji: string;
  /** Short phrase used in recommendation reasons: "Loved by people in tech". */
  people: string;
  /** Genres that tend to resonate. */
  genres: string[];
  /** Hand-picked titles with particular relevance. */
  picks: string[];
}

export const OCCUPATIONS: OccupationOption[] = localized<OccupationOption>([
  {
    id: 'student',
    label: 'Student',
    emoji: '🎓',
    people: 'students',
    genres: ['classics', 'drama', 'short-stories'],
    picks: [
      'the-great-gatsby',
      'frankenstein',
      'pride-and-prejudice',
      'macbeth',
      'romeo-and-juliet',
      'the-adventures-of-huckleberry-finn',
      'the-scarlet-letter',
      'a-christmas-carol',
      'the-call-of-the-wild',
      'the-strange-case-of-dr-jekyll-and-mr-hyde',
      'the-red-badge-of-courage',
      'narrative-of-the-life-of-frederick-douglass',
    ],
  },
  {
    id: 'educator',
    label: 'Teacher or academic',
    emoji: '🍎',
    people: 'educators',
    genres: ['classics', 'poetry', 'drama', 'philosophy'],
    picks: ['the-odyssey', 'hamlet', 'middlemarch', 'walden', 'the-souls-of-black-folk', 'a-vindication-of-the-rights-of-woman', 'the-divine-comedy', 'dubliners'],
  },
  {
    id: 'tech',
    label: 'Tech & engineering',
    emoji: '💻',
    people: 'people in tech',
    genres: ['science-fiction', 'philosophy', 'mystery'],
    picks: ['flatland', 'the-time-machine', 'r-u-r', 'we', 'frankenstein', 'the-art-of-war', 'meditations', 'the-first-men-in-the-moon'],
  },
  {
    id: 'science',
    label: 'Science & research',
    emoji: '🔬',
    people: 'scientists',
    genres: ['science-fiction', 'nonfiction', 'philosophy'],
    picks: ['frankenstein', 'the-island-of-doctor-moreau', 'flatland', 'the-strange-case-of-dr-jekyll-and-mr-hyde', 'walden', 'the-lost-world', 'the-invisible-man'],
  },
  {
    id: 'health',
    label: 'Healthcare',
    emoji: '🩺',
    people: 'people in healthcare',
    genres: ['classics', 'nonfiction', 'philosophy'],
    picks: ['frankenstein', 'mrs-dalloway', 'the-strange-case-of-dr-jekyll-and-mr-hyde', 'meditations', 'a-christmas-carol', 'middlemarch', 'siddhartha'],
  },
  {
    id: 'business',
    label: 'Business & finance',
    emoji: '📈',
    people: 'people in business',
    genres: ['philosophy', 'nonfiction', 'historical'],
    picks: ['the-prince', 'the-art-of-war', 'meditations', 'the-autobiography-of-benjamin-franklin', 'the-great-gatsby', 'main-street', 'the-count-of-monte-cristo', 'up-from-slavery'],
  },
  {
    id: 'law',
    label: 'Law & public service',
    emoji: '⚖️',
    people: 'people in law and public service',
    genres: ['mystery', 'classics', 'nonfiction'],
    picks: ['crime-and-punishment', 'a-tale-of-two-cities', 'the-moonstone', 'the-souls-of-black-folk', 'narrative-of-the-life-of-frederick-douglass', 'the-prince', 'les-miserables'],
  },
  {
    id: 'creative',
    label: 'Writing, art & design',
    emoji: '🎨',
    people: 'writers and artists',
    genres: ['poetry', 'classics', 'drama'],
    picks: ['mrs-dalloway', 'to-the-lighthouse', 'ulysses', 'dubliners', 'the-picture-of-dorian-gray', 'john-keats-poetry', 'leaves-of-grass', 'the-prophet'],
  },
  {
    id: 'retired',
    label: 'Retired',
    emoji: '🌿',
    people: 'readers with time to savour',
    genres: ['historical', 'classics', 'romance'],
    picks: ['war-and-peace', 'middlemarch', 'anna-karenina', 'les-miserables', 'the-count-of-monte-cristo', 'david-copperfield', 'far-from-the-madding-crowd'],
  },
  { id: 'other', label: 'Something else', emoji: '✨', people: 'curious readers', genres: [], picks: [] },
], 'occupation', ['label', 'people']);

export interface GoalOption {
  id: GoalId;
  label: string;
  description: string;
}

export const GOALS: GoalOption[] = localized<GoalOption>([
  { id: 'escape', label: 'Escape into a story', description: 'Page-turners and other worlds' },
  { id: 'unwind', label: 'Relax and unwind', description: 'Gentle, cheerful, easy company' },
  { id: 'learn', label: 'Learn and think', description: 'Big ideas and true stories' },
  { id: 'classics', label: 'Read the great classics', description: 'The books everyone talks about' },
  { id: 'study', label: 'Study for class', description: 'Set texts and curriculum favourites' },
  { id: 'english', label: 'Practise my English', description: 'Clear, accessible prose' },
  { id: 'inspiration', label: 'Find inspiration', description: 'Wisdom, poetry and reflection' },
], 'goal', ['label', 'description']);

export interface MoodOption {
  id: MoodId;
  label: string;
  emoji: string;
  genres: string[];
}

export const MOODS: MoodOption[] = localized<MoodOption>([
  { id: 'adventurous', label: 'Adventurous', emoji: '🧭', genres: ['adventure', 'fantasy'] },
  { id: 'suspense', label: 'Suspenseful', emoji: '🔍', genres: ['mystery', 'horror'] },
  { id: 'romantic', label: 'Romantic', emoji: '💌', genres: ['romance'] },
  { id: 'funny', label: 'Funny', emoji: '😄', genres: ['humor'] },
  { id: 'dark', label: 'Dark & eerie', emoji: '🕯️', genres: ['horror'] },
  { id: 'thoughtful', label: 'Thought-provoking', emoji: '💭', genres: ['philosophy', 'classics', 'nonfiction'] },
  { id: 'uplifting', label: 'Uplifting', emoji: '🌤️', genres: ['childrens', 'humor', 'romance'] },
  { id: 'epic', label: 'Epic & sweeping', emoji: '🏔️', genres: ['historical', 'poetry'] },
], 'mood', ['label']);

export const LENGTH_PREFS: { id: ReadingProfile['length']; label: string; hint: string }[] = localized([
  { id: 'short', label: 'Short', hint: 'Under 3 hours' },
  { id: 'medium', label: 'Medium', hint: '3–7 hours' },
  { id: 'long', label: 'Long', hint: 'A book to live in' },
  { id: 'any', label: 'Any length', hint: 'Surprise me' },
], 'lengthPref', ['label', 'hint']);

export const LEVEL_PREFS: { id: ReadingProfile['level']; label: string; hint: string }[] = localized([
  { id: 'easy', label: 'Easy going', hint: 'Light, flowing prose' },
  { id: 'moderate', label: 'Moderate', hint: 'A little effort' },
  { id: 'challenging', label: 'Challenging', hint: 'Dense and rewarding' },
  { id: 'any', label: 'No preference', hint: 'Whatever’s best' },
], 'levelPref', ['label', 'hint']);

export const occupation = (id: OccupationId | null | undefined) => OCCUPATIONS.find((o) => o.id === id);
