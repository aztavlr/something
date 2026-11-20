// Settings page (gear icon on Profile): crew invite, appearance, workout options, tools, data.
import { state, save, exportJSON, exportCSV, importJSON, resetAll } from '../store.js';
import { ACCENTS } from '../data.js';
import { CONFIG } from '../config.js';
import { esc, fmtClock, download, isStandalone } from '../util.js';
import { icon, on, rerender, toast, applyTheme, openSheet, confirmDialog, toggle } from '../ui.js';
import { lockEnabled, crewCode, inviteLink, showInstallSheet } from '../gate.js';
import { nativeShare } from '../share.js';
import { openLibrary, REST_OPTS } from './exercise.js';
import { toolsList, plateCalc, oneRmCalc } from './tools.js';
import { cloudEnabled, cloudStatus } from '../cloud.js';

const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(state.settings[key]) === String(v) ? 'on' : ''}" data-act="set" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
const row = (ic, title, end, sub = '') => `<div class="row"><span class="row-ic">${icon(ic)}</span><span class="row-main"><div class="row-title">${title}</div>${sub ? `<div class="row-sub">${sub}</div>` : ''}</span>${end}</div>`;
const navRow = (act, ic, title, sub = '', danger = false) => `<button class="row" data-act="${act}"><span class="row-ic" ${danger ? 'style="background:rgba(251,78,107,.14);color:var(--danger)"' : ''}>${icon(ic)}</span><span class="row-main"><div class="row-title" ${danger ? 'style="color:var(--danger)"' : ''}>${title}</div>${sub ? `<div class="row-sub">${sub}</div>` : ''}</span>${icon('right', 'chev')}</button>`;

export function renderSettings(root) {
  const s = state.settings, code = crewCode();
  root.innerHTML = `
    <header class="appbar center"><button class="icon-btn plain" data-act="go" data-tab="profile" aria-label="Back">${icon('left')}</button><h1 style="font-size:22px">Settings</h1><span></span></header>

    <div class="crew-card">
      <h3>${icon('users')} ${esc(CONFIG.crewName)}</h3>
      <p>${lockEnabled() ? 'This app is members-only. Send friends your invite link and it unlocks the app for them.' : 'Send friends the link so they can install the app too.'}</p>
      <div class="btn-row"><button class="btn primary" data-act="invite">${icon('share')} Invite friends</button>${lockEnabled() && code ? `<button class="btn" data-act="show-code" style="flex:0 0 auto">${icon('lock')} Code</button>` : ''}</div>
      <div class="sync-note">${icon(cloudEnabled() ? 'refresh' : 'info')}${esc(cloudStatus())}</div>
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
      ${row('body', 'Strength standards', seg('sex', [['male', 'Men'], ['female', 'Women']]), 'Which standards to compare against')}
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
    <p class="group-foot">${cloudEnabled() ? 'Your workouts are saved on this phone. Your profile, stats and workout posts are also shared with your crew.' : 'Your workouts are stored privately on this device.'} Export a backup before switching phones (photos are not included).</p>
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
