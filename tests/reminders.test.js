// Reminders never ask for exact alarms (Lamp doesn't have that permission, and
// asking opened Android's "Alarms & reminders" page with a greyed-out switch).
const { chromium, devices } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json')));
  seed.reminder = { on: true, time: '07:30' }; seed.rhemaNotif = { on: true, time: '06:00' };
  const ctx = await b.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript((st) => {
    if (!sessionStorage.s) { localStorage.setItem('lamp.state.v1', JSON.stringify(st)); sessionStorage.s = 1; }
    window.__scheduled = [];
    window.Capacitor = { isNativePlatform: () => false, Plugins: { LocalNotifications: {
      requestPermissions: async () => ({ display: 'granted' }), getPending: async () => ({ notifications: [] }), cancel: async () => {},
      schedule: async ({ notifications }) => { window.__scheduled.push(...notifications); return { notifications: notifications.map((n) => ({ id: n.id })) }; },
      addListener: () => {}, createChannel: async () => {},
    } } };
  }, seed);
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8080/#/settings'); await p.waitForTimeout(2000);
  const s = await p.evaluate(() => window.__scheduled);
  const kinds = { reading: s.filter((n) => n.id >= 1000 && n.id < 2000).length, verse: s.filter((n) => n.id >= 2000 && n.id < 3000).length };
  console.log('scheduled:', s.length, JSON.stringify(kinds), '| all not exact:', s.length > 0 && s.every((n) => n.isExactNotification === false));
  console.log('battery tip shown:', !!(await p.$('text=No restrictions')));
  await p.screenshot({ path: path.join(__dirname, 'out', 'reminders.png'), fullPage: true });
  console.log('errors', JSON.stringify(errs)); await b.close();
})();
