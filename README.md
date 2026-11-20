# IronLog 🏋️: a private gym app for your crew

IronLog is a members-only workout tracker. Anyone you send the **invite link** to can open it, add it to their home screen, and use it like a normal app. It works offline. There's no app store and no sign-up.

## Features

**Training**
- Live workout logger. Your numbers from last time show next to every set, and one tap logs the same again
- Set types: warm-up, drop set and failure, plus an optional RPE column
- Rest timer that starts on its own, with ±15s, sound, vibration and a per-exercise rest time
- Live PR detection 🏆 and a summary screen with confetti when you finish
- Exercises tracked by weight × reps, bodyweight (+ added weight), timed holds, or cardio distance and time
- Keeps the screen awake during workouts, plus workout and exercise notes
- Edit past workouts, or repeat any of them with one tap

**Plans**
- 7 ready-made programs: Push/Pull/Legs, Upper/Lower, Full Body Starter, Strength 5×5, Home (no equipment), Arms & Abs, Glutes & Legs
- Your own routines, with set counts, reordering, duplicating and swapping exercises
- A 76-exercise library you can add to, with an "Up next" suggestion on the Home screen

**Progress**
- Weekly goal ring, week streak, activity heatmap and sets per muscle group
- Per-exercise charts (est. 1RM, top weight, volume, reps, time, distance, pace), records and rep maxes
- Weekly workouts and volume charts, plus body-weight tracking with a trend chart

**Friends**
- Invite friends with a link that unlocks the app for them
- Send a routine or workout to a friend as a link. They can save it or do it right away
- Share a workout as an image card

**Other**
- Plate calculator with a warm-up ramp, and a 1RM calculator
- Dark, light or auto theme, 8 accent colors, kg or lb, week starting Monday or Sunday
- Backup export/import (JSON) and a spreadsheet export (CSV)

## Put it online (one time)

1. On GitHub, open this repo → **Settings → Pages**
2. Under **Build and deployment → Source**, choose **GitHub Actions**
3. Open the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**. It also redeploys automatically on every push
4. The app is live at `https://<your-username>.github.io/<repo-name>/`

## Invite friends

Open the app with your invite link (`…/?join=YOUR-CODE`), then go to **Profile → Invite friends**. That shares a link that unlocks the app.

- **iPhone:** open the link in Safari → Share → **Add to Home Screen**
- **Android:** open the link in Chrome → ⋮ → **Install app**

If the home-screen app ever asks for a code, friends can find it in **Profile → Code** on any member's phone.

### About the lock
The members-only lock keeps strangers from using the app. It's a shared crew code, not per-person accounts. The code itself is not stored in this repo, only a hash of it. Each person's workouts are stored **only on their own phone**: nothing is uploaded and nobody else can see them.

To **change the code** (for example, to cut off old invites), set `crewHash` in `js/config.js` to `sha256("ironlog-crew-v1:" + NEWCODE)`, where `NEWCODE` is uppercase with no dashes. Everyone then needs the new invite link. Setting `crewHash` to `''` turns the lock off.

## Run locally
```
python3 -m http.server 8000   # then open http://localhost:8000/?join=YOUR-CODE
```

## Project layout
```
index.html, manifest.webmanifest, sw.js   app shell, install metadata, offline cache
css/base.css, css/app.css                 design system + screens
js/app.js                                 boot, routing, tab bar
js/store.js, js/data.js                   data model, migrations, training math, exercise library
js/gate.js, js/onboarding.js              members-only lock, install guide, first-run setup
js/ui.js, js/charts.js, js/share.js       UI kit, charts, sharing links/images
js/views/*.js                             Home, Train/logger, History, Progress, Profile, exercises, tools
```
