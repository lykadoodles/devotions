const { chromium, devices } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'seed.json'))); seed.translation='BSB';
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript((st)=>{ if(!sessionStorage.s){localStorage.setItem('lamp.state.v1', JSON.stringify(st)); sessionStorage.s=1;} }, seed);
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type==='touchEnd'?[]:[{x,y}] });
  const swipe = async (x, y1, y2, steps=12, ms=12) => { await touch('touchStart', x, y1); for (let i=1;i<=steps;i++){ await touch('touchMove', x, y1+(y2-y1)*i/steps); await p.waitForTimeout(ms);} await touch('touchEnd'); await p.waitForTimeout(500); };
  const closeAll = async () => { for (let k = 0; k < 8; k++) { const el = await p.$('[data-close]'); if (!el) break; await el.click(); await p.waitForTimeout(300); } };
  await p.goto('http://localhost:8080/#/today'); await p.waitForTimeout(2000); await closeAll();
  await p.evaluate(()=>window.scrollTo(0, 300)); await p.waitForTimeout(200);
  const y0 = await p.evaluate(()=>window.scrollY);
  await p.$eval('[data-action=rhema-share]', e=>e.click()); await p.waitForTimeout(900);
  console.log('open:', !!(await p.$('.card-sheet')), '| locked:', await p.evaluate(()=>document.documentElement.classList.contains('modal-open')));
  // swipe on the backdrop area above the sheet: page must not scroll
  await swipe(200, 60, 20); 
  const box = await (await p.$('.card-sheet')).boundingBox();
  // small drag down: snaps back
  await swipe(200, box.y + 20, box.y + 60, 6, 30);
  console.log('small drag -> still open:', !!(await p.$('.card-sheet')));
  // horizontal chip row swipe shouldn't close
  const chips = await (await p.$('#vc-bg')).boundingBox();
  await swipe(chips.x+chips.width/2, chips.y+20, chips.y+120, 8, 15);
  console.log('drag on background chips -> still open:', !!(await p.$('.card-sheet')));
  // real swipe down from the grip
  await swipe(200, box.y + 8, box.y + 400, 10, 12);
  console.log('swipe down -> closed:', !(await p.$('.card-sheet')), '| unlocked:', !(await p.evaluate(()=>document.documentElement.classList.contains('modal-open'))), '| scroll kept:', y0, '->', await p.evaluate(()=>window.scrollY));
  // reading options sheet (Aa) in the reader, and voice picker in settings
  await p.goto('http://localhost:8080/#/bible/19/23'); await p.waitForTimeout(1500); await closeAll();
  await p.$eval('[data-action=reading-sheet]', e=>e.click()).catch(()=>{});
  await p.waitForTimeout(700);
  const s2 = await p.$('.sheet'); console.log('Aa sheet open:', !!s2);
  if (s2) { const bb = await s2.boundingBox(); await swipe(200, bb.y+8, bb.y+450, 10, 12); console.log('Aa swipe -> closed:', !(await p.$('.sheet'))); }
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
