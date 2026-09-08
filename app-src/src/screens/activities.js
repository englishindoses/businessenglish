import { el } from '../lib/dom.js';
import { navigate } from '../lib/router.js';
import { renderScreen } from '../ui/shell.js';
import { getTopic, availableActivities, SESSION_LENGTH } from '../data/topics.js';
import { poolStatus } from '../lib/pool.js';

export default function activitiesScreen({ id }) {
  const topic = getTopic(id);

  if (!topic || !topic.items) {
    navigate('/topics', { replace: true });
    return;
  }

  const activities = availableActivities(topic);

  const cards = activities.map((activity) => {
    const { seen, total } = poolStatus(topic, activity.id);
    const percent = total ? Math.round((seen / total) * 100) : 0;

    return el('button', {
      type: 'button',
      class: 'card card-activity',
      onClick: () => navigate(`/practice/${topic.id}/${activity.id}`),
    }, [
      el('span', { class: 'topic-icon', 'aria-hidden': 'true', text: activity.icon }),
      el('span', { class: 'topic-text' }, [
        el('span', { class: 'card-title', text: activity.name }),
        el('span', { class: 'card-meta', text: activity.blurb }),
        el('span', { class: 'progress-track', 'aria-hidden': 'true' }, [
          el('span', { class: 'progress-fill', style: `width:${percent}%` }),
        ]),
        el('span', {
          class: 'card-note',
          text: seen === 0 ? `${total} questions in this set` : `${seen} of ${total} seen`,
        }),
      ]),
      el('span', { class: 'topic-go', 'aria-hidden': 'true', text: '›' }),
    ]);
  });

  renderScreen({
    title: topic.title,
    subtitle: `Choose an activity — ${SESSION_LENGTH} questions, three rounds`,
    backTo: '/topics',
    body: [
      el('div', { class: 'stack' }, cards),
      el('div', { class: 'note' }, [
        el('p', {
          text: 'You will see every question in a set before any of them come round again.',
        }),
      ]),
    ],
  });
}
