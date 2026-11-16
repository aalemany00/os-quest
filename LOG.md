# OS Quest — Plans & Changes Log

Reconstructed from git history (`git log`). Kept going forward as the project continues.
Companion to [`LOG.d`](LOG.d), the longer chronological build log with architecture notes.

## What this is

A study game for TCSS 422 (Operating Systems): flashcards, quizzes, drag-to-order
puzzles, term/definition matching, a scheduler simulator (FIFO, SJF, STCF, Round
Robin, MLFQ), and a step-through race-condition visualizer. Plain HTML/CSS/JS, no
build step, progress saved per-device via `localStorage`.

## What I asked for / decided, in order

- **2026-10-20 — Initial build.** Asked for a hub page with five different game
  modes (flashcards, quiz, ordering, matching, scheduler-sim) and a scheduler
  engine that actually computes FIFO/SJF/STCF/RR/MLFQ schedules rather than having
  hand-written answers, so new jobs/algorithms stay correct automatically.
- **2026-10-20 — Real content pass.** Replaced placeholder topic content with the
  actual TCSS 422 lecture material (Lectures 1–5 initially), then iterated same-day:
  - Added replay randomization so repeat study sessions don't just show the same
    question order.
  - Added a Readings tab that recommends specific textbook sections based on which
    questions you're missing, then found it had no way back to the hub and fixed
    that navigation bug.
  - Labeled readings by chapter number explicitly (was ambiguous before).
  - Added cache-busting query params on module/CSS imports — browser was serving
    stale cached JS during active editing.
  - Added in-app study notes plus tutor-style suggestions on what to review.
  - Did a full retro-arcade visual redesign.
  - Decided "complete" shouldn't trigger on a single lucky pass — added a mastery
    streak requirement (3 in a row, any miss resets to 0). Found and fixed two
    bugs this surfaced: `ordering.js` calling `insertBefore()` on a stale/detached
    node after a re-render, and `race-sim.js`'s `setTimeout`-based answer
    highlighting breaking under the new re-render-after-complete flow.
  - Wired up OSTEP Chapters 6–7 as additional reading sources, verifying the
    textbook's convoy example against the scheduler engine's own output (FIFO
    avg turnaround 110 vs. SJF's 50) rather than trusting the citation as-is.
  - Added a top-level Notes tab for facts that only exist on lecture slides, not in
    the textbook.
- **2026-10-20 — Multi-user profiles.** Added local per-person profiles (shared
  computer use case), gave each a unique id so same-name profiles can't collide,
  and added export/import so one person's profile can follow them across devices.
  Export/import started as file-based, then was replaced with a copy-paste sync
  code instead — simpler, no file-picker UX needed (verified the full round trip:
  export, wipe localStorage to simulate a new device, paste back in, confirmed
  exact progress restored). Added an optional PIN so a profile can't be opened by
  just clicking it (SHA-256 hashed, never stored/sent in plain text — explicitly
  a casual deterrent, not real security, since it's all client-side and
  inspectable). Along the way, fixed a router bug where navigating to the empty
  hash after picking a profile didn't re-render, because no `hashchange` event
  fires when the hash doesn't actually change.
- **2026-10-30 — Lecture 6 (Locks).** Added mutexes, spin locks, test-and-set, CAS,
  and ticket locks as a topic.
- **2026-11-10 — Midterm prep pass.** Reviewed the Locks topic against Quiz 2/3 and
  caught a real citation error in the process — a reading claimed "through §28.2"
  when the content actually covers through §28.11. Cross-checked the Midterm
  Announcement's stated scope against the whole game and confirmed it was fully
  covered. Added midterm-targeted practice built straight from Quiz 2/3's own
  job/arrival/burst numbers, verified against the scheduler engine. Added
  Lecture 7 (Lock-Based Data Structures) and Lecture 8 (Condition Variables).
- **2026-11-16 — Post-midterm content.** Added Lecture 9 (Concurrency Problems) and
  Lecture 10 (Memory Virtualization).

## Where AI (Claude Code) did the work vs. where I checked it

Claude Code wrote the game engine, UI, and each topic's content file from the
lecture slides/textbook chapters I pointed it at. My checking happened mostly by
playing the modes myself — catching the Readings-tab dead end, confirming the
scheduler sim's computed schedules matched what I worked by hand, and deciding
when content coverage was thin enough to need another pass (e.g. the Locks review
against the actual quiz questions).

## What I'd still change

- No log/plan file existed until 2026-11-16, when I added this one plus the
  longer `LOG.d` build log retroactively, once I realized the course wants one
  kept in the artifact's own repo.
- Topics after Lecture 10 (if the course goes further) aren't in yet.
