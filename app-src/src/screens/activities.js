import { el } from '../lib/dom.js';
import { navigate } from '../lib/router.js';
import { renderScreen } from '../ui/shell.js';
import { getTopic, availableActivities, SESSION_LENGTH } from '../data/topics.js';
import { getBankProgress, attemptAnswered } from '../lib/storage.js';
import { timesCompleted } from '../ui/progress.js';

export default function activitiesScreen({ id }) {
  const topic = getTopic(id);

  if (!topic || !topic.items) {
    navigate('/topics', { replace: true });
    return;
  }

  const activities = availableActivities(topic);

  const cards = activities.map((activity) => {
    const bank = getBankProgress(topic.id, activity.id);
    const attempt = bank.attempt;
    const done = Boolean(attempt?.finished);

    // The bar is this attempt, not the question bank: 12 questions, and full
    // when the student has finished them.
    const answered = done ? SESSION_LENGTH : attemptAnswered(attempt);
    const percent = Math.round((answered / SESSION_LENGTH) * 100);

    let note;
    if (done) note = 'Completed — start again for new questions';
    else if (answered) note = `${answered} of ${SESSION_LENGTH} questions answered`;
    else note = `${SESSION_LENGTH} questions`;

    return el('button', {
      type: 'button',
      class: `card card-activity${done ? ' is-complete' : ''}`,
      onClick: () => navigate(`/practice/${topic.id}/${activity.id}`),
    }, [
      el('span', { class: 'topic-icon', 'aria-hidden': 'true', text: activity.icon }),
      el('span', { class: 'topic-text' }, [
        el('span', { class: 'card-title' }, [
          activity.name,
          done ? el('span', { class: 'tick', 'aria-label': 'Completed', text: '✓' }) : null,
        ]),
        el('span', { class: 'card-meta', text: activity.blurb }),
        el('span', { class: 'progress-track', 'aria-hidden': 'true' }, [
          el('span', { class: 'progress-fill', style: `width:${percent}%` }),
        ]),
        el('span', { class: 'card-note' }, [
          note,
          bank.sessions
            ? el('span', { class: 'times-done', text: timesCompleted(bank.sessions) })
            : null,
        ]),
      ]),
      el('span', { class: 'topic-go', 'aria-hidden': 'true', text: '›' }),
    ]);
  });

  renderScreen({
    title: topic.title,
    subtitle: `Choose an activity — ${SESSION_LENGTH} questions in 3 rounds`,
    backTo: '/topics',
    body: [
      el('div', { class: 'stack' }, cards),
      el('div', { class: 'note' }, [
        el('p', {
          text: 'Finish an activity and you can start it again with different questions.',
        }),
      ]),
    ],
  });
}
