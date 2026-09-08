/**
 * Topic list, in lesson order.
 *
 * Topics with an `items` bank are playable. The rest are listed so students can
 * see what's coming, and are filled in one at a time.
 */
import lesson1 from './lesson1.js';

/** Topics that are written and playable. */
const ready = [lesson1];

/** Placeholders — same order as the course. */
const upcoming = [
  { id: 'lesson2', order: 2, title: 'Building Professional Relationships', subtitle: 'Starting, sustaining and ending conversations', icon: '☕' },
  { id: 'lesson3', order: 3, title: 'Interview Skills', subtitle: 'STAR answers, buying time, describing achievements', icon: '💼' },
  { id: 'lesson4', order: 4, title: 'Professional Email Communication', subtitle: 'Polite requests, formality, transitions', icon: '✉️' },
  { id: 'lesson5', order: 5, title: 'Phone and Video Calls', subtitle: 'Opening, clarifying, technical problems, closing', icon: '📞' },
  { id: 'lesson6', order: 6, title: 'Speaking Up in Meetings', subtitle: 'Opinions, diplomatic disagreement, hedging', icon: '🗣️' },
  { id: 'lesson6b', order: 7, title: 'Hedging and Politeness', subtitle: 'Second conditional and softening techniques', icon: '🎭' },
  { id: 'lesson7', order: 8, title: 'Meetings: Clarifying and Summarising', subtitle: 'Interrupting, clarifying, reported speech', icon: '👥' },
  { id: 'lesson8', order: 9, title: 'Presenting Ideas with Clarity', subtitle: 'Signposting, emphasis, the passive voice', icon: '📊' },
];

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
