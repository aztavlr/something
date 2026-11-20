// Progress: overview charts, per-exercise progress list, body weight tracking.
import { state, save, exById, workoutStats, exerciseSessions, e1rm, kgToDisp, dispToKg, wUnit, isWorkSet, weekOf } from '../store.js';
import { esc, uid, fmtNum, fmtBig, fmtDur, fmtDate, fmtRel, addDays, DAY } from '../util.js';
import { appbar, icon, on, rerender, toast, promptDialog, actionSheet, empty } from '../ui.js';
import { lineChart, barChart, sparkline } from '../charts.js';
import { muscleSets, muscleBars } from './home.js';
import { openExercise } from './exercise.js';

let seg = 'overview', q = '';

function overview() {
  const ws = state.workouts;
  if (!ws.length) return `<div class="card">${empty('chart', 'Nothing to chart yet', 'Log a few workouts and your progress will show up here.', '<button class="btn primary" data-act="go" data-tab="train">Start training</button>')}</div>`;
  const tot = ws.reduce((a, w) => { const s = workoutStats(w); a.vol += s.vol; a.dur += s.dur; a.sets += s.sets; return a; }, { vol: 0, dur: 0, sets: 0 });
  const recent = ws.filter((w) => w.start > Date.now() - 30 * DAY);
  return `
    <div class="stat-grid">
      <div class="stat-card"><span>${icon('dumbbell')}Workouts</span><strong>${ws.length}</strong></div>
      <div class="stat-card"><span>${icon('clock')}Time trained</span><strong>${fmtDur(tot.dur)}</strong></div>
      <div class="stat-card"><span>${icon('weight')}Total lifted</span><strong>${fmtBig(kgToDisp(tot.vol))} <small>${wUnit()}</small></strong></div>
      <div class="stat-card"><span>${icon('timer')}Avg. workout</span><strong>${fmtDur(tot.dur / ws.length)}</strong></div>
    </div>
    <div class="card mt"><div class="card-title"><h3>Workouts per week</h3><span class="muted" style="font-size:13px">Goal ${state.settings.weeklyGoal}</span></div><canvas class="chart sm" id="ch-weeks"></canvas></div>
    <div class="card mt"><div class="card-title"><h3>Volume per week</h3><span class="muted" style="font-size:13px">${wUnit()}</span></div><canvas class="chart sm" id="ch-vol"></canvas></div>
    <div class="card mt"><div class="card-title"><h3>Muscle split</h3><span class="muted" style="font-size:13px">Sets · last 30 days</span></div>
      ${recent.length ? muscleBars(muscleSets(recent)) : '<p class="muted" style="margin:0">No workouts in the last 30 days.</p>'}</div>`;
}

function weekBuckets(n) {
  const cur = weekOf(Date.now());
  return Array.from({ length: n }, (_, i) => {
    const ws = addDays(cur, -(n - 1 - i) * 7), we = addDays(ws, 7);
    const list = state.workouts.filter((w) => w.start >= ws && w.start < we);
    return { ws, list, hi: i === n - 1 };
  });
}

function exercisesList() {
  const used = new Map();
  for (const w of state.workouts) for (const ex of w.exercises) used.set(ex.exId, (used.get(ex.exId) || 0) + 1);
  const ql = q.trim().toLowerCase();
  const items = [...used.keys()].map(exById).filter((e) => !ql || e.name.toLowerCase().includes(ql)).sort((a, b) => used.get(b.id) - used.get(a.id));
  if (!used.size) return `<div class="card">${empty('trophy', 'No exercises logged', 'Your exercises and their personal bests will appear here.')}</div>`;
  return `
    <div class="search">${icon('search')}<input class="input" id="pg-q" type="search" placeholder="Search your exercises" value="${esc(q)}" autocomplete="off"></div>
    <div class="list mt">${items.map((e) => {
      const ses = exerciseSessions(e.id);
      const vals = ses.map(({ ex }) => {
        const sets = ex.sets.filter(isWorkSet);
        if (e.type === 'weight') return Math.max(0, ...sets.map((s) => e1rm(s.w, s.r)));
        if (e.type === 'duration') return Math.max(0, ...sets.map((s) => s.t || 0));
        if (e.type === 'cardio') return sets.reduce((a, s) => a + (s.d || 0), 0);
        return Math.max(0, ...sets.map((s) => s.r || 0));
      });
      const best = Math.max(0, ...vals);
      const bestTxt = e.type === 'weight' ? `${fmtNum(kgToDisp(best), 1)} ${wUnit()} 1RM` : e.type === 'duration' ? `${Math.round(best)}s best` : e.type === 'cardio' ? '' : `${best} reps best`;
      return `<button class="row" data-act="open-exercise" data-id="${e.id}">
        <span class="row-main"><div class="row-title">${esc(e.name)}</div><div class="row-sub">${ses.length} session${ses.length > 1 ? 's' : ''}${bestTxt ? ` · ${bestTxt}` : ''} · ${esc(fmtRel(ses[ses.length - 1].w.start))}</div></span>
        ${sparkline(vals.slice(-12))}${icon('right', 'chev')}</button>`;
    }).join('') || '<p class="muted center">No matches.</p>'}</div>`;
}

function bodyTab() {
  const entries = state.body.slice().sort((a, b) => a.t - b.t);
  const last = entries[entries.length - 1];
  const monthAgo = entries.filter((e) => e.t <= Date.now() - 30 * DAY).pop() || entries[0];
  const delta = last && monthAgo && last !== monthAgo ? kgToDisp(last.kg) - kgToDisp(monthAgo.kg) : null;
  return `
    <div class="card">
      <div class="row-flex between">
        <div><div class="muted" style="font-size:13px;font-weight:700">BODY WEIGHT</div>
          <div style="font-size:34px;font-weight:850;letter-spacing:-.03em">${last ? `${fmtNum(kgToDisp(last.kg), 1)} <small class="muted" style="font-size:16px">${wUnit()}</small>` : '—'}</div>
          ${delta != null ? `<div class="${delta <= 0 ? 'delta-down' : 'delta-up'}" style="font-size:14px;color:var(--muted)">${delta > 0 ? '+' : ''}${fmtNum(delta, 1)} ${wUnit()} since ${esc(fmtDate(monthAgo.t, { month: 'short', day: 'numeric' }))}</div>` : ''}</div>
        <button class="btn primary sm" data-act="log-weight">${icon('plus')} Log</button>
      </div>
      ${entries.length > 1 ? '<canvas class="chart sm mt" id="ch-body"></canvas>' : ''}
    </div>
    ${entries.length ? `<div class="group-label">Entries</div><div class="list">${entries.slice().reverse().slice(0, 60).map((e) => `
      <button class="row" data-act="body-menu" data-id="${e.id}"><span class="row-main"><div class="row-title">${fmtNum(kgToDisp(e.kg), 1)} ${wUnit()}</div><div class="row-sub">${esc(fmtDate(e.t, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }))}</div></span>${icon('more', 'chev')}</button>`).join('')}</div>`
    : '<p class="muted center mt">Log your body weight regularly to see your trend.</p>'}`;
}

export function renderProgress(root) {
  root.innerHTML = `
    ${appbar('Progress')}
    <div class="seg" style="margin-bottom:14px">${[['overview', 'Overview'], ['exercises', 'Exercises'], ['body', 'Body']].map(([k, l]) => `<button class="${k === seg ? 'on' : ''}" data-act="pseg" data-k="${k}">${l}</button>`).join('')}</div>
    ${seg === 'overview' ? overview() : seg === 'exercises' ? exercisesList() : bodyTab()}`;
  if (seg === 'overview' && state.workouts.length) {
    const b = weekBuckets(12);
    const lbl = (x, i) => (i % 3 === 2 || x.hi ? fmtDate(x.ws, { month: 'numeric', day: 'numeric' }) : '');
    barChart(root.querySelector('#ch-weeks'), b.map((x, i) => ({ label: lbl(x, i), value: x.list.length, hi: x.hi })));
    barChart(root.querySelector('#ch-vol'), b.map((x, i) => ({ label: lbl(x, i), value: kgToDisp(x.list.reduce((a, w) => a + workoutStats(w).vol, 0)), hi: x.hi })), { fmt: (v) => fmtBig(v) });
  }
  if (seg === 'body') {
    const cv = root.querySelector('#ch-body');
    if (cv) lineChart(cv, state.body.slice().sort((a, b) => a.t - b.t).map((e) => ({ t: e.t, y: kgToDisp(e.kg) })), { fmt: (v) => fmtNum(v, 1) });
  }
  const qi = root.querySelector('#pg-q');
  if (qi) qi.addEventListener('input', (e) => {
    q = e.target.value;
    const pos = e.target.selectionStart;
    rerender();
    const n = document.querySelector('#pg-q');
    n?.focus(); n?.setSelectionRange(pos, pos);
  });
}

on('pseg', (el) => { seg = el.dataset.k; rerender(); });
on('open-exercise', (el) => openExercise(el.dataset.id));
on('log-weight', async () => {
  const last = state.body.slice().sort((a, b) => a.t - b.t).pop();
  const v = await promptDialog({ title: 'Log body weight', message: `Today, in ${wUnit()}`, value: last ? fmtNum(kgToDisp(last.kg), 1) : '', inputmode: 'decimal', confirm: 'Save' });
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) { if (v != null) toast('Enter a valid number', 'info'); return; }
  state.body.push({ id: uid(), t: Date.now(), kg: dispToKg(n) });
  save(); rerender(); toast('Weight logged', 'check');
});
on('body-menu', (el) => {
  const e = state.body.find((x) => x.id === el.dataset.id);
  if (!e) return;
  actionSheet(`${fmtNum(kgToDisp(e.kg), 1)} ${wUnit()} · ${fmtDate(e.t)}`, [
    { label: 'Delete entry', icon: 'trash', danger: true, run: () => { state.body = state.body.filter((x) => x.id !== e.id); save(); rerender(); } },
  ]);
});
