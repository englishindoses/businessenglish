/**
 * Matching: connect each phrase to what it does.
 *
 * All four pairs of a round share one set of meanings, so this engine builds the
 * whole round at once rather than one card per question.
 *
 * Interaction is tap-to-place, and it works in either order: tap a meaning then
 * a slot, or tap a slot then a meaning. Tapping a filled slot sends it back.
 */
import { el } from '../lib/dom.js';
import { shuffle } from '../lib/pool.js';

export default {
  id: 'matching',
  mode: 'per-round',

  label(item) {
    return `${item.left} → ${item.right}`;
  },

  createRound(items) {
    let selectedChip = null;
    let selectedSlot = null;
    let onEditHandler = null;

    const bank = el('div', { class: 'mt-bank', 'aria-label': 'Meanings' });
    const rows = [];
    const feedbackNodes = [];

    function clearSelection() {
      if (selectedChip) selectedChip.classList.remove('is-selected');
      if (selectedSlot) selectedSlot.classList.remove('is-selected');
      selectedChip = null;
      selectedSlot = null;
    }

    function place(chip, slot) {
      // If the slot already holds something, send it back to the bank.
      const existing = slot.querySelector('.mt-chip');
      if (existing) bank.append(existing);
      slot.append(chip);
      slot.classList.remove('is-empty');
      clearSelection();
      refresh();
    }

    function refresh() {
      for (const { slot } of rows) {
        slot.classList.toggle('is-empty', !slot.querySelector('.mt-chip'));
        slot.classList.remove('is-right', 'is-wrong', 'needs-answer');
      }
      if (onEditHandler) onEditHandler();
    }

    function makeChip(item) {
      return el('button', {
        type: 'button',
        class: 'mt-chip',
        text: item.right,
        dataset: { id: item.id },
        onClick() {
          if (this.parentElement !== bank) {
            // It's sitting in a slot — take it back out.
            bank.append(this);
            clearSelection();
            refresh();
            return;
          }
          if (selectedSlot) {
            place(this, selectedSlot);
            return;
          }
          const wasSelected = selectedChip === this;
          clearSelection();
          if (!wasSelected) {
            selectedChip = this;
            this.classList.add('is-selected');
          }
        },
      });
    }

    for (const item of items) {
      const slot = el('div', {
        class: 'mt-slot is-empty',
        role: 'button',
        tabindex: '0',
        'aria-label': `Meaning for: ${item.left}`,
        onClick() {
          if (selectedChip) {
            place(selectedChip, this);
            return;
          }
          const wasSelected = selectedSlot === this;
          clearSelection();
          if (!wasSelected) {
            selectedSlot = this;
            this.classList.add('is-selected');
          }
        },
        onKeydown(event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.click();
          }
        },
      }, [el('span', { class: 'mt-slot-hint', text: 'tap a meaning' })]);

      const feedback = el('div', { class: 'mt-feedback' });
      feedbackNodes.push(feedback);

      const row = el('div', { class: 'mt-row' }, [
        el('p', { class: 'mt-left', text: item.left }),
        slot,
        feedback,
      ]);

      rows.push({ item, slot, row });
    }

    for (const chip of shuffle(items.map(makeChip))) bank.append(chip);

    const node = el('div', { class: 'mt-widget' }, [
      el('p', { class: 'mt-instruction', text: 'Tap a meaning, then tap the phrase it belongs to.' }),
      el('div', { class: 'mt-rows' }, rows.map((r) => r.row)),
      el('p', { class: 'mt-bank-label', text: 'Meanings' }),
      bank,
    ]);

    return {
      node,
      feedbackNodes,
      isAnswered: () => rows.every(({ slot }) => slot.querySelector('.mt-chip')),
      blankCount: () => rows.filter(({ slot }) => !slot.querySelector('.mt-chip')).length,
      highlightBlanks() {
        let first = null;
        for (const { slot } of rows) {
          const empty = !slot.querySelector('.mt-chip');
          slot.classList.toggle('needs-answer', empty);
          if (empty && !first) first = slot;
        }
        first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      },
      check() {
        return rows.map(({ item, slot }) => {
          const chip = slot.querySelector('.mt-chip');
          const right = Boolean(chip) && chip.dataset.id === item.id;
          slot.classList.toggle('is-right', right);
          slot.classList.toggle('is-wrong', !right);
          return right;
        });
      },
      onEdit(handler) {
        onEditHandler = handler;
      },
    };
  },
};
