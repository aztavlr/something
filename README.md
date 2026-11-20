# IronLog 🏋️: a private gym app for your crew

IronLog is a members-only workout tracker. Anyone you send the **invite link** to can open it, add it to their home screen, and use it like a normal app. It works offline. There's no app store and no sign-up. Once the crew database is connected, your crew gets a live leaderboard, a feed of each other's workouts, and team milestones.

## Features

**Training**
- Live workout logger. Your numbers from last time show next to every set, and one tap logs the same again
- Set types: warm-up, drop set and failure, plus an optional RPE column
- Rest timer that starts on its own, live PR detection, and a finish summary with confetti
- Add a gym photo to any workout
- 76 exercises, tracked by weight × reps, bodyweight, timed holds or cardio. You can add your own
- 7 ready-made programs, your own routines, and an "Up next" suggestion on the Home screen

**Profile**
- Photo or avatar, @username and bio
- A streak rosette (levels I–VI), plus a dot calendar of every training day
- **Feed** (your workouts as posts), **Stats** (weekly challenges, badges, volume) and **Advanced** (strength map, milestones)

**Gamification**
- **Weekly challenges**: volume tiers (Ox → Rhino → Elephant → T-Rex → Whale → Kraken), On Target, Record Breaker, Well Rounded, Rep Machine and Early Bird. Each one you finish adds a badge to your collection
- **Milestones**: your lifetime volume compared to real things, from a grand piano and a T-Rex to a Boeing 737, the London Eye and the Titanic
- **Strength standards**: a front and back muscle map colored from Beginner to World Class, an average strength score, and a shareable image card
- **Exercise stats**: PB, estimated 1RM, top weight, volume and reps, by session, week or month

**Crew** (needs the crew database)
- A leaderboard ranked by total volume, this week's volume, workouts, week streak, strength score or badges
- A crew feed of everyone's workouts and photos, with 💪 props
- Team milestones (combined volume) and a "who lifted what" breakdown
- Tap anyone to see their profile, dot calendar and strength map

**Tools and settings**
- Plate calculator with a warm-up ramp, and a 1RM calculator
- Dark (true black), light or auto theme and 8 accent colors (gold by default), kg or lb
- Backup export/import (JSON) and a spreadsheet export (CSV)

## Put it online (one time)
1. On GitHub, open this repo → **Settings → Pages → Source: GitHub Actions**
2. Open **Actions → Deploy to GitHub Pages → Run workflow**. It also redeploys automatically on every push
3. The app is live at `https://<your-username>.github.io/<repo-name>/`

## Connect the crew database (one time, free)
1. Create a free project at [supabase.com](https://supabase.com)
2. Open **SQL Editor → New query**, paste everything in [`supabase/setup.sql`](supabase/setup.sql), and click **Run**
3. In **Project Settings → API Keys**, copy the **Project URL** and the **publishable** key (or the legacy "anon public" key). Put them in `js/config.js` as `supabaseUrl` and `supabaseKey`
4. **Never** put the secret / `service_role` key in the app

### What gets shared
- **Shared with your crew:** your name, @username, bio, avatar or photo, a stats summary (totals, streak, strength score, training days), and a post for each workout (the title, the best set of each exercise, and an optional smaller copy of the photo)
- **Stays on your phone:** the full set-by-set log, notes, routines and body weight

**How access works:** every request carries a key derived from the crew code, and the database only shows rows with that same key. On top of that, each phone has its own secret, so only that phone can change or delete its own data. The rules live in `supabase/setup.sql`.

## Invite friends
Open the app with your invite link (`…/?join=YOUR-CODE`), then go to **Profile → ⚙️ Settings → Invite friends**.
- **iPhone:** open the link in Safari → Share → **Add to Home Screen**
- **Android:** open the link in Chrome → ⋮ → **Install app**

If the home-screen app asks for a code, friends can find it in **Settings → Code** on any member's phone. The members-only lock is a shared crew code, not per-person accounts. Only a hash of the code is stored in this repo. To change the code, set `crewHash` in `js/config.js` to `sha256("ironlog-crew-v1:" + NEWCODE)`, where `NEWCODE` is uppercase with no dashes. Setting it to `''` turns the lock off.

## Run locally
```
python3 -m http.server 8000   # then open http://localhost:8000/?join=YOUR-CODE
```

## Project layout
```
index.html, manifest.webmanifest, sw.js      app shell, install metadata, offline cache
css/base.css, css/app.css, css/social.css    design system, screens, profile/crew/gamification
js/app.js                                    boot, routing, tab bar
js/store.js, js/data.js                      data model, migrations, training math, exercise library
js/gamify.js, js/gamedata.js, js/art.js      challenges, badges, milestones, strength standards, SVG art
js/cloud.js, supabase/setup.sql              crew sync (Supabase REST + row-level security)
js/gate.js, js/onboarding.js                 members-only lock, install guide, first-run setup
js/ui.js, js/charts.js, js/share.js          UI kit, charts, share links and images
js/photos.js                                 photo picking/resizing, IndexedDB storage
js/views/*.js                                Home, Crew, Train/logger, Progress, Profile, Settings, History, feed, achievements, tools
```
