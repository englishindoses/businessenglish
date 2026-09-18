/**
 * Progress pieces shared by the dashboard, the progress screen and the
 * teacher's view of a student.
 */
import { el } from '../lib/dom.js';
import { summarise, seenInTopic } from '../lib/storage.js';
import { topics, isPlayable, lessonLabel } from '../data/topics.js';

/** How many questions a topic has, across all four activities. */
export function totalIn(topic) {
  return Object.values(topic.items || {}).reduce((sum, bank) => sum + bank.length, 0);
}

export function progressBar(value, total) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return el('span', {
    class: 'bar',
    role: 'img',
    'aria-label': `${pct}% practised`,
  }, [el('span', { class: 'bar-fill', style: `width: ${pct}%` })]);
}

export function stat(value, label) {
  return el('div', { class: 'stat' }, [
    el('span', { class: 'stat-value', text: String(value) }),
    el('span', { class: 'stat-label', text: label }),
  ]);
}

/** The three headline numbers. */
export function statRow(progress) {
  const s = summarise(progress);
  const firstTry = s.answered ? Math.round((s.firstTry / s.answered) * 100) : 0;
  return el('div', { class: 'stat-row' }, [
    stat(s.answered, 'questions answered'),
    stat(s.sessions, s.sessions === 1 ? 'session finished' : 'sessions finished'),
    stat(`${firstTry}%`, 'right first time'),
  ]);
}

/** One row per topic, in lesson order, with a bar for how much is practised. */
export function topicProgressList(progress) {
  return el('div', { class: 'settings-card progress-list' }, topics.filter(isPlayable).map((topic) => {
    const seen = seenInTopic(progress, topic.id);
    const total = totalIn(topic);
    return el('div', { class: 'progress-row' }, [
      el('span', { class: 'topic-icon', 'aria-hidden': 'true', text: topic.icon }),
      el('div', { class: 'topic-text' }, [
        el('p', { class: 'progress-title' }, [
          el('span', { class: 'progress-lesson', text: lessonLabel(topic) }),
          ` ${topic.title}`,
        ]),
        progressBar(seen, total),
        el('p', { class: 'card-meta', text: `${seen} of ${total} questions practised` }),
      ]),
    ]);
  }));
}
