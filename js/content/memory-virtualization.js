export default {
  id: "memory-virtualization",
  icon: "🗺️",
  title: "Memory Virtualization",
  description: "Why physical memory must be virtualized, base-and-bounds relocation, and splitting an address space into segments.",
  readings: [
    { kind: "chapter", chapter: 13, title: "The Abstraction: Address Spaces", file: "vm-intro.pdf" },
    { kind: "chapter", chapter: 15, title: "Mechanism: Address Translation", file: "vm-mechanism.pdf" },
    { kind: "chapter", chapter: 16, title: "Segmentation", file: "vm-segmentation.pdf" },
    { kind: "slides", title: "Lecture 10 — Memory Virtualization (PreClass)", file: "TCSS 422 Lecture 10 Memory Virtualization - PreClass.pptx" },
  ],
  notes: [
    {
      heading: "Why physical memory can't just be shared raw",
      body: "Early computers had programs use physical addresses directly: load one job, run it, unload it, load the next — simple, but terrible memory utilization, and only ever one program in memory. Multiprogramming (wanting several processes in memory AT ONCE) breaks that model and raises real problems: Protection — a bug in one process shouldn't be able to corrupt or even observe another process's memory, or the OS's. Transparency — a process shouldn't need to know or care about which particular physical bytes it's using, even though it still wants large contiguous chunks (for its stack, big data structures, etc). Resource exhaustion — programmers write code assuming the machine has 'enough' memory, even though the sum of every running process's memory can easily exceed what physically exists.",
    },
    {
      heading: "The fix: give every process its own virtual address space",
      body: "Every address a program ever uses — every pointer, every load, every store — is virtual, not physical. The hardware's Memory Management Unit (MMU) translates each one to a real physical address at the moment it's used. The program itself never sees or deals with physical addresses at all; this is why two completely separate processes can both print 'address of p: 00200000' while actually touching completely different physical memory — the OS maps the same virtual address to different physical locations for each of them.",
    },
    {
      heading: "Base and bounds (dynamic relocation)",
      body: "The simplest translation scheme: the CPU has two registers, base and bounds, one pair per currently-running process. On every load/store/jump: first check 0 <= virtual address < bounds — if that check fails, trap to the kernel (this is what a segmentation fault actually is at the hardware level). If it passes, physical address = virtual address + base. Moving a process in physical memory is just a matter of copying its memory and updating its base register — the process itself never notices, which is exactly why it's called 'dynamic relocation.'",
    },
    {
      heading: "Worked example: translate it yourself",
      body: "A 4 KB (4096-byte) address space is loaded starting at physical address 16 KB (16384). So base=16384, bounds=4096. For virtual address 0: 0 is in [0,4096), so physical = 16384+0 = 16384. For virtual address 1024: in bounds, physical = 16384+1024 = 17408. For virtual address 3000: in bounds, physical = 16384+3000 = 19384. For virtual address 4400: 4400 is NOT less than bounds (4096) — out of bounds, so this traps to the kernel instead of translating (this is the process trying to read/write memory it doesn't own).",
    },
    {
      heading: "What the OS has to do to make base-and-bounds work",
      body: "When a process starts: the OS searches a free list (a data structure tracking which chunks of physical memory are available) for enough free space, and allocates it. When a process terminates: the OS puts that memory back on the free list for reuse. On every context switch: the OS must save the outgoing process's base and bounds registers into ITS PCB (called task_struct in Linux) and load the incoming process's base/bounds from ITS PCB into the hardware — exactly parallel to saving/restoring the general-purpose registers. The OS also installs exception handlers at boot time (in kernel mode) so an out-of-bounds access actually gets handled instead of just corrupting memory.",
    },
    {
      heading: "Base-and-bounds trade-offs — and why segmentation follows",
      body: "Advantages: cheap in hardware (just two registers) and cheap at runtime (one add, one compare, per memory access) — real machines like the Cray-1 used exactly this. Disadvantages: growing a process is expensive or outright impossible (there may be nothing free right after it in physical memory), there's no way to share code or data between processes (the whole address space is one undifferentiated blob), and a lot of the address space between the stack and the heap sits allocated but unused, wasting physical memory on nothing. The fix for all three: stop treating the whole address space as one segment, and give code, stack, and heap each their OWN base/bounds pair.",
    },
    {
      heading: "Segmentation: one base/bounds pair per logical piece",
      body: "An address space is split into (at least) 3 segments — code, heap, and stack — each a separate, contiguous chunk, each with its own base and bounds register, each placeable independently anywhere in physical memory. The virtual address itself now has to specify WHICH segment it's in (commonly via the high bits), not just an offset. Because segments are independent, the OS can share a segment (e.g. read-only code) between processes, and protect segments individually (e.g. make code read-only, executable; heap/stack read-write, non-executable) — none of which base-and-bounds alone could do.",
    },
    {
      heading: "Segment-relative translation, worked",
      body: "Code segment example: the code segment is logically numbered starting at virtual address 0, but is physically placed starting at 32 KB (base=32768). To translate any virtual address inside the code segment, compute the OFFSET from that segment's own virtual start (here, offset = VA - 0 = VA), then physical = segment_base + offset = 32768 + VA. Heap example: suppose the heap segment starts at virtual address 4096, and you want the byte at virtual address 4200. The offset INTO the heap segment is 4200 - 4096 = 104 — then physical = heap_physical_base + 104. The method is always the same: subtract the segment's own virtual starting point to get an offset, then add that segment's physical base.",
    },
    {
      heading: "What a segmentation fault actually is",
      body: "Say the heap segment starts at virtual address 4096. A pointer into virtual address 7168 (7 KB) computes an offset of 7168 - 4096 = 3072 into the heap segment. If the heap segment's bounds (its allocated size) is smaller than 3072, that offset exceeds the segment's bounds register — exactly the same out-of-bounds check as plain base-and-bounds, just applied per-segment instead of to the whole address space. The hardware traps to the kernel, and that trap is what you've always known as a 'segmentation fault' — it is, literally, an access past a segment's bounds.",
    },
    {
      heading: "The stack grows the other way",
      body: "Unlike code and heap (which grow upward, toward higher addresses, FILO on the heap side isn't quite right — heap just grows up as you allocate more), the stack grows BACKWARD, toward lower addresses, as more is pushed onto it. Segmentation hardware needs an extra direction bit per segment to know which way is 'growing' for that segment, so the bounds check still works correctly for a segment that expands downward instead of upward.",
    },
    {
      heading: "Segmentation's own trade-off: fragmentation",
      body: "Advantages over plain base-and-bounds: multiple independently-placed segments per process, easy sharing of a segment between processes, and you don't need the ENTIRE process in memory at once (unused segments, or parts of them, can be left out). Disadvantage: segmentation needs more translation hardware (a per-segment base/bounds lookup instead of one pair), which can cost performance, and — the big one — it makes external FRAGMENTATION a real problem. Physical memory ends up scattered with small free gaps between allocated segments; even if the total free space adds up to, say, 24 KB, a single request for one CONTIGUOUS 20 KB segment can still fail if no single gap is that big. Compaction (shuffling memory around to consolidate free space into one chunk) fixes this, but is slow — fast at 64 KB scale, far too slow to do often at multi-gigabyte scale.",
    },
  ],
  blocks: [
    {
      type: "flashcards",
      id: "memvirt-flash",
      title: "Memory Virtualization Vocabulary",
      cards: [
        { front: "Why virtualize memory at all", back: "To give each process protection (can't touch another's memory), transparency (doesn't need to know which physical bytes it has), and to let the OS over-commit total memory across more processes than physically exist at once." },
        { front: "Memory Management Unit (MMU)", back: "Hardware (usually part of the CPU) that translates every virtual address a program uses into a physical address, at the moment of each load/store/jump." },
        { front: "Base and bounds (dynamic relocation)", back: "Two CPU registers per running process. physical = virtual + base, but only if 0 <= virtual < bounds; otherwise the access traps to the kernel." },
        { front: "What triggers the bounds-check trap", back: "A virtual address that is negative or >= the bounds register — this is the hardware-level origin of a 'segmentation fault.'" },
        { front: "What the OS saves/restores on a context switch (memory-wise)", back: "The outgoing process's base and bounds registers into its PCB (task_struct in Linux); the incoming process's base/bounds are loaded from ITS PCB into the hardware." },
        { front: "Free list", back: "The OS data structure tracking which chunks of physical memory are currently available, consulted when a new process needs space allocated." },
        { front: "Dynamic relocation", back: "The OS can move a stopped process's memory to a new physical location, update its base/bounds in its PCB, and reschedule it — the process never notices it was moved." },
        { front: "Base-and-bounds' 3 disadvantages", back: "Growing a process can be expensive/impossible, no way to share code or data between processes, and unused space between stack/heap is wasted (allocated but unused)." },
        { front: "Segmentation", back: "Splitting an address space into independently-placed pieces (code, heap, stack), each with its OWN base/bounds pair, so each can be placed, shared, and protected separately." },
        { front: "Segment-relative address translation", back: "offset = virtual_address - segment's_own_virtual_start; physical = segment_physical_base + offset." },
        { front: "Direction bit", back: "An extra per-segment flag segmentation hardware needs because the stack grows DOWNWARD (toward lower addresses) while code/heap grow upward — the bounds check differs depending on which way is 'growing.'" },
        { front: "External fragmentation", back: "Free physical memory ends up scattered in small gaps between allocated segments; even if the total free space is enough, no single gap may be big enough for one new contiguous request." },
        { front: "Compaction", back: "Rearranging memory to consolidate scattered free gaps into one contiguous chunk — fixes fragmentation, but is slow, especially at large (multi-GB) scale." },
      ],
    },
    {
      type: "quiz",
      id: "memvirt-translate-quiz",
      title: "Base-and-Bounds Translation (worked numbers)",
      sampleSize: 6,
      questions: [
        {
          q: "A 4 KB (4096-byte) address space is loaded at physical address 16 KB (16384). What are base and bounds?",
          options: [
            "base=4096, bounds=16384",
            "base=16384, bounds=4096",
            "base=0, bounds=4096",
            "base=16384, bounds=16384",
          ],
          correctIndex: 1,
          explain: "base is WHERE the address space is physically placed (16384); bounds is HOW BIG it is (4096) — used to check that a virtual address doesn't run off the end of the space.",
        },
        {
          q: "With base=16384 and bounds=4096, what physical address does virtual address 1024 translate to?",
          options: ["1024", "16384", "17408", "20480"],
          correctIndex: 2,
          explain: "1024 is within [0, 4096), so it's a valid access: physical = virtual + base = 1024 + 16384 = 17408.",
        },
        {
          q: "With base=16384 and bounds=4096, what happens when the program accesses virtual address 4400?",
          options: [
            "physical = 4400 + 16384 = 20784, a valid translation",
            "It traps to the kernel, because 4400 is not less than bounds (4096) — this is an out-of-bounds access",
            "It wraps around to virtual address 0",
            "The MMU silently ignores the access",
          ],
          correctIndex: 1,
          explain: "The hardware's rule is 0 <= virtual address < bounds. Since 4400 >= 4096, the check fails before any translation happens, and the CPU traps to the kernel instead.",
        },
        {
          q: "The code segment is placed at physical base 32 KB (32768), and is numbered starting at virtual address 0. What physical address does virtual address 100 (inside the code segment) map to?",
          options: ["100", "32768", "32868", "33000"],
          correctIndex: 2,
          explain: "offset = virtual - segment's own virtual start = 100 - 0 = 100. physical = segment base + offset = 32768 + 100 = 32868.",
        },
        {
          q: "The heap segment starts at virtual address 4096. A pointer refers to virtual address 4200. What is the OFFSET into the heap segment (the value that gets added to the heap's physical base)?",
          options: ["4200", "4096", "104", "8296"],
          correctIndex: 2,
          explain: "offset = virtual_address - segment's_own_virtual_start = 4200 - 4096 = 104. That 104 is what gets added to wherever the heap segment is actually placed physically.",
        },
        {
          q: "The heap segment starts at virtual address 4096 and has a bounds (allocated size) of 2048 bytes. A pointer refers to virtual address 7168. What happens?",
          options: [
            "It translates normally to a valid physical address",
            "The offset (7168-4096=3072) exceeds the heap's bounds (2048), so this is an out-of-bounds access -- a segmentation fault",
            "It automatically grows the heap segment to fit",
            "It silently reads from the stack segment instead",
          ],
          correctIndex: 1,
          explain: "offset = 7168 - 4096 = 3072, which is larger than the heap segment's bounds of 2048. The hardware traps -- this IS what a segmentation fault is: an offset past a segment's own bounds.",
        },
      ],
    },
    {
      type: "matching",
      id: "memvirt-tradeoff-match",
      title: "Match the Scheme to Its Trade-off",
      pairs: [
        { term: "Base and bounds", def: "Cheap (2 registers, 1 add + 1 compare), but can't share memory between processes and wastes unused space between stack/heap." },
        { term: "Segmentation", def: "Lets segments be shared and placed independently, but needs more translation hardware and makes external fragmentation a real problem." },
        { term: "Free list", def: "What the OS searches when a new process starts, to find enough contiguous free physical memory for it." },
        { term: "Compaction", def: "Rearranges memory to consolidate scattered free gaps -- fixes fragmentation, but is slow at large scale." },
        { term: "Direction bit", def: "Lets segmentation hardware correctly bounds-check a segment (like the stack) that grows toward lower addresses instead of higher ones." },
      ],
    },
    {
      type: "ordering",
      id: "memvirt-contextswitch-order",
      title: "What the OS Does for Memory on a Context Switch",
      prompt: "Put these steps in order for the OS to context-switch from Process A to Process B (base-and-bounds).",
      steps: [
        "Timer interrupt or syscall causes a trap into the OS",
        "OS saves Process A's current base and bounds register values into A's PCB",
        "OS picks Process B to run next (scheduling decision)",
        "OS loads Process B's saved base and bounds values from B's PCB into the hardware registers",
        "Return-from-trap restores Process B's other registers and resumes it in user mode",
        "Process B's loads/stores now translate using ITS OWN base and bounds, not A's",
      ],
    },
  ],
};
