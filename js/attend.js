// Gym attendance: check-ins, training days, day-by-day status, streaks.
// A "gym day" is any day with a logged workout or a check-in.
// A "missed" day is a past training day with no gym visit (and not excused).
// Rest days never break the streak; a missed training day resets it.
import { state, save } from './store.js';
import { ymd, fromYmd, startOfDay, addDays } from './util.js';

const PLANS = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] };
/** Weekdays you plan to train (0 = Sunday … 6 = Saturday). */
export const trainDays = () => {
  const t = state.settings.trainDays;
  return Array.isArray(t) && t.length ? t : PLANS[state.settings.weeklyGoal || 3] || PLANS[3];
};

export function gymDaySet() {
  const s = new Set(state.checkins || []);
  for (const w of state.workouts) s.add(ymd(w.start));
  return s;
}

/** Shared context for status lookups (build once per render). */
export function ctx() {
  const gym = gymDaySet();
  let start = startOfDay(state.profile.created || Date.now());
  for (const d of gym) { const t = fromYmd(d); if (t < start) start = t; }
  return { gym, excused: new Set(state.excused || []), plan: new Set(trainDays()), today: startOfDay(Date.now()), start };
}

/** 'gym' | 'missed' | 'rest' | 'excused' | 'today' | 'future' | 'before' */
export function statusOf(t, c) {
  const d = ymd(t);
  if (t > c.today) return 'future';
  if (c.gym.has(d)) return 'gym';
  if (t < c.start) return 'before';
  if (c.excused.has(d)) return 'excused';
  const planned = c.plan.has(new Date(t).getDay());
  if (t === c.today) return planned ? 'today' : 'rest';
  return planned ? 'missed' : 'rest';
}

export function streaks(c = ctx()) {
  let current = 0, best = 0, gymDays = 0, missed = 0;
  for (let t = c.start; t <= c.today; t = addDays(t, 1)) {
    const s = statusOf(t, c);
    if (s === 'gym') { current++; gymDays++; if (current > best) best = current; }
    else if (s === 'missed') { current = 0; missed++; }
  }
  return {
    current, best, gymDays, missed,
    todayDone: c.gym.has(ymd(c.today)), todayPlanned: c.plan.has(new Date(c.today).getDay()),
  };
}

export function monthStats(year, month, c = ctx()) {
  let gym = 0, missed = 0, excused = 0;
  const n = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= n; d++) {
    const s = statusOf(new Date(year, month, d).getTime(), c);
    if (s === 'gym') gym++; else if (s === 'missed') missed++; else if (s === 'excused') excused++;
  }
  return { gym, missed, excused, pct: gym + missed ? Math.round((100 * gym) / (gym + missed)) : null };
}

/** kind: 'gym' (check in), 'excuse' (sick/travel: doesn't break the streak), 'clear' */
export function setDay(d, kind) {
  const ci = new Set(state.checkins || []), ex = new Set(state.excused || []);
  if (kind === 'gym') { ci.add(d); ex.delete(d); }
  else if (kind === 'excuse') { ex.add(d); ci.delete(d); }
  else { ci.delete(d); ex.delete(d); }
  state.checkins = [...ci].sort();
  state.excused = [...ex].sort();
  save();
}
export const checkInToday = () => setDay(ymd(Date.now()), 'gym');

/** Days in the current week (respecting week start) with their status. */
export function weekStrip(c = ctx()) {
  const ws = state.settings.weekStart ?? 1;
  const back = (new Date(c.today).getDay() - ws + 7) % 7;
  const first = addDays(c.today, -back);
  return Array.from({ length: 7 }, (_, i) => { const t = startOfDay(addDays(first, i)); return { t, status: statusOf(t, c) }; });
}
