/**
 * Press-and-hold dragging for word and meaning chips.
 *
 * On a phone, a quick swipe across a chip still scrolls the page; holding a chip
 * still for a moment picks it up, and it follows the finger until it is let go.
 * With a mouse, dragging starts as soon as the pointer moves. Tapping is left
 * alone, so the tap-to-place behaviour keeps working alongside this.
 *
 * The engine decides what a drop means: `over(x, y)` is called as the chip moves
 * so it can highlight where it would land, `drop(x, y)` when it is let go, and
 * `end()` always, for tidying up.
 */

const HOLD_MS = 250;
const HOLD_WOBBLE = 8; // px a finger may drift during the hold before it counts as a scroll
const MOUSE_START = 5; // px a mouse must move before a drag starts
const EDGE = 60; // px from the top or bottom of the screen where the page scrolls itself
const CLICK_GRACE_MS = 400;

let current = null;
let justDropped = null;
let listening = false;

function listenOnce() {
  if (listening) return;
  listening = true;

  // Phones only let a page stop scrolling if a non-passive touchmove listener was
  // already in place when the touch began, so this is added up front, once.
  document.addEventListener(
    'touchmove',
    (event) => {
      if (current?.active) event.preventDefault();
    },
    { passive: false }
  );

  // A long press would otherwise open the browser's own menu.
  document.addEventListener('contextmenu', (event) => {
    if (current) event.preventDefault();
  });

  // Letting go of a dragged chip can fire a click on it, which would run the tap
  // behaviour and undo the drop. Only that chip's click is swallowed, so a real
  // tap on anything straight afterwards still counts.
  document.addEventListener(
    'click',
    (event) => {
      if (!justDropped) return;
      const stray = Date.now() < justDropped.until && justDropped.node.contains(event.target);
      justDropped = null;
      if (stray) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );
}

export function makeDraggable(node, handlers) {
  listenOnce();

  node.addEventListener('pointerdown', (event) => {
    if (current) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    justDropped = null;

    current = {
      node,
      handlers,
      pointerId: event.pointerId,
      touch: event.pointerType !== 'mouse',
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      active: false,
      moved: false,
      timer: null,
      frame: null,
      ghost: null,
    };

    if (current.touch) current.timer = setTimeout(begin, HOLD_MS);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  });
}

function begin() {
  const d = current;
  if (!d || d.active) return;
  d.active = true;
  d.activeX = d.x;
  d.activeY = d.y;

  const rect = d.node.getBoundingClientRect();
  d.offsetX = d.startX - rect.left;
  d.offsetY = d.startY - rect.top;

  const ghost = d.node.cloneNode(true);
  ghost.classList.remove('is-selected');
  ghost.classList.add('drag-ghost');
  ghost.removeAttribute('id');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.width = `${rect.width}px`;
  document.body.append(ghost);
  d.ghost = ghost;

  d.node.classList.add('is-drag-source');
  document.documentElement.classList.add('is-dragging');

  if (d.touch) {
    try {
      navigator.vibrate?.(12);
    } catch {
      // Not every phone allows it; the lift is visible anyway.
    }
  }

  d.handlers.start?.();
  follow();
  d.frame = requestAnimationFrame(autoScroll);
}

function follow() {
  const d = current;
  d.ghost.style.left = `${d.x - d.offsetX}px`;
  d.ghost.style.top = `${d.y - d.offsetY}px`;
  d.handlers.over?.(d.x, d.y);
}

function onMove(event) {
  const d = current;
  if (!d || event.pointerId !== d.pointerId) return;
  d.x = event.clientX;
  d.y = event.clientY;

  if (!d.active) {
    const distance = Math.hypot(d.x - d.startX, d.y - d.startY);
    if (d.touch && distance > HOLD_WOBBLE) finish(); // it's a scroll, not a hold
    else if (!d.touch && distance > MOUSE_START) begin();
    return;
  }

  if (!d.moved && Math.hypot(d.x - d.activeX, d.y - d.activeY) > 10) d.moved = true;
  follow();
}

function onUp(event) {
  const d = current;
  if (!d || event.pointerId !== d.pointerId) return;
  if (d.active) {
    d.handlers.drop?.(d.x, d.y);
    justDropped = { node: d.node, until: Date.now() + CLICK_GRACE_MS };
  }
  finish();
}

function onCancel(event) {
  const d = current;
  if (!d || event.pointerId !== d.pointerId) return;
  finish();
}

/** Scroll the page while a chip is held near the top or bottom of the screen. */
function autoScroll() {
  const d = current;
  if (!d?.active) return;

  // Only once the chip has actually been moved, so picking up a chip that
  // happens to sit near the edge doesn't set the page moving.
  if (d.moved) {
    const top = (document.querySelector('.topbar')?.getBoundingClientRect().bottom || 0) + EDGE;
    const bottom = window.innerHeight - EDGE;
    let step = 0;
    if (d.y < top) step = -Math.min(18, Math.ceil((top - d.y) / 3));
    else if (d.y > bottom) step = Math.min(18, Math.ceil((d.y - bottom) / 3));

    if (step) {
      const before = window.scrollY;
      window.scrollBy(0, step);
      if (window.scrollY !== before) d.handlers.over?.(d.x, d.y);
    }
  }

  d.frame = requestAnimationFrame(autoScroll);
}

function finish() {
  const d = current;
  if (!d) return;
  current = null;

  clearTimeout(d.timer);
  if (d.frame) cancelAnimationFrame(d.frame);
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointercancel', onCancel);

  if (d.active) {
    d.ghost?.remove();
    d.node.classList.remove('is-drag-source');
    document.documentElement.classList.remove('is-dragging');
    d.handlers.end?.();
  }
}

/** True if the point sits inside the element's box, allowing a little slack for a thumb. */
export function isOver(element, x, y, slack = 0) {
  const r = element.getBoundingClientRect();
  return x >= r.left - slack && x <= r.right + slack && y >= r.top - slack && y <= r.bottom + slack;
}
