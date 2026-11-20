// Members-only lock (crew code / invite link) and the "install on your phone" guide.
// Note: this keeps strangers out of the app; it is not bank-grade security (the code is static).
import { CONFIG } from './config.js';
import { sha256 } from './sha256.js';
import { esc, isIOS, isStandalone } from './util.js';
import { icon, toast, buzz, openSheet } from './ui.js';

const KEY = 'ironlog:crew';
const SEEN = 'ironlog:installSeen';
const norm = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const pretty = (c) => { const n = norm(c); return n.length === 8 ? `${n.slice(0, 4)}-${n.slice(4)}` : n; };
const hashCode = (c) => sha256(CONFIG.crewSalt + norm(c));
export const lockEnabled = () => !!CONFIG.crewHash;

function readCookie() {
  const m = document.cookie.match(/(?:^|;\s*)ironlog_crew=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
function remember(code) {
  try { localStorage.setItem(KEY, JSON.stringify({ code: pretty(code), hash: CONFIG.crewHash })); } catch (e) { /* private mode */ }
  try {
    document.cookie = `ironlog_crew=${encodeURIComponent(pretty(code))}; max-age=315360000; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  } catch (e) { /* ignore */ }
}

export function crewCode() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && d.code && hashCode(d.code) === CONFIG.crewHash) return d.code;
  } catch (e) { /* ignore */ }
  const c = readCookie();
  return c && hashCode(c) === CONFIG.crewHash ? pretty(c) : null;
}

export function tryCode(code) {
  if (norm(code).length < 4 || hashCode(code) !== CONFIG.crewHash) return false;
  remember(code);
  return true;
}

/** {ok, joined} — joined is true when unlocked by an invite link just now. */
export function checkAccess() {
  if (!lockEnabled()) return { ok: true, joined: false };
  const fromQuery = new URLSearchParams(location.search).get('join');
  const fromHash = new URLSearchParams(location.hash.slice(1)).get('join');
  const code = fromQuery || fromHash;
  if (code && tryCode(code)) return { ok: true, joined: !crewCodeWasKnown };
  const c = crewCode();
  if (c) { remember(c); return { ok: true, joined: false }; }
  return { ok: false, joined: false };
}
const crewCodeWasKnown = (() => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } })();

export const appLink = () => location.origin + location.pathname;
export function inviteLink() {
  const c = crewCode();
  return lockEnabled() && c ? `${appLink()}?join=${encodeURIComponent(c)}` : appLink();
}

export function renderLock(root, onUnlock) {
  root.innerHTML = `
    <div class="gate">
      <img class="logo" src="icons/icon-192.png" alt="">
      <h1>Members only</h1>
      <p class="lead">${esc(CONFIG.appName)} is a private gym app for our crew. Open the invite link a friend sent you, or enter your crew code.</p>
      <form id="code-form" autocomplete="off">
        <input class="input code-input" id="code" placeholder="XXXX-XXXX" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="12" aria-label="Crew code">
        <button class="btn primary block" type="submit">${icon('lock')} Unlock</button>
      </form>
      <p class="gate-foot">No code? Ask the friend who sent you here.</p>
    </div>`;
  const form = root.querySelector('#code-form'), input = root.querySelector('#code');
  form.onsubmit = (e) => {
    e.preventDefault();
    if (tryCode(input.value)) { buzz(20); onUnlock(); return; }
    buzz([40, 40, 40]);
    input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
    toast("That code didn't work", 'lock');
  };
}

// ---------- Install ----------
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; });
export const canPromptInstall = () => !!installEvt;
export async function promptInstall() {
  if (!installEvt) return false;
  installEvt.prompt();
  const r = await installEvt.userChoice.catch(() => null);
  installEvt = null;
  return r && r.outcome === 'accepted';
}
export const installSeen = () => { try { return !!localStorage.getItem(SEEN); } catch (e) { return true; } };
export const markInstallSeen = () => { try { localStorage.setItem(SEEN, '1'); } catch (e) { /* ignore */ } };

function installSteps() {
  const code = crewCode();
  const codeNote = lockEnabled() && code
    ? `<p class="muted" style="font-size:14px;margin:4px 0 0">If the app asks for a crew code, it's<br><span class="code-box" style="margin-top:8px">${esc(code)}</span></p>` : '';
  if (isIOS()) {
    return `<div class="steps">
      <div class="step"><span class="step-n">1</span><span>Tap the <b>Share</b> button ${icon('share')} in Safari's toolbar</span></div>
      <div class="step"><span class="step-n">2</span><span>Scroll down and tap <b>Add to Home Screen</b> ${icon('plus')}</span></div>
      <div class="step"><span class="step-n">3</span><span>Tap <b>Add</b>, then open <b>${esc(CONFIG.appName)}</b> from your Home Screen</span></div>
    </div>${codeNote}`;
  }
  return `${canPromptInstall() ? `<button class="btn primary block" data-install>${icon('download')} Install ${esc(CONFIG.appName)}</button><p class="muted" style="font-size:14px">or do it from the browser menu:</p>` : ''}
    <div class="steps">
      <div class="step"><span class="step-n">1</span><span>Open this page in <b>Chrome</b> and tap the <b>⋮</b> menu</span></div>
      <div class="step"><span class="step-n">2</span><span>Tap <b>Install app</b> or <b>Add to Home screen</b></span></div>
      <div class="step"><span class="step-n">3</span><span>Open <b>${esc(CONFIG.appName)}</b> from your home screen</span></div>
    </div>${codeNote}`;
}

function wireInstall(scope, after) {
  scope.querySelector('[data-install]')?.addEventListener('click', async () => {
    if (await promptInstall()) { toast('Installed! Open it from your home screen', 'check'); after?.(); }
  });
}

/** Full-screen guide shown right after joining from an invite link in the browser. */
export function renderInstallGuide(root, onContinue) {
  root.innerHTML = `
    <div class="gate">
      <img class="logo" src="icons/icon-192.png" alt="">
      <h1>You're in! 🎉</h1>
      <p class="lead">Welcome to ${esc(CONFIG.crewName)}. Add ${esc(CONFIG.appName)} to your home screen so it opens full-screen like a real app and works offline.</p>
      ${installSteps()}
      <button class="btn block mt-lg" id="ig-continue">Continue in browser</button>
    </div>`;
  wireInstall(root, onContinue);
  root.querySelector('#ig-continue').onclick = () => { markInstallSeen(); onContinue(); };
}

export function showInstallSheet() {
  const body = openSheet(`
    <div class="sheet-head"><h2>Get the app</h2></div>
    <p class="sheet-sub">Install ${esc(CONFIG.appName)} on your home screen. It opens full-screen and works offline.</p>
    ${installSteps()}
    <button class="btn block mt" data-act="close-sheet">Done</button>`);
  wireInstall(body);
}

export const showInstallBanner = () => !isStandalone();
