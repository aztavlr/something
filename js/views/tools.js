// Gym tools: plate calculator (with warm-up ramp) and 1RM calculator.
import { state, save, kgToDisp, dispToKg, wUnit, e1rm } from '../store.js';
import { fmtNum } from '../util.js';
import { openSheet, icon } from '../ui.js';

const PLATES = {
  kg: [[25, '#e03131', 128], [20, '#1c7ed6', 128], [15, '#f0b400', 116], [10, '#2f9e44', 100], [5, '#e9ecef', 80], [2.5, '#343a40', 64], [1.25, '#adb5bd', 54]],
  lb: [[45, '#1c7ed6', 128], [35, '#f0b400', 120], [25, '#2f9e44', 104], [10, '#e9ecef', 84], [5, '#343a40', 68], [2.5, '#adb5bd', 56]],
};
export const BARS = { kg: [20, 15, 10, 0], lb: [45, 35, 25, 0] };

export function loadPlates(total, bar, unit) {
  let side = (total - bar) / 2;
  const out = [];
  if (side <= 0) return { out, left: 0 };
  for (const [p] of PLATES[unit]) while (side >= p - 1e-9) { out.push(p); side -= p; }
  return { out, left: Math.round(side * 2 * 100) / 100 };
}
const roundTo = (v, step) => Math.round(v / step) * step;

export function plateCalc(initialKg) {
  const unit = wUnit();
  let bar = kgToDisp(state.settings.bar || 20);
  if (!BARS[unit].includes(Math.round(bar))) bar = BARS[unit][0];
  bar = Math.round(bar);
  let target = initialKg ? Math.round(kgToDisp(initialKg) * 100) / 100 : unit === 'kg' ? 100 : 225;
  const body = openSheet(`
    <div class="sheet-head"><h2>Plate calculator</h2></div>
    <label class="field"><span>Target weight (${unit})</span>
      <input class="input" id="pc-w" inputmode="decimal" value="${fmtNum(target, 2)}" style="font-size:22px;font-weight:800;text-align:center"></label>
    <div class="field mt"><span>Bar</span><div class="seg" id="pc-bar">${BARS[unit].map((b) => `<button data-bar="${b}" class="${b === bar ? 'on' : ''}">${b ? `${b} ${unit}` : 'No bar'}</button>`).join('')}</div></div>
    <div id="pc-out"></div>`);
  const draw = () => {
    const { out, left } = loadPlates(target, bar, unit);
    const per = {};
    out.forEach((p) => { per[p] = (per[p] || 0) + 1; });
    const ramp = target > bar + 1 ? [[0, 10, 'Empty bar'], [0.4, 5], [0.6, 3], [0.8, 2]].map(([pct, reps, label]) => {
      const w = pct ? Math.max(bar, roundTo(target * pct, unit === 'kg' ? 2.5 : 5)) : bar;
      return `<div class="row-flex between" style="padding:7px 0;border-top:1px solid var(--border)"><span>${label || `${Math.round(pct * 100)}%`}</span><b class="num">${fmtNum(w, 2)} ${unit} × ${reps}</b></div>`;
    }).join('') : '';
    body.querySelector('#pc-out').innerHTML = `
      <div class="plates">
        <div class="bar-sleeve"></div><div class="bar-collar"></div>
        ${out.map((p) => { const d = PLATES[unit].find((x) => x[0] === p); return `<div class="plate" style="height:${d[2]}px;background:${d[1]};${p === 5 || p === 10 ? 'color:#222' : ''}">${p}</div>`; }).join('')}
        ${out.length ? '<div class="bar-sleeve" style="width:18px"></div>' : ''}
      </div>
      <div class="card center">
        ${out.length ? `<div class="muted" style="font-size:13px;font-weight:700">EACH SIDE</div><div style="font-size:20px;font-weight:800;margin-top:4px">${Object.entries(per).sort((a, b) => b[0] - a[0]).map(([p, n]) => `${n > 1 ? `${n}×` : ''}${p}`).join(' + ')}</div>`
          : `<div class="muted">${target <= bar ? 'Just the bar!' : 'Enter a weight'}</div>`}
        ${left > 0 ? `<div class="muted" style="margin-top:6px;font-size:14px">${fmtNum(left, 2)} ${unit} can't be made with standard plates</div>` : ''}
      </div>
      ${ramp ? `<div class="card mt"><div class="card-title"><h3>Warm-up ramp</h3></div>${ramp}</div>` : ''}`;
  };
  draw();
  body.querySelector('#pc-w').addEventListener('input', (e) => { target = parseFloat(e.target.value.replace(',', '.')) || 0; draw(); });
  body.querySelector('#pc-bar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-bar]');
    if (!b) return;
    bar = +b.dataset.bar;
    state.settings.bar = Math.round(dispToKg(bar) * 100) / 100;
    save();
    body.querySelectorAll('[data-bar]').forEach((x) => x.classList.toggle('on', x === b));
    draw();
  });
}

const PCTS = [[1, 100], [2, 95], [3, 93], [4, 90], [5, 87], [6, 85], [8, 80], [10, 75], [12, 70], [15, 65]];
export function oneRmCalc() {
  const unit = wUnit();
  let w = unit === 'kg' ? 80 : 185, r = 5;
  const body = openSheet(`
    <div class="sheet-head"><h2>1RM calculator</h2></div>
    <p class="sheet-sub">Estimate your one-rep max from any set (Epley formula).</p>
    <div class="row-flex">
      <label class="field grow"><span>Weight (${unit})</span><input class="input" id="rm-w" inputmode="decimal" value="${w}" style="font-size:20px;font-weight:800;text-align:center"></label>
      <label class="field grow"><span>Reps</span><input class="input" id="rm-r" inputmode="numeric" value="${r}" style="font-size:20px;font-weight:800;text-align:center"></label>
    </div>
    <div id="rm-out"></div>`);
  const draw = () => {
    const one = e1rm(w, r);
    body.querySelector('#rm-out').innerHTML = one ? `
      <div class="hero-card mt center" style="padding:18px"><div class="hero-kicker">Estimated 1RM</div><h2 style="font-size:40px;margin:6px 0 0">${fmtNum(one, 1)} ${unit}</h2></div>
      <div class="group-label">Rep maxes</div>
      <div class="pct-table">${PCTS.map(([n, p]) => `<div><span>${n} rep${n > 1 ? 's' : ''} · ${p}%</span><b>${fmtNum(one * p / 100, 1)}</b></div>`).join('')}</div>`
      : '<p class="muted center mt">Enter a weight and reps.</p>';
  };
  draw();
  body.querySelector('#rm-w').addEventListener('input', (e) => { w = parseFloat(e.target.value.replace(',', '.')) || 0; draw(); });
  body.querySelector('#rm-r').addEventListener('input', (e) => { r = Math.min(30, parseInt(e.target.value, 10) || 0); draw(); });
}

export const toolsList = () => `
  <button class="row" data-act="tool-plates"><span class="row-ic">${icon('layers')}</span><span class="row-main"><div class="row-title">Plate calculator</div><div class="row-sub">Plates per side + warm-up sets</div></span>${icon('right', 'chev')}</button>
  <button class="row" data-act="tool-1rm"><span class="row-ic">${icon('calc')}</span><span class="row-main"><div class="row-title">1RM calculator</div><div class="row-sub">Estimate your max from any set</div></span>${icon('right', 'chev')}</button>`;
