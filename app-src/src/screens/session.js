/**
 * A practice session: 12 questions, in three rounds of four.
 *
 * The student answers a round, checks it, fixes anything that's wrong, then
 * moves on. A question counts as right once it checks green — this is practice,
 * not a test, so getting there after a correction still counts.
 */
import { el, markup, announce } from '../lib/dom.js';
import { navigate } from '../lib/router.js';
import { renderScreen } from '../ui/shell.js';
import { confirmDialog } from '../ui/dialog.js';
import { getEngine } from '../engines/index.js';
import {
  getTopic,
  ACTIVITY_TYPES,
  QUESTIONS_PER_ROUND,
  ROUNDS_PER_SESSION,
  SESSION_LENGTH,
} from '../data/topics.js';
import { drawItems } from '../lib/pool.js';
import {
  saveSession,
  clearSavedSession,
  getSavedSession,
  getBankProgress,
  saveBankProgress,
  toggleQuestion,
  isFlagged,
  getSettings,
} from '../lib/storage.js';

/** The session in play. Held in memory; a summary is mirrored to storage. */
let active = null;

export function getActiveSession() {
  return active;
}

function persist() {
  if (!active) return;
  saveSession({
    topicId: active.topic.id,
    type: active.type,
    itemIds: active.items.map((i) => i.id),
    roundIndex: active.roundIndex,
    results: active.results,
    finished: active.finished,
  });
}

function buildSession(topic, type, itemIds = null) {
  let items;
  if (itemIds) {
    const byId = new Map((topic.items[type] || []).map((i) => [i.id, i]));
    items = itemIds.map((id) => byId.get(id)).filter(Boolean);
  } else {
    items = drawItems(topic, type, SESSION_LENGTH).items;
  }

  return {
    topic,
    type,
    engine: getEngine(type),
    items,
    roundIndex: 0,
    results: {},
    finished: false,
  };
}

export default function sessionScreen({ id, type, mode }) {
  const topic = getTopic(id);
  const engine = getEngine(type);

  if (!topic || !topic.items || !engine || !(topic.items[type] || []).length) {
    navigate('/topics', { replace: true });
    return;
  }

  const resumable = getSavedSession();
  const canResume =
    mode !== 'replay' &&
    resumable &&
    !resumable.finished &&
    resumable.topicId === topic.id &&
    resumable.type === type;

  const sameSession =
    active && active.topic.id === topic.id && active.type === type && !active.finished;

  if (mode === 'replay') {
    const source = active?.items?.length ? active.items.map((i) => i.id) : resumable?.itemIds;
    active = buildSession(topic, type, source || null);
  } else if (!sameSession) {
    active = canResume ? buildSession(topic, type, resumable.itemIds) : buildSession(topic, type);
    if (canResume) {
      active.roundIndex = Math.min(resumable.roundIndex || 0, ROUNDS_PER_SESSION - 1);
      active.results = resumable.results || {};
    }
  }

  if (active.items.length < SESSION_LENGTH) {
    // Not enough written yet for a full session — run what there is.
    active.roundCount = Math.max(1, Math.ceil(active.items.length / QUESTIONS_PER_ROUND));
  } else {
    active.roundCount = ROUNDS_PER_SESSION;
  }

  persist();
  renderRound();
}

function renderRound() {
  const { topic, type, engine, items, roundIndex, roundCount } = active;
  const activity = ACTIVITY_TYPES.find((a) => a.id === type);

  const start = roundIndex * QUESTIONS_PER_ROUND;
  const roundItems = items.slice(start, start + QUESTIONS_PER_ROUND);

  const controls = [];
  let checkedOnce = false;
  const questions = [];

  // --- build the question cards -------------------------------------------

  const cards = [];

  if (engine.mode === 'per-round') {
    const round = engine.createRound(roundItems);
    const card = el('article', { class: 'qcard' }, [round.node]);
    cards.push(card);

    roundItems.forEach((item, i) => {
      round.feedbackNodes[i].hidden = true;
      questions.push({
        item,
        feedback: round.feedbackNodes[i],
        card,
        attempts: 0,
      });
    });

    round.onEdit(() => {
      for (const q of questions) clearFeedback(q);
      updateControls();
    });

    questions.roundWidget = round;
  } else {
    roundItems.forEach((item, i) => {
      const question = engine.createQuestion(item);
      const feedback = el('div', { class: 'qfeedback', hidden: true });

      const card = el('article', { class: 'qcard' }, [
        el('div', { class: 'qcard-head' }, [
          el('span', { class: 'qcard-number', text: String(start + i + 1) }),
          flagButton(item),
        ]),
        question.node,
        feedback,
      ]);

      cards.push(card);
      questions.push({ item, question, feedback, card, attempts: 0 });
      question.onEdit(() => {
        clearFeedback(questions[i]);
        updateControls();
      });
    });
  }

  // --- checking ------------------------------------------------------------

  function clearFeedback(q) {
    q.feedback.hidden = true;
    q.card.classList.remove('is-right', 'is-wrong');
  }

  function allAnswered() {
    if (engine.mode === 'per-round') return questions.roundWidget.isAnswered();
    return questions.every((q) => q.question.isAnswered());
  }

  function showFeedback(q, right) {
    q.card.classList.toggle('is-right', right);
    q.card.classList.toggle('is-wrong', !right);

    q.feedback.hidden = false;
    q.feedback.className = `qfeedback ${right ? 'is-right' : 'is-wrong'}`;
    const parts = [
      el('p', { class: 'qfeedback-line' }, [
        el('span', { class: 'qfeedback-mark', 'aria-hidden': 'true', text: right ? '✓' : '✗' }),
        el('span', { text: right ? 'That’s right.' : 'Not quite — have another go.' }),
      ]),
    ];
    if (!right && q.item.clue && getSettings().showClues) {
      parts.push(el('p', { class: 'qfeedback-clue', html: markup(q.item.clue) }));
    }
    if (engine.mode === 'per-round') parts.push(flagButton(q.item, true));

    q.feedback.replaceChildren(...parts);
  }

  /** How many questions in this round are still blank. */
  function blankCount() {
    if (engine.mode === 'per-round') {
      return questions.roundWidget.blankCount
        ? questions.roundWidget.blankCount()
        : Number(!questions.roundWidget.isAnswered());
    }
    return questions.filter((q) => !q.question.isAnswered()).length;
  }

  function highlightBlanks() {
    if (engine.mode === 'per-round') {
      questions.roundWidget.highlightBlanks?.();
      return;
    }
    let first = null;
    for (const q of questions) {
      const answered = engine.mode === 'per-round' ? true : q.question.isAnswered();
      q.card.classList.toggle('needs-answer', !answered);
      if (!answered && !first) first = q.card;
    }
    (first || questions[0]?.card)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  async function check() {
    const blanks = blankCount();

    if (blanks > 0) {
      const plural = blanks === 1 ? 'question is' : 'questions are';
      const goAhead = await confirmDialog({
        title: `${blanks} ${plural} still blank`,
        message:
          'You can go back and finish them, or check what you have — blank answers will be marked wrong.',
        cancelLabel: 'Finish them',
        confirmLabel: 'Check anyway',
      });

      if (!goAhead) {
        highlightBlanks();
        announce(`${blanks} ${plural} still blank.`);
        return;
      }
    }
    for (const q of questions) q.card.classList.remove('needs-answer');

    const outcomes =
      engine.mode === 'per-round'
        ? questions.roundWidget.check()
        : questions.map((q) => q.question.check());

    let rightCount = 0;
    questions.forEach((q, i) => {
      const right = Boolean(outcomes[i]);
      if (right) rightCount++;
      q.attempts += 1;

      // Once a question checks green it stays green — this is practice.
      if (right) active.results[q.item.id] = true;
      else if (active.results[q.item.id] !== true) active.results[q.item.id] = false;

      // After a few tries, stop letting them flounder and show the answer.
      if (!right && q.attempts >= 3 && q.question?.reveal) q.question.reveal();

      showFeedback(q, right);
    });

    if (!checkedOnce) {
      const bank = getBankProgress(topic.id, type);
      saveBankProgress(topic.id, type, {
        answered: (bank.answered || 0) + questions.length,
        firstTry: (bank.firstTry || 0) + rightCount,
      });
      checkedOnce = true;
    }

    persist();
    updateControls();
    announce(`${rightCount} of ${questions.length} correct.`);
  }

  // --- buttons -------------------------------------------------------------

  const checkBtn = el('button', {
    type: 'button',
    class: 'btn btn-primary',
    text: 'Check answers',
    onClick: check,
  });

  const isLastRound = roundIndex >= roundCount - 1;

  const nextBtn = el('button', {
    type: 'button',
    class: 'btn btn-next',
    hidden: true,
    text: isLastRound ? 'See your results' : 'Next round',
    onClick() {
      if (isLastRound) {
        active.finished = true;
        const bank = getBankProgress(topic.id, type);
        saveBankProgress(topic.id, type, { sessions: (bank.sessions || 0) + 1 });
        persist();
        navigate('/review');
      } else {
        active.roundIndex += 1;
        persist();
        renderRound();
      }
    },
  });

  function updateControls() {
    const everyChecked = questions.every((q) => !q.feedback.hidden);
    nextBtn.hidden = !checkedOnce;
    checkBtn.textContent = everyChecked ? 'Check again' : 'Check answers';
  }

  controls.push(checkBtn, nextBtn);
  updateControls();

  // --- progress strip ------------------------------------------------------

  const dots = el('div', { class: 'round-dots', 'aria-hidden': 'true' },
    Array.from({ length: roundCount }, (_, i) =>
      el('span', { class: `round-dot${i === roundIndex ? ' is-current' : ''}${i < roundIndex ? ' is-done' : ''}` })
    )
  );

  const progress = el('div', { class: 'topbar-progress' }, [
    el('span', { class: 'topbar-progress-label', text: `Round ${roundIndex + 1} of ${roundCount}` }),
    dots,
  ]);

  renderScreen({
    title: activity.name,
    subtitle: topic.title,
    backTo: `/topic/${topic.id}`,
    progress,
    body: [el('div', { class: 'stack' }, cards), el('div', { class: 'actions' }, controls)],
  });
}

function flagButton(item, compact = false) {
  const button = el('button', {
    type: 'button',
    class: `flag-btn${compact ? ' flag-btn-compact' : ''}`,
    'aria-pressed': isFlagged(item.id) ? 'true' : 'false',
    'aria-label': 'Save this to ask my teacher',
    title: 'Save this to ask my teacher',
  }, [
    el('span', { class: 'flag-glyph', 'aria-hidden': 'true', text: '🔖' }),
    el('span', { class: 'flag-text', text: 'Ask my teacher' }),
  ]);

  button.classList.toggle('is-on', isFlagged(item.id));
  button.addEventListener('click', () => {
    const added = toggleQuestion({
      id: item.id,
      topicId: active.topic.id,
      type: active.type,
      label: active.engine.label(item),
    });
    button.classList.toggle('is-on', added);
    button.setAttribute('aria-pressed', added ? 'true' : 'false');
    announce(added ? 'Saved to your questions list.' : 'Removed from your questions list.');
  });

  return button;
}
