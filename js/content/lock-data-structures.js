export default {
  id: "lock-data-structures",
  icon: "🧱",
  title: "Lock-Based Data Structures",
  description: "Making counters, linked lists, queues, and hash tables thread-safe — and fast — by choosing where locks go.",
  readings: [
    { kind: "chapter", chapter: 29, title: "Lock-Based Concurrent Data Structures (§29.4 Hash Table marked optional in the Lecture 7 slides)", file: "threads-locks-usage.pdf" },
    { kind: "slides", title: "Lecture 7 — Lock-Based Data Structures (PreClass)", file: "TCSS 422 Lecture 7 Lock-based Data Structures - PreClass.pptx" },
    { kind: "slides", title: "Lecture 7 — Lock-Based Data Structures (AfterClass)", file: "TCSS 422 Lecture 7 Lock-based Data Structures - AfterClass.pptx" },
  ],
  notes: [
    {
      heading: "The default move: wrap the whole thing in one lock",
      body: "Making almost any data structure thread-safe starts the same way: acquire a lock at the top of every function that touches it, release it before every return. This is correct and usually the right first move — don't reach for anything fancier unless you've actually measured a performance problem. The three things worth evaluating about any locking scheme are correctness, performance, and lock granularity (how much of the structure one lock covers).",
    },
    {
      heading: "Counters don't scale for free",
      body: "A counter protected by a single lock is correct, but measured performance is ugly: on a real multi-core machine, having two threads each increment a shared counter a million times is dramatically slower than one thread doing two million increments alone. The goal you'd want is 'perfect scaling' — N times the cores gets you N times the throughput — and a single global lock is nowhere close.",
    },
    {
      heading: "The sloppy (approximate) counter",
      body: "The fix: give every CPU core its own local counter and local lock, plus one global counter with its own lock. Incrementing just bumps your core's local counter — no cross-core contention at all. Periodically (whenever a local counter hits a threshold S), that core's local value gets added into the global counter under the global lock, and the local counter resets to zero. Reading the counter only ever reads the (slightly stale) global value — it's 'approximate' by design. S is the whole tradeoff: small S keeps the global count nearly exact but adds overhead close to the naive version; large S is almost perfectly scalable but the global value can lag behind the true count by up to (number of cores × S).",
    },
    {
      heading: "Concurrent linked lists: keep the critical section small",
      body: "The naive version locks at the very top of insert()/lookup() and unlocks at every return path — including the error path if malloc() fails. That's a real problem: a large fraction of real-world OS bugs hide in exactly these rarely-exercised error paths, and forgetting to unlock before one of several possible returns is an easy mistake. The fix: do the parts that don't touch the shared list (like calling malloc()) with NO lock held at all, take the lock only around the few lines that actually read/write the shared head pointer, and restructure lookup to have a single exit point so there's only one place that needs to unlock.",
    },
    {
      heading: "Hand-over-hand locking: more granularity isn't automatically a win",
      body: "Instead of one lock for the whole list, you could give every individual node its own lock, and have a traversal grab the next node's lock before releasing the current one's ('hand-over-hand', a.k.a. lock coupling). This genuinely allows more concurrent traversals. In practice, though, the per-node lock acquire/release overhead on every single step tends to outweigh the benefit — it's rarely faster than just using one lock for the whole list, even with many threads and a long list.",
    },
    {
      heading: "The Michael & Scott two-lock queue",
      body: "A queue can do better than one big lock: use a separate head lock and tail lock, so enqueue (which only touches the tail) and dequeue (which only touches the head) don't contend with each other at all in the common case. The trick that makes this work is a dummy node allocated at initialization — it cleanly separates 'the thing the head lock protects' from 'the thing the tail lock protects' so the two ends genuinely don't need to touch the same memory.",
    },
    {
      heading: "Concurrent hash tables: just reuse the linked list, per bucket",
      body: "A hash table built from an array of buckets, where each bucket is one of the concurrent linked lists above, scales very well — because it gives every bucket its own lock instead of one lock for the entire table. Two threads hashing to different buckets can proceed fully in parallel. This is a simple, high-payoff pattern: pick the lock granularity to match how the data is naturally partitioned, rather than inventing something more exotic.",
    },
  ],
  blocks: [
    {
      type: "flashcards",
      id: "lds-flash",
      title: "Lock-Based Data Structures Vocabulary",
      cards: [
        { front: "Thread safe", back: "A data structure that behaves correctly when multiple threads call its operations concurrently — typically achieved by adding a lock around the operations that touch shared state." },
        { front: "Lock granularity", back: "How much of a data structure a single lock protects — one lock for the whole structure (coarse) vs. one lock per node/bucket/region (fine) vs. something in between." },
        { front: "Perfect scaling", back: "Getting an N× performance improvement from N× the hardware resources (e.g., cores). The benchmark gold standard that naive single-lock counters fall far short of." },
        { front: "Sloppy / approximate counter", back: "A counter built from one local counter+lock per CPU core plus a global counter+lock. Local increments need no cross-core synchronization; local values periodically flush into the global counter once they reach a threshold S." },
        { front: "Sloppiness threshold S — the tradeoff", back: "Small S: the global value stays close to exact, but overhead is high (frequent global-lock flushes). Large S: nearly perfect scalability, but the global value can be stale by up to (number of cores × S)." },
        { front: "Why minimize what's inside the lock in a linked list insert", back: "malloc() is already thread-safe on its own, so it doesn't need the list's lock at all — only the few lines that actually read/write the shared head pointer do. Keeping the locked region small also means fewer exit paths need an unlock call, which is exactly where real bugs tend to hide." },
        { front: "Hand-over-hand locking (lock coupling)", back: "Giving each node of a linked list its own lock; traversal acquires the next node's lock before releasing the current one's. More fine-grained concurrency in theory, but the per-node overhead usually makes it slower than a single lock in practice." },
        { front: "Michael & Scott concurrent queue", back: "A queue with separate head and tail locks (plus a dummy node to decouple the two ends), so enqueue and dequeue don't contend with each other in the common case." },
        { front: "Concurrent hash table (the simple, effective version)", back: "An array of buckets, each one a concurrent linked list with its own lock. Lock granularity matches the natural partitioning of the data, so unrelated keys never contend." },
      ],
    },
    {
      type: "ordering",
      id: "lds-counter-progression",
      title: "From Naive Counter to Scalable Counter",
      prompt: "Put these counter implementations in the order the chapter builds them up, from simplest to most scalable.",
      steps: [
        "A plain counter with no lock at all — fast, but not thread-safe",
        "The same counter with a single mutex around increment/decrement/get — correct, but scales poorly as more threads contend for the one lock",
        "A sloppy/approximate counter: one local counter+lock per CPU core, plus a global counter+lock",
        "Local counts periodically flush into the global counter (and reset to 0) once a local counter reaches the threshold S",
        "Reading the counter (get()) only reads the global value — accurate to within (cores × S), not exact",
      ],
    },
    {
      type: "quiz",
      id: "lds-quiz",
      title: "Lock-Based Data Structures Quiz",
      sampleSize: 6,
      questions: [
        {
          q: "Why does a single-lock counter perform so much worse with 2 threads than with 1, even though it's still correct?",
          options: [
            "It isn't actually correct with 2 threads",
            "Every increment now has to fight for the same single lock across cores, so the lock itself — not the increment — becomes the bottleneck",
            "C doesn't support multi-threaded integers",
            "The counter overflows with 2 threads",
          ],
          correctIndex: 1,
          explain: "The work being protected (counter++) is tiny compared to the cost of contending for a shared lock across cores — so as thread count goes up, time is dominated by lock contention, not useful work.",
        },
        {
          q: "In a sloppy (approximate) counter, what does a thread do when it wants to increment the value?",
          options: [
            "It locks the global counter directly and increments it",
            "It locks its own CPU's local counter and increments that — no global lock needed unless the local value just hit the threshold S",
            "It broadcasts the increment to every other thread",
            "It always increments both local and global counters at once",
          ],
          correctIndex: 1,
          explain: "The whole point is that the common case (a plain increment) only ever touches a per-core local lock, so threads on different cores never contend with each other — the global lock is only touched occasionally, when a local counter crosses the threshold.",
        },
        {
          q: "With a large sloppiness threshold S, what do you gain and what do you give up?",
          options: [
            "You gain exact accuracy and give up performance",
            "You gain near-perfect scalability, but get() may return a value that's stale by as much as (number of cores × S)",
            "You gain performance with no downside at all",
            "Large S makes the counter single-threaded",
          ],
          correctIndex: 1,
          explain: "A big threshold means local counters rarely need to touch the global lock (great for scaling), but it also means more local increments can pile up before being reflected in the global value that get() reads.",
        },
        {
          q: "In the naive concurrent linked list, why is it a real problem that the lock is acquired at the very top of insert() (before calling malloc())?",
          options: [
            "malloc() is not allowed to run inside a locked region, ever",
            "If malloc() fails, the error-handling path also has to remember to unlock before returning — exactly the kind of rarely-tested path where real bugs hide",
            "It makes insert() faster",
            "It has no real downside",
          ],
          correctIndex: 1,
          explain: "Since malloc() is already thread-safe on its own, it doesn't need the list's lock at all. Locking before it just adds an extra exit path (the malloc-failure path) that must also remember to release the lock — and research on real bug reports shows this exact pattern (unlocking in a rare error path) is a common source of bugs.",
        },
        {
          q: "What's the main practical downside of hand-over-hand (lock-coupling) linked lists, compared to one lock for the whole list?",
          options: [
            "They are not actually correct",
            "The overhead of acquiring/releasing a lock at every single node usually outweighs the extra concurrency they enable, so they're often not faster in practice",
            "They only work with exactly 2 threads",
            "They require no locks at all",
          ],
          correctIndex: 1,
          explain: "More fine-grained locking sounds strictly better, but every node-to-node handoff costs a lock acquire/release — in practice that per-step overhead tends to dominate, so a single list-wide lock is often just as fast or faster.",
        },
        {
          q: "What problem does the dummy node solve in the Michael & Scott two-lock queue?",
          options: [
            "It stores the actual first value in the queue",
            "It decouples the head and tail so the head lock and tail lock never need to touch the same memory, letting enqueue and dequeue run concurrently",
            "It prevents the queue from ever being empty",
            "It replaces the need for any locks",
          ],
          correctIndex: 1,
          explain: "Without a dummy node, an empty or single-item queue would have head and tail pointing at (or interacting with) the same node, forcing the two locks to coordinate. The dummy node keeps the head-side and tail-side operations cleanly separated.",
        },
        {
          q: "Why does a concurrent hash table built from per-bucket linked lists scale well?",
          options: [
            "Hash tables are always faster than linked lists",
            "Each bucket has its own lock, so operations on keys that hash to different buckets can proceed fully in parallel instead of contending for one table-wide lock",
            "It avoids using locks entirely",
            "It only works with a single thread",
          ],
          correctIndex: 1,
          explain: "The lock granularity matches how the data is naturally partitioned (by bucket), so unrelated keys never block each other — a simple, high-payoff design choice.",
        },
      ],
    },
    {
      type: "matching",
      id: "lds-technique-match",
      title: "Match the Technique to What It Solves",
      pairs: [
        { term: "Sloppy / approximate counter", def: "Makes a frequently-updated shared counter scale across cores, at the cost of the read value being only approximately accurate." },
        { term: "Minimizing the locked region in insert()/lookup()", def: "Avoids the bug-prone pattern of needing to unlock on every possible exit path, including rare error paths like a failed malloc()." },
        { term: "Hand-over-hand (lock-coupling) linked list", def: "Aims for more concurrent traversals via per-node locks — but usually loses to a single lock once per-node overhead is accounted for." },
        { term: "Michael & Scott two-lock queue (with dummy node)", def: "Lets enqueue and dequeue run concurrently by giving the head and tail completely separate locks." },
        { term: "Per-bucket locking in a hash table", def: "Lets operations on different keys proceed in parallel by matching lock granularity to the table's natural partitioning." },
      ],
    },
  ],
};
