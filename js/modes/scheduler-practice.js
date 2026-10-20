import { runSchedule } from "../engine/scheduler.js?v=6";
import { shuffle } from "./util.js?v=6";

// Infinite randomized scheduling practice: a fresh set of jobs (and often a fresh
// algorithm) every round, with the ground truth always computed by the real
// scheduling engine — so there's an unlimited supply of new, always-correct problems.
// block: { id, title, intro?, algorithms: string[], jobCount:[min,max], burstRange:[min,max],
//          arrivalSpread?, quantumRange?:[min,max], mlfqQuantums?, rounds? }

const COLORS = ["#00f6ff", "#ff2fb0", "#ffd23f", "#39ff6a", "#b14bff", "#ff8a2b"];

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function colorFor(jobs, name) {
  const idx = jobs.findIndex((j) => j.name === name);
  return COLORS[idx % COLORS.length];
}

function renderGantt(container, timeline, jobs) {
  const row = document.createElement("div");
  row.className = "gantt-row";
  const blocks = [];
  for (const { t, job } of timeline) {
    const last = blocks[blocks.length - 1];
    if (last && last.job === job) last.end = t + 1;
    else blocks.push({ job, start: t, end: t + 1 });
  }
  const totalTime = blocks.length ? blocks[blocks.length - 1].end : 1;
  blocks.forEach((b) => {
    const div = document.createElement("div");
    const width = ((b.end - b.start) / totalTime) * 100;
    div.className = "gantt-block" + (b.job ? "" : " gantt-idle");
    div.style.width = `${width}%`;
    if (b.job) div.style.background = colorFor(jobs, b.job);
    div.textContent = b.job ?? "idle";
    div.title = `t=${b.start}..${b.end}`;
    row.appendChild(div);
  });
  container.appendChild(row);

  const axis = document.createElement("div");
  axis.className = "gantt-axis";
  blocks.forEach((b) => {
    const span = document.createElement("span");
    span.style.width = `${((b.end - b.start) / totalTime) * 100}%`;
    span.textContent = b.start;
    axis.appendChild(span);
  });
  const lastSpan = document.createElement("span");
  lastSpan.textContent = blocks.length ? blocks[blocks.length - 1].end : 0;
  axis.appendChild(lastSpan);
  container.appendChild(axis);
}

function metricLabel(metric) {
  return { completion: "completion time", turnaround: "turnaround time", response: "response time" }[metric] ?? metric;
}

function generateProblem(block) {
  const algorithm = block.algorithms[randInt(0, block.algorithms.length - 1)];
  const n = randInt(block.jobCount[0], block.jobCount[1]);
  const jobs = [];
  for (let k = 0; k < n; k++) {
    jobs.push({
      name: String.fromCharCode(65 + k),
      arrival: k === 0 ? 0 : randInt(0, block.arrivalSpread ?? 6),
      burst: randInt(block.burstRange[0], block.burstRange[1]),
    });
  }
  const quantum = algorithm === "RR" ? randInt(block.quantumRange?.[0] ?? 1, block.quantumRange?.[1] ?? 3) : undefined;
  const mlfq = algorithm === "MLFQ" ? { quantums: block.mlfqQuantums ?? [2, 4, 8] } : undefined;

  const { timeline, perJob } = runSchedule({ algorithm, jobs, quantum, mlfq });

  const metrics = ["completion", "turnaround", "response"];
  let job, metric, value;
  for (let attempt = 0; attempt < 30; attempt++) {
    job = jobs[randInt(0, jobs.length - 1)].name;
    metric = metrics[randInt(0, metrics.length - 1)];
    value = perJob[job][metric];
    if (value != null) break;
  }

  const distractorPool = new Set();
  [-3, -2, -1, 1, 2, 3, 4].forEach((d) => {
    const v = value + d;
    if (v >= 0 && v !== value) distractorPool.add(v);
  });
  const distractors = shuffle([...distractorPool]).slice(0, 3);
  const options = shuffle([value, ...distractors]);

  return { algorithm, jobs, quantum, mlfq, timeline, perJob, job, metric, value, options };
}

export function mountSchedulerPractice(root, block, ctx) {
  const totalRounds = block.rounds ?? 8;
  let round = 0;
  let score = 0;
  let problem = generateProblem(block);

  function algoDesc(p) {
    let d = p.algorithm;
    if (p.algorithm === "RR") d += ` (quantum = ${p.quantum})`;
    if (p.algorithm === "MLFQ") d += ` (quantums ${p.mlfq.quantums.join("/")})`;
    return d;
  }

  function render() {
    root.innerHTML = "";

    const title = document.createElement("div");
    title.className = "mode-progress";
    title.textContent = `Round ${round + 1} / ${totalRounds} — Score ${score} — Algorithm: ${algoDesc(problem)}`;
    root.appendChild(title);

    if (block.intro) {
      const intro = document.createElement("p");
      intro.style.color = "var(--text-dim)";
      intro.textContent = block.intro;
      root.appendChild(intro);
    }

    const table = document.createElement("table");
    table.className = "sched-jobs-table";
    table.innerHTML = `<tr><th>Job</th><th>Arrival</th><th>Burst</th></tr>${problem.jobs.map((j) => `<tr><td>${j.name}</td><td>${j.arrival}</td><td>${j.burst}</td></tr>`).join("")}`;
    root.appendChild(table);

    const qEl = document.createElement("div");
    qEl.className = "quiz-question";
    qEl.textContent = `What is the ${metricLabel(problem.metric)} of job ${problem.job}?`;
    root.appendChild(qEl);

    const optsEl = document.createElement("div");
    optsEl.className = "quiz-options";
    root.appendChild(optsEl);

    let answered = false;
    problem.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.textContent = String(opt);
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const isCorrect = opt === problem.value;
        if (isCorrect) score++;
        [...optsEl.children].forEach((c) => {
          c.classList.add("disabled");
          if (Number(c.textContent) === problem.value) c.classList.add("correct");
          else if (c === btn) c.classList.add("incorrect");
        });

        const ganttWrap = document.createElement("div");
        ganttWrap.style.marginTop = "16px";
        const label = document.createElement("div");
        label.className = "mode-progress";
        label.textContent = "Full schedule (Gantt chart):";
        ganttWrap.appendChild(label);
        renderGantt(ganttWrap, problem.timeline, problem.jobs);
        root.insertBefore(ganttWrap, nextBtn);
        nextBtn.disabled = false;
      });
      optsEl.appendChild(btn);
    });

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn";
    nextBtn.style.marginTop = "12px";
    nextBtn.textContent = round === totalRounds - 1 ? "Finish" : "Next random problem";
    nextBtn.disabled = true;
    nextBtn.addEventListener("click", () => {
      if (round === totalRounds - 1) {
        finish();
      } else {
        round++;
        problem = generateProblem(block);
        render();
      }
    });
    root.appendChild(nextBtn);
  }

  function finish() {
    root.innerHTML = "";
    const pct = Math.round((score / totalRounds) * 100);
    const banner = document.createElement("div");
    banner.className = `result-banner ${pct >= 70 ? "success" : "fail"}`;
    banner.textContent = `You scored ${score} / ${totalRounds} (${pct}%)`;
    root.appendChild(banner);

    ctx.onComplete({ score, total: totalRounds });

    const row = document.createElement("div");
    row.className = "flex-row";
    const retry = document.createElement("button");
    retry.className = "btn secondary";
    retry.textContent = "Practice again (new random problems)";
    retry.addEventListener("click", () => {
      round = 0;
      score = 0;
      problem = generateProblem(block);
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
