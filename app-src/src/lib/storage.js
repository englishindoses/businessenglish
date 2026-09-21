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

/**
 * The parts of a student's practice that follow them between devices.
 *
 * `session` is the old single-attempt key. Attempts are now kept per activity,
 * inside `progress`, so `session` is only read once, to move an unfinished
 * attempt across, and then cleared. `last` remembers the activity they were on
 * so the dashboard can offer to pick it up again.
 */
export const SYNCED = ['progress', 'questions', 'session', 'days', 'last'];

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
  migrateLegacySession();
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
  migrateLegacySession();
}

/**
 * Move an unfinished attempt saved by an older version into its own activity,
 * so nobody loses their place when the app updates. Runs once: the old key is
 * cleared afterwards.
 */
function migrateLegacySession() {
  const legacy = read(key('session'), null);
  if (!legacy) return;

  if (legacy.topicId && legacy.type) {
    const bank = getBankProgress(legacy.topicId, legacy.type);
    if (!bank.attempt) {
      saveBankProgress(legacy.topicId, legacy.type, {
        attempt: {
          itemIds: legacy.itemIds || [],
          roundIndex: legacy.roundIndex || 0,
          results: legacy.results || {},
          finished: Boolean(legacy.finished),
        },
      });
      writeSynced('last', { topicId: legacy.topicId, type: legacy.type });
    }
  }
  writeSynced('session', null);
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
        seen: union(practised(mine), practised(bank)),
        sessions: (mine.sessions || 0) + (bank.sessions || 0),
        answered: (mine.answered || 0) + (bank.answered || 0),
        firstTry: (mine.firstTry || 0) + (bank.firstTry || 0),
        correct: (mine.correct || 0) + (bank.correct || 0),
        scored: (mine.scored || 0) + (bank.scored || 0),
        // An attempt in play belongs to one device; keep the account's.
        attempt: mine.attempt || bank.attempt || null,
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
//   { used, seen, sessions, answered, firstTry, correct, scored, attempt }
//
// `used` is what has been dealt out, and empties again once a whole pool has
// been dealt, so questions repeat fairly. `seen` is what has actually been
// checked, and never empties. `sessions` is how many times this activity has
// been completed. `correct` over `scored` is the student's current score: of
// every question they have finished an activity with, how many stand right.
// `attempt` is the set of 12 in play, or the finished one, until they start
// again.

/** What a bank looks like before anybody has practised it. */
const EMPTY_BANK = {
  used: [],
  seen: [],
  sessions: 0,
  answered: 0,
  firstTry: 0,
  correct: 0,
  scored: 0,
  attempt: null,
};

export function getProgress() {
  return read(key('progress'), {});
}

export function getBankProgress(topicId, type) {
  const all = getProgress();
  const bank = all[topicId]?.[type];
  if (!bank) return { ...EMPTY_BANK };
  return { ...EMPTY_BANK, ...bank, seen: practised(bank) };
}

/**
 * The questions in one bank the student has checked. Until 19 September a
 * question counted as soon as it was dealt, even if the round was never
 * checked, so older records can list more than were answered. Nobody can have
 * practised more different questions than they answered, so trim to that.
 */
function practised(bank) {
  const seen = bank.seen || bank.used || [];
  const answered = bank.answered || 0;
  return seen.length > answered ? seen.slice(0, answered) : seen;
}

export function saveBankProgress(topicId, type, patch) {
  const all = getProgress();
  if (!all[topicId]) all[topicId] = {};
  const current = getBankProgress(topicId, type);
  const next = { ...current, ...patch };
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
  let correct = 0;
  let scored = 0;
  let completed = 0;
  const topicsTouched = new Set();

  for (const [topicId, banks] of Object.entries(all || {})) {
    for (const bank of Object.values(banks)) {
      sessions += bank.sessions || 0;
      answered += bank.answered || 0;
      firstTry += bank.firstTry || 0;
      correct += bank.correct || 0;
      scored += bank.scored || 0;
      if (bank.sessions) completed += 1;
      if (bank.answered) topicsTouched.add(topicId);
    }
  }
  return {
    sessions,
    answered,
    firstTry,
    correct,
    scored,
    completed,
    topicsTouched: topicsTouched.size,
  };
}

/**
 * The student's score right now: of every question they have finished an
 * activity with, the percentage standing correct. Null until they finish one,
 * so nobody is shown 0% before they have had a chance.
 */
export function currentScore(all) {
  const { correct, scored } = summarise(all);
  if (!scored) return null;
  return Math.round((correct / scored) * 100);
}

/** How many different questions in one topic the student has met. */
export function seenInTopic(all, topicId) {
  const banks = (all || {})[topicId] || {};
  let seen = 0;
  for (const bank of Object.values(banks)) seen += practised(bank).length;
  return seen;
}

/** How many of a topic's activities have been completed at least once. */
export function completedInTopic(all, topicId) {
  const banks = (all || {})[topicId] || {};
  return Object.values(banks).filter((bank) => bank.sessions).length;
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

// ---------- the attempt in play, one per activity ----------
// An attempt is the 12 questions the student is working through:
//   { itemIds, roundIndex, results, finished }
// It stays after they finish, so the activity shows as completed until they
// choose to start again, which draws a fresh 12.

export function getAttempt(topicId, type) {
  return getBankProgress(topicId, type).attempt || null;
}

export function saveAttempt(topicId, type, attempt) {
  saveBankProgress(topicId, type, { attempt });
  writeSynced('last', { topicId, type });
}

export function clearAttempt(topicId, type) {
  saveBankProgress(topicId, type, { attempt: null });
}

/** The activity they were on last, for the dashboard's resume card. */
export function getLastActivity() {
  return read(key('last'), null);
}

/** How many of an attempt's questions have been checked so far. */
export function attemptAnswered(attempt) {
  return attempt ? Object.keys(attempt.results || {}).length : 0;
}

/**
 * Finishing an activity: count the completion, and add this attempt's final
 * standing to the score. Called once, when they tap through to their results.
 */
export function recordCompletion(topicId, type, attempt) {
  const bank = getBankProgress(topicId, type);
  const results = attempt.results || {};
  const right = Object.values(results).filter(Boolean).length;

  saveBankProgress(topicId, type, {
    sessions: bank.sessions + 1,
    correct: bank.correct + right,
    scored: bank.scored + (attempt.itemIds || []).length,
    attempt: { ...attempt, finished: true },
  });
}

// ---------- reset ----------

export function resetProgress() {
  writeSynced('progress', null);
  writeSynced('session', null);
  writeSynced('last', null);
}

export function resetEverything() {
  for (const name of SYNCED) writeSynced(name, null);
  remove(SETTINGS_KEY);
}
