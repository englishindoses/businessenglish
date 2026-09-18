/**
 * The dashboard: a welcome, one big way into practice, clear progress, and
 * quick links to everything else.
 */
import { el } from '../lib/dom.js';
import { navigate } from '../lib/router.js';
import { renderScreen } from '../ui/shell.js';
import { installCard } from '../ui/install.js';
import { avatar, firstName } from '../ui/avatar.js';
import { welcome } from '../ui/greetings.js';
import { totalIn, progressBar, statRow, courseBar } from '../ui/progress.js';
import { getAccount, logOut } from '../lib/account.js';
import {
  getSummary,
  getSavedSession,
  getQuestions,
  getProgress,
  getPracticeDays,
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

  const body = [greeting(account)];

  // ---- practice ----
  const practice = [];
  const resume = resumeCard(saved);
  if (resume) practice.push(resume);
  practice.push(startButton(Boolean(resume)));
  body.push(el('div', { class: 'stack' }, practice));

  // ---- progress ----
  body.push(
    el('section', { class: 'dash-section' }, [
      el('div', { class: 'dash-heading' }, [
        el('h2', { text: 'Your progress' }),
        summary.answered > 0 ? el('a', { href: '#/progress', text: 'See all' }) : null,
      ]),
      summary.answered > 0
        ? el('div', { class: 'stack' }, [
            statRow(progress, getPracticeDays()),
            courseBar(progress),
            upNext(progress),
          ])
        : el('div', { class: 'note' }, [
            el('p', {
              text: 'Each session has 3 sets of 4 questions (12 in total). There is no timer, so take your time to think. Remember you can save a question to ask your teacher later!',
            }),
          ]),
    ])
  );

  // ---- quick links ----
  body.push(
    el('section', { class: 'dash-section' }, [
      el('div', { class: 'tile-grid' }, [
        tile('📖', 'How to use BizEng', () => navigate('/help')),
        tile('🔖', 'Saved questions', () => navigate('/questions'), questions.length || null),
        tile('👤', 'Profile', () => navigate('/profile')),
        tile('⚙', 'Settings', () => navigate('/settings')),
      ]),
    ])
  );

  if (account.isTeacher) {
    body.push(
      el('button', {
        type: 'button',
        class: 'card dash-card',
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

function greeting(account) {
  const { greeting: hello, question } = welcome(firstName(account.student?.name));
  return el('div', { class: 'greeting' }, [
    avatar(account.student || {}, 'lg'),
    el('div', {}, [
      el('p', { class: 'greeting-hello', text: hello }),
      el('p', { class: 'greeting-line', text: question }),
    ]),
  ]);
}

function resumeCard(saved) {
  if (!saved) return null;
  const topic = getTopic(saved.topicId);
  const activity = ACTIVITY_TYPES.find((a) => a.id === saved.type);
  if (!topic || !activity) return null;

  return el('button', {
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
  ]);
}

function startButton(hasResume) {
  return el('button', {
    type: 'button',
    class: 'start-btn',
    onClick: () => navigate('/topics'),
  }, [
    el('span', { class: 'start-btn-icon', 'aria-hidden': 'true', text: '▶' }),
    el('span', { class: 'start-btn-text' }, [
      el('span', {
        class: 'start-btn-title',
        text: hasResume ? 'Start something new' : 'Start practising',
      }),
      el('span', { class: 'start-btn-meta', text: 'Choose a topic, then an activity' }),
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

function tile(icon, label, onClick, badge = null) {
  return el('button', { type: 'button', class: 'tile', onClick }, [
    el('span', { class: 'tile-icon', 'aria-hidden': 'true', text: icon }),
    el('span', { class: 'tile-label', text: label }),
    badge ? el('span', { class: 'tile-badge', 'aria-label': `${badge} saved`, text: String(badge) }) : null,
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
