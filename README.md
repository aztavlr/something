# IronLog 🏋️ — Gym Tracker

A free gym app you and your friends can install on your phones. No app store and no account needed. It works offline.

## Features
- **Routines**: Push, Pull and Legs are included, and you can make your own
- **Live workout logging**: weight × reps per set, with your **previous numbers** shown next to each set
- **Rest timer**: starts on its own when you tick off a set, then vibrates and beeps
- **History**: every workout with its duration, sets and total volume. You can repeat or delete any workout.
- **Progress charts**: estimated 1RM, top weight and volume for each exercise, plus PR tracking 🏆
- **Exercise library**: 28 exercises included, and you can add your own
- kg/lb, weekly streak, **backup export/import** (to move to a new phone)

All data stays on each person's own device.

## Put it online (one time, about 1 minute)
1. On GitHub, go to this repo → **Settings → Pages**
2. Under **Source**, pick **GitHub Actions**
3. Go to **Actions** → "Deploy to GitHub Pages" → **Run workflow** (it also runs on every push)
4. Your app is live at `https://<your-username>.github.io/<repo-name>/`

## Install on a phone
- **iPhone**: open the link in **Safari** → Share button → **Add to Home Screen**
- **Android**: open the link in **Chrome** → ⋮ menu → **Install app**

## Run locally
```
python3 -m http.server 8000   # then open http://localhost:8000
```
