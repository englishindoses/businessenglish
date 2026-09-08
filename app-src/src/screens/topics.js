import { el } from '../lib/dom.js';
import { navigate } from '../lib/router.js';
import { renderScreen } from '../ui/shell.js';
import { topics, isPlayable } from '../data/topics.js';

export default function topicsScreen() {
  const cards = topics.map((topic) => {
    const ready = isPlayable(topic);

    const inner = [
      el('span', { class: 'topic-icon', 'aria-hidden': 'true', text: topic.icon }),
      el('span', { class: 'topic-text' }, [
        el('span', { class: 'card-eyebrow', text: `Lesson ${topic.order}` }),
        el('span', { class: 'card-title', text: topic.title }),
        el('span', { class: 'card-meta', text: topic.subtitle }),
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
      class: 'card card-topic',
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
