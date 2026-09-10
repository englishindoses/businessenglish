/**
 * Matching: connect each phrase to what it does.
 *
 * All four pairs of a round share one set of meanings, so this engine builds the
 * whole round at once rather than one card per question.
 *
 * Two ways to place a meaning:
 * - Hold it and drag it onto a phrase. Dropping onto a filled phrase swaps the
 *   two; dropping back on the list of meanings takes it out again.
 * - Tap, in either order: tap a meaning then a phrase, or a phrase then a
 *   meaning. Tapping a placed meaning sends it back.
 */
import { el } from '../lib/dom.js';
import { shuffle } from '../lib/pool.js';
import { makeDraggable, isOver } from '../lib/drag.js';

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
      const existing = slot.querySelector('.mt-chip');
      if (existing === chip) return;
      if (existing) {
        // Came from another phrase? Swap them. Otherwise send the old one back.
        const from = chip.parentElement;
        if (from.classList.contains('mt-slot')) from.append(existing);
        else bank.append(existing);
      }
      slot.append(chip);
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

    // --- dragging ------------------------------------------------------------

    let dropTarget = null;

    function targetAt(x, y) {
      // The whole row counts, not just the dashed box, so a thumb needn't be exact.
      const row = rows.find((r) => isOver(r.row, x, y));
      if (row) return row.slot;
      if (isOver(bank, x, y, 12)) return bank;
      return null;
    }

    function showTarget(target) {
      if (target === dropTarget) return;
      dropTarget?.classList.remove('is-drop-target');
      dropTarget = target;
      dropTarget?.classList.add('is-drop-target');
    }

    function dragHandlers(chip) {
      return {
        start: clearSelection,
        over: (x, y) => showTarget(targetAt(x, y)),
        drop(x, y) {
          const target = targetAt(x, y);
          if (!target) return;
          if (target === bank) {
            if (chip.parentElement !== bank) {
              bank.append(chip);
              refresh();
            }
          } else {
            place(chip, target);
          }
        },
        end: () => showTarget(null),
      };
    }

    // --- building ------------------------------------------------------------

    function makeChip(item) {
      const chip = el('button', {
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
      makeDraggable(chip, dragHandlers(chip));
      return chip;
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
      }, [el('span', { class: 'mt-slot-hint', text: 'Drop a meaning here' })]);

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
      el('p', {
        class: 'mt-instruction',
        text: 'Hold a meaning and drag it to the phrase it belongs to. You can also tap a meaning, then tap the phrase.',
      }),
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
