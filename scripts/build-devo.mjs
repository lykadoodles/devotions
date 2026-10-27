// Compiles content/*.txt (day|takeaway|apply|pray) into www/data/devo.json
import fs from 'node:fs';
const read = (prefix) => fs.readdirSync('content').filter((f) => f.startsWith(prefix)).sort()
  .flatMap((f) => fs.readFileSync(`content/${f}`, 'utf8').split('\n')).filter((l) => l.trim());
const parse = (prefix, n) => {
  const out = Array(n).fill(null);
  for (const line of read(prefix)) {
    const [d, t, a, p, extra] = line.split('|');
    const i = Number(d) - 1;
    if (extra !== undefined || !t || !a || !p) throw new Error(`${prefix} bad line: ${line.slice(0, 80)}`);
    if (out[i]) throw new Error(`${prefix} duplicate day ${d}`);
    out[i] = { t: t.trim(), a: a.trim(), p: p.trim() };
  }
  const missing = out.map((x, i) => (x ? null : i + 1)).filter(Boolean);
  if (missing.length) throw new Error(`${prefix} missing days: ${missing.join(',')}`);
  return out;
};
const devo = { ot: parse('ot-', 365), nt: parse('nt-', 365), ps: parse('ps-', 365), pr: parse('pr', 31) };
fs.writeFileSync('www/data/devo.json', JSON.stringify(devo));
console.log('devo.json:', Object.entries(devo).map(([k, v]) => `${k}=${v.length}`).join(' '), (fs.statSync('www/data/devo.json').size / 1024).toFixed(0) + ' KB');
