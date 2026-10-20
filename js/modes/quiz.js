// Multiple-choice quiz mode.
// block: { id, title, questions: [{ q, options: string[], correctIndex, explain }] }

export function mountQuiz(root, block, ctx) {
  let i = 0;
  let score = 0;
  const total = block.questions.length;

  function renderQuestion() {
    root.innerHTML = "";
    const progress = document.createElement("div");
    progress.className = "mode-progress";
    progress.textContent = `Question ${i + 1} / ${total} — Score: ${score}`;
    root.appendChild(progress);

    const q = block.questions[i];
    const qEl = document.createElement("div");
    qEl.className = "quiz-question";
    qEl.textContent = q.q;
    root.appendChild(qEl);

    const optsEl = document.createElement("div");
    optsEl.className = "quiz-options";
    root.appendChild(optsEl);

    let answered = false;
    q.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.textContent = opt;
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const correct = idx === q.correctIndex;
        if (correct) score++;
        [...optsEl.children].forEach((c, ci) => {
          c.classList.add("disabled");
          if (ci === q.correctIndex) c.classList.add("correct");
          else if (ci === idx) c.classList.add("incorrect");
        });

        if (q.explain) {
          const ex = document.createElement("div");
          ex.className = "quiz-explain";
          ex.textContent = q.explain;
          root.insertBefore(ex, nextBtn);
        }
        nextBtn.disabled = false;
      });
      optsEl.appendChild(btn);
    });

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn";
    nextBtn.textContent = i === total - 1 ? "Finish" : "Next";
    nextBtn.disabled = true;
    nextBtn.addEventListener("click", () => {
      if (i === total - 1) {
        finish();
      } else {
        i++;
        renderQuestion();
      }
    });
    root.appendChild(nextBtn);
  }

  function finish() {
    root.innerHTML = "";
    const pct = Math.round((score / total) * 100);
    const banner = document.createElement("div");
    banner.className = `result-banner ${pct >= 70 ? "success" : "fail"}`;
    banner.textContent = `You scored ${score} / ${total} (${pct}%)`;
    root.appendChild(banner);

    ctx.onComplete({ score, total });

    const row = document.createElement("div");
    row.className = "flex-row";
    const retry = document.createElement("button");
    retry.className = "btn secondary";
    retry.textContent = "Retry";
    retry.addEventListener("click", () => {
      i = 0;
      score = 0;
      renderQuestion();
    });
    const back = document.createElement("button");
    back.className = "btn";
    back.textContent = "Back to topic";
    back.addEventListener("click", ctx.goBackToTopic);
    row.appendChild(retry);
    row.appendChild(back);
    root.appendChild(row);
  }

  renderQuestion();
}
