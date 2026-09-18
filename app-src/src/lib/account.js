/**
 * Who is using the app: nobody yet, a guest, or a signed-in student.
 *
 * Guests keep everything on the device. A signed-in student's practice is
 * saved on the device as well, then copied to their account a moment after
 * each change, and fetched back when they open the app on another device.
 */
import {
  useAccount,
  onSyncedChange,
  exportSynced,
  importSynced,
  localUpdatedAt,
  forgetAccount,
  guestHasPractice,
  guestSummary,
  mergeGuestIntoAccount,
} from './storage.js';
import { choiceDialog } from '../ui/dialog.js';

/** Google accounts that see the teacher's pages. */
const TEACHERS = ['englishindoses@gmail.com'];

const ACCOUNT_KEY = 'bizeng.account'; // { mode: 'guest' | 'student', stay }
const GUEST_VISIT_KEY = 'bizeng.guestThisVisit'; // sessionStorage
const PUSH_DELAY = 2000;
const NETWORK_WAIT = 5000;

let state = { kind: 'none', student: null };
let cloud = null;
let pushTimer = null;

/** Firebase is only downloaded once someone signs in. */
export async function loadCloud() {
  if (!cloud) cloud = await import('./cloud.js');
  return cloud;
}

export function getAccount() {
  return {
    ...state,
    isTeacher: Boolean(state.student && TEACHERS.includes(state.student.email.toLowerCase())),
  };
}

export function needsSignIn() {
  return state.kind === 'none';
}

// ---------- opening the app ----------

/** Work out who is using the app. Call once before showing any screen. */
export async function restore() {
  const saved = readJSON(localStorage, ACCOUNT_KEY);

  if (saved?.mode === 'student') {
    try {
      const c = await loadCloud();
      // Back from a sign-in that had to leave the page: treat as a fresh sign-in.
      const fresh = await c.finishRedirect();
      if (fresh) return enterStudent(fresh, saved.stay !== false, { fresh: true });

      const student = await c.currentStudent();
      if (student) return enterStudent(student, saved.stay !== false, { fresh: false });
    } catch {
      /* fall through to the sign-in page */
    }
    // Their sign-in ended (e.g. "stay signed in" was off and the app was closed).
    removeJSON(localStorage, ACCOUNT_KEY);
  }

  if (saved?.mode === 'guest' && (saved.stay || readJSON(sessionStorage, GUEST_VISIT_KEY))) {
    enterGuest(saved.stay);
    return;
  }

  state = { kind: 'none', student: null };
}

// ---------- signing in and out ----------

/** @returns {Promise<boolean>} true once they're signed in */
export async function signIn(stay) {
  const c = await loadCloud();
  // Written first, in case the sign-in has to leave the page and come back.
  writeJSON(localStorage, ACCOUNT_KEY, { mode: 'student', stay });
  const student = await c.signInWithGoogle(stay);
  if (student === 'redirect') return new Promise(() => {}); // the page is leaving
  if (!student) {
    removeJSON(localStorage, ACCOUNT_KEY);
    return false;
  }
  await enterStudent(student, stay, { fresh: true });
  return true;
}

export function continueAsGuest(stay) {
  enterGuest(stay);
}

export async function logOut() {
  if (state.kind === 'student') {
    const { uid } = state.student;
    await withTimeout(pushNow(), NETWORK_WAIT).catch(() => {});
    onSyncedChange(null);
    try {
      await (await loadCloud()).signOut();
    } catch {
      /* signed out locally regardless */
    }
    forgetAccount(uid);
  }
  removeJSON(localStorage, ACCOUNT_KEY);
  removeJSON(sessionStorage, GUEST_VISIT_KEY);
  useAccount(null);
  state = { kind: 'none', student: null };
}

function enterGuest(stay) {
  useAccount(null);
  onSyncedChange(null);
  writeJSON(localStorage, ACCOUNT_KEY, { mode: 'guest', stay: Boolean(stay) });
  writeJSON(sessionStorage, GUEST_VISIT_KEY, true);
  state = { kind: 'guest', student: null };
}

async function enterStudent(student, stay, { fresh }) {
  useAccount(student.uid);
  state = { kind: 'student', student };
  writeJSON(localStorage, ACCOUNT_KEY, { mode: 'student', stay });

  // Whichever copy changed last wins: the account's, or this device's.
  try {
    const remote = await withTimeout((await loadCloud()).loadPractice(student.uid), NETWORK_WAIT);
    if (remote && remote.updatedAt > localUpdatedAt()) importSynced(remote);
  } catch {
    /* offline: carry on with this device's copy and send it later */
  }

  if (fresh && guestHasPractice()) await offerGuestMerge();

  onSyncedChange(schedulePush);
  pushNow().catch(() => {});
}

async function offerGuestMerge() {
  const g = guestSummary();
  const parts = [];
  if (g.answered) parts.push(`${g.answered} ${g.answered === 1 ? 'question' : 'questions'} answered`);
  if (g.questions) parts.push(`${g.questions} saved for your teacher`);

  const choice = await choiceDialog({
    title: 'Add your guest practice?',
    message: `You practised as a guest on this device (${parts.join(', ')}). Do you want to add it to your account?`,
    choices: [
      { label: 'Add it to my account', value: 'merge', primary: true },
      { label: 'Keep it separate', value: 'keep' },
    ],
  });
  if (choice === 'merge') mergeGuestIntoAccount();
}

// ---------- copying practice to the account ----------

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushNow().catch(() => {}), PUSH_DELAY);
}

async function pushNow() {
  clearTimeout(pushTimer);
  pushTimer = null;
  if (state.kind !== 'student') return;
  const c = await loadCloud();
  await c.savePractice(state.student, exportSynced());
}

// Send any waiting change before the app goes to the background.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && pushTimer) pushNow().catch(() => {});
});

// ---------- helpers ----------

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

function readJSON(store, k) {
  try {
    const raw = store.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(store, k, value) {
  try {
    store.setItem(k, JSON.stringify(value));
  } catch {
    /* private window: they'll just be asked again next time */
  }
}

function removeJSON(store, k) {
  try {
    store.removeItem(k);
  } catch {
    /* nothing we can do */
  }
}
