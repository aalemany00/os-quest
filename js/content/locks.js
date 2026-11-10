export default {
  id: "locks",
  icon: "🔒",
  title: "Locks",
  description: "Building mutual exclusion from the ground up: disabling interrupts, spin locks, test-and-set, compare-and-swap, and fairness with ticket locks.",
  readings: [
    { kind: "chapter", chapter: 28, title: "Locks — Lecture 6 covers §28.1–28.11 (interrupts through fetch-and-add/ticket locks); the Lecture 6 slides mark §28.9–28.10 (CAS, load-linked/store-conditional) as optional extra reading", file: "threads-locks.pdf" },
    { kind: "slides", title: "Lecture 6 — Locks (PreClass)", file: "TCSS 422 Lecture 6 Locks - PreClass.pptx" },
    { kind: "slides", title: "Lecture 6 — Locks (AfterClass)", file: "TCSS 422 Lecture 6 Locks - AfterClass.pptx" },
    { kind: "code", title: "Sample Codes of Lecture 6 (pthread_mutex.c, pthread_spin.c, pthread_spin_testandset.c)", file: "Sample Codes of Lecture 6/" },
  ],
  notes: [
    {
      heading: "A lock is just a variable with two operations",
      body: "lock_t mutex; acquire() waits until the lock is free, then takes it to enter a critical section; release() gives it up on the way out, waking anyone waiting. A lock is either available (unlocked/free) or acquired (locked/held) — and while held, that thread is the owner. acquire() does not return until any previous holder has called release(). POSIX calls this a mutex (short for mutual exclusion): pthread_mutex_lock(&lock); ... pthread_mutex_unlock(&lock);",
    },
    {
      heading: "Coarse-grained vs. fine-grained locking",
      body: "Coarse-grained: one big lock protects every critical section in the program — simple, but serializes unrelated work. Fine-grained: different locks protect different data structures, so threads touching unrelated data don't block each other. Fine-grained buys concurrency at the cost of complexity — and the risk of deadlock if two locks are ever acquired in inconsistent orders.",
    },
    {
      heading: "What makes a lock good: safety, liveness, performance",
      body: "Mutual exclusion (safety) — nothing bad happens: never two threads in the critical section at once. Progress and bounded waiting (liveness) — something good eventually happens: a thread not in the critical section can't block others from entering, and a thread in it eventually leaves. Fairness — do contending threads get a reasonable shot at the lock, or can one starve forever? Performance — the overhead of acquiring/releasing should be small relative to the work it protects. Rule of thumb: worry about safety first, but don't forget liveness.",
    },
    {
      heading: "Why disabling interrupts doesn't work as a general lock",
      body: "The earliest single-processor trick: lock() disables interrupts, unlock() re-enables them, so the critical section can't be preempted. It fails for real use: (1) it requires trusting every thread with a privileged instruction — a greedy or buggy thread that never re-enables interrupts can hang the whole machine; (2) it does nothing on a multiprocessor, since interrupts are only disabled on the core that executed the instruction — threads on other cores can still enter the critical section; (3) disabling interrupts for too long risks losing interrupts entirely (e.g. a completed disk I/O never gets noticed).",
    },
    {
      heading: "A single flag variable isn't enough either",
      body: "lock() spins while flag==1, then sets flag=1; unlock() sets flag=0. This fails because the test (while) and the set (flag=1) are two separate instructions, not one atomic step: an interrupt can land right between them, letting two threads both see flag==0, both fall out of the loop, and both set flag=1 — no mutual exclusion at all. (It's also wasteful: spin-waiting burns CPU cycles doing nothing.) The fix needs those two steps combined into one atomic hardware instruction.",
    },
    {
      heading: "Test-and-set: the hardware primitive that actually works",
      body: "TestAndSet(old_ptr, new): atomically records the old value, stores new into the location, and returns the old value — all as one indivisible step (hardware guarantees it, e.g. x86's locked xchg). lock() becomes: while (TestAndSet(&flag, 1) == 1) ; — spin while the old value was already 1 (held); the instant it returns 0, that same atomic call has just set flag to 1, so the caller owns the lock. Because test and set can no longer be split by an interrupt, two threads can never both win.",
    },
    {
      heading: "Compare-and-swap generalizes test-and-set",
      body: "CompareAndSwap(ptr, expected, new): if *ptr == expected, atomically set *ptr = new; either way, return the original value — so the caller can tell whether it succeeded. A lock built on it: while (CompareAndSwap(&flag, 0, 1) == 1) ; spin. Behaves identically to the test-and-set spin lock, but CAS is more powerful and shows up later for lock-free data structures, since it can check a value hasn't changed before committing an update.",
    },
    {
      heading: "Spin locks: correct, but not fair, and sometimes wasteful",
      body: "Correctness: yes — a test-and-set/CAS spin lock does guarantee mutual exclusion. Fairness: no guarantee at all — a spinning thread can in principle starve forever, since nothing forces the lock holder to ever give up the CPU to a particular waiter. Performance: fine across multiple CPUs with light contention (the wait is usually short), but painful on a single CPU — if the lock holder is preempted mid-critical-section, every other thread burns a full time slice spinning uselessly before giving up the CPU.",
    },
    {
      heading: "Giving up the CPU instead of spinning",
      body: "A thread that fails to acquire the lock can call yield() to voluntarily give up its timeslice instead of spinning. This avoids wasting a full quantum of CPU on busy-waiting, but it isn't free (context-switch cost) and still provides no starvation guarantee — a thread could be picked last again and again.",
    },
    {
      heading: "Fetch-and-add and the ticket lock: fairness, finally",
      body: "FetchAndAdd(ptr): atomically increments *ptr and returns its old value. A ticket lock keeps two counters, ticket and turn. lock() calls myturn = FetchAndAdd(&ticket) to grab a unique, strictly-increasing ticket number, then spins while turn != myturn. unlock() does turn++, letting exactly the next ticket-holder in. Because tickets are handed out in order and served in order, every thread is guaranteed to eventually get served (progress for all) — unlike plain test-and-set, where an unlucky spinner could in theory be skipped forever.",
    },
  ],
  blocks: [
    {
      type: "flashcards",
      id: "locks-vocab-flash",
      title: "Locks Vocabulary",
      cards: [
        { front: "Lock / mutex", back: "An object in memory with two operations, acquire() and release() (POSIX calls it a mutex). Between acquire and release the calling thread 'holds' or 'owns' the lock; acquire() does not return until any previous holder releases." },
        { front: "Coarse-grained locking", back: "One big lock protects every critical section in the program, no matter what data it touches." },
        { front: "Fine-grained locking", back: "Different locks protect different data/data structures, allowing more threads to run concurrently — at the cost of more complexity and deadlock risk." },
        { front: "Safety property (for locks)", back: "'Nothing bad happens' — mutual exclusion: only one thread in the critical section at a time." },
        { front: "Liveness property (for locks)", back: "'Something good eventually happens' — progress (a thread outside the C.S. can't block others from entering; a thread inside it eventually leaves) and bounded waiting (no starvation)." },
        { front: "Why disabling interrupts fails as a general-purpose lock", back: "Requires trusting arbitrary threads with a privileged instruction; does nothing on a multiprocessor (interrupts are disabled per-core only); can cause lost interrupts if held too long." },
        { front: "Why a plain flag variable (load/store only) isn't a working lock", back: "Testing the flag and setting it are two separate instructions; an interrupt between them lets two threads both see the lock free and both acquire it." },
        { front: "TestAndSet(old_ptr, new)", back: "Atomically: records the old value at old_ptr, stores new into it, and returns the old value. Hardware guarantees it can't be split by an interrupt." },
        { front: "Spin lock", back: "A lock built from an atomic instruction (e.g. test-and-set) where a waiting thread repeatedly re-checks ('spins on') the lock variable instead of sleeping." },
        { front: "CompareAndSwap(ptr, expected, new)", back: "Atomically: if *ptr == expected, set *ptr = new; always returns the original value, so the caller can detect success. More powerful than test-and-set; used later for lock-free structures." },
        { front: "FetchAndAdd(ptr)", back: "Atomically increments *ptr and returns its OLD value. Used to hand out strictly increasing 'ticket' numbers fairly." },
        { front: "Ticket lock", back: "A lock using a ticket counter (incremented via fetch-and-add) and a turn counter. A thread spins until turn == its own ticket; unlock() does turn++. Guarantees every thread is eventually served — no starvation." },
        { front: "Spin lock correctness vs. fairness", back: "Test-and-set/CAS spin locks ARE correct (true mutual exclusion) but provide NO fairness guarantee — a spinning thread could in principle starve forever." },
        { front: "Why spinning is especially wasteful on a single CPU", back: "If the lock holder is preempted inside the critical section, every other thread spins for a full timeslice before giving up the CPU — burning cycles while the actual lock holder isn't even running." },
      ],
    },
    {
      type: "ordering",
      id: "locks-history-order",
      title: "The Historical Path to a Working Lock",
      prompt: "Put these lock-building attempts in the order the course (and OSTEP Ch. 28) presents them, from earliest/weakest to the fairness-guaranteeing solution.",
      steps: [
        "Disabling interrupts around the critical section (works only on a single CPU, requires trusting every thread)",
        "A single flag variable with plain loads/stores (while(flag==1); flag=1;) — fails because test-then-set isn't atomic",
        "A spin lock built on the atomic TestAndSet instruction — correct mutual exclusion, but no fairness",
        "A spin lock built on CompareAndSwap — equivalent correctness to test-and-set, more general instruction",
        "A ticket lock built on FetchAndAdd (ticket + turn counters) — adds a fairness/no-starvation guarantee",
      ],
    },
    {
      type: "quiz",
      id: "locks-quiz",
      title: "Building Locks Quiz",
      questions: [
        {
          q: "Why can't a lock be implemented correctly using only a plain flag variable checked with `while (flag == 1);` followed by `flag = 1;`?",
          options: [
            "C doesn't allow global int variables to be shared between threads",
            "The test (checking flag) and the set (flag = 1) are two separate, non-atomic instructions — an interrupt between them can let two threads both see flag==0 and both proceed",
            "It works fine; the real problem is that it's slow",
            "flag must be declared as a pthread_mutex_t, not an int",
          ],
          correctIndex: 1,
          explain: "Exactly the Figure 28.1/28.2 failure mode from the textbook: without a single atomic instruction combining test-and-set, an untimely interrupt lets both threads fall through the while loop before either sets the flag, destroying mutual exclusion.",
        },
        {
          q: "Why does disabling interrupts fail as a general-purpose locking mechanism on modern systems?",
          options: [
            "It is actually a perfectly good general solution",
            "It requires trusting arbitrary threads with a privileged operation, and does nothing on a multiprocessor since interrupts are only disabled on the executing core",
            "Interrupts cannot be disabled in software at all",
            "It only works for I/O-bound threads",
          ],
          correctIndex: 1,
          explain: "A greedy or buggy thread could disable interrupts and never re-enable them, hanging the machine; and on a multiprocessor, disabling interrupts on one core doesn't stop threads on other cores from entering the same critical section.",
        },
        {
          q: "What does the hardware instruction TestAndSet(old_ptr, new) do?",
          options: [
            "It only tests the value without changing it",
            "It atomically records the old value at old_ptr, stores `new` into it, and returns the old value — as one indivisible step",
            "It sets the value only if no other thread is currently running",
            "It is a software-only function with no hardware support",
          ],
          correctIndex: 1,
          explain: "The key is atomicity: test (read old value) and set (write new value) happen as a single hardware-guaranteed step, so no interrupt can land between them.",
        },
        {
          q: "A thread is spinning on a test-and-set based spin lock. Which property does this lock guarantee, and which does it NOT guarantee?",
          options: [
            "Guarantees fairness, not mutual exclusion",
            "Guarantees mutual exclusion (correctness), but provides no fairness guarantee — a waiter could in principle starve",
            "Guarantees both mutual exclusion and fairness",
            "Guarantees neither",
          ],
          correctIndex: 1,
          explain: "Spin locks built on test-and-set (or compare-and-swap) are correct — only one thread ever holds the lock — but nothing forces the current holder to ever yield to a particular waiting thread, so there's no bound on how long a thread might spin.",
        },
        {
          q: "How does a ticket lock (built on FetchAndAdd) improve on a plain test-and-set spin lock?",
          options: [
            "It uses less memory",
            "It guarantees progress for every thread: tickets are handed out and served in strict order, so no thread can be skipped forever",
            "It doesn't require any spinning at all",
            "It only works on a single CPU",
          ],
          correctIndex: 1,
          explain: "Each thread grabs a strictly increasing ticket number via FetchAndAdd, then waits for the shared turn counter to match it. Since turn only ever increments by one at a time, every ticket holder is guaranteed to eventually be served — unlike plain test-and-set, where the next lock winner is unpredictable.",
        },
        {
          q: "Why is coarse-grained (one big lock) locking sometimes undesirable compared to fine-grained locking?",
          options: [
            "Coarse-grained locking is always faster, so it's never undesirable",
            "A single lock around all critical sections serializes threads even when they're touching completely unrelated data, limiting concurrency",
            "Coarse-grained locking cannot provide mutual exclusion",
            "Fine-grained locking never risks deadlock, so it's strictly better",
          ],
          correctIndex: 1,
          explain: "One big lock is simple but pessimistic — two threads touching unrelated data structures still block each other. Fine-grained locking (separate locks per data structure) allows more concurrency, though at the cost of extra complexity and the risk of deadlock if lock-acquisition order isn't consistent.",
        },
      ],
    },
    {
      type: "matching",
      id: "locks-primitive-match",
      title: "Match the Primitive to What It Guarantees",
      pairs: [
        { term: "Disabling interrupts", def: "Blocks preemption on a single core only; fails on multiprocessors and risks lost interrupts — not a general solution." },
        { term: "Plain flag (load/store)", def: "Not atomic: test-then-set can be split by an interrupt, so two threads can both acquire the lock." },
        { term: "TestAndSet", def: "Atomically tests and sets a value in one instruction; builds a correct but unfair spin lock." },
        { term: "CompareAndSwap", def: "Atomically updates a value only if it still matches an expected value; as powerful as test-and-set, and more — used for lock-free code." },
        { term: "FetchAndAdd + ticket/turn counters", def: "Hands out ordered tickets so every waiting thread is eventually served — adds fairness that test-and-set alone lacks." },
      ],
    },
  ],
};
