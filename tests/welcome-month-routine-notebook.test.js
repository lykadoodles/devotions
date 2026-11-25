const { chromium, devices } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch(); const errs=[];
  // 1) new user: planner question on welcome
  { const ctx = await b.newContext({ ...devices['Pixel 7'] }); const p = await ctx.newPage(); p.on('pageerror',e=>errs.push('welcome: '+e.message));
    await p.goto('http://localhost:8080/'); await p.waitForTimeout(1500);
    await p.screenshot({path: require('path').join(__dirname, 'out', 'w-1.png'), fullPage:true});
    await p.fill('#wname','Aira'); await p.click('#wplanner'); await p.click('[data-action=begin]'); await p.waitForTimeout(1200);
    const st = await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp.state.v1')));
    console.log('welcome -> planner on:', st.planner.on, '| planner tab visible:', await p.$eval('#tabs a[data-tab=planner]', a=>!a.hidden).catch(()=>'n/a'));
    await ctx.close(); }
  const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'seed.json'))); seed.translation='BSB'; seed.planner = { ...(seed.planner||{}), on: true, from: 5, to: 21 };
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript((st)=>{ if(!sessionStorage.s){localStorage.setItem('lamp.state.v1', JSON.stringify(st)); sessionStorage.s=1;} }, seed);
  const p = await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  const closeAll = async () => { for (let k = 0; k < 8; k++) { const el = await p.$('[data-close]'); if (!el) break; await el.click(); await p.waitForTimeout(300); } };
  await p.goto('http://localhost:8080/#/planner'); await p.waitForTimeout(1500); await closeAll();
  // 2) month
  await p.click('[data-pl=tab][data-tab=month]'); await p.waitForTimeout(500);
  const day = (await p.$$('.pl-mcell:not(.out)'))[9]; const date = await day.getAttribute('data-date'); await day.click(); await p.waitForTimeout(500);
  await p.fill('#pl-daynote', 'Emergency fund 20%. Read Prov 6:6-8, Gen 41:34 and 1 Tim 6:17. Week 2 is busy'); await p.waitForTimeout(700);
  console.log('day refs:', await p.$$eval('#pl-dayrefs .ref-chip', x=>x.map(y=>y.textContent+' '+y.getAttribute('href')).join(' | ')));
  await p.screenshot({path: require('path').join(__dirname, 'out', 'm-2.png')});
  await p.mouse.click(200, 60); await p.waitForTimeout(600);
  console.log('cell note:', await p.$eval(`.pl-mcell[data-date="${date}"] .pl-mnote`, x=>x.textContent).catch(()=>'MISSING'));
  await p.click('[data-pl=mg-add]'); await p.waitForTimeout(200); await p.keyboard.type('Save 20% of income'); await p.waitForTimeout(600);
  await p.screenshot({path: require('path').join(__dirname, 'out', 'm-1.png'), fullPage:true});
  // 3) routine
  await p.click('[data-pl=tab][data-tab=routine]'); await p.waitForTimeout(400);
  const add = async (label, start, mins) => { await p.click('[data-pl=r-add]'); await p.waitForTimeout(400); await p.fill('#rb-label', label); if (start) await p.fill('#rb-start', start); await p.selectOption('#rb-mins', String(mins)); await p.click('[data-blockform] button[type=submit]'); await p.waitForTimeout(400); };
  await add('Worship, pray, devotion', '05:00', 15); await add('Bath', null, 15); await add('Travel', '08:00', 90);
  await p.click('[data-pl=mo-add]'); await p.waitForTimeout(400); await p.fill('#mo-text','Tithes'); await p.selectOption('#mo-day','10'); await p.click('[data-moform] button[type=submit]'); await p.waitForTimeout(400);
  await p.fill('textarea[data-sw="1"]', '1h Bible study'); await p.waitForTimeout(600);
  console.log('blocks:', await p.$$eval('.pl-block', x=>x.map(y=>y.textContent.replace(/\s+/g,' ').trim()).join(' | ')));
  await p.screenshot({path: require('path').join(__dirname, 'out', 'r-1.png'), fullPage:true});
  await p.click('[data-pl=tab][data-tab=week]'); await p.waitForTimeout(600);
  console.log('routine in week grid:', await p.$$eval('.pl-routine', x=>x.length), await p.$$eval('.pl-routine', x=>x.slice(0,3).map(y=>y.textContent).join(' / ')));
  await p.screenshot({path: require('path').join(__dirname, 'out', 'r-2.png')});
  await p.click('[data-pl=tab][data-tab=month]'); await p.waitForTimeout(400);
  console.log('tithes in month:', await p.$$eval('.pl-mstd', x=>x.map(y=>y.textContent).join(',')));
  // 4) notebook
  await p.goto('http://localhost:8080/#/journey'); await p.waitForTimeout(900);
  await p.click('a[href="#/notebook"]'); await p.waitForTimeout(600);
  await p.screenshot({path: require('path').join(__dirname, 'out', 'n-0.png')});
  await p.click('a[href="#/notebook/new/sermon"]'); await p.waitForTimeout(700);
  await p.fill('#nb-title', 'Faithful in little'); await p.fill('[data-nbf=speaker]', 'Ps. Mark');
  await p.fill('#nb-body', 'Text: Luke 16:10\n\n1. God watches the small things.\n2. Plan like the ant (Prov 6:6-8).\n\nWhat I will do: give first, save next.'); await p.waitForTimeout(900);
  console.log('note refs:', await p.$$eval('#nb-refs .ref-chip', x=>x.map(y=>y.textContent).join(' | ')));
  await p.screenshot({path: require('path').join(__dirname, 'out', 'n-1.png')});
  await p.click('a[href="#/notebook"]'); await p.waitForTimeout(600);
  await p.click('a[href="#/notebook/new/letter"]'); await p.waitForTimeout(500); await p.click('a[href="#/notebook"]'); await p.waitForTimeout(600);
  console.log('list cards:', await p.$$eval('.nb-card b', x=>x.map(y=>y.textContent).join(' | ')), '(empty letter discarded)');
  await p.fill('#nb-q', 'ant'); await p.waitForTimeout(300); console.log('search ant:', await p.$$eval('.nb-card', x=>x.length));
  await p.screenshot({path: require('path').join(__dirname, 'out', 'n-2.png')});
  const st = await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp.state.v1')));
  console.log('saved notebook:', st.notebook.filter(n=>!n.deleted).length, '| dayNotes:', st.planner.dayNotes.length, '| blocks:', st.planner.routine.blocks.length, '| week[1]:', st.planner.routine.week[1]);
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
