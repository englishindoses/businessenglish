/**
 * Sanity checks on the question banks.
 *   node tools/check-content.js            every written topic
 *   node tools/check-content.js lesson2    just one
 *
 * "Problems" must be fixed before committing. "Variety notes" are for a human to
 * judge: a repeated context or several sentences opening the same way is not
 * always wrong, but it is worth a second look.
 */
import { topics } from '../src/data/topics.js';

const wanted = process.argv[2];
const written = topics.filter((t) => t.items);
const selected = written.filter((t) => !wanted || t.id === wanted);
if (wanted && !selected.length) {
  console.error(`No written topic called "${wanted}". Written: ${written.map((t) => t.id).join(', ')}`);
  process.exit(1);
}

const PER_TYPE = 24;
const MAX_CLUE = 70;
const MAX_CHIPS = 12;

// IDs must be unique across the whole app, not just within a topic.
const seenIds = new Map();
for (const topic of written)
  for (const list of Object.values(topic.items))
    for (const item of list) seenIds.set(item.id, [...(seenIds.get(item.id) || []), topic.id]);

let totalProblems = 0;
for (const topic of selected) totalProblems += checkTopic(topic);
process.exit(totalProblems ? 1 : 0);

function checkTopic(topic) {
  const problems = [];
  const notes = [];
  const flag = (id, msg) => problems.push(`${id}: ${msg}`);
  const note = (id, msg) => notes.push(`${id}: ${msg}`);

  const { gapfill = [], rightwrong = [], matching = [], wordorder = [] } = topic.items;
  let count = 0;

  for (const [type, list] of Object.entries(topic.items)) {
    count += list.length;
    if (list.length !== PER_TYPE) flag(type, `${list.length} questions, expected ${PER_TYPE}`);
    for (const item of list) {
      const owners = seenIds.get(item.id);
      if (owners.length > 1) flag(item.id, `id used more than once (${owners.join(', ')})`);
    }
  }

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
    if (item.correct) {
      ok++;
      if (item.fix) flag(item.id, 'marked correct but has a fix');
    } else if (!item.fix) flag(item.id, 'marked incorrect but has no correction');
    if (!item.clue) flag(item.id, 'no clue');
    // a "fix" that changes nothing means the error was never actually corrected
    if (item.fix && item.fix.replace(/\*\*/g, '') === item.sentence)
      flag(item.id, 'the correction is identical to the sentence');
    if (item.fix && !/\*\*.+?\*\*/.test(item.fix)) flag(item.id, 'the correction has no **bold** part');
  }
  if (ok !== rightwrong.length - ok)
    problems.push(`rightwrong: unbalanced — ${ok} correct vs ${rightwrong.length - ok} incorrect`);

  // ---- matching ----
  const rights = matching.map((m) => m.right.toLowerCase());
  for (const [i, r] of rights.entries())
    if (rights.indexOf(r) !== i) flag(matching[i].id, `meaning duplicates ${matching[rights.indexOf(r)].id}`);
  const lefts = matching.map((m) => m.left.toLowerCase());
  for (const [i, l] of lefts.entries())
    if (lefts.indexOf(l) !== i) flag(matching[i].id, `phrase duplicates ${matching[lefts.indexOf(l)].id}`);

  // crude overlap check: meanings sharing most of their content words can be swapped
  const words = (s) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) || []);
  for (let a = 0; a < matching.length; a++)
    for (let b = a + 1; b < matching.length; b++) {
      const A = words(matching[a].right);
      const B = words(matching[b].right);
      const shared = [...A].filter((w) => B.has(w));
      const ratio = shared.length / Math.min(A.size, B.size);
      if (ratio >= 0.6)
        flag(`${matching[a].id}/${matching[b].id}`, `meanings overlap heavily (${shared.join(', ')})`);
    }

  // ---- word order ----
  const bag = (s) => s.split(' ').slice().sort().join('|');
  for (const item of wordorder) {
    if (!item.answer) flag(item.id, 'no answer');
    const chips = item.answer.split(' ').length;
    if (chips > MAX_CHIPS) flag(item.id, `${chips} words — too many to sort on a phone (max ${MAX_CHIPS})`);
    if (/\s{2,}|^\s|\s$/.test(item.answer)) flag(item.id, 'stray spaces in the answer');
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
  // Word-level comparison rather than a regex, so punctuation in a phrase
  // ("must be", "to introduce") needs no escaping.
  const wordsOf = (text) => text.toLowerCase().match(/[a-z']+/g) || [];
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
      if (/\bthink\s+[a-z]+\.$/i.test(clue)) flag(item.id, `clue sounds offhand ("${clue}")`);

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
        const answerWords = item.answer.replace(/[.?!,]/g, '').split(' ');
        for (let i = 0; i + 2 < answerWords.length; i++) {
          const run = answerWords.slice(i, i + 3).join(' ');
          if (clue.toLowerCase().includes(run.toLowerCase()))
            flag(item.id, `clue gives away part of the answer ("${run}")`);
        }
      }
    }
  }

  // ---- variety notes ----
  for (const [type, list] of Object.entries(topic.items)) {
    const contexts = new Map();
    const openings = new Map();
    for (const item of list) {
      if (item.context) contexts.set(item.context, [...(contexts.get(item.context) || []), item.id]);
      const text = (item.sentence || item.answer || item.left || '').replace(/\{\d+\}/g, '___');
      const opening = text.split(' ').slice(0, 2).join(' ').toLowerCase();
      openings.set(opening, [...(openings.get(opening) || []), item.id]);
    }
    for (const [context, ids] of contexts)
      if (ids.length > 1) note(type, `context "${context}" used ${ids.length} times (${ids.join(', ')})`);
    for (const [opening, ids] of openings)
      if (ids.length > 3) note(type, `${ids.length} items start "${opening}..." (${ids.join(', ')})`);
  }

  console.log(`\n=== ${topic.id}: ${topic.title} ===`);
  console.log(`checked ${count} items across ${Object.keys(topic.items).length} activity types`);
  console.log(`right/wrong balance: ${ok} correct, ${rightwrong.length - ok} incorrect`);
  console.log(problems.length ? `\n${problems.length} problem(s):\n- ` + problems.join('\n- ') : 'no problems found');
  if (notes.length) console.log(`\nvariety notes:\n- ` + notes.join('\n- '));
  return problems.length;
}
