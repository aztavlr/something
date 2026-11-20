// UI kit: icons, bottom sheets, dialogs, toasts, theme, haptics, action registry.
import { esc } from './util.js';
import { state } from './store.js';
import { ACCENTS } from './data.js';

// ---------- App hooks (set by app.js) ----------
export const app = { tab: 'home', render() {} };
export const rerender = () => app.render({ animate: false });
export function go(tab) {
  app.tab = tab;
  window.scrollTo(0, 0);
  app.render({ animate: true });
}

// ---------- Action registry (global click delegation lives in app.js) ----------
export const actions = {};
export const on = (name, fn) => { actions[name] = fn; };

// ---------- Icons ----------
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  dumbbell: '<rect x="5" y="6" width="3" height="12" rx="1"/><rect x="16" y="6" width="3" height="12" rx="1"/><path d="M2.5 9.5v5M21.5 9.5v5M8 12h8"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  chart: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  down: '<path d="M5 9l7 7 7-7"/>',
  more: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V10M9.5 2.5h5M18.5 6.5l1.5-1.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8 21h8M9.5 18h5"/>',
  flame: '<path d="M12 2.5c.5 3.5 5.5 6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.5 1.5-4 2.5-5 .3 2 1.3 3 2.5 3.5-.5-3.5.5-6.5.5-9.5z"/>',
  share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  play: '<path d="M7 4.5v15l12.5-7.5L7 4.5z" fill="currentColor"/>',
  note: '<path d="M5 3h10l4 4v14H5z"/><path d="M9 12h6M9 16h6M9 8h3"/>',
  scale: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9.5a5 5 0 0 1 7 0L13 12"/>',
  calc: '<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M8.5 6.5h7M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01"/>',
  download: '<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
  upload: '<path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 20h14"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  zap: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z"/>',
  swap: '<path d="M7 4 3.5 7.5 7 11M3.5 7.5H17M17 13l3.5 3.5L17 20M20.5 16.5H7"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="14.5" cy="7" r="1.2" fill="currentColor"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  weight: '<path d="M8.5 9.5a3.5 3.5 0 1 1 7 0"/><path d="M6.5 9.5h11l2 10.5H4.5z"/>',
  layers: '<path d="M12 3 2.5 8 12 13l9.5-5z"/><path d="M2.5 12.5 12 17.5l9.5-5"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  repeat: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
};
export const icon = (name, cls = '') =>
  `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

// ---------- Theme ----------
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}
export function applyTheme() {
  const s = state.settings, root = document.documentElement;
  const dark = s.theme === 'auto' ? matchMedia('(prefers-color-scheme: dark)').matches : s.theme !== 'light';
  root.dataset.theme = dark ? 'dark' : 'light';
  const hex = ACCENTS[s.accent] || ACCENTS.ember;
  root.style.setProperty('--accent', hex);
  root.style.setProperty('--accent-rgb', hexToRgb(hex));
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0b0c10' : '#f4f5f7');
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

// ---------- Haptics & sound ----------
export function buzz(p = 12) { if (state.settings.vibrate && navigator.vibrate) navigator.vibrate(p); }
let actx;
export function unlockAudio() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch (e) { /* no audio */ }
}
export function chime() {
  if (!state.settings.sound) return;
  try {
    unlockAudio();
    const t = actx.currentTime;
    [880, 1175, 1568].forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), s = t + i * 0.13;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.22, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.32);
      o.connect(g).connect(actx.destination);
      o.start(s); o.stop(s + 0.34);
    });
  } catch (e) { /* ignore */ }
}

// ---------- Toast ----------
let toastTimer;
export function toast(msg, ic = '') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.innerHTML = `${ic ? icon(ic) : ''}<span>${esc(msg)}</span>`;
  t.className = 'toast show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 2600);
}
export function hideToast() {
  clearTimeout(toastTimer);
  const t = document.getElementById('toast');
  if (t) t.className = 'toast';
}

// ---------- Bottom sheets (stackable) ----------
const stack = [];
export function openSheet(html, { onClose, cls = '' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-backdrop"></div><div class="sheet ${cls}" role="dialog" aria-modal="true"><div class="sheet-grab"><span></span></div><div class="sheet-body">${html}</div></div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');
  const entry = { wrap, onClose };
  stack.push(entry);
  requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('open')));
  wrap.querySelector('.sheet-backdrop').addEventListener('click', () => closeSheet(entry));
  // Drag the handle down to dismiss
  const sheet = wrap.querySelector('.sheet'), grab = wrap.querySelector('.sheet-grab');
  let y0 = null, dy = 0;
  grab.addEventListener('pointerdown', (e) => { y0 = e.clientY; dy = 0; sheet.style.transition = 'none'; grab.setPointerCapture(e.pointerId); });
  grab.addEventListener('pointermove', (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sheet.style.transform = `translateY(${dy}px)`; });
  const end = () => {
    if (y0 == null) return;
    y0 = null; sheet.style.transition = ''; sheet.style.transform = '';
    if (dy > 90) closeSheet(entry);
  };
  grab.addEventListener('pointerup', end);
  grab.addEventListener('pointercancel', end);
  return wrap.querySelector('.sheet-body');
}
export function closeSheet(entry = stack[stack.length - 1]) {
  const i = stack.indexOf(entry);
  if (!entry || i < 0) return;
  stack.splice(i, 1);
  entry.wrap.classList.remove('open');
  setTimeout(() => entry.wrap.remove(), 260);
  if (!stack.length) document.body.classList.remove('no-scroll');
  entry.onClose?.();
}
export const closeAllSheets = () => { while (stack.length) closeSheet(); };
export const sheetOpen = () => stack.length > 0;
on('close-sheet', () => closeSheet());

// ---------- Dialogs ----------
export function confirmDialog({ title, message = '', confirm = 'OK', cancel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const body = openSheet(`
      <div class="dialog">
        <h3>${esc(title)}</h3>
        ${message ? `<p class="muted">${message}</p>` : ''}
        <div class="btn-row">
          <button class="btn" data-x="no">${esc(cancel)}</button>
          <button class="btn ${danger ? 'danger-fill' : 'primary'}" data-x="yes">${esc(confirm)}</button>
        </div>
      </div>`, { onClose: () => resolve(false) });
    body.querySelector('[data-x=yes]').onclick = () => { resolve(true); closeSheet(); };
    body.querySelector('[data-x=no]').onclick = () => closeSheet();
  });
}

export function promptDialog({ title, value = '', placeholder = '', confirm = 'Save', inputmode = 'text', message = '' }) {
  return new Promise((resolve) => {
    const body = openSheet(`
      <form class="dialog">
        <h3>${esc(title)}</h3>
        ${message ? `<p class="muted">${message}</p>` : ''}
        <input class="input" type="text" inputmode="${inputmode}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off">
        <div class="btn-row">
          <button type="button" class="btn" data-x="no">Cancel</button>
          <button type="submit" class="btn primary">${esc(confirm)}</button>
        </div>
      </form>`, { onClose: () => resolve(null) });
    const input = body.querySelector('input');
    setTimeout(() => { input.focus(); input.select(); }, 280);
    body.querySelector('form').onsubmit = (e) => { e.preventDefault(); resolve(input.value); closeSheet(); };
    body.querySelector('[data-x=no]').onclick = () => closeSheet();
  });
}

/** items: [{label, icon, danger, run, disabled}] */
export function actionSheet(title, items) {
  const body = openSheet(`
    ${title ? `<div class="sheet-title">${esc(title)}</div>` : ''}
    <div class="menu">
      ${items.map((it, i) => `<button class="menu-item ${it.danger ? 'danger' : ''}" data-i="${i}" ${it.disabled ? 'disabled' : ''}>${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}</span></button>`).join('')}
    </div>
    <button class="btn block ghost-btn" data-act="close-sheet">Cancel</button>`);
  body.querySelectorAll('[data-i]').forEach((b) => {
    b.onclick = () => { closeSheet(); items[+b.dataset.i].run(); };
  });
}

// ---------- Small render helpers ----------
export const empty = (ic, title, text, extra = '') =>
  `<div class="empty"><div class="empty-ic">${icon(ic)}</div><h3>${esc(title)}</h3><p class="muted">${text}</p>${extra}</div>`;

export const toggle = (key, checked) =>
  `<label class="switch"><input type="checkbox" data-setting="${key}" ${checked ? 'checked' : ''}><span></span></label>`;

export const appbar = (title, right = '', sub = '') =>
  `<header class="appbar"><div><h1>${title}</h1>${sub ? `<p class="appbar-sub">${sub}</p>` : ''}</div><div class="appbar-actions">${right}</div></header>`;
