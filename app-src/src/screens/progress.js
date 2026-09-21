/**
 * Your progress: the headline numbers, then every topic in lesson order.
 */
import { el } from '../lib/dom.js';
import { renderScreen } from '../ui/shell.js';
import { getProgress, getPracticeDays } from '../lib/storage.js';
import { statRow, courseBar, topicProgressList } from '../ui/progress.js';

export default function progressScreen() {
  const progress = getProgress();

  renderScreen({
    title: 'Your progress',
    backTo: 'auto',
    body: [
      statRow(progress, getPracticeDays()),
      courseBar(progress),
      el('section', { class: 'settings-section' }, [
        el('h2', { class: 'settings-heading', text: 'Topics' }),
        topicProgressList(progress),
      ]),
      el('div', { class: 'note' }, [
        el('p', {
          text: 'An activity is complete once you have answered all 12 of its questions. Start one again whenever you like — you will get different questions, and your score keeps counting.',
        }),
      ]),
    ],
  });
}
