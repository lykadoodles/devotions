// Converts the Tagalog and Cebuano Unlocked Literal Bibles (USFM, English
// versification) into the scrollmapper JSON shape used by build-translations.mjs.
// Usage: node scripts/build-ulb.mjs <out dir>
//   then: node scripts/build-translations.mjs <out dir> TGL CEB
// Sources (CC BY-SA 4.0, Door43 World Missions Community), via BibleCorps on GitHub:
//   https://github.com/BibleCorps/FIL-B-ULB2019-cc       Banal na Bibliya, Tagalog ULB (2018)
//   https://github.com/BibleCorps/CEB-B-ULB2019-CC-PSFM  Balaan nga Bibliya, Cebuano ULB (2019)
// Clone both into /tmp/bsrc/fil and /tmp/bsrc/ceb (or set ULB_SRC).
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2];
const SRC = process.env.ULB_SRC || '/tmp/bsrc';
const meta = JSON.parse(fs.readFileSync('www/data/meta.json', 'utf8'));

function parseUSFM(text) {
  const chapters = {}; let c = 0, v = 0, title = '';
  const put = (s) => { if (!c || !v) return; const ch = (chapters[c] ||= {}); ch[v] = `${ch[v] || ''} ${s}`.trim(); };
  text = text.replace(/\0/g, '').replace(/\\f .*?\\f\*/gs, '').replace(/\\x .*?\\x\*/gs, '')
    .replace(/\\w ([^|\\]*)(\|[^\\]*)?\\w\*/g, '$1').replace(/\\\+?(add|nd|wj|bk|qs|sc|it|bd|em|k|tl)\*?/g, '');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    let m;
    if ((m = line.match(/^\\c\s+(\d+)/))) { c = +m[1]; v = 0; title = ''; continue; }
    if ((m = line.match(/^\\d\s*(.*)/))) { title = m[1].trim(); continue; }
    if (/^\\(id|ide|h|toc\d|mt\d?|ms\d?|mr|s\d?|r|rem|cl|cp|sts|usfm|is\d?|ip|imt\d?)(\s|$)/.test(line)) continue;
    // a line may hold several \v markers
    const parts = line.split(/(?=\\v\s)/);
    for (let part of parts) {
      if ((m = part.match(/^\\v\s+(\d+)(?:-\d+)?\s*(.*)/s))) {
        v = +m[1]; part = m[2];
        if (v === 1 && title) { put(title); title = ''; }
      }
      const t = part.replace(/\\[a-z]+\d*\*?/g, ' ').replace(/\s+/g, ' ').trim();
      if (t) put(t);
    }
  }
  return chapters;
}

for (const [code, dir] of [['TGL', 'fil'], ['CEB', 'ceb']]) {
  const files = fs.readdirSync(path.join(SRC, dir, 'USFM')).filter((f) => /^\d\d-\w+\.(u?sfm)$/.test(f)).sort();
  if (files.length !== 66) throw new Error(`${code}: expected 66 books, found ${files.length}`);
  let missing = 0, total = 0; const gaps = [];
  const books = meta.books.map((bk, b) => {
    const chs = parseUSFM(fs.readFileSync(path.join(SRC, dir, 'USFM', files[b]), 'utf8'));
    return {
      name: bk.name,
      chapters: bk.verses.map((count, ci) => {
        const verses = [];
        for (let vv = 1; vv <= count; vv++) {
          total++;
          const t = chs[ci + 1]?.[vv];
          if (!t) { missing++; gaps.push(`${bk.name} ${ci + 1}:${vv}`); continue; }
          verses.push({ verse: vv, text: t.replace(/\s+([,.;:!?])/g, '$1') });
        }
        return { chapter: ci + 1, verses };
      }),
    };
  });
  // Book names in the translation's own language (from each book's \h header)
  const tidy = (n) => (n === n.toUpperCase() ? n.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : n);
  const names = files.map((f) => tidy((fs.readFileSync(path.join(SRC, dir, 'USFM', f), 'utf8').replace(/\0/g, '').match(/^\\h\s+(.+)$/m)?.[1] || '').trim()));
  // small consistency fixes to the source headers
  const FIX = { TGL: { 'Mga taga-Efeso': 'Mga Taga-Efeso', '1 Corinto': '1 Mga Taga-Corinto', '1 Tesalonica': '1 Mga Taga-Tesalonica' },
    CEB: { '1 Mga Taga Tesalonica': '1 Tesalonica', '2 Mga Taga-Tesalonica': '2 Tesalonica', 'Taga Efeso': 'Efeso' } }[code];
  names.forEach((n, i) => { if (FIX[n]) names[i] = FIX[n]; });
  fs.mkdirSync(`www/data/${code.toLowerCase()}`, { recursive: true });
  fs.writeFileSync(`www/data/${code.toLowerCase()}/names.json`, JSON.stringify(names));
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${code}.json`), JSON.stringify({ translation: code, books }));
  console.log(code, 'verses', total - missing, '/', total, '| missing:', gaps.slice(0, 30).join(', '));
}
