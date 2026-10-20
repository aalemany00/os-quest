# OS Quest — TCSS 422 Study Game

A mixed-format browser game for studying Operating Systems (TCSS 422): flashcards,
quizzes, drag-to-order puzzles, term/definition matching, an interactive CPU
scheduler simulator (FIFO, SJF, STCF, Round Robin, MLFQ), and a step-through
race-condition visualizer for concurrency.

No build step — plain HTML/CSS/JS (ES modules). Works on desktop and mobile
browsers. Progress is saved locally per-device via `localStorage`.

## Running locally

Any static file server works, e.g.:

```bash
python -m http.server 4173
```

Then open http://localhost:4173. (Opening `index.html` directly via `file://`
won't work because browsers block ES module imports from the file system.)

## Adding more content

Each topic lives in `js/content/<topic>.js` and exports an object with
`id`, `icon`, `title`, `description`, and a `blocks` array. Block types:

- `flashcards` — `{ cards: [{ front, back }] }`
- `quiz` — `{ questions: [{ q, options, correctIndex, explain }] }`
- `ordering` — `{ prompt, steps: [...] }` (steps in correct order; shuffled for play)
- `matching` — `{ pairs: [{ term, def }] }`
- `scheduler-sim` — `{ algorithm, quantum?, mlfq?, jobs: [{name, arrival, burst}], questions: [{ metric, job, options, correctIndex }] }`
  (the schedule itself is computed by `js/engine/scheduler.js`, not hand-written)
- `race-sim` — `{ threadA, threadB, trace, initialVars, question, options, correctIndex, explanation }`

Register a new topic file in `js/content/index.js`.
