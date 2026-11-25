const { chromium } = require('playwright'); const fs=require('fs');
const VOICES = [
 {name:'en-au-x-aua-local',voiceURI:'en-au-x-aua-local',lang:'en-AU'},
 {name:'en-gb-x-rjs-local',voiceURI:'en-gb-x-rjs-local',lang:'en-GB'},
 {name:'en-us-x-sfg-local',voiceURI:'en-us-x-sfg-local',lang:'en-US'},
 {name:'en-us-SMTm00',voiceURI:'en-us-SMTm00',lang:'en-US'},
 {name:'en-in-x-ahp-local',voiceURI:'en-in-x-ahp-local',lang:'en-IN'},
];
(async () => {
  const b = await chromium.launch(); const seed = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'seed.json'))); seed.translation='BSB';
  const ctx = await b.newContext({ viewport:{width:390,height:800}, deviceScaleFactor:2 });
  await ctx.addInitScript((V)=>{ window.Capacitor={isNativePlatform:()=>false,Plugins:{TextToSpeech:{getSupportedVoices:async()=>({voices:V}),speak:async()=>{},stop:async()=>{}}}}; }, VOICES);
  await ctx.addInitScript((st)=>{ if(!sessionStorage.s){localStorage.setItem('lamp.state.v1', JSON.stringify(st)); sessionStorage.s=1;} }, seed);
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8080/#/settings'); await p.waitForTimeout(1500);
  await p.click('[data-voicepick=en]'); await p.waitForTimeout(500);
  const rows = async () => (await p.$$eval('.voice-row b', x=>x.map(y=>y.textContent))).join(' | ');
  const tab = async (r) => { await p.click(`[data-role=${r}]`); await p.waitForTimeout(200); console.log(r.padEnd(8), rows ? await rows() : '', '||', (await p.$$eval('.voice-list p', x=>x.map(y=>y.textContent))).join(' ')); };
  await tab('narrator'); await tab('male'); await tab('female'); await tab('god');
  await p.click('[data-role=narrator]'); await p.waitForTimeout(200);
  await p.screenshot({path: require('path').join(__dirname, 'out', 'voice-1.png')});
  // tag Voice 1 (aua) Female (two taps), Voice 5 Male (one tap)
  const tags = await p.$$('[data-gtag]'); await tags[0].click(); await p.waitForTimeout(100);
  await (await p.$$('[data-gtag]'))[0].click(); await p.waitForTimeout(100);
  await (await p.$$('[data-gtag]'))[4].click(); await p.waitForTimeout(100);
  console.log('after tagging:'); await tab('narrator'); await tab('male'); await tab('female');
  await p.screenshot({path: require('path').join(__dirname, 'out', 'voice-2.png')});
  // pick Voice 5 for men, then retag it Female -> men pick resets
  await p.click('[data-role=male]'); await p.waitForTimeout(150);
  await p.click('.voice-pick[data-voice="en-in-x-ahp-local"]'); await p.waitForTimeout(150);
  await p.click('[data-role=narrator]'); await p.waitForTimeout(150);
  await p.click('[data-gtag="en-in-x-ahp-local"]'); await p.waitForTimeout(150);
  const st = await p.evaluate(()=>JSON.parse(localStorage.getItem('lamp.state.v1')));
  console.log('gender map', JSON.stringify(st.voiceGender), '| men pick', JSON.stringify(st.dramaVoices.en));
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
