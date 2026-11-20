// Achievement screens: weekly challenges, badge collection, landmark milestones, strength standards map.
import { state, save, kgToDisp, wUnit, exById } from '../store.js';
import { weekChallenges, badgeCollection, milestoneInfo, strengthProfile, levelOf } from '../gamify.js';
import { LANDMARKS, LEVELS, MUSCLE_NAMES } from '../gamedata.js';
import { badge, bodyMap } from '../art.js';
import { esc, fmtNum, fmtDate, fmtClock, handleOf } from '../util.js';
import { icon, on, rerender } from '../ui.js';
import { nativeShare } from '../share.js';
import { CONFIG } from '../config.js';

const big = (kg) => Math.round(kgToDisp(kg)).toLocaleString();
export const kgLabel = (kg) => `${big(kg)} ${wUnit().toUpperCase()}`;

function valText(c) {
  if (c.kind === 'kg') return `${big(c.value)} / ${big(c.target)}`;
  if (c.target === 1) return c.done ? 'Done' : '—';
  return `${Math.min(c.value, c.target)} / ${c.target}`;
}

export function challengesHTML() {
  const list = weekChallenges();
  const cells = list.map((c) => {
    const earned = c.id === 'vol' ? c.earned : c.done ? c : null;
    const art = earned ? badge(earned, { size: 104, label: c.id === 'vol' ? kgLabel(earned.kg) : '' }) : badge(null, { size: 104, locked: true });
    const sub = c.id === 'vol' ? (c.done ? 'Top tier!' : `${big(c.target - c.value)} ${wUnit()} to ${c.name.replace(/ Week$/, '')}`) : c.done ? 'Earned!' : 'Locked';
    return `<div class="badge-cell">${art}<b>${esc(c.id === 'vol' && earned && !c.done ? `${earned.name} Week` : c.name)}</b><span>${sub}</span></div>`;
  }).join('');
  const rows = list.map((c) => `
    <div class="chal ${c.done ? 'done' : ''}">
      <div class="chal-ic">${c.emoji}</div>
      <div class="chal-main"><b>${esc(c.name)}</b><span>${esc(c.desc || `Lift ${kgLabel(c.target).toLowerCase()} this week`)}</span>
        <div class="bar"><i style="width:${Math.min(100, (c.value / c.target) * 100)}%"></i></div></div>
      <div class="chal-val">${valText(c)}</div>
    </div>`).join('');
  return `<div class="badge-row">${cells}</div><div class="card mt" style="padding:4px 0">${rows}</div>
    <p class="group-foot">Challenges reset every week. Every one you finish adds a badge to your collection.</p>`;
}

export function badgesHTML() {
  const list = badgeCollection();
  if (!list.length) return '<div class="card"><p class="muted" style="margin:0">No badges yet. Finish a weekly challenge to earn your first one.</p></div>';
  return `<div class="badge-grid">${list.map((b) => `
    <div class="badge-cell">${badge(b, { size: 86, label: b.kg ? kgLabel(b.kg) : '' })}
      <b>${esc(b.name)}</b><span>${b.count > 1 ? `×${b.count} · ` : ''}${esc(fmtDate(b.last, { month: 'short', day: 'numeric' }))}</span></div>`).join('')}</div>`;
}

export function milestonesHTML(total, { title = 'Next weight milestone', who = 'You' } = {}) {
  const mi = milestoneInfo(total);
  const n = mi.next || LANDMARKS[LANDMARKS.length - 1];
  const pct = Math.min(100, Math.floor(mi.pct * 100));
  return `
    <div class="ms-hero">
      <div class="ms-sky" style="background:linear-gradient(180deg, ${n.sky[0]}, ${n.sky[1]})"><div class="ms-name">${esc(n.name)}</div><div class="ms-emoji">${n.emoji}</div></div>
      <div class="ms-body">
        <h3>${mi.next ? esc(title) : 'Every milestone complete!'}</h3><p>${esc(n.line)}</p>
        <div class="bar" style="height:10px"><i style="width:${pct}%"></i></div>
        <div class="ms-pct">${pct}%</div>
        <div class="ms-nums">${big(total)} / ${big(n.kg)} ${wUnit()}</div>
      </div>
    </div>
    <div class="group-label">${esc(who)} lifted the weight of…</div>
    <div class="ms-grid">${LANDMARKS.map((l) => `<div class="ms-cell ${total >= l.kg ? '' : 'locked'}" title="${esc(l.name)}: ${big(l.kg)} ${wUnit()}">${l.emoji}<span>${esc(l.name)}</span></div>`).join('')}</div>`;
}

const LIFT_UNIT = { ratio: (v) => `${fmtNum(v, 2)}× body weight`, reps: (v) => `${Math.round(v)} reps`, secs: (v) => fmtClock(v) };

export function strengthHTML() {
  const sp = strengthProfile();
  const sexSeg = `<div class="seg" style="max-width:240px;margin:0 auto">${[['male', 'Men'], ['female', 'Women']].map(([v, l]) => `<button class="${(state.settings.sex || 'male') === v ? 'on' : ''}" data-act="set-sex" data-v="${v}">${l}</button>`).join('')}</div>`;
  if (!sp.bw) {
    return `<div class="card center"><div style="font-size:44px">⚖️</div><h3 style="margin:6px 0 4px">Add your body weight</h3>
      <p class="muted" style="margin:0 0 14px">Strength standards compare your lifts to your body weight.</p>
      ${sexSeg}<button class="btn primary block mt" data-act="log-weight">${icon('plus')} Log body weight</button></div>`;
  }
  if (!sp.lifts.length) {
    return `<div class="card center"><div style="font-size:44px">🏋️</div><h3 style="margin:6px 0 4px">No strength data yet</h3>
      <p class="muted" style="margin:0">Log lifts like bench press, squat, deadlift, overhead press, rows, curls or pull-ups and your muscle map lights up.</p></div>`;
  }
  const lvl = levelOf(sp.avg);
  return `
    <div class="sm-card">
      <div class="muted" style="font-size:13px;font-weight:800;letter-spacing:.08em">STRENGTH STANDARD</div>
      ${bodyMap(sp.muscles, { width: 340 })}
      <div class="sm-score">Average strength score: <b style="color:${LEVELS[lvl].color}">${fmtNum(sp.avg, 1)}</b></div>
      <div class="levels">${LEVELS.map((l, i) => `<span class="lvl ${i === lvl ? 'on' : ''}" style="background:${l.color}">${l.name}</span>`).join('')}</div>
      <div class="btn-row mt"><button class="btn primary" data-act="share-strength">${icon('share')} Share</button></div>
    </div>
    <div class="group-label">Muscles</div>
    <div class="list">${Object.entries(sp.muscles).sort((a, b) => b[1].score - a[1].score).map(([m, v]) => `
      <div class="lift-row"><span class="lvl" style="background:${LEVELS[levelOf(v.score)].color};min-width:12px;padding:6px"></span>
        <div class="grow"><b>${esc(MUSCLE_NAMES[m] || m)}</b><span>${esc(LEVELS[levelOf(v.score)].name)} · from ${esc(exById(v.exId).name)}</span></div>
        <span class="lift-score">${Math.round(v.score)}</span></div>`).join('')}</div>
    <div class="group-label">Lifts</div>
    <div class="list">${sp.lifts.map((l) => `
      <button class="lift-row row" data-act="open-exercise" data-id="${l.exId}" style="min-height:0">
        <div class="grow"><b>${esc(exById(l.exId).name)}</b><span>${LIFT_UNIT[l.kind](l.value)} · ${esc(LEVELS[levelOf(l.score)].name)}</span></div>
        <span class="lift-score" style="color:${LEVELS[levelOf(l.score)].color}">${Math.round(l.score)}</span></button>`).join('')}</div>
    <div class="mt">${sexSeg}</div>
    <p class="group-foot">Scores: 0–20 Beginner, 20–40 Novice, 40–60 Intermediate, 60–80 Advanced, 80–100 Expert, 100+ World Class. Based on your best estimated 1RM vs your body weight (${fmtNum(kgToDisp(sp.bw), 1)} ${wUnit()}). Rough guide, not gospel.</p>`;
}

on('set-sex', (el) => { state.settings.sex = el.dataset.v; save(); rerender(); });

function loadImg(src) {
  return new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src; });
}

export async function shareStrength() {
  const sp = strengthProfile();
  if (!sp.lifts.length) return;
  const W = 1080, H = 1350, F = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W / 2, 0, 50, W / 2, 0, 900);
  g.addColorStop(0, 'rgba(245,184,61,.35)'); g.addColorStop(1, 'rgba(245,184,61,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.textAlign = 'center';
  c.fillStyle = '#f5b83d'; c.font = `800 40px ${F}`; c.fillText('STRENGTH STANDARD', W / 2, 110);
  const name = state.profile.name || 'Athlete';
  c.fillStyle = '#fff'; c.font = `850 64px ${F}`; c.fillText(name, W / 2, 190);
  c.fillStyle = '#8d93a3'; c.font = `600 34px ${F}`; c.fillText(`@${state.profile.handle || handleOf(name) || 'athlete'}`, W / 2, 240);
  const svg = bodyMap(sp.muscles, { width: 812, base: '#2a2d35', idle: '#3c404b', labelColor: '#8d93a3' });
  try {
    const img = await loadImg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    c.drawImage(img, 134, 268, 812, 850);
  } catch (e) { /* draw without map */ }
  const lvl = levelOf(sp.avg), lab = 'Average strength score: ', num = fmtNum(sp.avg, 1);
  c.font = `800 46px ${F}`; const lw = c.measureText(lab).width;
  c.font = `900 56px ${F}`; const nw = c.measureText(num).width;
  const sx = (W - lw - nw) / 2;
  c.textAlign = 'left';
  c.font = `800 46px ${F}`; c.fillStyle = '#fff'; c.fillText(lab, sx, 1180);
  c.font = `900 56px ${F}`; c.fillStyle = LEVELS[lvl].color; c.fillText(num, sx + lw, 1182);
  c.textAlign = 'center';
  // level chips
  c.font = `800 25px ${F}`;
  const widths = LEVELS.map((l) => c.measureText(l.name).width + 26);
  let x = (W - (widths.reduce((a, b) => a + b, 0) + 12 * (LEVELS.length - 1))) / 2;
  LEVELS.forEach((l, i) => {
    c.fillStyle = l.color;
    c.beginPath(); if (c.roundRect) c.roundRect(x, 1220, widths[i], 50, 12); else c.rect(x, 1220, widths[i], 50); c.fill();
    if (i === lvl) { c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke(); }
    c.fillStyle = '#111'; c.fillText(l.name, x + widths[i] / 2, 1254);
    x += widths[i] + 12;
  });
  c.fillStyle = '#5f6574'; c.font = `700 28px ${F}`; c.fillText(`${CONFIG.appName.toUpperCase()}`, W / 2, 1320);
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const file = new File([blob], `${CONFIG.appName.toLowerCase()}-strength.png`, { type: 'image/png' });
  return nativeShare({ title: 'My strength standard', text: `My strength score: ${fmtNum(sp.avg, 1)} 💪`, files: [file] });
}
on('share-strength', () => shareStrength());
