import { el, markup, announce } from '../lib/dom.js';
import { navigate } from '../lib/router.js';
import { renderScreen } from '../ui/shell.js';
import { getActiveSession } from './session.js';
import { getSavedSession, toggleQuestion, isFlagged } from '../lib/storage.js';
import { getTopic, ACTIVITY_TYPES } from '../data/topics.js';
import { getEngine } from '../engines/index.js';

export default function reviewScreen() {
  const session = resolveSession();

  if (!session) {
    navigate('/topics', { replace: true });
    return;
  }

  const { topic, type, items, results } = session;
  const engine = getEngine(type);
  const activity = ACTIVITY_TYPES.find((a) => a.id === type);

  const rightCount = items.filter((i) => results[i.id]).length;
  const total = items.length;

  const scoreLine = el('div', { class: 'score' }, [
    el('span', { class: 'score-value', text: `${rightCount}/${total}` }),
    el('span', { class: 'score-label', text: scoreMessage(rightCount, total) }),
  ]);

  const rows = items.map((item, index) => {
    const right = Boolean(results[item.id]);

    return el('article', { class: `review-row ${right ? 'is-right' : 'is-wrong'}` }, [
      el('div', { class: 'review-head' }, [
        el('span', { class: 'review-number', text: String(index + 1) }),
        el('span', {
          class: 'review-mark',
          'aria-label': right ? 'Correct' : 'Not correct',
          text: right ? '✓' : '✗',
        }),
      ]),
      el('div', { class: 'review-body' }, [
        el('p', { class: 'review-text', html: markup(engine.label(item)) }),
        !right && item.clue ? el('p', { class: 'review-clue', html: markup(item.clue) }) : null,
      ]),
      reviewFlag(item, topic.id, type, engine),
    ]);
  });

  const lessonLinks = (topic.lessons || []).map((lesson) =>
    el('a', { class: 'btn btn-quiet', href: lesson.href, text: `Open ${lesson.label}` })
  );

  renderScreen({
    title: 'Your results',
    subtitle: `${topic.title} — ${activity.name}`,
    backTo: `/topic/${topic.id}`,
    body: [
      scoreLine,
      el('div', { class: 'stack stack-tight' }, rows),
      lessonLinks.length
        ? el('div', { class: 'note' }, [
            el('p', { text: 'Want to go back over the language in this topic?' }),
            el('div', { class: 'actions actions-inline' }, lessonLinks),
          ])
        : null,
      el('div', { class: 'actions actions-stacked' }, [
        el('button', {
          type: 'button',
          class: 'btn btn-primary',
          text: 'Try these again',
          onClick: () => navigate(`/practice/${topic.id}/${type}/replay`),
        }),
        el('button', {
          type: 'button',
          class: 'btn',
          text: 'Another activity',
          onClick: () => navigate(`/topic/${topic.id}`),
        }),
        el('button', {
          type: 'button',
          class: 'btn btn-quiet',
          text: 'Choose a topic',
          onClick: () => navigate('/topics'),
        }),
      ]),
    ],
  });
}

function resolveSession() {
  const live = getActiveSession();
  if (live && live.items?.length) {
    return { topic: live.topic, type: live.type, items: live.items, results: live.results };
  }

  // Coming back after a refresh — rebuild from what was saved.
  const saved = getSavedSession();
  if (!saved || !saved.finished) return null;

  const topic = getTopic(saved.topicId);
  if (!topic || !topic.items) return null;

  const byId = new Map((topic.items[saved.type] || []).map((i) => [i.id, i]));
  const items = (saved.itemIds || []).map((id) => byId.get(id)).filter(Boolean);
  if (!items.length) return null;

  return { topic, type: saved.type, items, results: saved.results || {} };
}

function reviewFlag(item, topicId, type, engine) {
  const button = el('button', {
    type: 'button',
    class: 'flag-btn flag-btn-icon',
    'aria-label': 'Save this to ask my teacher',
    title: 'Save this to ask my teacher',
    text: '🔖',
  });
  button.classList.toggle('is-on', isFlagged(item.id));
  button.setAttribute('aria-pressed', isFlagged(item.id) ? 'true' : 'false');

  button.addEventListener('click', () => {
    const added = toggleQuestion({ id: item.id, topicId, type, label: engine.label(item) });
    button.classList.toggle('is-on', added);
    button.setAttribute('aria-pressed', added ? 'true' : 'false');
    announce(added ? 'Saved to your questions list.' : 'Removed from your questions list.');
  });
  return button;
}

function scoreMessage(right, total) {
  if (right === total) return 'All correct — nicely done.';
  if (right >= total * 0.75) return 'Strong round.';
  if (right >= total * 0.5) return 'Good progress — worth another go.';
  return 'This one is worth revisiting.';
}
