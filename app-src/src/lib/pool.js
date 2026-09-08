/**
 * Drawing questions from a topic's pool.
 *
 * Rule: every item in the pool gets used before any item repeats. Once the pool
 * is exhausted it starts again, avoiding the items that were just seen where it
 * can, so a fresh cycle doesn't open with the same questions it closed on.
 */
import { getBankProgress, saveBankProgress } from './storage.js';

export function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * @returns {{ items: object[], cycled: boolean }}
 *   `cycled` is true when the pool ran out and started again during this draw.
 */
export function drawItems(topic, type, count) {
  const pool = topic.items[type] || [];
  if (pool.length === 0) return { items: [], cycled: false };

  const progress = getBankProgress(topic.id, type);
  const used = new Set(progress.used || []);

  let unseen = pool.filter((item) => !used.has(item.id));
  let cycled = false;

  if (unseen.length < count) {
    // Take what's left, then start a new cycle for the remainder.
    const remainder = shuffle(unseen);
    const needed = count - remainder.length;
    const justSeen = new Set(remainder.map((i) => i.id));

    // Prefer items the student hasn't seen most recently.
    const recycled = shuffle(pool.filter((i) => !justSeen.has(i.id))).slice(0, needed);

    cycled = true;
    const items = shuffle([...remainder, ...recycled]).slice(0, count);
    saveBankProgress(topic.id, type, { used: items.map((i) => i.id) });
    return { items, cycled };
  }

  const items = shuffle(unseen).slice(0, count);
  saveBankProgress(topic.id, type, { used: [...used, ...items.map((i) => i.id)] });
  return { items, cycled };
}

/** How far through the pool the student is, for the activity screen. */
export function poolStatus(topic, type) {
  const pool = topic.items?.[type] || [];
  const { used } = getBankProgress(topic.id, type);
  const seen = (used || []).filter((id) => pool.some((i) => i.id === id)).length;
  return { seen, total: pool.length };
}
