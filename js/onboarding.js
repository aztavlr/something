// First-run setup: name & avatar, units & weekly goal, starter program.
import { state, save, addProgram } from './store.js';
import { PROGRAMS, AVATARS } from './data.js';
import { CONFIG } from './config.js';
import { esc } from './util.js';
import { icon, buzz } from './ui.js';

export function renderOnboarding(root, onDone) {
  let step = 0;
  const d = {
    name: state.profile.name || '', avatar: state.profile.avatar || '💪',
    unit: state.settings.unit, goal: state.settings.weeklyGoal, program: 'ppl',
  };
  const dots = () => `<div class="ob-dots">${[0, 1, 2].map((i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>`;

  const steps = [
    () => `
      <img class="logo" src="icons/icon-192.png" alt="">
      <h1>Welcome to ${esc(CONFIG.appName)}</h1>
      <p class="lead">Let's set you up. It takes about 20 seconds.</p>
      <div class="ob-body">
        <label class="field"><span>What should we call you?</span>
          <input class="input" id="ob-name" value="${esc(d.name)}" placeholder="Your name" autocomplete="given-name" maxlength="30"></label>
        <div class="field"><span>Pick an avatar</span>
          <div class="avatar-grid">${AVATARS.map((a) => `<button type="button" data-av="${a}" class="${a === d.avatar ? 'on' : ''}">${a}</button>`).join('')}</div>
        </div>
      </div>
      <button class="btn primary block mt-lg" data-ob="next">Continue ${icon('right')}</button>`,
    () => `
      <h1>Your preferences</h1>
      <p class="lead">You can change these any time in Profile.</p>
      <div class="ob-body">
        <div class="field"><span>Weight units</span>
          <div class="seg">${['kg', 'lb'].map((u) => `<button type="button" data-unit="${u}" class="${d.unit === u ? 'on' : ''}">${u === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)'}</button>`).join('')}</div></div>
        <div class="field"><span>Weekly goal</span>
          <div class="card row-flex between">
            <div><strong>${d.goal} workout${d.goal > 1 ? 's' : ''}</strong><div class="muted" style="font-size:13.5px">per week</div></div>
            <div class="stepper"><button type="button" data-goal="-1">${icon('minus')}</button><b>${d.goal}</b><button type="button" data-goal="1">${icon('plus')}</button></div>
          </div></div>
      </div>
      <div class="btn-row mt-lg"><button class="btn" data-ob="back">${icon('left')} Back</button><button class="btn primary" data-ob="next">Continue</button></div>`,
    () => `
      <h1>Pick a starter plan</h1>
      <p class="lead">We'll add its workouts to your routines. You can edit them later.</p>
      <div class="ob-body">
        ${PROGRAMS.map((p) => `
          <button type="button" class="choice ${d.program === p.id ? 'on' : ''}" data-prog="${p.id}">
            <span class="program-emoji">${p.emoji}</span>
            <span class="grow"><h4>${esc(p.name)}</h4><p>${esc(p.level)} · ${esc(p.days)}</p></span>
          </button>`).join('')}
        <button type="button" class="choice ${d.program === null ? 'on' : ''}" data-prog="">
          <span class="program-emoji">✏️</span><span class="grow"><h4>Start from scratch</h4><p>Build your own routines</p></span>
        </button>
      </div>
      <div class="btn-row mt-lg"><button class="btn" data-ob="back">${icon('left')} Back</button><button class="btn primary" data-ob="finish">Let's go ${icon('zap')}</button></div>`,
  ];

  const draw = () => {
    root.innerHTML = `<div class="gate" style="text-align:center">${dots()}${steps[step]()}</div>`;
    const name = root.querySelector('#ob-name');
    if (name) name.oninput = () => { d.name = name.value; };
  };

  root.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.av) { d.avatar = t.dataset.av; buzz(); draw(); }
    else if (t.dataset.unit) { d.unit = t.dataset.unit; draw(); }
    else if (t.dataset.goal) { d.goal = Math.min(7, Math.max(1, d.goal + +t.dataset.goal)); draw(); }
    else if (t.dataset.prog !== undefined) { d.program = t.dataset.prog || null; draw(); }
    else if (t.dataset.ob === 'next') { step++; draw(); window.scrollTo(0, 0); }
    else if (t.dataset.ob === 'back') { step--; draw(); }
    else if (t.dataset.ob === 'finish') {
      state.profile.name = d.name.trim();
      state.profile.avatar = d.avatar;
      state.settings.unit = d.unit;
      state.settings.weeklyGoal = d.goal;
      state.settings.onboarded = true;
      if (d.program) addProgram(d.program);
      save();
      root.onclick = null;
      onDone();
    }
  };
  draw();
}
