const { chromium } = require('playwright');
const fs = require('fs'); const F = '/home/claude/devotions/www/fonts/'; const b64 = (f) => 'data:font/woff2;base64,' + fs.readFileSync(F + f).toString('base64');
const flame = (w) => `<svg viewBox="0 0 100 130" width="${w}" style="display:block;overflow:visible;filter:drop-shadow(0 0 ${w/4}px rgba(255,150,60,.9)) drop-shadow(0 0 ${w/14}px rgba(255,210,120,.9))"><defs><radialGradient id="g" cx="50%" cy="78%" r="70%"><stop offset="0" stop-color="#fff7d6"/><stop offset=".3" stop-color="#ffd166"/><stop offset=".65" stop-color="#f4892f"/><stop offset="1" stop-color="#d9480f"/></radialGradient></defs><path d="M50 4C58 27 84 42 84 78c0 27-16 48-34 48S16 105 16 78c0-20 12-31 19-47 4 14 10 20 15 22C50 37 45 21 50 4z" fill="url(#g)"/><path d="M50 62c6 12 17 20 17 36 0 14-8 22-17 22s-17-8-17-22c0-12 11-21 17-36z" fill="#fff4c9" opacity=".95"/></svg>`;
const page = (inner) => `<!doctype html><style>
@font-face{font-family:M8;src:url(${b64('manrope-latin-800-normal.woff2')})}
@font-face{font-family:M5;src:url(${b64('manrope-latin-500-normal.woff2')})}
*{margin:0}body{width:1024px;height:1024px;overflow:hidden;position:relative;color:#fff;font-family:M8;
background:repeating-linear-gradient(90deg,rgba(255,255,255,.04) 0 4px,transparent 4px 74px),radial-gradient(70% 60% at 50% 42%,rgba(255,150,70,.42),rgba(255,150,70,0) 60%),radial-gradient(120% 70% at 85% -10%,#5b8cff,rgba(91,140,255,0) 55%),radial-gradient(90% 60% at 0% 100%,#3a2fd6,rgba(58,47,214,0) 60%),linear-gradient(180deg,#2a5be8,#1f44c4 45%,#172c88)}
.c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.w{font-size:150px;letter-spacing:-3px;text-shadow:0 0 40px rgba(170,205,255,.9);line-height:1;margin-top:26px}
.s{font-family:M5;font-size:44px;letter-spacing:.32em;color:#dbe6ff;margin-top:14px;padding-left:.32em}
</style><div class="c">${inner}</div>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  const shots = [
    ['lamp-gc-testers.png', `${flame(270)}<div class="w">LAMP</div><div class="s">TESTERS</div>`],
    ['lamp-gc-logo.png', `${flame(300)}<div class="w" style="margin-top:34px">LAMP</div>`],
    ['lamp-gc-flame.png', `${flame(430)}`],
  ];
  for (const [f, html] of shots) { await p.setContent(page(html)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200); await p.screenshot({ path: f }); }
  await b.close();
})();
