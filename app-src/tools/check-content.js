/**
 * Sanity checks on a topic's question bank.
 *   node tools/check-content.js
 */
import topic from '../src/data/lesson1.js';

const problems = [];
const flag = (id, msg) => problems.push(`${id}: ${msg}`);

const { gapfill, rightwrong, matching, wordorder } = topic.items;
const allIds = [];

for (const list of Object.values(topic.items)) for (const i of list) allIds.push(i.id);
const dupes = allIds.filter((id, n) => allIds.indexOf(id) !== n);
if (dupes.length) flag('ids', `duplicate ids: ${[...new Set(dupes)].join(', ')}`);

// ---- gap-fill ----
for (const item of gapfill) {
  const markers = [...item.sentence.matchAll(/\{(\d+)\}/g)].map((m) => m[1]);
  const keys = Object.keys(item.gaps);
  if (markers.length !== keys.length) flag(item.id, `${markers.length} gaps in sentence, ${keys.length} defined`);
  for (const k of keys) {
    if (!markers.includes(k)) flag(item.id, `gap ${k} defined but not in the sentence`);
    const gap = item.gaps[k];
    if (!gap.options.includes(gap.answer)) flag(item.id, `answer "${gap.answer}" is not one of the options`);
    if (new Set(gap.options).size !== gap.options.length) flag(item.id, `repeated option`);
    if (gap.options.length < 3) flag(item.id, `only ${gap.options.length} options`);
  }
  if (!item.clue) flag(item.id, 'no clue');
}

// ---- right / wrong ----
let ok = 0;
for (const item of rightwrong) {
  if (typeof item.correct !== 'boolean') flag(item.id, 'correct flag missing');
  if (item.correct) { ok++; if (item.fix) flag(item.id, 'marked correct but has a fix'); }
  else if (!item.fix) flag(item.id, 'marked incorrect but has no correction');
  if (!item.clue) flag(item.id, 'no clue');
  // a "fix" that changes nothing means the error was never actually corrected
  if (item.fix && item.fix.replace(/\*\*/g, '') === item.sentence)
    flag(item.id, 'the correction is identical to the sentence');
}
if (ok !== rightwrong.length - ok)
  problems.push(`rightwrong: unbalanced — ${ok} correct vs ${rightwrong.length - ok} incorrect`);

// ---- matching ----
const rights = matching.map((m) => m.right.toLowerCase());
for (const [i, r] of rights.entries())
  if (rights.indexOf(r) !== i) flag(matching[i].id, `meaning duplicates ${matching[rights.indexOf(r)].id}`);

// crude overlap check: meanings sharing most of their content words can be swapped
const words = (s) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) || []);
for (let a = 0; a < matching.length; a++)
  for (let b = a + 1; b < matching.length; b++) {
    const A = words(matching[a].right), B = words(matching[b].right);
    const shared = [...A].filter((w) => B.has(w));
    const ratio = shared.length / Math.min(A.size, B.size);
    if (ratio >= 0.6)
      flag(`${matching[a].id}/${matching[b].id}`, `meanings overlap heavily (${shared.join(', ')})`);
  }

// ---- word order ----
const bag = (s) => s.split(' ').slice().sort().join('|');
for (const item of wordorder) {
  if (!item.answer) flag(item.id, 'no answer');
  for (const alt of item.alternatives || []) {
    if (bag(alt) !== bag(item.answer))
      flag(item.id, `alternative uses different words, so it can never be built: "${alt}"`);
    if (alt === item.answer) flag(item.id, 'alternative is identical to the answer');
  }
  if (!item.clue) flag(item.id, 'no clue');
}

// ---- clues must hint, not answer ----
// A clue is shown only when the student got it wrong and is about to try again,
// so it must point at where to look without containing the answer itself.
const MAX_CLUE = 70;
// Word-level comparison rather than a regex, so punctuation in a phrase
// ("must be", "to introduce") needs no escaping.
const wordsOf = (text) => (text.toLowerCase().match(/[a-z']+/g) || []);
const hasWord = (text, phrase) => {
  const hay = wordsOf(text);
  const needle = wordsOf(phrase);
  if (!needle.length) return false;
  return hay.some((_, i) => needle.every((w, j) => hay[i + j] === w));
};

for (const [type, list] of Object.entries(topic.items)) {
  for (const item of list) {
    const clue = item.clue || '';
    if (clue.length > MAX_CLUE) flag(item.id, `clue is ${clue.length} chars, aim for ${MAX_CLUE}`);

    if (type === 'gapfill') {
      for (const gap of Object.values(item.gaps))
        if (hasWord(clue, gap.answer)) flag(item.id, `clue contains the answer "${gap.answer}"`);
    }

    if (type === 'rightwrong' && item.fix) {
      // the words the correction emphasises are the giveaway
      for (const [, corrected] of item.fix.matchAll(/\*\*(.+?)\*\*/g))
        if (hasWord(clue, corrected)) flag(item.id, `clue contains the correction "${corrected}"`);
    }

    if (type === 'matching') {
      const meaning = item.right.toLowerCase().match(/[a-z]{4,}/g) || [];
      const leaked = meaning.filter((w) => hasWord(clue, w));
      if (leaked.length >= 2) flag(item.id, `clue echoes the meaning (${leaked.join(', ')})`);
    }

    if (type === 'wordorder') {
      const words = item.answer.replace(/[.?!,]/g, '').split(' ');
      for (let i = 0; i + 2 < words.length; i++) {
        const run = words.slice(i, i + 3).join(' ');
        if (clue.toLowerCase().includes(run.toLowerCase()))
          flag(item.id, `clue gives away part of the answer ("${run}")`);
      }
    }
  }
}

console.log(`checked ${allIds.length} items across ${Object.keys(topic.items).length} activity types`);
console.log(`right/wrong balance: ${ok} correct, ${rightwrong.length - ok} incorrect`);
console.log(problems.length ? `\n${problems.length} problem(s):\n- ` + problems.join('\n- ') : '\nno problems found');
