const { chromium } = require('playwright'); const fs=require('fs');
const V = ['en-AU-language','en-GB-language','en-IN-language','en-NG-language','en-US-language',
 'en-au-x-aua-local','en-au-x-auc-local','en-au-x-aub-local','en-au-x-aud-local',
 'en-gb-x-gba-local','en-gb-x-gbc-local','en-gb-x-gbb-local','en-gb-x-gbd-local','en-gb-x-gbg-local','en-gb-x-rjs-local',
 'en-in-x-ahp-local','en-in-x-end-local','en-us-x-iob-local','en-us-x-iol-local','en-us-x-tpf-local','en-ng-x-tfn-local']
 .map(n=>({name:n, voiceURI:n, lang: n.slice(0,5).replace(/^(..)-(..)$/,(m,a,b)=>a+'-'+b.toUpperCase())}));
(async () => {
  const b = await chromium.launch(); const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'seed.json')));
  const ctx = await b.newContext({ viewport:{width:390,height:800} });
  await ctx.addInitScript((V)=>{ window.Capacitor={isNativePlatform:()=>false,Plugins:{TextToSpeech:{getSupportedVoices:async()=>({voices:V}),speak:async()=>{},stop:async()=>{}}}}; }, V);
  await ctx.addInitScript((st)=>{ if(!sessionStorage.s){localStorage.setItem('lamp.state.v1', JSON.stringify(st)); sessionStorage.s=1;} }, seed);
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8080/#/settings'); await p.waitForTimeout(1500);
  await p.click('[data-voicepick=en]'); await p.waitForTimeout(500);
  const show = async (r) => { await p.click(`[data-role=${r}]`); await p.waitForTimeout(200); return (await p.$$eval('.voice-row', x=>x.map(y=>y.querySelector('b').textContent+' ['+y.querySelector('small').textContent.split(' ·')[0]+']'))).join(', '); };
  console.log('NARRATOR:', await show('narrator')); console.log('MEN:', await show('male')); console.log('WOMEN:', await show('female'));
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
