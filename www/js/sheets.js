// Shared behaviour for every pop-up (.overlay) and bottom sheet (.sheet-overlay):
// - the page behind stays still while one is open
// - a bottom sheet closes when swiped down (from its top, or anywhere once its
//   own content is scrolled to the top), like other phone apps
// Sheets close through their backdrop tap handler, so each keeps its own clean-up.

let open = 0;
let savedY = 0;
function lock() {
  if (open++ > 0) return;
  savedY = window.scrollY;
  document.documentElement.classList.add('modal-open');
  document.body.style.top = `-${savedY}px`;
}
function unlock() {
  if (--open > 0) return;
  open = 0;
  document.documentElement.classList.remove('modal-open');
  document.body.style.top = '';
  window.scrollTo(0, savedY);
}

function swipeToClose(o) {
  const sheet = o.querySelector('.sheet');
  if (!sheet || sheet.dataset.swipe) return;
  sheet.dataset.swipe = '1';
  let y0 = 0, t0 = 0, dy = 0, dragging = false, armed = false;
  // inner horizontal scrollers (chip rows) and inputs keep their own gestures
  const skip = (t) => t.closest('input[type=range], textarea, select, .chip-row, .pl-scroll');
  sheet.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || skip(e.target)) { armed = false; return; }
    y0 = e.touches[0].clientY; t0 = performance.now(); dy = 0; dragging = false;
    armed = sheet.scrollTop <= 0 || !!e.target.closest('.sheet-grip');
  }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (!armed) return;
    dy = e.touches[0].clientY - y0;
    if (!dragging) {
      if (dy < -4) { armed = false; return; } // scrolling up: let the sheet scroll
      if (dy < 8) return;
      dragging = true;
      sheet.style.transition = 'none';
    }
    e.preventDefault();
    sheet.style.transform = `translateY(${Math.max(0, dy)}px)`;
    o.style.opacity = String(Math.max(0.35, 1 - dy / (sheet.offsetHeight * 1.4)));
  }, { passive: false });
  const end = () => {
    if (!dragging) { armed = false; return; }
    dragging = false; armed = false;
    const v = dy / Math.max(1, performance.now() - t0); // px per ms
    sheet.style.transition = 'transform .22s cubic-bezier(.2,.9,.3,1)';
    o.style.transition = 'opacity .22s';
    if (dy > Math.min(140, sheet.offsetHeight * 0.3) || (dy > 40 && v > 0.6)) {
      sheet.style.transform = 'translateY(100%)'; o.style.opacity = '0';
      setTimeout(() => { if (o.isConnected) o.click(); }, 200);
    } else {
      sheet.style.transform = ''; o.style.opacity = '';
    }
  };
  sheet.addEventListener('touchend', end);
  sheet.addEventListener('touchcancel', end);
}

function added(n) {
  if (!(n instanceof HTMLElement) || !n.classList.contains('overlay')) return;
  n.dataset.locked = '1';
  lock();
  if (n.classList.contains('sheet-overlay')) swipeToClose(n);
  // sheets whose content is filled in later (e.g. after loading voices)
  new MutationObserver(() => { if (n.classList.contains('sheet-overlay')) swipeToClose(n); }).observe(n, { childList: true, subtree: true });
}
function removed(n) {
  if (n instanceof HTMLElement && n.dataset.locked) { delete n.dataset.locked; unlock(); }
}

// Android: tapping a button while typing first closes the keyboard, the layout
// jumps, and the tap lands on nothing. For a form's own buttons (Add, Save...),
// keep focus in the field so the keyboard stays put and the tap goes through.
function keepKeyboard(e) {
  const btn = e.target.closest('button');
  const f = document.activeElement;
  if (!btn || !f || !f.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea')) return;
  const form = btn.form || btn.closest('form');
  if (form && form.contains(f)) e.preventDefault();
}

export function initSheets() {
  document.addEventListener('pointerdown', keepKeyboard, true);
  document.addEventListener('mousedown', keepKeyboard, true);
  new MutationObserver((muts) => {
    for (const m of muts) { m.addedNodes.forEach(added); m.removedNodes.forEach(removed); }
  }).observe(document.body, { childList: true });
}
