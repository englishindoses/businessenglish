/**
 * Word Order: rebuild a sentence from shuffled words.
 *
 * Tap a word to add it, tap it again in the line to take it back. No dragging —
 * dragging on a phone is fiddly and easy to get wrong with one thumb.
 */
import { el } from '../lib/dom.js';
import { shuffle } from '../lib/pool.js';

const normalise = (s) => s.replace(/\s+/g, ' ').trim();

export default {
  id: 'wordorder',
  mode: 'per-item',

  label(item) {
    return item.answer;
  },

  createQuestion(item) {
    const words = item.answer.split(' ');
    const accepted = [item.answer, ...(item.alternatives || [])].map(normalise);

    const line = el('div', {
      class: 'wo-line',
      role: 'list',
      'aria-label': 'Your sentence',
    });
    const bank = el('div', { class: 'wo-bank', role: 'list', 'aria-label': 'Available words' });

    let onEditHandler = null;
    const placeholder = el('span', { class: 'wo-placeholder', text: 'Tap the words below' });
    line.append(placeholder);

    function refresh() {
      placeholder.hidden = line.querySelectorAll('.wo-word').length > 0;
      line.classList.remove('is-right', 'is-wrong');
      if (onEditHandler) onEditHandler();
    }

    function makeChip(word) {
      return el('button', {
        type: 'button',
        class: 'wo-word',
        text: word,
        onClick() {
          if (this.parentElement === bank) line.append(this);
          else bank.append(this);
          refresh();
        },
      });
    }

    // Shuffle, but never hand back the sentence already in order.
    let order = shuffle(words);
    if (words.length > 2 && order.join(' ') === item.answer) order = order.reverse();
    for (const word of order) bank.append(makeChip(word));

    const node = el('div', { class: 'question-body' }, [
      item.context ? el('p', { class: 'question-context', text: item.context }) : null,
      line,
      bank,
    ]);

    const current = () =>
      normalise([...line.querySelectorAll('.wo-word')].map((w) => w.textContent).join(' '));

    return {
      node,
      isAnswered: () => line.querySelectorAll('.wo-word').length === words.length,
      check() {
        const right = accepted.includes(current());
        line.classList.toggle('is-right', right);
        line.classList.toggle('is-wrong', !right);
        return right;
      },
      reveal() {
        const answer = el('p', { class: 'wo-answer' }, [
          el('span', { class: 'wo-answer-label', text: 'Correct order: ' }),
          item.answer,
        ]);
        if (!node.querySelector('.wo-answer')) node.append(answer);
      },
      onEdit(handler) {
        onEditHandler = handler;
      },
    };
  },
};
