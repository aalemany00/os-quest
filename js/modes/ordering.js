import { renderStreakStatus } from "./util.js?v=13";

// Step-ordering puzzle. Works well on touch via up/down buttons (no drag-and-drop needed).
// block: { id, title, prompt, steps: string[] in correct order }

export function mountOrdering(root, block, ctx) {
  const correctOrder = block.steps;
  let current = shuffle([...correctOrder]);
  let checked = false;

  function shuffle(arr) {
    let same = true;
    while (same) {
      for (let a = arr.length - 1; a > 0; a--) {
        const b = Math.floor(Math.random() * (a + 1));
        [arr[a], arr[b]] = [arr[b], arr[a]];
      }
      same = arr.every((v, idx) => v === correctOrder[idx]) && arr.length > 1;
    }
    return arr;
  }

  function move(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= current.length) return;
    [current[idx], current[j]] = [current[j], current[idx]];
    render();
  }

  function render() {
    root.innerHTML = "";
    if (block.prompt) {
      const p = document.createElement("div");
      p.className = "mode-progress";
      p.textContent = block.prompt;
      root.appendChild(p);
    }

    const list = document.createElement("div");
    list.className = "order-list";

    current.forEach((step, idx) => {
      const item = document.createElement("div");
      item.className = "order-item";
      if (checked) {
        item.classList.add(step === correctOrder[idx] ? "correct-pos" : "wrong-pos");
      }
      item.innerHTML = `
        <span class="idx">${idx + 1}</span>
        <span style="flex:1">${step}</span>
      `;
      const btnWrap = document.createElement("span");
      btnWrap.style.display = "flex";
      btnWrap.style.gap = "4px";

      const up = document.createElement("button");
      up.className = "btn secondary";
      up.style.padding = "4px 8px";
      up.textContent = "↑";
      up.disabled = checked;
      up.addEventListener("click", () => move(idx, -1));

      const down = document.createElement("button");
      down.className = "btn secondary";
      down.style.padding = "4px 8px";
      down.textContent = "↓";
      down.disabled = checked;
      down.addEventListener("click", () => move(idx, 1));

      btnWrap.appendChild(up);
      btnWrap.appendChild(down);
      item.appendChild(btnWrap);
      list.appendChild(item);
    });

    root.appendChild(list);

    if (!checked) {
      const checkBtn = document.createElement("button");
      checkBtn.className = "btn";
      checkBtn.textContent = "Check order";
      checkBtn.addEventListener("click", () => {
        checked = true;
        const correctCount = current.filter((s, idx) => s === correctOrder[idx]).length;
        const allCorrect = correctCount === correctOrder.length;
        render();
        const scoreLine = document.createElement("div");
        scoreLine.className = "mode-progress";
        scoreLine.textContent = allCorrect
          ? "Correct order!"
          : `${correctCount} / ${correctOrder.length} steps in the right position.`;
        root.appendChild(scoreLine);

        const status = ctx.onComplete({ correctCount, total: correctOrder.length, allCorrect });
        root.appendChild(renderStreakStatus(status));

        const row = document.createElement("div");
        row.className = "flex-row";
        const retry = document.createElement("button");
        retry.className = "btn secondary";
        retry.textContent = "Shuffle & retry";
        retry.addEventListener("click", () => {
          current = shuffle([...correctOrder]);
          checked = false;
          render();
        });
        const back = document.createElement("button");
        back.className = "btn";
        back.textContent = "Back to topic";
        back.addEventListener("click", ctx.goBackToTopic);
        row.appendChild(retry);
        row.appendChild(back);
        root.appendChild(row);
      });
      root.appendChild(checkBtn);
    }
  }

  render();
}
