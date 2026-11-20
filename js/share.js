// Sharing between friends without a server: routines/workouts travel inside the link itself.
import { state, save, exById, setText, workoutStats, fmtVol, startWorkout } from './store.js';
import { b64urlEncode, b64urlDecode, esc, fmtDate, fmtDur, uid, download } from './util.js';
import { openSheet, closeAllSheets, toast, icon, go, confirmDialog } from './ui.js';
import { appLink } from './gate.js';
import { CONFIG } from './config.js';

export async function nativeShare({ title, text, url, files }) {
  try {
    if (files && navigator.canShare && navigator.canShare({ files })) { await navigator.share({ title, text, files }); return 'shared'; }
    if (!files && navigator.share) { await navigator.share({ title, text, url }); return 'shared'; }
  } catch (e) {
    if (e && e.name === 'AbortError') return 'cancelled';
  }
  if (files) { download(files[0].name, files[0]); toast('Image saved', 'download'); return 'downloaded'; }
  try { await navigator.clipboard.writeText(url ? `${text ? text + ' ' : ''}${url}` : text); toast('Link copied — paste it to your friends', 'copy'); return 'copied'; }
  catch (e) { window.prompt('Copy this link:', url || text); return 'prompted'; }
}

const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
const exMeta = (exId) => { const e = exById(exId); return [e.name, e.muscle, e.type, e.equipment]; };
const link = (payload) => `${appLink()}#s=${b64urlEncode(JSON.stringify(payload))}`;

export function shareRoutine(r) {
  const url = link({ k: 'r', n: r.name, by: state.profile.name || '', i: r.items.map((it) => [...exMeta(it.exId), it.sets || 3, it.reps || 0]) });
  return nativeShare({ title: r.name, text: `Try my "${r.name}" routine on ${CONFIG.appName} 💪`, url });
}

export function shareWorkoutLink(w) {
  const url = link({
    k: 'w', n: w.name, by: state.profile.name || '', t: w.start, d: (w.end || w.start) - w.start,
    i: w.exercises.map((ex) => [...exMeta(ex.exId), ex.sets.map((s) => [r2(s.w), s.r ?? null, s.t ?? null, r2(s.d), s.kind || 'n'])]),
  });
  return nativeShare({ title: w.name, text: `Check out my ${w.name} on ${CONFIG.appName} 🔥`, url });
}

function resolveEx([name, muscle, type, equipment]) {
  const lc = String(name).toLowerCase();
  const found = state.exercises.find((e) => e.name.toLowerCase() === lc);
  if (found) { if (found.hidden) found.hidden = false; return found.id; }
  const ex = { id: uid(), name: String(name).slice(0, 60), muscle: muscle || 'Other', type: type || 'weight', equipment: equipment || 'Other', custom: true };
  state.exercises.push(ex);
  return ex.id;
}

function saveRoutineFrom(p) {
  const items = p.i.map((x) => p.k === 'r'
    ? { exId: resolveEx(x), sets: +x[4] || 3, reps: +x[5] || null }
    : { exId: resolveEx(x), sets: (x[4] || []).length || 3 });
  const r = { id: uid(), name: String(p.n || 'Shared routine').slice(0, 60), items };
  state.routines.push(r);
  save();
  return r;
}

/** Call on boot: opens a preview if the URL carries a shared routine/workout. */
export function checkIncomingShare() {
  const m = location.hash.match(/[#&]s=([^&]+)/);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  let p;
  try { p = JSON.parse(b64urlDecode(m[1])); if (!p || !Array.isArray(p.i)) throw new Error('bad'); }
  catch (e) { toast('That share link looks broken', 'info'); return; }
  const who = p.by ? esc(p.by) : 'A friend';
  const list = p.k === 'r'
    ? p.i.map((x) => `<div class="wline"><span class="nm">${esc(x[0])}</span><span class="best">${+x[4] || 3} × ${+x[5] || '—'}</span></div>`).join('')
    : p.i.map((x) => {
      const sets = (x[4] || []).map((s) => setText(x[2] || 'weight', { w: s[0], r: s[1], t: s[2], d: s[3] }));
      return `<div class="card" style="padding:12px 14px"><strong>${esc(x[0])}</strong><div class="muted" style="font-size:14px;margin-top:4px">${sets.map(esc).join(' · ')}</div></div>`;
    }).join('');
  const body = openSheet(`
    <div class="sheet-head"><div><div class="hero-kicker" style="color:var(--accent)">${p.k === 'r' ? 'Shared routine' : 'Shared workout'}</div><h2>${esc(p.n)}</h2></div></div>
    <p class="sheet-sub">${who} sent you this${p.k === 'w' && p.t ? ` · ${esc(fmtDate(p.t))}${p.d ? ` · ${fmtDur(p.d)}` : ''}` : ''}.</p>
    <div class="${p.k === 'r' ? 'card' : 'col'}">${list}</div>
    <div class="col mt-lg">
      <button class="btn primary block" data-x="start">${icon('play')} Do this workout now</button>
      <button class="btn block" data-x="save">${icon('download')} Save to my routines</button>
    </div>`);
  body.querySelector('[data-x=save]').onclick = () => { saveRoutineFrom(p); closeAllSheets(); toast('Saved to your routines', 'check'); go('train'); };
  body.querySelector('[data-x=start]').onclick = async () => {
    if (state.active && !(await confirmDialog({ title: 'Replace current workout?', message: 'You have a workout in progress. Starting this one discards it.', confirm: 'Replace', danger: true }))) return;
    const r = saveRoutineFrom(p);
    startWorkout({ name: r.name, items: r.items, routineId: r.id });
    closeAllSheets();
    go('train');
  };
}

// ---------- Shareable image card ----------
function rgba(hex, a) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
function fit(c, text, maxW) {
  if (c.measureText(text).width <= maxW) return text;
  while (text.length > 1 && c.measureText(text + '…').width > maxW) text = text.slice(0, -1);
  return text + '…';
}
function rrect(c, x, y, w, h, r) {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h);
}

export async function shareWorkoutImage(w, prs = []) {
  const W = 1080, H = 1350, F = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff6b35';
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#0b0c10'; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W * 0.9, -40, 40, W * 0.9, -40, 1000);
  g.addColorStop(0, rgba(accent, 0.6)); g.addColorStop(1, rgba(accent, 0));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = rgba('#ffffff', 0.06); c.lineWidth = 60;
  c.beginPath(); c.arc(W - 60, H - 40, 260, 0, Math.PI * 2); c.stroke();

  const st = workoutStats(w);
  c.fillStyle = accent; c.font = `800 34px ${F}`; c.fillText(CONFIG.appName.toUpperCase(), 80, 120);
  c.fillStyle = '#fff'; c.font = `850 82px ${F}`; c.fillText(fit(c, w.name, W - 160), 80, 225);
  c.fillStyle = '#a3a8b5'; c.font = `600 36px ${F}`;
  c.fillText(`${fmtDate(w.start, { weekday: 'long', month: 'long', day: 'numeric' })}${state.profile.name ? ' · ' + state.profile.name : ''}`, 80, 285);

  const boxes = [['DURATION', fmtDur(st.dur)], ['VOLUME', fmtVol(st.vol)], ['SETS', String(st.sets)]];
  const bw = (W - 160 - 40) / 3;
  boxes.forEach(([label, val], i) => {
    const x = 80 + i * (bw + 20);
    c.fillStyle = rgba('#ffffff', 0.07); rrect(c, x, 340, bw, 170, 32); c.fill();
    c.fillStyle = '#8d93a3'; c.font = `750 26px ${F}`; c.fillText(label, x + 32, 395);
    c.fillStyle = '#fff'; c.font = `850 56px ${F}`; c.fillText(fit(c, val, bw - 50), x + 32, 470);
  });

  let y = 600;
  const prIds = new Set(prs.map((p) => p.exId));
  const rows = w.exercises.slice(0, prs.length ? 7 : 8);
  for (const ex of rows) {
    const e = exById(ex.exId);
    const best = ex.sets.filter((s) => s.kind !== 'w').slice(-1)[0] || ex.sets[0];
    c.fillStyle = '#fff'; c.font = `700 40px ${F}`;
    c.fillText(fit(c, `${ex.sets.length} × ${e.name}`, 620), 80, y);
    c.fillStyle = prIds.has(ex.exId) ? '#fbbf24' : '#a3a8b5'; c.font = `650 36px ${F}`; c.textAlign = 'right';
    c.fillText(`${prIds.has(ex.exId) ? '🏆 ' : ''}${setText(e.type, best)}`, W - 80, y);
    c.textAlign = 'left';
    y += 74;
  }
  if (w.exercises.length > rows.length) { c.fillStyle = '#8d93a3'; c.font = `600 32px ${F}`; c.fillText(`+ ${w.exercises.length - rows.length} more`, 80, y); y += 60; }
  if (prs.length) {
    c.fillStyle = rgba('#fbbf24', 0.16); rrect(c, 80, H - 230, W - 160, 110, 30); c.fill();
    c.fillStyle = '#fbbf24'; c.font = `800 44px ${F}`;
    c.fillText(`🏆  ${prs.length} new personal record${prs.length > 1 ? 's' : ''}!`, 120, H - 160);
  }
  c.fillStyle = '#5f6574'; c.font = `600 28px ${F}`; c.fillText(`Logged with ${CONFIG.appName}`, 80, H - 60);

  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const file = new File([blob], `${CONFIG.appName.toLowerCase()}-${new Date(w.start).toISOString().slice(0, 10)}.png`, { type: 'image/png' });
  return nativeShare({ title: w.name, text: `${w.name} 💪`, files: [file] });
}
