export default {
  id: "processes",
  icon: "⚙️",
  title: "Processes",
  description: "What a process is, its states, and the fork/exec/wait API used to create and control them.",
  blocks: [
    {
      type: "matching",
      id: "proc-match",
      title: "Process Concepts Matching",
      pairs: [
        { term: "Process", def: "A running instance of a program — its code plus its current execution state (registers, memory, open files)." },
        { term: "fork()", def: "Creates a near-exact copy of the calling process; returns the child's PID to the parent and 0 to the child." },
        { term: "exec()", def: "Replaces the current process's program/address space with a new program, without creating a new process." },
        { term: "wait()", def: "Pauses the calling (parent) process until one of its child processes finishes." },
        { term: "PCB (Process Control Block)", def: "The kernel data structure that stores a process's saved register state, PID, and other metadata needed to stop and later resume it." },
        { term: "Process states: Running", def: "The state where the process's instructions are actively executing on a CPU." },
        { term: "Process states: Ready", def: "The state where the process is able to run but the OS has not scheduled it onto a CPU yet." },
        { term: "Process states: Blocked", def: "The state where the process is waiting on some event (like I/O completion) and cannot run until that event occurs." },
      ],
    },
    {
      type: "ordering",
      id: "proc-fork-order",
      title: "fork() + exec() + wait() Order",
      prompt: "A shell-like program wants to run a child command and wait for it. Put these steps in the correct order.",
      steps: [
        "Parent process calls fork(), creating a child process that is a copy of the parent",
        "fork() returns 0 inside the child process, and the child's PID inside the parent process",
        "The child process calls exec() to replace itself with the new program to run",
        "The parent process calls wait() to block until the child finishes",
        "The child process finishes executing and exits",
        "wait() returns in the parent, which then continues execution",
      ],
    },
    {
      type: "quiz",
      id: "proc-quiz",
      title: "Process API Quiz",
      questions: [
        {
          q: "Immediately after a successful fork(), how many processes are running the program?",
          options: ["One", "Two", "Zero until exec is called", "It depends on the OS"],
          correctIndex: 1,
          explain: "fork() creates a new, nearly identical child process, so after the call there are two processes (parent and child) both continuing execution right after the fork() call.",
        },
        {
          q: "What does exec() do to the process that calls it?",
          options: [
            "It creates a brand new process and leaves the caller untouched",
            "It pauses the caller until a child process exits",
            "It replaces the calling process's code and address space with a new program, without creating a new process",
            "It duplicates the caller's memory into a new process",
          ],
          correctIndex: 2,
          explain: "Unlike fork(), exec() does not create a new process — it transforms the existing calling process into a different running program.",
        },
        {
          q: "A process is in the 'Blocked' state. What does that mean?",
          options: [
            "It is currently executing on the CPU",
            "It is ready to run but waiting for the scheduler to pick it",
            "It is waiting for some event (e.g. disk I/O) to complete before it can run again",
            "It has permanently stopped and will never run again",
          ],
          correctIndex: 2,
          explain: "Blocked means the process cannot make progress until an external event (like I/O completion) happens; once that event occurs it typically moves to Ready.",
        },
      ],
    },
  ],
};
