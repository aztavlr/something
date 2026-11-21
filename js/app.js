// Entry point: access check → install guide → onboarding → app. Router, tab bar, global events.
import { state, flushDirty, externalChangeHooks } from './store.js';
import { $, fmtClock, isStandalone } from './util.js';
import { app, actions, on, go, icon, applyTheme, closeAllSheets, sheetOpen, hideToast } from './ui.js';
import { checkAccess, renderLock, renderInstallGuide, installSeen } from './gate.js';
import { renderOnboarding } from './onboarding.js';
import { checkIncomingShare } from './share.js';
import { renderHome } from './views/home.js';
import { renderTrain } from './views/train.js';
import { renderHistory } from './views/history.js';
import { renderProgress } from './views/progress.js';
import { renderProfile } from './views/profile.js';
import { renderSettings } from './views/settings.js';
import { renderCrew } from './views/crew.js';
import { renderStreak } from './views/streak.js';
import { resumeRest, syncWake } from './views/logger.js';
import { cloudEnabled, flush, pullCrew, onCrewUpdate, queueProfile } from './cloud.js';

const VIEWS = { home: renderHome, crew: renderCrew, train: renderTrain, history: renderHistory, progress: renderProgress, profile: renderProfile, settings: renderSettings, streak: renderStreak };
const TAB_OF = { settings: 'profile', history: 'profile', streak: 'home' };
const view = $('#view'), tabbar = $('#tabbar');

function renderTabbar() {
  const t = TAB_OF[app.tab] || app.tab, a = state.active;
  const tab = (k, ic, label) => `<button class="tab ${t === k ? 'active' : ''}" data-act="go" data-tab="${k}">${icon(ic)}<span>${label}</span></button>`;
  tabbar.innerHTML = [
    tab('home', 'home', 'Home'),
    tab('crew', 'users', 'Crew'),
    `<button class="tab tab-center ${t === 'train' ? 'active' : ''}" data-act="go" data-tab="train" aria-label="Train">
      <span class="tab-fab ${a && !a.editing ? 'live' : ''}">${icon(a ? 'timer' : 'dumbbell')}</span>
      <span id="tab-elapsed">${a && !a.editing ? fmtClock((Date.now() - a.start) / 1000) : 'Train'}</span></button>`,
    tab('progress', 'chart', 'Progress'),
    tab('profile', 'user', 'Profile'),
  ].join('');
}

function render({ animate = false } = {}) {
  (VIEWS[app.tab] || renderHome)(view);
  renderTabbar();
  if (animate) { view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter'); }
}
app.render = render;

// Global click delegation for [data-act]
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
on('go', (el) => { closeAllSheets(); go(el.dataset.tab); });

// Live workout clock
setInterval(() => {
  const a = state.active;
  if (!a || a.editing) return;
  const txt = fmtClock((Date.now() - a.start) / 1000);
  const e1 = document.getElementById('elapsed'), e2 = document.getElementById('tab-elapsed');
  if (e1) e1.textContent = txt;
  if (e2) e2.textContent = txt;
}, 1000);

function boot(opts = {}) {
  applyTheme();
  tabbar.hidden = true;
  const acc = checkAccess();
  window.scrollTo(0, 0);
  if (!acc.ok) { renderLock(view, () => { hideToast(); boot({ joined: true }); }); return; }
  if ((acc.joined || opts.joined) && !isStandalone() && !installSeen()) {
    renderInstallGuide(view, () => boot());
    return;
  }
  if (!state.settings.onboarded) { renderOnboarding(view, () => boot()); return; }
  tabbar.hidden = false;
  app.tab = state.active ? 'train' : 'home';
  render({ animate: true });
  resumeRest();
  syncWake();
  checkIncomingShare();
  if (cloudEnabled()) { queueProfile(); pullCrew(); }
  // Ask the browser to never auto-clear this app's data (granted for installed apps).
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
boot();

// Fresh crew data arrived: redraw crew-facing screens unless the user is busy in a sheet or typing.
onCrewUpdate(() => {
  const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (!tabbar.hidden && !sheetOpen() && !typing && (app.tab === 'crew' || app.tab === 'home')) render();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flushDirty(); // write anything still pending before the phone suspends the app
  else if (cloudEnabled()) flush();
});
window.addEventListener('pagehide', () => flushDirty());
// Another tab of the app saved: show its data here too.
externalChangeHooks.add(() => { if (!tabbar.hidden && !sheetOpen()) render(); });

// Re-check incoming share links when the app is already open (e.g. link opened in same tab)
window.addEventListener('hashchange', () => { if (!tabbar.hidden && !sheetOpen()) checkIncomingShare(); });

// Offline support + auto-update
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !state.active && !sheetOpen()) location.reload();
  });
}
