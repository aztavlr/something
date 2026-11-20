// Gamification logic: weekly challenges, badge collection, streak level, landmark milestones, strength standards.
import { state, exById, workoutStats, prIndex, weekOf, streakWeeks, e1rm, isWorkSet } from './store.js';
import { addDays } from './util.js';
import { LANDMARKS, WEEK_TIERS, CHALLENGES, STANDARDS } from './gamedata.js';

const C = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));
export const totalVolume = () => state.workouts.reduce((a, w) => a + workoutStats(w).vol, 0);

function weekData(ws, idx) {
  const we = addDays(ws, 7);
  const list = state.workouts.filter((w) => w.start >= ws && w.start < we);
  let vol = 0, reps = 0, pr = false, early = false;
  const groups = new Set();
  for (const w of list) {
    const st = workoutStats(w);
    vol += st.vol;
    reps += st.reps;
    for (const ex of w.exercises) {
      const mu = exById(ex.exId).muscle;
      if (mu !== 'Cardio' && mu !== 'Other' && ex.sets.some((s) => s.done)) groups.add(mu);
    }
    if ((idx.get(w.id) || []).length) pr = true;
    if (new Date(w.start).getHours() < 8) early = true;
  }
  return { count: list.length, vol, reps, groups: groups.size, pr, early };
}

export const tierFor = (kg) => WEEK_TIERS.filter((x) => kg >= x.kg).pop() || null;
export const nextTier = (kg) => WEEK_TIERS.find((x) => kg < x.kg) || null;

/** This week's challenges with progress. Volume values are in kg. */
export function weekChallenges(t = Date.now()) {
  const d = weekData(weekOf(t), prIndex());
  const goal = state.settings.weeklyGoal || 3;
  const cur = tierFor(d.vol), nxt = nextTier(d.vol), show = nxt || cur;
  return [
    { id: 'vol', name: `${show.name} Week`, emoji: show.emoji, color: show.color, kind: 'kg', value: d.vol, target: show.kg, done: !nxt, earned: cur },
    { ...C.goal, desc: `Do ${goal} workout${goal > 1 ? 's' : ''}`, value: d.count, target: goal, done: d.count >= goal },
    { ...C.pr, desc: 'Set a new personal record', value: d.pr ? 1 : 0, target: 1, done: d.pr },
    { ...C.muscles, desc: 'Train 5 muscle groups', value: d.groups, target: 5, done: d.groups >= 5 },
    { ...C.reps, desc: 'Log 500 reps', value: d.reps, target: 500, done: d.reps >= 500 },
    { ...C.early, desc: 'Start a workout before 8 am', value: d.early ? 1 : 0, target: 1, done: d.early },
  ];
}

/** Every badge earned in past and current weeks: [{key, name, emoji, color, count, last, kg?}] newest first */
export function badgeCollection() {
  const idx = prIndex(), goal = state.settings.weeklyGoal || 3, counts = {};
  const add = (key, b, ws) => {
    const c = counts[key] || (counts[key] = { ...b, key, count: 0, last: 0 });
    c.count++;
    c.last = Math.max(c.last, ws);
  };
  for (const ws of new Set(state.workouts.map((w) => weekOf(w.start)))) {
    const d = weekData(ws, idx);
    const tier = tierFor(d.vol);
    if (tier) add(`tier:${tier.name}`, { name: `${tier.name} Week`, emoji: tier.emoji, color: tier.color, kg: tier.kg }, ws);
    if (d.count >= goal) add('goal', C.goal, ws);
    if (d.pr) add('pr', C.pr, ws);
    if (d.groups >= 5) add('muscles', C.muscles, ws);
    if (d.reps >= 500) add('reps', C.reps, ws);
    if (d.early) add('early', C.early, ws);
  }
  return Object.values(counts).sort((a, b) => b.last - a.last || b.count - a.count);
}
export const badgeTotal = (list = badgeCollection()) => list.reduce((a, b) => a + b.count, 0);

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];
export function streakBadge(weeks = streakWeeks()) {
  const steps = [1, 4, 8, 16, 26, 52];
  const level = steps.filter((n) => weeks >= n).length;
  return { weeks, level, roman: ROMAN[level], next: steps[level] || null };
}

export function milestoneInfo(total = totalVolume()) {
  const done = LANDMARKS.filter((l) => total >= l.kg);
  const next = LANDMARKS.find((l) => total < l.kg) || null;
  return { total, done, next, pct: next ? total / next.kg : 1 };
}

// ---------- Strength standards ----------
export const levelOf = (score) => Math.max(0, Math.min(5, Math.floor(score / 20)));
function liftScore(v, t) {
  if (v <= 0) return 0;
  if (v < t[0]) return (20 * v) / t[0];
  for (let i = 0; i < 4; i++) if (v < t[i + 1]) return 20 * (i + 1) + (20 * (v - t[i])) / (t[i + 1] - t[i]);
  return Math.min(120, 100 + (20 * (v - t[4])) / (t[4] - t[3]));
}
export const bodyWeight = () => state.body.slice().sort((a, b) => b.t - a.t)[0]?.kg || 0;

/** {bw, sex, muscles: {muscle: {score, exId}}, lifts: [{exId, score, value, kind}], avg, level} */
export function strengthProfile() {
  const bw = bodyWeight(), sex = state.settings.sex || 'male';
  const res = { bw, sex, muscles: {}, lifts: [], avg: 0, level: -1 };
  if (!bw) return res;
  const best = {};
  for (const w of state.workouts) for (const ex of w.exercises) {
    const std = STANDARDS[ex.exId];
    if (!std) continue;
    for (const s of ex.sets) {
      if (!isWorkSet(s)) continue;
      let v = 0;
      if (std.w) v = e1rm(s.w || 0, s.r || 0) / bw;
      else if (std.reps) v = s.w ? 30 * (((bw + s.w) / bw) * (1 + (s.r || 0) / 30) - 1) : s.r || 0;
      else v = s.t || 0;
      if (v > (best[ex.exId] || 0)) best[ex.exId] = v;
    }
  }
  for (const [exId, v] of Object.entries(best)) {
    const std = STANDARDS[exId];
    let t = std.w || std.reps || std.secs;
    if (sex === 'female') t = t.map((x) => x * (std.w ? (std.upper ? 0.65 : 0.75) : std.upper ? 0.6 : 0.8));
    const score = liftScore(v, t);
    res.lifts.push({ exId, score, value: v, kind: std.w ? 'ratio' : std.reps ? 'reps' : 'secs' });
    for (const m of std.m) if (!res.muscles[m] || score > res.muscles[m].score) res.muscles[m] = { score, exId };
  }
  res.lifts.sort((a, b) => b.score - a.score);
  const ms = Object.values(res.muscles);
  if (ms.length) {
    res.avg = ms.reduce((a, m) => a + m.score, 0) / ms.length;
    res.level = levelOf(res.avg);
  }
  return res;
}
