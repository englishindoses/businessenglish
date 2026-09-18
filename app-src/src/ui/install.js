/**
 * The "Install BizEng" card on the home screen, and the help box it opens
 * when the browser can't install the app by itself.
 */
import { el } from '../lib/dom.js';
import {
  isInstalled,
  browserKind,
  canPromptNow,
  promptInstall,
  chromeLink,
} from '../lib/install.js';

/** The card, or null inside the installed app, where it would make no sense. */
export function installCard() {
  if (isInstalled()) return null;

  return el('button', {
    type: 'button',
    class: 'card card-install',
    onClick: handleInstall,
  }, [
    el('span', { class: 'card-icon', 'aria-hidden': 'true', text: '📲' }),
    el('span', { class: 'topic-text' }, [
      el('span', { class: 'card-title', text: 'Install BizEng' }),
      el('span', {
        class: 'card-meta',
        text: 'Add it to your home screen and open it like any other app',
      }),
    ]),
    el('span', { class: 'topic-go', 'aria-hidden': 'true', text: '›' }),
  ]);
}

async function handleInstall() {
  const kind = browserKind();

  // Samsung Internet can install, but its version triggers Android's
  // "older version of Android" warning, so offer Chrome first.
  if (kind === 'samsung') {
    showHelp(kind);
    return;
  }

  if (canPromptNow()) {
    await promptInstall();
    return;
  }

  showHelp(kind);
}

const MENU = '⋮';

function steps(kind) {
  switch (kind) {
    case 'ios':
      return {
        title: 'Install on iPhone or iPad',
        intro: 'In Safari:',
        steps: [
          ['Tap the ', strong('Share'), ' button (the square with an arrow pointing up).'],
          ['Scroll down and tap ', strong('Add to Home Screen'), '.'],
          ['Tap ', strong('Add'), '.'],
        ],
      };
    case 'samsung':
      return {
        title: 'Install with Chrome',
        intro:
          'Samsung Internet can install BizEng, but your phone may warn that it was “built for an older version of Android”. The app is safe, but installing from Chrome avoids the warning.',
        steps: [
          ['Tap ', strong('Open in Chrome'), ' below.'],
          ['In Chrome, tap ', strong(`${MENU}`), ' at the top right.'],
          ['Tap ', strong('Install app'), ' or ', strong('Add to Home screen'), '.'],
        ],
      };
    case 'firefox':
      return {
        title: 'Install BizEng',
        intro: 'On an Android phone:',
        steps: [
          ['Tap ', strong(`${MENU}`), ' (the menu button).'],
          ['Tap ', strong('Add to Home screen'), ' or ', strong('Install'), '.'],
        ],
        after: 'On a computer, Firefox can’t install apps. Open this page in Chrome or Edge instead.',
      };
    case 'android':
      return {
        title: 'Install BizEng',
        steps: [
          ['Tap ', strong(`${MENU}`), ' at the top right of Chrome.'],
          ['Tap ', strong('Install app'), ' or ', strong('Add to Home screen'), '.'],
        ],
        after: 'If you’ve already installed it, look for BizEng on your home screen.',
      };
    default:
      return {
        title: 'Install BizEng',
        steps: [
          ['Look for the ', strong('install'), ' icon at the right end of the address bar.'],
          ['Or open the browser menu and choose ', strong('Install BizEng'), '.'],
        ],
        after: 'This works in Chrome and Edge. If you’ve already installed it, look for BizEng in your apps.',
      };
  }
}

function strong(text) {
  return el('strong', { text });
}

function showHelp(kind) {
  const content = steps(kind);
  const titleId = 'install-title';

  const closeBtn = el('button', {
    type: 'button',
    class: 'btn btn-quiet',
    text: 'Close',
  });

  const actions = [];
  if (kind === 'samsung') {
    actions.push(
      el('a', { class: 'btn btn-primary', href: chromeLink(), text: 'Open in Chrome' })
    );
    if (canPromptNow()) {
      actions.push(
        el('button', {
          type: 'button',
          class: 'btn',
          text: 'Install here anyway',
          onClick: async () => {
            dialog.close();
            await promptInstall();
          },
        })
      );
    }
  }
  actions.push(closeBtn);

  const dialog = el('dialog', { class: 'dialog dialog-install', 'aria-labelledby': titleId }, [
    el('h2', { class: 'dialog-title', id: titleId, text: content.title }),
    content.intro ? el('p', { class: 'dialog-message', text: content.intro }) : null,
    el('ol', { class: 'install-steps' }, content.steps.map((parts) => el('li', {}, parts))),
    content.after ? el('p', { class: 'dialog-message', text: content.after }) : null,
    el('div', { class: 'dialog-actions dialog-actions-stacked' }, actions),
  ]);

  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.body.append(dialog);
  dialog.showModal();
  actions[0].focus();
}
