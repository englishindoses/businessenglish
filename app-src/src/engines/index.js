import gapfill from './gapfill.js';
import rightwrong from './rightwrong.js';
import matching from './matching.js';
import wordorder from './wordorder.js';

export const engines = { gapfill, rightwrong, matching, wordorder };

export function getEngine(type) {
  return engines[type] || null;
}
