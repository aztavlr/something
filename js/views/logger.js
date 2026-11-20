// Live workout logger: sets, rest timer, PR detection, finish summary.
import {
  state, save, exById, COLS, toInput, fromInput, setReady, setScore, isWorkSet, bestScore, lastSession,
  newExEntry, blankSet, finishActive, workoutStats, fmtW, fmtVol, kgToDisp, kmToDisp, wUnit, dUnit, setText,
} from '../store.js';
import { esc, fmtClock, fmtDur, fmtNum, fmtDate, fmtBig } from '../util.js';
import { icon, on, rerender, go, toast, buzz, chime, unlockAudio, openSheet, closeSheet, actionSheet, confirmDialog, promptDialog, empty } from '../ui.js';
import { confetti } from '../charts.js';
import { pickExercises, openExercise, REST_OPTS } from './exercise.js';
import { plateCalc } from './tools.js';
import { shareWorkoutImage, shareWorkoutLink } from '../share.js';
import { queueWorkout, flush } from '../cloud.js';
import { addWorkoutPhoto } from './history.js';
import { getPhoto } from '../photos.js';

const restFor = (e) => e.rest ?? state.settings.rest;
const gridCols = (n, rpe) => `grid-template-columns:32px minmax(40px,1.1fr) repeat(${n},minmax(0,1fr))${rpe ? ' 44px' : ''} 42px`;

function prevText(type, s) {
  if (type === 'weight') return `${fmtW(s.w, 1)}×${s.r || 0}`;
  if (type === 'bodyweight') return s.w ? `+${fmtW(s.w, 1)}×${s.r || 0}` : `${s.r || 0} reps`;
  if (type === 'duration') return fmtClock(s.t || 0);
  return s.d ? `${fmtNum(kmToDisp(s.d), 1)} ${dUnit()}` : fmtClock(s.t || 0);
}

function liveStats(a) {
  let done = 0, total = 0, vol = 0;
  for (const ex of a.exercises) {
    const type = exById(ex.exId).type;
    for (const s of ex.sets) {
      total++;
      if (!s.done) continue;
      done++;
      if (type === 'weight') vol += (s.w || 0) * (s.r || 0);
    }
  }
  return { done, total, vol };
}

function exBlock(ex, ei) {
  const a = state.active, e = exById(ex.exId);
  const type = COLS[e.type] ? e.type : 'weight', cols = COLS[type];
  const rpe = state.settings.showRpe && (type === 'weight' || type === 'bodyweight');
  const last = lastSession(ex.exId, a.id);
  const prev = last ? last.ex.sets.filter((s) => s.done) : [];
  const g = gridCols(cols.length, rpe);
  const before = bestScore(ex.exId, a.id);
  let prSi = -1, top = -1;
  ex.sets.forEach((s, si) => { if (isWorkSet(s)) { const sc = setScore(type, s); if (sc > top) { top = sc; prSi = si; } } });
  if (!(before !== undefined && top > before + 1e-9)) prSi = -1;
  let n = 0;
  const rows = ex.sets.map((s, si) => {
    const p = prev[si];
    const label = s.kind === 'w' ? 'W' : s.kind === 'd' ? 'D' : s.kind === 'f' ? 'F' : String(++n);
    const ph = (c) => (p ? (type === 'bodyweight' && c.f === 'w' && !p.w ? '' : toInput(c.kind, p[c.f])) : ex.target && ((c.f === 'r' && type !== 'duration') || (c.f === 't' && type === 'duration')) ? String(ex.target) : '');
    const at = `data-ei="${ei}" data-si="${si}"`;
    return `<div class="set-row ${s.done ? 'done' : ''}" style="${g}">
      <button class="set-num k-${s.kind}" data-act="set-menu" ${at} aria-label="Set type">${label}</button>
      <button class="set-prev" data-act="copy-prev" ${at} ${p ? '' : 'disabled'}>${p ? esc(prevText(type, p)) : '—'}</button>
      ${cols.map((c) => `<input class="set-in" ${at} data-f="${c.f}" data-k="${c.kind}" inputmode="${c.kind === 'int' ? 'numeric' : 'decimal'}" enterkeyhint="next" autocomplete="off" value="${esc(toInput(c.kind, s[c.f]))}" placeholder="${esc(ph(c))}" aria-label="${esc(c.label())}">`).join('')}
      ${rpe ? `<input class="set-in" ${at} data-f="rpe" data-k="rpe" inputmode="decimal" enterkeyhint="next" value="${s.rpe ?? ''}" placeholder="–" aria-label="RPE">` : ''}
      <button class="set-check" data-act="toggle-set" ${at} aria-label="Complete set">${icon('check')}</button>
      ${si === prSi ? `<span class="pr-flag">${icon('trophy')}PR</span>` : ''}
    </div>`;
  }).join('');
  const rest = restFor(e);
  const target = ex.target ? ` · goal ${ex.target}${type === 'duration' ? 's' : ' reps'}` : '';
  return `<section class="exb">
    <div class="exb-head">
      <button class="exb-title" data-act="ex-info" data-ei="${ei}"><strong>${esc(e.name)}</strong><span>${rest ? `Rest ${fmtClock(rest)}` : 'No rest timer'}${target}</span></button>
      <button class="icon-btn plain" data-act="ex-menu" data-ei="${ei}" aria-label="Exercise options">${icon('more')}</button>
    </div>
    ${ex.notes ? `<div class="exb-note">${esc(ex.notes)}</div>` : ''}
    <div class="set-grid">
      <div class="set-row set-head" style="${g}"><span>Set</span><span>Previous</span>${cols.map((c) => `<span>${esc(c.label())}</span>`).join('')}${rpe ? '<span>RPE</span>' : ''}<span>${icon('check')}</span></div>
      ${rows}
    </div>
    <div class="exb-actions"><button class="btn sm" data-act="add-set" data-ei="${ei}">${icon('plus')} Add set</button></div>
  </section>`;
}

export function renderLogger(root) {
  const a = state.active, st = liveStats(a);
  root.innerHTML = `
    <header class="appbar">
      <button class="live-title grow" data-act="rename-active" aria-label="Rename workout"><h1>${esc(a.name)}</h1></button>
      <div class="appbar-actions"><button class="btn primary sm" data-act="finish">${a.editing ? 'Save' : 'Finish'}</button></div>
    </header>
    ${a.editing ? `<div class="editing-note">Editing your workout from ${esc(fmtDate(a.start))}. Tap Save when done.</div>` : ''}
    <div class="live-meta">
      <span>${icon('clock')}<b id="elapsed">${a.editing ? fmtDur((a.end || a.start) - a.start) : fmtClock((Date.now() - a.start) / 1000)}</b></span>
      <span>${icon('layers')}<b>${st.done}/${st.total} sets</b></span>
      ${st.vol ? `<span>${icon('weight')}<b>${fmtVol(st.vol)}</b></span>` : ''}
    </div>
    ${a.notes ? `<div class="exb-note" style="margin:0 0 12px">${esc(a.notes)}</div>` : ''}
    ${a.exercises.length ? a.exercises.map(exBlock).join('') : `<div class="card">${empty('dumbbell', "Let's go!", 'Add your first exercise to start logging sets.')}</div>`}
    <div class="col mt-lg">
      <button class="btn soft block" data-act="add-exercise">${icon('plus')} Add exercise</button>
      <div class="btn-row"><button class="btn" data-act="workout-notes">${icon('note')} Notes</button><button class="btn" data-act="tool-plates">${icon('layers')} Plates</button></div>
      <button class="btn ghost-btn danger block" data-act="discard">${a.editing ? 'Cancel editing' : 'Discard workout'}</button>
    </div>`;
  syncWake();
}

// ---------- Inputs ----------
let saveTimer;
const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); };
document.addEventListener('input', (e) => {
  const t = e.target;
  if (!t.classList || !t.classList.contains('set-in') || !state.active) return;
  const s = state.active.exercises[+t.dataset.ei]?.sets[+t.dataset.si];
  if (!s) return;
  if (t.dataset.k === 'rpe') {
    const v = parseFloat(t.value.replace(',', '.'));
    s.rpe = Number.isFinite(v) ? Math.min(10, Math.max(1, v)) : null;
  } else s[t.dataset.f] = fromInput(t.dataset.k, t.value);
  saveSoon();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !e.target.classList?.contains('set-in')) return;
  e.preventDefault();
  const all = [...document.querySelectorAll('.set-in')];
  const next = all[all.indexOf(e.target) + 1];
  if (next) next.focus(); else e.target.blur();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state.active) save(); syncWake(); });

const at = (el) => {
  const a = state.active, ex = a?.exercises[+el.dataset.ei];
  return { a, ex, s: ex?.sets[+el.dataset.si], ei: +el.dataset.ei, si: +el.dataset.si, e: ex && exById(ex.exId) };
};

on('toggle-set', (el) => {
  unlockAudio();
  const { a, ex, s, e } = at(el);
  if (!s) return;
  if (s.done) { s.done = false; save(); rerender(); return; }
  const row = el.closest('.set-row');
  row.querySelectorAll('.set-in').forEach((inp) => {
    const f = inp.dataset.f;
    if (f !== 'rpe' && s[f] == null && inp.placeholder) s[f] = fromInput(inp.dataset.k, inp.placeholder);
  });
  const type = COLS[e.type] ? e.type : 'weight';
  if (!setReady(type, s)) {
    toast(type === 'duration' ? 'Enter the time first' : type === 'cardio' ? 'Enter distance or time' : 'Enter your reps first', 'info');
    const empty = [...row.querySelectorAll('.set-in')].find((i) => !i.value && i.dataset.f !== 'rpe' && i.dataset.f !== 'w');
    (empty || row.querySelector('.set-in'))?.focus();
    return;
  }
  if (type === 'weight' && s.w == null) s.w = 0;
  s.done = true;
  buzz(18);
  const before = bestScore(ex.exId, a.id), sc = setScore(type, s);
  const others = ex.sets.filter((x) => x !== s && isWorkSet(x)).map((x) => setScore(type, x));
  if (s.kind !== 'w' && before !== undefined && sc > before + 1e-9 && sc > Math.max(-1, ...others)) {
    toast(`New PR on ${e.name}! 🏆`, 'trophy');
    buzz([30, 60, 30]);
  }
  save();
  rerender();
  if (state.settings.autoRest && !a.editing) startRest(restFor(e));
});

on('copy-prev', (el) => {
  const { a, ex, s } = at(el);
  const last = lastSession(ex.exId, a.id);
  const p = last?.ex.sets.filter((x) => x.done)[+el.dataset.si];
  if (!p || !s) return;
  Object.assign(s, { w: p.w, r: p.r, t: p.t, d: p.d });
  save(); rerender();
});

on('add-set', (el) => {
  const { ex } = at(el);
  const last = ex.sets[ex.sets.length - 1];
  ex.sets.push(last ? { ...blankSet(), w: last.w, r: last.r, t: last.t, d: last.d } : blankSet());
  save(); rerender();
});

on('set-menu', (el) => {
  const { ex, s, si } = at(el);
  const kinds = [['n', 'Normal set', 'layers'], ['w', 'Warm-up set', 'sun'], ['d', 'Drop set', 'down'], ['f', 'Failure set', 'zap']];
  actionSheet(`Set ${si + 1}`, [
    ...kinds.map(([k, label, ic]) => ({ label: `${label}${s.kind === k ? '  ✓' : ''}`, icon: ic, run: () => { s.kind = k; save(); rerender(); } })),
    { label: 'Delete set', icon: 'trash', danger: true, disabled: ex.sets.length < 2, run: () => { ex.sets.splice(si, 1); save(); rerender(); } },
  ]);
});

on('ex-info', (el) => { const { ex } = at(el); openExercise(ex.exId); });

function notesSheet(title, value, onSave) {
  const body = openSheet(`
    <div class="sheet-head"><h2>${esc(title)}</h2></div>
    <textarea class="input" id="nt" rows="5" placeholder="How did it go? Anything to remember next time?">${esc(value || '')}</textarea>
    <div class="btn-row mt"><button class="btn" data-act="close-sheet">Cancel</button><button class="btn primary" id="nt-save">Save</button></div>`);
  setTimeout(() => body.querySelector('#nt')?.focus(), 300);
  body.querySelector('#nt-save').onclick = () => { onSave(body.querySelector('#nt').value.trim()); closeSheet(); };
}

function restPicker(e) {
  actionSheet(`Rest after ${e.name}`, [
    { label: `Default (${fmtClock(state.settings.rest)})${e.rest == null ? '  ✓' : ''}`, icon: 'timer', run: () => { e.rest = null; save(); rerender(); } },
    ...REST_OPTS.map((sec) => ({ label: `${sec ? fmtClock(sec) : 'Off'}${e.rest === sec ? '  ✓' : ''}`, icon: 'clock', run: () => { e.rest = sec; save(); rerender(); } })),
  ]);
}

on('ex-menu', (el) => {
  const { a, ex, ei, e } = at(el);
  const lastW = [...ex.sets].reverse().find((x) => x.w)?.w || lastSession(ex.exId, a.id)?.ex.sets.find((x) => x.w)?.w;
  const move = (to) => { const x = a.exercises; [x[ei], x[to]] = [x[to], x[ei]]; save(); rerender(); };
  actionSheet(e.name, [
    { label: ex.notes ? 'Edit note' : 'Add note', icon: 'note', run: () => notesSheet(`Note · ${e.name}`, ex.notes, (v) => { ex.notes = v; save(); rerender(); }) },
    { label: 'History & records', icon: 'chart', run: () => openExercise(ex.exId) },
    { label: `Rest timer · ${restFor(e) ? fmtClock(restFor(e)) : 'off'}`, icon: 'timer', run: () => restPicker(e) },
    ...(e.type === 'weight' ? [{ label: 'Plate calculator', icon: 'layers', run: () => plateCalc(lastW) }] : []),
    { label: 'Replace exercise', icon: 'swap', run: () => pickExercises((ids) => { a.exercises[ei] = newExEntry(ids[0]); save(); rerender(); }, { multi: false, title: 'Replace with' }) },
    { label: 'Move up', icon: 'up', disabled: ei === 0, run: () => move(ei - 1) },
    { label: 'Move down', icon: 'down', disabled: ei === a.exercises.length - 1, run: () => move(ei + 1) },
    { label: 'Remove exercise', icon: 'trash', danger: true, run: async () => {
      if (ex.sets.some((x) => x.done) && !(await confirmDialog({ title: `Remove ${e.name}?`, message: 'Its completed sets will be lost.', confirm: 'Remove', danger: true }))) return;
      a.exercises.splice(ei, 1); save(); rerender();
    } },
  ]);
});

on('add-exercise', () => pickExercises((ids) => {
  ids.forEach((id) => state.active.exercises.push(newExEntry(id)));
  save(); rerender();
  setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50);
}));
on('rename-active', async () => {
  const v = await promptDialog({ title: 'Rename workout', value: state.active.name, placeholder: 'Workout name' });
  if (v && v.trim()) { state.active.name = v.trim().slice(0, 60); save(); rerender(); }
});
on('workout-notes', () => notesSheet('Workout notes', state.active.notes, (v) => { state.active.notes = v; save(); rerender(); }));

function endActive(tab) {
  state.active = null;
  save(); stopRest(); syncWake();
  go(tab);
}
on('discard', async () => {
  if (state.active.editing) return endActive('history');
  if (await confirmDialog({ title: 'Discard workout?', message: 'Nothing from this session will be saved.', confirm: 'Discard', danger: true })) endActive('home');
});

on('finish', async () => {
  const a = state.active;
  const done = a.exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.done).length, 0);
  const undone = a.exercises.reduce((n, ex) => n + ex.sets.filter((s) => !s.done).length, 0);
  if (!done) {
    if (a.editing) { toast('Tick at least one set to save', 'info'); return; }
    if (await confirmDialog({ title: 'No completed sets', message: 'Tap ✓ next to each set you finish. Discard this workout instead?', confirm: 'Discard', danger: true })) endActive('home');
    return;
  }
  if (undone && !(await confirmDialog({ title: a.editing ? 'Save changes?' : 'Finish workout?', message: `${undone} unticked set${undone > 1 ? 's' : ''} will be dropped.`, confirm: a.editing ? 'Save' : 'Finish' }))) return;
  const editing = a.editing;
  stopRest();
  const res = finishActive();
  syncWake();
  queueWorkout(res.workout.id);
  flush();
  go('history');
  if (editing) toast('Workout updated', 'check');
  else showSummary(res.workout, res.prs);
});

export function showSummary(w, prs) {
  const st = workoutStats(w);
  const feels = ['😫', '😕', '🙂', '😀', '🔥'];
  const body = openSheet(`
    <div class="summary-hero"><div class="big">${prs.length ? '🏆' : '💪'}</div>
      <h2>${prs.length ? `${prs.length} new PR${prs.length > 1 ? 's' : ''}!` : 'Workout complete!'}</h2>
      <p class="muted" style="margin:0">${esc(w.name)} · ${esc(fmtDate(w.start))}</p></div>
    <div class="summary-stats">
      <div class="tile">${icon('clock')}<strong>${fmtDur(st.dur)}</strong><span>Duration</span></div>
      <div class="tile">${icon('weight')}<strong>${fmtBig(kgToDisp(st.vol))}</strong><span>Volume (${wUnit()})</span></div>
      <div class="tile">${icon('layers')}<strong>${st.sets}</strong><span>Sets</span></div>
    </div>
    ${prs.length ? `<div class="group-label">Personal records</div>${prs.map((p) => `<div class="pr-line">${icon('trophy')}<b>${esc(exById(p.exId).name)}</b><span>${esc(setText(p.type, p.set))}</span></div>`).join('')}` : ''}
    <div class="group-label">How did it feel?</div>
    <div class="feel">${feels.map((f, i) => `<button data-feel="${i + 1}">${f}</button>`).join('')}</div>
    <div class="post-photo" id="sum-photo" hidden></div>
    <button class="btn block mt-lg" data-x="photo">${icon('camera')} Add a gym photo</button>
    <div class="btn-row mt"><button class="btn" data-x="img">${icon('share')} Share card</button><button class="btn" data-x="link">${icon('users')} Send link</button></div>
    <button class="btn primary block mt" data-act="close-sheet">Done</button>`);
  confetti();
  buzz([30, 60, 30]);
  body.addEventListener('click', (e) => {
    const f = e.target.closest('[data-feel]');
    if (f) {
      w.feel = +f.dataset.feel; save();
      body.querySelectorAll('[data-feel]').forEach((b) => b.classList.toggle('on', b === f));
      return;
    }
    const x = e.target.closest('[data-x]');
    if (x?.dataset.x === 'photo') {
      addWorkoutPhoto(w).then(async (ok) => {
        const src = ok && (await getPhoto(w.id)), el = body.querySelector('#sum-photo');
        if (src && el) { el.innerHTML = `<img src="${src}" alt="">`; el.hidden = false; x.innerHTML = `${icon('camera')} Change photo`; rerender(); }
      });
    }
    if (x?.dataset.x === 'img') shareWorkoutImage(w, prs);
    if (x?.dataset.x === 'link') shareWorkoutLink(w);
  });
}

// ---------- Rest timer ----------
let restTimer = null;
const ARC = 100.53;
export function startRest(sec) {
  if (!sec || !state.active) return;
  state.active.restEnd = Date.now() + sec * 1000;
  state.active.restTotal = sec;
  save();
  drawRest();
}
export function resumeRest() { if (state.active?.restEnd > Date.now()) drawRest(); }
function drawRest() {
  let el = document.getElementById('rest');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rest'; el.className = 'rest';
    el.innerHTML = `<div class="rest-ring"><svg viewBox="0 0 38 38"><circle cx="19" cy="19" r="16" fill="none" stroke="rgba(127,127,127,.3)" stroke-width="4"/>
      <circle id="rest-arc" cx="19" cy="19" r="16" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${ARC}" stroke-dashoffset="0"/></svg>${icon('timer')}</div>
      <div class="rest-time" id="rest-time">0:00</div>
      <button data-act="rest-adj" data-d="-15">−15</button><button data-act="rest-adj" data-d="15">+15</button><button class="skip" data-act="rest-skip">Skip</button>`;
    document.body.appendChild(el);
  }
  tickRest();
  clearInterval(restTimer);
  restTimer = setInterval(tickRest, 250);
}
function tickRest() {
  const a = state.active;
  if (!a || !a.restEnd) { stopRest(); return; }
  const left = (a.restEnd - Date.now()) / 1000;
  if (left <= 0) {
    stopRest();
    chime(); buzz([200, 100, 200]);
    toast('Rest over. Next set!', 'timer');
    return;
  }
  const t = document.getElementById('rest-time'), arc = document.getElementById('rest-arc');
  if (t) t.textContent = fmtClock(Math.ceil(left));
  if (arc) arc.setAttribute('stroke-dashoffset', String(ARC * (1 - left / (a.restTotal || left))));
}
export function stopRest() {
  clearInterval(restTimer);
  restTimer = null;
  document.getElementById('rest')?.remove();
  if (state.active && state.active.restEnd) { state.active.restEnd = 0; save(); }
}
on('rest-adj', (el) => {
  const a = state.active;
  if (!a?.restEnd) return;
  a.restEnd = Math.max(Date.now() + 1000, a.restEnd + +el.dataset.d * 1000);
  a.restTotal = Math.max(a.restTotal + +el.dataset.d, 1);
  save(); tickRest();
});
on('rest-skip', () => stopRest());

// ---------- Keep screen awake ----------
let wakeLock = null;
export async function syncWake() {
  const want = !!(state.active && !state.active.editing && state.settings.wakeLock && !document.hidden);
  if (want && !wakeLock && 'wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) { wakeLock = null; }
  } else if (!want && wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}
