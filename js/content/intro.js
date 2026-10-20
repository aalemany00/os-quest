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
        { front: "Operating System (OS)", back: "The software layer that sits between applications and hardware, making the hardware easier and safer to use by virtualizing resources (CPU, memory) and managing shared state." },
        { front: "Virtualization", back: "Taking a physical resource (CPU, memory, disk) and transforming it into a more general, powerful, and easy-to-use virtual form. Each running program believes it has the resource to itself." },
        { front: "The three virtualized/managed resources", back: "CPU (virtualized via processes), Memory (virtualized via address spaces), and Persistent storage/concurrency (managed via file systems and synchronization primitives)." },
        { front: "Concurrency", back: "Problems that arise from executing many threads/processes at the same time within one program or system, especially around shared data (race conditions)." },
        { front: "Persistence", back: "Keeping data safely stored on disk/SSD even across crashes or power loss; handled by the OS's file systems and I/O devices." },
        { front: "System call", back: "A controlled, protected entry point an application uses to request a service from the OS kernel (e.g. open a file, allocate memory, create a process)." },
        { front: "Kernel", back: "The privileged core of the OS that runs in kernel mode and has full access to the hardware." },
        { front: "User mode vs. Kernel mode", back: "User mode restricts what instructions a program can issue (e.g. no direct I/O); kernel mode allows unrestricted access to hardware. Protects the system from buggy or malicious programs." },
      ],
    },
    {
      type: "quiz",
      id: "intro-quiz",
      title: "Big Picture Quiz",
      questions: [
        {
          q: "Which of the following best describes 'virtualization' as used in OS design?",
          options: [
            "Running an operating system inside a virtual machine like VMware",
            "Transforming a physical resource into a more general, easier-to-use virtual version of itself for each running program",
            "Compressing memory so more programs can run at once",
            "Encrypting data so other processes cannot read it",
          ],
          correctIndex: 1,
          explain: "In the OS context (OSTEP), 'virtualization' means the OS takes a physical resource like the CPU or memory and presents each running program with its own easy-to-use virtual version of it.",
        },
        {
          q: "Why can't a user program directly execute privileged instructions (like directly accessing a disk controller)?",
          options: [
            "It would be too slow to be useful",
            "The CPU only has one mode and privileged instructions don't exist",
            "The CPU enforces user mode vs. kernel mode so the OS can mediate access and protect the system",
            "Programs are only allowed to use system calls for printing",
          ],
          correctIndex: 2,
          explain: "The hardware provides at least two execution modes. Restricted (user) mode prevents programs from issuing arbitrary I/O or privileged instructions directly; they must request such operations from the OS via a system call, which traps into kernel mode.",
        },
        {
          q: "Which of these is a classic 'concurrency' problem the OS (and programmers) must deal with?",
          options: [
            "A disk running out of free space",
            "Two threads updating the same shared variable at the same time, producing an incorrect result",
            "A program requesting more memory than physically exists",
            "A CPU running at a lower clock speed to save power",
          ],
          correctIndex: 1,
          explain: "Concurrency bugs like race conditions happen when multiple threads access shared state without proper synchronization, and the final outcome depends on the unpredictable interleaving of their instructions.",
        },
        {
          q: "What is a system call, fundamentally?",
          options: [
            "A function call between two user-level libraries",
            "A protected, controlled way for a user program to request a service from the OS kernel, usually via a trap instruction",
            "A call made only when the computer boots up",
            "A direct jump into kernel memory with no checks",
          ],
          correctIndex: 1,
          explain: "A system call uses a special trap instruction that raises the privilege level to kernel mode in a controlled way (jumping only to pre-registered trap handlers), letting the OS safely perform the requested privileged operation on the program's behalf.",
        },
      ],
    },
  ],
};
