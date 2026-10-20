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
