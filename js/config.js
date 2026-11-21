// App-wide configuration.
// crewHash = sha256("ironlog-crew-v1:" + CODE without dashes, uppercase).
// Change it to invite-only a new group (everyone must re-enter the new code).
// Set crewHash to '' to turn the members-only lock off entirely.
export const CONFIG = {
  appName: 'IronLog',
  crewName: 'IronLog Crew',
  crewSalt: 'ironlog-crew-v1:',
  crewHash: '38fe4c4002441a28dffa0907c66b8edd63cfac00d27fc1f355a3002c3d497f09',
  version: '2.2.0',
  // Crew sync (Supabase). From Supabase -> Project Settings -> API keys.
  // Leave both '' to keep everything on-device only.
  supabaseUrl: 'https://qnjqsgnpedwvewmaywyz.supabase.co',
  // The *publishable* (or legacy "anon public") key. It is meant to be public.
  // NEVER put the secret / service_role key here.
  supabaseKey: 'sb_publishable_lBWUBgA1_WWopdjksPeDVA_Tu4KwRFn',
};
