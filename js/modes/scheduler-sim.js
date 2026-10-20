import { runSchedule } from "../engine/scheduler.js";
import { shuffle } from "./util.js";

// block: { id, title, algorithm, quantum?, mlfq?, jobs: [{name, arrival, burst}],
//          intro?: string, questions: [{ metric: 'completion'|'turnaround'|'response'|'waiting', job, options, correctIndex }] }

const COLORS = ["#5ee6c4", "#ffc864", "#ff8bb3", "#8ab4ff", "#c792ea", "#7fe0ff"];

function colorFor(jobs, name) {
  const idx = jobs.findIndex((j) => j.name === name);
  return COLORS[idx % COLORS.length];
}

function renderGantt(container, timeline, jobs) {
  const row = document.createElement("div");
  row.className = "gantt-row";

  // collapse consecutive identical ticks into blocks
  const blocks = [];
  for (const { t, job } of timeline) {
    const last = blocks[blocks.length - 1];
    if (last && last.job === job) {
      last.end = t + 1;
    } else {
      blocks.push({ job, start: t, end: t + 1 });
    }
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
    const width = ((b.end - b.start) / totalTime) * 100;
    span.style.width = `${width}%`;
    span.textContent = b.start;
    axis.appendChild(span);
  });
  const lastSpan = document.createElement("span");
  lastSpan.textContent = blocks.length ? blocks[blocks.length - 1].end : 0;
  lastSpan.style.width = "0";
  axis.appendChild(lastSpan);
  container.appendChild(axis);
}

function renderJobsTable(container, jobs) {
  const table = document.createElement("table");
  table.className = "sched-jobs-table";
  table.innerHTML = `
    <tr><th>Job</th><th>Arrival</th><th>Burst</th></tr>
    ${jobs.map((j) => `<tr><td>${j.name}</td><td>${j.arrival}</td><td>${j.burst}</td></tr>`).join("")}
  `;
  container.appendChild(table);
}

export function mountSchedulerSim(root, block, ctx) {
  const { timeline, perJob } = runSchedule({
    algorithm: block.algorithm,
    jobs: block.jobs,
    quantum: block.quantum,
    mlfq: block.mlfq,
  });

  let questions = shuffle(block.questions).map((q) => ({ ...q, options: shuffle(q.options) }));
  let i = 0;
  let score = 0;
  let total = questions.length;

  function metricValue(metric, jobName) {
    return perJob[jobName]?.[metric];
  }

  function metricLabel(metric) {
    return { completion: "completion time", turnaround: "turnaround time", response: "response time", waiting: "waiting time" }[metric] ?? metric;
  }

  function render() {
    root.innerHTML = "";

    const title = document.createElement("div");
    title.className = "mode-progress";
    let algoDesc = block.algorithm;
    if (block.algorithm === "RR") algoDesc += ` (quantum = ${block.quantum})`;
    if (block.algorithm === "MLFQ") algoDesc += ` (${block.mlfq.quantums.length} queues, quantums ${block.mlfq.quantums.join("/")}${block.mlfq.boostInterval ? `, boost every ${block.mlfq.boostInterval}` : ""})`;
    title.textContent = `Algorithm: ${algoDesc} — Question ${i + 1}/${total} — Score ${score}`;
    root.appendChild(title);

    if (block.intro) {
      const intro = document.createElement("p");
      intro.style.color = "var(--text-dim)";
      intro.textContent = block.intro;
      root.appendChild(intro);
    }

    renderJobsTable(root, block.jobs);

    const q = questions[i];
    const qEl = document.createElement("div");
    qEl.className = "quiz-question";
    qEl.textContent = `What is the ${metricLabel(q.metric)} of job ${q.job}?`;
    root.appendChild(qEl);

    const optsEl = document.createElement("div");
    optsEl.className = "quiz-options";
    root.appendChild(optsEl);

    let answered = false;
    const correctValue = metricValue(q.metric, q.job);

    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.textContent = String(opt);
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const isCorrect = opt === correctValue;
        if (isCorrect) score++;
        [...optsEl.children].forEach((c) => {
          c.classList.add("disabled");
          if (Number(c.textContent) === correctValue) c.classList.add("correct");
          else if (c === btn) c.classList.add("incorrect");
        });

        const ganttWrap = document.createElement("div");
        ganttWrap.style.marginTop = "16px";
        const label = document.createElement("div");
        label.className = "mode-progress";
        label.textContent = "Full schedule (Gantt chart):";
        ganttWrap.appendChild(label);
        renderGantt(ganttWrap, timeline, block.jobs);
        root.insertBefore(ganttWrap, nextBtn);
        nextBtn.disabled = false;
      });
      optsEl.appendChild(btn);
    });

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn";
    nextBtn.style.marginTop = "12px";
    nextBtn.textContent = i === total - 1 ? "Finish" : "Next";
    nextBtn.disabled = true;
    nextBtn.addEventListener("click", () => {
      if (i === total - 1) finish();
      else {
        i++;
        render();
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
    retry.textContent = "New shuffle";
    retry.addEventListener("click", () => {
      questions = shuffle(block.questions).map((q) => ({ ...q, options: shuffle(q.options) }));
      total = questions.length;
      i = 0;
      score = 0;
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
