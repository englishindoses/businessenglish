/**
 * How to use BizEng, in short plain sections a learner can follow.
 */
import { el } from '../lib/dom.js';
import { renderScreen } from '../ui/shell.js';

const SECTIONS = [
  {
    icon: '🎯',
    title: 'Start practising',
    text: [
      'Tap Start practising, choose a topic, then choose an activity.',
      'The topics follow the same order as your lessons.',
    ],
  },
  {
    icon: '🔁',
    title: 'How a session works',
    text: [
      'A session has 12 questions in 3 short rounds of 4.',
      'Answer all 4, then tap Check answers. There is no timer, so take your time.',
    ],
  },
  {
    icon: '🧩',
    title: 'The four activities',
    list: [
      ['Gap-fill', 'choose the word that completes the sentence.'],
      ['Right or Wrong', 'decide if the sentence is correct.'],
      ['Matching', 'tap a meaning, then tap the phrase it goes with. You can also drag it.'],
      ['Word Order', 'tap the words in the correct order, or tap and hold to drag the words into place.'],
    ],
  },
  {
    icon: '✅',
    title: 'Wrong answers',
    text: [
      'If an answer is wrong, change it and check again. You can try as many times as you like.',
      'In Word Order, the right sentence appears after 3 tries.',
    ],
  },
  {
    icon: '🔖',
    title: 'Questions for your teacher',
    text: [
      'Not sure about a question? Tap Ask my teacher to save it.',
      'Open Saved questions to see your list. Show it in your next lesson, or tap Send to my teacher to send it on WhatsApp or by email.',
    ],
  },
  {
    icon: '📈',
    title: 'Your progress',
    text: [
      'Your dashboard shows how many questions you’ve answered and how many days you practised this week.',
      'Tap See all for every topic.',
    ],
  },
  {
    icon: '👤',
    title: 'Signing in',
    text: [
      'Sign in with Google to keep your progress on any phone or computer. Your teacher can see your progress and saved questions.',
      'As a guest, your practice stays on this device only.',
    ],
  },
  {
    icon: '📲',
    title: 'Put BizEng on your home screen',
    text: [
      'Tap Install BizEng at the bottom of the dashboard, and it opens like any other app.',
    ],
  },
];

export default function helpScreen() {
  renderScreen({
    title: 'How to use BizEng',
    backTo: 'auto',
    body: el('div', { class: 'stack' }, SECTIONS.map(section)),
  });
}

function section({ icon, title, text = [], list = [] }) {
  return el('section', { class: 'help-card' }, [
    el('h2', { class: 'help-title' }, [
      el('span', { class: 'help-icon', 'aria-hidden': 'true', text: icon }),
      title,
    ]),
    ...text.map((t) => el('p', { text: t })),
    list.length
      ? el('ul', { class: 'help-list' }, list.map(([name, what]) =>
          el('li', {}, [el('strong', { text: name }), ` — ${what}`])
        ))
      : null,
  ]);
}
