// Builds the app's offline data from the public-domain World English Bible
// (https://github.com/TehShrike/world-english-bible) and generates a balanced
// 365-day reading plan.
//
// Usage: node scripts/build-data.mjs /path/to/world-english-bible/json
//
// Output (www/data):
//   meta.json          book list + verse counts per chapter
//   plan.json          365 days x { ot, nt, ps } reading ranges
//   web/<id>.json      compact WEB text per book (offline fallback text)
//
// Proverbs is not in plan.json: it follows the calendar (chapter = day of
// month, the last day of short months picks up the remaining chapters), so it
// is read exactly 12 times a year.

import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
if (!SRC) throw new Error('Pass the WEB json folder as the first argument');
const OUT = path.resolve('www/data');
fs.mkdirSync(path.join(OUT, 'web'), { recursive: true });

// [file, display name (NLT naming), short label, testament]
const BOOKS = [
  ['genesis', 'Genesis', 'Gen', 'OT'], ['exodus', 'Exodus', 'Exod', 'OT'],
  ['leviticus', 'Leviticus', 'Lev', 'OT'], ['numbers', 'Numbers', 'Num', 'OT'],
  ['deuteronomy', 'Deuteronomy', 'Deut', 'OT'], ['joshua', 'Joshua', 'Josh', 'OT'],
  ['judges', 'Judges', 'Judg', 'OT'], ['ruth', 'Ruth', 'Ruth', 'OT'],
  ['1samuel', '1 Samuel', '1 Sam', 'OT'], ['2samuel', '2 Samuel', '2 Sam', 'OT'],
  ['1kings', '1 Kings', '1 Kgs', 'OT'], ['2kings', '2 Kings', '2 Kgs', 'OT'],
  ['1chronicles', '1 Chronicles', '1 Chr', 'OT'], ['2chronicles', '2 Chronicles', '2 Chr', 'OT'],
  ['ezra', 'Ezra', 'Ezra', 'OT'], ['nehemiah', 'Nehemiah', 'Neh', 'OT'],
  ['esther', 'Esther', 'Esth', 'OT'], ['job', 'Job', 'Job', 'OT'],
  ['psalms', 'Psalms', 'Ps', 'PS'], ['proverbs', 'Proverbs', 'Prov', 'PR'],
  ['ecclesiastes', 'Ecclesiastes', 'Eccl', 'OT'], ['songofsolomon', 'Song of Songs', 'Song', 'OT'],
  ['isaiah', 'Isaiah', 'Isa', 'OT'], ['jeremiah', 'Jeremiah', 'Jer', 'OT'],
  ['lamentations', 'Lamentations', 'Lam', 'OT'], ['ezekiel', 'Ezekiel', 'Ezek', 'OT'],
  ['daniel', 'Daniel', 'Dan', 'OT'], ['hosea', 'Hosea', 'Hos', 'OT'],
  ['joel', 'Joel', 'Joel', 'OT'], ['amos', 'Amos', 'Amos', 'OT'],
  ['obadiah', 'Obadiah', 'Obad', 'OT'], ['jonah', 'Jonah', 'Jonah', 'OT'],
  ['micah', 'Micah', 'Mic', 'OT'], ['nahum', 'Nahum', 'Nah', 'OT'],
  ['habakkuk', 'Habakkuk', 'Hab', 'OT'], ['zephaniah', 'Zephaniah', 'Zeph', 'OT'],
  ['haggai', 'Haggai', 'Hag', 'OT'], ['zechariah', 'Zechariah', 'Zech', 'OT'],
  ['malachi', 'Malachi', 'Mal', 'OT'],
  ['matthew', 'Matthew', 'Matt', 'NT'], ['mark', 'Mark', 'Mark', 'NT'],
  ['luke', 'Luke', 'Luke', 'NT'], ['john', 'John', 'John', 'NT'],
  ['acts', 'Acts', 'Acts', 'NT'], ['romans', 'Romans', 'Rom', 'NT'],
  ['1corinthians', '1 Corinthians', '1 Cor', 'NT'], ['2corinthians', '2 Corinthians', '2 Cor', 'NT'],
  ['galatians', 'Galatians', 'Gal', 'NT'], ['ephesians', 'Ephesians', 'Eph', 'NT'],
  ['philippians', 'Philippians', 'Phil', 'NT'], ['colossians', 'Colossians', 'Col', 'NT'],
  ['1thessalonians', '1 Thessalonians', '1 Thess', 'NT'], ['2thessalonians', '2 Thessalonians', '2 Thess', 'NT'],
  ['1timothy', '1 Timothy', '1 Tim', 'NT'], ['2timothy', '2 Timothy', '2 Tim', 'NT'],
  ['titus', 'Titus', 'Titus', 'NT'], ['philemon', 'Philemon', 'Phlm', 'NT'],
  ['hebrews', 'Hebrews', 'Heb', 'NT'], ['james', 'James', 'Jas', 'NT'],
  ['1peter', '1 Peter', '1 Pet', 'NT'], ['2peter', '2 Peter', '2 Pet', 'NT'],
  ['1john', '1 John', '1 John', 'NT'], ['2john', '2 John', '2 John', 'NT'],
  ['3john', '3 John', '3 John', 'NT'], ['jude', 'Jude', 'Jude', 'NT'],
  ['revelation', 'Revelation', 'Rev', 'NT'],
];

const DAYS = 365;
const meta = { books: [] };
// For each book, per chapter: list of verse numbers that start a paragraph/stanza.
const breaks = [];

BOOKS.forEach(([file, name, short, track], b) => {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC, `${file}.json`), 'utf8'));
  // Compact text: chapters[c] = array of [kind, verse, text]
  // kind: 'p' prose, 'l' poetry line, 'h' heading, '/' paragraph break, '-' stanza break
  const chapters = [];
  const vcount = [];
  const brk = [];
  let pendingHeader = null;
  let pendingBreak = true;
  let lastVerseKey = '';
  for (const n of raw) {
    if (n.type === 'header') { pendingHeader = n.value.trim(); continue; }
    if (n.type === 'paragraph start' || n.type === 'stanza start') { pendingBreak = true; continue; }
    if (n.type === 'paragraph text' || n.type === 'line text') {
      const c = n.chapterNumber - 1;
      const v = n.verseNumber;
      chapters[c] ||= [];
      brk[c] ||= new Set([1]);
      vcount[c] = Math.max(vcount[c] || 0, v);
      const seg = chapters[c];
      if (pendingHeader) { seg.push(['h', v, pendingHeader]); pendingHeader = null; }
      if (pendingBreak && seg.length && seg[seg.length - 1][0] !== 'h') {
        seg.push([n.type === 'line text' ? '-' : '/', v, '']);
      }
      if (pendingBreak) brk[c].add(v);
      pendingBreak = false;
      const text = n.value.replace(/\s+/g, ' ');
      const key = `${c}:${v}`;
      // Mark the first segment of each verse so the reader can show the number.
      const first = key !== lastVerseKey;
      lastVerseKey = key;
      if (!text.trim()) continue;
      seg.push([n.type === 'line text' ? 'l' : 'p', first ? v : 0, text]);
    }
  }
  fs.writeFileSync(path.join(OUT, 'web', `${file}.json`), JSON.stringify(chapters));
  meta.books.push({ id: file, name, short, track, verses: vcount });
  breaks.push(brk);
});

// ---------- Plan generation ----------
// Flatten a track into a verse list; returns { verses: [[b,c,v]], chapterStarts:Set(idx), paraStarts:Set(idx) }
function flatten(filter) {
  const verses = [];
  const chapterStarts = new Set();
  const paraStarts = new Set();
  meta.books.forEach((bk, b) => {
    if (!filter(bk)) return;
    bk.verses.forEach((count, c) => {
      chapterStarts.add(verses.length);
      for (let v = 1; v <= count; v++) {
        if (breaks[b][c]?.has(v)) paraStarts.add(verses.length);
        verses.push([b, c + 1, v]);
      }
    });
  });
  return { verses, chapterStarts, paraStarts };
}

// Split a flattened track into `days` contiguous ranges with roughly equal verse
// counts. Boundaries snap to chapter starts when close, else paragraph starts,
// else (if allowed) any verse. chapterOnly forces chapter boundaries.
function split({ verses, chapterStarts, paraStarts }, days, { chapterOnly = false } = {}) {
  const total = verses.length;
  const avg = total / days;
  const ch = [...chapterStarts].sort((a, b) => a - b);
  const pa = [...paraStarts].sort((a, b) => a - b);
  const nearest = (arr, x, lo) => {
    let best = null;
    for (const a of arr) {
      if (a <= lo) continue;
      if (best === null || Math.abs(a - x) < Math.abs(best - x)) best = a;
      if (a > x && best !== null && a - x > Math.abs(best - x)) break;
    }
    return best;
  };
  const bounds = [0];
  for (let k = 1; k < days; k++) {
    const ideal = Math.round((total * k) / days);
    const lo = bounds[bounds.length - 1];
    const remainingDays = days - k;
    let pick;
    if (chapterOnly) {
      pick = nearest(ch, ideal, lo);
    } else {
      const c = nearest(ch, ideal, lo);
      const p = nearest(pa, ideal, lo);
      if (c !== null && Math.abs(c - ideal) <= avg * 0.4) pick = c;
      else if (p !== null && Math.abs(p - ideal) <= avg * 0.4) pick = p;
      else pick = Math.max(ideal, lo + 1);
    }
    // keep at least one verse per remaining day
    if (pick === null || pick > total - remainingDays) pick = Math.max(lo + 1, Math.min(ideal, total - remainingDays));
    bounds.push(pick);
  }
  bounds.push(total);
  const out = [];
  for (let d = 0; d < days; d++) {
    const s = verses[bounds[d]];
    const e = verses[bounds[d + 1] - 1];
    out.push([s, e]);
  }
  return out;
}

const ot = split(flatten((b) => b.track === 'OT'), DAYS, { chapterOnly: true });
const nt = split(flatten((b) => b.track === 'NT'), DAYS);
const ps = split(flatten((b) => b.track === 'PS'), DAYS);

const plan = [];
for (let d = 0; d < DAYS; d++) plan.push({ ot: ot[d], nt: nt[d], ps: ps[d] });
fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify(plan));
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta));

// Report
const size = ([s, e], track) => {
  const f = flatten((b) => b.track === track).verses;
  const i = f.findIndex((x) => x.join() === s.join());
  const j = f.findIndex((x) => x.join() === e.join());
  return j - i + 1;
};
for (const [k, t] of [['ot', 'OT'], ['nt', 'NT'], ['ps', 'PS']]) {
  const sizes = plan.map((p) => size(p[k], t));
  console.log(k, 'min', Math.min(...sizes), 'max', Math.max(...sizes), 'avg', (sizes.reduce((a, b) => a + b) / DAYS).toFixed(1));
}
