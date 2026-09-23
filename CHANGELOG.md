# Changelog

What changed in the course and the practice app, newest first, and why.
Plain language on purpose — this is the record a year from now, when the
reasoning behind a decision has been forgotten.

---

## 23 September 2026 — five phrases reworded, and "How do you do?" retired

A check on how natural the app's sentences sound flagged five of them. Four were
reworded. The fifth turned out to be a question about the course itself.

**In the app**

- Lesson 1: "I moved across from the Warsaw office" → "I **transferred** from the
  Warsaw office", in both the matching and the word-order question.
- Lesson 3: "This led to much happier customers" → "This led to much **higher
  customer satisfaction**", which is what people actually say about a result.
- Lesson 6b: "The translation is a bit off" → "a **little** off".

**In the lesson as well as the app**

"How do you do?" is no longer taught. It was in Lesson 1's formal introductions,
in the formal/informal sorting activity, and in the app's matching bank — so it
came out of all three at once:

- `lesson1.html`, Activity 2 — replaced with **"Very pleased to meet you, Ms
  Alves."** Title and surname mark the formality, which is what that activity is
  for, and it keeps the 4 formal / 4 informal balance.
- `course-language-summary.md` — the same swap.
- The app's matching question — now **"It's a pleasure to meet you."**, a phrase
  the lesson does still teach.

**One flagged change was not made.** "You're breaking up. Let me try
reconnecting" is taught word for word in Lesson 5, so the app was right to drill
it. It was changed, then put back.

**Worth remembering.** The app exists to practise what the lessons teach, so a
suggestion about the app's wording is often really a suggestion about a lesson.
Check the lesson page and `course-language-summary.md` before changing a
question — otherwise the practice quietly drifts away from the teaching.

---

## 21 September 2026 — an activity is 12 questions

**The problem.** A student answered all 12 questions of an activity, got their
results, and went back to find the progress bar half empty. The bar was counting
how many of the activity's 24 written questions they had met, which is a
different thing from finishing the activity. Both numbers were true, and nothing
on screen explained the difference.

**What changed for students**

- An activity is 12 questions. Finish them and it shows a tick, a full bar, and
  an invitation to start again — which gives 12 questions they have not seen.
- The lesson list now shows `0 of 4 activities completed` for each lesson, with
  a bar. The whole-course bar counts activities too.
- Each activity card shows how far through it they are (`4 of 12 questions
  answered`) and how many times they have completed it.
- The dashboard stat `questions answered` became **% answers correct**: of the
  questions in the activities they have finished, how many stand correct. It
  shows a dash until they complete their first activity.
- Word Order no longer shows the correct sentence after 3 tries. Nothing is
  revealed now — a question they cannot get is one to save and ask about. A
  *Show answer* button that does not count as correct may come later.
- The app no longer tells students how many questions are in the bank. It is
  still there, and still gives fresh questions on a restart; they just do not
  need to think about it.
- Each activity keeps its own unfinished attempt, so leaving gap-fill half done
  to try matching no longer loses the gap-fill work. Before this, the app
  remembered only one unfinished activity at a time.

**What happened to existing progress.** Nothing was lost. Accounts, saved
questions, practice days and completed-activity counts all carried over, and any
activity left half finished was moved across automatically. Only the new
percentage starts from zero, because the app had never recorded it — counting it
against past answers would have shown everyone 0% through no fault of theirs.

**Also.** The wording is consistent now: an activity has 12 questions in 3
*rounds* of 4. The dashboard used to call those rounds "sets", while the
activity screen used "set" for the bank of 24.

---

## Earlier

Before this file existed, changes were recorded in the **Current status**
section of `CLAUDE.md` and in the commit history.
