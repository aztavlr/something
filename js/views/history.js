// History: month calendar, workout list grouped by month, workout detail with actions.
import { state, save, exById, workoutStats, fmtVol, prIndex, setText, startWorkout, editWorkout, isWorkSet } from '../store.js';
import { esc, uid, fmtDate, fmtTime, fmtDur, startOfDay, addDays, DAY } from '../util.js';
import { appbar, icon, on, go, rerender, toast, openSheet, closeSheet, closeAllSheets, actionSheet, confirmDialog, empty } from '../ui.js';
import { shareWorkoutImage, shareWorkoutLink } from '../share.js';
import { openExercise } from './exercise.js';
import { getPhoto, setPhoto, delPhoto, pickImage, resize } from '../photos.js';
import { queueWorkout, queueDelete, flush } from '../cloud.js';

let calMonth = null; // first day of the visible month (timestamp)
const FEELS = ['', '😫', '😕', '🙂', '😀', '🔥'];

function monthStart(t) { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
function shiftMonth(t, n) { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime(); }

function calendar() {
  const ms = calMonth, me = shiftMonth(ms, 1);
  const ws = state.settings.weekStart;
  const days = new Map();
  for (const w of state.workouts) if (w.start >= ms && w.start < me) {
    const k = startOfDay(w.start);
    if (!days.has(k)) days.set(k, []);
    days.get(k).push(w);
  }
  const inMonth = state.workouts.filter((w) => w.start >= ms && w.start < me);
  const vol = inMonth.reduce((a, w) => a + workoutStats(w).vol, 0);
  const time = inMonth.reduce((a, w) => a + ((w.end || w.start) - w.start), 0);
  const lead = (new Date(ms).getDay() - ws + 7) % 7;
  const nDays = Math.round((startOfDay(me) - startOfDay(ms)) / DAY);
  const today = startOfDay(Date.now());
  const dow = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + ((i + ws) % 7)).toLocaleDateString(undefined, { weekday: 'narrow' }));
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="cal-day out"></span>';
  for (let d = 0; d < nDays; d++) {
    const t = startOfDay(addDays(ms, d)), ws2 = days.get(t);
    cells += `<button class="cal-day ${ws2 ? 'has' : ''} ${t === today ? 'today' : ''} ${t > today ? 'future' : ''}" ${ws2 ? `data-act="open-workout" data-id="${ws2[0].id}"` : 'disabled'}>${d + 1}</button>`;
  }
  return `<div class="card">
    <div class="cal-head">
      <button class="icon-btn plain" data-act="cal" data-d="-1" aria-label="Previous month">${icon('left')}</button>
      <h3>${esc(new Date(ms).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))}</h3>
      <button class="icon-btn plain" data-act="cal" data-d="1" aria-label="Next month" ${me > Date.now() ? 'disabled style="opacity:.3"' : ''}>${icon('right')}</button>
    </div>
    <div class="cal-grid">${dow.map((d) => `<span class="cal-dow">${d}</span>`).join('')}${cells}</div>
    <div class="cal-sum">
      <div><strong>${inMonth.length}</strong><span>Workouts</span></div>
      <div><strong>${fmtDur(time)}</strong><span>Time</span></div>
      <div><strong>${fmtVol(vol)}</strong><span>Volume</span></div>
    </div></div>`;
}

function wcard(w, prs) {
  const st = workoutStats(w);
  return `<button class="card wcard" data-act="open-workout" data-id="${w.id}">
    <div class="wcard-top"><div class="grow"><h3>${esc(w.name)}</h3><div class="wcard-date">${esc(fmtDate(w.start))} · ${esc(fmtTime(w.start))}</div></div>
      ${prs.length ? `<span class="tag gold">${icon('trophy')} ${prs.length} PR${prs.length > 1 ? 's' : ''}</span>` : w.feel ? `<span style="font-size:22px">${FEELS[w.feel]}</span>` : ''}</div>
    <div class="wcard-stats"><span>${icon('clock')}${fmtDur(st.dur)}</span><span>${icon('weight')}${fmtVol(st.vol)}</span><span>${icon('layers')}${st.sets} sets</span></div>
    ${w.exercises.slice(0, 4).map((ex) => {
      const e = exById(ex.exId);
      const work = ex.sets.filter(isWorkSet);
      const best = (work.length ? work : ex.sets).reduce((b, s) => ((s.w || 0) * 100 + (s.r || 0) + (s.t || 0) + (s.d || 0) > (b.w || 0) * 100 + (b.r || 0) + (b.t || 0) + (b.d || 0) ? s : b));
      return `<div class="wline"><span class="nm">${ex.sets.length} × ${esc(e.name)}</span><span class="best">${esc(setText(e.type, best))}</span></div>`;
    }).join('')}
    ${w.exercises.length > 4 ? `<div class="muted" style="font-size:13.5px;margin-top:4px">+ ${w.exercises.length - 4} more</div>` : ''}
  </button>`;
}

export function renderHistory(root) {
  if (calMonth == null) calMonth = monthStart(Date.now());
  const ws = state.workouts.slice().sort((a, b) => b.start - a.start);
  const idx = prIndex();
  let list = '', lastMonth = '';
  for (const w of ws) {
    const m = new Date(w.start).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (m !== lastMonth) { list += `<div class="month-h">${esc(m)}</div>`; lastMonth = m; }
    list += wcard(w, idx.get(w.id) || []);
  }
  root.innerHTML = `
    <header class="appbar center"><button class="icon-btn plain" data-act="go" data-tab="profile" aria-label="Back">${icon('left')}</button><h1 style="font-size:22px">History</h1>${ws.length ? `<span class="tag" style="justify-self:end">${ws.length}</span>` : '<span></span>'}</header>
    ${calendar()}
    ${ws.length ? list : `<div class="card mt">${empty('calendar', 'No workouts yet', 'Finish your first workout and it will appear here.', '<button class="btn primary" data-act="go" data-tab="train">Start training</button>')}</div>`}`;
}

on('cal', (el) => { calMonth = shiftMonth(calMonth, +el.dataset.d); rerender(); });

export function openWorkout(id) {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) return;
  const st = workoutStats(w), prs = prIndex().get(w.id) || [];
  const prSet = new Set(prs.map((p) => `${p.exId}:${p.si}`));
  const body = openSheet(`
    <div class="sheet-head"><div class="grow"><h2>${esc(w.name)}</h2>
      <div class="muted" style="font-size:14px;margin-top:2px">${esc(fmtDate(w.start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))} · ${esc(fmtTime(w.start))}</div></div>
      <button class="icon-btn" data-act="w-menu" data-id="${w.id}" aria-label="More">${icon('more')}</button></div>
    <div class="summary-stats">
      <div class="tile">${icon('clock')}<strong>${fmtDur(st.dur)}</strong><span>Duration</span></div>
      <div class="tile">${icon('weight')}<strong>${fmtVol(st.vol)}</strong><span>Volume</span></div>
      <div class="tile">${icon('layers')}<strong>${st.sets}</strong><span>Sets</span></div>
    </div>
    <div class="post-photo" id="wd-photo" hidden></div>
    ${w.feel || w.notes ? `<div class="card mt">${w.feel ? `<div style="font-size:15px;font-weight:650">Felt ${FEELS[w.feel]}</div>` : ''}${w.notes ? `<div class="muted" style="white-space:pre-wrap;margin-top:${w.feel ? 6 : 0}px">${esc(w.notes)}</div>` : ''}</div>` : ''}
    <div class="col mt">
      ${w.exercises.map((ex) => {
        const e = exById(ex.exId);
        let n = 0;
        return `<div class="card">
          <button class="exb-title" data-act="open-exercise" data-id="${ex.exId}"><strong>${esc(e.name)}</strong><span>${esc(e.muscle)}</span></button>
          ${ex.notes ? `<div class="exb-note" style="margin:8px 0 0">${esc(ex.notes)}</div>` : ''}
          <div class="set-list">${ex.sets.map((s, si) => {
            const lab = s.kind === 'w' ? 'W' : s.kind === 'd' ? 'D' : s.kind === 'f' ? 'F' : ++n;
            return `<div class="set-li"><span class="n k-${s.kind}">${lab}</span><span class="grow">${esc(setText(e.type, s))}${s.rpe ? ` <span class="muted">@${s.rpe}</span>` : ''}</span>${prSet.has(`${ex.exId}:${si}`) ? `<span class="tag gold">${icon('trophy')} PR</span>` : ''}</div>`;
          }).join('')}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="btn-row mt-lg">
      <button class="btn primary" data-act="w-repeat" data-id="${w.id}">${icon('repeat')} Repeat</button>
      <button class="btn" data-act="w-share" data-id="${w.id}">${icon('share')} Share</button>
    </div>`, { cls: 'tall' });
  getPhoto(w.id).then((src) => {
    const el = body.querySelector('#wd-photo');
    if (src && el) { el.innerHTML = `<img src="${src}" alt="">`; el.hidden = false; }
  });
}

/** Ask for a photo and attach it to a workout. Resolves true when one was added. */
export async function addWorkoutPhoto(w) {
  const img = await pickImage();
  if (!img) return false;
  try {
    await setPhoto(w.id, resize(img, { max: 1080, quality: 0.78 }));
  } catch (e) { toast('Could not save the photo', 'info'); return false; }
  queueWorkout(w.id); flush();
  toast('Photo added', 'camera');
  return true;
}
on('open-workout', (el) => openWorkout(el.dataset.id));

const find = (el) => state.workouts.find((x) => x.id === el.dataset.id);
on('w-repeat', async (el) => {
  const w = find(el);
  if (!w) return;
  if (state.active && !(await confirmDialog({ title: 'Workout in progress', message: 'Starting this one will discard it.', confirm: 'Discard & start', danger: true }))) return;
  startWorkout({ name: w.name, routineId: w.routineId || null, items: w.exercises.map((ex) => ({ exId: ex.exId, sets: ex.sets.length })) });
  closeAllSheets();
  go('train');
});
on('w-share', (el) => {
  const w = find(el);
  if (!w) return;
  actionSheet('Share workout', [
    { label: 'Share as image', icon: 'share', run: () => shareWorkoutImage(w, prIndex().get(w.id) || []) },
    { label: 'Send to a friend (link)', icon: 'link', run: () => shareWorkoutLink(w) },
  ]);
});
on('w-menu', (el) => {
  const w = find(el);
  if (!w) return;
  actionSheet(w.name, [
    { label: 'Edit workout', icon: 'edit', run: async () => {
      if (state.active && !(await confirmDialog({ title: 'Workout in progress', message: 'Editing this one will discard the current workout.', confirm: 'Discard & edit', danger: true }))) return;
      editWorkout(w.id); closeAllSheets(); go('train');
    } },
    { label: 'Add or change photo', icon: 'camera', run: async () => { if (await addWorkoutPhoto(w)) { closeSheet(); openWorkout(w.id); rerender(); } } },
    { label: 'Remove photo', icon: 'x', run: async () => { await delPhoto(w.id); queueWorkout(w.id); flush(); closeSheet(); openWorkout(w.id); rerender(); } },
    { label: 'Save as routine', icon: 'list', run: () => {
      state.routines.push({ id: uid(), name: w.name, items: w.exercises.map((ex) => ({ exId: ex.exId, sets: ex.sets.filter((s) => s.kind !== 'w').length || ex.sets.length })) });
      save(); toast('Saved to your routines', 'check');
    } },
    { label: 'Delete workout', icon: 'trash', danger: true, run: async () => {
      if (!(await confirmDialog({ title: 'Delete this workout?', message: 'This cannot be undone.', confirm: 'Delete', danger: true }))) return;
      state.workouts = state.workouts.filter((x) => x.id !== w.id); save(); delPhoto(w.id); queueDelete(w.id); flush();
      closeAllSheets(); rerender(); toast('Workout deleted', 'trash');
    } },
  ]);
});
