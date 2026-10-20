import { TOPICS } from "./content/index.js";
import { mountQuiz } from "./modes/quiz.js";
import { mountOrdering } from "./modes/ordering.js";
import { mountMatching } from "./modes/matching.js";
import { mountSchedulerSim } from "./modes/scheduler-sim.js";
import { mountRaceSim } from "./modes/race-sim.js";
import { mountFlashcards } from "./modes/flashcards.js";

const STORAGE_KEY = "osquest_progress_v1";
const root = document.getElementById("view-root");

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* ignore (e.g. private browsing storage quota) */
  }
}

let progress = loadProgress();

function markBlockDone(topicId, blockId, meta = {}) {
  progress[topicId] = progress[topicId] || {};
  progress[topicId][blockId] = { done: true, ...meta };
  saveProgress(progress);
}

function isBlockDone(topicId, blockId) {
  return Boolean(progress[topicId]?.[blockId]?.done);
}

function topicProgressCount(topic) {
  const done = topic.blocks.filter((b) => isBlockDone(topic.id, b.id)).length;
  return { done, total: topic.blocks.length };
}

function overallProgress() {
  let done = 0;
  let total = 0;
  for (const topic of TOPICS) {
    const p = topicProgressCount(topic);
    done += p.done;
    total += p.total;
  }
  return { done, total };
}

function navigate(view) {
  window.location.hash = view;
}

function clearRoot() {
  root.innerHTML = "";
}

function renderHub() {
  clearRoot();
  const { done, total } = overallProgress();
  const pct = total ? Math.round((done / total) * 100) : 0;

  const intro = document.createElement("div");
  intro.className = "hub-intro";
  intro.innerHTML = `
    <h1>OS Quest</h1>
    <p>Pick a topic below. Each one mixes quizzes, drag-to-order puzzles, matching, and interactive simulations — whatever fits the material best.</p>
  `;
  root.appendChild(intro);

  const overall = document.createElement("div");
  overall.className = "overall-progress";
  overall.innerHTML = `
    <div class="label"><span>Overall progress</span><span>${done} / ${total} activities</span></div>
    <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
  `;
  root.appendChild(overall);

  const grid = document.createElement("div");
  grid.className = "topic-grid";

  TOPICS.forEach((topic) => {
    const { done, total } = topicProgressCount(topic);
    const card = document.createElement("div");
    card.className = "topic-card";
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="topic-head">
        <span class="topic-icon">${topic.icon}</span>
        <h3>${topic.title}</h3>
      </div>
      <p>${topic.description}</p>
      <div class="topic-meta">
        <span>${done}/${total} done</span>
        <span>${total ? Math.round((done / total) * 100) : 0}%</span>
      </div>
      <div class="progress-bar"><div class="progress-bar-fill" style="width:${total ? (done / total) * 100 : 0}%"></div></div>
    `;
    const go = () => navigate(`topic/${topic.id}`);
    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") go();
    });
    grid.appendChild(card);
  });

  root.appendChild(grid);
}

function blockLabel(type) {
  switch (type) {
    case "quiz": return "Quiz";
    case "flashcards": return "Flashcards";
    case "ordering": return "Ordering Puzzle";
    case "matching": return "Matching";
    case "scheduler-sim": return "Scheduler Sim";
    case "race-sim": return "Concurrency Sim";
    default: return type;
  }
}

function renderTopic(topicId) {
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) {
    navigate("");
    return;
  }
  clearRoot();

  const header = document.createElement("div");
  header.className = "module-header";
  header.innerHTML = `<button class="back-btn">&larr; Topics</button><h2>${topic.icon} ${topic.title}</h2>`;
  header.querySelector(".back-btn").addEventListener("click", () => navigate(""));
  root.appendChild(header);

  const desc = document.createElement("p");
  desc.style.color = "var(--text-dim)";
  desc.textContent = topic.description;
  root.appendChild(desc);

  const list = document.createElement("div");
  list.className = "block-list";

  topic.blocks.forEach((block) => {
    const row = document.createElement("div");
    row.className = "block-row";
    const done = isBlockDone(topic.id, block.id);
    row.innerHTML = `
      <div>
        <div class="block-title">${block.title}</div>
        <div class="block-type">${blockLabel(block.type)}</div>
      </div>
      <div class="block-status ${done ? "done" : ""}">${done ? "✓ Complete" : "Not started"}</div>
    `;
    row.addEventListener("click", () => navigate(`topic/${topic.id}/${block.id}`));
    list.appendChild(row);
  });

  root.appendChild(list);
}

function renderBlock(topicId, blockId) {
  const topic = TOPICS.find((t) => t.id === topicId);
  const block = topic?.blocks.find((b) => b.id === blockId);
  if (!topic || !block) {
    navigate("");
    return;
  }
  clearRoot();

  const header = document.createElement("div");
  header.className = "module-header";
  header.innerHTML = `<button class="back-btn">&larr; ${topic.title}</button><h2>${block.title}</h2>`;
  header.querySelector(".back-btn").addEventListener("click", () => navigate(`topic/${topic.id}`));
  root.appendChild(header);

  const shell = document.createElement("div");
  shell.className = "mode-shell";
  root.appendChild(shell);

  const ctx = {
    onComplete: (meta) => markBlockDone(topic.id, block.id, meta),
    goBackToTopic: () => navigate(`topic/${topic.id}`),
  };

  switch (block.type) {
    case "quiz": mountQuiz(shell, block, ctx); break;
    case "flashcards": mountFlashcards(shell, block, ctx); break;
    case "ordering": mountOrdering(shell, block, ctx); break;
    case "matching": mountMatching(shell, block, ctx); break;
    case "scheduler-sim": mountSchedulerSim(shell, block, ctx); break;
    case "race-sim": mountRaceSim(shell, block, ctx); break;
    default: shell.textContent = `Unknown block type: ${block.type}`;
  }
}

function router() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  if (parts[0] === "topic" && parts[1] && parts[2]) {
    renderBlock(parts[1], parts[2]);
  } else if (parts[0] === "topic" && parts[1]) {
    renderTopic(parts[1]);
  } else {
    renderHub();
  }
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", router);
document.addEventListener("DOMContentLoaded", router);
if (document.readyState !== "loading") router();

document.getElementById("btn-reset-progress").addEventListener("click", () => {
  if (confirm("Reset all progress? This can't be undone.")) {
    progress = {};
    saveProgress(progress);
    router();
  }
});
