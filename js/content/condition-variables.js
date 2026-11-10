export default {
  id: "condition-variables",
  icon: "🔔",
  title: "Condition Variables",
  description: "Waiting for a condition to become true without wasting CPU — the producer/consumer problem, Mesa semantics, and covering conditions.",
  readings: [
    { kind: "chapter", chapter: 30, title: "Condition Variables (Broadcast coverage in §30.3 marked optional in the Lecture 8 slides)", file: "threads-cv.pdf" },
    { kind: "slides", title: "Lecture 8 — Condition Variables (PreClass)", file: "TCSS 422 Lecture 8 Condition Variables - PreClass.pptx" },
    { kind: "handout", title: "Handout — Condition Variable Definitions + the Fork-Join Problem", file: "Handout-CVDef+ForkJoinProblem.pdf" },
  ],
  notes: [
    {
      heading: "The problem locks alone can't solve",
      body: "Sometimes a thread needs to wait for some condition to become true — not just for exclusive access to data. The textbook's running example: a parent thread wants to wait for a child thread to finish (this is basically what pthread_join() does under the hood). The obviously-bad way is a spin loop checking a shared flag — it works, but burns a full CPU core doing nothing useful the whole time it waits. The fix is a new primitive built for exactly this: the condition variable.",
    },
    {
      heading: "What a condition variable actually is",
      body: "A condition variable (CV) is an explicit queue of sleeping threads, always paired with a lock. Three operations: wait(cv, lock) releases the lock and puts the calling thread to sleep on that queue, atomically — no window where another thread could change the state and signal before you're actually asleep. signal(cv) wakes ONE waiting thread (or does nothing if none are waiting). broadcast(cv) wakes ALL waiting threads. Critically, when wait() returns, it has already re-acquired the lock for you — the caller never has to think about re-locking after sleeping.",
    },
    {
      heading: "Why wait() needs the lock passed in",
      body: "If 'check the condition' and 'go to sleep' were two separate steps, another thread could change the condition and signal in the gap between them — and the sleeping thread would miss the wakeup entirely, sleeping forever. By requiring the lock to already be held, and having wait() release it and go to sleep as a single atomic action, that race is closed by construction.",
    },
    {
      heading: "The fork-join problem, four attempts (from the course handout)",
      body: "A parent creates a child and wants to wait for it to finish. Attempt 1 (spin on a shared `done` flag) works but wastes a whole CPU core busy-waiting. Attempt 2 (child calls signal(), parent calls wait() with no lock and no state variable at all) is broken — if the child runs and signals before the parent ever reaches wait(), that signal is simply lost, since no one was asleep yet to receive it, and the parent then waits forever. Attempt 3 adds the lock around wait()/signal() but still has no `done` flag — same lost-signal bug, just with proper locking around a solution that's still incomplete. Attempt 4 is the one that actually works: a `done` flag PLUS the lock PLUS a while-loop around wait() that rechecks `done`. If the child finishes first, the parent's while-check already sees done==1 and never even calls wait(); if the parent gets there first, it safely sleeps and the child's later signal wakes it. The state variable is what makes a 'did I miss it?' check possible at all.",
    },
    {
      heading: "Producer/consumer, attempt 1: if instead of while",
      body: "A shared one-slot buffer: producer waits while the buffer is full, puts data in, signals; consumer waits while the buffer is empty, takes data out, signals. The first broken version checks the buffer state with `if` instead of a loop. With exactly one producer and one consumer this happens to work — but add a second consumer and it breaks: a consumer can be signaled awake, but before it actually runs, a DIFFERENT consumer sneaks in and empties the buffer first. The first consumer then wakes up, skips re-checking (because it was an `if`, not a loop), and tries to consume from an already-empty buffer.",
    },
    {
      heading: "Producer/consumer, attempt 2: while, but still one condition variable",
      body: "Changing `if` to `while` fixes the first bug — a woken thread now re-checks the state before proceeding, and safely goes back to sleep if someone else got there first. This is exactly why the rule is 'always use a while loop around a condition-variable wait, never a plain if' — it also quietly protects you against spurious wakeups (a thread waking with no real signal at all, which some implementations permit). But a second, subtler bug remains: with only ONE condition variable shared by both producers and consumers, a consumer's signal can accidentally wake another sleeping CONSUMER instead of the producer that's actually waiting — and now everyone can end up asleep with no one left to wake anybody.",
    },
    {
      heading: "Producer/consumer, the actual fix: two condition variables",
      body: "Use two separate condition variables — one the producers wait on (signaled when the buffer has space), one the consumers wait on (signaled when the buffer has data). A producer can now only ever wake a consumer, and a consumer can only ever wake a producer — the accidental same-type wakeup bug is closed by construction, not by luck. The final, fully general version just extends the single buffer slot to a multi-slot bounded buffer, so multiple items can be produced or consumed before anyone has to sleep.",
    },
    {
      heading: "Mesa semantics: a signal is a hint, not a teleport",
      body: "When a thread calls signal(), the woken thread doesn't run immediately — it just becomes ready to run again, and anything could happen before the scheduler actually gives it the CPU (including some OTHER thread changing the state right back). This is called Mesa semantics, and it's what virtually every real system uses. It's exactly why re-checking the condition after waking (the while loop) isn't optional — the signal only means 'something changed,' never 'the condition is guaranteed still true by the time you run.'",
    },
    {
      heading: "Covering conditions: when you genuinely need broadcast",
      body: "Sometimes signal() can't know WHICH waiting thread should wake up. The textbook's example: a memory allocator where threads block in allocate() until enough bytes are free; a free() of 50 bytes should wake a thread waiting for 10 bytes, but not one waiting for 100 — yet signal() has no way to pick the right one. The fix is broadcast(): wake every waiting thread, let each one re-check its own condition (in its own while loop) and go right back to sleep if it still isn't satisfied. This is called a covering condition — it conservatively covers every thread that might need to wake, at the cost of some wasted wakeups. It is NOT the default move, though: for producer/consumer, the better fix was two separate condition variables, not broadcasting on one. Reach for broadcast specifically when, like the allocator, you genuinely can't tell in advance which single thread should wake.",
    },
  ],
  blocks: [
    {
      type: "flashcards",
      id: "cv-flash",
      title: "Condition Variables Vocabulary",
      cards: [
        { front: "Condition variable (CV)", back: "An explicit queue of sleeping threads, paired with a lock. Lets a thread sleep until some condition becomes true, instead of burning CPU in a spin loop." },
        { front: "wait(cv, lock)", back: "Atomically releases the lock and puts the calling thread to sleep on the CV's queue. When woken, it re-acquires the lock automatically before returning to the caller." },
        { front: "signal(cv)", back: "Wakes exactly one waiting thread (or does nothing if no thread is currently waiting)." },
        { front: "broadcast(cv)", back: "Wakes every thread currently waiting on the CV — used when you can't tell in advance which single waiter should proceed (a 'covering condition')." },
        { front: "Why always use a while loop around wait(), never an if", back: "Mesa semantics mean a woken thread's condition might not actually hold by the time it runs (someone else could have changed it first), and some systems permit spurious wakeups with no signal at all. A while loop re-checks and safely goes back to sleep either way; an if does not." },
        { front: "Mesa semantics", back: "signal() only means 'something changed, go re-check' — it's not a guarantee the woken thread's condition still holds, or even that it runs next. Virtually every real system works this way (as opposed to the stronger, harder-to-implement Hoare semantics)." },
        { front: "Why producer/consumer needs TWO condition variables", back: "With a single shared CV, a consumer's signal can accidentally wake another consumer instead of the producer that's actually waiting. Two CVs (one for 'buffer has space', one for 'buffer has data') guarantee a producer only ever wakes a consumer and vice versa." },
        { front: "Covering condition", back: "A situation where signal() can't know which specific waiting thread satisfies the new state, so broadcast() is used to wake everyone and let each re-check its own condition — e.g. a memory allocator waking all size-waiters when memory is freed." },
        { front: "The fork-join problem's key insight (course handout)", back: "A lock and a condition variable alone aren't enough — you also need an explicit state variable (like `done`). Without it, a signal sent before the other thread ever reaches wait() is simply lost forever, since nothing was asleep yet to receive it." },
      ],
    },
    {
      type: "ordering",
      id: "cv-forkjoin-order",
      title: "The Fork-Join Problem: Building Up to a Working Solution",
      prompt: "Put these four attempts (from the course handout) in the order they're presented, from worst to actually-correct.",
      steps: [
        "Spin: the parent busy-waits in a loop checking a shared `done` flag — correct, but wastes a full CPU core the whole time",
        "No lock: the child calls signal() with no lock and no `done` flag — if the child finishes before the parent ever calls wait(), the signal is lost and the parent sleeps forever",
        "No state variable: lock is added around wait()/signal(), but there's still no `done` flag — same lost-signal bug can still happen",
        "Actually works: a `done` flag, held under a lock, with the parent checking `while (done == 0) wait(...)` — a signal that arrives before the parent waits is safely caught by the flag check instead of being lost",
      ],
    },
    {
      type: "quiz",
      id: "cv-quiz",
      title: "Condition Variables Quiz",
      sampleSize: 6,
      questions: [
        {
          q: "Why is a spin loop (`while (done == 0) ;`) a bad way for a parent to wait for a child thread to finish?",
          options: [
            "It's not actually correct",
            "It works, but wastes an entire CPU core continuously re-checking the flag instead of sleeping until something changes",
            "It only works with exactly one CPU",
            "C doesn't allow while loops around shared variables",
          ],
          correctIndex: 1,
          explain: "Spinning is correct but burns CPU time doing nothing useful — exactly the problem condition variables are designed to solve, by letting the waiting thread actually sleep.",
        },
        {
          q: "In the broken 'no state variable' fork-join attempt, what goes wrong if the child happens to run and call signal() BEFORE the parent ever reaches wait()?",
          options: [
            "Nothing — signal() queues up and is delivered later",
            "The signal is simply lost (no one was asleep to receive it), and the parent then waits forever",
            "The program crashes immediately",
            "The child is paused until the parent calls wait()",
          ],
          correctIndex: 1,
          explain: "signal() only wakes threads that are ALREADY asleep on the condition variable — it does not queue up for a future waiter. Without a state variable the parent can check, there's no way to tell 'the thing I was waiting for already happened' after the fact.",
        },
        {
          q: "A consumer wakes up from `if (count == 0) wait(&cond, &mutex);`, but by the time it actually runs, another consumer has already emptied the buffer. What does this consumer do?",
          options: [
            "It safely re-checks count and goes back to sleep",
            "It proceeds to call get() anyway, even though the buffer is now empty — because the if never re-checks the condition after waking",
            "It automatically wakes the other consumer instead",
            "This can only happen with a single consumer",
          ],
          correctIndex: 1,
          explain: "This is exactly why `if` is wrong and `while` is required: an `if` only checks the condition once, before sleeping — on waking, it proceeds unconditionally, even if the state has since changed again.",
        },
        {
          q: "With a single shared condition variable for both producers and consumers, what's the subtle bug that remains even after fixing if→while?",
          options: [
            "There is no remaining bug once you fix if to while",
            "A consumer's signal can accidentally wake another sleeping CONSUMER instead of a producer, potentially leaving every thread asleep with no one left to wake anyone",
            "The buffer can only hold one item, forever",
            "Producers can never run after this fix",
          ],
          correctIndex: 1,
          explain: "signal() wakes some thread waiting on the CV, but with producers and consumers sharing the same CV, it has no way to distinguish which type of thread it's waking — this is exactly what two separate condition variables fix.",
        },
        {
          q: "What does 'Mesa semantics' mean for what signal() actually guarantees?",
          options: [
            "The woken thread is guaranteed to run next, immediately, with its condition still true",
            "Signal() is just a hint that something changed — the woken thread must re-check its condition itself, since other things may happen before it actually runs",
            "Signal() guarantees nothing at all will change before the thread wakes",
            "Mesa semantics only apply to broadcast(), not signal()",
          ],
          correctIndex: 1,
          explain: "Under Mesa semantics (used by virtually every real system), being woken is not a promise that your condition still holds — some other thread could run first and change things back. That's why re-checking in a while loop is mandatory, not just good practice.",
        },
        {
          q: "In the memory-allocator 'covering condition' example, why does free() need to call broadcast() instead of signal()?",
          options: [
            "broadcast() is always strictly better than signal()",
            "free() can't know in advance which specific waiting thread (waiting for how many bytes) should be the one to wake up, so it wakes everyone and lets each re-check its own condition",
            "signal() doesn't exist in this scenario",
            "Because there is only one waiting thread, ever",
          ],
          correctIndex: 1,
          explain: "A thread waiting for 100 bytes and another waiting for 10 bytes are both on the same condition variable; signal() might wake the wrong one. broadcast() wakes both, and each independently re-checks (in its own while loop) whether there's now enough memory for it specifically.",
        },
        {
          q: "For the producer/consumer problem specifically, was broadcast() the fix that was ultimately used?",
          options: [
            "Yes, broadcast() was the final correct solution",
            "No — the actual fix was using two separate condition variables (one per direction), which is more targeted than broadcasting on one",
            "Yes, but only for the producer side",
            "No fix was ultimately found",
          ],
          correctIndex: 1,
          explain: "Broadcast would technically also work here, but it's described as the less-preferred fix when a more targeted solution (separate CVs) is available — broadcast is best reserved for cases like the allocator, where you genuinely can't tell which waiter to target.",
        },
      ],
    },
    {
      type: "matching",
      id: "cv-api-match",
      title: "Match the Condition Variable Concept",
      pairs: [
        { term: "wait(cv, lock)", def: "Atomically releases the lock and sleeps on the CV's queue; re-acquires the lock automatically before returning." },
        { term: "signal(cv)", def: "Wakes exactly one waiting thread, if any are waiting." },
        { term: "broadcast(cv)", def: "Wakes every thread currently waiting on the CV — the right call when you can't tell which single waiter should proceed." },
        { term: "while (!condition) wait(...)", def: "The only safe pattern: re-checks the condition after waking, protecting against both Mesa semantics and spurious wakeups." },
        { term: "A state variable (e.g. `done`)", def: "What actually lets a thread detect 'the event I cared about already happened before I started waiting' — without it, a signal sent too early is simply lost." },
        { term: "Covering condition", def: "A case where signal() can't target the right thread, so broadcast() conservatively wakes everyone, trading a few wasted wakeups for correctness." },
      ],
    },
  ],
};
