const { chromium, devices } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'seed.json'))); seed.translation='BSB';
  seed.startDate = new Date(Date.now()-5*864e5).toISOString().slice(0,10); seed.done={ot:{},nt:{},ps:{},pr:{}}; seed.log={}; seed.planner={...(seed.planner||{}),on:true};
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript((st)=>{ if(!sessionStorage.s){localStorage.setItem('lamp.state.v1', JSON.stringify(st)); sessionStorage.s=1;} }, seed);
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const closeAll = async () => { for (let k = 0; k < 8; k++) { const el = await p.$('[data-close]'); if (!el) break; await el.click(); await p.waitForTimeout(300); } };
  await p.goto('http://localhost:8080/#/today'); await p.waitForTimeout(1800); await closeAll();
  await p.click('a[href="#/catchup"]'); await p.waitForTimeout(1000);
  console.log('catch up page:', (await p.$eval('#app', x=>x.innerText.slice(0,120))).replace(/\s+/g,' '));
  console.log('sections:', await p.$$eval('#app .section', x=>x.length));
  await p.screenshot({path: require('path').join(__dirname, 'out', 'cu-1.png')});
  // open the first reading and mark it done, then go back
  const first = await p.$('#app .section a[href^="#/read/"]'); const href = await first.getAttribute('href'); await first.click(); await p.waitForTimeout(2000);
  console.log('opened:', href, '->', await p.evaluate(()=>location.hash));
  await closeAll();
  await p.goto('http://localhost:8080/#/catchup'); await p.waitForTimeout(900); await p.click('#app .section button.check'); await p.waitForTimeout(900);
  await p.goto('http://localhost:8080/#/catchup'); await p.waitForTimeout(1000);
  console.log('after one read:', (await p.$eval('#app p.muted', x=>x.textContent)));
  // journey pill
  await p.goto('http://localhost:8080/#/journey'); await p.waitForTimeout(1000);
  await p.click('a.chip.warn'); await p.waitForTimeout(800); console.log('journey pill ->', await p.evaluate(()=>location.hash), (await p.$eval('#app h1', x=>x.textContent)));
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
