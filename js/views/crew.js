// Crew tab: team header, leaderboard, crew feed with props, team milestones, member profiles.
import { state, weekOf } from '../store.js';
import { CONFIG } from '../config.js';
import { esc, fmtNum, fromYmd, agoText } from '../util.js';
import { icon, on, rerender, openSheet, toast } from '../ui.js';
import { dotHeatmap, bodyMap, rosette } from '../art.js';
import { streakBadge, levelOf } from '../gamify.js';
import { LEVELS } from '../gamedata.js';
import { cloudConfigured, cloudEnabled, crewCache, crewStale, pullCrew, me, myStats, toggleProp, cloudStatus } from '../cloud.js';
import { avatarHTML, cloudPost, postHTML, hydratePhotos, volText } from './feed.js';
import { milestonesHTML } from './achieve.js';

let ctab = 'leaderboard', metric = 'volume';
const METRICS = {
  volume: { label: 'Total volume', get: (s) => s.volume || 0, fmt: volText },
  week: { label: 'This week', get: (s) => (s.week === weekOf(Date.now()) ? s.weekVolume || 0 : 0), fmt: volText },
  workouts: { label: 'Workouts', get: (s) => s.workouts || 0, fmt: (n) => `${n}` },
  streak: { label: 'Week streak', get: (s) => s.streak || 0, fmt: (n) => `${n} wk` },
  strength: { label: 'Strength score', get: (s) => s.strength || 0, fmt: (n) => fmtNum(n, 1) },
  badges: { label: 'Badges', get: (s) => s.badges || 0, fmt: (n) => `${n}` },
};

/** Crew members from the cache, with this phone's member replaced by live local data. */
function members() {
  const c = crewCache(), id = me().id;
  const mine = { id, name: state.profile.name || 'You', handle: state.profile.handle, bio: state.profile.bio, avatar: state.profile.avatar, photo: state.profile.photo, stats: myStats(), me: true };
  return [mine, ...c.members.filter((m) => m.id !== id)];
}

function notSetUp(root) {
  root.innerHTML = `
    <header class="appbar"><div><h1>Crew</h1></div></header>
    <div class="card center">
      <div style="font-size:50px">🏆</div>
      <h3 style="margin:6px 0 6px;font-size:20px">Crew leaderboard is almost ready</h3>
      <p class="muted" style="margin:0 0 6px;line-height:1.5">${cloudConfigured() ? 'Unlock the app with your crew code to join the leaderboard.' : `Once the crew database is connected, you'll see a live leaderboard, your friends' workouts and team milestones here.`}</p>
    </div>
    <div class="group-label">You so far</div>
    ${leaderboardList([members()[0]])}`;
}

function leaderboardList(list) {
  const M = METRICS[metric];
  const sorted = list.slice().sort((a, b) => M.get(b.stats || {}) - M.get(a.stats || {}));
  return `<div>${sorted.map((m, i) => `
    <button class="lb-row ${m.me ? 'me' : ''}" data-act="member" data-id="${esc(m.id)}" style="width:100%;border:0;background:${m.me ? '' : 'none'};color:inherit;text-align:left">
      <span class="lb-rank ${i < 3 ? `medal-${i + 1}` : ''}">${i + 1}.</span>${avatarHTML(m)}
      <span class="lb-name">${esc(m.name || 'Athlete')}${m.me ? ' <span class="muted" style="font-size:13px">(you)</span>' : ''}</span>
      <span class="lb-val">${M.fmt(M.get(m.stats || {}))}</span>
    </button>`).join('')}</div>`;
}

export function renderCrew(root) {
  if (!cloudEnabled()) { notSetUp(root); return; }
  const c = crewCache(), list = members();
  const byVol = list.slice().sort((a, b) => (b.stats?.volume || 0) - (a.stats?.volume || 0));
  const top = [byVol[1], byVol[0], byVol[2]].filter(Boolean);
  const total = list.reduce((a, m) => a + (m.stats?.volume || 0), 0);
  let body = '';
  if (ctab === 'leaderboard') {
    body = `<div class="lb-pick"><select class="input" id="lb-metric" aria-label="Rank by">${Object.entries(METRICS).map(([k, v]) => `<option value="${k}" ${k === metric ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>${leaderboardList(list)}`;
  } else if (ctab === 'feed') {
    const byId = Object.fromEntries(list.map((m) => [m.id, m]));
    const posts = c.posts.slice().sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
    body = posts.length ? posts.map((p) => {
      const props = c.props.filter((x) => x.post_id === p.id);
      return postHTML(cloudPost(p, byId[p.member_id]), { props: { count: props.length, mine: props.some((x) => x.member_id === me().id) } });
    }).join('') : '<div class="card"><p class="muted" style="margin:0">No crew workouts yet. Finish a workout and it shows up here for everyone.</p></div>';
  } else {
    body = `${milestonesHTML(total, { title: 'Next crew milestone', who: 'Together you' })}
      <div class="group-label">Who lifted what</div>
      <div class="list">${byVol.map((m) => `<div class="row">${avatarHTML(m, 'sm')}<span class="row-main"><div class="row-title">${esc(m.name || 'Athlete')}</div>
        <div class="bar" style="margin-top:6px"><i style="width:${total ? ((m.stats?.volume || 0) / total) * 100 : 0}%"></i></div></span><span class="row-end gold">${total ? Math.round(((m.stats?.volume || 0) / total) * 100) : 0}%</span></div>`).join('')}</div>`;
  }
  root.innerHTML = `
    <header class="appbar center"><span></span><div class="wordmark">${icon('users')}Crew</div>
      <button class="icon-btn plain" data-act="crew-refresh" aria-label="Refresh">${icon('refresh')}</button></header>
    <div class="team-head">
      <div class="team-avs">${top.map((m) => avatarHTML(m, m === byVol[0] ? 'mid' : '')).join('')}</div>
      <h2>${esc(CONFIG.crewName)}</h2>
      <p>${list.length} member${list.length === 1 ? '' : 's'} · ${volText(total)} lifted</p>
    </div>
    <div class="utabs">${[['leaderboard', 'Leaderboard'], ['feed', 'Feed'], ['milestones', 'Milestones']].map(([k, l]) => `<button class="${k === ctab ? 'on' : ''}" data-act="ctab" data-k="${k}">${l}</button>`).join('')}</div>
    ${body}
    <div class="sync-note">${icon('refresh')}${esc(cloudStatus())}</div>`;
  root.querySelector('#lb-metric')?.addEventListener('change', (e) => { metric = e.target.value; rerender(); });
  if (ctab === 'feed') hydratePhotos(root);
  if (crewStale()) pullCrew();
}

on('ctab', (el) => { ctab = el.dataset.k; rerender(); });
on('crew-refresh', async () => {
  const ok = await pullCrew();
  toast(ok ? 'Crew updated' : `Couldn't sync: ${cloudStatus()}`, ok ? 'check' : 'info');
  rerender();
});
on('prop', async (el) => {
  try { await toggleProp(el.dataset.id); rerender(); }
  catch (e) { toast('Could not send props. Are you online?', 'info'); }
});

on('member', (el) => {
  const m = members().find((x) => x.id === el.dataset.id);
  if (!m) return;
  const s = m.stats || {};
  const days = new Map((s.days || []).map((d) => [fromYmd(d), 1]));
  const sb = streakBadge(s.streak || 0);
  const muscles = Object.fromEntries(Object.entries(s.muscles || {}).map(([k, v]) => [k, { score: v }]));
  openSheet(`
    <div class="pf-top" style="margin-top:0">${avatarHTML(m, 'lg')}
      <div class="grow"><h2 style="margin:0;font-size:22px">${esc(m.name || 'Athlete')}</h2><div class="pf-handle">@${esc(m.handle || 'athlete')}</div></div>
      <div class="pf-badge">${rosette(sb.roman, 72, sb.level === 0)}<span>${sb.weeks} wk</span></div></div>
    ${m.bio ? `<p class="pf-bio">${esc(m.bio)}</p>` : ''}
    <div class="stat-grid mt">
      <div class="stat-card"><span>${icon('dumbbell')}Workouts</span><strong>${s.workouts || 0}</strong></div>
      <div class="stat-card"><span>${icon('weight')}Total lifted</span><strong style="font-size:20px">${volText(s.volume || 0)}</strong></div>
      <div class="stat-card"><span>${icon('trophy')}PRs</span><strong>${s.prs || 0}</strong></div>
      <div class="stat-card"><span>${icon('medal')}Badges</span><strong>${s.badges || 0}</strong></div>
    </div>
    ${dotHeatmap(days, weekOf(Date.now()), state.settings.weekStart, 20)}
    ${Object.keys(muscles).length ? `<div class="sm-card mt">${bodyMap(muscles, { width: 320 })}
      <div class="sm-score">Strength score: <b style="color:${LEVELS[levelOf(s.strength || 0)].color}">${fmtNum(s.strength || 0, 1)}</b></div></div>` : ''}
    <p class="group-foot center">${s.last ? `Last workout ${esc(agoText(s.last))}` : 'No workouts yet'}${m.updated_at ? ` · updated ${esc(agoText(Date.parse(m.updated_at)))}` : ''}</p>`, { cls: 'tall' });
});
