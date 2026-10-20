import { renderStreakStatus } from "./util.js?v=11";

// Term <-> definition matching mode.
// block: { id, title, pairs: [{ term, def }] }

export function mountMatching(root, block, ctx) {
  const pairs = block.pairs;
  let terms = shuffle(pairs.map((p, idx) => ({ idx, text: p.term })));
  let defs = shuffle(pairs.map((p, idx) => ({ idx, text: p.def })));
  let selectedTerm = null;
  let selectedDef = null;
  let matchedCount = 0;
  let mistakes = 0;

  function shuffle(arr) {
    for (let a = arr.length - 1; a > 0; a--) {
      const b = Math.floor(Math.random() * (a + 1));
      [arr[a], arr[b]] = [arr[b], arr[a]];
    }
    return arr;
  }

  function render() {
    root.innerHTML = "";
    const progress = document.createElement("div");
    progress.className = "mode-progress";
    progress.textContent = `Matched ${matchedCount} / ${pairs.length} — Mistakes: ${mistakes}`;
    root.appendChild(progress);

    const grid = document.createElement("div");
    grid.className = "match-grid";

    const termCol = document.createElement("div");
    termCol.className = "match-col";
    terms.forEach((t) => {
      const chip = document.createElement("button");
      chip.className = "match-chip";
      if (t.matched) chip.classList.add("matched");
      if (selectedTerm === t) chip.classList.add("selected");
      chip.textContent = t.text;
      chip.disabled = t.matched;
      chip.addEventListener("click", () => {
        selectedTerm = t;
        tryMatch();
        render();
      });
      termCol.appendChild(chip);
    });

    const defCol = document.createElement("div");
    defCol.className = "match-col";
    defs.forEach((d) => {
      const chip = document.createElement("button");
      chip.className = "match-chip";
      if (d.matched) chip.classList.add("matched");
      if (selectedDef === d) chip.classList.add("selected");
      chip.textContent = d.text;
      chip.disabled = d.matched;
      chip.addEventListener("click", () => {
        selectedDef = d;
        tryMatch();
        render();
      });
      defCol.appendChild(chip);
    });

    grid.appendChild(termCol);
    grid.appendChild(defCol);
    root.appendChild(grid);

    if (matchedCount === pairs.length) {
      finish();
    }
  }

  function tryMatch() {
    if (!selectedTerm || !selectedDef) return;
    if (selectedTerm.idx === selectedDef.idx) {
      selectedTerm.matched = true;
      selectedDef.matched = true;
      matchedCount++;
    } else {
      mistakes++;
    }
    selectedTerm = null;
    selectedDef = null;
  }

  function finish() {
    root.innerHTML = "";
    const scoreLine = document.createElement("div");
    scoreLine.className = "mode-progress";
    scoreLine.textContent = `All matched! Mistakes: ${mistakes}`;
    root.appendChild(scoreLine);

    const status = ctx.onComplete({ mistakes, total: pairs.length });
    root.appendChild(renderStreakStatus(status));

    const row = document.createElement("div");
    row.className = "flex-row";
    const retry = document.createElement("button");
    retry.className = "btn secondary";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => {
      terms = shuffle(pairs.map((p, idx) => ({ idx, text: p.term })));
      defs = shuffle(pairs.map((p, idx) => ({ idx, text: p.def })));
      matchedCount = 0;
      mistakes = 0;
      selectedTerm = null;
      selectedDef = null;
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

  render();
}
