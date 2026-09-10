/**
 * Prints every piece of text a student sees as correct English in one topic,
 * numbered by question code, so it can be proofread for grammar in one go.
 *   node tools/grammar-text.js lesson2
 *
 * Deliberately wrong material is left out: gap-fill distractors, and the
 * sentences in Right or Wrong that are marked incorrect (their corrections are
 * included instead).
 */
import { getTopic } from '../src/data/topics.js';

const topic = getTopic(process.argv[2]);
if (!topic?.items) {
  console.error(`No written topic called "${process.argv[2]}"`);
  process.exit(1);
}

const code = (item) => item.id.replace(/^[^-]+-/, '');
const plain = (s) => s.replace(/\*\*/g, '');
const lines = [];
const add = (item, label, text) => lines.push(`${code(item)} ${label}: ${text}`);

const { gapfill, rightwrong, matching, wordorder } = topic.items;

for (const item of gapfill) {
  add(item, 'context', item.context);
  add(item, 'sentence', item.sentence.replace(/\{(\d+)\}/g, (_, n) => item.gaps[n].answer));
  add(item, 'clue', item.clue);
}
for (const item of rightwrong) {
  add(item, 'sentence', item.correct ? item.sentence : plain(item.fix));
  add(item, 'clue', item.clue);
}
for (const item of matching) {
  add(item, 'phrase', item.left);
  add(item, 'meaning', item.right);
  add(item, 'clue', item.clue);
}
for (const item of wordorder) {
  add(item, 'context', item.context);
  add(item, 'sentence', item.answer);
  for (const alt of item.alternatives || []) add(item, 'also accepted', alt);
  add(item, 'clue', item.clue);
}

console.log(lines.join('\n'));
