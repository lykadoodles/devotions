// Builds offline BSB and KJV text (both public domain) in the app's compact
// format, borrowing paragraph and poetry layout from the WEB data.
// Usage: node scripts/build-translations.mjs <dir with BSB.json and KJV.json>
// Source: https://github.com/scrollmapper/bible_databases (formats/json)
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
const meta = JSON.parse(fs.readFileSync('www/data/meta.json', 'utf8'));

for (const code of ['BSB', 'KJV']) {
  const src = JSON.parse(fs.readFileSync(path.join(SRC, `${code}.json`), 'utf8'));
  const outDir = `www/data/${code.toLowerCase()}`;
  fs.mkdirSync(outDir, { recursive: true });
  let total = 0;
  meta.books.forEach((bk, b) => {
    const web = JSON.parse(fs.readFileSync(`www/data/web/${bk.id}.json`, 'utf8'));
    const book = src.books[b];
    const chapters = bk.verses.map((count, ci) => {
      // layout from WEB: which verses start a paragraph/stanza, which are poetry
      const breakBefore = new Set([1]);
      const poetry = new Set();
      let pending = false;
      for (const [kind, v] of web[ci] || []) {
        if (kind === '/' || kind === '-') { pending = true; continue; }
        if (kind === 'l' && v) poetry.add(v);
        if (v && pending) { breakBefore.add(v); pending = false; }
      }
      const verses = (book.chapters[ci]?.verses || []);
      const segs = [];
      for (const { verse: v, text } of verses) {
        const t = (text || '').replace(/\s+/g, ' ').trim();
        if (!t) continue;
        if (breakBefore.has(v) && segs.length) segs.push([poetry.has(v) ? '-' : '/', v, '']);
        segs.push([poetry.has(v) ? 'l' : 'p', v, t + ' ']);
        total++;
      }
      return segs;
    });
    fs.writeFileSync(`${outDir}/${bk.id}.json`, JSON.stringify(chapters));
  });
  console.log(code, 'verses', total);
}
