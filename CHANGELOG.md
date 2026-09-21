# Changelog

What changed in the course and the practice app, newest first, and why.
Plain language on purpose — this is the record a year from now, when the
reasoning behind a decision has been forgotten.

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
