/* IronLog — offline-first gym tracker. All data lives on the device (localStorage). */
(() => {
  'use strict';

  const STORE_KEY = 'ironlog:v1';
  const $ = (s, el = document) => el.querySelector(s);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const DEFAULT_EXERCISES = [
    ['Bench Press', 'Chest'], ['Incline Dumbbell Press', 'Chest'], ['Chest Fly', 'Chest'], ['Push Up', 'Chest'],
    ['Squat', 'Legs'], ['Front Squat', 'Legs'], ['Leg Press', 'Legs'], ['Romanian Deadlift', 'Legs'],
    ['Lunge', 'Legs'], ['Leg Curl', 'Legs'], ['Leg Extension', 'Legs'], ['Calf Raise', 'Legs'],
    ['Deadlift', 'Back'], ['Pull Up', 'Back'], ['Barbell Row', 'Back'], ['Lat Pulldown', 'Back'],
    ['Seated Cable Row', 'Back'], ['Overhead Press', 'Shoulders'], ['Lateral Raise', 'Shoulders'],
    ['Face Pull', 'Shoulders'], ['Barbell Curl', 'Arms'], ['Hammer Curl', 'Arms'],
    ['Tricep Pushdown', 'Arms'], ['Skull Crusher', 'Arms'], ['Dip', 'Arms'],
    ['Plank', 'Core'], ['Hanging Leg Raise', 'Core'], ['Cable Crunch', 'Core'],
  ].map(([name, muscle]) => ({ id: 'd_' + name.toLowerCase().replace(/\W+/g, '_'), name, muscle }));

  const DEFAULT_ROUTINES = [
    { id: 'r_push', name: 'Push Day', exercises: ['d_bench_press', 'd_overhead_press', 'd_incline_dumbbell_press', 'd_lateral_raise', 'd_tricep_pushdown'] },
    { id: 'r_pull', name: 'Pull Day', exercises: ['d_deadlift', 'd_pull_up', 'd_barbell_row', 'd_face_pull', 'd_barbell_curl'] },
    { id: 'r_legs', name: 'Leg Day', exercises: ['d_squat', 'd_romanian_deadlift', 'd_leg_press', 'd_leg_curl', 'd_calf_raise'] },
  ];

  const MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other'];

  // ---------- State ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        return {
          settings: { unit: 'kg', rest: 90, ...(d.settings || {}) },
          exercises: d.exercises || DEFAULT_EXERCISES.slice(),
          routines: d.routines || DEFAULT_ROUTINES.slice(),
          workouts: d.workouts || [],
          active: d.active || null,
        };
      }
    } catch (e) { console.warn('load failed', e); }
    return { settings: { unit: 'kg', rest: 90 }, exercises: DEFAULT_EXERCISES.slice(), routines: DEFAULT_ROUTINES.slice(), workouts: [], active: null };
  }
  let state = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast('Could not save — storage full?'); }
  }

  const exById = (id) => state.exercises.find((e) => e.id === id) || { id, name: 'Deleted exercise', muscle: 'Other' };
  const unit = () => state.settings.unit;
  const e1rm = (w, r) => (r <= 0 || w <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30)); // Epley
  const fmtNum = (n) => (Math.round(n * 10) / 10).toString();
  const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const fmtDur = (ms) => {
    const m = Math.floor(ms / 60000);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
  };
  const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // Last completed sets for an exercise (for "previous" column)
  function lastSetsFor(exId) {
    for (let i = state.workouts.length - 1; i >= 0; i--) {
      const ex = state.workouts[i].exercises.find((e) => e.exId === exId);
      if (ex) {
        const done = ex.sets.filter((s) => s.done);
        if (done.length) return done;
      }
    }
    return [];
  }

  function bestE1rmBefore(exId, beforeTime) {
    let best = 0;
    for (const w of state.workouts) {
      if (w.start >= beforeTime) continue;
      for (const ex of w.exercises) if (ex.exId === exId) for (const s of ex.sets) if (s.done) best = Math.max(best, e1rm(+s.w, +s.r));
    }
    return best;
  }

  function workoutVolume(w) {
    let v = 0;
    for (const ex of w.exercises) for (const s of ex.sets) if (s.done) v += (+s.w || 0) * (+s.r || 0);
    return v;
  }

  // ---------- UI helpers ----------
  let currentTab = 'workout';
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
  }
  const modal = $('#modal');
  function openModal(html) { $('#modal-body').innerHTML = html; modal.showModal(); }
  function closeModal() { modal.close(); }
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  function setTop(title, actionHtml = '') {
    $('#title').textContent = title;
    $('#topbar-action').innerHTML = actionHtml;
  }

  function render() {
    document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === currentTab));
    const v = $('#view');
    ({ workout: renderWorkout, history: renderHistory, progress: renderProgress, exercises: renderExercises, settings: renderSettings }[currentTab])(v);
  }

  // ---------- Workout tab ----------
  function renderWorkout(v) {
    if (state.active) return renderActive(v);
    setTop('Workout');
    const now = Date.now();
    const weekAgo = now - 7 * 864e5;
    const thisWeek = state.workouts.filter((w) => w.start > weekAgo);
    v.innerHTML = `
      <div class="stats">
        <div class="stat"><strong>${thisWeek.length}</strong><span>This week</span></div>
        <div class="stat"><strong>${state.workouts.length}</strong><span>Total</span></div>
        <div class="stat"><strong>${streak()}</strong><span>Week streak</span></div>
      </div>
      <button class="btn primary block" data-action="start-empty">＋ Start empty workout</button>
      <div class="section-title row between"><span>Routines</span><button class="btn ghost small" data-action="new-routine">＋ New</button></div>
      ${state.routines.map((r) => `
        <div class="card">
          <div class="row between">
            <h3>${esc(r.name)}</h3>
            <button class="btn ghost small" data-action="edit-routine" data-id="${r.id}">Edit</button>
          </div>
          <div class="muted" style="margin-bottom:10px">${r.exercises.map((id) => esc(exById(id).name)).join(' · ') || 'No exercises'}</div>
          <button class="btn block" data-action="start-routine" data-id="${r.id}">Start</button>
        </div>`).join('') || '<p class="muted">No routines yet.</p>'}
    `;
  }

  function streak() {
    // consecutive weeks (ending this week or last) with at least one workout
    if (!state.workouts.length) return 0;
    const weekNo = (t) => Math.floor((t - 4 * 864e5) / (7 * 864e5)); // weeks since epoch, Monday-ish
    const weeks = new Set(state.workouts.map((w) => weekNo(w.start)));
    let wk = weekNo(Date.now());
    if (!weeks.has(wk)) wk--;
    let n = 0;
    while (weeks.has(wk)) { n++; wk--; }
    return n;
  }

  function startWorkout(name, exIds) {
    state.active = {
      id: uid(), name, start: Date.now(),
      exercises: exIds.map((exId) => newExEntry(exId)),
    };
    save(); render();
  }
  function newExEntry(exId) {
    const prev = lastSetsFor(exId);
    const n = Math.max(prev.length, 3);
    const sets = [];
    for (let i = 0; i < n; i++) sets.push({ w: '', r: '', done: false });
    return { exId, sets };
  }

  let clockInterval;
  function renderActive(v) {
    const a = state.active;
    setTop(a.name, `<button class="btn primary small" data-action="finish">Finish</button>`);
    v.innerHTML = `
      <div class="row between" style="margin-bottom:12px">
        <span class="timer-pill">⏱ <span id="elapsed">${fmtClock((Date.now() - a.start) / 1000)}</span></span>
        <button class="btn ghost small" data-action="rename-workout">Rename</button>
      </div>
      ${a.exercises.map((ex, ei) => {
        const prev = lastSetsFor(ex.exId);
        return `
        <div class="card ex-card">
          <div class="ex-head">
            <h3>${esc(exById(ex.exId).name)}</h3>
            <button class="btn ghost small" data-action="ex-menu" data-ei="${ei}">•••</button>
          </div>
          <table class="sets">
            <thead><tr><th>Set</th><th>Previous</th><th>${unit()}</th><th>Reps</th><th>✓</th></tr></thead>
            <tbody>
            ${ex.sets.map((s, si) => {
              const p = prev[si];
              return `
              <tr class="${s.done ? 'done' : ''}">
                <td class="num">${si + 1}</td>
                <td class="prev">${p ? `${fmtNum(+p.w)}×${p.r}` : '—'}</td>
                <td><input type="number" inputmode="decimal" step="any" min="0" value="${esc(s.w)}" placeholder="${p ? fmtNum(+p.w) : ''}" data-field="w" data-ei="${ei}" data-si="${si}"></td>
                <td><input type="number" inputmode="numeric" step="1" min="0" value="${esc(s.r)}" placeholder="${p ? p.r : ''}" data-field="r" data-ei="${ei}" data-si="${si}"></td>
                <td><button class="check" data-action="toggle-set" data-ei="${ei}" data-si="${si}">✓</button></td>
              </tr>`;
            }).join('')}
            </tbody>
          </table>
          <div class="row" style="margin-top:8px">
            <button class="btn small" style="flex:1" data-action="add-set" data-ei="${ei}">＋ Add set</button>
            ${ex.sets.length > 1 ? `<button class="btn small" data-action="remove-set" data-ei="${ei}">− Remove</button>` : ''}
          </div>
        </div>`;
      }).join('')}
      <button class="btn block" data-action="add-exercise">＋ Add exercise</button>
      <div style="height:12px"></div>
      <button class="btn danger block" data-action="discard">Discard workout</button>
    `;
    clearInterval(clockInterval);
    clockInterval = setInterval(() => {
      const el = $('#elapsed');
      if (!el || !state.active) return clearInterval(clockInterval);
      el.textContent = fmtClock((Date.now() - state.active.start) / 1000);
    }, 1000);
  }

  function finishWorkout() {
    const a = state.active;
    // Drop sets never completed; drop empty exercises
    a.exercises = a.exercises
      .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.done).map((s) => ({ w: +s.w || 0, r: +s.r || 0, done: true })) }))
      .filter((ex) => ex.sets.length);
    if (!a.exercises.length) {
      if (!confirm('No completed sets. Discard this workout?')) return;
      state.active = null; save(); stopRest(); render(); return;
    }
    // Count PRs
    let prs = 0;
    for (const ex of a.exercises) {
      const before = bestE1rmBefore(ex.exId, a.start);
      const best = Math.max(...ex.sets.map((s) => e1rm(s.w, s.r)));
      if (best > before && before > 0) prs++;
    }
    a.end = Date.now();
    state.workouts.push(a);
    state.active = null;
    save(); stopRest();
    currentTab = 'history';
    render();
    toast(prs ? `💪 Workout saved — ${prs} new PR${prs > 1 ? 's' : ''}!` : '💪 Workout saved!');
  }

  // ---------- Rest timer ----------
  let restEnd = 0, restInterval;
  function startRest(sec = state.settings.rest) {
    if (!sec) return;
    restEnd = Date.now() + sec * 1000;
    $('#rest-timer').classList.remove('hidden');
    tickRest();
    clearInterval(restInterval);
    restInterval = setInterval(tickRest, 250);
  }
  function tickRest() {
    const left = Math.ceil((restEnd - Date.now()) / 1000);
    if (left <= 0) {
      stopRest();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      beep();
      toast('⏰ Rest over — next set!');
      return;
    }
    $('#rest-time').textContent = fmtClock(left);
  }
  function stopRest() { clearInterval(restInterval); $('#rest-timer').classList.add('hidden'); }
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.15;
      o.start(); o.stop(ctx.currentTime + 0.35);
    } catch (e) { /* ignore */ }
  }

  // ---------- Exercise picker ----------
  function pickExercise(onPick, title = 'Add exercise') {
    let filter = '';
    const draw = () => {
      const list = state.exercises
        .filter((e) => e.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
      $('#pick-list').innerHTML = list.map((e) => `
        <button class="list-item" data-pick="${e.id}"><span>${esc(e.name)}</span><span class="tag">${esc(e.muscle)}</span></button>`).join('')
        || `<p class="muted" style="padding:12px">No match. <button class="btn small" id="pick-create">Create “${esc(filter)}”</button></p>`;
    };
    openModal(`
      <h2>${esc(title)}</h2>
      <input type="search" id="pick-search" placeholder="Search exercises…" autocomplete="off">
      <div class="modal-list list" id="pick-list"></div>
      <button class="btn block" data-action="close-modal">Cancel</button>
    `);
    draw();
    $('#pick-search').addEventListener('input', (e) => { filter = e.target.value; draw(); });
    $('#pick-list').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]');
      if (b) { closeModal(); onPick(b.dataset.pick); return; }
      if (e.target.id === 'pick-create' && filter.trim()) {
        const ex = { id: uid(), name: filter.trim(), muscle: 'Other' };
        state.exercises.push(ex); save(); closeModal(); onPick(ex.id);
      }
    });
  }

  // ---------- Routine editor ----------
  function editRoutine(id) {
    const existing = state.routines.find((r) => r.id === id);
    const draft = existing ? { ...existing, exercises: existing.exercises.slice() } : { id: uid(), name: '', exercises: [] };
    const draw = () => {
      openModal(`
        <h2>${existing ? 'Edit routine' : 'New routine'}</h2>
        <input type="text" id="r-name" placeholder="Routine name (e.g. Upper Body)" value="${esc(draft.name)}">
        <div class="modal-list list">
          ${draft.exercises.map((exId, i) => `
            <div class="list-item">
              <span>${esc(exById(exId).name)}</span>
              <span class="row">
                <button class="btn small" data-r-up="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
                <button class="btn small danger" data-r-del="${i}">✕</button>
              </span>
            </div>`).join('') || '<p class="muted" style="padding:12px">No exercises yet.</p>'}
        </div>
        <button class="btn block" id="r-add">＋ Add exercise</button>
        <div class="row" style="margin-top:10px">
          ${existing ? '<button class="btn danger" id="r-delete">Delete</button>' : ''}
          <button class="btn" style="flex:1" data-action="close-modal">Cancel</button>
          <button class="btn primary" style="flex:1" id="r-save">Save</button>
        </div>
      `);
      const body = $('#modal-body');
      $('#r-name').addEventListener('input', (e) => { draft.name = e.target.value; });
      body.querySelectorAll('[data-r-del]').forEach((b) => b.onclick = () => { draft.exercises.splice(+b.dataset.rDel, 1); draw(); });
      body.querySelectorAll('[data-r-up]').forEach((b) => b.onclick = () => {
        const i = +b.dataset.rUp; [draft.exercises[i - 1], draft.exercises[i]] = [draft.exercises[i], draft.exercises[i - 1]]; draw();
      });
      $('#r-add').onclick = () => pickExercise((exId) => { draft.exercises.push(exId); draw(); });
      $('#r-save').onclick = () => {
        if (!draft.name.trim()) { toast('Give it a name'); return; }
        draft.name = draft.name.trim();
        if (existing) Object.assign(existing, draft); else state.routines.push(draft);
        save(); closeModal(); render();
      };
      if (existing) $('#r-delete').onclick = () => {
        if (!confirm(`Delete routine “${existing.name}”?`)) return;
        state.routines = state.routines.filter((r) => r.id !== existing.id); save(); closeModal(); render();
      };
    };
    draw();
  }

  // ---------- History tab ----------
  function renderHistory(v) {
    setTop('History');
    const ws = state.workouts.slice().reverse();
    if (!ws.length) {
      v.innerHTML = `<div class="hero"><div class="big">📅</div><h3>No workouts yet</h3><p class="muted">Finish a workout and it shows up here.</p></div>`;
      return;
    }
    v.innerHTML = ws.map((w) => {
      const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
      return `
      <div class="card" data-action="view-workout" data-id="${w.id}" style="cursor:pointer">
        <div class="row between"><h3>${esc(w.name)}</h3><span class="muted">${fmtDate(w.start)}</span></div>
        <div class="muted" style="margin-bottom:8px">⏱ ${fmtDur((w.end || w.start) - w.start)} · ${sets} sets · ${Math.round(workoutVolume(w)).toLocaleString()} ${unit()}</div>
        ${w.exercises.map((ex) => {
          const best = ex.sets.reduce((b, s) => (e1rm(s.w, s.r) > e1rm(b.w, b.r) ? s : b), ex.sets[0]);
          return `<div class="row between"><span>${ex.sets.length} × ${esc(exById(ex.exId).name)}</span><span class="muted">${fmtNum(best.w)} ${unit()} × ${best.r}</span></div>`;
        }).join('')}
      </div>`;
    }).join('');
  }

  function viewWorkout(id) {
    const w = state.workouts.find((x) => x.id === id);
    if (!w) return;
    openModal(`
      <h2>${esc(w.name)}</h2>
      <p class="muted">${new Date(w.start).toLocaleString()} · ${fmtDur((w.end || w.start) - w.start)}</p>
      <div class="modal-list">
        ${w.exercises.map((ex) => `
          <div class="card">
            <h3>${esc(exById(ex.exId).name)}</h3>
            ${ex.sets.map((s, i) => `<div class="row between"><span class="muted">Set ${i + 1}</span><span>${fmtNum(s.w)} ${unit()} × ${s.r}</span></div>`).join('')}
          </div>`).join('')}
      </div>
      <div class="row">
        <button class="btn danger" id="w-del">Delete</button>
        <button class="btn" id="w-repeat" style="flex:1">Repeat</button>
        <button class="btn primary" style="flex:1" data-action="close-modal">Close</button>
      </div>
    `);
    $('#w-del').onclick = () => {
      if (!confirm('Delete this workout permanently?')) return;
      state.workouts = state.workouts.filter((x) => x.id !== id); save(); closeModal(); render();
    };
    $('#w-repeat').onclick = () => {
      if (state.active && !confirm('You have a workout in progress. Replace it?')) return;
      closeModal(); currentTab = 'workout'; startWorkout(w.name, w.exercises.map((e) => e.exId));
    };
  }

  // ---------- Progress tab ----------
  let progressEx = null, progressMetric = 'e1rm';
  function renderProgress(v) {
    setTop('Progress');
    const used = [...new Set(state.workouts.flatMap((w) => w.exercises.map((e) => e.exId)))];
    if (!used.length) {
      v.innerHTML = `<div class="hero"><div class="big">📈</div><h3>Nothing to chart yet</h3><p class="muted">Log a few workouts to see your strength progress.</p></div>`;
      return;
    }
    if (!used.includes(progressEx)) progressEx = used[0];

    const points = [];
    let bestW = 0, bestE = 0, bestVol = 0, bestReps = 0;
    for (const w of state.workouts) {
      const ex = w.exercises.find((e) => e.exId === progressEx);
      if (!ex) continue;
      const top = Math.max(...ex.sets.map((s) => e1rm(s.w, s.r)));
      const maxW = Math.max(...ex.sets.map((s) => s.w));
      const vol = ex.sets.reduce((n, s) => n + s.w * s.r, 0);
      bestW = Math.max(bestW, maxW); bestE = Math.max(bestE, top); bestVol = Math.max(bestVol, vol);
      bestReps = Math.max(bestReps, ...ex.sets.map((s) => s.r));
      points.push({ t: w.start, y: progressMetric === 'e1rm' ? top : progressMetric === 'weight' ? maxW : vol });
    }

    v.innerHTML = `
      <select id="prog-ex">${used.map((id) => `<option value="${id}" ${id === progressEx ? 'selected' : ''}>${esc(exById(id).name)}</option>`).join('')}</select>
      <div class="stats" style="margin-top:12px">
        <div class="stat"><strong>${fmtNum(bestW)}</strong><span>Heaviest (${unit()})</span></div>
        <div class="stat"><strong>${fmtNum(bestE)}</strong><span>Est. 1RM</span></div>
        <div class="stat"><strong>${bestReps}</strong><span>Most reps</span></div>
      </div>
      <div class="chips">
        ${[['e1rm', 'Est. 1RM'], ['weight', 'Top weight'], ['volume', 'Volume']].map(([k, l]) => `<button class="chip ${k === progressMetric ? 'active' : ''}" data-metric="${k}">${l}</button>`).join('')}
      </div>
      <div class="card"><canvas class="chart" id="chart"></canvas></div>
      <p class="muted">${points.length} session${points.length === 1 ? '' : 's'} logged. Est. 1RM uses the Epley formula.</p>
    `;
    $('#prog-ex').onchange = (e) => { progressEx = e.target.value; render(); };
    v.querySelectorAll('[data-metric]').forEach((b) => b.onclick = () => { progressMetric = b.dataset.metric; render(); });
    drawChart($('#chart'), points);
  }

  function drawChart(canvas, pts) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const c = canvas.getContext('2d');
    c.scale(dpr, dpr);
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue('--accent').trim(), muted = css.getPropertyValue('--muted').trim(), border = css.getPropertyValue('--border').trim();
    const pad = { l: 40, r: 12, t: 12, b: 24 };
    if (!pts.length) return;
    let min = Math.min(...pts.map((p) => p.y)), max = Math.max(...pts.map((p) => p.y));
    if (min === max) { min -= 5; max += 5; }
    const span = max - min; min -= span * 0.1; max += span * 0.1;
    const x = (i) => pad.l + (pts.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (pts.length - 1)) * (W - pad.l - pad.r));
    const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);

    c.font = '11px system-ui'; c.fillStyle = muted; c.strokeStyle = border; c.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const val = min + (i / 4) * (max - min), yy = y(val);
      c.beginPath(); c.moveTo(pad.l, yy); c.lineTo(W - pad.r, yy); c.stroke();
      c.fillText(Math.round(val), 4, yy + 4);
    }
    const labelIdx = pts.length <= 1 ? [0] : [0, pts.length - 1];
    labelIdx.forEach((i) => {
      const s = new Date(pts[i].t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      c.textAlign = i === 0 && pts.length > 1 ? 'left' : i === 0 ? 'center' : 'right';
      c.fillText(s, x(i), H - 6);
    });
    c.textAlign = 'left';
    c.strokeStyle = accent; c.lineWidth = 2.5; c.lineJoin = 'round';
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(x(i), y(p.y)) : c.moveTo(x(i), y(p.y)))); c.stroke();
    c.fillStyle = accent;
    pts.forEach((p, i) => { c.beginPath(); c.arc(x(i), y(p.y), 3.5, 0, Math.PI * 2); c.fill(); });
  }

  // ---------- Exercises tab ----------
  let exFilter = 'All';
  function renderExercises(v) {
    setTop('Exercises', `<button class="btn primary small" data-action="new-exercise">＋ New</button>`);
    const list = state.exercises
      .filter((e) => exFilter === 'All' || e.muscle === exFilter)
      .sort((a, b) => a.name.localeCompare(b.name));
    v.innerHTML = `
      <div class="chips">${['All', ...MUSCLES].map((m) => `<button class="chip ${m === exFilter ? 'active' : ''}" data-exfilter="${m}">${m}</button>`).join('')}</div>
      <div class="list">
        ${list.map((e) => {
          const best = bestE1rmBefore(e.id, Infinity);
          return `<button class="list-item" data-action="edit-exercise" data-id="${e.id}">
            <span>${esc(e.name)}${best ? ` <span class="pr">🏆 ${fmtNum(best)} ${unit()}</span>` : ''}</span>
            <span class="tag">${esc(e.muscle)}</span></button>`;
        }).join('') || '<p class="muted" style="padding:12px">No exercises here.</p>'}
      </div>`;
    v.querySelectorAll('[data-exfilter]').forEach((b) => b.onclick = () => { exFilter = b.dataset.exfilter; render(); });
  }

  function editExercise(id) {
    const ex = state.exercises.find((e) => e.id === id);
    openModal(`
      <h2>${ex ? 'Edit exercise' : 'New exercise'}</h2>
      <div class="stack">
        <input type="text" id="e-name" placeholder="Exercise name" value="${esc(ex?.name || '')}">
        <select id="e-muscle">${MUSCLES.map((m) => `<option ${m === (ex?.muscle || 'Other') ? 'selected' : ''}>${m}</option>`).join('')}</select>
      </div>
      <div class="row" style="margin-top:12px">
        ${ex ? '<button class="btn danger" id="e-del">Delete</button>' : ''}
        <button class="btn" style="flex:1" data-action="close-modal">Cancel</button>
        <button class="btn primary" style="flex:1" id="e-save">Save</button>
      </div>
    `);
    $('#e-save').onclick = () => {
      const name = $('#e-name').value.trim();
      if (!name) { toast('Name required'); return; }
      const muscle = $('#e-muscle').value;
      if (ex) Object.assign(ex, { name, muscle }); else state.exercises.push({ id: uid(), name, muscle });
      save(); closeModal(); render();
    };
    if (ex) $('#e-del').onclick = () => {
      if (!confirm(`Delete “${ex.name}”? Past workouts keep their sets.`)) return;
      state.exercises = state.exercises.filter((e) => e.id !== id);
      state.routines.forEach((r) => { r.exercises = r.exercises.filter((x) => x !== id); });
      save(); closeModal(); render();
    };
  }

  // ---------- Settings tab ----------
  function renderSettings(v) {
    setTop('Settings');
    v.innerHTML = `
      <div class="card stack">
        <label class="row between"><span>Weight unit</span>
          <select id="s-unit" style="width:auto"><option value="kg" ${unit() === 'kg' ? 'selected' : ''}>kg</option><option value="lb" ${unit() === 'lb' ? 'selected' : ''}>lb</option></select>
        </label>
        <label class="row between"><span>Rest timer</span>
          <select id="s-rest" style="width:auto">${[0, 30, 60, 90, 120, 150, 180, 240, 300].map((s) => `<option value="${s}" ${s === state.settings.rest ? 'selected' : ''}>${s ? fmtClock(s) : 'Off'}</option>`).join('')}</select>
        </label>
      </div>
      <div class="section-title">Your data</div>
      <div class="card stack">
        <p class="muted" style="margin:0">Everything is stored only on this device. Export a backup to move it to a new phone.</p>
        <button class="btn block" data-action="export">⬇️ Export backup</button>
        <label class="btn block">⬆️ Import backup<input type="file" id="s-import" accept="application/json,.json" hidden></label>
        <button class="btn danger block" data-action="reset">Erase all data</button>
      </div>
      <div class="section-title">Share with friends</div>
      <div class="card stack">
        <p class="muted" style="margin:0">Send them this app's link. On iPhone: Safari → Share → <b>Add to Home Screen</b>. On Android: Chrome → ⋮ → <b>Install app</b>.</p>
        <button class="btn primary block" data-action="share">📤 Share app link</button>
        <button class="btn block hidden" id="install-btn" data-action="install">📲 Install app</button>
      </div>
      <p class="muted" style="text-align:center">IronLog · ${state.workouts.length} workouts logged</p>
    `;
    $('#s-unit').onchange = (e) => { state.settings.unit = e.target.value; save(); toast(`Units: ${e.target.value}`); };
    $('#s-rest').onchange = (e) => { state.settings.rest = +e.target.value; save(); toast('Rest timer updated'); };
    $('#s-import').onchange = importData;
    if (deferredInstall) $('#install-btn').classList.remove('hidden');
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ app: 'ironlog', version: 1, exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ironlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!Array.isArray(d.workouts) || !Array.isArray(d.exercises)) throw new Error('bad file');
        if (!confirm(`Import ${d.workouts.length} workouts? This replaces the data on this device.`)) return;
        state = { settings: { unit: 'kg', rest: 90, ...(d.settings || {}) }, exercises: d.exercises, routines: d.routines || [], workouts: d.workouts, active: d.active || null };
        save(); render(); toast('Backup imported');
      } catch (err) { toast('That file is not an IronLog backup'); }
    };
    reader.readAsText(file);
  }

  // ---------- Install / share ----------
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredInstall = e;
    const b = $('#install-btn'); if (b) b.classList.remove('hidden');
  });

  // ---------- Events ----------
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (tab) { currentTab = tab.dataset.tab; window.scrollTo(0, 0); render(); return; }
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const { action, id } = el.dataset;
    const ei = +el.dataset.ei, si = +el.dataset.si;
    const a = state.active;
    switch (action) {
      case 'start-empty': startWorkout('Workout', []); break;
      case 'start-routine': { const r = state.routines.find((x) => x.id === id); startWorkout(r.name, r.exercises); break; }
      case 'new-routine': editRoutine(null); break;
      case 'edit-routine': editRoutine(id); break;
      case 'toggle-set': {
        const s = a.exercises[ei].sets[si];
        if (!s.done) {
          // Fill blanks from placeholder (previous session) so one tap logs a repeat
          const row = el.closest('tr');
          const wIn = row.querySelector('[data-field=w]'), rIn = row.querySelector('[data-field=r]');
          if (s.w === '' && wIn.placeholder) s.w = wIn.placeholder;
          if (s.r === '' && rIn.placeholder) s.r = rIn.placeholder;
          if (s.r === '' || +s.r <= 0) { toast('Enter reps first'); rIn.focus(); return; }
          if (s.w === '') s.w = '0';
          s.done = true; save(); render(); startRest();
        } else { s.done = false; save(); render(); }
        break;
      }
      case 'add-set': {
        const sets = a.exercises[ei].sets; const last = sets[sets.length - 1];
        sets.push({ w: last ? last.w : '', r: last ? last.r : '', done: false }); save(); render(); break;
      }
      case 'remove-set': a.exercises[ei].sets.pop(); save(); render(); break;
      case 'add-exercise': pickExercise((exId) => { state.active.exercises.push(newExEntry(exId)); save(); render(); }); break;
      case 'ex-menu': {
        openModal(`
          <h2>${esc(exById(a.exercises[ei].exId).name)}</h2>
          <div class="stack">
            <button class="btn block" id="m-up" ${ei === 0 ? 'disabled' : ''}>↑ Move up</button>
            <button class="btn block" id="m-swap">⇄ Replace exercise</button>
            <button class="btn danger block" id="m-del">Remove from workout</button>
            <button class="btn block" data-action="close-modal">Cancel</button>
          </div>`);
        $('#m-up').onclick = () => { const x = a.exercises; [x[ei - 1], x[ei]] = [x[ei], x[ei - 1]]; save(); closeModal(); render(); };
        $('#m-swap').onclick = () => pickExercise((exId) => { a.exercises[ei] = newExEntry(exId); save(); render(); }, 'Replace with');
        $('#m-del').onclick = () => { a.exercises.splice(ei, 1); save(); closeModal(); render(); };
        break;
      }
      case 'rename-workout': {
        const n = prompt('Workout name', a.name);
        if (n && n.trim()) { a.name = n.trim(); save(); render(); }
        break;
      }
      case 'finish': finishWorkout(); break;
      case 'discard': if (confirm('Discard this workout? Nothing will be saved.')) { state.active = null; save(); stopRest(); render(); } break;
      case 'rest-add': restEnd += 15000; tickRest(); break;
      case 'rest-skip': stopRest(); break;
      case 'view-workout': viewWorkout(id); break;
      case 'new-exercise': editExercise(null); break;
      case 'edit-exercise': editExercise(id); break;
      case 'close-modal': closeModal(); break;
      case 'export': exportData(); break;
      case 'reset':
        if (confirm('Erase ALL workouts, routines and exercises on this device?') && confirm('Really? This cannot be undone.')) {
          localStorage.removeItem(STORE_KEY); state = load(); save(); render(); toast('All data erased');
        }
        break;
      case 'share': {
        const url = location.href.split('#')[0];
        if (navigator.share) navigator.share({ title: 'IronLog', text: 'Track your workouts with me on IronLog 💪', url }).catch(() => {});
        else navigator.clipboard?.writeText(url).then(() => toast('Link copied!'), () => prompt('Copy this link:', url));
        break;
      }
      case 'install':
        if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; render(); }); }
        break;
    }
  });

  // Typing into set inputs: update state without re-rendering (keeps keyboard open)
  document.addEventListener('input', (e) => {
    const f = e.target.dataset.field;
    if (!f || !state.active) return;
    const s = state.active.exercises[+e.target.dataset.ei].sets[+e.target.dataset.si];
    s[f] = e.target.value;
    save();
  });

  // ---------- Boot ----------
  if (state.active) currentTab = 'workout';
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
