export default {
  id: "c-basics",
  icon: "🔧",
  title: "C Programming Basics",
  description: "Pointers, memory, structs, and the C idioms used throughout the OS sample code (cpu.c, mem.c, threads.c).",
  blocks: [
    {
      type: "flashcards",
      id: "c-flash",
      title: "C Concepts",
      cards: [
        { front: "Pointer", back: "A variable that stores a memory address. Declared with *, dereferenced with * to access/modify the value it points to, and combined with & to get the address of a variable." },
        { front: "malloc() / free()", back: "malloc(size) requests 'size' bytes of heap memory and returns a pointer to it (or NULL on failure); free(ptr) releases that memory back to the system. Every malloc should have a matching free." },
        { front: "Segmentation fault", back: "A runtime error from accessing memory you don't own — e.g. dereferencing a NULL or wild pointer, or writing past the end of an array." },
        { front: "argc / argv", back: "In `int main(int argc, char *argv[])`, argc is the number of command-line arguments and argv is an array of C-strings holding them (argv[0] is the program name)." },
        { front: "struct", back: "A user-defined type that groups several fields together, e.g. `struct Point { int x; int y; };`, useful for bundling related data like a job's name/arrival/burst in scheduling code." },
        { front: "while (1) { ... }", back: "An infinite loop, common in the sample CPU/IO-bound programs (cpu.c, io.c) to keep a process busy so it can be observed with tools like `top` or `ps`." },
      ],
    },
    {
      type: "quiz",
      id: "c-quiz",
      title: "C Fundamentals Quiz",
      questions: [
        {
          q: "Given `int x = 5; int *p = &x; *p = 10;`, what is the value of x afterward?",
          options: ["5", "10", "An address", "Undefined behavior"],
          correctIndex: 1,
          explain: "`p` holds the address of `x`. Dereferencing `p` with `*p = 10` writes 10 into the memory location that `x` occupies, so `x` becomes 10.",
        },
        {
          q: "What does `malloc` return if it fails to allocate memory?",
          options: ["0 as an int", "An uninitialized pointer", "NULL", "It throws an exception"],
          correctIndex: 2,
          explain: "C has no exceptions; malloc signals failure by returning NULL, which well-written code must check for before dereferencing.",
        },
        {
          q: "Forgetting to call free() on heap memory you malloc'd leads to:",
          options: ["A compile error", "A memory leak", "Automatic garbage collection kicking in", "A segmentation fault immediately"],
          correctIndex: 1,
          explain: "C has no automatic garbage collector. Memory that is malloc'd but never freed stays reserved for the life of the process — a memory leak.",
        },
      ],
    },
  ],
};
