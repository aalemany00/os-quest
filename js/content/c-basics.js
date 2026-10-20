export default {
  id: "c-basics",
  icon: "🔧",
  title: "C Programming Basics",
  description: "Pointers, strings, and the argv-manipulation exercise from the Quiz 1 C Tutorial, building toward execvp().",
  readings: [
    { title: "Quiz 1 — C Tutorial", file: "Quiz 1/TCSS 422 Quiz 1 C Tutorial.pdf" },
    { title: "Sample Codes of Lecture 1 (cpu.c, io.c, mem.c, threads.c, common.h)", file: "Sample Codes of Lecture 1/" },
  ],
  blocks: [
    {
      type: "flashcards",
      id: "c-flash",
      title: "C Concepts",
      cards: [
        { front: "A C string is really...", back: "A character pointer to an array of null-terminated characters. C finds the end of the string by walking the array one byte at a time until it hits the NULL character — there's no separate 'length' stored with it." },
        { front: "argc / argv", back: "In `int main(int argc, char *argv[])`, argc is the number of command-line arguments and argv is a NULL-terminated array of C-strings holding them (argv[0] is the program name)." },
        { front: "Pointer aliasing vs. copying", back: "Assigning `ourarray[j] = argv[i]` copies only the pointer (the reference) — both now point at the exact same characters in memory. Mutating through one mutates what you see through the other." },
        { front: "char *strcpy(char *dest, const char *src)", back: "Makes a TRUE copy of a string's characters (including the terminator) into dest's own memory — the fix for the aliasing problem above. dest must already have enough allocated space." },
        { front: "int execvp(const char *file, char *const argv[])", back: "Searches PATH for `file` and replaces the calling process's program image with it. On success it NEVER returns — any code written after the call simply never executes. It only returns (−1) on failure." },
        { front: "Why execvp's argv array needs a NULL terminator", back: "execvp doesn't know how many arguments you passed — it walks the argv array until it finds NULL. Forgetting the NULL terminator makes it read uninitialized heap memory, typically segfaulting." },
      ],
    },
    {
      type: "ordering",
      id: "c-ourarray-order",
      title: "Pointer Aliasing Bug, Step by Step",
      prompt: "The C tutorial builds `ourarray`, a reversed copy of argv's pointers, then discovers a bug. Put these steps in the order they actually happen.",
      steps: [
        "Allocate ourarray with malloc(sizeof(char *) * argc)",
        "Copy each argv[i] pointer into ourarray[argc-1-i] — this copies the pointer, not the string's characters",
        "Mutate a character through *(ourarray[0]+1) = 'b'",
        "Discover that argv[argc-1] changed too — 'Uh oh! Changing ourarray has also changed argv!'",
        "Fix it: malloc a fresh buffer and strcpy() the string into it before storing it in ourarray",
        "Mutate ourarray[0] again — this time argv is unaffected, because ourarray now owns a true copy",
      ],
    },
    {
      type: "quiz",
      id: "c-quiz",
      title: "C Fundamentals Quiz",
      questions: [
        {
          q: "After `ourarray[j] = argv[i];`, you run `*(ourarray[0]+1) = 'b';` and find that argv[argc-1] has also changed. Why?",
          options: [
            "It's a compiler bug",
            "ourarray[j] = argv[i] copied the pointer, not the string — both variables point at the exact same characters in memory",
            "argv is a read-only array that can't actually be changed",
            "malloc() silently merges identical strings",
          ],
          correctIndex: 1,
          explain: "This is the tutorial's core lesson: assigning one char* to another only copies the address. To get an independent copy you need to allocate new memory and strcpy() the actual characters, as Task VII does.",
        },
        {
          q: "What's the minimum fix to make ourarray independent of argv?",
          options: [
            "Use a bigger malloc() size",
            "Allocate new memory per string and strcpy() the characters into it before storing the new pointer in ourarray",
            "Declare ourarray as `const`",
            "Call free() on argv first",
          ],
          correctIndex: 1,
          explain: "strcpy(dest, src) copies the actual bytes (including the NULL terminator) into memory you own, breaking the aliasing.",
        },
        {
          q: "In the execvp exercise, why does the tutorial allocate the args array with one extra slot beyond cmd/arg1/arg2/file?",
          options: [
            "For alignment padding",
            "To hold a required NULL terminator so execvp knows where the argument list ends",
            "In case the user types a 5th argument",
            "It doesn't — only 4 slots are needed",
          ],
          correctIndex: 1,
          explain: "execvp() has no argument count parameter — it walks args until NULL. Omitting that terminator means it reads garbage off the end of the array.",
        },
        {
          q: "After `int status = execvp(args[0], args);` succeeds, what happens to the very next line of code (e.g. `printf(\"STATUS CODE=%d\\n\", status);`)?",
          options: [
            "It runs normally",
            "It never runs — a successful execvp() replaces the process image entirely and does not return",
            "It runs, but status is always 0",
            "It throws a runtime exception",
          ],
          correctIndex: 1,
          explain: "execvp only returns if it FAILS (returning -1). On success the calling process's code, data, heap, and stack are all replaced by the new program — there is no 'after' to return to.",
        },
        {
          q: "The tutorial reads a command with `fscanf(stdin, \"%s\", cmd);` then checks `cmd[strlen(cmd)]` and finds it equals 0. What does this prove?",
          options: [
            "fscanf() failed",
            "fscanf() automatically NULL-terminates the string it reads — index strlen(cmd) is exactly where the terminator sits",
            "The input was empty",
            "cmd is an integer, not a string",
          ],
          correctIndex: 1,
          explain: "strlen() returns the length NOT counting the terminator, so cmd[strlen(cmd)] is the very next byte — the NULL character (ASCII 0) that fscanf() placed there.",
        },
        {
          q: "Why does the tutorial use `sizeof` when calling malloc(), e.g. `malloc(sizeof(char *) * argc)`?",
          options: [
            "sizeof is optional stylistic sugar with no real effect",
            "To correctly compute how many bytes are needed for argc pointers, since pointer size can vary by platform",
            "sizeof returns the number of elements in argv",
            "To convert argc from an int to a pointer",
          ],
          correctIndex: 1,
          explain: "malloc() takes a byte count, not an element count. sizeof(char *) gives the exact size of one pointer on the current platform, so multiplying by argc gets the byte count right regardless of pointer size.",
        },
      ],
    },
  ],
};
