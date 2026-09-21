import { el } from '../lib/dom.js';
import { navigate } from '../lib/router.js';
import { renderScreen } from '../ui/shell.js';
import { topics, isPlayable, lessonLabel } from '../data/topics.js';
import { getProgress, completedInTopic } from '../lib/storage.js';
import { activitiesIn, progressBar } from '../ui/progress.js';

export default function topicsScreen() {
  const progress = getProgress();

  const cards = topics.map((topic) => {
    const ready = isPlayable(topic);
    const done = ready ? completedInTopic(progress, topic.id) : 0;
    const total = ready ? activitiesIn(topic) : 0;

    const inner = [
      el('span', { class: 'topic-icon', 'aria-hidden': 'true', text: topic.icon }),
      el('span', { class: 'topic-text' }, [
        el('span', { class: 'card-eyebrow', text: lessonLabel(topic) }),
        el('span', { class: 'card-title', text: topic.title }),
        el('span', { class: 'card-meta', text: topic.subtitle }),
        ready ? progressBar(done, total) : null,
        ready
          ? el('span', {
              class: 'card-note',
              text: `${done} of ${total} activities completed`,
            })
          : null,
      ]),
      ready
        ? el('span', { class: 'topic-go', 'aria-hidden': 'true', text: '›' })
        : el('span', { class: 'pill pill-muted', text: 'Coming soon' }),
    ];

    if (!ready) {
      return el('div', { class: 'card card-topic is-locked', 'aria-disabled': 'true' }, inner);
    }

    return el('button', {
      type: 'button',
      class: `card card-topic${done && done === total ? ' is-complete' : ''}`,
      onClick: () => navigate(`/topic/${topic.id}`),
    }, inner);
  });

  renderScreen({
    title: 'Choose a topic',
    subtitle: 'In the same order as your lessons',
    backTo: '/',
    body: el('div', { class: 'stack' }, cards),
  });
}
