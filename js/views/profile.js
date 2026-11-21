// Profile: avatar, bio, streak rosette, dot heatmap, and Feed / Stats / Advanced tabs.
import { state, save, weekOf, prIndex, workoutStats, kgToDisp, wUnit } from '../store.js';
import { gymDaySet } from '../attend.js';
import { fromYmd } from '../util.js';
const gymDayCounts = () => new Map([...gymDaySet()].map((d) => [fromYmd(d), 1]));
import { AVATARS } from '../data.js';
import { streakBadge, badgeCollection, badgeTotal, totalVolume } from '../gamify.js';
import { rosette, dotHeatmap } from '../art.js';
import { esc, fmtNum, fmtDur, handleOf, addDays } from '../util.js';
import { icon, on, rerender, openSheet, closeSheet, toast, actionSheet } from '../ui.js';
import { barChart } from '../charts.js';
import { pickImage, resize } from '../photos.js';
import { localPost, postHTML, hydratePhotos } from './feed.js';
import { challengesHTML, badgesHTML, milestonesHTML, strengthHTML } from './achieve.js';
import { cloudEnabled, crewCache, queueProfile, flush } from '../cloud.js';

let ptab = 'feed', stab = 'challenges', atab = 'strength', feedLimit = 15;

function avatarBig(p) {
  return p.photo ? `<img src="${esc(p.photo)}" alt="">` : esc(p.avatar || '💪');
}

function feedTab() {
  const ws = state.workouts.slice().sort((a, b) => b.start - a.start);
  if (!ws.length) return '<div class="card center"><p class="muted" style="margin:0">Your finished workouts show up here as posts.</p><button class="btn primary mt" data-act="go" data-tab="train">Start training</button></div>';
  const idx = prIndex();
  return `<div class="row-flex between" style="margin-bottom:2px"><span class="muted" style="font-size:14px;font-weight:700">${ws.length} workouts</span><button class="link" data-act="open-streak">${icon('calendar')} Calendar</button></div>
    ${ws.slice(0, feedLimit).map((w) => postHTML(localPost(w, (idx.get(w.id) || []).length))).join('')}
    ${ws.length > feedLimit ? '<button class="btn block mt" data-act="feed-more">Show more</button>' : ''}`;
}

function statsTab() {
  const sub = `<div class="subtabs">${[['challenges', 'Challenges'], ['badges', 'Badges'], ['volume', 'Volume']].map(([k, l]) => `<button class="${k === stab ? 'on' : ''}" data-act="stab" data-k="${k}">${l}</button>`).join('')}</div>`;
  if (stab === 'challenges') return `${sub}<div class="sec" style="margin-top:4px"><h2>Weekly challenges</h2></div>${challengesHTML()}`;
  if (stab === 'badges') return `${sub}${badgesHTML()}`;
  const tot = state.workouts.reduce((a, w) => { const s = workoutStats(w); a.sets += s.sets; a.reps += s.reps; a.dur += s.dur; return a; }, { sets: 0, reps: 0, dur: 0 });
  return `${sub}
    <div class="stat-grid">
      <div class="stat-card"><span>${icon('weight')}Total lifted</span><strong>${Math.round(kgToDisp(totalVolume())).toLocaleString()} <small>${wUnit()}</small></strong></div>
      <div class="stat-card"><span>${icon('layers')}Sets · reps</span><strong>${tot.sets.toLocaleString()} <small>· ${tot.reps.toLocaleString()}</small></strong></div>
      <div class="stat-card"><span>${icon('clock')}Time trained</span><strong>${fmtDur(tot.dur)}</strong></div>
      <div class="stat-card"><span>${icon('trophy')}PRs</span><strong>${[...prIndex().values()].reduce((a, l) => a + l.length, 0)}</strong></div>
    </div>
    <div class="card mt"><div class="card-title"><h3>Volume per week</h3><span class="muted" style="font-size:13px">${wUnit()}</span></div><canvas class="chart sm" id="pf-vol"></canvas></div>`;
}

function advancedTab() {
  const sub = `<div class="subtabs">${[['strength', 'Strength'], ['milestones', 'Milestones']].map(([k, l]) => `<button class="${k === atab ? 'on' : ''}" data-act="atab" data-k="${k}">${l}</button>`).join('')}</div>`;
  return sub + (atab === 'strength' ? strengthHTML() : milestonesHTML(totalVolume()));
}

export function renderProfile(root) {
  const p = state.profile, sb = streakBadge(), badges = badgeTotal(badgeCollection());
  const crewN = cloudEnabled() ? Math.max(1, crewCache().members.length) : 1;
  const prs = [...prIndex().values()].reduce((a, l) => a + l.length, 0);
  root.innerHTML = `
    <header class="appbar center"><span></span><div class="wordmark">${icon('dumbbell')}IronLog</div>
      <button class="icon-btn plain" data-act="go" data-tab="settings" aria-label="Settings">${icon('gear')}</button></header>
    <div class="pf-top">
      <button class="pf-avatar" data-act="edit-profile" aria-label="Edit profile">${avatarBig(p)}</button>
      <div class="pf-top-right"><span class="pf-count"><b>${state.workouts.length}</b> workouts</span><button class="pill" data-act="edit-profile">Edit</button></div>
    </div>
    <div class="pf-id">
      <div class="grow">
        <h2>${esc(p.name || 'Athlete')}</h2>
        <div class="pf-handle">@${esc(p.handle || handleOf(p.name) || 'athlete')}</div>
        ${p.bio ? `<p class="pf-bio">${esc(p.bio)}</p>` : '<p class="pf-bio muted" style="font-size:14px">Add a bio with Edit.</p>'}
        <div class="pf-follow"><span><b>${crewN}</b>Crew</span><span><b>${badges}</b>Badges</span><span><b>${prs}</b>PRs</span></div>
      </div>
      <button class="pf-badge" data-act="open-streak" aria-label="Gym streak">${rosette(sb.roman, 96, sb.level === 0)}<span>${sb.days} day streak</span></button>
    </div>
    <div data-act="open-streak" role="button" style="cursor:pointer">${dotHeatmap(gymDayCounts(), weekOf(Date.now()), state.settings.weekStart, 20)}</div>
    <div class="utabs">${[['feed', 'Feed'], ['stats', 'Stats'], ['advanced', 'Advanced']].map(([k, l]) => `<button class="${k === ptab ? 'on' : ''}" data-act="ptab" data-k="${k}">${l}</button>`).join('')}</div>
    <div id="pf-body">${ptab === 'feed' ? feedTab() : ptab === 'stats' ? statsTab() : advancedTab()}</div>`;
  if (ptab === 'feed') hydratePhotos(root);
  const cv = root.querySelector('#pf-vol');
  if (cv) {
    const cur = weekOf(Date.now());
    const bars = Array.from({ length: 12 }, (_, i) => {
      const ws = addDays(cur, -(11 - i) * 7), we = addDays(ws, 7);
      const v = state.workouts.filter((w) => w.start >= ws && w.start < we).reduce((a, w) => a + workoutStats(w).vol, 0);
      return { label: i % 3 === 2 || i === 11 ? new Date(ws).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : '', value: kgToDisp(v), hi: i === 11 };
    });
    barChart(cv, bars, { fmt: (v) => (v >= 1000 ? `${fmtNum(v / 1000, 1)}k` : String(Math.round(v))) });
  }
}

on('ptab', (el) => { ptab = el.dataset.k; rerender(); });
on('stab', (el) => { stab = el.dataset.k; rerender(); });
on('atab', (el) => { atab = el.dataset.k; rerender(); });
on('feed-more', () => { feedLimit += 15; rerender(); });
export function showAdvanced(tab) { ptab = 'advanced'; atab = tab; }
export function showStats(tab) { ptab = 'stats'; stab = tab; }

on('edit-profile', () => {
  const p = state.profile;
  const d = { name: p.name || '', handle: p.handle || handleOf(p.name), bio: p.bio || '', avatar: p.avatar || '💪', photo: p.photo || '' };
  const body = openSheet('', { cls: 'tall' });
  const draw = () => {
    body.innerHTML = `
      <div class="sheet-head"><h2>Edit profile</h2><button class="btn primary sm" id="pf-save">Save</button></div>
      <div class="center"><button class="pf-avatar" id="pf-pic" style="margin:0 auto">${d.photo ? `<img src="${esc(d.photo)}" alt="">` : esc(d.avatar)}</button>
        <button class="link" id="pf-pic2" style="margin-top:6px">${icon('camera')} ${d.photo ? 'Change photo' : 'Add photo'}</button></div>
      <div class="col mt">
        <label class="field"><span>Name</span><input class="input" id="pf-name" value="${esc(d.name)}" maxlength="30" placeholder="Your name"></label>
        <label class="field"><span>Username</span><input class="input" id="pf-handle" value="${esc(d.handle)}" maxlength="24" placeholder="username" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
        <label class="field"><span>Bio</span><textarea class="input" id="pf-bio" maxlength="160" placeholder="If in doubt, spam lateral raises">${esc(d.bio)}</textarea></label>
        ${d.photo ? '' : `<div class="field"><span>Or pick an avatar</span><div class="avatar-grid" id="pf-av">${AVATARS.map((a) => `<button data-av="${a}" class="${a === d.avatar ? 'on' : ''}">${a}</button>`).join('')}</div></div>`}
      </div>`;
    const sync = () => {
      d.name = body.querySelector('#pf-name').value;
      d.handle = body.querySelector('#pf-handle').value;
      d.bio = body.querySelector('#pf-bio').value;
    };
    const photo = () => {
      sync();
      const choose = async () => { const img = await pickImage(); if (img) { d.photo = resize(img, { max: 256, square: true, quality: 0.82 }); draw(); } };
      if (!d.photo) { choose(); return; }
      actionSheet('Profile photo', [
        { label: 'Choose a new photo', icon: 'camera', run: choose },
        { label: 'Remove photo', icon: 'trash', danger: true, run: () => { d.photo = ''; draw(); } },
      ]);
    };
    body.querySelector('#pf-pic').onclick = photo;
    body.querySelector('#pf-pic2').onclick = photo;
    body.querySelector('#pf-av')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-av]');
      if (!b) return;
      sync(); d.avatar = b.dataset.av; draw();
    });
    body.querySelector('#pf-save').onclick = () => {
      sync();
      Object.assign(state.profile, {
        name: d.name.trim().slice(0, 30), handle: handleOf(d.handle) || handleOf(d.name), bio: d.bio.trim().slice(0, 160),
        avatar: d.avatar, photo: d.photo,
      });
      if (!save()) { toast('Photo too big to save. Try another.', 'info'); return; }
      queueProfile(); flush();
      closeSheet(); rerender(); toast('Profile saved', 'check');
    };
  };
  draw();
});
