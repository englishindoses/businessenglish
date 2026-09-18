/**
 * The dashboard: who's here, what to do next, and how it's going.
 */
import { el } from '../lib/dom.js';
import { navigate } from '../lib/router.js';
import { renderScreen } from '../ui/shell.js';
import { installCard } from '../ui/install.js';
import { avatar, firstName } from '../ui/avatar.js';
import { totalIn, progressBar, statRow } from '../ui/progress.js';
import { getAccount, logOut } from '../lib/account.js';
import {
  getSummary,
  getSavedSession,
  getQuestions,
  getProgress,
  seenInTopic,
} from '../lib/storage.js';
import {
  topics,
  getTopic,
  isPlayable,
  lessonLabel,
  ACTIVITY_TYPES,
  ROUNDS_PER_SESSION,
} from '../data/topics.js';

export default function homeScreen() {
  const account = getAccount();
  const summary = getSummary();
  const saved = getSavedSession();
  const questions = getQuestions();
  const progress = getProgress();

  const body = [greeting(account, summary)];
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

  const next = upNext(progress);
  if (next && summary.answered > 0) cards.push(next);

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

  if (account.isTeacher) {
    cards.push(
      el('button', {
        type: 'button',
        class: 'card',
        onClick: () => navigate('/students'),
      }, [
        el('span', { class: 'card-icon', 'aria-hidden': 'true', text: '👥' }),
        el('span', { class: 'topic-text' }, [
          el('span', { class: 'card-title', text: 'Your students' }),
          el('span', { class: 'card-meta', text: 'Progress and saved questions' }),
        ]),
        el('span', { class: 'topic-go', 'aria-hidden': 'true', text: '›' }),
      ])
    );
  }

  body.push(el('div', { class: 'stack' }, cards));

  if (summary.answered > 0) {
    body.push(
      el('section', { class: 'dash-section' }, [
        el('div', { class: 'dash-heading' }, [
          el('h2', { text: 'Your progress' }),
          el('a', { href: '#/progress', text: 'See all' }),
        ]),
        statRow(progress),
      ])
    );
  } else {
    body.push(hint());
  }

  if (account.kind === 'guest') body.push(guestNote());

  const install = installCard();
  if (install) body.push(install);

  renderScreen({
    title: 'Practice makes Perfect',
    subtitle: 'Business English in Doses',
    backTo: null,
    body,
  });
}

function greeting(account, summary) {
  const name = firstName(account.student?.name);
  const hello = name ? `Hi, ${name}!` : 'Hi there!';
  const line =
    summary.answered > 0
      ? 'Good to see you again. Ready for a little more practice?'
      : 'Let’s get started with your first practice session.';

  return el('div', { class: 'greeting' }, [
    avatar(account.student || {}, 'lg'),
    el('div', {}, [
      el('p', { class: 'greeting-hello', text: hello }),
      el('p', { class: 'greeting-line', text: line }),
    ]),
  ]);
}

/** The first topic, in lesson order, with questions the student hasn't met yet. */
function upNext(progress) {
  const topic = topics.find((t) => isPlayable(t) && seenInTopic(progress, t.id) < totalIn(t));
  if (!topic) return null;
  const seen = seenInTopic(progress, topic.id);
  const total = totalIn(topic);

  return el('button', {
    type: 'button',
    class: 'card card-topic',
    onClick: () => navigate(`/topic/${topic.id}`),
  }, [
    el('span', { class: 'topic-icon', 'aria-hidden': 'true', text: topic.icon }),
    el('span', { class: 'topic-text' }, [
      el('span', { class: 'card-eyebrow', text: `Up next · ${lessonLabel(topic)}` }),
      el('span', { class: 'card-title', text: topic.title }),
      progressBar(seen, total),
      el('span', { class: 'card-meta', text: `${seen} of ${total} questions practised` }),
    ]),
    el('span', { class: 'topic-go', 'aria-hidden': 'true', text: '›' }),
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

function guestNote() {
  return el('div', { class: 'note note-action' }, [
    el('p', {
      text: 'You’re practising as a guest, so your progress is saved on this device only. Sign in to keep it on any phone or computer.',
    }),
    el('button', {
      type: 'button',
      class: 'btn btn-primary',
      text: 'Sign in with Google',
      onClick: async () => {
        await logOut(); // leaves guest mode; their practice stays on the device
        window.location.replace(window.location.pathname);
      },
    }),
  ]);
}
