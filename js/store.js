// App state, persistence, migration, unit conversion and training math.
import { DEFAULT_EXERCISES, PROGRAMS } from './data.js';
import { uid, startOfWeek, startOfDay, addDays, fmtNum, fmtClock, fmtBig } from './util.js';

const KEY = 'ironlog:v2';
const OLD_KEY = 'ironlog:v1';
export const LB = 0.45359237; // kg per lb
export const MI = 1.609344; // km per mile

export const DEFAULT_SETTINGS = {
  unit: 'kg', rest: 90, autoRest: true, sound: true, vibrate: true, wakeLock: true,
  showRpe: false, weeklyGoal: 3, weekStart: 1, theme: 'dark', accent: 'gold', bar: 20, onboarded: false, sex: '', trainDays: null,
};

function fresh() {
  return {
    v: 2,
    profile: { name: '', handle: '', bio: '', avatar: '💪', photo: '', created: Date.now() },
    settings: { ...DEFAULT_SETTINGS },
    exercises: DEFAULT_EXERCISES.map((e) => ({ ...e })),
    routines: [], workouts: [], body: [], checkins: [], excused: [], active: null,
  };
}

function normalize(d) {
  const s = fresh();
  return {
    v: 2,
    profile: { ...s.profile, ...(d.profile || {}) },
    settings: { ...s.settings, ...(d.settings || {}) },
    exercises: Array.isArray(d.exercises) && d.exercises.length ? d.exercises : s.exercises,
    routines: Array.isArray(d.routines) ? d.routines : [],
    workouts: Array.isArray(d.workouts) ? d.workouts : [],
    body: Array.isArray(d.body) ? d.body : [],
    checkins: Array.isArray(d.checkins) ? d.checkins : [],
    excused: Array.isArray(d.excused) ? d.excused : [],
    active: d.active || null,
  };
}

/** Convert data from the first version of the app. */
function migrateV1(d) {
  const s = fresh();
  const unit = d.settings?.unit === 'lb' ? 'lb' : 'kg';
  const toKg = (w) => (unit === 'lb' ? (+w || 0) * LB : +w || 0);
  Object.assign(s.settings, { unit, rest: d.settings?.rest ?? 90, onboarded: true });
  for (const e of d.exercises || []) {
    const def = s.exercises.find((x) => x.id === e.id);
    if (def) Object.assign(def, { name: e.name, muscle: e.muscle });
    else s.exercises.push({ id: e.id, name: e.name, muscle: e.muscle || 'Other', type: 'weight', equipment: 'Other', custom: true });
  }
  s.routines = (d.routines || []).map((r) => ({ id: r.id, name: r.name, items: (r.exercises || []).map((exId) => ({ exId, sets: 3 })) }));
  const conv = (w) => ({
    id: w.id, name: w.name, start: w.start, end: w.end || w.start, notes: '',
    exercises: (w.exercises || []).map((ex) => ({
      exId: ex.exId, notes: '',
      sets: ex.sets.map((st) => ({ w: toKg(st.w), r: +st.r || 0, t: null, d: null, rpe: null, kind: 'n', done: !!st.done })),
    })),
  });
  s.workouts = (d.workouts || []).map(conv);
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
    const old = localStorage.getItem(OLD_KEY);
    if (old) return migrateV1(JSON.parse(old));
  } catch (e) { console.warn('load failed', e); }
  return fresh();
}

export let state = load();

/** Functions called after every successful save (e.g. the cloud backup scheduler). */
export const saveHooks = new Set();
export let lastSaved = 0;
let dirty = false;
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn('save failed', e); return false; }
  dirty = false;
  lastSaved = Date.now();
  saveHooks.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
  return true;
}
/** Mark in-memory changes that will be saved shortly (e.g. while typing). */
export const markDirty = () => { dirty = true; };
/** Save now only if something is waiting to be saved (used when the app is closed or hidden). */
export const flushDirty = () => (dirty ? save() : true);

// Keep several open tabs/windows of the app in sync: when another one saves, adopt its data.
export const externalChangeHooks = new Set();
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => {
  if (e.key !== KEY || !e.newValue) return;
  try {
    state = normalize(JSON.parse(e.newValue));
    dirty = false;
    externalChangeHooks.forEach((fn) => { try { fn(); } catch (err) { /* ignore */ } });
  } catch (err) { /* ignore malformed */ }
});
/** Replace everything on this phone with restored data (from a cloud backup). */
export function replaceState(data) {
  const s = normalize(data);
  s.settings.onboarded = true;
  state = s;
  return save();
}
try { if (!localStorage.getItem(KEY)) save(); } catch (e) { /* storage unavailable */ }

export function resetAll() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(OLD_KEY);
  state = fresh();
  save();
}

// ---------- Exercises ----------
const MISSING = { name: 'Deleted exercise', muscle: 'Other', type: 'weight', equipment: 'Other' };
export const exById = (id) => state.exercises.find((e) => e.id === id) || { id, ...MISSING };

export function ensureExercise(name) {
  const lc = name.trim().toLowerCase();
  const found = state.exercises.find((e) => e.name.toLowerCase() === lc);
  if (found) return found.id;
  const def = DEFAULT_EXERCISES.find((e) => e.name.toLowerCase() === lc);
  const ex = def ? { ...def } : { id: uid(), name: name.trim(), muscle: 'Other', type: 'weight', equipment: 'Other', custom: true };
  state.exercises.push(ex);
  return ex.id;
}

// ---------- Units ----------
export const wUnit = () => state.settings.unit;
export const dUnit = () => (state.settings.unit === 'lb' ? 'mi' : 'km');
export const kgToDisp = (kg) => (state.settings.unit === 'lb' ? kg / LB : kg);
export const dispToKg = (v) => (state.settings.unit === 'lb' ? v * LB : v);
export const kmToDisp = (km) => (state.settings.unit === 'lb' ? km / MI : km);
export const dispToKm = (v) => (state.settings.unit === 'lb' ? v * MI : v);
export const fmtW = (kg, dp = 1) => fmtNum(kgToDisp(kg || 0), dp);
export const fmtVol = (kg) => `${fmtBig(kgToDisp(kg || 0))} ${wUnit()}`;

// Input columns per exercise type
export const COLS = {
  weight: [{ f: 'w', kind: 'w', label: () => wUnit() }, { f: 'r', kind: 'int', label: () => 'Reps' }],
  bodyweight: [{ f: 'w', kind: 'w', label: () => '+' + wUnit() }, { f: 'r', kind: 'int', label: () => 'Reps' }],
  duration: [{ f: 't', kind: 'int', label: () => 'Sec' }],
  cardio: [{ f: 'd', kind: 'dist', label: () => dUnit() }, { f: 't', kind: 'min', label: () => 'Min' }],
};

export function toInput(kind, v) {
  if (v == null || v === '') return '';
  if (kind === 'w') return fmtNum(kgToDisp(v), 2);
  if (kind === 'dist') return fmtNum(kmToDisp(v), 2);
  if (kind === 'min') return fmtNum(v / 60, 1);
  return String(v);
}
export function fromInput(kind, str) {
  if (str == null || String(str).trim() === '') return null;
  const n = parseFloat(String(str).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  if (kind === 'w') return dispToKg(n);
  if (kind === 'dist') return dispToKm(n);
  if (kind === 'min') return Math.round(n * 60);
  return Math.round(n);
}

// ---------- Sets & scoring ----------
export const blankSet = (kind = 'n') => ({ w: null, r: null, t: null, d: null, rpe: null, kind, done: false });

export function setReady(type, s) {
  if (type === 'duration') return s.t > 0;
  if (type === 'cardio') return s.d > 0 || s.t > 0;
  return s.r > 0;
}

export function setText(type, s) {
  if (type === 'weight') return `${fmtW(s.w, 2)} ${wUnit()} × ${s.r || 0}`;
  if (type === 'bodyweight') return s.w ? `+${fmtW(s.w, 2)} ${wUnit()} × ${s.r || 0}` : `${s.r || 0} reps`;
  if (type === 'duration') return fmtClock(s.t || 0);
  return [s.d ? `${fmtNum(kmToDisp(s.d), 2)} ${dUnit()}` : '', s.t ? fmtClock(s.t) : ''].filter(Boolean).join(' · ');
}

export const e1rm = (w, r) => (!w || !r ? 0 : r === 1 ? w : w * (1 + r / 30)); // Epley

export function setScore(type, s) {
  if (type === 'weight') return e1rm(s.w || 0, s.r || 0);
  if (type === 'bodyweight') return e1rm(75 + (s.w || 0), s.r || 0);
  if (type === 'duration') return s.t || 0;
  return s.d ? s.d * 1e6 : s.t || 0;
}
export const SCORE_LABEL = { weight: 'Est. 1RM', bodyweight: 'Best set', duration: 'Longest hold', cardio: 'Longest' };
export const isWorkSet = (s) => s.done && s.kind !== 'w';

export function workoutStats(w) {
  let sets = 0, vol = 0, reps = 0;
  for (const ex of w.exercises) {
    const type = exById(ex.exId).type;
    for (const s of ex.sets) {
      if (!s.done) continue;
      sets++;
      reps += s.r || 0;
      if (type === 'weight') vol += (s.w || 0) * (s.r || 0);
    }
  }
  return { sets, vol, reps, dur: (w.end || Date.now()) - w.start };
}

/** Map<workoutId, [{exId, si, type, score, set}]> — one PR per exercise per workout (top set beats all earlier sessions). */
export function prIndex() {
  const best = new Map(), out = new Map();
  for (const w of state.workouts.slice().sort((a, b) => a.start - b.start)) {
    const prs = [];
    for (const ex of w.exercises) {
      const type = exById(ex.exId).type;
      let top = -1, topSi = -1;
      ex.sets.forEach((s, si) => {
        if (!isWorkSet(s)) return;
        const sc = setScore(type, s);
        if (sc > top) { top = sc; topSi = si; }
      });
      if (topSi < 0 || top <= 0) continue;
      const prev = best.get(ex.exId);
      if (prev !== undefined && top > prev + 1e-9) prs.push({ exId: ex.exId, si: topSi, type, score: top, set: ex.sets[topSi] });
      if (prev === undefined || top > prev) best.set(ex.exId, top);
    }
    out.set(w.id, prs);
  }
  return out;
}

/** Best work-set score for an exercise across saved workouts (undefined if never done). */
export function bestScore(exId, excludeId) {
  const type = exById(exId).type;
  let best;
  for (const w of state.workouts) {
    if (w.id === excludeId) continue;
    for (const ex of w.exercises) {
      if (ex.exId !== exId) continue;
      for (const s of ex.sets) if (isWorkSet(s)) { const sc = setScore(type, s); if (best === undefined || sc > best) best = sc; }
    }
  }
  return best;
}

export function exerciseSessions(exId) {
  const out = [];
  for (const w of state.workouts) {
    const ex = w.exercises.find((e) => e.exId === exId);
    if (ex && ex.sets.some((s) => s.done)) out.push({ w, ex });
  }
  return out.sort((a, b) => a.w.start - b.w.start);
}

export function lastSession(exId, excludeId) {
  let best = null;
  for (const w of state.workouts) {
    if (w.id === excludeId) continue;
    const ex = w.exercises.find((e) => e.exId === exId);
    if (ex && ex.sets.some((s) => s.done) && (!best || w.start > best.w.start)) best = { w, ex };
  }
  return best;
}

// ---------- Weeks, streaks, calendar ----------
export const weekOf = (t) => startOfWeek(t, state.settings.weekStart);
export function workoutsInWeek(t = Date.now()) {
  const ws = weekOf(t), we = addDays(ws, 7);
  return state.workouts.filter((w) => w.start >= ws && w.start < we);
}
export function streakWeeks() {
  const weeks = new Set(state.workouts.map((w) => weekOf(w.start)));
  let wk = weekOf(Date.now());
  if (!weeks.has(wk)) wk = addDays(wk, -7);
  let n = 0;
  while (weeks.has(wk)) { n++; wk = addDays(wk, -7); }
  return n;
}
export function dayCounts() {
  const m = new Map();
  for (const w of state.workouts) { const d = startOfDay(w.start); m.set(d, (m.get(d) || 0) + 1); }
  return m;
}

// ---------- Workouts ----------
export function defaultWorkoutName() {
  const h = new Date().getHours();
  return h < 5 ? 'Night Workout' : h < 12 ? 'Morning Workout' : h < 17 ? 'Afternoon Workout' : 'Evening Workout';
}

export function newExEntry(exId, setsCount, targetReps) {
  const last = lastSession(exId);
  const lastSets = last ? last.ex.sets.filter((s) => s.done) : [];
  const n = setsCount || lastSets.length || 3;
  const sets = Array.from({ length: n }, (_, i) => blankSet(!setsCount && lastSets[i] ? lastSets[i].kind : 'n'));
  return { exId, notes: '', target: targetReps || null, sets };
}

export function startWorkout({ name, items = [], routineId = null } = {}) {
  state.active = {
    id: uid(), name: name || defaultWorkoutName(), start: Date.now(), routineId, notes: '',
    exercises: items.map((it) => newExEntry(it.exId, it.sets, it.reps)),
  };
  save();
}

export function editWorkout(id) {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) return;
  state.active = { ...JSON.parse(JSON.stringify(w)), editing: true };
  save();
}

/** Save the active workout. Returns {workout, prs} or null when nothing was completed. */
export function finishActive() {
  const a = state.active;
  const exercises = a.exercises
    .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.done) }))
    .filter((ex) => ex.sets.length);
  if (!exercises.length) return null;
  const { editing, restEnd, restTotal, ...rest } = a;
  const workout = { ...rest, exercises, end: editing ? a.end : Date.now() };
  if (editing) {
    const i = state.workouts.findIndex((w) => w.id === a.id);
    if (i >= 0) state.workouts[i] = workout; else state.workouts.push(workout);
  } else state.workouts.push(workout);
  state.active = null;
  save();
  return { workout, prs: prIndex().get(workout.id) || [] };
}

export function routineLastDone(rid) {
  let t = 0;
  for (const w of state.workouts) if (w.routineId === rid && w.start > t) t = w.start;
  return t;
}
export function nextRoutine() {
  if (!state.routines.length) return null;
  return state.routines.slice().sort((a, b) => routineLastDone(a.id) - routineLastDone(b.id))[0];
}

export function addProgram(pid) {
  const p = PROGRAMS.find((x) => x.id === pid);
  if (!p) return [];
  const added = p.routines.map((r) => ({
    id: uid(), name: r.name, program: p.id,
    items: r.items.map(([name, sets, reps]) => ({ exId: ensureExercise(name), sets, reps })),
  }));
  state.routines.push(...added);
  save();
  return added;
}

// ---------- Backup ----------
export function exportJSON() {
  return JSON.stringify({ app: 'ironlog', v: 2, exportedAt: new Date().toISOString(), data: state });
}
export function importJSON(text) {
  const d = JSON.parse(text);
  let s;
  if (d && d.app === 'ironlog' && d.v === 2 && d.data) s = normalize(d.data);
  else if (d && Array.isArray(d.workouts) && Array.isArray(d.exercises)) s = migrateV1(d);
  else throw new Error('Not an IronLog backup');
  s.settings.onboarded = true;
  state = s;
  save();
  return s;
}
export function exportCSV() {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Date', 'Workout', 'Exercise', 'Set', 'Type', `Weight (${wUnit()})`, 'Reps', 'Seconds', `Distance (${dUnit()})`, 'RPE'].map(q).join(',')];
  for (const w of state.workouts.slice().sort((a, b) => a.start - b.start)) {
    for (const ex of w.exercises) {
      ex.sets.forEach((s, i) => {
        rows.push([new Date(w.start).toISOString().slice(0, 16).replace('T', ' '), w.name, exById(ex.exId).name, i + 1,
          { n: 'Normal', w: 'Warm-up', d: 'Drop', f: 'Failure' }[s.kind] || 'Normal',
          s.w != null ? fmtNum(kgToDisp(s.w), 2) : '', s.r ?? '', s.t ?? '', s.d != null ? fmtNum(kmToDisp(s.d), 2) : '', s.rpe ?? ''].map(q).join(','));
      });
    }
  }
  return rows.join('\n');
}
