/**
 * Topic list, in lesson order.
 *
 * Topics with an `items` bank are playable. The rest are listed so students can
 * see what's coming, and are filled in one at a time.
 */
import lesson1 from './lesson1.js';
import lesson2 from './lesson2.js';
import lesson3 from './lesson3.js';
import lesson4 from './lesson4.js';
import lesson5 from './lesson5.js';
import lesson6 from './lesson6.js';
import lesson6b from './lesson6b.js';
import lesson7 from './lesson7.js';
import lesson8 from './lesson8.js';

/** Topics that are written and playable. */
const ready = [lesson1, lesson2, lesson3, lesson4, lesson5, lesson6, lesson6b, lesson7, lesson8];

/** Placeholders — same order as the course. Empty until the next lessons are written. */
const upcoming = [];

export const ACTIVITY_TYPES = [
  {
    id: 'gapfill',
    name: 'Gap-fill',
    blurb: 'Choose the word that completes the sentence.',
    icon: '📝',
  },
  {
    id: 'rightwrong',
    name: 'Right or Wrong',
    blurb: 'Decide whether the sentence is correct.',
    icon: '⚖️',
  },
  {
    id: 'matching',
    name: 'Matching',
    blurb: 'Match each phrase to what it does.',
    icon: '🔗',
  },
  {
    id: 'wordorder',
    name: 'Word Order',
    blurb: 'Put the words in the right order.',
    icon: '🔤',
  },
];

export const QUESTIONS_PER_ROUND = 4;
export const ROUNDS_PER_SESSION = 3;
export const SESSION_LENGTH = QUESTIONS_PER_ROUND * ROUNDS_PER_SESSION;

export const topics = [...ready, ...upcoming.map((t) => ({ ...t, items: null }))].sort(
  (a, b) => a.order - b.order
);

export function getTopic(id) {
  return topics.find((t) => t.id === id) || null;
}

export function isPlayable(topic) {
  return Boolean(topic && topic.items);
}

/** Activity types that actually have enough items in this topic. */
export function availableActivities(topic) {
  if (!isPlayable(topic)) return [];
  return ACTIVITY_TYPES.filter((a) => (topic.items[a.id] || []).length >= QUESTIONS_PER_ROUND);
}
