/**
 * The frame every screen sits in: top bar, scrolling body, and a place for
 * screen-reader announcements.
 */
import { el, clear } from '../lib/dom.js';
import { navigate, back } from '../lib/router.js';
import { getQuestions, getSettings } from '../lib/storage.js';

let root = null;
let bodyNode = null;

export function mountShell(container) {
  root = container;
  clear(root);

  bodyNode = el('main', { class: 'screen', id: 'screen', tabindex: '-1' });

  root.append(
    el('header', { class: 'topbar', id: 'topbar' }),
    bodyNode,
    el('div', {
      class: 'visually-hidden',
      id: 'live-region',
      role: 'status',
      'aria-live': 'polite',
    })
  );

  applySettings();
}

export function applySettings() {
  const { textSize, reduceMotion } = getSettings();
  document.documentElement.dataset.textSize = textSize;
  document.documentElement.dataset.reduceMotion = reduceMotion ? 'on' : 'off';
}

function iconButton({ label, glyph, badge, onClick, className = '' }) {
  return el(
    'button',
    {
      type: 'button',
      class: `topbar-btn ${className}`.trim(),
      'aria-label': label,
      title: label,
      onClick,
    },
    [
      el('span', { class: 'topbar-glyph', 'aria-hidden': 'true', text: glyph }),
      badge ? el('span', { class: 'topbar-badge', text: String(badge) }) : null,
    ]
  );
}

/**
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.subtitle]
 * @param {string|null} [options.backTo]  path for the back button, null to hide it
 * @param {Node|Node[]} options.body
 * @param {Node} [options.progress]       optional strip under the title
 */
export function renderScreen({ title, subtitle, backTo = null, body, progress = null }) {
  const questionCount = getQuestions().length;

  const bar = document.getElementById('topbar');
  clear(bar);
  bar.append(
    el('div', { class: 'topbar-row' }, [
      el('div', { class: 'topbar-left' }, [
        backTo === null
          ? el('span', { class: 'topbar-spacer' })
          : iconButton({
              label: 'Back',
              glyph: '‹',
              className: 'topbar-back',
              onClick: () => (backTo === 'auto' ? back('/') : navigate(backTo)),
            }),
      ]),
      el('div', { class: 'topbar-title' }, [
        el('h1', { text: title }),
        subtitle ? el('p', { class: 'topbar-subtitle', text: subtitle }) : null,
      ]),
      el('div', { class: 'topbar-right' }, [
        iconButton({
          label: `My questions${questionCount ? ` (${questionCount})` : ''}`,
          glyph: '🔖',
          badge: questionCount || null,
          onClick: () => navigate('/questions'),
        }),
        iconButton({
          label: 'Settings',
          glyph: '⚙',
          onClick: () => navigate('/settings'),
        }),
      ]),
    ])
  );
  if (progress) bar.append(progress);

  clear(bodyNode);
  bodyNode.append(...[].concat(body).filter(Boolean));
  bodyNode.scrollTop = 0;
  window.scrollTo(0, 0);
}

/** Focus the screen body — used after a route change so keyboard users land here. */
export function focusScreen() {
  if (bodyNode) bodyNode.focus({ preventScroll: true });
}
