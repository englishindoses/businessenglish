/**
 * The teacher's pages: every signed-in student, and one student's progress and
 * saved questions. Only the teacher's Google account can open them, and the
 * database rules enforce the same thing on Firebase's side.
 */
import { el, markup } from '../lib/dom.js';
import { navigate, currentPath } from '../lib/router.js';
import { renderScreen } from '../ui/shell.js';
import { avatar } from '../ui/avatar.js';
import { statRow, topicProgressList } from '../ui/progress.js';
import { getAccount, loadCloud } from '../lib/account.js';
import { getTopic, ACTIVITY_TYPES } from '../data/topics.js';

export async function studentsScreen() {
  if (!getAccount().isTeacher) return navigate('/', { replace: true });

  renderScreen({ title: 'Your students', backTo: '/', body: loading() });

  const path = currentPath();
  let students;
  try {
    const me = getAccount().student.uid;
    students = (await (await loadCloud()).listStudents()).filter((s) => s.uid !== me);
  } catch {
    if (currentPath() !== path) return;
    renderScreen({ title: 'Your students', backTo: '/', body: failed() });
    return;
  }

  if (currentPath() !== path) return; // they moved on while it loaded

  if (!students.length) {
    renderScreen({
      title: 'Your students',
      backTo: '/',
      body: el('div', { class: 'empty' }, [
        el('p', { class: 'empty-icon', 'aria-hidden': 'true', text: '👥' }),
        el('p', { class: 'empty-title', text: 'No students yet' }),
        el('p', {
          class: 'empty-text',
          text: 'Students appear here once they sign in to BizEng with Google.',
        }),
      ]),
    });
    return;
  }

  const rows = students.map((s) =>
    el('button', {
      type: 'button',
      class: 'card student-card',
      onClick: () => navigate(`/student/${s.uid}`),
    }, [
      avatar(s, 'md'),
      el('span', { class: 'topic-text' }, [
        el('span', { class: 'card-title', text: s.name || s.email }),
        el('span', {
          class: 'card-meta',
          text: `${s.answered} answered · last active ${when(s.lastActive)}`,
        }),
      ]),
      s.questionCount
        ? el('span', {
            class: 'pill',
            title: 'Saved questions',
            text: `🔖 ${s.questionCount}`,
          })
        : null,
      el('span', { class: 'topic-go', 'aria-hidden': 'true', text: '›' }),
    ])
  );

  renderScreen({
    title: 'Your students',
    subtitle: `${students.length} signed in`,
    backTo: '/',
    body: el('div', { class: 'stack stack-tight' }, rows),
  });
}

export async function studentScreen({ uid }) {
  if (!getAccount().isTeacher) return navigate('/', { replace: true });

  renderScreen({ title: 'Student', backTo: '/students', body: loading() });

  const path = currentPath();
  let s;
  try {
    s = await (await loadCloud()).getStudent(uid);
  } catch {
    if (currentPath() !== path) return;
    renderScreen({ title: 'Student', backTo: '/students', body: failed() });
    return;
  }
  if (currentPath() !== path) return; // they moved on while it loaded
  if (!s) return navigate('/students', { replace: true });

  const questions = s.questions.map((entry) => {
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
    ]);
  });

  renderScreen({
    title: s.name || 'Student',
    subtitle: s.email,
    backTo: '/students',
    body: [
      el('div', { class: 'greeting' }, [
        avatar(s, 'lg'),
        el('div', {}, [
          el('p', { class: 'greeting-hello', text: s.name || s.email }),
          el('p', { class: 'greeting-line', text: `Last active ${when(s.lastActive)}` }),
        ]),
      ]),
      statRow(s.progress),
      el('section', { class: 'settings-section' }, [
        el('h2', {
          class: 'settings-heading',
          text: `Saved questions (${questions.length})`,
        }),
        questions.length
          ? el('div', { class: 'stack stack-tight' }, questions)
          : el('p', { class: 'setting-desc', text: 'Nothing saved at the moment.' }),
      ]),
      el('section', { class: 'settings-section' }, [
        el('h2', { class: 'settings-heading', text: 'Topics' }),
        topicProgressList(s.progress),
      ]),
    ],
  });
}

function loading() {
  return el('p', { class: 'loading', role: 'status', text: 'Loading…' });
}

function failed() {
  return el('div', { class: 'note' }, [
    el('p', {
      text: 'This didn’t load. Check you’re online and try again. If it keeps happening, the database rules may need updating.',
    }),
  ]);
}

/** "today", "yesterday", "3 days ago", or a date. */
function when(date) {
  if (!date) return 'not yet';
  const days = Math.floor((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
