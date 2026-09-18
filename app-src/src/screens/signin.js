/**
 * The first screen: sign in with Google, or carry on as a guest.
 */
import { el } from '../lib/dom.js';
import { navigate, refresh, currentPath } from '../lib/router.js';
import { renderBare } from '../ui/shell.js';
import { signIn, continueAsGuest } from '../lib/account.js';

export default function signinScreen() {
  const stay = el('input', { type: 'checkbox', class: 'switch-input', id: 'stay-signed-in' });
  stay.checked = true;

  const error = el('p', { class: 'signin-error', role: 'alert' });

  const googleBtn = el('button', {
    type: 'button',
    class: 'btn btn-google',
    onClick: async () => {
      error.textContent = '';
      googleBtn.disabled = true;
      googleBtn.querySelector('.btn-google-label').textContent = 'Signing in…';
      try {
        const ok = await signIn(stay.checked);
        if (ok) return finish();
      } catch (err) {
        error.textContent = friendlyError(err);
      }
      googleBtn.disabled = false;
      googleBtn.querySelector('.btn-google-label').textContent = 'Sign in with Google';
    },
  }, [
    el('span', { class: 'btn-google-mark', 'aria-hidden': 'true', html: GOOGLE_G }),
    el('span', { class: 'btn-google-label', text: 'Sign in with Google' }),
  ]);

  const guestBtn = el('button', {
    type: 'button',
    class: 'btn btn-quiet',
    text: 'Continue as a guest',
    onClick: () => {
      continueAsGuest(stay.checked);
      finish();
    },
  });

  function finish() {
    if (currentPath() === '/') refresh();
    else navigate('/', { replace: true });
  }

  renderBare([
    el('div', { class: 'signin' }, [
      el('div', { class: 'signin-brand' }, [
        el('span', { class: 'signin-icon', 'aria-hidden': 'true', text: '🎯' }),
        el('h1', { class: 'signin-title', text: 'Practice makes Perfect' }),
        el('p', { class: 'signin-sub', text: 'Business English in Doses' }),
      ]),

      el('div', { class: 'signin-card' }, [
        googleBtn,
        el('p', {
          class: 'signin-note',
          text: 'Your progress and saved questions go wherever you sign in, and your teacher can see them to help you in class.',
        }),
        el('div', { class: 'signin-divider' }, [el('span', { text: 'or' })]),
        guestBtn,
        el('p', {
          class: 'signin-note',
          text: 'As a guest, your practice stays on this device only.',
        }),
        error,
      ]),

      el('label', { class: 'setting-row signin-stay', for: 'stay-signed-in' }, [
        el('div', { class: 'setting-text' }, [
          el('p', { class: 'setting-label', text: 'Stay signed in' }),
          el('p', {
            class: 'setting-desc',
            text: 'Turn this off on a shared phone or computer.',
          }),
        ]),
        el('span', { class: 'switch' }, [stay, el('span', { class: 'switch-track' })]),
      ]),
    ]),
  ]);
}

function friendlyError(err) {
  const code = err?.code || '';
  if (code === 'auth/network-request-failed' || !navigator.onLine) {
    return 'You seem to be offline. Connect to the internet to sign in, or continue as a guest.';
  }
  if (['auth/unauthorized-domain', 'auth/operation-not-allowed', 'auth/configuration-not-found'].includes(code)) {
    return 'Google sign-in isn’t switched on yet. Please tell your teacher, and continue as a guest for now.';
  }
  return 'Signing in didn’t work. Please try again, or continue as a guest.';
}

const GOOGLE_G =
  '<svg viewBox="0 0 48 48" width="20" height="20"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
