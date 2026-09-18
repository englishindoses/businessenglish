/**
 * Installing BizEng to the home screen.
 *
 * Chrome (and Edge, and Samsung Internet) fire `beforeinstallprompt` when they
 * are willing to install the app. We keep that event so our own button can
 * open the browser's install box later. When the browser has not offered it —
 * iPhones never do, and Chrome holds back after a student dismisses it — the
 * button shows the steps to do it by hand instead.
 *
 * Samsung Internet builds its own app package, which recent Android versions
 * flag with "built for an older version of Android". So on Samsung Internet
 * we steer students to Chrome first, and keep installing here as a fallback.
 */

let deferredPrompt = null;

export function initInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // stop the browser's own mini-bar; our button does it
    deferredPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });
}

/** True when BizEng was opened from its home-screen icon. */
export function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

/** Which set of instructions fits this browser. */
export function browserKind() {
  const ua = navigator.userAgent;
  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad asking for the desktop site
  if (isIOS) return 'ios';
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/Firefox|FxiOS/.test(ua)) return 'firefox';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export function canPromptNow() {
  return deferredPrompt !== null;
}

/**
 * Open the browser's own install box.
 * @returns {Promise<boolean>} true if the student chose to install
 */
export async function promptInstall() {
  if (!deferredPrompt) return false;
  const event = deferredPrompt;
  // The event can only be used once.
  deferredPrompt = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
}

/** A link that opens this page in Chrome on Android. */
export function chromeLink() {
  const { host, pathname } = window.location;
  return `intent://${host}${pathname}#Intent;scheme=https;package=com.android.chrome;end`;
}
