/**
 * Everything that gets saved lives behind this file.
 *
 * It always reads and writes the browser's own storage, so every screen stays
 * quick and works offline. What changes is *whose* storage it is:
 *
 *   - a guest's practice sits under the plain `bizeng.` keys, on this device only;
 *   - a signed-in student's sits under `bizeng.u.<their id>.`, and every change
 *     is also handed to `onSyncedChange`, which copies it to their account.
 *
 * Settings (text size, motion) belong to the device, not the person.
 */

const PREFIX = 'bizeng.';
const SETTINGS_KEY = PREFIX + 'settings';

/** The parts of a student's practice that follow them between devices. */
export const SYNCED = ['progress', 'questions', 'session', 'days'];

let namespace = PREFIX; // guest until told otherwise
let syncListener = null;

const DEFAULT_SETTINGS = {
  textSize: 'normal', // 'normal' | 'large'
  reduceMotion: false,
};

function key(name, ns = namespace) {
  return ns + name;
}

function read(fullKey, fallback) {
  try {
    const raw = localStorage.getItem(fullKey);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    // Private windows and blocked site data both land here.
    return fallback;
  }
}

function write(fullKey, value) {
  try {
    localStorage.setItem(fullKey, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(fullKey) {
  try {
    localStorage.removeItem(fullKey);
  } catch {
    /* nothing we can do */
  }
}

/** Save one synced part for whoever is using the app now. */
function writeSynced(name, value) {
  if (value === null) remove(key(name));
  else write(key(name), value);
  if (namespace !== PREFIX) {
    write(key('updatedAt'), Date.now());
    if (syncListener) syncListener();
  }
}

// ---------- whose data ----------

/** Switch to a signed-in student's data, or back to the guest's with null. */
export function useAccount(uid) {
  namespace = uid ? `${PREFIX}u.${uid}.` : PREFIX;
}

/** Called after every change to a signed-in student's practice. */
export function onSyncedChange(listener) {
  syncListener = listener;
}

/** A signed-in student's practice as one object, ready to send to their account. */
export function exportSynced() {
  const out = { updatedAt: read(key('updatedAt'), 0) };
  for (const name of SYNCED) out[name] = read(key(name), null);
  return out;
}

/** Replace this device's copy with what came from the account. */
export function importSynced(data) {
  for (const name of SYNCED) {
    if (data[name] === null || data[name] === undefined) remove(key(name));
    else write(key(name), data[name]);
  }
  write(key('updatedAt'), data.updatedAt || 0);
}

export function localUpdatedAt() {
  return read(key('updatedAt'), 0);
}

/** Forget a signed-in student's copy on this device, e.g. after logging out. */
export function forgetAccount(uid) {
  const ns = `${PREFIX}u.${uid}.`;
  for (const name of [...SYNCED, 'updatedAt']) remove(key(name, ns));
}

// ---------- the guest's practice ----------

export function guestHasPractice() {
  const progress = read(key('progress', PREFIX), {});
  const questions = read(key('questions', PREFIX), []);
  return Object.keys(progress).length > 0 || questions.length > 0;
}

export function guestSummary() {
  return {
    ...summarise(read(key('progress', PREFIX), {})),
    questions: read(key('questions', PREFIX), []).length,
  };
}

/** Add the guest's practice into the signed-in student's, then clear the guest's. */
export function mergeGuestIntoAccount() {
  const guestProgress = read(key('progress', PREFIX), {});
  const guestQuestions = read(key('questions', PREFIX), []);

  const progress = getProgress();
  for (const [topicId, banks] of Object.entries(guestProgress)) {
    if (!progress[topicId]) progress[topicId] = {};
    for (const [type, bank] of Object.entries(banks)) {
      const mine = progress[topicId][type] || {};
      progress[topicId][type] = {
        used: union(mine.used, bank.used),
        seen: union(mine.seen || mine.used, bank.seen || bank.used),
        sessions: (mine.sessions || 0) + (bank.sessions || 0),
        answered: (mine.answered || 0) + (bank.answered || 0),
        firstTry: (mine.firstTry || 0) + (bank.firstTry || 0),
      };
    }
  }
  writeSynced('progress', progress);

  const questions = getQuestions();
  for (const q of guestQuestions) {
    if (!questions.some((mine) => mine.id === q.id)) questions.push(q);
  }
  questions.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  writeSynced('questions', questions);

  const days = union(getPracticeDays(), read(key('days', PREFIX), [])).sort();
  writeSynced('days', days.slice(-DAYS_KEPT));

  for (const name of SYNCED) remove(key(name, PREFIX));
}

function union(a = [], b = []) {
  return [...new Set([...(a || []), ...(b || [])])];
}

// ---------- settings ----------

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY, {}) };
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  write(SETTINGS_KEY, next);
  return next;
}

// ---------- progress ----------
// progress[topicId][activityType] =
//   { used: [itemId], seen: [itemId], sessions: n, answered: n, firstTry: n }
// `used` empties again once a whole pool has been seen, so questions repeat
// fairly. `seen` never empties: it is what the progress screen counts.

export function getProgress() {
  return read(key('progress'), {});
}

export function getBankProgress(topicId, type) {
  const all = getProgress();
  const bank = all[topicId]?.[type];
  if (!bank) return { used: [], seen: [], sessions: 0, answered: 0, firstTry: 0 };
  return { ...bank, seen: bank.seen || bank.used || [] };
}

export function saveBankProgress(topicId, type, patch) {
  const all = getProgress();
  if (!all[topicId]) all[topicId] = {};
  const current = getBankProgress(topicId, type);
  const next = { ...current, ...patch };
  if (patch.used) next.seen = union(current.seen, patch.used);
  all[topicId][type] = next;
  writeSynced('progress', all);
  if (patch.answered !== undefined) notePracticeDay();
  return next;
}

// ---------- days practised ----------
// The dates (on the student's own calendar) they checked at least one round.

const DAYS_KEPT = 60;

export function getPracticeDays() {
  return read(key('days'), []);
}

function notePracticeDay() {
  const today = dayString(new Date());
  const days = getPracticeDays();
  if (days.includes(today)) return;
  writeSynced('days', [...days, today].slice(-DAYS_KEPT));
}

/** How many different days they practised in the last 7, today included. */
export function daysThisWeek(days = getPracticeDays()) {
  const recent = new Set();
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    recent.add(dayString(d));
  }
  return days.filter((d) => recent.has(d)).length;
}

function dayString(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Totals for the dashboard and the progress screen. */
export function getSummary() {
  return summarise(getProgress());
}

export function summarise(all) {
  let sessions = 0;
  let answered = 0;
  let firstTry = 0;
  const topicsTouched = new Set();

  for (const [topicId, banks] of Object.entries(all || {})) {
    for (const bank of Object.values(banks)) {
      sessions += bank.sessions || 0;
      answered += bank.answered || 0;
      firstTry += bank.firstTry || 0;
      if (bank.answered) topicsTouched.add(topicId);
    }
  }
  return { sessions, answered, firstTry, topicsTouched: topicsTouched.size };
}

/** How many different questions in one topic the student has met. */
export function seenInTopic(all, topicId) {
  const banks = (all || {})[topicId] || {};
  let seen = 0;
  for (const bank of Object.values(banks)) seen += (bank.seen || bank.used || []).length;
  return seen;
}

// ---------- the student's questions list ----------

export function getQuestions() {
  return read(key('questions'), []);
}

export function isFlagged(itemId) {
  return getQuestions().some((q) => q.id === itemId);
}

export function toggleQuestion(entry) {
  const list = getQuestions();
  const index = list.findIndex((q) => q.id === entry.id);
  if (index >= 0) {
    list.splice(index, 1);
  } else {
    list.unshift({ ...entry, addedAt: Date.now() });
  }
  writeSynced('questions', list);
  return index < 0; // true when it was just added
}

export function removeQuestion(itemId) {
  writeSynced(
    'questions',
    getQuestions().filter((q) => q.id !== itemId)
  );
}

export function clearQuestions() {
  writeSynced('questions', []);
}

// ---------- an unfinished session ----------

export function getSavedSession() {
  return read(key('session'), null);
}

export function saveSession(session) {
  writeSynced('session', session);
}

export function clearSavedSession() {
  writeSynced('session', null);
}

// ---------- reset ----------

export function resetProgress() {
  writeSynced('progress', null);
  writeSynced('session', null);
}

export function resetEverything() {
  for (const name of SYNCED) writeSynced(name, null);
  remove(SETTINGS_KEY);
}
