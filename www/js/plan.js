// Reading-plan math: which passages belong to a given day, labels, verse counts.
export let META = null;
export let PLAN = null;

export const PS_BOOK = 18;
export const PR_BOOK = 19;
export const DAYS = 365;

export const TRACKS = {
  ot: { name: 'Old Testament', short: 'OT', icon: 'scroll' },
  nt: { name: 'New Testament', short: 'NT', icon: 'cross' },
  ps: { name: 'Psalms', short: 'PS', icon: 'harp' },
  pr: { name: 'Proverbs', short: 'PR', icon: 'leaf' },
};
export const TRACK_ORDER = ['ot', 'nt', 'ps', 'pr'];

export async function loadPlan() {
  const [m, p] = await Promise.all([
    fetch('data/meta.json').then((r) => r.json()),
    fetch('data/plan.json').then((r) => r.json()),
  ]);
  META = m;
  PLAN = p;
  buildIndexes();
}

// ---------- dates (all local time, YYYY-MM-DD) ----------
export const pad = (n) => String(n).padStart(2, '0');
export const iso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
export const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
export const today = () => iso(new Date());
export const fmtDate = (s, opts = { weekday: 'long', month: 'long', day: 'numeric' }) =>
  parseISO(s).toLocaleDateString(undefined, opts);

export const planDayFor = (startDate, date) => diffDays(startDate, date) + 1; // 1-based

// Proverbs follows the calendar: chapter = day of month. On the last day of a
// short month, read the remaining chapters so every month covers all 31.
export function proverbsChapters(date) {
  const d = parseISO(date);
  const day = d.getDate();
  const len = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return day < len ? [day, day] : [day, 31];
}
export function proverbsRange(date) {
  const [a, b] = proverbsChapters(date);
  return [[PR_BOOK, a, 1], [PR_BOOK, b, META.books[PR_BOOK].verses[b - 1]]];
}

// The four portions for a calendar date.
export function readingsFor(startDate, date) {
  const n = planDayFor(startDate, date);
  const out = [];
  if (n >= 1 && n <= DAYS) {
    const p = PLAN[n - 1];
    out.push({ track: 'ot', key: String(n), range: p.ot });
    out.push({ track: 'nt', key: String(n), range: p.nt });
    out.push({ track: 'ps', key: String(n), range: p.ps });
  }
  out.push({ track: 'pr', key: date, range: proverbsRange(date) });
  return out;
}

export function readingFor(track, key) {
  if (track === 'pr') return { track, key, range: proverbsRange(key) };
  const p = PLAN[Number(key) - 1];
  return p ? { track, key, range: p[track] } : null;
}

// ---------- ranges ----------
// Split [s,e] into per-book segments {b, c1, v1, c2, v2}
export function segments([s, e]) {
  const out = [];
  for (let b = s[0]; b <= e[0]; b++) {
    const vs = META.books[b].verses;
    const c1 = b === s[0] ? s[1] : 1;
    const v1 = b === s[0] ? s[2] : 1;
    const c2 = b === e[0] ? e[1] : vs.length;
    const v2 = b === e[0] ? e[2] : vs[vs.length - 1];
    out.push({ b, c1, v1, c2, v2 });
  }
  return out;
}

// Per-chapter pieces, for fetching and rendering
export function chapters(range) {
  const out = [];
  for (const { b, c1, v1, c2, v2 } of segments(range)) {
    for (let c = c1; c <= c2; c++) {
      const last = META.books[b].verses[c - 1];
      const a = c === c1 ? v1 : 1;
      const z = c === c2 ? v2 : last;
      out.push({ b, c, v1: a, v2: z, full: a === 1 && z === last });
    }
  }
  return out;
}

export function bookName(b, singleChapter) {
  const n = META.books[b].name;
  return b === PS_BOOK && singleChapter ? 'Psalm' : n;
}

export function label(range) {
  return segments(range).map(({ b, c1, v1, c2, v2 }) => {
    const vs = META.books[b].verses;
    const oneChapterBook = vs.length === 1;
    const fullStart = v1 === 1;
    const fullEnd = v2 === vs[c2 - 1];
    const name = bookName(b, c1 === c2);
    if (c1 === c2) {
      if (fullStart && fullEnd) return oneChapterBook ? name : `${name} ${c1}`;
      const vv = v1 === v2 ? `${v1}` : `${v1}–${v2}`;
      return oneChapterBook ? `${name} ${vv}` : `${name} ${c1}:${vv}`;
    }
    if (fullStart && fullEnd) return `${name} ${c1}–${c2}`;
    return `${name} ${c1}:${v1}–${c2}:${v2}`;
  }).join(' · ');
}

export function verseCount(range) {
  let n = 0;
  for (const ch of chapters(range)) n += ch.v2 - ch.v1 + 1;
  return n;
}

// ~25 words per verse, ~200 words per minute
export const minutes = (range) => Math.max(1, Math.round((verseCount(range) * 25) / 200));

// ---------- indexes for progress ----------
export const TOTAL_VERSES = () => META.books.reduce((a, b) => a + b.verses.reduce((x, y) => x + y, 0), 0);
export let BOOK_TOTALS = [];
export let DAY_BOOK_VERSES = { ot: [], nt: [], ps: [] }; // [day] -> {book: verses}
export let BOOK_DAYS = []; // book -> [{track, day}]

function buildIndexes() {
  BOOK_TOTALS = META.books.map((b) => b.verses.reduce((x, y) => x + y, 0));
  BOOK_DAYS = META.books.map(() => []);
  for (const t of ['ot', 'nt', 'ps']) {
    DAY_BOOK_VERSES[t] = PLAN.map((p, i) => {
      const m = {};
      for (const ch of chapters(p[t])) {
        m[ch.b] = (m[ch.b] || 0) + (ch.v2 - ch.v1 + 1);
      }
      for (const b of Object.keys(m)) BOOK_DAYS[b].push({ track: t, day: String(i + 1) });
      return m;
    });
  }
}
