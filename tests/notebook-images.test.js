const { chromium, devices } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'seed.json')));
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript((st)=>{ if(!sessionStorage.s){localStorage.setItem('lamp.state.v1', JSON.stringify(st)); sessionStorage.s=1;} }, seed);
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog', d=>d.accept());
  await p.goto('http://localhost:8080/#/notebook/new/sermon'); await p.waitForTimeout(1200);
  await p.fill('#nb-title','Faithful in little'); await p.fill('#nb-body','Text: Luke 16:10');
  // 1) pick from gallery
  await p.setInputFiles('#nb-file', require('path').join(__dirname, 'fixtures/photo2.jpg')); await p.waitForTimeout(1200);
  // 2) paste a screenshot into the text
  const b64 = fs.readFileSync(require('path').join(__dirname, 'fixtures/shot.png')).toString('base64');
  await p.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const f = new File([bin], 'shot.png', { type: 'image/png' });
    const dt = new DataTransfer(); dt.items.add(f);
    document.getElementById('nb-body').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, b64);
  await p.waitForTimeout(1500);
  const st = await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp.state.v1')).notebook.find(n=>!n.deleted));
  console.log('images saved on page:', JSON.stringify(st.images), '| state size KB:', Math.round((await p.evaluate(()=>localStorage.getItem('lamp.state.v1').length))/1024));
  console.log('gallery shows:', await p.$$eval('#nb-gallery img', x=>x.map(i=>i.naturalWidth+'x'+i.naturalHeight)), '| body text kept:', JSON.stringify(await p.inputValue('#nb-body')));
  await p.screenshot({path: require('path').join(__dirname, 'out', 'img-1.png')});
  // 3) viewer + remove the first
  await p.click('#nb-gallery .nb-pic'); await p.waitForTimeout(600); await p.screenshot({path: require('path').join(__dirname, 'out', 'img-2.png')});
  await p.click('[data-v=remove]'); await p.waitForTimeout(600);
  console.log('after remove:', await p.$$eval('#nb-gallery img', x=>x.length));
  // 4) list thumbnail
  await p.click('a[href="#/notebook"]'); await p.waitForTimeout(900);
  console.log('list thumb loaded:', await p.$eval('.nb-thumb', i=>i.naturalWidth>0).catch(()=>false));
  await p.screenshot({path: require('path').join(__dirname, 'out', 'img-3.png')});
  // 5) backup includes images, restore brings them back
  const json = await p.evaluate(async()=>{ const m = await import('./js/backup.js'); return m.backupJSON(); });
  const bk = JSON.parse(json); console.log('backup images:', Object.keys(bk.images||{}).length, 'size KB', Math.round(json.length/1024));
  await p.evaluate(async (json)=>{ indexedDB.deleteDatabase('lamp-images'); }, json); await p.waitForTimeout(300);
  const r = await p.evaluate(async (json)=>{ const m = await import('./js/backup.js'); const I = await import('./js/images.js'); const b = m.parseBackup(json); await m.restore(b.data, b.images); const id = b.data.notebook.find(n=>!n.deleted).images[0].id; return { sum: m.summarize(b.data).pages, back: (await I.read(id)).length > 1000 }; }, json);
  console.log('restore:', JSON.stringify(r));
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
