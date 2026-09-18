/**
 * The dashboard's welcome: a different greeting each time, and a small
 * question to get the student thinking in English before they start.
 */

/** `{name}` is swapped for their first name; the second form is used without one. */
const GREETINGS = [
  ['Hi, {name}!', 'Hi there!'],
  ['Hello, {name}!', 'Hello!'],
  ['Welcome back, {name}!', 'Welcome back!'],
  ['Good to see you, {name}!', 'Good to see you!'],
  ['Nice to see you, {name}!', 'Nice to see you!'],
  ['Hey, {name}!', 'Hey there!'],
  ['Great to have you back, {name}!', 'Great to have you back!'],
  ['{timeOfDay}, {name}!', '{timeOfDay}!'],
  ['Ready when you are, {name}!', 'Ready when you are!'],
];

const QUESTIONS = [
  'How was work today?',
  'Did you use English today?',
  'Did you see or hear any new English words today?',
  'What’s the busiest part of your week?',
  'Have you had any meetings in English this week?',
  'Did you write an email in English today?',
  'What’s one thing you’d like to get better at in English?',
  'Who did you talk to at work today?',
  'What are you working on at the moment?',
  'Did you read anything interesting in English today?',
  'What was the best part of your day so far?',
  'Is there a phrase you’d like to use more often?',
  'Have you watched or listened to anything in English lately?',
  'What’s on your to-do list for tomorrow?',
  'Did anything make you smile at work this week?',
  'What’s one new word you could use in a meeting this week?',
];

const LAST_KEY = 'bizeng.lastWelcome';

// Chosen once each time the app opens, so it doesn't change every time the
// student comes back to the dashboard during one visit.
let chosen = null;

/** A greeting and a question, never the same as the last time the app opened. */
export function welcome(firstName) {
  if (!chosen) {
    const last = readLast();
    chosen = { g: pick(GREETINGS.length, last.g), q: pick(QUESTIONS.length, last.q) };
    writeLast(chosen);
  }
  const { g, q } = chosen;

  const [withName, without] = GREETINGS[g];
  const greeting = (firstName ? withName.replace('{name}', firstName) : without).replace(
    '{timeOfDay}',
    timeOfDay()
  );
  return { greeting, question: QUESTIONS[q] };
}

function pick(count, avoid) {
  let i = Math.floor(Math.random() * count);
  if (i === avoid) i = (i + 1 + Math.floor(Math.random() * (count - 1))) % count;
  return i;
}

function timeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function readLast() {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY)) || {};
  } catch {
    return {};
  }
}

function writeLast(value) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(value));
  } catch {
    /* it'll just repeat sometimes */
  }
}
