// Feed posts (your workouts and your crew's), avatars, crew post detail.
import { state, exById, workoutStats, prIndex, setText, kgToDisp, wUnit, isWorkSet, setScore } from '../store.js';
import { esc, fmtAgo, fmtNum, fmtDate, fmtTime, fmtDur } from '../util.js';
import { icon, on, openSheet } from '../ui.js';
import { getPhoto } from '../photos.js';
import { crewCache, crewPhotoIds, postPhoto, me } from '../cloud.js';

export const safeImg = (u) => (typeof u === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(u) ? u : '');
export const avatarHTML = (m, cls = '') => {
  const src = safeImg(m && m.photo);
  return `<span class="av ${cls}">${src ? `<img src="${src}" alt="">` : esc((m && m.avatar) || '💪')}</span>`;
};
export const volText = (kg) => `${Math.round(kgToDisp(kg || 0)).toLocaleString()} ${wUnit()}`;

function bestOf(type, sets) {
  const work = sets.filter(isWorkSet);
  const pool = work.length ? work : sets;
  return pool.reduce((b, s) => (setScore(type, s) > setScore(type, b) ? s : b), pool[0]);
}

/** A local workout as a post */
export function localPost(w, prsCount = (prIndex().get(w.id) || []).length) {
  const st = workoutStats(w);
  return {
    id: w.id, own: true, local: true, who: state.profile, at: w.start, vol: st.vol, reps: st.reps, title: w.name, prs: prsCount,
    lines: w.exercises.map((ex) => { const e = exById(ex.exId); const b = bestOf(e.type, ex.sets); return `${ex.sets.length} × ${e.name}${b ? ` · ${setText(e.type, b)}` : ''}`; }),
  };
}

/** A crew post from the cloud as a post */
export function cloudPost(p, member) {
  return {
    id: p.id, own: member && member.id === me().id, local: false, who: member || { name: 'Former member' }, at: Date.parse(p.started_at),
    vol: p.volume_kg, reps: p.reps, title: p.title, prs: p.prs,
    lines: (p.summary || []).map((x) => `${x.c} × ${x.n}${x.b ? ` · ${setText(x.t || 'weight', x.b)}` : ''}`),
  };
}

export function postHTML(p, { props = null } = {}) {
  const more = p.lines.length > 4 ? `<div>+ ${p.lines.length - 4} more</div>` : '';
  return `<article class="post">
    <div class="post-head">${avatarHTML(p.who)}
      <div class="post-who"><b>${esc(p.who.name || 'Athlete')}</b><span>${esc(fmtAgo(p.at))}</span>
        <div class="post-stats"><span>${icon('weight')}${volText(p.vol)}</span><span>${icon('check')}${p.reps || 0} reps</span></div></div>
      ${p.prs ? `<span class="tag gold">${icon('trophy')} ${p.prs} PR${p.prs > 1 ? 's' : ''}</span>` : ''}
    </div>
    <button class="wcard" data-act="${p.local ? 'open-workout' : 'open-post'}" data-id="${esc(p.id)}" style="background:none;border:0;padding:0;color:inherit">
      <div class="post-title">${esc(p.title)}</div>
      <div class="post-lines">${p.lines.slice(0, 4).map((l) => `<div>${esc(l)}</div>`).join('')}${more}</div>
    </button>
    <div class="post-photo" data-photo="${esc(p.id)}" data-local="${p.local ? 1 : ''}" hidden></div>
    ${props ? `<div class="post-actions"><button class="prop-btn ${props.mine ? 'on' : ''}" data-act="prop" data-id="${esc(p.id)}">💪 ${props.count ? `<b>${props.count}</b>` : ''} ${props.mine ? 'Propped' : 'Give props'}</button></div>` : ''}
  </article>`;
}

/** Fill in photos after a feed renders (local photos from this phone, crew photos from the cloud). */
export async function hydratePhotos(root) {
  const els = [...root.querySelectorAll('[data-photo]')];
  const crewIds = els.filter((e) => !e.dataset.local).map((e) => e.dataset.photo);
  const withPhoto = crewIds.length ? new Set(await crewPhotoIds(crewIds)) : new Set();
  for (const el of els) {
    const id = el.dataset.photo;
    const src = safeImg(el.dataset.local ? await getPhoto(id) : (await getPhoto(`crew:${id}`)) || (withPhoto.has(id) ? await postPhoto(id) : null));
    if (src && el.isConnected) { el.innerHTML = `<img src="${src}" alt="" loading="lazy">`; el.hidden = false; }
  }
}

export function openCrewPost(id) {
  const c = crewCache(), p = c.posts.find((x) => x.id === id);
  if (!p) return;
  const m = c.members.find((x) => x.id === p.member_id) || { name: 'Former member' };
  const body = openSheet(`
    <div class="post-head" style="margin-bottom:12px">${avatarHTML(m, 'lg')}<div class="post-who"><b style="font-size:19px">${esc(m.name || 'Athlete')}</b><span>${esc(fmtDate(Date.parse(p.started_at), { weekday: 'long', month: 'long', day: 'numeric' }))} · ${esc(fmtTime(Date.parse(p.started_at)))}</span></div></div>
    <div class="sheet-head"><h2>${esc(p.title)}</h2>${p.prs ? `<span class="tag gold">${icon('trophy')} ${p.prs} PR${p.prs > 1 ? 's' : ''}</span>` : ''}</div>
    <div class="summary-stats">
      <div class="tile">${icon('clock')}<strong>${fmtDur((p.duration_s || 0) * 1000)}</strong><span>Duration</span></div>
      <div class="tile">${icon('weight')}<strong>${fmtNum(kgToDisp(p.volume_kg || 0), 0)}</strong><span>Volume (${wUnit()})</span></div>
      <div class="tile">${icon('layers')}<strong>${p.sets || 0}</strong><span>Sets</span></div>
    </div>
    <div class="post-photo" data-photo="${esc(p.id)}" hidden></div>
    <div class="list mt">${(p.summary || []).map((x) => `<div class="row"><span class="row-main"><div class="row-title">${esc(x.n)}</div><div class="row-sub">${x.c} sets${x.b ? ` · best ${esc(setText(x.t || 'weight', x.b))}` : ''}</div></span></div>`).join('')}</div>`, { cls: 'tall' });
  hydratePhotos(body);
}
on('open-post', (el) => openCrewPost(el.dataset.id));
