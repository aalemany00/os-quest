export default {
  id: "intro",
  icon: "🧭",
  title: "Introduction to OS",
  description: "What an OS is, virtualization, concurrency, and persistence — the three big themes of the course.",
  readings: [
    { kind: "chapter", chapter: 2, title: "Introduction to Operating Systems", file: "intro.pdf" },
    { kind: "slides", title: "Lecture 1 — Introduction (PreClass)", file: "TCSS 422 Lecture 1 Introduction - PreClass.pptx" },
    { kind: "slides", title: "Lecture 1 — Introduction (AfterClass)", file: "TCSS 422 Lecture 1 Introduction - AfterClass.pptx" },
  ],
  notes: [
    {
      heading: "What an OS actually does",
      body: "An operating system sits between your programs and the physical hardware. Its job is to take a messy, limited physical resource — a CPU, a chunk of memory, a disk — and turn it into something easier and safer to use. Run `./cpu A` and `./cpu B` at the same time and each one acts like it owns the whole processor; run two copies of a program that each allocate memory and each will see their own private address space, even if they happen to print the exact same-looking address. Neither program can see this illusion from the inside — that's the point. The OS is the thing doing the illusion-making underneath.",
    },
    {
      heading: "Virtualization, in one mapping",
      body: "The course keeps coming back to one mapping: the CPU gets virtualized into processes and/or threads, memory gets virtualized into an address space per process, and the disk gets virtualized into files. A network card, by the same logic, gets virtualized into sockets — not into 'another address space,' which is a common mix-up on exams, since address space is specifically what memory virtualizes into.",
    },
    {
      heading: "System calls: asking the OS nicely",
      body: "A regular program can't just reach out and touch the disk or the network directly — that would make it trivial for one buggy or malicious program to wreck everything else running on the machine. Instead, it has to ask the OS to do it on its behalf, through a system call. Mechanically, a system call is a special trap instruction: it jumps into a kernel-mode handler that the OS registered back at boot time, does the privileged work, and then jumps back to exactly where the program left off. This is also why people sometimes describe the OS as 'a standard library you didn't have to write' — it's a few hundred of these entry points, covering everything from reading a file to creating a new process.",
    },
    {
      heading: "User mode vs. kernel mode",
      body: "The hardware itself enforces this boundary — it isn't just a polite convention. In user mode, a long list of operations are physically disabled: a program can't issue raw I/O instructions, can't touch arbitrary physical memory, can't do much of anything dangerous. Kernel mode lifts all of those restrictions. The ONLY way to get from one to the other safely is through the trap mechanism above, jumping to code the OS itself put there — never to an arbitrary address a user program points at.",
    },
    {
      heading: "A short history: batch → multiprogramming → time-sharing",
      body: "Early machines ran in batches: an operator physically loaded one job, let it run start to finish, then loaded the next. That wastes the CPU anytime a job is waiting on something slow, like I/O. Multiprogramming fixed that by keeping several jobs in memory at once, so the OS could switch to a different one whenever the current one blocked. Time-sharing pushed this further into something interactive — many users and programs all appearing to run at once, which is the model every modern OS uses.",
    },
    {
      heading: "Mechanism vs. policy — a theme for the whole course",
      body: "This distinction shows up constantly from here on: a mechanism is the low-level machinery for doing something (how do you actually save and restore a process's registers during a context switch?), while a policy is the higher-level decision about how to use that machinery (which process should run next?). Keeping these separate means you can swap out a scheduling algorithm without touching the context-switch code at all.",
    },
    {
      heading: "Why this matters for concurrency (a preview)",
      body: "Two threads sharing a counter and each doing `counter++` a small number of times will reliably get the right answer; crank the iteration count way up and the answer starts coming out wrong, and differently wrong each time you run it. Nothing is 'broken' in the usual sense — it's a preview of the concurrency unit: `counter++` is not one atomic step at the hardware level, and whenever two threads can interleave their non-atomic steps on shared data, that data can end up in a state nobody intended. Declaring the variable `volatile` does not fix this — that keyword only affects compiler optimizations, not timing.",
    },
    {
      heading: "From the lecture slides: writing C in the age of AI code generation",
      body: "The lecture explicitly frames this as a shift in what's expected of you as a programmer: an LLM can generate C that compiles and looks syntactically fine, but that code frequently has unchecked return values (open(), mmap(), pthread_create() can all fail silently if you don't check), hidden race conditions, memory leaks, use-after-free bugs, or off-by-one errors — exactly the categories of bugs this course is about learning to recognize. The practical takeaway from the slides: your job increasingly is to be an auditor of code (yours or a model's), not just a generator of it.",
    },
  ],
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
        { front: "OS as 'resource manager'", back: "The OS manages CPU, memory, and disk as shared resources, 'doing so efficiently or fairly.' This is the formal textbook framing, alongside the 'virtual machine' framing." },
        { front: "Why the OS is sometimes called a 'standard library'", back: "Because applications access OS services through system calls — a typical OS exports a few hundred of them, much like a library's API." },
        { front: "Three major course themes", back: "Virtualization (of the CPU and memory), Concurrency, and Persistence — the organizing structure of the whole course." },
      ],
    },
    {
      type: "ordering",
      id: "intro-history-order",
      title: "A Brief History of OS Design",
      prompt: "Put these computing eras in the order they actually happened.",
      steps: [
        "Batch processing — a human operator sets up and runs jobs one at a time on early mainframes",
        "Multiprogramming — the OS loads several jobs into memory and switches rapidly between them, overlapping I/O wait with computation",
        "Time sharing — the modern model where many users/programs seemingly use the computer simultaneously, interactively",
      ],
    },
    {
      type: "quiz",
      id: "intro-quiz",
      title: "Big Picture Quiz",
      sampleSize: 6,
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
        {
          q: "A trap can be a system call, an exception, or an interrupt. Which of these is an EXCEPTION rather than a system call or interrupt?",
          options: ["A program calls open() to open a file", "A divide-by-zero error occurs mid-program", "A timer fires after 10ms", "A key is pressed on the keyboard"],
          correctIndex: 1,
          explain: "A trap is any transfer to kernel mode. System calls are planned (the program asks for something); interrupts are external events (timer, keyboard); exceptions are errors like divide-by-zero or a page fault.",
        },
        {
          q: "Which pair correctly matches 'mechanism' and 'policy'?",
          options: [
            "Mechanism = which process runs next; Policy = how a context switch saves registers",
            "Mechanism = how a context switch saves/restores registers; Policy = which process runs next",
            "Mechanism and policy both mean the scheduling algorithm",
            "Mechanism is used only in kernel mode; policy is used only in user mode",
          ],
          correctIndex: 1,
          explain: "Mechanism answers 'how' (the low-level method), policy answers 'which' (the decision). Keeping them separate lets you swap the policy (e.g. a different scheduling algorithm) without rewriting the mechanism (the context-switch code).",
        },
        {
          q: "What does 'multiprogramming' add on top of plain batch processing?",
          options: [
            "Running one job completely before starting the next, exactly like batch processing",
            "Loading several jobs into memory and switching between them, so CPU time isn't wasted while one job waits on I/O",
            "Letting many interactive users share the machine at once",
            "Removing the need for an operating system entirely",
          ],
          correctIndex: 1,
          explain: "Multiprogramming was the step between batch processing and full time-sharing: by keeping several jobs in memory, the OS could switch to another job whenever the current one blocked on I/O, instead of leaving the CPU idle.",
        },
      ],
    },
  ],
};
