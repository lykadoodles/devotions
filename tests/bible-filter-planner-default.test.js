const { chromium, devices } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const errs=[];
  const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'seed.json'))); delete seed.planner; delete seed.plannerShownByDefault;
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript((st)=>{ if(!sessionStorage.s){localStorage.setItem('lamp.state.v1', JSON.stringify(st)); sessionStorage.s=1;} }, seed);
  const p = await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8080/#/bible'); await p.waitForTimeout(1500);
  for (let k = 0; k < 6; k++) { const el = await p.$('[data-close]'); if (!el) break; await el.click(); await p.waitForTimeout(300); }
  console.log('existing user, planner tab shown:', await p.$eval('#tabs a[data-tab=planner]', a=>!a.hidden && getComputedStyle(a).display!=='none'));
  const books = async () => (await p.$$eval('#book-grid .book-cell b', x=>x.map(y=>y.textContent))).join(', ') || (await p.$eval('#book-grid', x=>x.textContent.trim()));
  const hit = async () => (await p.$eval('#goto-hit', x=>x.textContent.replace(/\s+/g,' ').trim()));
  for (const q of ['e','ec','jn','1 co','juan 3','kaw','salmo 23','eccl 9','xyz']) {
    await p.fill('#goto',''); await p.type('#goto', q, {delay: 20}); await p.waitForTimeout(150);
    console.log(JSON.stringify(q).padEnd(11), '=>', (await books()).slice(0,90), '|', await hit());
  }
  await p.fill('#goto','ec'); await p.waitForTimeout(100); await p.screenshot({path: require('path').join(__dirname, 'out', 'bf-1.png')});
  await p.fill('#goto',''); await p.waitForTimeout(150);
  console.log('cleared: tabs visible', await p.$eval('.seg-ctl.tst', x=>getComputedStyle(x).display!=='none'), '| first books:', (await books()).slice(0,40));
  // new user: planner switch on by default
  const ctx2 = await b.newContext({ ...devices['Pixel 7'] }); const p2 = await ctx2.newPage(); p2.on('pageerror',e=>errs.push('new: '+e.message));
  await p2.goto('http://localhost:8080/'); await p2.waitForTimeout(1200);
  console.log('welcome switch on:', await p2.$eval('#wplanner', x=>x.classList.contains('on')));
  await p2.fill('#wname','Lei'); await p2.click('[data-action=begin]'); await p2.waitForTimeout(1000);
  console.log('new user planner on:', await p2.evaluate(()=>JSON.parse(localStorage.getItem('lamp.state.v1')).planner.on));
  // existing user who turns it off keeps it off after reload
  await p.goto('http://localhost:8080/#/settings'); await p.waitForTimeout(1000); await p.click('[data-action=planner-toggle]'); await p.waitForTimeout(400);
  await p.reload(); await p.waitForTimeout(1200);
  console.log('turned off, after reload on =', await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp.state.v1')).planner.on));
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
