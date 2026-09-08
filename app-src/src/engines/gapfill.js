/**
 * Gap-fill: a sentence with one or two gaps, each filled from a dropdown.
 *
 * Native <select> on purpose — phones give it a proper full-screen picker,
 * which beats anything custom for one-handed use.
 */
import { el } from '../lib/dom.js';
import { shuffle } from '../lib/pool.js';

export default {
  id: 'gapfill',
  mode: 'per-item',

  label(item) {
    return item.sentence.replace(/\{(\d+)\}/g, (_, n) => `___(${item.gaps[n].answer})`);
  },

  createQuestion(item) {
    const selects = new Map();
    const line = el('p', { class: 'gf-sentence' });

    // Split the sentence on the {1} markers, keeping the markers.
    const parts = item.sentence.split(/(\{\d+\})/g);
    for (const part of parts) {
      const marker = part.match(/^\{(\d+)\}$/);
      if (!marker) {
        if (part) line.append(document.createTextNode(part));
        continue;
      }
      const key = marker[1];
      const gap = item.gaps[key];
      const select = el('select', {
        class: 'gf-select',
        'aria-label': `Gap ${key}`,
      });
      select.append(el('option', { value: '', text: 'choose…' }));
      for (const option of shuffle(gap.options)) {
        select.append(el('option', { value: option, text: option }));
      }
      selects.set(key, select);
      line.append(select);
    }

    const node = el('div', { class: 'question-body' }, [
      item.context ? el('p', { class: 'question-context', text: item.context }) : null,
      line,
    ]);

    return {
      node,
      isAnswered: () => [...selects.values()].every((s) => s.value !== ''),
      check() {
        let allRight = true;
        for (const [key, select] of selects) {
          const right = select.value === item.gaps[key].answer;
          select.classList.toggle('is-right', right);
          select.classList.toggle('is-wrong', !right);
          if (!right) allRight = false;
        }
        return allRight;
      },
      onEdit(handler) {
        for (const select of selects.values()) {
          select.addEventListener('change', () => {
            select.classList.remove('is-right', 'is-wrong');
            handler();
          });
        }
      },
    };
  },
};
