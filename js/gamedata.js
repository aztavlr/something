// Gamification data: landmark milestones, weekly challenge tiers, strength standards.

// Lifetime volume milestones (approximate real-world weights).
export const LANDMARKS = [
  { kg: 500, name: 'Grand Piano', emoji: '🎹', line: 'Pitch-perfect start.', sky: ['#3b2f63', '#8d6bd6'] },
  { kg: 1500, name: 'Family Car', emoji: '🚗', line: 'You just lifted a whole sedan.', sky: ['#173b5c', '#3f8fd1'] },
  { kg: 3000, name: 'Hippo', emoji: '🦛', line: 'Absolute unit.', sky: ['#2e4a2a', '#7fb35a'] },
  { kg: 6000, name: 'Elephant', emoji: '🐘', line: 'Never forget leg day.', sky: ['#5b4523', '#d6a24a'] },
  { kg: 8000, name: 'T-Rex', emoji: '🦖', line: 'Tiny arms, huge numbers.', sky: ['#33401b', '#a4b83b'] },
  { kg: 12000, name: 'Double-Decker Bus', emoji: '🚌', line: 'All aboard the gain train.', sky: ['#5c1f1f', '#d9534f'] },
  { kg: 30000, name: 'Humpback Whale', emoji: '🐋', line: 'Having a whale of a time.', sky: ['#0d3550', '#2f8cc2'] },
  { kg: 41000, name: 'Boeing 737', emoji: '✈️', line: 'Cleared for takeoff.', sky: ['#1d3d6b', '#78b3f0'] },
  { kg: 120000, name: 'Locomotive', emoji: '🚂', line: 'Full steam ahead.', sky: ['#3a2a1f', '#a8754b'] },
  { kg: 150000, name: 'Blue Whale', emoji: '🐳', line: 'Biggest animal ever. Lifted.', sky: ['#0b2c4a', '#3aa6d9'] },
  { kg: 204000, name: 'Statue of Liberty', emoji: '🗽', line: 'Give me liberty or give me gains.', sky: ['#1f4a44', '#5fbfa8'] },
  { kg: 420000, name: 'Space Station', emoji: '🛰️', line: 'Out of this world.', sky: ['#0b0f2a', '#4b4fa8'] },
  { kg: 575000, name: 'Airbus A380', emoji: '🛫', line: 'Double-decker in the sky.', sky: ['#173a6a', '#8cc4f2'] },
  { kg: 2100000, name: 'London Eye', emoji: '🎡', line: 'A wheel achievement.', sky: ['#3c3f58', '#b8a6d9'] },
  { kg: 10100000, name: 'Eiffel Tower', emoji: '🗼', line: 'Ooh là là!', sky: ['#4a2d1d', '#e0a35b'] },
  { kg: 52000000, name: 'Titanic', emoji: '🚢', line: 'This ship is not sinking.', sky: ['#0e2238', '#4f7fa8'] },
  { kg: 331000000, name: 'Empire State Building', emoji: '🏙️', line: 'King of the city.', sky: ['#24263a', '#8a8fb8'] },
];

// Weekly volume badge tiers.
export const WEEK_TIERS = [
  { kg: 2000, name: 'Ox', emoji: '🐂', color: '#c08a3e' },
  { kg: 4000, name: 'Rhino', emoji: '🦏', color: '#8a96a8' },
  { kg: 6500, name: 'Elephant', emoji: '🐘', color: '#7d8ba1' },
  { kg: 9000, name: 'T-Rex', emoji: '🦖', color: '#3c9ad6' },
  { kg: 13000, name: 'Whale', emoji: '🐋', color: '#2b6cb0' },
  { kg: 20000, name: 'Kraken', emoji: '🐙', color: '#7c3aed' },
];

// Weekly challenges (besides the volume tiers).
export const CHALLENGES = [
  { id: 'goal', name: 'On Target', emoji: '🎯', color: '#e5484d' },
  { id: 'pr', name: 'Record Breaker', emoji: '🏆', color: '#d4a017' },
  { id: 'muscles', name: 'Well Rounded', emoji: '🧩', color: '#2f9e6b' },
  { id: 'reps', name: 'Rep Machine', emoji: '🔁', color: '#3b82f6' },
  { id: 'early', name: 'Early Bird', emoji: '🌅', color: '#f08c00' },
];

export const LEVELS = [
  { name: 'Beginner', color: '#ef4444' },
  { name: 'Novice', color: '#f97316' },
  { name: 'Intermediate', color: '#facc15' },
  { name: 'Advanced', color: '#22c55e' },
  { name: 'Expert', color: '#3b82f6' },
  { name: 'World Class', color: '#a855f7' },
];

export const MUSCLE_NAMES = {
  chest: 'Chest', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms',
  abs: 'Abs', obliques: 'Obliques', traps: 'Traps', lats: 'Back', lowerback: 'Lower back',
  glutes: 'Glutes', quads: 'Quads', hamstrings: 'Hamstrings', calves: 'Calves',
};

// Strength standards (men). Thresholds to reach Novice, Intermediate, Advanced, Expert, World Class.
//   w: one-rep max ÷ body weight (dumbbell lifts: per dumbbell)
//   reps: max reps in one set at body weight     secs: longest hold in seconds
// Women: weight ratios × 0.65 (upper body) or × 0.75 (lower body), reps/secs × 0.6 (upper body).
export const STANDARDS = {
  d_bench_press: { m: ['chest'], w: [0.5, 0.75, 1, 1.5, 2], upper: true },
  d_incline_bench_press: { m: ['chest'], w: [0.4, 0.65, 0.85, 1.25, 1.65], upper: true },
  d_dumbbell_bench_press: { m: ['chest'], w: [0.2, 0.35, 0.5, 0.7, 0.9], upper: true },
  d_incline_dumbbell_press: { m: ['chest'], w: [0.17, 0.3, 0.45, 0.62, 0.8], upper: true },
  d_chest_press_machine: { m: ['chest'], w: [0.4, 0.75, 1, 1.4, 1.8], upper: true },
  d_push_up: { m: ['chest'], reps: [5, 15, 30, 45, 60], upper: true },
  d_dip: { m: ['triceps', 'chest'], reps: [2, 8, 15, 25, 35], upper: true },
  d_overhead_press: { m: ['shoulders'], w: [0.35, 0.55, 0.8, 1.05, 1.35], upper: true },
  d_dumbbell_shoulder_press: { m: ['shoulders'], w: [0.15, 0.25, 0.4, 0.55, 0.75], upper: true },
  d_arnold_press: { m: ['shoulders'], w: [0.13, 0.22, 0.35, 0.5, 0.68], upper: true },
  d_lateral_raise: { m: ['shoulders'], w: [0.05, 0.1, 0.15, 0.25, 0.35], upper: true },
  d_barbell_curl: { m: ['biceps'], w: [0.2, 0.4, 0.6, 0.85, 1.15], upper: true },
  d_dumbbell_curl: { m: ['biceps'], w: [0.1, 0.2, 0.3, 0.45, 0.6], upper: true },
  d_hammer_curl: { m: ['biceps', 'forearms'], w: [0.1, 0.2, 0.3, 0.45, 0.6], upper: true },
  d_preacher_curl: { m: ['biceps'], w: [0.15, 0.3, 0.5, 0.7, 0.95], upper: true },
  d_chin_up: { m: ['biceps', 'lats'], reps: [1, 6, 11, 17, 24], upper: true },
  d_tricep_pushdown: { m: ['triceps'], w: [0.25, 0.5, 0.75, 1, 1.4], upper: true },
  d_skull_crusher: { m: ['triceps'], w: [0.15, 0.35, 0.55, 0.8, 1.05], upper: true },
  d_close_grip_bench_press: { m: ['triceps'], w: [0.45, 0.7, 0.95, 1.35, 1.75], upper: true },
  d_pull_up: { m: ['lats'], reps: [1, 5, 10, 15, 22], upper: true },
  d_barbell_row: { m: ['lats'], w: [0.5, 0.75, 1, 1.5, 1.75], upper: true },
  d_dumbbell_row: { m: ['lats'], w: [0.2, 0.35, 0.5, 0.75, 1], upper: true },
  d_lat_pulldown: { m: ['lats'], w: [0.5, 0.75, 1, 1.25, 1.6], upper: true },
  d_seated_cable_row: { m: ['lats'], w: [0.5, 0.75, 1, 1.3, 1.65], upper: true },
  d_shrug: { m: ['traps'], w: [0.5, 1, 1.5, 2, 2.75], upper: true },
  d_deadlift: { m: ['lowerback', 'hamstrings', 'traps'], w: [1, 1.5, 2, 2.5, 3] },
  d_back_extension: { m: ['lowerback'], reps: [5, 15, 25, 35, 50] },
  d_squat: { m: ['quads', 'glutes'], w: [0.75, 1.25, 1.5, 2.25, 2.75] },
  d_front_squat: { m: ['quads'], w: [0.6, 1, 1.25, 1.75, 2.25] },
  d_hack_squat: { m: ['quads'], w: [0.75, 1.25, 1.75, 2.5, 3.25] },
  d_leg_press: { m: ['quads'], w: [1, 2, 2.75, 3.75, 4.75] },
  d_leg_extension: { m: ['quads'], w: [0.5, 0.75, 1.1, 1.5, 2] },
  d_romanian_deadlift: { m: ['hamstrings'], w: [0.75, 1, 1.5, 2, 2.5] },
  d_leg_curl: { m: ['hamstrings'], w: [0.4, 0.6, 0.9, 1.2, 1.6] },
  d_hip_thrust: { m: ['glutes'], w: [0.75, 1.25, 1.75, 2.5, 3.25] },
  d_calf_raise: { m: ['calves'], w: [0.5, 1, 1.5, 2.25, 3] },
  d_plank: { m: ['abs'], secs: [30, 60, 120, 180, 300] },
  d_side_plank: { m: ['obliques'], secs: [20, 45, 75, 120, 180] },
  d_hanging_leg_raise: { m: ['abs'], reps: [3, 8, 15, 20, 30] },
  d_ab_wheel_rollout: { m: ['abs'], reps: [3, 8, 15, 25, 35] },
  d_cable_crunch: { m: ['abs'], w: [0.3, 0.5, 0.75, 1, 1.3] },
  d_russian_twist: { m: ['obliques'], reps: [10, 20, 35, 50, 70] },
};
