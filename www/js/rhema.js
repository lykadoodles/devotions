// "Rhema for today": a hand-picked set of encouraging verses (references only;
// the text is loaded in the reader's translation). One verse per day, cycling
// through the whole set before repeating, plus a random draw on demand.
import { META, diffDays, today } from './plan.js';

const REFS = [
  ['jeremiah', 29, 11], ['isaiah', 41, 10], ['philippians', 4, 6, 7], ['philippians', 4, 13], ['romans', 8, 28],
  ['proverbs', 3, 5, 6], ['joshua', 1, 9], ['psalms', 23, 1, 3], ['psalms', 46, 1], ['psalms', 46, 10],
  ['matthew', 11, 28, 29], ['john', 3, 16], ['john', 14, 27], ['john', 16, 33], ['romans', 15, 13],
  ['2corinthians', 5, 17], ['2corinthians', 12, 9], ['galatians', 2, 20], ['galatians', 6, 9], ['ephesians', 2, 8, 9],
  ['ephesians', 3, 20], ['hebrews', 11, 1], ['hebrews', 12, 1, 2], ['hebrews', 13, 5], ['james', 1, 2, 3],
  ['james', 1, 5], ['1peter', 5, 7], ['1john', 1, 9], ['1john', 4, 18], ['lamentations', 3, 22, 23],
  ['isaiah', 40, 31], ['isaiah', 43, 2], ['isaiah', 26, 3], ['psalms', 27, 1], ['psalms', 34, 8],
  ['psalms', 37, 4], ['psalms', 37, 5], ['psalms', 51, 10], ['psalms', 55, 22], ['psalms', 62, 1, 2],
  ['psalms', 91, 1, 2], ['psalms', 103, 2, 4], ['psalms', 118, 24], ['psalms', 119, 105], ['psalms', 121, 1, 2],
  ['psalms', 139, 14], ['psalms', 143, 8], ['proverbs', 4, 23], ['proverbs', 16, 3], ['proverbs', 16, 9],
  ['proverbs', 18, 10], ['proverbs', 19, 21], ['micah', 6, 8], ['zephaniah', 3, 17], ['nahum', 1, 7],
  ['deuteronomy', 31, 6], ['deuteronomy', 31, 8], ['numbers', 6, 24, 26], ['exodus', 14, 14], ['1chronicles', 16, 11],
  ['2chronicles', 7, 14], ['nehemiah', 8, 10], ['isaiah', 54, 10], ['isaiah', 55, 8, 9], ['isaiah', 58, 11],
  ['habakkuk', 3, 19], ['matthew', 5, 14, 16], ['matthew', 6, 33], ['matthew', 6, 34], ['matthew', 7, 7],
  ['matthew', 19, 26], ['matthew', 28, 20], ['mark', 9, 23], ['mark', 11, 24], ['luke', 1, 37],
  ['luke', 6, 38], ['john', 8, 12], ['john', 10, 10], ['john', 13, 34], ['john', 15, 5],
  ['acts', 1, 8], ['romans', 5, 8], ['romans', 8, 1], ['romans', 8, 38, 39], ['romans', 12, 2],
  ['romans', 12, 12], ['1corinthians', 10, 13], ['1corinthians', 13, 4, 7], ['1corinthians', 16, 13, 14], ['2corinthians', 4, 16, 18],
  ['ephesians', 6, 10], ['philippians', 1, 6], ['philippians', 4, 8], ['philippians', 4, 19], ['colossians', 3, 23],
  ['1thessalonians', 5, 16, 18], ['2timothy', 1, 7], ['hebrews', 4, 16], ['james', 4, 8], ['1peter', 2, 9],
  ['revelation', 21, 4], ['psalms', 16, 11], ['psalms', 30, 5], ['psalms', 73, 26], ['isaiah', 12, 2],
  ['psalms', 4, 8], ['psalms', 19, 14], ['psalms', 90, 12], ['psalms', 145, 18], ['isaiah', 9, 6],
  ['psalms', 84, 11], ['john', 11, 25], ['romans', 10, 9], ['2peter', 3, 9], ['proverbs', 3, 9, 10],
];

export const RHEMA_COUNT = REFS.length;

export function rhemaRange(i) {
  const [id, c, v1, v2 = v1] = REFS[((i % REFS.length) + REFS.length) % REFS.length];
  const b = META.books.findIndex((bk) => bk.id === id);
  return [[b, c, v1], [b, c, v2]];
}

// Stepping by a number coprime with the list length visits every verse once
// before any repeats, while consecutive days feel unrelated.
export function dailyIndex(date = today()) {
  const n = diffDays('2024-01-01', date);
  return ((n * 37) % REFS.length + REFS.length) % REFS.length;
}

export function randomIndex(except) {
  let i;
  do { i = Math.floor(Math.random() * REFS.length); } while (i === except && REFS.length > 1);
  return i;
}
