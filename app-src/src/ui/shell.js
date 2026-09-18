/**
 * The frame every screen sits in: top bar, scrolling body, and a place for
 * screen-reader announcements.
 */
import { el, clear } from '../lib/dom.js';
import { navigate, back } from '../lib/router.js';
import { getQuestions, getSettings } from '../lib/storage.js';
import { getAccount, logOut } from '../lib/account.js';
import { avatar } from './avatar.js';

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
  bar.hidden = false;
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
        profileButton(),
      ]),
    ])
  );
  if (progress) bar.append(progress);

  clear(bodyNode);
  bodyNode.append(...[].concat(body).filter(Boolean));
  bodyNode.scrollTop = 0;
  window.scrollTo(0, 0);
}

/** A screen with no top bar, for signing in. */
export function renderBare(body) {
  const bar = document.getElementById('topbar');
  clear(bar);
  bar.hidden = true;
  clear(bodyNode);
  bodyNode.append(...[].concat(body).filter(Boolean));
  window.scrollTo(0, 0);
}

// ---------- the profile menu ----------

function profileButton() {
  const { student } = getAccount();
  const button = el('button', {
    type: 'button',
    class: 'topbar-btn topbar-profile',
    'aria-label': 'Profile',
    title: 'Profile',
    'aria-haspopup': 'menu',
    'aria-expanded': 'false',
    onClick: (event) => {
      event.stopPropagation();
      toggleMenu(button);
    },
  }, [avatar(student || {}, 'sm')]);
  return button;
}

function toggleMenu(button) {
  const open = document.querySelector('.profile-menu');
  if (open) {
    open.closeMenu();
    return;
  }

  const account = getAccount();
  const { student } = account;

  const item = (label, glyph, onClick) =>
    el('button', { type: 'button', class: 'profile-item', role: 'menuitem', onClick: () => {
      closeMenu();
      onClick();
    } }, [
      el('span', { class: 'profile-item-glyph', 'aria-hidden': 'true', text: glyph }),
      el('span', { text: label }),
    ]);

  const items = [
    item('Profile', '👤', () => navigate('/profile')),
    item('Your progress', '📈', () => navigate('/progress')),
    item('Settings', '⚙', () => navigate('/settings')),
  ];
  if (account.isTeacher) items.splice(1, 0, item('Your students', '👥', () => navigate('/students')));
  items.push(
    student
      ? item('Log out', '↩', async () => {
          await logOut();
          window.location.replace(window.location.pathname);
        })
      : item('Sign in with Google', '🔑', async () => {
          await logOut(); // leaves guest mode; their practice stays on the device
          window.location.replace(window.location.pathname);
        })
  );

  const menu = el('div', { class: 'profile-menu', role: 'menu', 'aria-label': 'Profile' }, [
    el('div', { class: 'profile-head' }, [
      avatar(student || {}, 'md'),
      el('div', { class: 'profile-who' }, [
        el('p', { class: 'profile-name', text: student ? student.name || 'Signed in' : 'Guest' }),
        el('p', {
          class: 'profile-email',
          text: student ? student.email : 'Practice saved on this device only',
        }),
      ]),
    ]),
    ...items,
  ]);

  button.setAttribute('aria-expanded', 'true');
  document.getElementById('topbar').append(menu);
  menu.querySelector('.profile-item').focus();

  setTimeout(() => {
    document.addEventListener('click', onOutside);
    document.addEventListener('keydown', onKey);
  });

  function onOutside(event) {
    if (!menu.contains(event.target)) closeMenu();
  }
  function onKey(event) {
    if (event.key === 'Escape') {
      closeMenu();
      button.focus();
    }
  }
  function closeMenu() {
    menu.remove();
    button.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onOutside);
    document.removeEventListener('keydown', onKey);
  }
  menu.closeMenu = closeMenu;
}

function closeMenu() {
  document.querySelector('.profile-menu')?.closeMenu();
}

/** Focus the screen body — used after a route change so keyboard users land here. */
export function focusScreen() {
  if (bodyNode) bodyNode.focus({ preventScroll: true });
}
