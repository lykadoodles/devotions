const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'seed.json'))); seed.translation='BSB';
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  await ctx.addInitScript((st)=>{ if(!sessionStorage.s){localStorage.setItem('lamp.state.v1', JSON.stringify(st)); sessionStorage.s=1;} }, seed);
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const closeAll = async () => { for (let k = 0; k < 8; k++) { const el = await p.$('[data-close]'); if (!el) break; await el.click(); await p.waitForTimeout(300); } };
  await p.goto('http://localhost:8080/#/bible/18/23'); await p.waitForTimeout(2000); await closeAll();
  const vs = await p.$$('.scripture span.v[data-k="18.23.1"]'); await vs[0].click(); await p.waitForTimeout(200);
  await (await p.$$('.scripture span.v[data-k="18.23.2"]'))[0].click(); await p.waitForTimeout(300);
  await p.click('[data-action=v-share]'); await p.waitForTimeout(1200);
  await p.screenshot({path: require('path').join(__dirname, 'out', 'card-1.png')});
  await p.click('[data-bg=night]'); await p.click('[data-font=script]'); await p.waitForTimeout(800);
  await p.screenshot({path: require('path').join(__dirname, 'out', 'card-2.png')});
  await p.click('[data-size=story]'); await p.click('[data-font=bold]'); await p.click('[data-bg=paper]'); await p.waitForTimeout(800);
  fs.writeFileSync(require('path').join(__dirname, 'out', 'card-full.png'), Buffer.from((await p.$eval('#vc-canvas', c=>c.toDataURL())).split(',')[1],'base64'));
  await p.setInputFiles('#vc-file', require('path').join(__dirname, 'fixtures/photo.jpg')); await p.waitForTimeout(1000);
  await p.click('[data-size=square]'); await p.click('[data-font=elegant]'); await p.waitForTimeout(800);
  await p.screenshot({path: require('path').join(__dirname, 'out', 'card-3.png')});
  const st = await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp.state.v1')).cardStyle);
  console.log('remembered', JSON.stringify(st));
  // share-text fallback present; votd share opens maker
  await p.click('[data-act=share-text]'); await p.waitForTimeout(300);
  await p.goto('http://localhost:8080/#/today'); await p.waitForTimeout(1800); await closeAll();
  await p.click('[data-action=rhema-share]'); await p.waitForTimeout(800);
  console.log('votd opens maker:', !!(await p.$('.card-sheet')));
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
