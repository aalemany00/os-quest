export default {
  id: "concurrency-problems",
  icon: "⚠️",
  title: "Concurrency Problems",
  description: "The two kinds of non-deadlock bugs (atomicity and order violations), what deadlock actually requires, and how to prevent, avoid, or detect it.",
  readings: [
    { kind: "chapter", chapter: 32, title: "Common Concurrency Problems", file: "threads-bugs.pdf" },
    { kind: "slides", title: "Lecture 9 — Concurrency Problems (PreClass)", file: "TCSS 422 Lecture 9 Concurrency Problems - PreClass.pptx" },
  ],
  notes: [
    {
      heading: "Most concurrency bugs aren't deadlock",
      body: "A real-world study of MySQL, Apache, Mozilla, and OpenOffice (Lu et al., 2008) found 105 fixed concurrency bugs: 74 non-deadlock, 31 deadlock. Non-deadlock bugs are the majority, and 97% of THOSE are one of exactly two patterns: atomicity violations and order violations. Knowing these two patterns by name is most of the battle for spotting them in real code.",
    },
    {
      heading: "Atomicity violation — a check and a use that should be one step",
      body: "MySQL bug: Thread 1 runs `if (thd->proc_info) fputs(thd->proc_info, ...);` while Thread 2 runs `thd->proc_info = NULL;`. The programmer assumed the check and the use would happen as one atomic unit — but if Thread 2's NULL-assignment lands in the gap between Thread 1's check and its use, Thread 1 dereferences a NULL pointer and crashes. Formally: 'the desired serializability among multiple memory accesses is violated — a code region is intended to be atomic, but the atomicity is not enforced.' The fix is exactly what you'd expect: wrap both the check-and-use in Thread 1 and the assignment in Thread 2 with the SAME lock.",
    },
    {
      heading: "Order violation — a desired order that isn't enforced",
      body: "Mozilla bug: Thread 1 runs `mThread = PR_CreateThread(mMain, ...);`; Thread 2's `mMain()` immediately reads `mThread->State`. The programmer assumed Thread 1's assignment would always happen before Thread 2's read — but if Thread 2 runs first, `mThread` is still NULL and it crashes. Formally: 'the desired order between two (groups of) memory accesses is flipped — A should always execute before B, but the order is not enforced.' The fix is NOT a lock (a lock only gives mutual exclusion, not ordering) — it's a condition variable plus an explicit state flag (e.g. `mtInit`), with Thread 2 doing `while (mtInit == 0) pthread_cond_wait(&mtCond, &mtLock);` before it touches `mThread`.",
    },
    {
      heading: "Deadlock: the simplest case",
      body: "Thread 1 does `lock(L1); lock(L2);` while Thread 2 does `lock(L2); lock(L1);`. If Thread 1 grabs L1 and then a context switch happens before it gets L2, and Thread 2 grabs L2 and then wants L1 — both threads now wait forever for a lock the other one holds. Deadlock exists among a set of processes/threads if every one of them is waiting for an event (here, a lock release) that only another member of the set can cause. The dependency graph has a CYCLE — that cycle is the signature of deadlock.",
    },
    {
      heading: "Why deadlock happens even to careful programmers",
      body: "Two realistic causes beyond simple carelessness: (1) large codebases have deep, hidden cross-component dependencies (the VM system needs the file system to page in a block; the file system needs memory from the VM system to hold it) that aren't obvious locally. (2) Encapsulation actively hides locking order: Java's `Vector.AddAll()` must lock both vectors internally; `v1.AddAll(v2)` locks v1 then v2, but a concurrent `v2.AddAll(v1)` locks v2 then v1 — a deadlock that's invisible from either call site, because neither caller can see the other's lock order.",
    },
    {
      heading: "The four conditions — ALL of them are required",
      body: "(1) Mutual exclusion — a resource can be held by only one thread at a time. (2) Hold-and-wait — a thread holds a resource it already has while waiting for another. (3) No preemption — a resource can't be forcibly taken away from the thread holding it. (4) Circular wait — a cycle of threads, each holding something the next one in the cycle wants. Break ANY single one of these four and deadlock becomes impossible — which is exactly how each prevention technique works: each one targets exactly one condition.",
    },
    {
      heading: "Prevention, one condition at a time",
      body: "Attack mutual exclusion: eliminate locks altogether (use processes instead of threads, like Chrome's one-process-per-tab model — crashes stay isolated), or build lock-free data structures from atomic instructions like TestAndSet. Attack hold-and-wait: acquire every lock you'll need atomically up front, behind one big 'guard lock' — correct, but it collapses concurrency back down, since it's really just one giant critical section. Attack no preemption: use `pthread_mutex_trylock()` (try once, fail immediately if unavailable) or `pthread_mutex_timedlock()` (try, but give up after a timeout) instead of a blocking lock — if you can't get everything you need, back off and release what you already hold. Attack circular wait: impose a single total ORDER on lock acquisition everywhere in the program (always L1 before L2 before L3, never any other order, anywhere) — this is the most practical and most commonly used of the four.",
    },
    {
      heading: "Avoidance: a scheduler that already knows the lock plan",
      body: "If the scheduler knows in advance which locks each thread will need, it can choose a RUN ORDER that simply never creates the dangerous overlap — e.g. never co-schedule two threads that each want a lock the other will be holding. This avoids deadlock without touching the locking code at all, but it requires global knowledge of every thread's future lock usage, which is rarely available in practice — it mostly matters for highly specialized or safety-critical schedulers.",
    },
    {
      heading: "Detect and recover: just let it happen occasionally",
      body: "Instead of preventing deadlock, periodically build a resource-allocation graph (who holds what, who's waiting for what) and check it for cycles. No cycle = no deadlock. If a cycle IS found, the system preempts a resource — forcibly takes it from one of the deadlocked processes to break the cycle (or in the extreme case, just reboots). This trades a (hopefully rare) disruptive recovery for not having to restrict every lock in the system. Many real database systems use exactly this strategy, since full prevention can be too restrictive for their workloads. Checking is expensive (it means walking the whole graph of processes and resources), so it's run only as often as the actual deadlock risk and cost justify.",
    },
  ],
  blocks: [
    {
      type: "flashcards",
      id: "cp-flash",
      title: "Concurrency Problems Vocabulary",
      cards: [
        { front: "Atomicity violation", back: "A code region was intended to execute as one atomic unit (e.g. check-then-use of a shared variable), but another thread's access lands in the middle, breaking the assumption. Fixed by wrapping the whole region in one lock." },
        { front: "Order violation", back: "A desired order between two memory accesses (A must happen before B) isn't enforced, so B can run before A ever happens. A lock alone can't fix this — it needs a condition variable + state flag to actually enforce the order." },
        { front: "Deadlock", back: "Exists among a set of threads/processes when every one of them is waiting for an event (e.g. a lock release) that only another member of the set can cause — the dependency graph has a cycle." },
        { front: "The 4 conditions for deadlock (all required)", back: "Mutual exclusion, hold-and-wait, no preemption, circular wait. Breaking even one of the four makes deadlock impossible." },
        { front: "Mutual exclusion (deadlock condition)", back: "A resource can be held by only one thread at a time (e.g. a lock)." },
        { front: "Hold-and-wait (deadlock condition)", back: "A thread holds a resource it already has while waiting to acquire another." },
        { front: "No preemption (deadlock condition)", back: "A resource can't be forcibly taken away from the thread currently holding it." },
        { front: "Circular wait (deadlock condition)", back: "A cycle of threads, each holding a resource the next thread in the cycle is waiting for." },
        { front: "Prevention via total lock ordering", back: "Always acquire locks in the same global order everywhere in the program (e.g. always L1 before L2 before L3) — the most practical way to eliminate circular wait." },
        { front: "pthread_mutex_trylock()", back: "Tries to acquire a lock once and returns immediately (success or failure) instead of blocking — lets a thread back off and release what it holds rather than deadlock (attacks 'no preemption')." },
        { front: "Guard lock (hold-and-wait prevention)", back: "Acquire ALL the locks you'll need for an operation atomically, behind one big lock — correct, but reduces the whole operation back to one large critical section, hurting concurrency." },
        { front: "Deadlock avoidance (scheduler-based)", back: "If the scheduler knows in advance which locks each thread needs, it can choose a run order that never creates the dangerous overlap — avoids deadlock without changing any locking code, but needs full advance knowledge of lock usage." },
        { front: "Deadlock detect-and-recover", back: "Periodically check the resource-allocation graph for a cycle; if found, preempt a resource (or reboot) to break it. Used by many real database systems instead of strict prevention." },
        { front: "Resource-allocation graph", back: "A graph showing which process holds which resource and which process is waiting for which resource. A CYCLE in this graph means deadlock." },
      ],
    },
    {
      type: "matching",
      id: "cp-prevention-match",
      title: "Match the Prevention Technique to the Condition It Attacks",
      pairs: [
        { term: "Use processes instead of threads, or lock-free atomic instructions", def: "Attacks mutual exclusion — eliminates the exclusively-held lock altogether." },
        { term: "One big 'guard lock' around all needed locks", def: "Attacks hold-and-wait — acquires everything atomically up front, at the cost of concurrency." },
        { term: "pthread_mutex_trylock() / timedlock()", def: "Attacks no preemption — lets a thread back off instead of blocking forever when it can't get a lock." },
        { term: "A single total ordering on all lock acquisition", def: "Attacks circular wait — the most practical and commonly used prevention technique." },
        { term: "Resource-allocation graph + cycle check", def: "Not prevention at all — this is detect-and-recover, done periodically instead of restricting locking up front." },
      ],
    },
    {
      type: "ordering",
      id: "cp-atomicity-order",
      title: "The MySQL Atomicity-Violation Bug, Step by Step",
      prompt: "Put these steps in the order that produces the crash.",
      steps: [
        "Thread 1 checks: if (thd->proc_info) is true, so it proceeds toward the fputs() call",
        "Thread 1 is interrupted before it actually calls fputs()",
        "Thread 2 runs and sets thd->proc_info = NULL;",
        "Thread 1 resumes and calls fputs(thd->proc_info, ...) — but proc_info is now NULL",
        "fputs() dereferences a NULL pointer and crashes",
      ],
    },
    {
      type: "quiz",
      id: "cp-quiz",
      title: "Concurrency Problems Quiz",
      sampleSize: 6,
      questions: [
        {
          q: "According to the Lu et al. study of MySQL/Apache/Mozilla/OpenOffice, what's true of the concurrency bugs they found?",
          options: [
            "Almost all of them were deadlock bugs",
            "Non-deadlock bugs (74) outnumbered deadlock bugs (31), and 97% of the non-deadlock bugs were atomicity or order violations",
            "Only Mozilla had any concurrency bugs at all",
            "Deadlock and non-deadlock bugs were exactly equal in number",
          ],
          correctIndex: 1,
          explain: "105 total bugs: 74 non-deadlock, 31 deadlock — non-deadlock bugs are the majority, and the study found that atomicity and order violations account for 97% of the non-deadlock category.",
        },
        {
          q: "In the MySQL proc_info example, Thread 1 checks `if (thd->proc_info)` then calls `fputs(thd->proc_info, ...)`, while Thread 2 sets `thd->proc_info = NULL;`. What kind of bug is this?",
          options: [
            "An order violation — Thread 2 should run before Thread 1",
            "An atomicity violation — the check and the use were meant to happen as one atomic step, but Thread 2 can slip in between them",
            "A deadlock — both threads are waiting for each other",
            "Not a bug at all — this is correct code",
          ],
          correctIndex: 1,
          explain: "The programmer's implicit assumption was that checking non-NULL and then using the value would happen atomically. Without a lock around both operations, Thread 2 can set the field to NULL in the gap, and Thread 1 crashes.",
        },
        {
          q: "Why can't a plain mutex lock fix an order-violation bug like Thread 2 reading `mThread->State` before Thread 1 has created `mThread`?",
          options: [
            "Locks don't exist yet at this point in the course",
            "A lock only guarantees mutual exclusion (one thread at a time), not that one specific access happens before another — ordering needs a condition variable plus a state flag",
            "Locks only work for exactly two threads",
            "It can — any lock would fix this",
          ],
          correctIndex: 1,
          explain: "Mutual exclusion says nothing about WHICH thread goes first. The fix the textbook uses is a condition variable with an explicit state flag (mtInit), so Thread 2 can wait specifically for Thread 1's initialization to have already happened.",
        },
        {
          q: "Thread 1 runs lock(L1); lock(L2); and Thread 2 runs lock(L2); lock(L1);. Which deadlock condition would be eliminated by always acquiring locks in the same global order everywhere in the program?",
          options: [
            "Mutual exclusion",
            "Hold-and-wait",
            "Circular wait",
            "No preemption",
          ],
          correctIndex: 2,
          explain: "A consistent global lock order (e.g. always L1 before L2) means no cycle of 'waiting for the next thread's lock' can ever form — that's exactly the circular-wait condition, and it's the one total lock ordering targets.",
        },
        {
          q: "What does pthread_mutex_trylock() let a thread do that a normal blocking lock() call doesn't, and which deadlock condition does this attack?",
          options: [
            "It lets the thread skip acquiring the lock entirely; attacks mutual exclusion",
            "It lets the thread find out immediately if the lock is unavailable and back off (e.g. release what it already holds) instead of blocking forever; attacks no preemption",
            "It automatically resolves any deadlock that has already occurred",
            "It guarantees the thread gets the lock within 1 second",
          ],
          correctIndex: 1,
          explain: "trylock() returns immediately whether it succeeded or not. A thread that fails to get a second lock can choose to release the first one and retry, rather than holding it and blocking forever — this is what lets a thread avoid the 'no preemption' trap on itself.",
        },
        {
          q: "What does a cycle in a resource-allocation graph indicate, and what's the typical response in a detect-and-recover system?",
          options: [
            "Nothing — cycles are normal and ignored",
            "It indicates deadlock; the system preempts a resource (forces a process to release it) to break the cycle",
            "It indicates a data race, fixed by adding a lock",
            "It means a process has too many open files",
          ],
          correctIndex: 1,
          explain: "A cycle in the resource-allocation graph is the formal signature of deadlock — every process in the cycle is waiting on the next one. Detection periodically checks for this and, if found, preempts a resource to force the cycle open.",
        },
      ],
    },
  ],
};
