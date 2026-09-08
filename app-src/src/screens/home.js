import { el } from '../lib/dom.js';
import { navigate } from '../lib/router.js';
import { renderScreen } from '../ui/shell.js';
import { getSummary, getSavedSession, getQuestions } from '../lib/storage.js';
import { getTopic, ACTIVITY_TYPES, ROUNDS_PER_SESSION } from '../data/topics.js';

export default function homeScreen() {
  const summary = getSummary();
  const saved = getSavedSession();
  const questions = getQuestions();

  const cards = [];

  // Pick up where you left off.
  if (saved) {
    const topic = getTopic(saved.topicId);
    const activity = ACTIVITY_TYPES.find((a) => a.id === saved.type);
    if (topic && activity) {
      cards.push(
        el('button', {
          type: 'button',
          class: 'card card-resume',
          onClick: () => navigate(`/practice/${saved.topicId}/${saved.type}`),
        }, [
          el('span', { class: 'card-eyebrow', text: 'Pick up where you left off' }),
          el('span', { class: 'card-title', text: `${topic.title} — ${activity.name}` }),
          el('span', {
            class: 'card-meta',
            text: `Round ${Math.min(saved.roundIndex + 1, ROUNDS_PER_SESSION)} of ${ROUNDS_PER_SESSION}`,
          }),
        ])
      );
    }
  }

  cards.push(
    el('button', {
      type: 'button',
      class: 'card card-primary',
      onClick: () => navigate('/topics'),
    }, [
      el('span', { class: 'card-icon', 'aria-hidden': 'true', text: '🎯' }),
      el('span', { class: 'topic-text' }, [
        el('span', {
          class: 'card-title',
          text: saved ? 'Start something new' : 'Start practising',
        }),
        el('span', { class: 'card-meta', text: 'Choose a topic, then an activity' }),
      ]),
      el('span', { class: 'topic-go', 'aria-hidden': 'true', text: '›' }),
    ])
  );

  if (questions.length) {
    cards.push(
      el('button', {
        type: 'button',
        class: 'card',
        onClick: () => navigate('/questions'),
      }, [
        el('span', { class: 'card-icon', 'aria-hidden': 'true', text: '🔖' }),
        el('span', { class: 'topic-text' }, [
          el('span', {
            class: 'card-title',
            text: `${questions.length} ${questions.length === 1 ? 'question' : 'questions'} for your teacher`,
          }),
          el('span', {
            class: 'card-meta',
            text: 'Open this in your lesson to remember what to ask',
          }),
        ]),
        el('span', { class: 'topic-go', 'aria-hidden': 'true', text: '›' }),
      ])
    );
  }

  const stats = el('div', { class: 'stat-row' }, [
    stat(summary.answered, 'questions answered'),
    stat(summary.sessions, summary.sessions === 1 ? 'session finished' : 'sessions finished'),
    stat(summary.topicsTouched, summary.topicsTouched === 1 ? 'topic started' : 'topics started'),
  ]);

  renderScreen({
    title: 'Practice makes Perfect',
    subtitle: 'Business English in Doses',
    backTo: null,
    body: [
      el('div', { class: 'stack' }, cards),
      summary.answered > 0 ? stats : hint(),
    ],
  });
}

function stat(value, label) {
  return el('div', { class: 'stat' }, [
    el('span', { class: 'stat-value', text: String(value) }),
    el('span', { class: 'stat-label', text: label }),
  ]);
}

function hint() {
  return el('div', { class: 'note' }, [
    el('p', {
      text: 'Each session is 12 questions, in three short rounds. You check your answers at the end of every round, and nothing is timed.',
    }),
    el('p', {
      text: 'Tap the bookmark on any question you want to ask about in your next lesson.',
    }),
  ]);
}
