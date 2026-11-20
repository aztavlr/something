// Small shared helpers: DOM, formatting, dates, encoding.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const DAY = 864e5;

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Format a number with at most `dp` decimals and no trailing zeros. */
export function fmtNum(n, dp = 1) {
  if (n == null || Number.isNaN(+n)) return '';
  const f = 10 ** dp;
  return String(Math.round(+n * f) / f);
}

/** Compact big numbers: 12.3k, 1.2M */
export function fmtBig(n) {
  n = +n || 0;
  if (Math.abs(n) >= 1e6) return fmtNum(n / 1e6, 1) + 'M';
  if (Math.abs(n) >= 1e4) return fmtNum(n / 1e3, 1) + 'k';
  return Math.round(n).toLocaleString();
}

/** seconds -> m:ss or h:mm:ss */
export function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** ms -> "1h 05m" / "45m" */
export function fmtDur(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

export const fmtDate = (t, o = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(t).toLocaleDateString(undefined, o);
export const fmtTime = (t) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }

/** weekStart: 0 = Sunday, 1 = Monday */
export function startOfWeek(t, weekStart = 1) {
  const d = new Date(startOfDay(t));
  const diff = (d.getDay() - weekStart + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d.getTime();
}
export function addDays(t, n) { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); }

/** "Today", "Yesterday", "3 days ago", or a date */
export function fmtRel(t) {
  const days = Math.round((startOfDay(Date.now()) - startOfDay(t)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  return fmtDate(t, { month: 'short', day: 'numeric', year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Late night grind' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** UTF-8 safe base64url */
export function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64urlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function download(filename, text, type = 'application/json') {
  const blob = text instanceof Blob ? text : new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
