/**
 * Right or Wrong: decide whether a sentence is correct.
 * When it isn't, the corrected version appears with the clue.
 */
import { el, markup } from '../lib/dom.js';

export default {
  id: 'rightwrong',
  mode: 'per-item',

  label(item) {
    return item.sentence;
  },

  createQuestion(item) {
    let choice = null;
    let onEditHandler = null;

    const buttons = [];
    const make = (value, glyph, text) =>
      el('button', {
        type: 'button',
        class: 'rw-btn',
        'aria-pressed': 'false',
        dataset: { value: String(value) },
        onClick() {
          choice = value;
          for (const b of buttons) {
            const active = b === this;
            b.classList.toggle('is-selected', active);
            b.classList.remove('is-right', 'is-wrong');
            b.setAttribute('aria-pressed', active ? 'true' : 'false');
          }
          if (onEditHandler) onEditHandler();
        },
      }, [el('span', { class: 'rw-glyph', text: glyph }), el('span', { text })]);

    const yes = make(true, '✓', 'Correct');
    const no = make(false, '✗', 'Not correct');
    buttons.push(yes, no);

    const correction = el('p', { class: 'rw-correction', hidden: true });

    const node = el('div', { class: 'question-body' }, [
      el('p', { class: 'rw-sentence', text: item.sentence }),
      el('div', { class: 'rw-buttons' }, [yes, no]),
      correction,
    ]);

    return {
      node,
      isAnswered: () => choice !== null,
      check() {
        const right = choice === item.correct;
        const picked = buttons.find((b) => b.dataset.value === String(choice));
        if (picked) picked.classList.toggle('is-right', right);
        if (picked) picked.classList.toggle('is-wrong', !right);

        if (right && !item.correct && item.fix) {
          correction.innerHTML = markup(item.fix);
          correction.hidden = false;
        } else if (right) {
          correction.hidden = true;
        }
        return right;
      },
      reveal() {
        if (!item.correct && item.fix) {
          correction.innerHTML = markup(item.fix);
          correction.hidden = false;
        }
      },
      onEdit(handler) {
        onEditHandler = handler;
      },
    };
  },
};
