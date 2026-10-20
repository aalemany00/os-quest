export default {
  id: "lde",
  icon: "🔁",
  title: "Limited Direct Execution",
  description: "How the OS virtualizes the CPU efficiently and safely: direct execution, traps, and context switches.",
  blocks: [
    {
      type: "flashcards",
      id: "lde-flash",
      title: "LDE Vocabulary",
      cards: [
        { front: "Direct Execution", back: "Simply running the program directly on the CPU for speed — the baseline approach before adding protection, which by itself gives the OS no control once a program starts running." },
        { front: "Limited Direct Execution (LDE)", back: "Direct execution plus limits: the hardware supports user/kernel modes and traps so the OS retains control (e.g. via system calls and timer interrupts) while programs still run at near-native speed." },
        { front: "Trap table", back: "Set up by the OS at boot time (in kernel mode) to tell the hardware which kernel function to run for each kind of trap (system call, exception, interrupt)." },
        { front: "Trap instruction", back: "A special instruction a user program executes (directly or via a library wrapper) to raise privilege and jump into the kernel at a pre-registered handler." },
        { front: "Return-from-trap instruction", back: "Returns execution from kernel mode back to user mode, restoring the user program's registers and privilege level." },
        { front: "Timer interrupt", back: "A hardware interrupt that fires periodically regardless of what the running program is doing, giving the OS a chance to regain control and preempt a process even if it never calls a system call." },
        { front: "Context switch", back: "The OS routine that saves the registers of the currently running process (into its PCB) and restores the registers of the next process to run." },
        { front: "Mechanism vs. Policy", back: "Mechanisms are the low-level machinery that implements something (e.g. how a context switch saves/restores registers); policies are the high-level decisions about how to use that machinery (e.g. which process to run next). Separating them lets you change the policy without rewriting the mechanism." },
      ],
    },
    {
      type: "ordering",
      id: "lde-boot-order",
      title: "LDE: Boot Time vs. Run Time",
      prompt: "Put these steps of Limited Direct Execution in the correct chronological order (boot time first, then normal run time events).",
      steps: [
        "At boot, the OS (in kernel mode) initializes the trap table, telling hardware which handler to call for system calls, timer interrupts, and other exceptions",
        "The OS starts a timer and boots the first process using direct execution",
        "The process runs directly on the CPU until it issues a system call or the timer interrupt fires",
        "A trap instruction (or interrupt) transfers control to the kernel, saving the process's registers onto its kernel stack",
        "The OS trap handler runs in kernel mode, decides what to do (e.g. service the system call, or run the scheduler to pick the next process)",
        "If switching processes, the OS performs a context switch, saving the old process's register state and restoring the new process's register state",
        "A return-from-trap instruction restores registers and resumes execution in user mode on the chosen process",
      ],
    },
    {
      type: "quiz",
      id: "lde-quiz",
      title: "LDE Quiz",
      questions: [
        {
          q: "Why can't the OS rely on direct execution alone to virtualize the CPU?",
          options: [
            "Direct execution is too slow",
            "Once the program starts running directly, the OS has no way to regain control or restrict dangerous operations",
            "Direct execution requires special hardware that most CPUs lack",
            "It only works for single-threaded programs",
          ],
          correctIndex: 1,
          explain: "Plain direct execution is fast but gives up control: the OS can't stop a misbehaving or infinite-looping program, and the program could execute privileged instructions freely. LDE adds hardware support (modes, traps, timer interrupts) to fix this while keeping most of the speed.",
        },
        {
          q: "What is the purpose of a periodic timer interrupt in LDE?",
          options: [
            "To slow down the CPU to save power",
            "To let the OS regain control of the CPU even if the running process never makes a system call, enabling preemptive scheduling",
            "To tell the user what time it is",
            "To trigger a context switch only when a process crashes",
          ],
          correctIndex: 1,
          explain: "Without the timer interrupt, a process that never calls into the OS (e.g. an infinite loop with no I/O) could run forever and never let the OS schedule anything else. The timer interrupt guarantees the OS periodically regains control.",
        },
        {
          q: "What exactly does a context switch save and restore?",
          options: [
            "The entire contents of disk storage",
            "Only the program counter",
            "The register state (including the program counter, stack pointer, and general-purpose registers) of the outgoing and incoming processes",
            "The contents of the trap table",
          ],
          correctIndex: 2,
          explain: "A context switch saves the current process's register values into its PCB and loads the register values of the next process to run from its own PCB, so execution resumes exactly where that process left off.",
        },
        {
          q: "Which statement correctly distinguishes mechanism from policy?",
          options: [
            "Mechanism decides 'which job runs next'; policy decides 'how to save registers'",
            "Mechanism is the low-level 'how' (e.g. how to perform a context switch); policy is the high-level 'which/when' decision (e.g. which process to run next)",
            "They are two words for the same thing in OS design",
            "Policy always runs in user mode; mechanism always runs in kernel mode",
          ],
          correctIndex: 1,
          explain: "This is a recurring theme in OS design: implement the low-level mechanism once (e.g. context switching), then plug in different high-level policies (e.g. scheduling algorithms) on top of it without changing the mechanism.",
        },
      ],
    },
  ],
};
