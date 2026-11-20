// Exercise picker, library, detail (charts + records) and editor.
import { state, save, exById, exerciseSessions, e1rm, setText, kgToDisp, kmToDisp, wUnit, dUnit, isWorkSet } from '../store.js';
import { MUSCLES, EQUIPMENT, TYPES } from '../data.js';
import { esc, uid, fmtDate, fmtNum, fmtClock, fmtRel } from '../util.js';
import { openSheet, closeSheet, icon, toast, confirmDialog, rerender } from '../ui.js';
import { lineChart } from '../charts.js';

export const REST_OPTS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const visible = () => state.exercises.filter((e) => !e.hidden);

function recentIds(n) {
  const out = [];
  for (const w of state.workouts.slice().sort((a, b) => b.start - a.start)) {
    for (const ex of w.exercises) {
      if (!out.includes(ex.exId) && state.exercises.some((e) => e.id === ex.exId && !e.hidden)) out.push(ex.exId);
      if (out.length >= n) return out;
    }
  }
  return out;
}

const exRow = (e, on = false, attr = 'data-pick') => `
  <button class="row" ${attr}="${e.id}">
    <span class="row-ic" ${on ? 'style="background:var(--accent);color:#fff"' : ''}>${on ? icon('check') : esc(e.name[0])}</span>
    <span class="row-main"><div class="row-title">${esc(e.name)}</div><div class="row-sub">${esc(e.muscle)} · ${esc(e.equipment || 'Other')}</div></span>
    ${attr === 'data-open' ? icon('right', 'chev') : ''}
  </button>`;

/** Opens a searchable picker. onDone(ids[]) */
export function pickExercises(onDone, { multi = true, title = 'Add exercises' } = {}) {
  let q = '', muscle = 'All';
  const sel = [], recent = recentIds(6);
  const body = openSheet(`
    <div class="sheet-head"><h2>${esc(title)}</h2>${multi ? '<button class="btn primary sm" id="pk-done" disabled>Add</button>' : ''}</div>
    <div class="search">${icon('search')}<input class="input" id="pk-q" type="search" placeholder="Search ${visible().length} exercises" autocomplete="off"></div>
    <div class="chips mt" id="pk-m"></div>
    <div id="pk-list" class="mt"></div>`, { cls: 'tall' });
  const draw = () => {
    body.querySelector('#pk-m').innerHTML = ['All', ...MUSCLES].map((m) => `<button class="chip ${m === muscle ? 'on' : ''}" data-m="${m}">${m}</button>`).join('');
    const ql = q.trim().toLowerCase();
    const list = visible()
      .filter((e) => (muscle === 'All' || e.muscle === muscle) && (!ql || `${e.name} ${e.muscle} ${e.equipment}`.toLowerCase().includes(ql)))
      .sort((a, b) => a.name.localeCompare(b.name));
    let html = '';
    if (!ql && muscle === 'All' && recent.length) {
      html += `<div class="group-label" style="margin-top:6px">Recent</div><div class="list">${recent.map((id) => exRow(exById(id), sel.includes(id))).join('')}</div><div class="group-label">All exercises</div>`;
    }
    if (list.length) html += `<div class="list">${list.map((e) => exRow(e, sel.includes(e.id))).join('')}</div>`;
    if (ql && !state.exercises.some((e) => e.name.toLowerCase() === ql)) html += `<button class="btn soft block mt" id="pk-create">${icon('plus')} Create “${esc(q.trim())}”</button>`;
    if (!list.length && !ql) html += '<p class="muted center">Nothing here yet.</p>';
    body.querySelector('#pk-list').innerHTML = html;
    const done = body.querySelector('#pk-done');
    if (done) { done.disabled = !sel.length; done.textContent = sel.length ? `Add (${sel.length})` : 'Add'; }
  };
  draw();
  body.querySelector('#pk-q').addEventListener('input', (e) => { q = e.target.value; draw(); });
  body.addEventListener('click', (e) => {
    const m = e.target.closest('[data-m]');
    if (m) { muscle = m.dataset.m; draw(); return; }
    const p = e.target.closest('[data-pick]');
    if (p) {
      const id = p.dataset.pick;
      if (!multi) { closeSheet(); onDone([id]); return; }
      const i = sel.indexOf(id);
      if (i >= 0) sel.splice(i, 1); else sel.push(id);
      draw();
      return;
    }
    if (e.target.closest('#pk-create')) {
      editExercise(null, (id) => {
        if (!multi) { closeSheet(); onDone([id]); return; }
        sel.push(id); q = ''; body.querySelector('#pk-q').value = ''; draw();
      }, q.trim());
      return;
    }
    if (e.target.closest('#pk-done')) { closeSheet(); onDone(sel.slice()); }
  });
}

export function editExercise(id, onSaved, presetName = '') {
  const ex = id ? state.exercises.find((e) => e.id === id) : null;
  const d = ex ? { ...ex } : { name: presetName, muscle: 'Other', type: 'weight', equipment: 'Other', rest: null, notes: '' };
  const body = openSheet(`
    <div class="sheet-head"><h2>${ex ? 'Edit exercise' : 'New exercise'}</h2></div>
    <div class="col">
      <label class="field"><span>Name</span><input class="input" id="ee-name" value="${esc(d.name)}" maxlength="60" placeholder="e.g. Incline Cable Fly"></label>
      <div class="row-flex">
        <label class="field grow"><span>Muscle group</span><select class="input" id="ee-muscle">${MUSCLES.map((m) => `<option ${m === d.muscle ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <label class="field grow"><span>Equipment</span><select class="input" id="ee-eq">${EQUIPMENT.map((m) => `<option ${m === d.equipment ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      </div>
      <label class="field"><span>How you track it</span><select class="input" id="ee-type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${k === d.type ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="field"><span>Rest timer for this exercise</span><select class="input" id="ee-rest">
        <option value="">Use default (${fmtClock(state.settings.rest)})</option>
        ${REST_OPTS.map((s) => `<option value="${s}" ${d.rest === s ? 'selected' : ''}>${s ? fmtClock(s) : 'Off'}</option>`).join('')}</select></label>
      <label class="field"><span>Notes</span><textarea class="input" id="ee-notes" placeholder="Seat height, grip, form cues…">${esc(d.notes || '')}</textarea></label>
    </div>
    <div class="btn-row mt-lg">
      ${ex ? `<button class="btn danger" id="ee-del" style="flex:0 0 52px;padding:0">${icon('trash')}</button>` : ''}
      <button class="btn" data-act="close-sheet">Cancel</button>
      <button class="btn primary" id="ee-save">Save</button>
    </div>`);
  if (!ex) setTimeout(() => body.querySelector('#ee-name')?.focus(), 300);
  body.querySelector('#ee-save').onclick = async () => {
    const name = body.querySelector('#ee-name').value.trim();
    if (!name) { toast('Give it a name', 'info'); return; }
    if (state.exercises.some((e) => e.id !== id && !e.hidden && e.name.toLowerCase() === name.toLowerCase())) { toast('An exercise with that name exists', 'info'); return; }
    const type = body.querySelector('#ee-type').value;
    if (ex && ex.type !== type && exerciseSessions(ex.id).length &&
      !(await confirmDialog({ title: 'Change tracking type?', message: 'Past sessions were logged the old way and may look odd in charts.', confirm: 'Change it' }))) return;
    const rest = body.querySelector('#ee-rest').value;
    const vals = {
      name, type, muscle: body.querySelector('#ee-muscle').value, equipment: body.querySelector('#ee-eq').value,
      rest: rest === '' ? null : +rest, notes: body.querySelector('#ee-notes').value.trim(),
    };
    let newId = id;
    if (ex) Object.assign(ex, vals);
    else { newId = uid(); state.exercises.push({ id: newId, custom: true, ...vals }); }
    save();
    closeSheet();
    toast(ex ? 'Exercise updated' : 'Exercise created', 'check');
    onSaved?.(newId);
    rerender();
  };
  body.querySelector('#ee-del')?.addEventListener('click', async () => {
    const used = exerciseSessions(id).length;
    const ok = await confirmDialog(used
      ? { title: `Hide “${ex.name}”?`, message: `It's in ${used} past workout${used > 1 ? 's' : ''}, which will keep it. It will be removed from the library and your routines.`, confirm: 'Hide', danger: true }
      : { title: `Delete “${ex.name}”?`, message: 'It will also be removed from your routines.', confirm: 'Delete', danger: true });
    if (!ok) return;
    if (used) ex.hidden = true; else state.exercises = state.exercises.filter((e) => e.id !== id);
    state.routines.forEach((r) => { r.items = r.items.filter((it) => it.exId !== id); });
    save();
    closeSheet();
    closeSheet();
    rerender();
  });
}

export function openLibrary() {
  let q = '', muscle = 'All';
  const body = openSheet(`
    <div class="sheet-head"><h2>Exercises</h2><button class="btn soft sm" id="lib-new">${icon('plus')} New</button></div>
    <div class="search">${icon('search')}<input class="input" id="lib-q" type="search" placeholder="Search" autocomplete="off"></div>
    <div class="chips mt" id="lib-m"></div><div id="lib-list" class="mt"></div>`, { cls: 'tall' });
  const draw = () => {
    body.querySelector('#lib-m').innerHTML = ['All', ...MUSCLES].map((m) => `<button class="chip ${m === muscle ? 'on' : ''}" data-m="${m}">${m}</button>`).join('');
    const ql = q.trim().toLowerCase();
    const list = visible().filter((e) => (muscle === 'All' || e.muscle === muscle) && (!ql || e.name.toLowerCase().includes(ql))).sort((a, b) => a.name.localeCompare(b.name));
    body.querySelector('#lib-list').innerHTML = list.length ? `<div class="list">${list.map((e) => exRow(e, false, 'data-open')).join('')}</div>` : '<p class="muted center">No matches.</p>';
  };
  draw();
  body.querySelector('#lib-q').addEventListener('input', (e) => { q = e.target.value; draw(); });
  body.addEventListener('click', (e) => {
    const m = e.target.closest('[data-m]');
    if (m) { muscle = m.dataset.m; draw(); return; }
    const o = e.target.closest('[data-open]');
    if (o) { openExercise(o.dataset.open); return; }
    if (e.target.closest('#lib-new')) editExercise(null, () => draw());
  });
}

// ---------- Detail ----------
const METRICS = {
  weight: [['e1rm', 'Est. 1RM'], ['top', 'Top weight'], ['vol', 'Volume'], ['reps', 'Total reps']],
  bodyweight: [['best', 'Best set'], ['reps', 'Total reps'], ['add', 'Added weight']],
  duration: [['long', 'Longest'], ['total', 'Total time']],
  cardio: [['dist', 'Distance'], ['time', 'Time'], ['pace', 'Pace']],
};
const sum = (a, f) => a.reduce((n, s) => n + (f(s) || 0), 0);
const max = (a, f) => Math.max(0, ...a.map((s) => f(s) || 0));
function value(m, ex) {
  const work = ex.sets.filter(isWorkSet);
  const sets = work.length ? work : ex.sets.filter((s) => s.done);
  switch (m) {
    case 'e1rm': return max(sets, (s) => e1rm(s.w, s.r));
    case 'top': case 'add': return max(sets, (s) => s.w);
    case 'vol': return sum(sets, (s) => (s.w || 0) * (s.r || 0));
    case 'reps': return sum(sets, (s) => s.r);
    case 'best': return max(sets, (s) => s.r);
    case 'long': return max(sets, (s) => s.t);
    case 'total': case 'time': return sum(sets, (s) => s.t);
    case 'dist': return sum(sets, (s) => s.d);
    case 'pace': { const d = sum(sets, (s) => s.d), t = sum(sets, (s) => s.t); return d && t ? t / kmToDisp(d) : 0; }
    default: return 0;
  }
}
function fmtMetric(m) {
  if (['e1rm', 'top', 'add'].includes(m)) return (v) => `${fmtNum(kgToDisp(v), 1)}`;
  if (m === 'vol') return (v) => `${fmtNum(kgToDisp(v), 0)}`;
  if (m === 'dist') return (v) => fmtNum(kmToDisp(v), 2);
  if (['long', 'total', 'time', 'pace'].includes(m)) return (v) => fmtClock(v);
  return (v) => String(Math.round(v));
}
const unitOf = (m) => (['e1rm', 'top', 'add', 'vol'].includes(m) ? wUnit() : m === 'dist' ? dUnit() : m === 'pace' ? `/${dUnit()}` : m === 'reps' || m === 'best' ? 'reps' : '');

const metricSel = {};
export function openExercise(exId) {
  const body = openSheet('', { cls: 'tall' });
  const draw = () => {
    const e = exById(exId), sessions = exerciseSessions(exId), type = e.type in METRICS ? e.type : 'weight';
    const m = metricSel[exId] || METRICS[type][0][0];
    const pts = sessions.map(({ w, ex }) => ({ t: w.start, y: value(m, ex) })).filter((p) => p.y > 0);
    const all = sessions.flatMap(({ w, ex }) => ex.sets.filter(isWorkSet).map((s) => ({ s, t: w.start })));
    const rec = (label, v, sub = '') => `<div class="record"><span>${label}</span><strong>${v}</strong>${sub ? `<span>${sub}</span>` : ''}</div>`;
    let records = '';
    if (all.length) {
      const by = (f) => all.reduce((b, x) => (f(x.s) > f(b.s) ? x : b), all[0]);
      if (type === 'weight') {
        const h = by((s) => s.w || 0), o = by((s) => e1rm(s.w, s.r)), v = by((s) => (s.w || 0) * (s.r || 0));
        const sv = Math.max(...sessions.map(({ ex }) => value('vol', ex)));
        records = rec('Heaviest', `${fmtNum(kgToDisp(h.s.w || 0), 1)} ${wUnit()}`, fmtDate(h.t, { month: 'short', day: 'numeric' }))
          + rec('Best est. 1RM', `${fmtNum(kgToDisp(e1rm(o.s.w, o.s.r)), 1)} ${wUnit()}`, setText(type, o.s))
          + rec('Best set', setText(type, v.s), fmtDate(v.t, { month: 'short', day: 'numeric' }))
          + rec('Best session volume', `${fmtNum(kgToDisp(sv), 0)} ${wUnit()}`);
      } else if (type === 'bodyweight') {
        const r = by((s) => s.r || 0);
        records = rec('Most reps (set)', `${r.s.r || 0}`, fmtDate(r.t, { month: 'short', day: 'numeric' }))
          + rec('Most reps (session)', `${Math.max(...sessions.map(({ ex }) => value('reps', ex)))}`)
          + rec('Max added weight', `${fmtNum(kgToDisp(max(all.map((x) => x.s), (s) => s.w)), 1)} ${wUnit()}`)
          + rec('Total reps', `${sum(all.map((x) => x.s), (s) => s.r)}`);
      } else if (type === 'duration') {
        const l = by((s) => s.t || 0);
        records = rec('Longest', fmtClock(l.s.t || 0), fmtDate(l.t, { month: 'short', day: 'numeric' })) + rec('Total time', fmtClock(sum(all.map((x) => x.s), (s) => s.t)));
      } else {
        records = rec('Longest distance', `${fmtNum(kmToDisp(Math.max(...sessions.map(({ ex }) => value('dist', ex)))), 2)} ${dUnit()}`)
          + rec('Longest time', fmtClock(Math.max(...sessions.map(({ ex }) => value('time', ex)))))
          + rec('Total distance', `${fmtNum(kmToDisp(sum(all.map((x) => x.s), (s) => s.d)), 1)} ${dUnit()}`)
          + rec('Sessions', String(sessions.length));
      }
    }
    let repMax = '';
    if (type === 'weight' && all.length) {
      const best = {};
      for (const { s, t } of all) for (const n of [1, 2, 3, 5, 8, 10, 12, 15]) if ((s.r || 0) >= n && (!best[n] || (s.w || 0) > best[n].w)) best[n] = { w: s.w || 0, t };
      const rows = Object.entries(best).filter(([, b]) => b.w > 0);
      if (rows.length) repMax = `<div class="card mt"><div class="card-title"><h3>Rep records</h3><span class="muted" style="font-size:13px">Best weight for N+ reps</span></div>
        <table class="rm-table">${rows.map(([n, b]) => `<tr><td>${n} rep${n > 1 ? 's' : ''}</td><td class="muted">${fmtDate(b.t, { month: 'short', day: 'numeric', year: '2-digit' })}</td><td>${fmtNum(kgToDisp(b.w), 1)} ${wUnit()}</td></tr>`).join('')}</table></div>`;
    }
    const hist = sessions.slice().reverse().slice(0, 30).map(({ w, ex }) => `
      <div class="row" style="align-items:flex-start"><div class="row-main">
        <div class="row-title">${esc(fmtDate(w.start))}</div>
        <div class="row-sub" style="white-space:normal">${ex.sets.filter((s) => s.done).map((s) => esc(setText(type, s))).join(' · ')}</div>
      </div></div>`).join('');
    body.innerHTML = `
      <div class="sheet-head"><div class="grow"><h2>${esc(e.name)}</h2></div>
        ${state.exercises.some((x) => x.id === exId) ? `<button class="icon-btn" id="ex-edit" aria-label="Edit">${icon('edit')}</button>` : ''}</div>
      <div class="row-flex" style="flex-wrap:wrap;gap:6px;margin:-6px 0 14px">
        <span class="tag accent">${esc(e.muscle)}</span><span class="tag">${esc(e.equipment || 'Other')}</span><span class="tag">${esc(TYPES[type])}</span>
        ${sessions.length ? `<span class="tag">${sessions.length} session${sessions.length > 1 ? 's' : ''} · last ${esc(fmtRel(sessions[sessions.length - 1].w.start).toLowerCase())}</span>` : ''}
      </div>
      ${e.notes ? `<div class="exb-note" style="margin:0 0 12px">${esc(e.notes)}</div>` : ''}
      ${!sessions.length ? '<div class="empty"><div class="empty-ic">' + icon('chart') + '</div><h3>No history yet</h3><p class="muted">Log this exercise and your progress shows up here.</p></div>' : `
        <div class="chips">${METRICS[type].map(([k, l]) => `<button class="chip ${k === m ? 'on' : ''}" data-metric="${k}">${l}</button>`).join('')}</div>
        <div class="card mt"><div class="muted" style="font-size:13px;font-weight:700">${METRICS[type].find((x) => x[0] === m)[1]}${unitOf(m) ? ` (${unitOf(m)})` : ''}</div>
          ${pts.length ? '<canvas class="chart" id="ex-chart"></canvas>' : '<p class="muted">No data for this metric yet.</p>'}</div>
        <div class="records mt">${records}</div>
        ${repMax}
        <div class="group-label">History</div><div class="list">${hist}</div>`}`;
    if (pts.length) lineChart(body.querySelector('#ex-chart'), pts, { fmt: fmtMetric(m) });
    body.querySelectorAll('[data-metric]').forEach((b) => { b.onclick = () => { metricSel[exId] = b.dataset.metric; draw(); }; });
    body.querySelector('#ex-edit')?.addEventListener('click', () => editExercise(exId, () => draw()));
  };
  draw();
}
