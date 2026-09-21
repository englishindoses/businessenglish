# How BizEng was built

*A build spec, so that another coder — or someone working with an AI — could
reproduce the app without seeing this repository. Written 21 September 2026 and
current as of that date.*

BizEng is a Vite plus plain-JavaScript progressive web app, about 6,000 lines of
code and 900 lines of content per topic, built from four rules: content is data,
activity types are interchangeable engines behind one small interface,
everything that gets saved goes through a single storage file, and the whole
thing is static files a GitHub Pages site can serve.

---

## What the app does

A student opens the app, picks a topic, picks an activity, and answers twelve
questions in three rounds of four. That single flow is the whole product;
everything else supports it.

The rules that give the app its character, all of which a rebuild has to keep:

- **An activity is 12 questions.** Finish them and it shows as completed, with a
  tick and a full bar, and an invitation to start again — which draws 12 the
  student has not seen.
- **It is practice, not a test.** A question counts as right once it checks
  green, however many attempts it took. Wrong answers stay editable and can be
  re-checked forever.
- **The student checks at the end of each round**, not per question. Four
  questions are on screen together.
- **Nothing is ever revealed.** No clues, and no answer after N tries: a
  question they cannot get is one to save and ask their teacher about. Clue text
  is still written and stored with every question, so showing it again is a
  display change, never a content job. The engines keep a `reveal()` method for
  a *Show answer* button planned later, which will not count as a correct
  answer.
- **Checking with blanks opens a dialog** offering *Finish them* or *Check
  anyway*. Blanks checked anyway are marked wrong.
- **Every question has an "Ask my teacher" bookmark.** Bookmarks build a *My
  questions* list the student can show in class or push through the phone's own
  share menu; with no share menu the list is copied to the clipboard instead.
- **Progress is counted in activities completed, not questions met.** The
  student is never shown the size of the question bank.
- **The headline stat is their current score**: of every question they have
  finished an activity with, how many stand correct. A dash until they complete
  their first activity, so nobody opens the app at 0%.
- **Every question in a pool is used before any repeats.**
- **Topics are listed in course order**, and unwritten ones appear greyed as
  *Coming soon*.
- **The review screen** shows right or wrong for all twelve, a link back to the
  matching lesson on the website, and three ways out: try these again, another
  activity, choose a topic.
- **It works offline and installs to a home screen**, because it is a
  progressive web app.

Nothing in the app is timed, and no score is ever presented as a grade.

### Why progress is counted this way

The first version counted distinct questions met, out of a 24-question bank per
activity. A student who answered all 12 questions of an activity — a complete
piece of work, with a score and a results screen — went back and saw a bar at
50%. Two truthful numbers, measuring different things, with nothing on screen to
explain the difference. Counting completed activities removed the contradiction:
what the student finishes is what the bar measures. The bank still exists, and
still guarantees fresh questions; the student is simply never shown it.

---

## Stack, folders and publishing

The stack is deliberately small: **Vite**, **plain JavaScript modules** with no
framework, **vite-plugin-pwa** for offline and install, and **Firebase** (auth
plus Firestore) loaded only when somebody signs in. No TypeScript, no build step
beyond Vite, no CSS framework, no test runner.

The source lives in `app-src/`, and `npm run build` writes the finished app into
a sibling `app/` folder that is committed to the repository, because GitHub
Pages serves straight from the branch. Two commands are the whole workflow:
`npm run dev` to work on it, `npm run build` before committing.

| Folder | What is in it |
| --- | --- |
| `src/data/` | The content. One file per topic, plus `topics.js` which lists them in order and holds the session constants. |
| `src/engines/` | One file per activity type, each exporting the same small interface. |
| `src/screens/` | One function per screen: home, topics, activities, session, review, questions, settings, progress, help, profile, sign-in, students. |
| `src/lib/` | Router, DOM helpers, question pool, drag, install prompt, storage, account, cloud. |
| `src/ui/` | The shell (top bar), dialogs, avatars, progress pieces, greetings, the install card. |
| `src/styles/app.css` | All the styling, one file, sectioned by comment banners. |
| `public/icons/` | The three PNG icons the manifest points at. |
| `tools/` | Node scripts: the content checker, the proofreading page builder, the icon generator. |

Three build details matter. `base` in `vite.config.js` must be the app's public
path (`/<repo>/app/`), or nothing loads on Pages. `outDir` points at `../app`
with `emptyOutDir: true`. The PWA plugin uses `registerType: 'prompt'`, not
`autoUpdate`, so a new version never reloads the page under a student mid-round:
they get a small bar with an *Update* button instead.

GitHub Actions is deliberately not used. Switching Pages to an Actions build
changes how the whole site publishes, so a broken workflow could take the lesson
pages down with it.

---

## The content format

Content is data, never markup: one JavaScript module per topic, each exporting a
topic object with four banks of 24 questions. Nothing in the engines or screens
knows what the questions are about, which is why the same app runs on a
different course by swapping this folder.

```javascript
export default {
  id: 'lesson1',
  order: 1,
  title: 'Making a Strong First Impression',
  subtitle: 'Introductions, describing your role, showing interest',
  icon: '🤝',
  lessons: [{ label: 'Lesson 1', href: '../lesson1.html' }],
  items: { gapfill, rightwrong, matching, wordorder },
};
```

`order` drives the sort, `lessons` becomes the link back to the website from the
review screen, and `items` is the four banks. A topic with no `items` is listed
as *Coming soon*.

The four question shapes, every one carrying a unique `id`, a `context` line of
scene-setting, and a `clue`:

```javascript
// gapfill - {1} marks each gap; one entry in `gaps` per marker
{ id: 'l1-gf-01',
  context: 'Explaining your job to a new colleague',
  sentence: "I'm {1} for the whole recruitment process.",
  gaps: { 1: { options: ['responsible', 'responsibility', 'responsibly'], answer: 'responsible' } },
  clue: 'Adjective or noun here?' }

// rightwrong - `fix` is required when correct is false, with **bold** on the change
{ id: 'l1-rw-01', sentence: 'I am working here since 2019.', correct: false,
  fix: 'I **have been working** here since 2019.', clue: 'How long, from when?' }

// matching - a phrase and the meaning it belongs to
{ id: 'l1-mt-01', left: 'to touch base', right: 'to make brief contact to check progress',
  clue: 'Think of a quick check-in.' }

// wordorder - the full sentence; the app shuffles the words itself
{ id: 'l1-wo-01', context: 'Introducing two colleagues',
  answer: 'Could I introduce you to my colleague Marta?',
  alternatives: [], clue: 'You introduce one person to another.' }
```

Ids are unique across the whole app, not just within a topic, because bookmarks
and progress are stored by id alone. The prefix convention `l1-gf-01` (topic,
type, number) makes that easy to keep true.

`topics.js` imports every topic file, sorts by `order`, and exports the session
constants (`QUESTIONS_PER_ROUND = 4`, `ROUNDS_PER_SESSION = 3`) and the activity
list with each type's name, one-line blurb and icon. It also exports
`availableActivities(topic)`, which hides any activity type with fewer than four
written questions. That function is also the denominator for "x of 4 activities
completed", so a topic with a fifth activity, or with only three written, counts
correctly without any other change.

---

## The engine contract

This is the piece worth copying exactly. Each activity type is one module
exporting an object with an `id`, a `mode`, a `label(item)` used wherever a
question is quoted in plain text, and a factory. The session screen knows
nothing else about it, so a fifth activity type is a new file plus one line in
the engine index.

There are two modes. **`per-item`** engines build one question at a time, which
suits gap-fill, right or wrong and word order. **`per-round`** engines build all
four questions as one widget, which matching needs because the four meanings are
shuffled together.

```javascript
// mode: 'per-item'
createQuestion(item) returns {
  node,                   // the DOM for this question
  isAnswered(),           // false while anything is blank
  check() -> boolean,     // mark it, paint right/wrong, return the outcome
  reveal?(),              // optional: show the answer (not currently called)
  onEdit(handler),        // call handler whenever the student changes something
}

// mode: 'per-round'
createRound(items) returns {
  node, feedbackNodes,    // one feedback slot per item, in order
  isAnswered(), blankCount(), highlightBlanks(),
  check() -> boolean[],   // one outcome per item, in order
  onEdit(handler),
}
```

`onEdit` is what makes re-checking feel right: as soon as the student touches an
answer, the engine clears its own right/wrong paint and tells the session to
drop the feedback for that card.

The four engines, and the interaction decisions inside them:

- **Gap-fill** uses a native `<select>` per gap. Deliberate: a phone gives a
  native select a full-screen picker that beats anything custom for one-handed
  use. Options are shuffled at render.
- **Right or wrong** is two big buttons, *Correct* and *Not correct*. When a
  false sentence is answered correctly, the corrected version appears with the
  changed words in bold.
- **Matching** lays four phrases above a bank of shuffled meanings. A meaning
  can be dragged onto a phrase, or tapped in either order (meaning then phrase,
  or phrase then meaning). Dropping onto a filled phrase swaps the two; tapping
  a placed meaning sends it back to the bank.
- **Word order** shuffles the words of the answer, never handing back the
  sentence already in order. Tap a word to append it, tap it again to take it
  back, or drag it to an exact position with a caret showing where it will land.
  `alternatives` holds any second correct ordering; comparison normalises
  whitespace.

Dragging is shared, in one file. On touch it needs a 250 ms hold before a chip
lifts, with an 8 px wobble allowance, so an ordinary swipe still scrolls the
page; with a mouse it starts after 5 px of movement. A cloned "ghost" follows
the finger, the page auto-scrolls near the top and bottom edges, the browser's
own long-press menu is suppressed, and the stray click that fires after a drop
is swallowed so it cannot undo the drop. Tap-to-place keeps working alongside
all of it, which is what keeps the activities usable with a keyboard and a
screen reader.

---

## Attempts, pool and progress

An **attempt** is the twelve questions in play for one activity: its item ids,
the round index, the results map, and whether it finished. Attempts are stored
**per activity**, so a student can leave gap-fill half done, do some matching,
and come back to find both where they left them. An attempt survives being
finished — that is what makes the activity show as complete — until the student
starts again, which clears it and draws a fresh twelve.

The draw rule is worth stating precisely, because it is what makes a restart
feel fresh. Each bank keeps a `used` list, invisible to the student. A draw
takes only unseen items; when fewer than twelve remain it takes what is left,
starts a new cycle for the remainder, and prefers items that were not in the
leftovers, so a fresh cycle never opens with the questions it just closed on.
Starting an activity again therefore gives twelve questions they have not seen,
until the bank is exhausted and cycles.

Progress per bank:

| Field | Meaning |
| --- | --- |
| `used` | dealt out; resets each cycle, so questions repeat fairly |
| `seen` | actually checked; never resets. Kept, though no screen shows it now |
| `sessions` | how many times this activity has been completed |
| `answered` | how many questions have been checked, all attempts |
| `firstTry` | right on the first check of a round; stored, not shown |
| `correct` / `scored` | the score: of the questions in completed attempts, how many stood right |
| `attempt` | the twelve in play, or the finished twelve |

Checking a round does all of this at once:

1. If anything is blank, show the *Finish them / Check anyway* dialog and stop
   if they choose to finish.
2. Ask the engine to mark; collect one outcome per question.
3. Write results: green is permanent, so `results[id]` is only ever downgraded
   if it has not already been true.
4. Show a feedback line under each card — a tick and "That's right", or a cross
   and the try-again line. Nothing is revealed, however many attempts.
5. On the **first** check of the round only, add to `answered`, `firstTry` and
   `seen`, and record today in the practice-days list.
6. Announce the score to screen readers through a polite live region.

Re-checking after a fix repeats steps 2 to 4 but never step 5's counters, so a
student cannot inflate their totals by checking repeatedly.

Finishing the last round calls one function that counts the completion: it adds
one to `sessions`, adds the attempt's right answers to `correct` and its twelve
to `scored`, and stores the attempt as finished. The percentage on the dashboard
is `correct / scored` across every bank, and is null — shown as a dash — until
the first completion. Counting only completed attempts is what lets the score be
added to an existing app without every current student opening it at 0%.

The review screen prefers the live session in memory and falls back to the last
activity's finished attempt, so results survive a refresh. Practice days are
kept as a list of `YYYY-MM-DD` strings, last 60 only.

---

## Storage, sign-in and sync

One file owns everything that is saved, and every screen goes through it. That
single rule is what made both adding logins and changing how progress is counted
contained jobs rather than rewrites.

Storage always reads and writes the browser's own `localStorage`, so every
screen is instant and works offline. What changes is *whose* storage it is: a
guest's practice sits under plain `bizeng.` keys, a signed-in student's under
`bizeng.u.<uid>.`, and each change to a signed-in student's data also fires a
listener that copies it up. Every read and write is wrapped in try/catch,
because private windows and blocked site data both throw. Settings (text size,
reduced motion) belong to the device, not the person, so they sit outside the
namespace.

What syncs: `progress` (which now carries the attempts inside it), `questions`,
`days`, and `last` — the activity they were on, for the dashboard's resume card.
They are stored as JSON strings in one Firestore document per student, alongside
small plain totals (`answered`, `sessions`, `questionCount`, `lastActive`) so
the teacher's list loads without parsing anybody's practice.

An older version kept a single unfinished session under a `session` key. That
key is read once on load, moved into its own activity's attempt, and cleared —
so an update never costs a student their place. Keep a migration like this
whenever a stored shape changes: it is a dozen lines and it is the difference
between an update and an apology.

The account rules:

- Nobody reaches a screen without choosing **Google** or **guest** — the router
  wraps every screen in that check.
- Firebase is a dynamic import, so guests never download it.
- Sign-in tries a popup and falls back to a redirect when the popup is blocked,
  with the intent written to storage first so the return trip can be recognised.
- *Stay signed in* chooses between local and session persistence.
- On sign-in, whichever copy has the later `updatedAt` wins, device or account,
  with a five-second timeout so being offline just means carrying on locally.
- A student who practised as a guest first is **asked** whether to merge that
  practice in. Merging unions the id lists and adds the counters; an attempt in
  play belongs to one device, so the account's is kept.
- Pushes are debounced by two seconds, and flushed when the page is hidden.
- Logging out pushes what is pending, then deletes that student's copy from the
  device.
- A short list of teacher email addresses unlocks two extra screens: all
  students by last active, and one student's progress and saved questions.

Everything above is optional for a first version. Building guest-only first is a
sound order: `storage.js` is the only file that then changes.

---

## Shell, screens and look

Routing is hash-based, which is what lets a static Pages site handle deep links
with no server configuration. Roughly seventy lines: patterns like `/topic/:id`
compile to regexes, a fallback sends anything unknown home, and every screen
change moves focus to the screen body so a keyboard user lands in the right
place.

```
/  /topics  /topic/:id  /practice/:id/:type  /practice/:id/:type/replay
/review  /questions  /settings  /progress  /help  /profile
/students  /student/:uid
```

The shell is one top bar and one scrolling body. Every screen calls
`renderScreen({ title, subtitle, backTo, body, progress })`; the bar holds a
back button, the title, a bookmark button badged with the saved-question count,
and a profile button that opens a small menu. A session adds a progress strip
under the title showing *Round 2 of 3* and three dots. There is also a visually
hidden live region for announcements.

Screens are functions that build DOM and hand it to the shell. There is no
virtual DOM and no state library: a screen that needs to change simply calls
itself again. A tiny `el(tag, props, children)` helper keeps that readable, and
it is the only DOM abstraction in the app.

What each screen shows of a student's progress:

| Screen | Shows |
| --- | --- |
| Dashboard | % answers correct · days practised this week · a course bar of activities completed · an *up next* topic |
| Topics | per lesson, a bar and "x of 4 activities completed" |
| Activities | per activity, a bar out of 12 for the current attempt, its state, and "Completed twice" |
| Your progress | the same two stats, the course bar, then one row per lesson |

The dashboard is the one screen with any density, and new students see an
explanation of how an activity works instead of empty statistics.

**The app has its own stylesheet — it does not load anything from the website.**
Styling is one CSS file, sectioned by comment banners, with custom properties at
the top for colours, shadows, radii, fonts and the tap-target size. Those values
were *copied* from the course site's stylesheet rather than shared with it, so
the app and the lessons look like one thing; the fonts come straight from Google
Fonts in `index.html`. It has to work this way, because the app is built by Vite
into its own folder and runs offline as an installed PWA, so it cannot depend on
a stylesheet sitting elsewhere on the site. The cost is that a colour change on
the website does not reach the app until someone edits that token block and
rebuilds — and the benefit is that rebranding the whole app is a change to one
block of about twenty lines. Two settings are honoured through `data-`
attributes on the root element: a larger text size and reduced motion. Layout is
phone-first with a maximum width, and tap targets are never smaller than 44 px.

---

## Content tools and writing rules

With 96 questions per topic written by hand, the content is where mistakes
actually happen, so two Node scripts sit beside the app. Neither needs a
dependency.

`check-content.js` runs over every written topic, or one named topic, and exits
non-zero on problems. It separates hard problems from variety notes a human
should judge. What it enforces:

- 24 questions per activity type, and ids unique across the whole app.
- Gap-fill: markers and gap definitions agree, the answer is one of the options,
  at least three options, no repeats, a clue present.
- Right or wrong: the `correct` flag is a boolean, a false sentence has a `fix`
  and a true one does not, the fix actually differs from the sentence and
  carries a bold part, and the set is balanced between correct and incorrect.
- Matching: no duplicate phrases or meanings, and no meaning that would also fit
  another phrase — since any four can appear together.
- Word order: every alternative is buildable from exactly the same words, and no
  sentence is longer than twelve chips.
- Clues: present, under 70 characters, and never containing the answer.

`make-review-page.js` writes an HTML page of every question in a topic, for
proofreading on a phone. Reading 96 questions in a browser is how the ambiguous
ones get caught; a checker cannot tell you a distractor is arguably correct.

The writing rules behind the content, which matter as much as the code:

- Sentences must be what people actually say, in real situations, and still
  grammatically correct.
- **Every distractor must be definitely wrong.** An alternative that is merely a
  different meaning is not a valid distractor — this is the single most common
  content fault.
- Matching definitions must not be swappable with any other definition in the
  topic.
- Word order: if the same words build a second correct sentence, it goes in
  `alternatives`. Attached punctuation often rules this out.
- Clues point at where to look, never at the answer: "Which preposition follows
  this verb?", not "use *with*".

---

## Build order

Each phase ends with something that runs, which is what keeps a rebuild from
stalling half-finished.

| Phase | What gets built | Done when |
| --- | --- | --- |
| 1. Skeleton | Vite project, `base` and `outDir` set, `index.html`, the `el` helper, the hash router, the shell with its top bar. | Two empty screens navigate to each other on a phone. |
| 2. Content shape | One topic file with four or five questions per type, `topics.js`, the topic and activity screens. | You can pick a topic and an activity and reach a blank practice screen. |
| 3. One engine | Gap-fill plus the session screen: four cards, check, feedback, three rounds, results. | A full twelve-question activity runs end to end. |
| 4. The other engines | Right or wrong, word order, then matching, which needs `per-round` mode. | All four types play, with tap-only interaction. |
| 5. Memory | `storage.js`, the pool draw, attempts per activity, completion counting, the bookmark list and its share button. | Close the app mid-round, reopen, and carry on; finish an activity and start it again with fresh questions. |
| 6. Polish | Dragging, the blank-answer dialog, the dashboard, progress and help screens, settings. | It feels like an app rather than a form. |
| 7. Offline and install | `vite-plugin-pwa`, the manifest, icons, the prompt-style update bar. | It installs to a home screen and runs in aeroplane mode. |
| 8. Content at volume | The checker and the review page, then 24 questions per type per topic. | The checker passes and a human has proofread each topic. |
| 9. Accounts | `account.js`, `cloud.js`, sign-in and profile screens, the teacher's views. | Practice follows a student to a second device. |

Phases 1 to 7 are roughly a week of focused work with an AI pairing. Phase 8 is
the long one, and it is writing, not coding: budget far more time for it than
for the app itself.

---

## Traps

These are the decisions that look like details and are not. Most of them were
found by using the app on a phone, not by reasoning about it.

- **Decide early what a progress bar measures, and say it in the label.** Ours
  measured coverage of a question bank while the student was finishing
  activities, and the two never agreed. Whatever the bar counts, a student
  should be able to fill it by doing what the app just asked them to do.
- **Never show a student a statistic that starts at 0% because of a change.**
  Count a new measure from the moment it exists, and show a dash until it means
  something.
- **Migrate stored shapes, don't abandon them.** A dozen lines moved every
  in-flight attempt into the new per-activity slot.
- **The base path.** Get `base` in the Vite config wrong and the app loads a
  blank page on the live site while working perfectly in development.
- **Committing the build.** If the host serves straight from the branch, the
  built folder has to be committed, and it must never be hand-edited. Say so in
  the README, because it is the first thing a helper will get wrong.
- **Prompt, not auto-update.** An auto-updating service worker reloads the page
  under a student halfway through a round.
- **The check button is per round.** Marking each question as it is answered
  changes the whole feel, and it is hard to walk back once the screens are built
  around it.
- **Green is permanent.** Re-checking must not be able to turn a right answer
  wrong, or a student who fixes one question and re-checks loses credit for the
  three they already had.
- **Counters only on the first check.** Otherwise checking twice inflates every
  statistic.
- **One attempt per activity, not one per app.** With a single saved session,
  switching activities silently discards the other.
- **The 250 ms hold before a drag.** Without it, every attempt to scroll past a
  word chip drags the chip instead. This one rule is the difference between the
  activities feeling broken and feeling natural on a phone.
- **Swallow the click after a drop**, or the drag lands the chip and the tap
  handler immediately sends it back.
- **Wrap all storage in try/catch.** Private windows throw on the first read,
  and an unhandled throw there takes the whole app down before a screen draws.
- **Unique ids across the app**, not per topic. Bookmarks and progress key on
  the id alone.
- **Shuffle the options**, and never hand back a word-order sentence in the
  right order.
- **Keep the clue text even when clues are hidden.** Turning them back on should
  be a display change, not a rewrite of 900 questions.

One larger judgement underneath all of it: the app gives a wrong answer no
explanation at all. That was a teaching decision, not a technical one — the
student is meant to try again or bring the question to their teacher. A rebuild
for a different subject should make that call deliberately rather than inherit
it by accident.
