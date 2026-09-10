/**
 * Word Order: rebuild a sentence from shuffled words.
 *
 * Tap a word to add it to the end of the sentence, and tap it again to take it
 * back. Or hold a word and drag it: into the sentence at an exact spot, to a new
 * place within the sentence, or back down to the other words.
 */
import { el } from '../lib/dom.js';
import { shuffle } from '../lib/pool.js';
import { makeDraggable, isOver } from '../lib/drag.js';

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
    const placeholder = el('span', {
      class: 'wo-placeholder',
      text: 'Tap the words below, or hold one and drag it here',
    });
    line.append(placeholder);

    const lineWords = () => [...line.querySelectorAll('.wo-word')];

    function refresh() {
      placeholder.hidden = lineWords().length > 0;
      line.classList.remove('is-right', 'is-wrong');
      if (onEditHandler) onEditHandler();
    }

    // --- dragging ------------------------------------------------------------

    const caret = el('div', { class: 'drag-caret', 'aria-hidden': 'true', hidden: true });
    let dropTarget = null;

    /**
     * Where in the sentence a word dropped at (x, y) would go. The words wrap
     * onto several lines, so first find the line of words nearest the finger,
     * then the gap within it.
     */
    function insertionPoint(x, y, dragged) {
      const chips = lineWords().filter((c) => c !== dragged);
      if (!chips.length) return { before: null, caret: null };

      const boxes = chips.map((chip) => ({ chip, r: chip.getBoundingClientRect() }));
      const distance = ({ r }) => (y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0);
      const nearest = boxes.reduce((a, b) => (distance(b) < distance(a) ? b : a));
      const row = boxes.filter(({ r }) => Math.abs(r.top - nearest.r.top) < nearest.r.height / 2);

      const next = row.find(({ r }) => x < r.left + r.width / 2);
      if (next) {
        return { before: next.chip, caret: { x: next.r.left - 4, top: next.r.top, height: next.r.height } };
      }
      const last = row[row.length - 1];
      const after = boxes[boxes.indexOf(last) + 1];
      return {
        before: after ? after.chip : null,
        caret: { x: last.r.right + 2, top: last.r.top, height: last.r.height },
      };
    }

    function targetAt(x, y) {
      if (isOver(line, x, y, 16)) return line;
      if (isOver(bank, x, y, 16)) return bank;
      return null;
    }

    function showTarget(target, x, y, dragged) {
      if (target !== dropTarget) {
        dropTarget?.classList.remove('is-drop-target');
        dropTarget = target;
        dropTarget?.classList.add('is-drop-target');
      }

      const spot = target === line ? insertionPoint(x, y, dragged).caret : null;
      caret.hidden = !spot;
      if (spot) {
        caret.style.left = `${spot.x - 1}px`;
        caret.style.top = `${spot.top}px`;
        caret.style.height = `${spot.height}px`;
      }
    }

    function dragHandlers(chip) {
      return {
        start: () => document.body.append(caret),
        over: (x, y) => showTarget(targetAt(x, y), x, y, chip),
        drop(x, y) {
          const target = targetAt(x, y);
          if (!target) return;

          const before = lineWords();
          if (target === line) {
            const { before: next } = insertionPoint(x, y, chip);
            if (next) line.insertBefore(chip, next);
            else line.append(chip);
          } else if (chip.parentElement !== bank) {
            bank.append(chip);
          }

          const after = lineWords();
          const changed = before.length !== after.length || before.some((c, i) => c !== after[i]);
          if (changed) refresh();
        },
        end() {
          showTarget(null);
          caret.remove();
        },
      };
    }

    // --- building ------------------------------------------------------------

    function makeChip(word) {
      const chip = el('button', {
        type: 'button',
        class: 'wo-word',
        text: word,
        onClick() {
          if (this.parentElement === bank) line.append(this);
          else bank.append(this);
          refresh();
        },
      });
      makeDraggable(chip, dragHandlers(chip));
      return chip;
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

    const current = () => normalise(lineWords().map((w) => w.textContent).join(' '));

    return {
      node,
      isAnswered: () => lineWords().length === words.length,
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
