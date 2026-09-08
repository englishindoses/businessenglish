/**
 * Builds a proofreading page for a topic's question bank.
 *
 * Reads the real data file, so the page can never drift from what the app
 * actually asks students.
 *
 *   node tools/make-review-page.js > ../review-lesson1.html
 */
import topic from '../src/data/lesson1.js';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const bold = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

const clue = (item) =>
  item.clue ? `<p class="clue"><span class="clue-label">Clue shown</span>${esc(item.clue)}</p>` : '';

const eyebrow = (item) => (item.context ? `<p class="context">${esc(item.context)}</p>` : '');

const idTag = (item) => `<span class="id">${esc(item.id.replace('l1-', ''))}</span>`;

/* ---------- one renderer per question type ---------- */

function gapfill(item) {
  const filled = item.sentence.replace(/\{(\d+)\}/g, (_, n) => {
    const gap = item.gaps[n];
    return `<mark class="answer">${esc(gap.answer)}</mark>`;
  });

  const rejected = Object.values(item.gaps)
    .flatMap((g) => g.options.filter((o) => o !== g.answer))
    .map((o) => `<span class="option">${esc(o)}</span>`)
    .join('');

  return `
    <article class="item">
      <header class="item-head">${idTag(item)}${eyebrow(item)}</header>
      <p class="sentence">${filled}</p>
      <p class="options"><span class="options-label">Also offered</span>${rejected}</p>
      ${clue(item)}
    </article>`;
}

function rightwrong(item) {
  const verdict = item.correct
    ? '<span class="verdict is-ok">Correct as written</span>'
    : '<span class="verdict is-error">Contains an error</span>';

  const fix = item.fix ? `<p class="fix"><span class="fix-label">Correction</span>${bold(item.fix)}</p>` : '';

  return `
    <article class="item">
      <header class="item-head">${idTag(item)}${verdict}</header>
      <p class="sentence">${esc(item.sentence)}</p>
      ${fix}
      ${clue(item)}
    </article>`;
}

function matching(item) {
  return `
    <article class="item">
      <header class="item-head">${idTag(item)}</header>
      <div class="pair">
        <p class="pair-left">${esc(item.left)}</p>
        <p class="pair-right">${esc(item.right)}</p>
      </div>
      ${clue(item)}
    </article>`;
}

function wordorder(item) {
  return `
    <article class="item">
      <header class="item-head">${idTag(item)}${eyebrow(item)}</header>
      <p class="sentence">${esc(item.answer)}</p>
      ${clue(item)}
    </article>`;
}

const SECTIONS = [
  {
    key: 'gapfill',
    name: 'Gap-fill',
    note: 'The student picks the highlighted word from a dropdown.',
    render: gapfill,
  },
  {
    key: 'rightwrong',
    name: 'Right or Wrong',
    note: 'The student decides whether the sentence is correct.',
    render: rightwrong,
  },
  {
    key: 'matching',
    name: 'Matching',
    note: 'The student connects each phrase to its meaning.',
    render: matching,
  },
  {
    key: 'wordorder',
    name: 'Word Order',
    note: 'The student rebuilds this sentence from shuffled words.',
    render: wordorder,
  },
];

const total = Object.values(topic.items).reduce((n, list) => n + list.length, 0);

const nav = SECTIONS.map(
  (s) => `<a href="#${s.key}">${s.name}<span class="nav-count">${topic.items[s.key].length}</span></a>`
).join('');

const sections = SECTIONS.map(
  (s) => `
  <section class="section" id="${s.key}">
    <header class="section-head">
      <h2>${s.name}</h2>
      <p class="section-note">${s.note}</p>
    </header>
    <div class="items">${topic.items[s.key].map(s.render).join('')}</div>
  </section>`
).join('');

process.stdout.write(`<title>First Impressions Question Bank</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet">
<style>
  :root {
    --teal: #2d6a6a;
    --teal-bright: #3d8a8a;
    --teal-pale: #e8f4f4;
    --coral: #c1512f;
    --coral-pale: #fdf0ec;
    --ok: #066841;
    --ok-pale: #e8f5ef;
    --err: #b23a3a;
    --err-pale: #fbeaea;
    --ink: #22333f;
    --ink-soft: #5a6c7d;
    --ink-faint: #8a9aa8;
    --ground: #f7f9f9;
    --surface: #ffffff;
    --rule: #dde7e7;
    --shadow: 0 1px 2px rgba(20, 50, 50, 0.05);
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --teal: #7fc4c4;
      --teal-bright: #9ad6d6;
      --teal-pale: #16302f;
      --coral: #f0987a;
      --coral-pale: #33201a;
      --ok: #6fd3a4;
      --ok-pale: #123027;
      --err: #f08b8b;
      --err-pale: #331d1d;
      --ink: #e4eeed;
      --ink-soft: #a8bcbb;
      --ink-faint: #7b908f;
      --ground: #101b1b;
      --surface: #172525;
      --rule: #263a39;
      --shadow: none;
    }
  }

  :root[data-theme="dark"] {
    --teal: #7fc4c4;
    --teal-bright: #9ad6d6;
    --teal-pale: #16302f;
    --coral: #f0987a;
    --coral-pale: #33201a;
    --ok: #6fd3a4;
    --ok-pale: #123027;
    --err: #f08b8b;
    --err-pale: #331d1d;
    --ink: #e4eeed;
    --ink-soft: #a8bcbb;
    --ink-faint: #7b908f;
    --ground: #101b1b;
    --surface: #172525;
    --rule: #263a39;
    --shadow: none;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 17px;
    line-height: 1.6;
    -webkit-text-size-adjust: 100%;
  }

  .wrap { max-width: 40rem; margin: 0 auto; padding: 0 1.1rem 4rem; }

  /* ---- masthead ---- */
  .masthead { padding: 2.5rem 0 1.5rem; border-bottom: 2px solid var(--teal); }
  .kicker {
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.11em;
    text-transform: uppercase; color: var(--coral); margin: 0 0 0.6rem;
  }
  h1 {
    font-family: 'Fraunces', Georgia, serif; font-weight: 700;
    font-size: clamp(1.9rem, 7vw, 2.6rem); line-height: 1.1;
    margin: 0 0 0.5rem; text-wrap: balance; color: var(--ink);
  }
  .standfirst { margin: 0; color: var(--ink-soft); font-size: 1rem; }
  .tally {
    margin: 1.2rem 0 0; display: flex; flex-wrap: wrap; gap: 0.4rem 1.4rem;
    font-size: 0.83rem; color: var(--ink-soft);
  }
  .tally b { color: var(--ink); font-variant-numeric: tabular-nums; }

  /* ---- jump links ---- */
  nav {
    position: sticky; top: 0; z-index: 5;
    display: flex; gap: 0.4rem; overflow-x: auto;
    padding: 0.6rem 0; margin-bottom: 1.5rem;
    background: var(--ground); border-bottom: 1px solid var(--rule);
  }
  nav a {
    flex: 0 0 auto; display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.75rem; border: 1px solid var(--rule); border-radius: 999px;
    background: var(--surface); color: var(--ink-soft);
    font-size: 0.82rem; font-weight: 600; text-decoration: none;
  }
  nav a:hover, nav a:focus-visible { border-color: var(--teal); color: var(--teal); }
  .nav-count {
    font-size: 0.72rem; color: var(--ink-faint); font-variant-numeric: tabular-nums;
  }

  /* ---- sections ---- */
  .section { margin-bottom: 3rem; scroll-margin-top: 4rem; }
  .section-head { margin-bottom: 1.1rem; }
  .section-head h2 {
    font-family: 'Fraunces', Georgia, serif; font-weight: 600;
    font-size: 1.45rem; margin: 0; color: var(--teal);
  }
  .section-note { margin: 0.15rem 0 0; font-size: 0.86rem; color: var(--ink-soft); }

  .items { display: flex; flex-direction: column; gap: 0.9rem; }

  /* ---- items ---- */
  .item {
    background: var(--surface);
    border: 1px solid var(--rule);
    border-radius: 10px;
    padding: 0.9rem 1rem 1rem;
    box-shadow: var(--shadow);
  }
  .item-head {
    display: flex; align-items: baseline; gap: 0.6rem;
    flex-wrap: wrap; margin-bottom: 0.5rem;
  }
  .id {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.02em;
    color: var(--ink-faint); flex: 0 0 auto;
  }
  .context {
    margin: 0; font-size: 0.76rem; font-weight: 600;
    letter-spacing: 0.02em; color: var(--ink-soft);
  }

  .sentence { margin: 0; font-size: 1.02rem; line-height: 1.65; }

  mark.answer {
    background: var(--teal-pale); color: var(--teal);
    padding: 0.05em 0.35em; border-radius: 5px;
    font-weight: 600; box-decoration-break: clone;
  }

  .options {
    margin: 0.7rem 0 0; display: flex; flex-wrap: wrap;
    align-items: baseline; gap: 0.35rem;
  }
  .options-label {
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--ink-faint); margin-right: 0.15rem;
  }
  .option {
    font-size: 0.83rem; color: var(--ink-soft);
    border: 1px dashed var(--rule); border-radius: 5px;
    padding: 0.05em 0.4em;
  }

  .verdict {
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em;
    padding: 0.15em 0.55em; border-radius: 999px;
  }
  .verdict.is-ok { background: var(--ok-pale); color: var(--ok); }
  .verdict.is-error { background: var(--err-pale); color: var(--err); }

  .fix {
    margin: 0.7rem 0 0; padding: 0.5rem 0.7rem;
    background: var(--ok-pale); border-radius: 6px;
    font-size: 0.94rem; color: var(--ok);
  }
  .fix strong { font-weight: 700; }
  .fix-label, .clue-label {
    display: block; font-size: 0.68rem; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase;
    opacity: 0.75; margin-bottom: 0.15rem;
  }

  .pair { display: grid; gap: 0.4rem; }
  .pair-left { margin: 0; font-weight: 600; font-size: 1rem; }
  .pair-right {
    margin: 0; font-size: 0.95rem; color: var(--ink-soft);
    padding-left: 0.9rem; border-left: 2px solid var(--coral);
  }

  .clue {
    margin: 0.7rem 0 0; padding-top: 0.6rem;
    border-top: 1px dotted var(--rule);
    font-size: 0.86rem; color: var(--ink-soft);
  }

  footer {
    margin-top: 3rem; padding-top: 1.2rem; border-top: 1px solid var(--rule);
    font-size: 0.85rem; color: var(--ink-soft);
  }
  footer code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.85em; background: var(--teal-pale); color: var(--teal);
    padding: 0.1em 0.35em; border-radius: 4px;
  }

  @media (min-width: 34rem) {
    .pair { grid-template-columns: 1fr 1fr; align-items: start; gap: 0.9rem; }
    .pair-right { padding-left: 0.9rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    * { scroll-behavior: auto !important; }
  }
</style>

<div class="wrap">
  <header class="masthead">
    <p class="kicker">Lesson ${topic.order} &middot; for proofreading</p>
    <h1>${esc(topic.title)}</h1>
    <p class="standfirst">${esc(topic.subtitle)}. Every question written for the practice app, with the answer marked and the clue the student sees when they get it wrong.</p>
    <p class="tally">
      <span><b>${total}</b> questions</span>
      <span><b>${SECTIONS.length}</b> activity types</span>
      <span><b>24</b> in each set</span>
    </p>
  </header>

  <nav aria-label="Jump to activity">${nav}</nav>

  ${sections}

  <footer>
    <p>Each question has a short code such as <code>gf-07</code> or <code>rw-15</code>. Quote those when you want something changed and I will know exactly which one you mean.</p>
  </footer>
</div>
`);
