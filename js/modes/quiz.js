import { prepareQuestions, renderStreakStatus } from "./util.js?v=14";

// Multiple-choice quiz mode.
// block: { id, title, sampleSize?, questions: [{ q, options: string[], correctIndex, explain }] }
// Each playthrough shuffles question order, shuffles each question's options, and (if
// sampleSize is set and there are more questions than that) draws a random subset —
// so replaying a block for study practice doesn't show the same quiz every time.

export function mountQuiz(root, block, ctx) {
  let questions = prepareQuestions(block.questions, block.sampleSize);
  let i = 0;
  let score = 0;
  let total = questions.length;

  function renderQuestion() {
    root.innerHTML = "";
    const progress = document.createElement("div");
    progress.className = "mode-progress";
    progress.textContent = `Question ${i + 1} / ${total} — Score: ${score}`;
    root.appendChild(progress);

    const q = questions[i];
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
    const scoreLine = document.createElement("div");
    scoreLine.className = "mode-progress";
    scoreLine.textContent = `You scored ${score} / ${total} (${pct}%)`;
    root.appendChild(scoreLine);

    const status = ctx.onComplete({ score, total });
    root.appendChild(renderStreakStatus(status));

    const row = document.createElement("div");
    row.className = "flex-row";
    const retry = document.createElement("button");
    retry.className = "btn secondary";
    retry.textContent = "New shuffle";
    retry.addEventListener("click", () => {
      questions = prepareQuestions(block.questions, block.sampleSize);
      total = questions.length;
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
