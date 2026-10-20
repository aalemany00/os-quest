import { renderStreakStatus } from "./util.js?v=11";

// Concurrency / race-condition interleaving stepper + prediction quiz.
// block: {
//   id, title, intro?,
//   threadA: { name, lines: string[] }, threadB: { name, lines: string[] },
//   trace: [{ thread: 'A'|'B', lineIndex, vars: {varName: value, ...} }],  // snapshot AFTER each step
//   initialVars: {varName: value},
//   question, options, correctIndex, explanation
// }

export function mountRaceSim(root, block, ctx) {
  let step = -1; // -1 = not started
  let answered = false;
  let selectedIdx = null;
  let lastStatus = null;

  function render() {
    root.innerHTML = "";

    if (block.intro) {
      const intro = document.createElement("p");
      intro.style.color = "var(--text-dim)";
      intro.textContent = block.intro;
      root.appendChild(intro);
    }

    const threadsWrap = document.createElement("div");
    threadsWrap.className = "race-threads";

    [["A", block.threadA], ["B", block.threadB]].forEach(([key, thread]) => {
      const col = document.createElement("div");
      col.className = "race-thread";
      col.innerHTML = `<h4>${thread.name}</h4>`;
      thread.lines.forEach((line, idx) => {
        const lineEl = document.createElement("div");
        lineEl.className = "race-line";
        const current = step >= 0 && block.trace[step].thread === key && block.trace[step].lineIndex === idx;
        const wasExecuted = block.trace.slice(0, step + 1).some((s) => s.thread === key && s.lineIndex === idx);
        if (current) lineEl.classList.add("active");
        else if (wasExecuted) lineEl.classList.add("done");
        lineEl.textContent = line;
        col.appendChild(lineEl);
      });
      threadsWrap.appendChild(col);
    });
    root.appendChild(threadsWrap);

    const stateBox = document.createElement("div");
    stateBox.className = "race-state";
    const vars = step >= 0 ? block.trace[step].vars : block.initialVars;
    stateBox.textContent = Object.entries(vars).map(([k, v]) => `${k} = ${v}`).join("   ");
    root.appendChild(stateBox);

    const controls = document.createElement("div");
    controls.className = "flex-row";
    controls.style.marginBottom = "16px";

    const prevBtn = document.createElement("button");
    prevBtn.className = "btn secondary";
    prevBtn.textContent = "← Prev step";
    prevBtn.disabled = step <= -1;
    prevBtn.addEventListener("click", () => { step--; render(); });

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn";
    nextBtn.textContent = step >= block.trace.length - 1 ? "Done stepping" : "Next step →";
    nextBtn.disabled = step >= block.trace.length - 1;
    nextBtn.addEventListener("click", () => { step++; render(); });

    const resetBtn = document.createElement("button");
    resetBtn.className = "btn secondary";
    resetBtn.textContent = "Reset";
    resetBtn.addEventListener("click", () => { step = -1; render(); });

    controls.appendChild(prevBtn);
    controls.appendChild(nextBtn);
    controls.appendChild(resetBtn);
    root.appendChild(controls);

    if (step < block.trace.length - 1) {
      const hint = document.createElement("p");
      hint.style.color = "var(--text-dim)";
      hint.style.fontSize = "0.85rem";
      hint.textContent = "Step through this specific interleaving of the two threads, then answer the question below.";
      root.appendChild(hint);
    }

    const qEl = document.createElement("div");
    qEl.className = "quiz-question";
    qEl.style.marginTop = "12px";
    qEl.textContent = block.question;
    root.appendChild(qEl);

    const optsEl = document.createElement("div");
    optsEl.className = "quiz-options";
    root.appendChild(optsEl);

    block.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.textContent = String(opt);
      if (answered) {
        btn.classList.add("disabled");
        if (idx === block.correctIndex) btn.classList.add("correct");
        else if (idx === selectedIdx) btn.classList.add("incorrect");
      }
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        selectedIdx = idx;
        finish(idx === block.correctIndex);
      });
      optsEl.appendChild(btn);
    });

    if (answered && block.explanation) {
      const ex = document.createElement("div");
      ex.className = "quiz-explain";
      ex.textContent = block.explanation;
      root.appendChild(ex);
    }

    if (answered && lastStatus) {
      root.appendChild(renderStreakStatus(lastStatus));

      const row = document.createElement("div");
      row.className = "flex-row";
      const retry = document.createElement("button");
      retry.className = "btn secondary";
      retry.textContent = "Try again";
      retry.addEventListener("click", () => {
        step = -1;
        answered = false;
        selectedIdx = null;
        lastStatus = null;
        render();
      });
      const back = document.createElement("button");
      back.className = "btn";
      back.textContent = "Back to topic";
      back.addEventListener("click", ctx.goBackToTopic);
      row.appendChild(retry);
      row.appendChild(back);
      root.appendChild(row);
    }
  }

  function finish(correct) {
    lastStatus = ctx.onComplete({ correct });
    render();
  }

  // (finish() re-renders once, synchronously — no setTimeout hacks needed since
  // the option styling above already derives from `answered`/`selectedIdx` state.)

  render();
}
