const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, '../../tests/seed.json'))); seed.nltKey = ''; seed.translation = 'BSB';
  const t = new Date(); t.setHours(12); const iso = (d) => d.toISOString().slice(0, 10); const add = (n) => { const d = new Date(t); d.setDate(d.getDate() + n); return iso(d); };
  // re-date the seed so today is day 48 with a 47-day streak
  seed.startDate = add(-47); seed.done = { ot: {}, nt: {}, ps: {}, pr: {} }; seed.log = {}; seed.prayed = {};
  for (let i = 0; i < 47; i++) { const d = add(i - 47), day = String(i + 1); seed.done.ot[day] = d; seed.done.nt[day] = d; seed.done.ps[day] = d; seed.done.pr[d] = d; seed.log[d] = 4; seed.prayed[d] = { open: true, close: true }; }
  seed.done.ot['48'] = add(0); seed.done.nt['48'] = add(0); seed.log[add(0)] = 2; seed.prayed[add(0)] = { open: true };
  const ctx = await b.newContext({ viewport: { width: 400, height: 780 }, deviceScaleFactor: 2.7, colorScheme: 'dark' });
  await ctx.addInitScript((st) => { localStorage.setItem('lamp.state.v1', JSON.stringify(st)); localStorage.setItem('lamp.opens', '2'); }, seed);
  const p = await ctx.newPage(); await p.goto('http://localhost:8080/#/today'); await p.waitForTimeout(2500);
  for (let k = 0; k < 8; k++) { const el = await p.$('[data-close]'); if (!el) break; await el.click(); await p.waitForTimeout(400); }
  await p.waitForTimeout(800); await p.screenshot({ path: '/tmp/claude-0/video/raw/today-new.jpg', type: 'jpeg', quality: 92 }); await b.close();
})();
