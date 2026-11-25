const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'seed.json'))); seed.translation='BSB';
  const t = new Date(); const iso = (d)=>new Date(d - d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
  seed.planner = { on: true, from: 7, to: 21, items: [
    { id:'a', text:'Standardize', date:null, hour:null, done:false, createdAt:'x', updatedAt:'x', deleted:false },
    { id:'b', text:'Check ops', date:null, hour:null, done:false, createdAt:'x', updatedAt:'x', deleted:false },
    { id:'c', text:'Team sync', date: iso(t), hour: 10, done:false, createdAt:'x', updatedAt:'x', deleted:false } ], goals:[], birthdays:[] };
  seed.prayers = [{ id:'p1', text:'Pray without ceasing', who:'', created:'2026-11-01', prayedCount:0, answered:null }, { id:'p2', text:'Discernment', who:'Mom', created:'2026-11-02', prayedCount:0, answered:null }];
  const ctx = await b.newContext(); await ctx.addInitScript((st)=>localStorage.setItem('lamp.state.v1', JSON.stringify(st)), seed);
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8080/#/today'); await p.waitForTimeout(1500);
  const w = await p.evaluate(async () => { const m = await import('./js/widgets.js'); return m.build(); });
  const d0 = w.days[Object.keys(w.days)[0]];
  console.log('days:', Object.keys(w.days).length, '| streak:', w.streak, '| day:', d0.day);
  console.log('verse:', d0.verse.ref, '-', d0.verse.text.slice(0,60), d0.verse.tr);
  console.log('readings:', d0.readings.map(r=>`${r.name}: ${r.ref}${r.done?' ✓':''} ${r.route}`).join(' | '));
  console.log('plan today:', JSON.stringify(d0.plan), '| todos:', JSON.stringify(w.planner.todos.map(x=>x.text)), '| prayers:', JSON.stringify(w.prayers));
  console.log('size bytes:', JSON.stringify(w).length, 'errors', JSON.stringify(errs)); await b.close();
})();
