const { chromium, devices } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'seed.json')));
  const ctx = await b.newContext({ ...devices['Pixel 7'], viewport: { width: 412, height: 430 } }); // keyboard open: ~half screen
  await ctx.addInitScript((st)=>{ if(!sessionStorage.s){localStorage.setItem('lamp.state.v1', JSON.stringify(st)); sessionStorage.s=1;} }, seed);
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8080/#/notebook/new/sermon'); await p.waitForTimeout(1200);
  await p.fill('#nb-title','Faithful in little'); await p.tap('#nb-body');
  let worst = -1e9, jumps = 0, lastY = 0;
  for (let i = 1; i <= 30; i++) {
    await p.keyboard.type(`Point ${i}: God is faithful in the small things, so we can be too.`);
    if (i < 30) await p.keyboard.press('Enter');
    await p.waitForTimeout(40);
    const r = await p.evaluate(() => {
      const el = document.getElementById('nb-body'); const t = document.createElement('div'); const cs = getComputedStyle(el);
      for (const k of ['fontFamily','fontSize','fontWeight','lineHeight','paddingTop','paddingLeft','paddingRight','boxSizing']) t.style[k]=cs[k];
      Object.assign(t.style,{position:'absolute',visibility:'hidden',whiteSpace:'pre-wrap',overflowWrap:'break-word',width:el.clientWidth+'px'});
      t.textContent = el.value.slice(0, el.selectionEnd)+'​'; document.body.appendChild(t);
      const y = el.getBoundingClientRect().top + t.scrollHeight; t.remove();
      return { caret: y, vh: innerHeight, sy: scrollY };
    });
    worst = Math.max(worst, r.caret - r.vh); if (r.sy < lastY - 5) jumps++; lastY = r.sy;
  }
  console.log('caret ever below screen by (px, <=0 is good):', Math.round(worst), '| backwards scroll jumps:', jumps);
  // edit in the middle: page shouldn't jump
  await p.evaluate(()=>{ const el=document.getElementById('nb-body'); el.focus(); el.setSelectionRange(200,200); window.scrollTo(0,300); });
  const y0 = await p.evaluate(()=>scrollY); await p.keyboard.type(' (amen)'); await p.waitForTimeout(100);
  console.log('mid-text edit scroll:', y0, '->', await p.evaluate(()=>scrollY));
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
