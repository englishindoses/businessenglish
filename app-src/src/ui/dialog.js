/**
 * A small confirm dialog.
 *
 * Built on the native <dialog> element, so focus trapping, Escape to close and
 * returning focus to whatever opened it all come for free.
 */
import { el } from '../lib/dom.js';

/**
 * @returns {Promise<boolean>} true if the student chose the confirm action
 */
export function confirmDialog({ title, message, confirmLabel, cancelLabel }) {
  return new Promise((resolve) => {
    const titleId = 'dlg-title';

    const cancelBtn = el('button', {
      type: 'button',
      class: 'btn btn-primary',
      text: cancelLabel,
    });
    const confirmBtn = el('button', {
      type: 'button',
      class: 'btn btn-quiet',
      text: confirmLabel,
    });

    const dialog = el('dialog', { class: 'dialog', 'aria-labelledby': titleId }, [
      el('h2', { class: 'dialog-title', id: titleId, text: title }),
      message ? el('p', { class: 'dialog-message', text: message }) : null,
      el('div', { class: 'dialog-actions' }, [cancelBtn, confirmBtn]),
    ]);

    let answer = false;

    const close = (value) => {
      answer = value;
      dialog.close();
    };

    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));

    // Covers Escape and any other route to closing.
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(answer);
    });

    // Clicking the backdrop behaves like cancelling.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) close(false);
    });

    document.body.append(dialog);
    dialog.showModal();
    cancelBtn.focus();
  });
}

/**
 * A dialog with two or more choices, each given as { label, value, primary }.
 * @returns {Promise<*>} the chosen value, or null if it was dismissed
 */
export function choiceDialog({ title, message, choices }) {
  return new Promise((resolve) => {
    const titleId = 'dlg-choice-title';
    let answer = null;

    const buttons = choices.map((choice) =>
      el('button', {
        type: 'button',
        class: choice.primary ? 'btn btn-primary' : 'btn',
        text: choice.label,
        onClick: () => {
          answer = choice.value;
          dialog.close();
        },
      })
    );

    const dialog = el('dialog', { class: 'dialog', 'aria-labelledby': titleId }, [
      el('h2', { class: 'dialog-title', id: titleId, text: title }),
      message ? el('p', { class: 'dialog-message', text: message }) : null,
      el('div', { class: 'dialog-actions dialog-actions-stacked' }, buttons),
    ]);

    // A real choice is needed, so Escape doesn't dismiss it.
    dialog.addEventListener('cancel', (event) => event.preventDefault());
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(answer);
    });

    document.body.append(dialog);
    dialog.showModal();
    buttons[0].focus();
  });
}
