export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample(arr, n) {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

// Shuffle a quiz question's options while keeping track of the correct one.
export function shuffleQuestion(q) {
  const options = shuffle(q.options.map((opt, idx) => ({ opt, isCorrect: idx === q.correctIndex })));
  return {
    ...q,
    options: options.map((o) => o.opt),
    correctIndex: options.findIndex((o) => o.isCorrect),
  };
}

// Pick (optionally sample) questions, in random order, with options shuffled too.
export function prepareQuestions(questions, sampleSize) {
  let pool = shuffle(questions);
  if (sampleSize && pool.length > sampleSize) pool = pool.slice(0, sampleSize);
  return pool.map(shuffleQuestion);
}

// Builds the "streak" status element every mode shows after ctx.onComplete() returns —
// mastery requires several fully-correct runs in a row, not just one.
export function renderStreakStatus(status) {
  const div = document.createElement("div");
  div.className = "result-banner " + (status.done ? "success" : status.pass ? "streak" : "fail");
  if (status.done) {
    div.textContent = `🏆 Mastered! ${status.required}/${status.required} perfect runs in a row.`;
  } else if (status.pass) {
    div.textContent = `✅ Perfect run! Streak ${status.streak}/${status.required} — do it again to lock it in.`;
  } else if (status.streak === 0 && status.pass === false) {
    div.textContent = `Not quite 100% — streak reset. Get ${status.required} fully-correct runs in a row to master this.`;
  }
  return div;
}
