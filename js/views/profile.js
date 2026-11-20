// Profile: stats, crew invite, appearance & workout settings, tools, data management.
import { state, save, workoutStats, kgToDisp, wUnit, exportJSON, exportCSV, importJSON, resetAll } from '../store.js';
import { ACCENTS, AVATARS } from '../data.js';
import { CONFIG } from '../config.js';
import { esc, fmtBig, fmtClock, fmtDate, download, isStandalone } from '../util.js';
import { appbar, icon, on, rerender, toast, applyTheme, openSheet, closeSheet, confirmDialog, toggle } from '../ui.js';
import { lockEnabled, crewCode, inviteLink, showInstallSheet } from '../gate.js';
import { nativeShare } from '../share.js';
import { openLibrary, REST_OPTS } from './exercise.js';
import { toolsList, plateCalc, oneRmCalc } from './tools.js';

const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(state.settings[key]) === String(v) ? 'on' : ''}" data-act="set" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
const row = (ic, title, end, sub = '') => `<div class="row"><span class="row-ic">${icon(ic)}</span><span class="row-main"><div class="row-title">${title}</div>${sub ? `<div class="row-sub">${sub}</div>` : ''}</span>${end}</div>`;
const navRow = (act, ic, title, sub = '', danger = false) => `<button class="row" data-act="${act}"><span class="row-ic" ${danger ? 'style="background:rgba(251,78,107,.14);color:var(--danger)"' : ''}>${icon(ic)}</span><span class="row-main"><div class="row-title" ${danger ? 'style="color:var(--danger)"' : ''}>${title}</div>${sub ? `<div class="row-sub">${sub}</div>` : ''}</span>${icon('right', 'chev')}</button>`;

export function renderProfile(root) {
  const s = state.settings, p = state.profile;
  const tot = state.workouts.reduce((a, w) => { const x = workoutStats(w); a.vol += x.vol; a.dur += x.dur; return a; }, { vol: 0, dur: 0 });
  const code = crewCode();
  root.innerHTML = `
    ${appbar('Profile', `<button class="icon-btn" data-act="edit-profile" aria-label="Edit profile">${icon('edit')}</button>`)}
    <div class="card">
      <div class="profile-card">
        <button class="avatar" data-act="edit-profile" aria-label="Change avatar">${esc(p.avatar || '💪')}</button>
        <div class="grow"><h2>${esc(p.name || 'Athlete')}</h2><p>Member since ${esc(fmtDate(p.created || Date.now(), { month: 'long', year: 'numeric' }))}</p></div>
      </div>
      <div class="tiles mt">
        <div class="tile">${icon('dumbbell')}<strong>${state.workouts.length}</strong><span>Workouts</span></div>
        <div class="tile">${icon('clock')}<strong>${Math.round(tot.dur / 36e5)}h</strong><span>Trained</span></div>
        <div class="tile">${icon('weight')}<strong>${fmtBig(kgToDisp(tot.vol))}</strong><span>${wUnit()} lifted</span></div>
      </div>
    </div>

    <div class="crew-card mt">
      <h3>${icon('users')} ${esc(CONFIG.crewName)}</h3>
      <p>${lockEnabled() ? 'This app is members-only. Send friends your invite link and it unlocks the app for them.' : 'Send friends the link so they can install the app too.'}</p>
      <div class="btn-row"><button class="btn primary" data-act="invite">${icon('share')} Invite friends</button>${lockEnabled() && code ? `<button class="btn" data-act="show-code" style="flex:0 0 auto">${icon('lock')} Code</button>` : ''}</div>
    </div>
    ${!isStandalone() ? `<div class="list mt">${navRow('install-help', 'phone', 'Install on your phone', 'Add to home screen for the full app experience')}</div>` : ''}

    <div class="group-label">Appearance</div>
    <div class="list">
      ${row('moon', 'Theme', seg('theme', [['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto']]))}
      <div class="row" style="flex-direction:column;align-items:stretch;gap:10px"><div class="row-flex"><span class="row-ic">${icon('palette')}</span><span class="row-title">Accent color</span></div>
        <div class="swatches">${Object.entries(ACCENTS).map(([k, hex]) => `<button class="swatch ${s.accent === k ? 'on' : ''}" style="background:${hex}" data-act="set" data-k="accent" data-v="${k}" aria-label="${k}"></button>`).join('')}</div></div>
    </div>

    <div class="group-label">Workout</div>
    <div class="list">
      ${row('weight', 'Units', seg('unit', [['kg', 'kg'], ['lb', 'lb']]))}
      ${row('target', 'Weekly goal', `<div class="stepper"><button data-act="step" data-k="weeklyGoal" data-d="-1" aria-label="Less">${icon('minus')}</button><b>${s.weeklyGoal}</b><button data-act="step" data-k="weeklyGoal" data-d="1" aria-label="More">${icon('plus')}</button></div>`, 'Workouts per week')}
      ${row('calendar', 'Week starts on', seg('weekStart', [[1, 'Mon'], [0, 'Sun']]))}
      ${row('timer', 'Default rest', `<select class="input" data-setting="rest" style="width:auto;min-height:38px;padding:6px 34px 6px 12px">${REST_OPTS.map((x) => `<option value="${x}" ${x === s.rest ? 'selected' : ''}>${x ? fmtClock(x) : 'Off'}</option>`).join('')}</select>`)}
      ${row('play', 'Auto-start rest timer', toggle('autoRest', s.autoRest), 'When you tick off a set')}
      ${row('bell', 'Timer sound', toggle('sound', s.sound))}
      ${row('zap', 'Vibration', toggle('vibrate', s.vibrate), 'Android only')}
      ${row('sun', 'Keep screen on', toggle('wakeLock', s.wakeLock), 'During a workout')}
      ${row('sliders', 'Show RPE column', toggle('showRpe', s.showRpe), 'Rate of perceived exertion (1–10)')}
    </div>

    <div class="group-label">Library & tools</div>
    <div class="list">
      ${navRow('library', 'book', 'Exercise library', `${state.exercises.filter((e) => !e.hidden).length} exercises · add your own`)}
      ${toolsList()}
    </div>

    <div class="group-label">Your data</div>
    <div class="list">
      ${navRow('export-json', 'download', 'Export backup', 'Save everything to a file')}
      <label class="row" style="cursor:pointer"><span class="row-ic">${icon('upload')}</span><span class="row-main"><div class="row-title">Import backup</div><div class="row-sub">Restore from a backup file</div></span>${icon('right', 'chev')}<input type="file" id="import-file" accept="application/json,.json" hidden></label>
      ${navRow('export-csv', 'list', 'Export to spreadsheet', 'CSV of every set you have logged')}
      ${navRow('reset', 'trash', 'Erase all data', '', true)}
    </div>
    <p class="group-foot">Your workouts are stored privately on this device. Export a backup before switching phones.</p>
    <p class="center faint" style="font-size:13px;margin:24px 0 0">${esc(CONFIG.appName)} v${esc(CONFIG.version)}</p>`;
  root.querySelector('#import-file').addEventListener('change', importFile);
}

function importFile(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = async () => {
    try {
      const preview = JSON.parse(r.result);
      const n = (preview.data?.workouts || preview.workouts || []).length;
      if (!(await confirmDialog({ title: `Import ${n} workouts?`, message: 'This replaces all data on this device.', confirm: 'Import', danger: true }))) return;
      importJSON(r.result);
      applyTheme(); rerender(); toast('Backup restored', 'check');
    } catch (err) { toast("That file isn't an IronLog backup", 'info'); }
  };
  r.readAsText(f);
  e.target.value = '';
}

const SET_NUMERIC = ['weekStart', 'rest', 'weeklyGoal'];
on('set', (el) => {
  const k = el.dataset.k;
  state.settings[k] = SET_NUMERIC.includes(k) ? +el.dataset.v : el.dataset.v;
  save();
  if (k === 'theme' || k === 'accent') applyTheme();
  rerender();
});
on('step', (el) => {
  const k = el.dataset.k;
  state.settings[k] = Math.min(7, Math.max(1, (state.settings[k] || 3) + +el.dataset.d));
  save(); rerender();
});
document.addEventListener('change', (e) => {
  const k = e.target.dataset?.setting;
  if (!k) return;
  state.settings[k] = e.target.type === 'checkbox' ? e.target.checked : SET_NUMERIC.includes(k) ? +e.target.value : e.target.value;
  save();
  toast('Saved', 'check');
});

on('edit-profile', () => {
  const d = { name: state.profile.name || '', avatar: state.profile.avatar || '💪' };
  const body = openSheet(`
    <div class="sheet-head"><h2>Edit profile</h2></div>
    <label class="field"><span>Name</span><input class="input" id="pf-name" value="${esc(d.name)}" maxlength="30" placeholder="Your name"></label>
    <div class="field mt"><span>Avatar</span><div class="avatar-grid" id="pf-av">${AVATARS.map((a) => `<button data-av="${a}" class="${a === d.avatar ? 'on' : ''}">${a}</button>`).join('')}</div></div>
    <div class="btn-row mt-lg"><button class="btn" data-act="close-sheet">Cancel</button><button class="btn primary" id="pf-save">Save</button></div>`);
  body.querySelector('#pf-av').addEventListener('click', (e) => {
    const b = e.target.closest('[data-av]');
    if (!b) return;
    d.avatar = b.dataset.av;
    body.querySelectorAll('[data-av]').forEach((x) => x.classList.toggle('on', x === b));
  });
  body.querySelector('#pf-save').onclick = () => {
    state.profile.name = body.querySelector('#pf-name').value.trim();
    state.profile.avatar = d.avatar;
    save(); closeSheet(); rerender();
  };
});

on('invite', () => nativeShare({
  title: CONFIG.appName,
  text: `Join me on ${CONFIG.appName}, our private gym app 💪 Open this link, then add it to your home screen:`,
  url: inviteLink(),
}));
on('show-code', () => {
  openSheet(`
    <div class="center">
      <div class="sheet-title">Crew code</div>
      <p class="muted" style="margin:-6px 0 16px">Friends can type this on the lock screen if their invite link doesn't open the app.</p>
      <div class="code-box">${esc(crewCode() || '')}</div>
      <button class="btn block mt-lg" data-act="copy-invite">${icon('copy')} Copy invite link</button>
    </div>`);
});
on('copy-invite', async () => {
  try { await navigator.clipboard.writeText(inviteLink()); toast('Invite link copied', 'copy'); }
  catch (e) { window.prompt('Copy this invite link:', inviteLink()); }
});
on('install-help', () => showInstallSheet());
on('library', () => openLibrary());
on('tool-plates', () => plateCalc());
on('tool-1rm', () => oneRmCalc());
on('export-json', () => { download(`ironlog-backup-${new Date().toISOString().slice(0, 10)}.json`, exportJSON()); toast('Backup saved', 'download'); });
on('export-csv', () => { download(`ironlog-sets-${new Date().toISOString().slice(0, 10)}.csv`, exportCSV(), 'text/csv'); toast('Spreadsheet saved', 'download'); });
on('reset', async () => {
  if (!(await confirmDialog({ title: 'Erase all data?', message: 'Every workout, routine and setting on this device will be deleted. Export a backup first if you might want it.', confirm: 'Erase everything', danger: true }))) return;
  if (!(await confirmDialog({ title: 'Are you absolutely sure?', message: 'This cannot be undone.', confirm: 'Yes, erase', danger: true }))) return;
  resetAll();
  location.reload();
});
