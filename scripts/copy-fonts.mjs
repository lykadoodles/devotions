// Copies the bundled web fonts into www/fonts so the app works offline.
import fs from 'node:fs';
const out = 'www/fonts';
fs.mkdirSync(out, { recursive: true });
const files = [
  ['literata', 'literata-latin-400-normal.woff2'], ['literata', 'literata-latin-400-italic.woff2'],
  ['literata', 'literata-latin-600-normal.woff2'],
  ['manrope', 'manrope-latin-400-normal.woff2'], ['manrope', 'manrope-latin-500-normal.woff2'],
  ['manrope', 'manrope-latin-600-normal.woff2'], ['manrope', 'manrope-latin-700-normal.woff2'],
  ['manrope', 'manrope-latin-800-normal.woff2'],
];
for (const [pkg, f] of files) fs.copyFileSync(`node_modules/@fontsource/${pkg}/files/${f}`, `${out}/${f}`);
console.log('copied', files.length, 'fonts');
