const { chromium, devices } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'seed.json'))); seed.planner={...(seed.planner||{}),on:true};
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript((st)=>{ if(!sessionStorage.s){localStorage.setItem('lamp.state.v1', JSON.stringify(st)); sessionStorage.s=1;} }, seed);
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const closeAll = async () => { for (let k = 0; k < 8; k++) { const el = await p.$('[data-close]'); if (!el) break; await el.click(); await p.waitForTimeout(300); } };
  await p.goto('http://localhost:8080/#/planner'); await p.waitForTimeout(1500); await closeAll();
  await p.tap('[data-pl=tab][data-tab=todos]'); await p.waitForTimeout(500);
  await p.tap('#pl-todo'); await p.keyboard.type('Buy groceries'); await p.tap('[data-plform=todo] button[type=submit]'); await p.waitForTimeout(600);
  console.log('after tap Add:', await p.$$eval('.pl-todo b', x=>x.map(y=>y.textContent)));
  await p.fill('#pl-todo','Call mom'); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
  console.log('after Enter:', await p.$$eval('.pl-todo b', x=>x.map(y=>y.textContent)));
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
