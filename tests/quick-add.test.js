const { chromium, devices } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'seed.json'))); seed.planner={...(seed.planner||{}),on:true};
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript((st)=>{ if(!sessionStorage.s){localStorage.setItem('lamp.state.v1', JSON.stringify(st)); sessionStorage.s=1;} }, seed);
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  const closeAll = async () => { for (let k = 0; k < 8; k++) { const el = await p.$('[data-close]'); if (!el) break; await el.click(); await p.waitForTimeout(300); } };
  await p.goto('http://localhost:8080/#/planner'); await p.waitForTimeout(1500); await closeAll();
  await p.tap('[data-pl=quick]'); await p.waitForTimeout(500);
  await p.tap('#pl-quick'); await p.keyboard.type('Buy groceries'); await p.tap('[data-plform=quick] button[type=submit]'); await p.waitForTimeout(800);
  console.log('sheet still open:', !!(await p.$('#pl-quick')), '| todos:', await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp.state.v1')).planner.items.filter(i=>!i.deleted&&!i.date).map(i=>i.text)));
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
