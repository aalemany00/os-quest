import { renderStreakStatus } from "./util.js?v=14";

// Flashcard mode — flip to reveal, self-rate known/unknown.
// block: { id, title, cards: [{ front, back }] }

export function mountFlashcards(root, block, ctx) {
  let i = 0;
  let known = 0;
  let flipped = false;
  const total = block.cards.length;
  const order = shuffle([...block.cards.keys()]);

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
    progress.textContent = `Card ${i + 1} / ${total} — Known: ${known}`;
    root.appendChild(progress);

    const card = block.cards[order[i]];
    const cardEl = document.createElement("div");
    cardEl.className = "quiz-question";
    cardEl.style.minHeight = "80px";
    cardEl.style.cursor = "pointer";
    cardEl.style.border = "1px solid var(--border)";
    cardEl.style.borderRadius = "10px";
    cardEl.style.padding = "20px";
    cardEl.style.background = "var(--bg-elevated)";
    cardEl.textContent = flipped ? card.back : card.front;
    cardEl.title = "Click to flip";
    cardEl.addEventListener("click", () => {
      flipped = !flipped;
      render();
    });
    root.appendChild(cardEl);

    const hint = document.createElement("div");
    hint.className = "mode-progress";
    hint.style.marginTop = "8px";
    hint.textContent = flipped ? "" : "(tap the card to reveal the answer)";
    root.appendChild(hint);

    const row = document.createElement("div");
    row.className = "flex-row";
    row.style.marginTop = "16px";

    const unknownBtn = document.createElement("button");
    unknownBtn.className = "btn secondary";
    unknownBtn.textContent = "Still learning";
    unknownBtn.disabled = !flipped;
    unknownBtn.addEventListener("click", () => advance(false));

    const knownBtn = document.createElement("button");
    knownBtn.className = "btn";
    knownBtn.textContent = "I knew it";
    knownBtn.disabled = !flipped;
    knownBtn.addEventListener("click", () => advance(true));

    row.appendChild(unknownBtn);
    row.appendChild(knownBtn);
    root.appendChild(row);
  }

  function advance(gotIt) {
    if (gotIt) known++;
    flipped = false;
    if (i === total - 1) {
      finish();
    } else {
      i++;
      render();
    }
  }

  function finish() {
    root.innerHTML = "";
    const pct = Math.round((known / total) * 100);
    const scoreLine = document.createElement("div");
    scoreLine.className = "mode-progress";
    scoreLine.textContent = `You knew ${known} / ${total} cards (${pct}%)`;
    root.appendChild(scoreLine);

    const status = ctx.onComplete({ known, total });
    root.appendChild(renderStreakStatus(status));

    const row = document.createElement("div");
    row.className = "flex-row";
    const retry = document.createElement("button");
    retry.className = "btn secondary";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => {
      i = 0;
      known = 0;
      flipped = false;
      shuffle(order);
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
