/**
 * Your progress: the headline numbers, then every topic in lesson order.
 */
import { el } from '../lib/dom.js';
import { renderScreen } from '../ui/shell.js';
import { getProgress } from '../lib/storage.js';
import { statRow, topicProgressList } from '../ui/progress.js';

export default function progressScreen() {
  const progress = getProgress();

  renderScreen({
    title: 'Your progress',
    backTo: 'auto',
    body: [
      statRow(progress),
      el('section', { class: 'settings-section' }, [
        el('h2', { class: 'settings-heading', text: 'Topics' }),
        topicProgressList(progress),
      ]),
      el('div', { class: 'note' }, [
        el('p', {
          text: '“Practised” counts each different question you’ve answered at least once. Questions repeat after you’ve seen them all, so keep going!',
        }),
      ]),
    ],
  });
}
