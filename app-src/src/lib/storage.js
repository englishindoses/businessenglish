/**
 * Everything that gets saved lives behind this file.
 *
 * Right now it all goes into the browser's own storage on the student's device.
 * When logins are added, only this file changes: the same functions get their
 * data from Firestore instead.
 */

const PREFIX = 'bizeng.';
const KEYS = {
  progress: PREFIX + 'progress',
  questions: PREFIX + 'questions',
  settings: PREFIX + 'settings',
  session: PREFIX + 'session',
};

const DEFAULT_SETTINGS = {
  textSize: 'normal', // 'normal' | 'large'
  showClues: true,
  reduceMotion: false,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    // Private windows and blocked site data both land here.
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ---------- settings ----------

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) };
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  write(KEYS.settings, next);
  return next;
}

// ---------- progress ----------
// progress[topicId][activityType] = { used: [itemId], sessions: n, answered: n, firstTry: n }

export function getProgress() {
  return read(KEYS.progress, {});
}

export function getBankProgress(topicId, type) {
  const all = getProgress();
  return all[topicId]?.[type] || { used: [], sessions: 0, answered: 0, firstTry: 0 };
}

export function saveBankProgress(topicId, type, patch) {
  const all = getProgress();
  if (!all[topicId]) all[topicId] = {};
  all[topicId][type] = { ...getBankProgress(topicId, type), ...patch };
  write(KEYS.progress, all);
  return all[topicId][type];
}

/** Totals for the home screen. */
export function getSummary() {
  const all = getProgress();
  let sessions = 0;
  let answered = 0;
  let firstTry = 0;
  const topicsTouched = new Set();

  for (const [topicId, banks] of Object.entries(all)) {
    for (const bank of Object.values(banks)) {
      sessions += bank.sessions || 0;
      answered += bank.answered || 0;
      firstTry += bank.firstTry || 0;
      if (bank.answered) topicsTouched.add(topicId);
    }
  }
  return { sessions, answered, firstTry, topicsTouched: topicsTouched.size };
}

// ---------- the student's questions list ----------

export function getQuestions() {
  return read(KEYS.questions, []);
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
  write(KEYS.questions, list);
  return index < 0; // true when it was just added
}

export function removeQuestion(itemId) {
  write(
    KEYS.questions,
    getQuestions().filter((q) => q.id !== itemId)
  );
}

export function clearQuestions() {
  write(KEYS.questions, []);
}

// ---------- an unfinished session ----------

export function getSavedSession() {
  return read(KEYS.session, null);
}

export function saveSession(session) {
  write(KEYS.session, session);
}

export function clearSavedSession() {
  try {
    localStorage.removeItem(KEYS.session);
  } catch {
    /* nothing we can do */
  }
}

// ---------- reset ----------

export function resetProgress() {
  try {
    localStorage.removeItem(KEYS.progress);
    localStorage.removeItem(KEYS.session);
  } catch {
    /* nothing we can do */
  }
}

export function resetEverything() {
  for (const key of Object.values(KEYS)) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing we can do */
    }
  }
}
