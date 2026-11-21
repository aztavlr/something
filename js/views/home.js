// Home dashboard: weekly goal ring, streak, next routine, activity heatmap, muscle split, recent PRs.
import { state, workoutsInWeek, workoutStats, fmtVol, prIndex, exById, setText, nextRoutine, routineLastDone, weekOf, isWorkSet, kgToDisp, wUnit } from '../store.js';
import { MUSCLE_COLORS } from '../data.js';
import { esc, greeting, fmtRel, fmtDur, fmtClock, fmtDate } from '../util.js';
import { appbar, icon, on, rerender, go } from '../ui.js';
import { ring } from '../charts.js';
import { showInstallBanner, showInstallSheet } from '../gate.js';
import { weekChallenges, milestoneInfo, totalVolume } from '../gamify.js';
import { cloudEnabled, crewCache, me } from '../cloud.js';
import { avatarHTML, volText } from './feed.js';
import { showAdvanced, showStats } from './profile.js';
import { streakCard } from './streak.js';

function challengesCard() {
  const list = weekChallenges().sort((a, b) => a.done - b.done);
  const doneN = list.filter((c) => c.done).length;
  return `<div class="sec"><h2>Weekly challenges</h2><button class="link" data-act="open-challenges">${doneN}/${list.length} done</button></div>
    <div class="card" style="padding:4px 0">${list.slice(0, 3).map((c) => `
      <div class="chal ${c.done ? 'done' : ''}"><div class="chal-ic">${c.emoji}</div>
        <div class="chal-main"><b>${esc(c.name)}</b><span>${esc(c.desc || `Lift ${Math.round(kgToDisp(c.target)).toLocaleString()} ${wUnit()} this week`)}</span>
          <div class="bar"><i style="width:${Math.min(100, (c.value / c.target) * 100)}%"></i></div></div></div>`).join('')}</div>`;
}

function milestoneCard() {
  const mi = milestoneInfo(totalVolume());
  if (!mi.next) return '';
  const pct = Math.min(100, Math.floor(mi.pct * 100));
  return `<button class="card wcard mt" data-act="open-milestones" style="display:flex;align-items:center;gap:14px">
    <span style="font-size:40px">${mi.next.emoji}</span>
    <span class="grow"><span class="muted" style="font-size:12.5px;font-weight:800;letter-spacing:.06em">NEXT MILESTONE</span>
      <b style="display:block;font-size:17px">${esc(mi.next.name)}</b>
      <span class="bar" style="display:block"><i style="width:${pct}%"></i></span></span>
    <b class="gold" style="font-size:18px">${pct}%</b></button>`;
}

function crewCard() {
  if (!cloudEnabled()) return '';
  const wk = weekOf(Date.now()), c = crewCache();
  const list = c.members.filter((m) => m.id !== me().id).concat([{ ...state.profile, id: me().id, stats: { week: wk, weekVolume: workoutsInWeek().reduce((a, w) => a + workoutStats(w).vol, 0) }, me: true }]);
  const wv = (m) => (m.stats && m.stats.week === wk ? m.stats.weekVolume || 0 : 0);
  const top = list.sort((a, b) => wv(b) - wv(a)).slice(0, 3);
  return `<div class="sec"><h2>Crew this week</h2><button class="link" data-act="go" data-tab="crew">Leaderboard</button></div>
    <div class="list">${top.map((m, i) => `<button class="row" data-act="go" data-tab="crew"><span class="lb-rank medal-${i + 1}" style="width:18px">${i + 1}</span>${avatarHTML(m, 'sm')}
      <span class="row-main"><div class="row-title">${esc(m.name || 'Athlete')}${m.me ? ' <span class="muted">(you)</span>' : ''}</div></span><span class="row-end gold">${volText(wv(m))}</span></button>`).join('')}</div>`;
}

on('open-milestones', () => { showAdvanced('milestones'); go('profile'); });
on('open-challenges', () => { showStats('challenges'); go('profile'); });

const BANNER_KEY = 'ironlog:hideInstall';

export function muscleSets(workouts) {
  const m = {};
  for (const w of workouts) for (const ex of w.exercises) {
    const mu = exById(ex.exId).muscle;
    m[mu] = (m[mu] || 0) + ex.sets.filter(isWorkSet).length;
  }
  return Object.entries(m).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
}

export function muscleBars(entries) {
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return `<div class="mbars">${entries.map(([mu, n]) => `
    <div class="mbar"><span>${esc(mu)}</span><div class="mbar-track"><div class="mbar-fill" style="width:${(n / max) * 100}%;background:${MUSCLE_COLORS[mu] || 'var(--accent)'}"></div></div><b>${n}</b></div>`).join('')}</div>`;
}

function recentPRs(n) {
  const idx = prIndex(), out = [];
  for (const w of state.workouts) for (const p of idx.get(w.id) || []) out.push({ ...p, t: w.start });
  return out.sort((a, b) => b.t - a.t).slice(0, n);
}

export function renderHome(root) {
  const s = state.settings, p = state.profile;
  const week = workoutsInWeek(), goal = s.weeklyGoal || 3, done = week.length;
  const weekVol = week.reduce((a, w) => a + workoutStats(w).vol, 0);
  const weekTime = week.reduce((a, w) => a + ((w.end || w.start) - w.start), 0);
  const mStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const monthN = state.workouts.filter((w) => w.start >= mStart).length;
  const next = nextRoutine();
  const prs = recentPRs(5);
  const muscles = muscleSets(week);
  let hideBanner = false;
  try { hideBanner = !!localStorage.getItem(BANNER_KEY); } catch (e) { /* ignore */ }
  const first = (p.name || '').trim().split(/\s+/)[0];
  const goalMsg = done >= goal ? 'Weekly goal smashed! 🎉' : `${goal - done} more to hit your goal`;

  const live = state.active ? `
    <button class="live-banner" data-act="go" data-tab="train">
      <span class="live-dot"></span>
      <span class="grow"><strong>${esc(state.active.name)}</strong><span>${state.active.editing ? 'Editing' : `In progress · ${fmtClock((Date.now() - state.active.start) / 1000)}`}</span></span>
      ${icon('right', 'chev')}
    </button>` : '';

  const hero = state.active ? '' : next ? `
    <div class="hero-card">
      <div class="hero-kicker">Up next</div>
      <h2>${esc(next.name)}</h2>
      <p>${next.items.length} exercises${routineLastDone(next.id) ? ` · last done ${esc(fmtRel(routineLastDone(next.id)).toLowerCase())}` : ' · not done yet'}</p>
      <button class="btn block" data-act="start-routine" data-id="${next.id}">${icon('play')} Start workout</button>
    </div>` : `
    <div class="hero-card">
      <div class="hero-kicker">Ready when you are</div>
      <h2>Let's train 💪</h2>
      <p>Pick a ready-made program or jump straight into an empty workout.</p>
      <div class="btn-row"><button class="btn" data-act="programs">Programs</button><button class="btn" data-act="start-empty">Quick start</button></div>
    </div>`;

  root.innerHTML = `
    ${appbar(`${esc(greeting())}${first ? `, ${esc(first)}` : ''}`, `<button class="avatar sm" data-act="go" data-tab="profile" aria-label="Profile">${esc(p.avatar || '💪')}</button>`, esc(fmtDate(Date.now(), { weekday: 'long', month: 'long', day: 'numeric' })))}
    <div class="col">
      ${live}
      ${showInstallBanner() && !hideBanner ? `
        <div class="install-banner">
          <span class="row-ic">${icon('phone')}</span>
          <button class="grow" data-act="install-help" style="background:none;border:0;padding:0;text-align:left;color:inherit"><strong>Add to your home screen</strong><div class="muted" style="font-size:13.5px">Full-screen and works offline</div></button>
          <button class="icon-btn plain" data-act="hide-install" aria-label="Dismiss">${icon('x')}</button>
        </div>` : ''}
      ${streakCard()}
      <div class="card goal">
        ${ring(done / goal, { center: `${done}/${goal}`, sub: 'this week' })}
        <div class="goal-stats">
          <div class="goal-stat"><div class="gi fire">${icon('calendar')}</div><div><strong>${monthN} workout${monthN === 1 ? '' : 's'}</strong><span>This month</span></div></div>
          <div class="goal-stat"><div class="gi vol">${icon('weight')}</div><div><strong>${fmtVol(weekVol)}</strong><span>Lifted this week</span></div></div>
          <div class="goal-stat"><div class="gi time">${icon('clock')}</div><div><strong>${fmtDur(weekTime)}</strong><span>${esc(goalMsg)}</span></div></div>
        </div>
      </div>
      ${hero}
    </div>
    ${challengesCard()}
    ${milestoneCard()}
    ${crewCard()}
    <div class="sec"><h2>Sets this week</h2></div>
    <div class="card">${muscles.length ? muscleBars(muscles) : '<p class="muted" style="margin:0">Finish a workout to see which muscles you trained.</p>'}</div>
    <div class="sec"><h2>Recent PRs</h2>${prs.length ? '<button class="link" data-act="go" data-tab="progress">See progress</button>' : ''}</div>
    ${prs.length ? `<div class="list">${prs.map((x) => `
      <button class="row" data-act="open-exercise" data-id="${x.exId}">
        <span class="row-ic" style="background:rgba(251,191,36,.15);color:var(--gold)">${icon('trophy')}</span>
        <span class="row-main"><div class="row-title">${esc(exById(x.exId).name)}</div><div class="row-sub">${esc(setText(x.type, x.set))}</div></span>
        <span class="row-end">${esc(fmtRel(x.t))}</span>
      </button>`).join('')}</div>`
    : '<div class="card"><p class="muted" style="margin:0">Beat your best set on any exercise and it shows up here. 🏆</p></div>'}`;
}

on('install-help', () => showInstallSheet());
on('hide-install', () => { try { localStorage.setItem(BANNER_KEY, '1'); } catch (e) { /* ignore */ } rerender(); });
