// Crew sync with Supabase over its REST API. No logins: every request carries
//   x-crew   = a key derived from the crew code (only members can compute it)
//   x-member = this phone's random secret (only this phone can change its own rows)
// Row-level security in supabase/setup.sql enforces both.
import { CONFIG } from './config.js';
import { sha256 } from './sha256.js';
import { crewCode } from './gate.js';
import { state, workoutStats, prIndex, exById, streakWeeks, dayCounts, weekOf, isWorkSet, setScore, saveHooks, replaceState } from './store.js';
import { streaks } from './attend.js';
import { strengthProfile, badgeCollection, badgeTotal } from './gamify.js';
import { getPhoto, setPhoto, shrink } from './photos.js';
import { addDays, ymd, handleOf, agoText } from './util.js';

const ME_KEY = 'ironlog:member', CACHE_KEY = 'ironlog:crewCache', Q_KEY = 'ironlog:syncQ', BACKFILL_KEY = 'ironlog:backfilled', BACKUP_AT = 'ironlog:lastBackup';
const norm = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* full */ } };

export const cloudConfigured = () => !!(CONFIG.supabaseUrl && CONFIG.supabaseKey);
export const cloudEnabled = () => cloudConfigured() && !!crewCode();
let lastError = '';
const listeners = new Set();
export const onCrewUpdate = (fn) => listeners.add(fn);
const notify = () => listeners.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });

export function cloudStatus() {
  if (!cloudConfigured()) return 'Crew sync is not set up yet. Workouts stay on this phone.';
  if (!crewCode()) return 'Crew sync needs the crew code.';
  if (lastError) return `Crew sync paused: ${lastError}`;
  const c = crewCache();
  return c.at ? `Crew synced ${agoText(c.at)}` : 'Crew sync ready';
}

export function me() {
  let m = read(ME_KEY, null);
  if (!m || !m.id || !m.secret) {
    const b = new Uint8Array(24);
    crypto.getRandomValues(b);
    const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    const id = crypto.randomUUID ? crypto.randomUUID() : `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
    m = { id, secret: hex };
    write(ME_KEY, m);
  }
  return m;
}
const crewKey = () => sha256(`ironlog-data-v1:${norm(crewCode())}`);
const keyHash = () => sha256(me().secret);

async function api(path, { method = 'GET', body, prefer, secret } = {}) {
  const key = CONFIG.supabaseKey;
  const headers = { apikey: key, 'x-crew': crewKey(), 'x-member': secret || me().secret, Accept: 'application/json' };
  if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${CONFIG.supabaseUrl.replace(/\/+$/, '')}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    let msg = t;
    try { msg = JSON.parse(t).message || t; } catch (e) { /* not json */ }
    throw new Error(`${r.status} ${String(msg).slice(0, 120)}`);
  }
  const txt = r.status === 204 ? '' : await r.text();
  return txt ? JSON.parse(txt) : null;
}

// ---------- What we share ----------
export function myStats() {
  const wk = weekOf(Date.now());
  let volume = 0, weekVolume = 0, sets = 0, reps = 0, dur = 0;
  for (const w of state.workouts) {
    const s = workoutStats(w);
    volume += s.vol; sets += s.sets; reps += s.reps; dur += s.dur;
    if (w.start >= wk) weekVolume += s.vol;
  }
  const sp = strengthProfile(), gs = streaks();
  const from = addDays(wk, -19 * 7);
  return {
    workouts: state.workouts.length, volume: Math.round(volume), weekVolume: Math.round(weekVolume), week: wk,
    sets, reps, hours: Math.round((dur / 36e5) * 10) / 10, streak: streakWeeks(),
    gymStreak: gs.current, bestStreak: gs.best,
    strength: Math.round(sp.avg * 10) / 10,
    muscles: Object.fromEntries(Object.entries(sp.muscles).map(([m, v]) => [m, Math.round(v.score)])),
    badges: badgeTotal(badgeCollection()), prs: [...prIndex().values()].reduce((a, l) => a + l.length, 0),
    last: state.workouts.reduce((a, w) => Math.max(a, w.start), 0),
    days: [...new Set([...dayCounts().keys()].map(ymd).concat(state.checkins || []))].filter((d) => d >= ymd(from)),
  };
}

const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
function summary(w) {
  return w.exercises.slice(0, 12).map((ex) => {
    const e = exById(ex.exId);
    const work = ex.sets.filter(isWorkSet);
    const best = (work.length ? work : ex.sets).reduce((b, s) => (setScore(e.type, s) > setScore(e.type, b) ? s : b), (work.length ? work : ex.sets)[0]);
    return { n: e.name, t: e.type, c: ex.sets.length, b: best ? { w: r2(best.w), r: best.r ?? null, t: best.t ?? null, d: r2(best.d) } : null };
  });
}

async function postRow(w, crew, kh) {
  const st = workoutStats(w);
  let photo = await getPhoto(w.id);
  if (photo) {
    photo = await shrink(photo, { max: 720, quality: 0.62 });
    if (photo && photo.length > 390000) photo = await shrink(photo, { max: 480, quality: 0.55 });
  }
  return {
    id: w.id, crew, member_id: me().id, key_hash: kh, title: String(w.name || 'Workout').slice(0, 80),
    started_at: new Date(w.start).toISOString(), duration_s: Math.round(st.dur / 1000), volume_kg: Math.round(st.vol * 10) / 10,
    reps: st.reps, sets: st.sets, prs: (prIndex().get(w.id) || []).length, summary: summary(w), photo: photo || null,
    updated_at: new Date().toISOString(),
  };
}

// ---------- Queue & flush ----------
const q = () => read(Q_KEY, { profile: false, backup: false, up: [], del: [] });
export function queueProfile() { const x = q(); x.profile = true; write(Q_KEY, x); }
export function queueWorkout(id) { const x = q(); x.up = [...new Set([...x.up, id])]; x.del = x.del.filter((d) => d !== id); x.profile = true; write(Q_KEY, x); }
export function queueDelete(id) { const x = q(); x.del = [...new Set([...x.del, id])]; x.up = x.up.filter((d) => d !== id); x.profile = true; write(Q_KEY, x); }

let flushing = null, flushAgain = false;
const update = (fn) => { const x = q(); fn(x); write(Q_KEY, x); };

/** Push queued changes. Safe to call any time; changes queued while a push runs are picked up after it. */
export function flush() {
  if (!cloudEnabled() || !navigator.onLine) return Promise.resolve(false);
  if (flushing) { flushAgain = true; return flushing; }
  flushing = (async () => {
    try {
      do { flushAgain = false; await flushOnce(); } while (flushAgain);
      lastError = '';
      return true;
    } catch (e) {
      lastError = e.message || 'offline';
      return false;
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

async function flushOnce() {
  const crew = crewKey(), kh = keyHash();
  const backfilled = read(BACKFILL_KEY, false);
  if (q().profile || !backfilled) {
    update((x) => { x.profile = false; });
    const p = state.profile;
    try {
      await api('members?on_conflict=id', {
        method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
        body: [{ id: me().id, crew, key_hash: kh, name: (p.name || 'Athlete').slice(0, 40), handle: (p.handle || handleOf(p.name) || 'athlete').slice(0, 40),
          bio: (p.bio || '').slice(0, 160), avatar: (p.avatar || '💪').slice(0, 16), photo: p.photo || null, stats: myStats(), updated_at: new Date().toISOString() }],
      });
    } catch (e) { update((x) => { x.profile = true; }); throw e; }
  }
  if (!backfilled) {
    const recent = state.workouts.slice().sort((a, b) => b.start - a.start).slice(0, 20).map((w) => w.id);
    update((x) => { x.up = [...new Set([...x.up, ...recent])]; });
    write(BACKFILL_KEY, true);
  }
  if (q().backup) {
    update((x) => { x.backup = false; });
    try {
      const data = JSON.parse(JSON.stringify(state));
      const json = JSON.stringify(data);
      await api('backups?on_conflict=member_id', {
        method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
        body: [{ member_id: me().id, crew, key_hash: kh, data, size: json.length, updated_at: new Date().toISOString() }],
      });
      write(BACKUP_AT, Date.now());
    } catch (e) { update((x) => { x.backup = true; }); throw e; }
  }
  for (const id of q().up) {
    update((x) => { x.up = x.up.filter((y) => y !== id); });
    try {
      const w = state.workouts.find((y) => y.id === id);
      if (w) await api('posts?on_conflict=id', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: [await postRow(w, crew, kh)] });
    } catch (e) { update((x) => { if (!x.up.includes(id) && !x.del.includes(id)) x.up.push(id); }); throw e; }
  }
  for (const id of q().del) {
    update((x) => { x.del = x.del.filter((y) => y !== id); });
    try { await api(`posts?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }); }
    catch (e) { update((x) => { if (!x.del.includes(id)) x.del.push(id); }); throw e; }
  }
}

// ---------- Pull ----------
export const crewCache = () => read(CACHE_KEY, { at: 0, members: [], posts: [], props: [] });
let pulling = null;
export function pullCrew() {
  if (!cloudEnabled() || !navigator.onLine) return Promise.resolve(false);
  if (pulling) return pulling;
  pulling = (async () => {
    try {
      await flush();
      const [members, posts, props] = await Promise.all([
        api('members?select=id,name,handle,bio,avatar,photo,stats,updated_at&order=updated_at.desc&limit=100'),
        api('posts?select=id,member_id,title,started_at,duration_s,volume_kg,reps,sets,prs,summary,updated_at&order=started_at.desc&limit=60'),
        api('props?select=post_id,member_id&limit=5000'),
      ]);
      write(CACHE_KEY, { at: Date.now(), members: members || [], posts: posts || [], props: props || [] });
      lastError = '';
      notify();
      return true;
    } catch (e) {
      lastError = e.message || 'offline';
      notify();
      return false;
    } finally {
      pulling = null;
    }
  })();
  return pulling;
}
export const crewStale = () => Date.now() - crewCache().at > 60000;

/** Photo for a crew post (cached on this phone after the first load). */
export async function postPhoto(id) {
  const local = await getPhoto(`crew:${id}`);
  if (local) return local;
  if (!cloudEnabled() || !navigator.onLine) return null;
  try {
    const rows = await api(`posts?select=photo&id=eq.${encodeURIComponent(id)}&photo=not.is.null`);
    const ph = rows && rows[0] && rows[0].photo;
    if (ph) setPhoto(`crew:${id}`, ph).catch(() => {});
    return ph || null;
  } catch (e) { return null; }
}

/** Which of these crew posts have a photo (without downloading the photos). */
export async function crewPhotoIds(ids) {
  if (!cloudEnabled() || !navigator.onLine || !ids.length) return [];
  try {
    const list = ids.slice(0, 60).map((i) => `"${String(i).replace(/["\\]/g, '')}"`).join(',');
    const rows = await api(`posts?select=id&photo=not.is.null&id=in.(${encodeURIComponent(list)})`);
    return (rows || []).map((r) => r.id);
  } catch (e) { return []; }
}

export async function toggleProp(postId) {
  const c = crewCache(), mine = c.props.some((p) => p.post_id === postId && p.member_id === me().id);
  if (mine) {
    await api(`props?post_id=eq.${encodeURIComponent(postId)}&member_id=eq.${me().id}`, { method: 'DELETE' });
    c.props = c.props.filter((p) => !(p.post_id === postId && p.member_id === me().id));
  } else {
    await api('props', { method: 'POST', prefer: 'return=minimal', body: [{ post_id: postId, member_id: me().id, crew: crewKey(), key_hash: keyHash() }] });
    c.props.push({ post_id: postId, member_id: me().id });
  }
  write(CACHE_KEY, c);
  return !mine;
}

// ---------- Backup & restore ----------
export const lastBackup = () => read(BACKUP_AT, 0);
/** The restore key is this phone's secret, grouped for readability. Treat it like a password. */
export const restoreKey = () => me().secret.match(/.{1,6}/g).join('-').toUpperCase();
const cleanKey = (k) => String(k || '').toLowerCase().replace(/[^0-9a-f]/g, '');

let backupTimer = null;
export function queueBackup(delay = 15000) {
  if (!cloudEnabled()) return;
  update((x) => { x.backup = true; });
  clearTimeout(backupTimer);
  backupTimer = setTimeout(() => flush(), delay);
}
export async function backupNow() { queueBackup(0); clearTimeout(backupTimer); return flush(); }

/** Looks up the backup for a restore key. Resolves {member_id, data, size, updated_at} or null. */
export async function findBackup(key) {
  const secret = cleanKey(key);
  if (secret.length < 32) throw new Error('That key is too short. Copy the whole key.');
  const rows = await api(`backups?select=member_id,data,size,updated_at&key_hash=eq.${sha256(secret)}`, { secret });
  return rows && rows[0] ? { ...rows[0], secret } : null;
}
/** Replace this phone's data with a backup and take over that phone's identity. */
export async function applyBackup(b) {
  // This phone may already have joined the crew as a temporary empty member: remove it.
  const old = me();
  if (old.id !== b.member_id && cloudEnabled()) {
    try { await api(`members?id=eq.${encodeURIComponent(old.id)}`, { method: 'DELETE' }); } catch (e) { /* not fatal */ }
  }
  if (!replaceState(b.data)) return false;
  write(ME_KEY, { id: b.member_id, secret: b.secret });
  write(BACKFILL_KEY, true);
  write(BACKUP_AT, Date.parse(b.updated_at) || Date.now());
  write(Q_KEY, { profile: true, backup: false, up: [], del: [] });
  return true;
}

// Every saved change schedules a backup (when the crew database is connected).
saveHooks.add(() => queueBackup());
document.addEventListener('visibilitychange', () => { if (document.hidden && cloudEnabled() && q().backup) { clearTimeout(backupTimer); flush(); } });

// Retry queued changes when the connection comes back.
window.addEventListener('online', () => { flush(); });
