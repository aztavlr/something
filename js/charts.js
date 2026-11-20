// Lightweight canvas/SVG charts.
import { esc, fmtDate, addDays, startOfDay, DAY } from './util.js';

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

function setup(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.font = '11px -apple-system, system-ui, sans-serif';
  return { c, W, H };
}

function niceTicks(min, max, n = 4) {
  const span = max - min || 1;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) || step0;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return { lo, hi, ticks };
}

/** points: [{t, y}] sorted by t. Interactive: tap/drag to inspect. */
export function lineChart(canvas, points, { fmt = (v) => String(Math.round(v)) } = {}) {
  const draw = (hover = -1) => {
    const { c, W, H } = setup(canvas);
    const accent = css('--accent'), muted = css('--muted'), grid = css('--grid'), surface = css('--surface');
    if (!points.length) return;
    const ys = points.map((p) => p.y);
    let min = Math.min(...ys), max = Math.max(...ys);
    if (min === max) { min -= Math.max(1, Math.abs(min) * 0.1); max += Math.max(1, Math.abs(max) * 0.1); }
    const { lo, hi, ticks } = niceTicks(min, max);
    const labelW = Math.max(...ticks.map((t) => c.measureText(fmt(t)).width)) + 10;
    const pad = { l: labelW, r: 14, t: 26, b: 22 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const t0 = points[0].t, t1 = points[points.length - 1].t;
    const x = (p, i) => pad.l + (points.length === 1 ? iw / 2 : t1 === t0 ? (i / (points.length - 1)) * iw : ((p.t - t0) / (t1 - t0)) * iw);
    const y = (v) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * ih;

    c.strokeStyle = grid; c.fillStyle = muted; c.lineWidth = 1; c.textAlign = 'right';
    for (const tk of ticks) {
      const yy = Math.round(y(tk)) + 0.5;
      c.beginPath(); c.moveTo(pad.l, yy); c.lineTo(W - pad.r, yy); c.stroke();
      c.fillText(fmt(tk), pad.l - 8, yy + 4);
    }
    c.textAlign = 'left'; c.fillText(fmtDate(t0, { month: 'short', day: 'numeric' }), pad.l, H - 5);
    if (points.length > 1) { c.textAlign = 'right'; c.fillText(fmtDate(t1, { month: 'short', day: 'numeric' }), W - pad.r, H - 5); }

    const xy = points.map((p, i) => [x(p, i), y(p.y)]);
    // gradient area
    const g = c.createLinearGradient(0, pad.t, 0, H - pad.b);
    g.addColorStop(0, `rgba(${css('--accent-rgb')}, 0.32)`);
    g.addColorStop(1, `rgba(${css('--accent-rgb')}, 0)`);
    c.beginPath();
    xy.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.lineTo(xy[xy.length - 1][0], H - pad.b); c.lineTo(xy[0][0], H - pad.b); c.closePath();
    c.fillStyle = g; c.fill();
    // line
    c.beginPath(); c.strokeStyle = accent; c.lineWidth = 2.5; c.lineJoin = 'round'; c.lineCap = 'round';
    xy.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.stroke();
    // dots
    xy.forEach(([px, py], i) => {
      if (points.length > 40 && i !== hover && i !== xy.length - 1) return;
      c.beginPath(); c.arc(px, py, i === hover ? 6 : 3.5, 0, Math.PI * 2);
      c.fillStyle = i === hover ? surface : accent; c.fill();
      if (i === hover) { c.lineWidth = 3; c.strokeStyle = accent; c.stroke(); }
    });
    // tooltip
    const hi2 = hover >= 0 ? hover : -1;
    if (hi2 >= 0) {
      const [px] = xy[hi2], p = points[hi2];
      c.strokeStyle = grid; c.lineWidth = 1; c.setLineDash([3, 3]);
      c.beginPath(); c.moveTo(px, pad.t); c.lineTo(px, H - pad.b); c.stroke(); c.setLineDash([]);
      const label = `${fmt(p.y)} · ${fmtDate(p.t, { month: 'short', day: 'numeric' })}`;
      c.font = '600 12px -apple-system, system-ui, sans-serif';
      const tw = c.measureText(label).width + 16;
      const tx = Math.min(Math.max(px - tw / 2, 2), W - tw - 2);
      c.fillStyle = accent;
      c.beginPath(); c.roundRect ? c.roundRect(tx, 2, tw, 20, 10) : c.rect(tx, 2, tw, 20); c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(label, tx + 8, 16);
    }
    canvas._xy = xy;
  };
  draw();
  const pick = (e) => {
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left;
    let bi = 0, bd = Infinity;
    (canvas._xy || []).forEach(([px], i) => { const d = Math.abs(px - mx); if (d < bd) { bd = d; bi = i; } });
    draw(bi);
  };
  canvas.onpointerdown = pick;
  canvas.onpointermove = (e) => { if (e.buttons || e.pointerType === 'mouse') pick(e); };
  canvas.onpointerleave = () => draw();
}

/** bars: [{label, value, hi}] */
export function barChart(canvas, bars, { fmt = (v) => String(Math.round(v)) } = {}) {
  const { c, W, H } = setup(canvas);
  const accent = css('--accent'), muted = css('--muted'), grid = css('--grid');
  const pad = { l: 6, r: 6, t: 18, b: 20 };
  const max = Math.max(1, ...bars.map((b) => b.value));
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const bw = iw / bars.length;
  c.strokeStyle = grid; c.beginPath(); c.moveTo(pad.l, H - pad.b + 0.5); c.lineTo(W - pad.r, H - pad.b + 0.5); c.stroke();
  bars.forEach((b, i) => {
    const h = (b.value / max) * ih;
    const x = pad.l + i * bw + bw * 0.18, w = bw * 0.64;
    c.fillStyle = b.hi ? accent : `rgba(${css('--accent-rgb')}, 0.35)`;
    if (h > 0) { c.beginPath(); c.roundRect ? c.roundRect(x, H - pad.b - h, w, h, [5, 5, 2, 2]) : c.rect(x, H - pad.b - h, w, h); c.fill(); }
    c.fillStyle = muted; c.textAlign = 'center';
    if (b.label) c.fillText(b.label, x + w / 2, H - 5);
    if (b.value > 0 && (b.hi || bars.length <= 8)) { c.fillStyle = b.hi ? accent : muted; c.fillText(fmt(b.value), x + w / 2, H - pad.b - h - 5); }
  });
}

/** Progress ring SVG */
export function ring(pct, { size = 112, stroke = 11, center = '', sub = '' } = {}) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bg" stroke-width="${stroke}" fill="none"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fg" stroke-width="${stroke}" fill="none" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>
    <div class="ring-label"><strong>${center}</strong>${sub ? `<span>${sub}</span>` : ''}</div></div>`;
}

export function sparkline(values, w = 84, h = 30) {
  if (values.length < 2) return '';
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * (w - 4) + 2).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`).join(' ');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/** GitHub-style activity grid; counts: Map<dayStart, n> */
export function heatmap(counts, weekStartTs, weeks = 18) {
  const first = addDays(weekStartTs, -(weeks - 1) * 7);
  const today = startOfDay(Date.now());
  let cols = '';
  for (let w = 0; w < weeks; w++) {
    let cells = '';
    for (let d = 0; d < 7; d++) {
      const t = startOfDay(addDays(first, w * 7 + d));
      const n = counts.get(t) || 0;
      const lvl = t > today ? 'f' : Math.min(n, 3);
      cells += `<i class="hm l${lvl}" title="${esc(fmtDate(t))}${n ? ` · ${n} workout${n > 1 ? 's' : ''}` : ''}"></i>`;
    }
    cols += `<div class="hm-col">${cells}</div>`;
  }
  return `<div class="heatmap">${cols}</div>`;
}

export function confetti() {
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  document.body.appendChild(cv);
  const dpr = window.devicePixelRatio || 1, W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const colors = [css('--accent'), '#ffd43b', '#51cf66', '#4dabf7', '#f783ac', '#ffffff'];
  const parts = Array.from({ length: 140 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.35, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, col: colors[(Math.random() * colors.length) | 0],
  }));
  const tEnd = performance.now() + 2600;
  const frame = (now) => {
    c.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.col; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore();
    }
    if (now < tEnd) requestAnimationFrame(frame); else cv.remove();
  };
  requestAnimationFrame(frame);
}

export const DAY_MS = DAY;
