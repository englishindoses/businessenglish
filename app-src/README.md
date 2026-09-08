# BizEng practice app — how it works

The app students use is the **`/app`** folder at the top of this repo. That folder is
built automatically from the code in **`/app-src`** — you never edit `/app` by hand.

## The two commands

Run these from inside `app-src`:

```
npm run dev      # opens the app locally to try changes as you make them
npm run build    # rebuilds /app so the live site picks the changes up
```

After `npm run build`, commit and push as usual and GitHub Pages serves the new version at
`https://englishindoses.github.io/businessenglish/app/`.

If `npm` complains that packages are missing, run `npm install` once first.

## Where things live

| Folder | What's in it |
|---|---|
| `src/data/` | **The content.** One file per topic, plus `topics.js` which lists them in lesson order. |
| `src/engines/` | The four activity types: gap-fill, right/wrong, matching, word order. |
| `src/screens/` | The screens: home, topics, activities, practice session, results, my questions, settings. |
| `src/styles/app.css` | All the styling. The colours and fonts at the top are copied from the course site. |
| `src/lib/storage.js` | Everything that gets saved. When logins are added, only this file changes. |
| `public/icons/` | The app icon. Placeholder for now — replace these three PNGs with the real logo. |
| `tools/make-icons.js` | Generates the placeholder icons. Delete once the real logo is in. |

## Adding a new topic

1. Copy `src/data/lesson1.js` to a new file and rewrite the four banks of questions.
2. Import it in `src/data/topics.js` and move it from the `upcoming` list into `ready`.
3. `npm run build`.

## The question formats

- **gapfill** — `sentence` with `{1}` marking each gap, and a `gaps` entry giving the options and the answer.
- **rightwrong** — a `sentence`, `correct: true/false`, and a `fix` showing the corrected version.
- **matching** — a `left` phrase and the `right` meaning it belongs to.
- **wordorder** — the full `answer` sentence; the words are shuffled automatically. Add
  `alternatives: []` if more than one order is acceptable.

Every question also takes a `clue`, shown when the answer is wrong.
