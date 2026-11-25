const { chromium } = require('playwright');
const fs = require('fs');
const F = '/home/claude/devotions/www/fonts/';
const font = (n, f) => `@font-face{font-family:${n};src:url(data:font/woff2;base64,${fs.readFileSync(F + f).toString('base64')})}`;
const img = (f) => `data:image/${f.endsWith('png') ? 'png' : 'jpeg'};base64,${fs.readFileSync(f).toString('base64')}`;
const FLAME = (w) => `<svg viewBox="0 0 100 130" width="${w}" style="display:block;overflow:visible;filter:drop-shadow(0 0 ${w/4}px rgba(255,150,60,.9)) drop-shadow(0 0 ${w/14}px rgba(255,210,120,.9))"><defs><radialGradient id="g${w}" cx="50%" cy="78%" r="70%"><stop offset="0" stop-color="#fff7d6"/><stop offset=".3" stop-color="#ffd166"/><stop offset=".65" stop-color="#f4892f"/><stop offset="1" stop-color="#d9480f"/></radialGradient></defs><path d="M50 4C58 27 84 42 84 78c0 27-16 48-34 48S16 105 16 78c0-20 12-31 19-47 4 14 10 20 15 22C50 37 45 21 50 4z" fill="url(#g${w})"/><path d="M50 62c6 12 17 20 17 36 0 14-8 22-17 22s-17-8-17-22c0-12 11-21 17-36z" fill="#fff4c9" opacity=".95"/></svg>`;
const CSS = (w, h) => `${font('M8', 'manrope-latin-800-normal.woff2')}${font('M5', 'manrope-latin-500-normal.woff2')}${font('L4i', 'literata-latin-400-italic.woff2')}
*{margin:0;box-sizing:border-box}body{width:${w}px;height:${h}px;overflow:hidden;position:relative;color:#fff;font-family:M5;
background:repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 3px,transparent 3px 70px),radial-gradient(60% 45% at 75% 40%,rgba(255,150,70,.22),rgba(255,150,70,0) 70%),radial-gradient(120% 60% at 85% -5%,#5b8cff,rgba(91,140,255,0) 55%),radial-gradient(90% 55% at 0% 100%,#3a2fd6,rgba(58,47,214,0) 60%),linear-gradient(180deg,#2a5be8,#1f44c4 45%,#172c88)}
.abs{position:absolute}.brand{display:flex;align-items:center;gap:12px;font-family:M8;letter-spacing:.2em;color:#dbe6ff}
h1{font-family:M8;letter-spacing:-2px;line-height:1.05;text-shadow:0 0 34px rgba(170,205,255,.7)}.acc{color:#ffbf70;text-shadow:0 0 30px rgba(255,160,70,.8)}
p{color:#dbe6ff;line-height:1.4}
.phone{border-radius:56px;padding:11px;background:linear-gradient(150deg,rgba(255,255,255,.6),rgba(255,255,255,.18) 40%,rgba(255,255,255,.38));box-shadow:0 40px 80px -20px rgba(5,10,50,.85),0 0 70px -10px rgba(160,196,255,.5)}
.phone .s{border-radius:46px;overflow:hidden;background:#10236e}.phone img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.verse{font-family:L4i;color:#e6edff}`;
const phone = (src, w, style = '') => `<div class="phone abs" style="width:${w}px;height:${Math.round(w * 2.02)}px;${style}"><div class="s" style="height:100%"><img src="${img(src)}"></div></div>`;
const R = '/tmp/claude-0/video/raw/', A = '/tmp/claude-0/au/';


const ios = (w, h, story) => `<style>${CSS(w, h)}
.pill{display:inline-flex;align-items:center;gap:12px;padding:16px 30px;border-radius:999px;background:#173a9e;border:2px solid rgba(255,255,255,.4);box-shadow:0 10px 30px -10px rgba(5,10,50,.7);font-family:M8;font-size:${story ? 34 : 30}px;letter-spacing:.04em}
.dot{width:14px;height:14px;border-radius:50%;background:#7CFFB2;box-shadow:0 0 14px #7CFFB2}
.notch{position:absolute;top:22px;left:50%;transform:translateX(-50%);width:34%;height:30px;border-radius:0 0 20px 20px;background:#0b1440;z-index:2}</style>
<div class="brand abs" style="top:${story ? 150 : 66}px;left:0;right:0;justify-content:center;font-size:${story ? 34 : 28}px">${FLAME(story ? 36 : 30)}LAMP</div>
<div class="abs" style="top:${story ? 250 : 140}px;left:60px;right:60px;text-align:center">
  <h1 style="font-size:${story ? 104 : 88}px">Coming soon<br>to <span class="acc">iPhone</span></h1>
  <p style="font-size:${story ? 40 : 34}px;margin-top:22px">Read your Bible in a year, now on iOS too 📖</p>
</div>
<div class="abs" style="left:0;right:0;top:${story ? 860 : 600}px;display:flex;justify-content:center">
  <div style="position:relative">${phone(R + 'today-new.jpg', story ? 560 : 500, 'position:relative')}<div class="notch"></div></div>
</div>
<div class="abs" style="left:40px;right:40px;top:${story ? 600 : 410}px;display:flex;justify-content:center;gap:14px;flex-wrap:wrap">
  <span class="pill"><span class="dot"></span>Android: testing on Google Play</span>
  <span class="pill">📱 iPhone: coming soon</span>
</div>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [f, w, h, st] of [['fb-ios-coming-soon-post.png', 1080, 1350, false], ['fb-ios-coming-soon-story.png', 1080, 1920, true]]) {
    await p.setViewportSize({ width: w, height: h }); await p.setContent(ios(w, h, st)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: f });
  }
  await b.close();
})();
