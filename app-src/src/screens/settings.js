import { el, announce } from '../lib/dom.js';
import { navigate } from '../lib/router.js';
import { renderScreen, applySettings } from '../ui/shell.js';
import {
  getSettings,
  saveSettings,
  resetProgress,
  resetEverything,
  getSummary,
} from '../lib/storage.js';

const APP_VERSION = __APP_VERSION__;

export default function settingsScreen() {
  const settings = getSettings();
  const summary = getSummary();

  const body = [
    section('Reading', [
      choiceRow({
        label: 'Text size',
        description: 'Larger text on small screens.',
        value: settings.textSize,
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'large', label: 'Large' },
        ],
        onChange(value) {
          saveSettings({ textSize: value });
          applySettings();
          announce(`Text size set to ${value}.`);
        },
      }),
      toggleRow({
        label: 'Show clues',
        description: 'Explain what went wrong when an answer is incorrect.',
        value: settings.showClues,
        onChange(value) {
          saveSettings({ showClues: value });
        },
      }),
      toggleRow({
        label: 'Reduce motion',
        description: 'Turn off the small animations.',
        value: settings.reduceMotion,
        onChange(value) {
          saveSettings({ reduceMotion: value });
          applySettings();
        },
      }),
    ]),

    section('Your practice', [
      el('div', { class: 'setting-row' }, [
        el('div', { class: 'setting-text' }, [
          el('p', { class: 'setting-label', text: 'Progress so far' }),
          el('p', {
            class: 'setting-desc',
            text: `${summary.answered} questions answered across ${summary.sessions} ${
              summary.sessions === 1 ? 'session' : 'sessions'
            }.`,
          }),
        ]),
      ]),
      el('div', { class: 'setting-row' }, [
        el('div', { class: 'setting-text' }, [
          el('p', { class: 'setting-label', text: 'Start the question sets again' }),
          el('p', {
            class: 'setting-desc',
            text: 'Clears which questions you have seen, so every set starts fresh. Your saved questions list is kept.',
          }),
        ]),
        el('button', {
          type: 'button',
          class: 'btn btn-quiet btn-danger',
          text: 'Reset progress',
          onClick() {
            if (!confirm('Reset your progress? Your questions list will be kept.')) return;
            resetProgress();
            announce('Progress reset.');
            settingsScreen();
          },
        }),
      ]),
      el('div', { class: 'setting-row' }, [
        el('div', { class: 'setting-text' }, [
          el('p', { class: 'setting-label', text: 'Clear everything' }),
          el('p', {
            class: 'setting-desc',
            text: 'Removes your progress, your questions list and these settings from this device.',
          }),
        ]),
        el('button', {
          type: 'button',
          class: 'btn btn-quiet btn-danger',
          text: 'Clear all',
          onClick() {
            if (!confirm('Remove everything this app has saved on this device?')) return;
            resetEverything();
            applySettings();
            announce('Everything cleared.');
            navigate('/');
          },
        }),
      ]),
    ]),

    section('About', [
      el('div', { class: 'setting-row' }, [
        el('div', { class: 'setting-text' }, [
          el('p', { class: 'setting-label', text: 'Business English in Doses' }),
          el('p', { class: 'setting-desc', text: `Practice makes Perfect · version ${APP_VERSION}` }),
        ]),
      ]),
      el('div', { class: 'setting-row' }, [
        el('div', { class: 'setting-text' }, [
          el('p', { class: 'setting-label', text: 'Course lessons' }),
          el('p', { class: 'setting-desc', text: 'The full worksheets live on the website.' }),
        ]),
        el('a', { class: 'btn btn-quiet', href: '../index.html', text: 'Open the course' }),
      ]),
      el('div', { class: 'note' }, [
        el('p', {
          text: 'Your practice is saved on this device only. Signing in — so it follows you between phone and laptop — is coming later.',
        }),
      ]),
    ]),
  ];

  renderScreen({
    title: 'Settings',
    backTo: 'auto',
    body,
  });
}

function section(title, rows) {
  return el('section', { class: 'settings-section' }, [
    el('h2', { class: 'settings-heading', text: title }),
    el('div', { class: 'settings-card' }, rows),
  ]);
}

function toggleRow({ label, description, value, onChange }) {
  const input = el('input', { type: 'checkbox', class: 'switch-input' });
  input.checked = Boolean(value);
  input.addEventListener('change', () => onChange(input.checked));

  return el('label', { class: 'setting-row' }, [
    el('div', { class: 'setting-text' }, [
      el('p', { class: 'setting-label', text: label }),
      el('p', { class: 'setting-desc', text: description }),
    ]),
    el('span', { class: 'switch' }, [input, el('span', { class: 'switch-track' })]),
  ]);
}

function choiceRow({ label, description, value, options, onChange }) {
  const group = el('div', { class: 'segmented', role: 'group', 'aria-label': label });

  const buttons = options.map((option) =>
    el('button', {
      type: 'button',
      class: `segmented-btn${option.value === value ? ' is-on' : ''}`,
      text: option.label,
      'aria-pressed': option.value === value ? 'true' : 'false',
      onClick() {
        for (const b of buttons) {
          const on = b === this;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
        onChange(option.value);
      },
    })
  );
  group.append(...buttons);

  return el('div', { class: 'setting-row' }, [
    el('div', { class: 'setting-text' }, [
      el('p', { class: 'setting-label', text: label }),
      el('p', { class: 'setting-desc', text: description }),
    ]),
    group,
  ]);
}
