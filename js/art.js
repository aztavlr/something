// Generated artwork (SVG/HTML): streak rosette, challenge badges, dot heatmap, muscle body map.
import { esc, fmtDate, addDays, startOfDay } from './util.js';
import { LEVELS } from './gamedata.js';
import { levelOf } from './gamify.js';

let uidN = 0;
const gid = (p) => `${p}${++uidN}`;

/** Scalloped gold rosette with a flame; roman numeral shows the streak level. */
export function rosette(roman = '', size = 96, dim = false) {
  const g = gid('ro'), cx = 50, cy = 50, n = 14, R = 40, bump = 6;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    if (i === 0) { d += `M${x.toFixed(2)} ${y.toFixed(2)}`; continue; }
    const m = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2;
    d += ` Q${(cx + (R + bump) * Math.cos(m)).toFixed(2)} ${(cy + (R + bump) * Math.sin(m)).toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `<svg class="rosette" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" ${dim ? 'style="filter:grayscale(1);opacity:.45"' : ''}>
    <defs><radialGradient id="${g}" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#ffe7a3"/><stop offset="1" stop-color="#f5b83d"/></radialGradient></defs>
    <path d="${d}Z" fill="url(#${g})" stroke="#fff3cf" stroke-width="2.5"/>
    <circle cx="50" cy="50" r="31" fill="#fff8e6"/>
    <path d="M50 24c2 9 13 14 13 27a13 13 0 0 1-26 0c0-6 3-9 6-12 .6 4.5 2.6 6.5 5.2 7.5C47 39 50 32 50 24z" fill="#f5b83d"/>
    <path d="M50 46c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 1.4-4.4 2.8-5.6.3 2 1.2 3 2.4 3.4C48.6 52 50 49 50 46z" fill="#fff3cf"/>
    ${roman ? `<text x="50" y="79" text-anchor="middle" font-size="9" font-weight="900" fill="#c88a12" font-family="system-ui,sans-serif">${roman}</text>` : ''}
  </svg>`;
}

/** Shield badge with emoji + ribbon label. locked → "?" tile. */
export function badge(b, { size = 112, locked = false, label = '' } = {}) {
  if (locked) {
    return `<svg width="${size}" height="${size * 1.1}" viewBox="0 0 100 110" aria-label="Locked badge">
      <rect x="6" y="8" width="88" height="94" rx="22" fill="#f4f4f5"/><rect x="6" y="8" width="88" height="94" rx="22" fill="none" stroke="#d4d4d8" stroke-width="2"/>
      <text x="50" y="76" text-anchor="middle" font-size="58" font-weight="900" fill="#18181b" font-family="system-ui,sans-serif">?</text></svg>`;
  }
  const g = gid('sh'), col = b.color || '#f5b83d';
  const leaf = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="3.2" ry="7" transform="rotate(${r} ${x} ${y})" fill="#7cc4a4" stroke="#2f7d61" stroke-width=".8"/>`;
  const leaves = [[12, 84, -40], [9, 72, -20], [8, 59, -5], [9, 46, 10], [88, 84, 40], [91, 72, 20], [92, 59, 5], [91, 46, -10]].map((l) => leaf(...l)).join('');
  return `<svg width="${size}" height="${size * 1.1}" viewBox="0 0 100 110" aria-label="${esc(b.name || 'Badge')}">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}"/><stop offset="1" stop-color="${col}" stop-opacity=".72"/></linearGradient></defs>
    ${leaves}
    <path d="M50 6 L86 18 V54 C86 80 69 96 50 104 C31 96 14 80 14 54 V18 Z" fill="url(#${g})" stroke="#f5c451" stroke-width="4" stroke-linejoin="round"/>
    <path d="M50 12 L80 22 V54 C80 75 66 89 50 96 C34 89 20 75 20 54 V22 Z" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
    <text x="50" y="70" text-anchor="middle" font-size="34" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${b.emoji || '🏅'}</text>
    ${label ? `<rect x="22" y="22" width="56" height="15" rx="4" fill="#f5c451"/><text x="50" y="33" text-anchor="middle" font-size="9.5" font-weight="900" fill="#3a2600" font-family="system-ui,sans-serif">${esc(label)}</text>` : ''}
  </svg>`;
}

/** GitHub-style dot grid: rows are weekdays, columns are weeks. counts: Map<dayStart, n> */
export function dotHeatmap(counts, weekStartTs, weekStart = 1, weeks = 20) {
  const first = addDays(weekStartTs, -(weeks - 1) * 7), today = startOfDay(Date.now());
  const dayNames = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + ((i + weekStart) % 7)).toLocaleDateString(undefined, { weekday: 'short' }));
  let months = '', lastM = -1;
  for (let w = 0; w < weeks; w++) {
    const m = new Date(addDays(first, w * 7)).getMonth();
    months += `<span>${m !== lastM ? esc(new Date(addDays(first, w * 7)).toLocaleDateString(undefined, { month: 'short' })) : ''}</span>`;
    lastM = m;
  }
  let rows = '';
  for (let d = 0; d < 7; d++) {
    let cells = '';
    for (let w = 0; w < weeks; w++) {
      const t = startOfDay(addDays(first, w * 7 + d)), n = counts.get(t) || 0;
      cells += `<i class="dot ${t > today ? 'fut' : n ? 'on' : ''}" title="${esc(fmtDate(t))}${n ? ` · ${n} workout${n > 1 ? 's' : ''}` : ''}"></i>`;
    }
    rows += `<div class="dots-row"><span class="dots-day">${esc(dayNames[d])}</span>${cells}</div>`;
  }
  return `<div class="dots" style="--weeks:${weeks}"><div class="dots-row dots-months"><span class="dots-day"></span>${months}</div>${rows}</div>`;
}

// ---------- Muscle body map ----------
const FRONT = [
  ['traps', '<path d="M70 50 L80 46 L90 50 L97 57 L63 57 Z"/>'],
  ['shoulders', '<ellipse cx="49" cy="68" rx="11" ry="12"/><ellipse cx="111" cy="68" rx="11" ry="12"/>'],
  ['chest', '<path d="M79 60 C70 57 59 59 56 69 C54 80 61 88 79 86 Z"/><path d="M81 60 C90 57 101 59 104 69 C106 80 99 88 81 86 Z"/>'],
  ['biceps', '<ellipse cx="42" cy="96" rx="7.5" ry="17"/><ellipse cx="118" cy="96" rx="7.5" ry="17"/>'],
  ['forearms', '<ellipse cx="37" cy="142" rx="6.5" ry="20"/><ellipse cx="123" cy="142" rx="6.5" ry="20"/>'],
  ['abs', '<rect x="70.5" y="92" width="9" height="11" rx="3"/><rect x="80.5" y="92" width="9" height="11" rx="3"/><rect x="70.5" y="105" width="9" height="11" rx="3"/><rect x="80.5" y="105" width="9" height="11" rx="3"/><rect x="70.5" y="118" width="9" height="11" rx="3"/><rect x="80.5" y="118" width="9" height="11" rx="3"/><rect x="71" y="131" width="18" height="18" rx="6"/>'],
  ['obliques', '<path d="M58 92 C61 108 62 128 67 148 L61 150 C56 130 54 110 58 92 Z"/><path d="M102 92 C99 108 98 128 93 148 L99 150 C104 130 106 110 102 92 Z"/>'],
  ['quads', '<ellipse cx="66" cy="210" rx="11.5" ry="36"/><ellipse cx="94" cy="210" rx="11.5" ry="36"/>'],
  ['calves', '<ellipse cx="66" cy="285" rx="7.5" ry="24"/><ellipse cx="94" cy="285" rx="7.5" ry="24"/>'],
];
const BACK = [
  ['traps', '<path d="M80 48 L98 58 L90 86 L80 94 L70 86 L62 58 Z"/>'],
  ['shoulders', '<ellipse cx="49" cy="68" rx="11" ry="12"/><ellipse cx="111" cy="68" rx="11" ry="12"/>'],
  ['lats', '<path d="M62 66 C56 90 60 116 75 134 L77 104 C72 94 69 82 66 66 Z"/><path d="M98 66 C104 90 100 116 85 134 L83 104 C88 94 91 82 94 66 Z"/>'],
  ['triceps', '<ellipse cx="42" cy="96" rx="7.5" ry="17"/><ellipse cx="118" cy="96" rx="7.5" ry="17"/>'],
  ['forearms', '<ellipse cx="37" cy="142" rx="6.5" ry="20"/><ellipse cx="123" cy="142" rx="6.5" ry="20"/>'],
  ['lowerback', '<rect x="72" y="110" width="16" height="42" rx="7"/>'],
  ['glutes', '<ellipse cx="68" cy="180" rx="13" ry="14"/><ellipse cx="92" cy="180" rx="13" ry="14"/>'],
  ['hamstrings', '<ellipse cx="66" cy="222" rx="11" ry="30"/><ellipse cx="94" cy="222" rx="11" ry="30"/>'],
  ['calves', '<ellipse cx="66" cy="282" rx="9" ry="22"/><ellipse cx="94" cy="282" rx="9" ry="22"/>'],
];
const BASE = `<ellipse cx="80" cy="26" rx="15" ry="18"/><rect x="72" y="40" width="16" height="14" rx="5"/>
  <path d="M52 56 Q80 46 108 56 L114 74 Q114 122 106 160 Q80 172 54 160 Q46 122 46 74 Z"/>
  <rect x="33" y="62" width="19" height="62" rx="9.5"/><rect x="108" y="62" width="19" height="62" rx="9.5"/>
  <rect x="29" y="118" width="17" height="52" rx="8.5"/><rect x="114" y="118" width="17" height="52" rx="8.5"/>
  <ellipse cx="37" cy="177" rx="7" ry="9"/><ellipse cx="123" cy="177" rx="7" ry="9"/>
  <path d="M54 156 Q80 170 106 156 L104 182 Q80 192 56 182 Z"/>
  <rect x="53" y="172" width="26" height="88" rx="13"/><rect x="81" y="172" width="26" height="88" rx="13"/>
  <rect x="56" y="256" width="20" height="70" rx="10"/><rect x="84" y="256" width="20" height="70" rx="10"/>
  <ellipse cx="64" cy="330" rx="11" ry="6"/><ellipse cx="96" cy="330" rx="11" ry="6"/>`;

/** muscles: {muscle: {score}}; colors by level. palette: {base, idle, stroke} */
export function bodyMap(muscles, { width = 320, base = '#2a2d35', idle = '#3c404b', stroke = 'rgba(0,0,0,.35)', labels = true, labelColor = '#8d93a3' } = {}) {
  const fill = (m) => (muscles[m] ? LEVELS[levelOf(muscles[m].score)].color : idle);
  const fig = (list, x) => `<g transform="translate(${x} 0)"><g fill="${base}">${BASE}</g>
    ${list.map(([m, shapes]) => `<g data-m="${m}" fill="${fill(m)}" stroke="${stroke}" stroke-width=".8">${shapes}</g>`).join('')}</g>`;
  const h = labels ? 356 : 340;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="bodymap" width="${width}" height="${Math.round((width * h) / 340)}" viewBox="0 0 340 ${h}" role="img" aria-label="Muscle strength map">
    ${fig(FRONT, 0)}${fig(BACK, 180)}
    ${labels ? `<text x="80" y="352" text-anchor="middle" font-size="10" font-weight="800" fill="${labelColor}" font-family="system-ui,sans-serif" letter-spacing="1">FRONT</text><text x="260" y="352" text-anchor="middle" font-size="10" font-weight="800" fill="${labelColor}" font-family="system-ui,sans-serif" letter-spacing="1">BACK</text>` : ''}
  </svg>`;
}
