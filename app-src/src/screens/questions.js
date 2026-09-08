/**
 * The student's questions list — everything they bookmarked to ask about.
 * Designed to be opened in the lesson and read from the screen.
 */
import { el, markup, announce } from '../lib/dom.js';
import { navigate } from '../lib/router.js';
import { renderScreen } from '../ui/shell.js';
import { getQuestions, removeQuestion, clearQuestions } from '../lib/storage.js';
import { getTopic, ACTIVITY_TYPES } from '../data/topics.js';

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
        el('p', { text: 'Show this list to your teacher in your next lesson.' }),
      ]),
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
