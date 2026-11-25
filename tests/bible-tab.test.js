const { chromium } = require('playwright');
const fs = require('fs');
const FAKE = () => { window.__said = []; window.Capacitor = { isNativePlatform: () => false, Plugins: { TextToSpeech: { getSupportedVoices: async () => ({ voices: [] }), speak: (o) => new Promise((r) => { window.__said.push(o.text.slice(0, 40)); setTimeout(r, 50); }), stop: async () => {} } } }; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'seed.json'))); seed.nltKey = ''; seed.translation = 'BSB';
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  await ctx.addInitScript(FAKE);
  await ctx.addInitScript((st) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('lamp.state.v1', JSON.stringify(st)); sessionStorage.setItem('s', 1); } }, seed);
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  const closeAll = async () => { for (let k = 0; k < 8; k++) { const el = await p.$('[data-close]'); if (!el) break; await el.click(); await p.waitForTimeout(300); } };
  await p.goto('http://localhost:8080/#/today'); await p.waitForTimeout(1500); await closeAll();
  await p.click('#tabs a[data-tab=bible]'); await p.waitForTimeout(800);
  await p.screenshot({ path: 'bible-1.png' });
  for (const q of ['John 3:16', 'jn 3', '1 cor 13', 'Juan 3:16', 'Mga Awit 23', 'Salmo 23', 'Jude 3', 'Ps 119:105', 'Pinadayag 21', 'xyz 4']) {
    await p.goto('http://localhost:8080/#/bible'); await p.waitForTimeout(400);
    await p.fill('#goto', q); await p.press('#goto', 'Enter'); await p.waitForTimeout(700);
    const err = await p.$eval('#goto-err', (x) => (x.hidden ? '' : x.textContent)).catch(() => '');
    console.log(q.padEnd(14), '->', err ? 'ERROR: ' + err.slice(0, 40) : (await p.evaluate(() => location.hash)) + '  ' + (await p.textContent('.reader-title .ref',{timeout:3000}).catch(() => '?')).replace(/\s+/g, ' '));
  }
  // book grid -> chapter grid -> reader
  await p.goto('http://localhost:8080/#/bible'); await p.waitForTimeout(500);
  await p.fill('#goto', ''); await p.waitForTimeout(200); await p.click('.book-cell >> text=Genesis'); await p.waitForTimeout(500);
  console.log('read chapters marked in Genesis:', await p.$$eval('.ch-cell.read', (x) => x.length));
  await p.screenshot({ path: 'bible-2.png' });
  await p.click('.ch-cell >> text=3'); await p.waitForTimeout(1200);
  console.log('reader:', (await p.textContent('.reader-title .ref',{timeout:3000})).replace(/\s+/g, ' '), '| tabs hidden:', await p.$eval('#tabs', (x) => x.hidden), '| verses:', await p.$$eval('.scripture span.v', (x) => new Set(x.map((y) => y.dataset.k)).size));
  await p.evaluate(() => scrollTo(0, 99999)); await p.waitForTimeout(300);
  await p.screenshot({ path: 'bible-3.png' });
  await p.click('.free-nav a:last-child'); await p.waitForTimeout(1000);
  console.log('next ->', (await p.textContent('.reader-title .ref',{timeout:3000})).replace(/\s+/g, ' '));
  await p.click('.listen-fab'); await p.waitForTimeout(800);
  console.log('listen said:', JSON.stringify(await p.evaluate(() => window.__said.slice(0, 3))));
  // verse link from journal
  await p.goto('http://localhost:8080/#/journal'); await p.waitForTimeout(800);
  await p.click('[data-action=open-verse]'); await p.waitForTimeout(1200);
  console.log('journal -> ', await p.evaluate(() => location.hash), '| glow:', await p.$$eval('.scripture span.v.glow', (x) => x.length));
  // verse of the day link
  await p.goto('http://localhost:8080/#/today'); await p.waitForTimeout(1500); await closeAll();
  await p.click('[data-action=rhema-open]'); await p.waitForTimeout(1200);
  console.log('votd -> ', await p.evaluate(() => location.hash), (await p.textContent('.reader-title .ref',{timeout:3000})).replace(/\s+/g, ' '));
  // continue reading card
  await p.goto('http://localhost:8080/#/bible'); await p.waitForTimeout(500);
  console.log('continue card:', (await p.textContent('.cont-read').catch(() => 'none')).replace(/\s+/g, ' ').trim());
  // plan untouched
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('lamp.state.v1')));
  console.log('plan log today unchanged:', JSON.stringify(st.log[new Date().toISOString().slice(0,10)] ?? null), '| lastFree:', JSON.stringify(st.lastFree));
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
