// Train tab: start screen with routines & programs, routine editor. Delegates to the logger when a workout is live.
import { state, save, exById, startWorkout, routineLastDone, addProgram } from '../store.js';
import { PROGRAMS } from '../data.js';
import { esc, uid, fmtRel } from '../util.js';
import { appbar, icon, on, go, rerender, toast, openSheet, closeSheet, closeAllSheets, actionSheet, confirmDialog, empty } from '../ui.js';
import { pickExercises } from './exercise.js';
import { renderLogger } from './logger.js';
import { shareRoutine } from '../share.js';

export function renderTrain(root) {
  if (state.active) return renderLogger(root);
  const rs = state.routines;
  root.innerHTML = `
    ${appbar('Train', `<button class="icon-btn" data-act="new-routine" aria-label="New routine">${icon('plus')}</button>`)}
    <div class="quick">
      <button class="quick-btn primary" data-act="start-empty"><span class="qi">${icon('play')}</span><strong>Quick start</strong><span>Empty workout</span></button>
      <button class="quick-btn" data-act="programs"><span class="qi">${icon('sparkle')}</span><strong>Programs</strong><span>${PROGRAMS.length} ready-made plans</span></button>
    </div>
    <div class="sec"><h2>My routines</h2>${rs.length ? `<span class="muted" style="font-size:14px">${rs.length}</span>` : ''}</div>
    <div class="col">
      ${rs.map(routineCard).join('') || `<div class="card">${empty('list', 'No routines yet', 'Routines are workouts you repeat. Grab a program or build your own.',
        `<div class="btn-row"><button class="btn soft" data-act="programs">Programs</button><button class="btn" data-act="new-routine">Create</button></div>`)}</div>`}
    </div>`;
}

function routineCard(r) {
  const last = routineLastDone(r.id);
  const sets = r.items.reduce((n, it) => n + (it.sets || 3), 0);
  const names = r.items.map((it) => exById(it.exId).name);
  return `
    <div class="routine">
      <div class="routine-top">
        <div class="grow"><h3>${esc(r.name)}</h3>
          <div class="meta">${r.items.length} exercises · ~${Math.max(10, Math.round(sets * 2.5 / 5) * 5)} min${last ? ` · ${esc(fmtRel(last))}` : ''}</div></div>
        <button class="icon-btn plain" data-act="routine-menu" data-id="${r.id}" aria-label="More">${icon('more')}</button>
      </div>
      <div class="ex-chips">${names.slice(0, 5).map((n) => `<span class="ex-chip">${esc(n)}</span>`).join('')}${names.length > 5 ? `<span class="ex-chip">+${names.length - 5}</span>` : ''}</div>
      <button class="btn primary block" data-act="start-routine" data-id="${r.id}">${icon('play')} Start workout</button>
    </div>`;
}

async function confirmReplace() {
  if (!state.active) return true;
  return confirmDialog({ title: 'Workout in progress', message: 'Starting a new one will discard the current workout.', confirm: 'Discard & start', danger: true });
}

export async function startRoutine(id) {
  const r = state.routines.find((x) => x.id === id);
  if (!r || !(await confirmReplace())) return;
  startWorkout({ name: r.name, items: r.items, routineId: r.id });
  closeAllSheets();
  go('train');
}

on('start-routine', (el) => startRoutine(el.dataset.id));
on('start-empty', async () => {
  if (!(await confirmReplace())) return;
  startWorkout({});
  go('train');
});
on('new-routine', () => editRoutine(null));
on('programs', () => openPrograms());
on('routine-menu', (el) => {
  const r = state.routines.find((x) => x.id === el.dataset.id);
  if (!r) return;
  actionSheet(r.name, [
    { label: 'Edit routine', icon: 'edit', run: () => editRoutine(r.id) },
    { label: 'Duplicate', icon: 'copy', run: () => { state.routines.splice(state.routines.indexOf(r) + 1, 0, { ...JSON.parse(JSON.stringify(r)), id: uid(), name: `${r.name} (copy)` }); save(); rerender(); toast('Routine duplicated', 'copy'); } },
    { label: 'Send to a friend', icon: 'share', run: () => shareRoutine(r) },
    { label: 'Delete routine', icon: 'trash', danger: true, run: async () => {
      if (await confirmDialog({ title: `Delete “${r.name}”?`, message: 'Past workouts are kept.', confirm: 'Delete', danger: true })) {
        state.routines = state.routines.filter((x) => x.id !== r.id); save(); rerender();
      }
    } },
  ]);
});

export function editRoutine(id) {
  const existing = state.routines.find((r) => r.id === id);
  const d = existing ? JSON.parse(JSON.stringify(existing)) : { id: uid(), name: '', items: [] };
  const body = openSheet('', { cls: 'tall' });
  const draw = () => {
    body.innerHTML = `
      <div class="sheet-head"><h2>${existing ? 'Edit routine' : 'New routine'}</h2><button class="btn primary sm" id="re-save">Save</button></div>
      <input class="input" id="re-name" value="${esc(d.name)}" placeholder="Routine name, e.g. Upper Body" maxlength="50">
      <div class="group-label">Exercises</div>
      ${d.items.length ? `<div class="list">${d.items.map((it, i) => `
        <div class="r-item">
          <div class="row-main"><div class="row-title">${esc(exById(it.exId).name)}</div>
            <div class="row-sub">${it.sets || 3} sets${it.reps ? ` × ${it.reps}` : ''}</div></div>
          <div class="stepper"><button data-dec="${i}" aria-label="Fewer sets">${icon('minus')}</button><b>${it.sets || 3}</b><button data-inc="${i}" aria-label="More sets">${icon('plus')}</button></div>
          <button class="icon-btn plain" data-imenu="${i}" aria-label="More">${icon('more')}</button>
        </div>`).join('')}</div>` : '<p class="muted center">No exercises yet.</p>'}
      <button class="btn soft block mt" id="re-add">${icon('plus')} Add exercises</button>
      ${existing ? `<button class="btn danger ghost-btn block mt" id="re-del">${icon('trash')} Delete routine</button>` : ''}`;
    body.querySelector('#re-name').oninput = (e) => { d.name = e.target.value; };
  };
  draw();
  body.addEventListener('click', async (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.inc) { const it = d.items[+t.dataset.inc]; it.sets = Math.min(20, (it.sets || 3) + 1); draw(); }
    else if (t.dataset.dec) { const it = d.items[+t.dataset.dec]; it.sets = Math.max(1, (it.sets || 3) - 1); draw(); }
    else if (t.dataset.imenu) {
      const i = +t.dataset.imenu;
      actionSheet(exById(d.items[i].exId).name, [
        { label: 'Move up', icon: 'up', disabled: i === 0, run: () => { [d.items[i - 1], d.items[i]] = [d.items[i], d.items[i - 1]]; draw(); } },
        { label: 'Move down', icon: 'down', disabled: i === d.items.length - 1, run: () => { [d.items[i + 1], d.items[i]] = [d.items[i], d.items[i + 1]]; draw(); } },
        { label: 'Swap exercise', icon: 'swap', run: () => pickExercises((ids) => { d.items[i].exId = ids[0]; draw(); }, { multi: false, title: 'Swap for' }) },
        { label: 'Remove', icon: 'trash', danger: true, run: () => { d.items.splice(i, 1); draw(); } },
      ]);
    } else if (t.id === 're-add') {
      pickExercises((ids) => { ids.forEach((exId) => d.items.push({ exId, sets: 3 })); draw(); });
    } else if (t.id === 're-save') {
      d.name = d.name.trim();
      if (!d.name) { toast('Give your routine a name', 'info'); body.querySelector('#re-name').focus(); return; }
      if (existing) Object.assign(existing, d); else state.routines.push(d);
      save(); closeSheet(); rerender(); toast(existing ? 'Routine saved' : 'Routine created', 'check');
    } else if (t.id === 're-del') {
      if (await confirmDialog({ title: `Delete “${existing.name}”?`, message: 'Past workouts are kept.', confirm: 'Delete', danger: true })) {
        state.routines = state.routines.filter((r) => r.id !== existing.id); save(); closeSheet(); rerender();
      }
    }
  });
}

export function openPrograms() {
  const body = openSheet(`
    <div class="sheet-head"><h2>Programs</h2></div>
    <p class="sheet-sub">Proven plans. Adding one puts its workouts in your routines.</p>
    <div class="prog-list">${PROGRAMS.map((p) => `
      <button class="prog-card" data-prog="${p.id}">
        <span class="program-emoji">${p.emoji}</span>
        <span class="grow"><h4>${esc(p.name)}</h4><p>${esc(p.tagline)}</p>
          <span class="row-flex" style="gap:6px;margin-top:6px"><span class="tag accent">${esc(p.level)}</span><span class="tag">${esc(p.days)}</span></span></span>
        ${icon('right', 'chev')}
      </button>`).join('')}</div>`, { cls: 'tall' });
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-prog]');
    if (b) openProgram(b.dataset.prog);
  });
}

function openProgram(pid) {
  const p = PROGRAMS.find((x) => x.id === pid);
  const have = p.routines.filter((r) => state.routines.some((x) => x.program === p.id && x.name === r.name)).length;
  const body = openSheet(`
    <div class="center" style="padding:6px 0 10px"><div style="font-size:52px">${p.emoji}</div>
      <h2 style="margin:6px 0 4px;font-size:25px">${esc(p.name)}</h2><p class="muted" style="margin:0">${esc(p.tagline)}</p>
      <div class="row-flex" style="justify-content:center;gap:6px;margin-top:10px"><span class="tag accent">${esc(p.level)}</span><span class="tag">${esc(p.days)}</span></div></div>
    <div class="col mt">${p.routines.map((r) => `
      <div class="card"><div class="card-title"><h3>${esc(r.name)}</h3><span class="tag">${r.items.length} exercises</span></div>
        ${r.items.map(([n, s, reps]) => `<div class="wline"><span class="nm">${esc(n)}</span><span class="best">${s} × ${reps}${exById(state.exercises.find((e) => e.name === n)?.id).type === 'duration' ? 's' : ''}</span></div>`).join('')}
      </div>`).join('')}</div>
    <button class="btn primary block mt-lg" id="prog-add">${icon('plus')} ${have ? 'Add again' : `Add ${p.routines.length > 1 ? `${p.routines.length} routines` : 'routine'}`}</button>`);
  body.querySelector('#prog-add').onclick = () => {
    addProgram(p.id);
    closeAllSheets();
    toast(`${p.name} added to your routines`, 'check');
    go('train');
  };
}
