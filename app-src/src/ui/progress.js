/**
 * Progress pieces shared by the dashboard, the progress screen and the
 * teacher's view of a student.
 *
 * Progress is counted in activities completed, not questions met: an activity
 * is 12 questions, the student finishes it, and it counts. The score alongside
 * is how many of the questions they have finished with stand correct.
 */
import { el } from '../lib/dom.js';
import { summarise, currentScore, completedInTopic, daysThisWeek } from '../lib/storage.js';
import { topics, isPlayable, lessonLabel, availableActivities } from '../data/topics.js';

/** How many activities a topic offers — four today, but not for ever. */
export function activitiesIn(topic) {
  return availableActivities(topic).length;
}

/** "once", "twice", "3 times" — for the small note on an activity card. */
export function timesCompleted(n) {
  if (!n) return '';
  if (n === 1) return 'Completed once';
  if (n === 2) return 'Completed twice';
  return `Completed ${n} times`;
}

export function progressBar(value, total) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return el('span', {
    class: 'bar',
    role: 'img',
    'aria-label': `${pct}% complete`,
  }, [el('span', { class: 'bar-fill', style: `width: ${pct}%` })]);
}

export function stat(value, label) {
  return el('div', { class: 'stat' }, [
    el('span', { class: 'stat-value', text: String(value) }),
    el('span', { class: 'stat-label', text: label }),
  ]);
}

/** The headline numbers: how well it is going, and how often. */
export function statRow(progress, days) {
  const score = currentScore(progress);
  const week = daysThisWeek(days);
  return el('div', { class: 'stat-row stat-row-2' }, [
    stat(score === null ? '—' : `${score}%`, 'answers correct'),
    stat(`${week}/7`, 'days practised this week'),
  ]);
}

/** One bar for the whole course: activities completed. */
export function courseBar(progress) {
  const playable = topics.filter(isPlayable);
  const total = playable.reduce((sum, t) => sum + activitiesIn(t), 0);
  const done = playable.reduce((sum, t) => sum + completedInTopic(progress, t.id), 0);

  return el('div', { class: 'course-bar' }, [
    el('p', { class: 'course-bar-label' }, [
      el('span', { text: 'Whole course' }),
      el('strong', { text: `${done} of ${total} activities` }),
    ]),
    progressBar(done, total),
  ]);
}

/** One row per topic, in lesson order, with how many activities are done. */
export function topicProgressList(progress) {
  return el('div', { class: 'settings-card progress-list' }, topics.filter(isPlayable).map((topic) => {
    const done = completedInTopic(progress, topic.id);
    const total = activitiesIn(topic);
    return el('div', { class: 'progress-row' }, [
      el('span', { class: 'topic-icon', 'aria-hidden': 'true', text: topic.icon }),
      el('div', { class: 'topic-text' }, [
        el('p', { class: 'progress-title' }, [
          el('span', { class: 'progress-lesson', text: lessonLabel(topic) }),
          ` ${topic.title}`,
        ]),
        progressBar(done, total),
        el('p', { class: 'card-meta', text: `${done} of ${total} activities completed` }),
      ]),
    ]);
  }));
}
