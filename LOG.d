OS QUEST — BUILD LOG
=====================

What this is
-------------
OS Quest is a browser study game for TCSS 422 (Operating Systems). No build
step, no backend — plain HTML/CSS/JS (ES modules), opened with any static
file server. Progress is saved per-device in localStorage.

(There's also a shorter LOG.md in this same folder, written as a first-person
retrospective. This file is the longer, chronological build log: every
change, in order, with how it works along the way.)


HOW IT WORKS
-------------

Content model
  Every topic is one plain-JS object in js/content/<name>.js, exporting:
    id, icon, title, description, readings[], notes[], blocks[]
  readings[] lists the actual course files it's sourced from (kind:
  chapter/slides/code/handout, with chapter number+title for textbook PDFs).
  notes[] is an array of { heading, body } — original written-from-scratch
  study summaries, not copied textbook text.
  blocks[] is the list of playable activities for that topic. Each block has
  a `type` (flashcards / quiz / ordering / matching / scheduler-sim /
  scheduler-practice / race-sim), an `id`, a `title`, and type-specific data
  (e.g. quiz blocks can set `sampleSize` to draw a random subset of a larger
  question pool each playthrough).

  js/content/index.js imports every topic file and exports one TOPICS array.
  Adding a new topic is: write the content file, import it in index.js, add
  it to the TOPICS array. Nothing else in the app knows topic names — the
  hub, progress tracking, readings tab, and notes tab are all driven purely
  by walking TOPICS and each topic's blocks[].

Game modes (js/modes/*.js)
  Each mode exports a mount<Mode>(container, block, onComplete) function
  that renders that one activity and calls onComplete(score) when finished.
  flashcards — self-rated known/still-learning per card.
  quiz — multiple choice; shuffles question order AND option order every
  playthrough; sampleSize draws a random subset from a larger pool.
  ordering — drag steps into the correct sequence.
  matching — pair terms with definitions.
  scheduler-sim / scheduler-practice — jobs are fed into js/engine/
  scheduler.js, which actually COMPUTES the FIFO/SJF/STCF/RR/MLFQ schedule
  (Gantt chart, turnaround/response times) rather than using hand-written
  answers — so new jobs or algorithms are always correct automatically.
  scheduler-practice specifically generates unlimited random problems this
  way for extra drilling. race-sim is a step-through visualizer for
  instruction-level race conditions (e.g. the counter++ interleaving).

Progress, mastery, and profiles (js/app.js)
  Multiple people can use one device (or the same hosted link) without
  clobbering each other. First visit prompts for a name and creates a
  profile; returning visitors stay signed in. Profiles are { id, name } —
  the id (a random UUID), not the name, is what scopes all storage, so two
  different people who both type "Alex" never share a save. A "Switch"
  button signs out and lists other profiles (optionally PIN-locked — SHA-256
  hashed, never stored in plain text, and explicitly a casual deterrent, not
  real security, since this is all client-side and inspectable). A profile
  can follow someone to another device via a copy-paste sync code (base64,
  embeds the real profile id so it reunites correctly even across a name
  collision) instead of needing file upload/download.

  "Complete" on any activity requires a mastery STREAK (default 3 in a row
  fully-correct runs), not just one lucky pass — any non-perfect run resets
  the streak to zero. Topic pages show live "Streak 2/3" progress instead of
  a binary done flag.

  Storage keys (all under one profile's id):
    osquest_profiles_v1          — array of { id, name, pinHash? }
    osquest_active_profile_v1    — which profile id is signed in
    osquest_progress_v2::<id>    — per-activity scores/streaks
    osquest_readings_v1::<id>    — which course files are checked off
  Legacy pre-profile keys (osquest_progress_v2, osquest_readings_v1, and
  even-older bare-name-keyed profiles) are migrated automatically on load,
  so nobody lost progress when profiles/ids were introduced after the fact.

Readings + Notes tabs
  Readings lists every topic's actual source files with a read/unread
  checklist, plus a mastery badge per topic computed from real recorded
  scores, surfacing specific low-scoring or untried activities as one-click
  "go do this" suggestions (routed through the in-app study notes first,
  then the quiz/activity itself). Notes is a flat hub of every topic's
  written study-notes page, reachable without drilling into a topic first.

Cache-busting
  Every internal import carries a ?v=N query string (index.html, app.js,
  every mode, every content file). Static hosting (e.g. GitHub Pages)
  caches aggressively enough that edits don't always show up on reload —
  bumping N on a content/behavior change forces browsers to actually
  re-fetch instead of serving a stale cached copy.


CHANGE LOG (earliest -> most recent)
--------------------------------------

2026-10-20  cbf7e76  Initial OS Quest study game
  Hub page, five game modes (flashcards/quiz/ordering/matching/
  scheduler-sim), and a scheduler engine that computes real FIFO/SJF/STCF/
  RR/MLFQ schedules. Starter content for the first 6 topics.

2026-10-20  9dd8095  Replace placeholder content with real course material
  Every example/definition/number now sourced directly from the course's
  own lecture slides, textbook chapters, and sample code, verified against
  the scheduler engine's actual computed output: exact MLFQ rules, the
  Figure 26.7 race-condition trace, real fork()/exec()/wait() code+output,
  the LDE boot/context-switch sequences, the course's own FCFS/SJF/STCF/RR/
  MLFQ worked examples.

2026-10-20  0a145ad  Randomization + deeper coverage for study-mode replay
  Quizzes shuffle question order and answer order every playthrough (with
  optional random sampling from a larger pool); scheduler-sim questions
  shuffle too. New scheduler-practice mode generates unlimited random
  scheduling problems with ground truth always computed live. Expanded
  content across every topic: process API categories, signals/pipes/I-O
  redirection, process-state figures, xv6 states, CPU privilege rings, trap
  classification, scheduling metrics/I-O-overlap example, MLFQ real-world
  variants, more threads material (TCB, indeterminate output, Too Much
  Milk, thread create/join ordering).

2026-10-20  b7315e1  Add a Readings tab with score-based review suggestions
  New top-bar Readings view lists each topic's course materials with a
  read-checklist, plus a mastery badge from actual recorded scores, and
  surfaces specific low-scoring/untried activities as suggestions.

2026-10-20  f6433db  Label textbook chapter readings explicitly by chapter number
  Tagged readings by kind (chapter/slides/code/handout) and, for chapters,
  the real chapter number+title pulled from the PDF itself, so they're
  distinguishable from lecture slides/sample code. Flagged two OSTEP
  chapters not yet in the local folder at the time (Ch. 6 LDE, Ch. 7
  Scheduling intro).

2026-10-20  1dabd50  Add cache-busting query params to all internal imports
  GitHub Pages/browser caching meant edits didn't always show up on
  reload. Every import got a ?v=N marker going forward.

2026-10-20  6873d24  Add in-app study notes + tutor-style review suggestions
  Every topic got an original condensed study-notes page (written as a
  from-scratch summary, not copied textbook text), linked from the topic
  page and from the Readings tab's suggestions — a low score now leads with
  "read the notes" before "retry the quiz."

2026-10-20  8b74102  Fix Readings tab having no way back to the topic hub
  Added the same back-button header pattern used elsewhere; previously the
  only way out was indirectly via a suggestion link.

2026-10-20  b6b27f8  Retro arcade visual redesign
  Press Start 2P / VT323 pixel fonts, neon cyan/magenta/yellow/green/
  purple/orange palette, hard-shadow borders with a press-down button
  effect, CRT scanline overlay, faint grid background. Per-topic neon
  accent colors; scheduler Gantt-chart job colors updated to match. Fixed
  the back-button arrow glyph (missing in the pixel font) by swapping to
  plain "<<" text.

2026-10-20  2c84542  Require a mastery streak before anything counts as "complete"
  Completion now requires a configurable number of fully-correct runs IN A
  ROW (default 3) instead of one lucky pass; any non-perfect run resets the
  streak. Topic pages show live streak progress. Bumped the progress
  storage key to v2 (old binary "done" flags don't mean the same thing
  anymore). Also fixed two latent bugs found in the process: ordering.js
  calling insertBefore() against a stale/detached node after a re-render,
  and race-sim.js's setTimeout-based answer-highlighting hack breaking
  under the new re-render-after-onComplete flow — both replaced with
  render()-safe patterns that derive styling from state.

2026-10-20  60232e8  Wire up newly added OSTEP Chapters 6 and 7
  cpu-mechanisms.pdf (Ch. 6) and cpu-sched.pdf (Ch. 7) were added to
  Learning Material; updated readings to reference them, mined new
  material: the 5 workload assumptions motivating the scheduling unit, the
  textbook's baseline convoy example (verified against the engine: FIFO
  avg turnaround 110 vs SJF's 50), real lmbench syscall/context-switch
  timing numbers, more LDE facts.

2026-10-20  924f891  Add a top-level Notes tab + fold in lecture-slide-only facts
  New Notes button opens a hub of every topic's notes page directly.
  Mined the original lecture-slide extraction for facts not yet in any
  notes: Lecture 1's "AI-era code auditor" framing, time-sharing vs.
  space-sharing, the 100-1000 context-switches/sec fact.

2026-10-20  0767796  Add local per-person profiles
  First visit prompts for a name; "Switch" button signs out / picks
  another profile / creates a new one, with per-profile delete. "Reset
  Progress" now scoped to the active profile only. Pre-profile progress on
  a device auto-migrates into the first profile created. Also fixed a
  router bug: navigate("") didn't re-render when the hash was already
  empty (no hashchange event fires if the hash doesn't change), which made
  the app look stuck right after picking a profile.

2026-10-20  c4a55bf  Give each profile a unique id so same-name profiles can't collide
  Profiles became { id, name } pairs (id = random, scopes all storage;
  name = display label only). Picker warns before creating a likely
  duplicate ("there's already a profile named X — is that you?") and
  disambiguates same-name profiles as "Name (#1)", "Name (#2)". Existing
  pre-id profiles migrated automatically.

2026-10-20  fe4f18d  Add Export/Import so a profile can follow one person across devices
  No backend to "log in" to, so a name alone can't prove it's the same
  person elsewhere. 💾 Export downloads the active profile's save
  (including its real id) as .json; Import loads it back in, matching by
  id (overwrites if that id already exists locally, else creates a new
  entry under the original id).

2026-10-20  58e0cff  Replace file-based export/import with a copy-paste sync code
  File upload/download is clunky on mobile (especially iOS Safari).
  Export now shows a base64 code in a textarea with one-tap copy; sign-in
  has a paste-and-load field instead of a file picker. Same underlying
  mechanism (id-based reunification), no filesystem interaction. Verified
  full round trip: export, wipe localStorage (simulated new device), paste
  back in, confirmed exact progress restored.

2026-10-20  057a509  Add an optional PIN so profiles can't be opened by just clicking them
  Optional PIN at profile creation; opening or deleting a locked profile
  now prompts for it and refuses on wrong/cancelled entry. Locked profiles
  show 🔒 instead of 👤 in the picker. PIN is SHA-256 hashed (plain-
  checksum fallback for browsers without SubtleCrypto), never stored/
  transmitted in plain text, travels with the profile through sync-code
  export/import. Explicitly a casual deterrent, not real security.
  Verified end-to-end (created a PIN profile, confirmed wrong/cancelled
  PIN correctly refuses access).

2026-10-30  7e99e55  Add Lecture 6 (Locks) topic
  Mutexes, spin locks, test-and-set/compare-and-swap, fetch-and-add ticket
  locks — the week's material that wasn't in the game yet, sourced from
  the Lecture 6 slides, OSTEP Ch. 28, and the Lecture 6 sample code.

2026-11-10  ff53e50  Review Locks + add midterm-targeted practice from Quiz 2/3
  Verified every Locks definition and sample-code description against the
  actual chapter PDF and sample code; fixed one citation error (reading
  claimed "through §28.2" but content actually covers through §28.11).
  Cross-checked the Midterm Announcement against the whole game and
  confirmed the exam's stated scope (Ch. 2,4,5,6,7,8,26,27,28, "Intro"
  through "Locks Part I") was already fully covered, with Lecture 7/8
  explicitly out of scope for that exam. Added new practice straight from
  Quiz 2/3's own job/arrival/burst numbers (verified against the engine):
  FCFS/SJF/STCF/RR on Quiz 2's data, Quiz 3's 3-level MLFQ scenario with a
  priority boost, the x=x+1 vs x=x*2 interleaving (3 possible outcomes),
  and a shared-vs-private matching exercise from the Lecture 5 slides.

2026-11-10  19ee6b8  Add Lecture 7 (Lock-Based Data Structures) and Lecture 8 (Condition Variables)
  Lock-Based Data Structures (Ch. 29): the "one lock around everything"
  baseline and its limits, the sloppy/approximate counter's threshold
  tradeoff, minimizing the locked region in a linked list, hand-over-hand
  locking's real-world performance tradeoff, the Michael & Scott two-lock
  queue, per-bucket hash table locking.
  Condition Variables (Ch. 30 + the course's CV Definitions + Fork-Join
  Problem handout): what a CV is and why wait() needs the lock, the
  handout's 4-attempt fork-join build-up, producer/consumer's two real
  bugs (if-vs-while, then one-CV-vs-two), Mesa semantics, covering
  conditions (broadcast) via the memory-allocator example.

2026-11-16  d4bc8eb  Add Lecture 9 (Concurrency Problems) and Lecture 10 (Memory Virtualization)
  Concurrency Problems (Ch. 32): the two non-deadlock bug patterns
  (atomicity violations, order violations — the real MySQL/Mozilla
  examples), deadlock's 4 required conditions, and prevention (attack one
  condition at a time)/avoidance (scheduler-aware)/detect-and-recover
  (resource-allocation-graph cycles).
  Memory Virtualization (Ch. 13/15/16): why physical memory needs
  virtualizing, base-and-bounds dynamic relocation with worked numeric
  translation exercises, segmentation (code/heap/stack as independent
  segments) and its own worked exercises, and the fragmentation tradeoff
  that motivates paging next.

2026-11-16  f813564  Add plans/changes log reconstructed from git history
  Added LOG.md — a shorter, first-person retrospective of the project's
  history and decisions (companion to this file).

2026-11-16  (this entry)  Add this build log (LOG.d)
  A longer, chronological technical log: every change above in more
  detail, plus the "how it works" architecture notes at the top of this
  file.
