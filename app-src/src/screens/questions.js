/**
 * The student's questions list — everything they bookmarked to ask about.
 * Designed to be opened in the lesson and read from the screen, or sent to the
 * teacher beforehand.
 *
 * Sending uses the phone's own share menu, so the student picks WhatsApp (or
 * anything else) and chooses the teacher themselves. No phone number is kept in
 * the app. Where there is no share menu, usually on a laptop, the list is copied
 * so it can be pasted into WhatsApp instead.
 */
import { el, markup, announce } from '../lib/dom.js';
import { navigate } from '../lib/router.js';
import { renderScreen } from '../ui/shell.js';
import { getQuestions, removeQuestion, clearQuestions } from '../lib/storage.js';
import { getTopic, ACTIVITY_TYPES } from '../data/topics.js';

/** The list as plain text, laid out to read well in a WhatsApp message. */
function buildMessage(list) {
  const lines = ['My questions from BizEng', ''];
  list.forEach((entry, i) => {
    const topic = getTopic(entry.topicId);
    const activity = ACTIVITY_TYPES.find((a) => a.id === entry.type);
    const where = [topic?.title, activity?.name].filter(Boolean).join(' · ');
    lines.push(`${i + 1}. ${where}`);
    lines.push(`   ${String(entry.label).replace(/\*\*/g, '')}`);
    lines.push('');
  });
  return lines.join('\n').trim();
}

function sendBlock(list) {
  const status = el('p', { class: 'share-status', role: 'status', hidden: true });
  const manual = el('textarea', {
    class: 'share-text',
    readonly: true,
    rows: '8',
    'aria-label': 'Your questions, ready to copy',
    hidden: true,
  });

  async function send() {
    const text = buildMessage(list);
    status.hidden = true;
    manual.hidden = true;

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        // Closing the share menu without choosing an app is not a problem.
        if (error?.name === 'AbortError') return;
        // Anything else: fall back to copying.
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Copied. Open WhatsApp, choose your teacher and paste the message.';
    } catch {
      status.textContent = "This device wouldn't copy the list. Select the text below and copy it.";
      manual.value = text;
      manual.hidden = false;
    }
    status.hidden = false;
    announce(status.textContent);
  }

  return el('div', { class: 'share-block' }, [
    el('button', {
      type: 'button',
      class: 'btn btn-primary',
      text: 'Send to my teacher',
      onClick: send,
    }),
    status,
    manual,
  ]);
}

export default function questionsScreen() {
  const list = getQuestions();

  if (!list.length) {
    renderScreen({
      title: 'My questions',
      subtitle: 'Things to ask your teacher',
      backTo: 'auto',
      body: el('div', { class: 'empty' }, [
        el('p', { class: 'empty-icon', 'aria-hidden': 'true', text: '🔖' }),
        el('p', { class: 'empty-title', text: 'Nothing saved yet' }),
        el('p', {
          class: 'empty-text',
          text: 'While you practise, tap “Ask my teacher” on any question you are unsure about. It will be waiting here for your next lesson.',
        }),
        el('button', {
          type: 'button',
          class: 'btn btn-primary',
          text: 'Start practising',
          onClick: () => navigate('/topics'),
        }),
      ]),
    });
    return;
  }

  const rows = list.map((entry) => {
    const topic = getTopic(entry.topicId);
    const activity = ACTIVITY_TYPES.find((a) => a.id === entry.type);

    return el('article', { class: 'question-row' }, [
      el('div', { class: 'question-row-body' }, [
        el('p', { class: 'question-row-meta' }, [
          topic ? el('span', { class: 'pill', text: topic.title }) : null,
          activity ? el('span', { class: 'pill pill-muted', text: activity.name }) : null,
        ]),
        el('p', { class: 'question-row-text', html: markup(entry.label) }),
      ]),
      el('button', {
        type: 'button',
        class: 'icon-btn',
        'aria-label': 'Remove from my questions',
        title: 'Remove',
        text: '✕',
        onClick() {
          removeQuestion(entry.id);
          announce('Removed from your questions list.');
          questionsScreen();
        },
      }),
    ]);
  });

  renderScreen({
    title: 'My questions',
    subtitle: `${list.length} saved to ask about`,
    backTo: 'auto',
    body: [
      el('div', { class: 'note' }, [
        el('p', {
          text: 'Send this list to your teacher on WhatsApp, or show it to them in your next lesson.',
        }),
      ]),
      sendBlock(list),
      el('div', { class: 'stack stack-tight' }, rows),
      el('div', { class: 'actions' }, [
        el('button', {
          type: 'button',
          class: 'btn btn-quiet btn-danger',
          text: 'Clear the whole list',
          onClick() {
            if (!confirm('Remove every saved question?')) return;
            clearQuestions();
            announce('Questions list cleared.');
            questionsScreen();
          },
        }),
      ]),
    ],
  });
}
