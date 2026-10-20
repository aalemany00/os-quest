export default {
  id: "intro",
  icon: "🧭",
  title: "Introduction to OS",
  description: "What an OS is, virtualization, concurrency, and persistence — the three big themes of the course.",
  blocks: [
    {
      type: "flashcards",
      id: "intro-flash",
      title: "Core Vocabulary",
      cards: [
        { front: "Operating System (OS)", back: "The body of software in charge of making the system operate correctly and efficiently in an easy-to-use manner. Lecture slide's casual version: 'All the code that you didn't have to write to implement your app.'" },
        { front: "Virtualization", back: "The OS takes a physical resource (CPU, memory, disk) and transforms it into a more general, powerful, easy-to-use virtual form — which is why the OS is sometimes called a 'virtual machine.'" },
        { front: "Virtualization mapping (exact)", back: "CPU → Processes and/or Threads. Memory → Address Space. Disk → Files. Network card → Sockets (a common trick distractor pairs the network card with 'address space' — that's wrong, address space is memory's abstraction)." },
        { front: "System call", back: "The interface (API) applications use to invoke OS services — a typical OS exports a few hundred of them. This is also why the OS is sometimes called a 'standard library.'" },
        { front: "Mechanism vs. Policy", back: "Mechanism = the low-level method/protocol that implements a needed piece of functionality (answers 'how', e.g. how a context switch works). Policy = the algorithm for making a decision (answers 'which', e.g. which process to run next). Separating them is a core modularity principle." },
        { front: "Trap / trap handler / return-from-trap", back: "A system call transfers control into the OS via a trap instruction while simultaneously raising hardware privilege. The hardware jumps to a pre-registered trap handler running in kernel mode; return-from-trap reverts to user mode and resumes the application." },
        { front: "User mode vs. kernel mode", back: "User mode restricts what applications can do directly (no disk I/O, no arbitrary physical memory access, no raw network packets). Kernel mode has full hardware access." },
        { front: "Batch processing → Multiprogramming → Time sharing", back: "Batch: a human operator ran jobs one at a time. Multiprogramming: load several jobs into memory and switch rapidly between them to overlap I/O wait with computation. Time sharing: the modern model where many users/programs seemingly run simultaneously." },
        { front: "Design goals (exact)", back: "Abstraction (ease of use), High performance (minimize overhead), Protection/Isolation (a buggy or malicious program can't corrupt another program or the OS), Reliability (non-stop operation) — plus energy-efficiency, security, and mobility as secondary goals." },
        { front: "volatile (C keyword) — common misconception", back: "volatile is only a compiler hint that prevents a variable from being aggressively optimized/cached in a register. It does NOT prevent race conditions and does NOT make an operation like counter++ atomic." },
      ],
    },
    {
      type: "quiz",
      id: "intro-quiz",
      title: "Big Picture Quiz",
      questions: [
        {
          q: "Which virtualization pairing is WRONG?",
          options: [
            "CPU → Processes and/or Threads",
            "Memory → Address Space",
            "Disk → Files",
            "Network card → Address Space",
          ],
          correctIndex: 3,
          explain: "The network card virtualizes to sockets, not 'address space' — address space is memory's abstraction. This exact wrong pairing is a known distractor from the Lecture 1-2 review exercise.",
        },
        {
          q: "Running two separate copies of mem.c (each does malloc(sizeof(int)) and increments it in a loop), both processes print the SAME address, e.g. 0x200000 — yet their printed values increment independently. Why?",
          options: [
            "It's a bug — this should never happen",
            "Each process has its own private virtual address space, which the OS maps onto different physical memory",
            "The two processes are actually sharing the same physical memory location",
            "malloc() always returns the same address on purpose for debugging",
          ],
          correctIndex: 1,
          explain: "Virtual address ≠ physical address. The OS gives each process its own address space, so identical virtual addresses across processes never collide in physical memory.",
        },
        {
          q: "Two threads each run `counter++` 100,000 times on a shared counter starting at 0. The final result is 143012 instead of the expected 200000. Why?",
          options: [
            "counter++ is non-atomic — it compiles to a load, increment, and store, and the two threads' instructions can interleave, losing updates",
            "Integer overflow",
            "The compiler optimized the loop away",
            "100,000 is too large a number for an int",
          ],
          correctIndex: 0,
          explain: "This is the exact threads.c example from the course: loops=1000 reliably gives 2000, but loops=100000 gives nondeterministic wrong answers (e.g. 143012, then 137298 on a rerun) because of the lost-update race condition.",
        },
        {
          q: "\"A buggy or malicious user program must not be able to corrupt another program or the OS itself.\" Which OS design goal is this?",
          options: ["Abstraction", "Reliability", "Protection / Isolation", "Energy efficiency"],
          correctIndex: 2,
          explain: "This is the Protection/Isolation design goal, called out explicitly in both the textbook and the Lecture 1-2 review exercise.",
        },
        {
          q: "What is a system call, fundamentally?",
          options: [
            "A function call between two user-level libraries",
            "A protected, controlled transfer of control AND privilege into the OS, via a trap instruction",
            "A call made only when the computer boots up",
            "A direct jump into kernel memory with no checks",
          ],
          correctIndex: 1,
          explain: "A system call differs from an ordinary procedure call in two ways at once: it transfers control into the OS, and it simultaneously raises the hardware privilege level to kernel mode — safely, because it can only jump to handlers the OS pre-registered at boot.",
        },
      ],
    },
  ],
};
