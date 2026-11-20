// Built-in exercise library and starter programs.
// Exercise types: weight (kg × reps), bodyweight (+kg × reps), duration (seconds), cardio (distance + time)

export const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core', 'Cardio', 'Full Body', 'Other'];
export const EQUIPMENT = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Band', 'Other'];
export const TYPES = {
  weight: 'Weight × reps',
  bodyweight: 'Bodyweight reps',
  duration: 'Time (hold)',
  cardio: 'Distance + time',
};
export const MUSCLE_COLORS = {
  Chest: '#ff6b6b', Back: '#4dabf7', Shoulders: '#ffa94d', Arms: '#b197fc', Legs: '#51cf66',
  Glutes: '#f783ac', Core: '#ffd43b', Cardio: '#3bc9db', 'Full Body': '#ff922b', Other: '#adb5bd',
};

export const slug = (name) => 'd_' + name.toLowerCase().replace(/\W+/g, '_');

const RAW = [
  // Chest
  ['Bench Press', 'Chest', 'weight', 'Barbell'],
  ['Incline Bench Press', 'Chest', 'weight', 'Barbell'],
  ['Dumbbell Bench Press', 'Chest', 'weight', 'Dumbbell'],
  ['Incline Dumbbell Press', 'Chest', 'weight', 'Dumbbell'],
  ['Chest Fly', 'Chest', 'weight', 'Dumbbell'],
  ['Cable Fly', 'Chest', 'weight', 'Cable'],
  ['Pec Deck', 'Chest', 'weight', 'Machine'],
  ['Chest Press Machine', 'Chest', 'weight', 'Machine'],
  ['Push Up', 'Chest', 'bodyweight', 'Bodyweight'],
  ['Dip', 'Chest', 'bodyweight', 'Bodyweight'],
  // Back
  ['Deadlift', 'Back', 'weight', 'Barbell'],
  ['Pull Up', 'Back', 'bodyweight', 'Bodyweight'],
  ['Chin Up', 'Back', 'bodyweight', 'Bodyweight'],
  ['Barbell Row', 'Back', 'weight', 'Barbell'],
  ['Dumbbell Row', 'Back', 'weight', 'Dumbbell'],
  ['T-Bar Row', 'Back', 'weight', 'Barbell'],
  ['Lat Pulldown', 'Back', 'weight', 'Cable'],
  ['Seated Cable Row', 'Back', 'weight', 'Cable'],
  ['Back Extension', 'Back', 'bodyweight', 'Bodyweight'],
  ['Shrug', 'Back', 'weight', 'Dumbbell'],
  // Shoulders
  ['Overhead Press', 'Shoulders', 'weight', 'Barbell'],
  ['Dumbbell Shoulder Press', 'Shoulders', 'weight', 'Dumbbell'],
  ['Arnold Press', 'Shoulders', 'weight', 'Dumbbell'],
  ['Lateral Raise', 'Shoulders', 'weight', 'Dumbbell'],
  ['Cable Lateral Raise', 'Shoulders', 'weight', 'Cable'],
  ['Front Raise', 'Shoulders', 'weight', 'Dumbbell'],
  ['Rear Delt Fly', 'Shoulders', 'weight', 'Dumbbell'],
  ['Face Pull', 'Shoulders', 'weight', 'Cable'],
  // Arms
  ['Barbell Curl', 'Arms', 'weight', 'Barbell'],
  ['Dumbbell Curl', 'Arms', 'weight', 'Dumbbell'],
  ['Hammer Curl', 'Arms', 'weight', 'Dumbbell'],
  ['Preacher Curl', 'Arms', 'weight', 'Machine'],
  ['Cable Curl', 'Arms', 'weight', 'Cable'],
  ['Tricep Pushdown', 'Arms', 'weight', 'Cable'],
  ['Skull Crusher', 'Arms', 'weight', 'Barbell'],
  ['Overhead Tricep Extension', 'Arms', 'weight', 'Cable'],
  ['Close-Grip Bench Press', 'Arms', 'weight', 'Barbell'],
  ['Bench Dip', 'Arms', 'bodyweight', 'Bodyweight'],
  // Legs
  ['Squat', 'Legs', 'weight', 'Barbell'],
  ['Front Squat', 'Legs', 'weight', 'Barbell'],
  ['Goblet Squat', 'Legs', 'weight', 'Dumbbell'],
  ['Hack Squat', 'Legs', 'weight', 'Machine'],
  ['Leg Press', 'Legs', 'weight', 'Machine'],
  ['Bodyweight Squat', 'Legs', 'bodyweight', 'Bodyweight'],
  ['Bulgarian Split Squat', 'Legs', 'weight', 'Dumbbell'],
  ['Lunge', 'Legs', 'weight', 'Dumbbell'],
  ['Romanian Deadlift', 'Legs', 'weight', 'Barbell'],
  ['Leg Curl', 'Legs', 'weight', 'Machine'],
  ['Leg Extension', 'Legs', 'weight', 'Machine'],
  ['Calf Raise', 'Legs', 'weight', 'Machine'],
  // Glutes
  ['Hip Thrust', 'Glutes', 'weight', 'Barbell'],
  ['Glute Bridge', 'Glutes', 'bodyweight', 'Bodyweight'],
  ['Cable Kickback', 'Glutes', 'weight', 'Cable'],
  ['Hip Abduction', 'Glutes', 'weight', 'Machine'],
  // Core
  ['Plank', 'Core', 'duration', 'Bodyweight'],
  ['Side Plank', 'Core', 'duration', 'Bodyweight'],
  ['Hanging Leg Raise', 'Core', 'bodyweight', 'Bodyweight'],
  ['Cable Crunch', 'Core', 'weight', 'Cable'],
  ['Crunch', 'Core', 'bodyweight', 'Bodyweight'],
  ['Russian Twist', 'Core', 'bodyweight', 'Bodyweight'],
  ['Ab Wheel Rollout', 'Core', 'bodyweight', 'Bodyweight'],
  ['Mountain Climber', 'Core', 'duration', 'Bodyweight'],
  // Full body
  ['Kettlebell Swing', 'Full Body', 'weight', 'Kettlebell'],
  ['Power Clean', 'Full Body', 'weight', 'Barbell'],
  ['Thruster', 'Full Body', 'weight', 'Barbell'],
  ['Burpee', 'Full Body', 'bodyweight', 'Bodyweight'],
  ['Box Jump', 'Full Body', 'bodyweight', 'Bodyweight'],
  ["Farmer's Carry", 'Full Body', 'duration', 'Dumbbell'],
  // Cardio
  ['Running', 'Cardio', 'cardio', 'Other'],
  ['Treadmill', 'Cardio', 'cardio', 'Machine'],
  ['Cycling', 'Cardio', 'cardio', 'Other'],
  ['Rowing Machine', 'Cardio', 'cardio', 'Machine'],
  ['Incline Walk', 'Cardio', 'cardio', 'Machine'],
  ['Elliptical', 'Cardio', 'cardio', 'Machine'],
  ['Stair Climber', 'Cardio', 'duration', 'Machine'],
  ['Jump Rope', 'Cardio', 'duration', 'Other'],
];

export const DEFAULT_EXERCISES = RAW.map(([name, muscle, type, equipment]) => ({ id: slug(name), name, muscle, type, equipment }));

// [exercise name, sets, target reps]
export const PROGRAMS = [
  {
    id: 'ppl', name: 'Push · Pull · Legs', emoji: '🔥', level: 'Intermediate', days: '3–6 days / week',
    tagline: 'The classic muscle-building split.',
    routines: [
      { name: 'Push Day', items: [['Bench Press', 4, 8], ['Overhead Press', 3, 8], ['Incline Dumbbell Press', 3, 10], ['Lateral Raise', 3, 15], ['Tricep Pushdown', 3, 12]] },
      { name: 'Pull Day', items: [['Deadlift', 3, 5], ['Pull Up', 3, 8], ['Barbell Row', 3, 10], ['Face Pull', 3, 15], ['Barbell Curl', 3, 12]] },
      { name: 'Leg Day', items: [['Squat', 4, 6], ['Romanian Deadlift', 3, 10], ['Leg Press', 3, 12], ['Leg Curl', 3, 12], ['Calf Raise', 4, 15]] },
    ],
  },
  {
    id: 'ul', name: 'Upper / Lower', emoji: '⚡', level: 'Intermediate', days: '4 days / week',
    tagline: 'Hit everything twice a week.',
    routines: [
      { name: 'Upper Body', items: [['Bench Press', 4, 6], ['Barbell Row', 4, 8], ['Dumbbell Shoulder Press', 3, 10], ['Lat Pulldown', 3, 10], ['Dumbbell Curl', 2, 12], ['Tricep Pushdown', 2, 12]] },
      { name: 'Lower Body', items: [['Squat', 4, 6], ['Romanian Deadlift', 3, 8], ['Bulgarian Split Squat', 3, 10], ['Leg Extension', 3, 12], ['Calf Raise', 3, 15], ['Plank', 3, 45]] },
    ],
  },
  {
    id: 'fb', name: 'Full Body Starter', emoji: '🌱', level: 'Beginner', days: '3 days / week',
    tagline: 'Simple A/B workouts to learn the big lifts.',
    routines: [
      { name: 'Full Body A', items: [['Goblet Squat', 3, 10], ['Dumbbell Bench Press', 3, 10], ['Lat Pulldown', 3, 10], ['Dumbbell Shoulder Press', 2, 12], ['Plank', 3, 30]] },
      { name: 'Full Body B', items: [['Leg Press', 3, 12], ['Chest Press Machine', 3, 10], ['Seated Cable Row', 3, 10], ['Glute Bridge', 3, 12], ['Crunch', 3, 15]] },
    ],
  },
  {
    id: 'sl5', name: 'Strength 5×5', emoji: '🏋️', level: 'All levels', days: '3 days / week',
    tagline: 'Few lifts, heavy weight, add a little every session.',
    routines: [
      { name: '5×5 Workout A', items: [['Squat', 5, 5], ['Bench Press', 5, 5], ['Barbell Row', 5, 5]] },
      { name: '5×5 Workout B', items: [['Squat', 5, 5], ['Overhead Press', 5, 5], ['Deadlift', 1, 5]] },
    ],
  },
  {
    id: 'home', name: 'Home · No Equipment', emoji: '🏠', level: 'All levels', days: '3–5 days / week',
    tagline: 'Train anywhere with just your body.',
    routines: [
      { name: 'Home Upper', items: [['Push Up', 4, 12], ['Bench Dip', 3, 12], ['Pull Up', 3, 6], ['Plank', 3, 45], ['Mountain Climber', 3, 30]] },
      { name: 'Home Lower', items: [['Bodyweight Squat', 4, 20], ['Glute Bridge', 3, 15], ['Burpee', 3, 10], ['Side Plank', 2, 30], ['Russian Twist', 3, 20]] },
    ],
  },
  {
    id: 'arms', name: 'Arms & Abs', emoji: '💪', level: 'All levels', days: 'Add-on day',
    tagline: 'Pump day for the guns and core.',
    routines: [
      { name: 'Arms & Abs', items: [['Barbell Curl', 3, 10], ['Skull Crusher', 3, 10], ['Hammer Curl', 3, 12], ['Overhead Tricep Extension', 3, 12], ['Hanging Leg Raise', 3, 12], ['Cable Crunch', 3, 15]] },
    ],
  },
  {
    id: 'glutes', name: 'Glutes & Legs', emoji: '🍑', level: 'All levels', days: '2 days / week',
    tagline: 'Lower body focus with plenty of hip thrusts.',
    routines: [
      { name: 'Glutes & Legs', items: [['Hip Thrust', 4, 10], ['Bulgarian Split Squat', 3, 10], ['Romanian Deadlift', 3, 10], ['Hip Abduction', 3, 15], ['Cable Kickback', 3, 15]] },
    ],
  },
];

export const AVATARS = ['💪', '🏋️', '🔥', '🦍', '🐻', '🦁', '⚡', '🏆', '🚀', '😤', '🤖', '👑', '🐺', '🦾', '🧠', '🥇', '🐉', '🌟'];

export const ACCENTS = {
  ember: '#ff6b35', blue: '#3b82f6', violet: '#8b5cf6', pink: '#ec4899',
  green: '#22c55e', teal: '#14b8a6', gold: '#f59e0b', red: '#ef4444',
};
