/**
 * Curated catalog definition.
 *
 * Every entry points at a Standard Ebooks title (https://standardebooks.org),
 * whose texts and cover art are dedicated to the public domain (CC0).
 *
 *   path   – the Standard Ebooks URL path after /ebooks/
 *   year   – year of first publication (negative = BCE)
 *   genres – genre ids, most relevant first (see GENRES below)
 */

export const GENRES = [
  { id: 'classics', name: 'Literary Fiction', blurb: 'Novels that shaped the way we read.' },
  { id: 'romance', name: 'Romance', blurb: 'Courtship, longing and the comedy of manners.' },
  { id: 'mystery', name: 'Mystery & Crime', blurb: 'Detectives, puzzles and the long shadow of guilt.' },
  { id: 'science-fiction', name: 'Science Fiction', blurb: 'Machines, other worlds and futures imagined.' },
  { id: 'fantasy', name: 'Fantasy', blurb: 'Rabbit holes, emerald cities and lands beyond maps.' },
  { id: 'adventure', name: 'Adventure', blurb: 'Treasure, high seas and journeys into the unknown.' },
  { id: 'horror', name: 'Horror & Gothic', blurb: 'Haunted halls, monsters and the uncanny.' },
  { id: 'historical', name: 'Historical Fiction', blurb: 'Revolutions, intrigue and lives in turbulent times.' },
  { id: 'childrens', name: 'Young Readers', blurb: 'Stories for every age, first read and reread.' },
  { id: 'short-stories', name: 'Short Stories', blurb: 'Whole worlds in a single sitting.' },
  { id: 'poetry', name: 'Poetry', blurb: 'Verse, song and epic.' },
  { id: 'drama', name: 'Drama', blurb: 'Plays written for the stage, ready for the page.' },
  { id: 'humor', name: 'Humour & Satire', blurb: 'Wit, comic mishaps and sharp-eyed satire.' },
  { id: 'philosophy', name: 'Philosophy', blurb: 'Timeless ideas on how to think and how to live.' },
  { id: 'nonfiction', name: 'Memoir & Essays', blurb: 'True lives and considered reflections.' },
];

export const BOOKS = [
  // Literary fiction & romance
  { path: 'jane-austen/pride-and-prejudice', year: 1813, genres: ['romance', 'classics'] },
  { path: 'jane-austen/emma', year: 1815, genres: ['romance', 'classics'] },
  { path: 'jane-austen/persuasion', year: 1817, genres: ['romance', 'classics'] },
  { path: 'jane-austen/sense-and-sensibility', year: 1811, genres: ['romance', 'classics'] },
  { path: 'charlotte-bronte/jane-eyre', year: 1847, genres: ['classics', 'romance', 'horror'] },
  { path: 'emily-bronte/wuthering-heights', year: 1847, genres: ['classics', 'romance', 'horror'] },
  { path: 'charles-dickens/great-expectations', year: 1861, genres: ['classics'] },
  { path: 'charles-dickens/a-tale-of-two-cities', year: 1859, genres: ['historical', 'classics'] },
  { path: 'charles-dickens/a-christmas-carol', year: 1843, genres: ['classics', 'fantasy'] },
  { path: 'f-scott-fitzgerald/the-great-gatsby', year: 1925, genres: ['classics', 'romance'] },
  { path: 'herman-melville/moby-dick', year: 1851, genres: ['classics', 'adventure'] },
  { path: 'leo-tolstoy/anna-karenina/constance-garnett', year: 1878, genres: ['classics', 'romance'] },
  { path: 'fyodor-dostoevsky/crime-and-punishment/constance-garnett', year: 1866, genres: ['classics', 'mystery'] },
  { path: 'ivan-turgenev/fathers-and-children/constance-garnett', year: 1862, genres: ['classics'] },
  { path: 'gustave-flaubert/madame-bovary/eleanor-marx-aveling', year: 1857, genres: ['classics', 'romance'] },
  { path: 'oscar-wilde/the-picture-of-dorian-gray', year: 1890, genres: ['classics', 'horror'] },
  { path: 'mark-twain/the-adventures-of-huckleberry-finn', year: 1884, genres: ['classics', 'adventure'] },
  { path: 'mark-twain/the-adventures-of-tom-sawyer', year: 1876, genres: ['adventure', 'childrens'] },
  { path: 'nathaniel-hawthorne/the-scarlet-letter', year: 1850, genres: ['classics', 'historical'] },
  { path: 'virginia-woolf/mrs-dalloway', year: 1925, genres: ['classics'] },
  { path: 'edith-wharton/the-age-of-innocence', year: 1920, genres: ['classics', 'romance'] },
  { path: 'thomas-hardy/tess-of-the-durbervilles', year: 1891, genres: ['classics', 'romance'] },
  { path: 'kate-chopin/the-awakening', year: 1899, genres: ['classics'] },
  { path: 'louisa-may-alcott/little-women', year: 1868, genres: ['classics', 'childrens'] },
  { path: 'e-m-forster/a-room-with-a-view', year: 1908, genres: ['romance', 'classics'] },
  { path: 'james-joyce/dubliners', year: 1914, genres: ['short-stories', 'classics'] },

  // Mystery & crime
  { path: 'arthur-conan-doyle/a-study-in-scarlet', year: 1887, genres: ['mystery'] },
  { path: 'arthur-conan-doyle/the-sign-of-the-four', year: 1890, genres: ['mystery'] },
  { path: 'arthur-conan-doyle/the-adventures-of-sherlock-holmes', year: 1892, genres: ['mystery', 'short-stories'] },
  { path: 'arthur-conan-doyle/the-hound-of-the-baskervilles', year: 1902, genres: ['mystery', 'horror'] },
  { path: 'agatha-christie/the-mysterious-affair-at-styles', year: 1920, genres: ['mystery'] },
  { path: 'agatha-christie/the-secret-adversary', year: 1922, genres: ['mystery', 'adventure'] },
  { path: 'wilkie-collins/the-moonstone', year: 1868, genres: ['mystery', 'classics'] },
  { path: 'g-k-chesterton/the-innocence-of-father-brown', year: 1911, genres: ['mystery', 'short-stories'] },
  { path: 'edgar-allan-poe/short-fiction', year: 1845, genres: ['horror', 'short-stories', 'mystery'] },

  // Science fiction
  { path: 'h-g-wells/the-time-machine', year: 1895, genres: ['science-fiction'] },
  { path: 'h-g-wells/the-war-of-the-worlds', year: 1898, genres: ['science-fiction'] },
  { path: 'h-g-wells/the-invisible-man', year: 1897, genres: ['science-fiction', 'horror'] },
  { path: 'mary-shelley/frankenstein', year: 1818, genres: ['horror', 'science-fiction', 'classics'] },
  { path: 'edgar-rice-burroughs/a-princess-of-mars', year: 1912, genres: ['science-fiction', 'adventure'] },
  { path: 'arthur-conan-doyle/the-lost-world', year: 1912, genres: ['science-fiction', 'adventure'] },
  { path: 'yevgeny-zamyatin/we/gregory-zilboorg', year: 1924, genres: ['science-fiction', 'classics'] },

  // Fantasy & young readers
  { path: 'lewis-carroll/alices-adventures-in-wonderland/john-tenniel', year: 1865, genres: ['fantasy', 'childrens'] },
  { path: 'l-frank-baum/the-wonderful-wizard-of-oz', year: 1900, genres: ['fantasy', 'childrens'] },
  { path: 'j-m-barrie/peter-and-wendy', year: 1911, genres: ['fantasy', 'childrens'] },
  { path: 'kenneth-grahame/the-wind-in-the-willows', year: 1908, genres: ['childrens', 'fantasy'] },
  { path: 'frances-hodgson-burnett/the-secret-garden', year: 1911, genres: ['childrens', 'classics'] },
  { path: 'rudyard-kipling/the-jungle-book', year: 1894, genres: ['childrens', 'adventure', 'short-stories'] },
  { path: 'l-m-montgomery/anne-of-green-gables', year: 1908, genres: ['childrens', 'classics'] },
  { path: 'jonathan-swift/gullivers-travels', year: 1726, genres: ['fantasy', 'adventure', 'humor'] },

  // Adventure & historical
  { path: 'robert-louis-stevenson/treasure-island', year: 1883, genres: ['adventure', 'childrens'] },
  { path: 'jack-london/the-call-of-the-wild', year: 1903, genres: ['adventure'] },
  { path: 'daniel-defoe/the-life-and-adventures-of-robinson-crusoe', year: 1719, genres: ['adventure', 'classics'] },
  { path: 'h-rider-haggard/king-solomons-mines', year: 1885, genres: ['adventure'] },
  { path: 'jules-verne/around-the-world-in-eighty-days/george-makepeace-towle', year: 1872, genres: ['adventure'] },
  { path: 'alexandre-dumas/the-three-musketeers/william-robson', year: 1844, genres: ['historical', 'adventure'] },
  { path: 'baroness-orczy/the-scarlet-pimpernel', year: 1905, genres: ['historical', 'adventure', 'romance'] },

  // Horror & gothic
  { path: 'bram-stoker/dracula', year: 1897, genres: ['horror', 'classics'] },
  { path: 'robert-louis-stevenson/the-strange-case-of-dr-jekyll-and-mr-hyde', year: 1886, genres: ['horror', 'mystery'] },
  { path: 'h-p-lovecraft/short-fiction', year: 1928, genres: ['horror', 'short-stories', 'science-fiction'] },
  { path: 'henry-james/the-turn-of-the-screw', year: 1898, genres: ['horror'] },

  // Philosophy & nonfiction
  { path: 'marcus-aurelius/meditations/george-long', year: 180, genres: ['philosophy'] },
  { path: 'sun-tzu/the-art-of-war/lionel-giles', year: -500, genres: ['philosophy'] },
  { path: 'niccolo-machiavelli/the-prince/w-k-marriott', year: 1532, genres: ['philosophy'] },
  { path: 'friedrich-nietzsche/thus-spake-zarathustra/thomas-common', year: 1883, genres: ['philosophy'] },
  { path: 'henry-david-thoreau/walden', year: 1854, genres: ['nonfiction', 'philosophy'] },
  { path: 'frederick-douglass/narrative-of-the-life-of-frederick-douglass', year: 1845, genres: ['nonfiction'] },

  // Drama
  { path: 'william-shakespeare/hamlet', year: 1603, genres: ['drama'] },
  { path: 'william-shakespeare/macbeth', year: 1623, genres: ['drama'] },
  { path: 'william-shakespeare/romeo-and-juliet', year: 1597, genres: ['drama', 'romance'] },
  { path: 'oscar-wilde/the-importance-of-being-earnest', year: 1895, genres: ['drama', 'humor'] },

  // Poetry
  { path: 'homer/the-odyssey/william-cullen-bryant', year: -700, genres: ['poetry', 'adventure'] },
  { path: 'john-keats/poetry', year: 1820, genres: ['poetry'] },
  { path: 'w-b-yeats/poetry', year: 1921, genres: ['poetry'] },
  { path: 'edgar-allan-poe/poetry', year: 1845, genres: ['poetry', 'horror'] },
  { path: 'rabindranath-tagore/gitanjali', year: 1912, genres: ['poetry', 'philosophy'] },
  { path: 'kahlil-gibran/the-prophet', year: 1923, genres: ['poetry', 'philosophy'] },

  /* ---------------------------------------------------------------- */
  /* Second wave                                                       */
  /* ---------------------------------------------------------------- */

  // Great novels
  { path: 'leo-tolstoy/war-and-peace/louise-maude_aylmer-maude', year: 1869, genres: ['historical', 'classics'] },
  { path: 'victor-hugo/les-miserables/isabel-f-hapgood', year: 1862, genres: ['classics', 'historical'] },
  { path: 'alexandre-dumas/the-count-of-monte-cristo/chapman-and-hall', year: 1844, genres: ['adventure', 'historical'] },
  { path: 'miguel-de-cervantes-saavedra/don-quixote/john-ormsby', year: 1605, genres: ['classics', 'adventure', 'humor'] },
  { path: 'fyodor-dostoevsky/the-brothers-karamazov/constance-garnett', year: 1880, genres: ['classics', 'philosophy'] },
  { path: 'fyodor-dostoevsky/the-idiot/eva-m-martin', year: 1869, genres: ['classics'] },
  { path: 'fyodor-dostoevsky/notes-from-underground/constance-garnett', year: 1864, genres: ['classics', 'philosophy'] },
  { path: 'george-eliot/middlemarch', year: 1871, genres: ['classics', 'romance'] },
  { path: 'charles-dickens/oliver-twist', year: 1838, genres: ['classics'] },
  { path: 'charles-dickens/david-copperfield', year: 1850, genres: ['classics'] },
  { path: 'jane-austen/northanger-abbey', year: 1817, genres: ['romance', 'classics', 'humor'] },
  { path: 'jane-austen/mansfield-park', year: 1814, genres: ['romance', 'classics'] },
  { path: 'thomas-hardy/far-from-the-madding-crowd', year: 1874, genres: ['classics', 'romance'] },
  { path: 'henry-james/the-portrait-of-a-lady', year: 1881, genres: ['classics'] },
  { path: 'nathaniel-hawthorne/the-house-of-the-seven-gables', year: 1851, genres: ['classics', 'horror'] },
  { path: 'edith-wharton/the-house-of-mirth', year: 1905, genres: ['classics'] },
  { path: 'edith-wharton/ethan-frome', year: 1911, genres: ['classics', 'romance'] },
  { path: 'joseph-conrad/lord-jim', year: 1900, genres: ['classics', 'adventure'] },
  { path: 'joseph-conrad/short-fiction', year: 1899, genres: ['short-stories', 'classics'] },
  { path: 'e-m-forster/howards-end', year: 1910, genres: ['classics'] },
  { path: 'e-m-forster/a-passage-to-india', year: 1924, genres: ['classics'] },
  { path: 'virginia-woolf/to-the-lighthouse', year: 1927, genres: ['classics'] },
  { path: 'james-joyce/ulysses', year: 1922, genres: ['classics'] },
  { path: 'f-scott-fitzgerald/this-side-of-paradise', year: 1920, genres: ['classics', 'romance'] },
  { path: 'f-scott-fitzgerald/the-beautiful-and-damned', year: 1922, genres: ['classics'] },
  { path: 'ernest-hemingway/the-sun-also-rises', year: 1926, genres: ['classics'] },
  { path: 'willa-cather/my-antonia', year: 1918, genres: ['classics'] },
  { path: 'willa-cather/o-pioneers', year: 1913, genres: ['classics'] },
  { path: 'sinclair-lewis/main-street', year: 1920, genres: ['classics', 'humor'] },
  { path: 'upton-sinclair/the-jungle', year: 1906, genres: ['classics'] },
  { path: 'stephen-crane/the-red-badge-of-courage', year: 1895, genres: ['historical', 'classics'] },
  { path: 'hermann-hesse/siddhartha/various-translators', year: 1922, genres: ['classics', 'philosophy'] },

  // Mystery & crime
  { path: 'arthur-conan-doyle/the-memoirs-of-sherlock-holmes', year: 1894, genres: ['mystery', 'short-stories'] },
  { path: 'arthur-conan-doyle/the-return-of-sherlock-holmes', year: 1905, genres: ['mystery', 'short-stories'] },
  { path: 'arthur-conan-doyle/the-valley-of-fear', year: 1915, genres: ['mystery'] },
  { path: 'agatha-christie/the-murder-of-roger-ackroyd', year: 1926, genres: ['mystery'] },
  { path: 'agatha-christie/the-murder-on-the-links', year: 1923, genres: ['mystery'] },
  { path: 'dashiell-hammett/the-maltese-falcon', year: 1930, genres: ['mystery'] },
  { path: 'dashiell-hammett/red-harvest', year: 1929, genres: ['mystery'] },
  { path: 'g-k-chesterton/the-man-who-was-thursday', year: 1908, genres: ['mystery', 'fantasy'] },
  { path: 'john-buchan/the-thirty-nine-steps', year: 1915, genres: ['adventure', 'mystery'] },

  // Science fiction, fantasy & the weird
  { path: 'h-g-wells/the-island-of-doctor-moreau', year: 1896, genres: ['science-fiction', 'horror'] },
  { path: 'h-g-wells/the-first-men-in-the-moon', year: 1901, genres: ['science-fiction', 'adventure'] },
  { path: 'edwin-a-abbott/flatland', year: 1884, genres: ['science-fiction', 'humor'] },
  { path: 'karel-capek/r-u-r/paul-selver_nigel-playfair', year: 1920, genres: ['science-fiction', 'drama'] },
  { path: 'e-r-eddison/the-worm-ouroboros', year: 1922, genres: ['fantasy'] },
  { path: 'lord-dunsany/the-king-of-elflands-daughter', year: 1924, genres: ['fantasy'] },
  { path: 'george-macdonald/phantastes', year: 1858, genres: ['fantasy'] },
  { path: 'h-rider-haggard/she', year: 1887, genres: ['adventure', 'fantasy'] },
  { path: 'gaston-leroux/the-phantom-of-the-opera/alexander-teixeira-de-mattos', year: 1910, genres: ['horror', 'romance'] },
  { path: 'robert-w-chambers/the-king-in-yellow', year: 1895, genres: ['horror', 'short-stories'] },
  { path: 'm-r-james/short-fiction', year: 1904, genres: ['horror', 'short-stories'] },
  { path: 'j-sheridan-le-fanu/short-fiction', year: 1872, genres: ['horror', 'short-stories'] },
  { path: 'arthur-machen/short-fiction', year: 1894, genres: ['horror', 'short-stories'] },
  { path: 'mark-twain/a-connecticut-yankee-in-king-arthurs-court', year: 1889, genres: ['humor', 'fantasy'] },

  // Adventure
  { path: 'edgar-rice-burroughs/tarzan-of-the-apes', year: 1912, genres: ['adventure'] },
  { path: 'jack-london/white-fang', year: 1906, genres: ['adventure'] },
  { path: 'robert-louis-stevenson/kidnapped', year: 1886, genres: ['adventure', 'historical'] },
  { path: 'rudyard-kipling/kim', year: 1901, genres: ['adventure', 'classics'] },
  { path: 'anthony-hope/the-prisoner-of-zenda', year: 1894, genres: ['adventure', 'romance'] },
  { path: 'rafael-sabatini/captain-blood', year: 1922, genres: ['adventure', 'historical'] },
  { path: 'rafael-sabatini/scaramouche', year: 1921, genres: ['historical', 'adventure'] },
  { path: 'baroness-orczy/the-elusive-pimpernel', year: 1908, genres: ['historical', 'adventure'] },

  // Young readers
  { path: 'a-a-milne/winnie-the-pooh', year: 1926, genres: ['childrens', 'humor'] },
  { path: 'lewis-carroll/through-the-looking-glass/john-tenniel', year: 1871, genres: ['fantasy', 'childrens'] },
  { path: 'e-nesbit/the-railway-children', year: 1906, genres: ['childrens'] },
  { path: 'anna-sewell/black-beauty', year: 1877, genres: ['childrens'] },
  { path: 'frances-hodgson-burnett/a-little-princess', year: 1905, genres: ['childrens'] },
  { path: 'l-m-montgomery/anne-of-avonlea', year: 1909, genres: ['childrens'] },
  { path: 'johann-david-wyss/the-swiss-family-robinson/mary-jane-godwin_william-godwin', year: 1812, genres: ['childrens', 'adventure'] },

  // Humour & satire
  { path: 'jerome-k-jerome/three-men-in-a-boat', year: 1889, genres: ['humor'] },
  { path: 'p-g-wodehouse/jeeves-stories', year: 1925, genres: ['humor', 'short-stories'] },
  { path: 'saki/short-fiction', year: 1911, genres: ['humor', 'short-stories'] },
  { path: 'ambrose-bierce/the-devils-dictionary', year: 1906, genres: ['humor'] },

  // Poetry & epic
  { path: 'homer/the-iliad/william-cullen-bryant', year: -750, genres: ['poetry', 'adventure'] },
  { path: 'virgil/the-aeneid/john-dryden', year: -19, genres: ['poetry', 'adventure'] },
  { path: 'dante-alighieri/the-divine-comedy/henry-wadsworth-longfellow', year: 1320, genres: ['poetry', 'classics'] },
  { path: 'omar-khayyam/the-rubaiyat-of-omar-khayyam/edward-fitzgerald', year: 1120, genres: ['poetry', 'philosophy'] },
  { path: 'walt-whitman/leaves-of-grass', year: 1855, genres: ['poetry'] },
  { path: 'john-donne/poetry', year: 1633, genres: ['poetry'] },
  { path: 'edgar-lee-masters/spoon-river-anthology', year: 1915, genres: ['poetry'] },

  // Drama
  { path: 'william-shakespeare/a-midsummer-nights-dream', year: 1600, genres: ['drama', 'humor'] },
  { path: 'william-shakespeare/much-ado-about-nothing', year: 1600, genres: ['drama', 'romance'] },
  { path: 'william-shakespeare/othello', year: 1622, genres: ['drama'] },
  { path: 'william-shakespeare/king-lear', year: 1608, genres: ['drama'] },
  { path: 'william-shakespeare/the-tempest', year: 1623, genres: ['drama', 'fantasy'] },
  { path: 'henrik-ibsen/a-dolls-house/r-farquharson-sharp', year: 1879, genres: ['drama'] },

  // Philosophy, memoir & essays
  { path: 'laozi/tao-te-ching/james-legge', year: -400, genres: ['philosophy'] },
  { path: 'friedrich-nietzsche/beyond-good-and-evil/helen-zimmern', year: 1886, genres: ['philosophy'] },
  { path: 'ralph-waldo-emerson/essays', year: 1841, genres: ['nonfiction', 'philosophy'] },
  { path: 'mary-wollstonecraft/a-vindication-of-the-rights-of-woman', year: 1792, genres: ['nonfiction', 'philosophy'] },
  { path: 'w-e-b-du-bois/the-souls-of-black-folk', year: 1903, genres: ['nonfiction'] },
  { path: 'booker-t-washington/up-from-slavery', year: 1901, genres: ['nonfiction'] },
  { path: 'linda-brent/incidents-in-the-life-of-a-slave-girl', year: 1861, genres: ['nonfiction'] },
  { path: 'benjamin-franklin/the-autobiography-of-benjamin-franklin', year: 1791, genres: ['nonfiction'] },
];
