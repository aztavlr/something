// Gym streak: current/best streak, check-in, month calendar of gym / missed / rest days, all months, training days.
import { state, save, exById } from '../store.js';
import { esc, ymd, fromYmd, fmtDate, fmtTime, startOfDay } from '../util.js';
import { icon, on, rerender, go, openSheet, closeSheet, toast, buzz, app } from '../ui.js';
import { confetti } from '../charts.js';
import { ctx, statusOf, streaks, monthStats, setDay, checkInToday, trainDays, weekStrip } from '../attend.js';

let viewMonth = null, backTab = 'home';
const LABEL = { gym: 'Gym day', missed: 'Missed', rest: 'Rest day', excused: 'Excused', today: 'Today', future: '', before: 'Before you started' };
const MARK = { gym: '✓', missed: '✕', excused: '–' };
const monthStart = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const shift = (t, n) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth() + n, 1).getTime(); };
const dowNames = (ws) => Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + ((i + ws) % 7)).toLocaleDateString(undefined, { weekday: 'narrow' }));

function monthGrid(ms, c, { mini = false } = {}) {
  const ws = state.settings.weekStart ?? 1, d0 = new Date(ms);
  const lead = (d0.getDay() - ws + 7) % 7, n = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
  let cells = mini ? '' : dowNames(ws).map((x) => `<span class="cal-dow">${x}</span>`).join('');
  for (let i = 0; i < lead; i++) cells += '<span></span>';
  for (let day = 1; day <= n; day++) {
    const t = new Date(d0.getFullYear(), d0.getMonth(), day).getTime(), s = statusOf(t, c);
    cells += mini
      ? `<i class="mday s-${s}"></i>`
      : `<button class="sday s-${s}" data-act="day" data-d="${ymd(t)}" ${s === 'future' ? 'disabled' : ''} aria-label="${esc(fmtDate(t))}: ${LABEL[s]}"><span>${day}</span>${MARK[s] ? `<em>${MARK[s]}</em>` : ''}</button>`;
  }
  return `<div class="${mini ? 'mgrid' : 'sgrid'}">${cells}</div>`;
}

export function streakCard(c = ctx()) {
  const s = streaks(c), strip = weekStrip(c);
  const today = startOfDay(Date.now());
  return `
    <div class="card streak-card" data-act="open-streak" role="button" tabindex="0">
      <div class="sc-top">
        <span class="sc-flame ${s.current ? '' : 'cold'}">🔥</span>
        <div class="grow"><b class="sc-num">${s.current}</b><span class="sc-lab">day gym streak</span></div>
        <div class="sc-best"><b>${s.best}</b><span>best</span></div>
      </div>
      <div class="week-strip">${strip.map((d) => `<div class="ws-day"><span>${new Date(d.t).toLocaleDateString(undefined, { weekday: 'narrow' })}</span><i class="wsd s-${d.status} ${d.t === today ? 'is-today' : ''}">${MARK[d.status] || ''}</i></div>`).join('')}</div>
    </div>
    ${s.todayDone ? `<div class="checked-in">${icon('check')} You hit the gym today. Streak safe!</div>`
      : `<button class="btn primary block" data-act="checkin">${icon('check')} I went to the gym today</button>`}`;
}

export function renderStreak(root) {
  const c = ctx(), s = streaks(c);
  if (viewMonth == null) viewMonth = monthStart(Date.now());
  const ms = monthStats(new Date(viewMonth).getFullYear(), new Date(viewMonth).getMonth(), c);
  const plan = new Set(trainDays()), ws = state.settings.weekStart ?? 1;
  const months = [];
  for (let m = monthStart(Date.now()); m >= monthStart(c.start); m = shift(m, -1)) months.push(m);
  root.innerHTML = `
    <header class="appbar center"><button class="icon-btn plain" data-act="streak-back" aria-label="Back">${icon('left')}</button><h1 style="font-size:22px">Gym streak</h1>
      <button class="icon-btn plain" data-act="go" data-tab="history" aria-label="All workouts" style="justify-self:end">${icon('list')}</button></header>
    <div class="streak-hero">
      <div class="sh-flame ${s.current ? '' : 'cold'}">🔥</div>
      <div class="sh-num">${s.current}</div>
      <div class="sh-lab">day streak</div>
      <div class="sh-stats"><span><b>${s.best}</b>Best</span><span><b>${s.gymDays}</b>Gym days</span><span><b>${s.missed}</b>Missed</span></div>
    </div>
    ${s.todayDone ? `<div class="checked-in">${icon('check')} Checked in today</div>` : `<button class="btn primary block" data-act="checkin">${icon('check')} I went to the gym today</button>`}
    <div class="card mt-lg">
      <div class="cal-head">
        <button class="icon-btn plain" data-act="smonth" data-d="-1" aria-label="Previous month" ${viewMonth <= monthStart(c.start) ? 'disabled style="opacity:.3"' : ''}>${icon('left')}</button>
        <h3>${esc(new Date(viewMonth).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))}</h3>
        <button class="icon-btn plain" data-act="smonth" data-d="1" aria-label="Next month" ${viewMonth >= monthStart(Date.now()) ? 'disabled style="opacity:.3"' : ''}>${icon('right')}</button>
      </div>
      ${monthGrid(viewMonth, c)}
      <div class="cal-sum">
        <div><strong class="gold">${ms.gym}</strong><span>Gym days</span></div>
        <div><strong style="color:var(--danger)">${ms.missed}</strong><span>Missed</span></div>
        <div><strong>${ms.pct == null ? '–' : `${ms.pct}%`}</strong><span>Attendance</span></div>
      </div>
      <div class="legend"><span><i class="lg s-gym"></i>Gym</span><span><i class="lg s-missed"></i>Missed</span><span><i class="lg s-rest"></i>Rest</span><span><i class="lg s-excused"></i>Excused</span></div>
      <p class="muted center" style="font-size:12.5px;margin:10px 0 0">Tap a day to check in, or excuse it (sick, travel).</p>
    </div>
    <div class="group-label">Training days</div>
    <div class="card">
      <div class="dow-pick">${Array.from({ length: 7 }, (_, i) => (i + ws) % 7).map((d) => `<button class="${plan.has(d) ? 'on' : ''}" data-act="tday" data-d="${d}">${new Date(2023, 0, 1 + d).toLocaleDateString(undefined, { weekday: 'short' })}</button>`).join('')}</div>
      <p class="muted" style="font-size:13.5px;margin:10px 0 0">Skipping a training day breaks your streak. Rest days never do, and a workout on a rest day still counts.</p>
    </div>
    <div class="group-label">Every month</div>
    <div class="col">${months.map((m) => { const st = monthStats(new Date(m).getFullYear(), new Date(m).getMonth(), c); return `
      <button class="card wcard month-card" data-act="goto-month" data-m="${m}">
        <div class="row-flex between"><b>${esc(new Date(m).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))}</b>
          <span class="muted" style="font-size:13px"><span class="gold">${st.gym} gym</span> · <span style="color:var(--danger)">${st.missed} missed</span>${st.pct == null ? '' : ` · ${st.pct}%`}</span></div>
        ${monthGrid(m, c, { mini: true })}
      </button>`; }).join('')}</div>`;
}

on('open-streak', () => { if (app.tab !== 'streak') backTab = app.tab; go('streak'); });
on('streak-back', () => go(backTab || 'home'));
on('smonth', (el) => { viewMonth = shift(viewMonth, +el.dataset.d); rerender(); });
on('goto-month', (el) => { viewMonth = +el.dataset.m; rerender(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
on('tday', (el) => {
  const d = +el.dataset.d, cur = new Set(trainDays());
  if (cur.has(d)) cur.delete(d); else cur.add(d);
  if (!cur.size) { toast('Pick at least one training day', 'info'); return; }
  state.settings.trainDays = [...cur].sort();
  save(); rerender();
});
on('checkin', () => {
  const before = streaks().current;
  checkInToday();
  buzz([20, 40, 20]);
  const after = streaks().current;
  if (after > before && [3, 7, 14, 30, 50, 100, 200, 365].includes(after)) confetti();
  toast(`Checked in! ${after}-day streak 🔥`, 'check');
  rerender();
});

on('day', (el) => {
  const d = el.dataset.d, c = ctx(), t = fromYmd(d);
  const s = statusOf(t, c), checked = (state.checkins || []).includes(d);
  const ws = state.workouts.filter((w) => ymd(w.start) === d);
  const body = openSheet(`
    <div class="sheet-head"><div><h2>${esc(fmtDate(t, { weekday: 'long', month: 'long', day: 'numeric' }))}</h2>
      <div class="muted" style="font-size:14px;margin-top:2px">${LABEL[s] || ''}${checked && !ws.length ? ' · checked in' : ''}</div></div></div>
    ${ws.length ? `<div class="list">${ws.map((w) => `<button class="row" data-act="open-workout" data-id="${w.id}"><span class="row-ic">${icon('dumbbell')}</span><span class="row-main"><div class="row-title">${esc(w.name)}</div><div class="row-sub">${esc(fmtTime(w.start))} · ${w.exercises.map((x) => exById(x.exId).name).slice(0, 3).map(esc).join(', ')}</div></span>${icon('right', 'chev')}</button>`).join('')}</div>` : ''}
    <div class="col mt">
      ${s !== 'gym' ? `<button class="btn primary block" data-x="gym">${icon('check')} I went to the gym this day</button>` : ''}
      ${checked && !ws.length ? `<button class="btn block" data-x="clear">${icon('x')} Remove check-in</button>` : ''}
      ${s === 'missed' || s === 'today' ? `<button class="btn block" data-x="excuse">Excuse this day (sick, travel…)</button>` : ''}
      ${s === 'excused' ? `<button class="btn block" data-x="clear">Undo excuse</button>` : ''}
      ${ws.length && s === 'gym' ? '<p class="muted center" style="font-size:13px;margin:0">Workouts always count as gym days.</p>' : ''}
    </div>`);
  body.addEventListener('click', (e) => {
    const x = e.target.closest('[data-x]');
    if (!x) return;
    setDay(d, x.dataset.x);
    closeSheet();
    rerender();
    toast(x.dataset.x === 'gym' ? 'Marked as a gym day' : x.dataset.x === 'excuse' ? 'Day excused' : 'Updated', 'check');
  });
});
