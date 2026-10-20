import { TOPICS } from "./content/index.js?v=9";
import { mountQuiz } from "./modes/quiz.js?v=9";
import { mountOrdering } from "./modes/ordering.js?v=9";
import { mountMatching } from "./modes/matching.js?v=9";
import { mountSchedulerSim } from "./modes/scheduler-sim.js?v=9";
import { mountSchedulerPractice } from "./modes/scheduler-practice.js?v=9";
import { mountRaceSim } from "./modes/race-sim.js?v=9";
import { mountFlashcards } from "./modes/flashcards.js?v=9";

const STORAGE_KEY = "osquest_progress_v2";
const READINGS_KEY = "osquest_readings_v1";
const DEFAULT_STREAK = 3;
const root = document.getElementById("view-root");

function loadJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore (e.g. private browsing storage quota) */
  }
}

function loadProgress() {
  return loadJSON(STORAGE_KEY);
}

function saveProgress(progress) {
  saveJSON(STORAGE_KEY, progress);
}

let progress = loadProgress();
let readingsDone = loadJSON(READINGS_KEY);

function toggleReadingDone(topicId, idx) {
  readingsDone[topicId] = readingsDone[topicId] || {};
  readingsDone[topicId][idx] = !readingsDone[topicId][idx];
  saveJSON(READINGS_KEY, readingsDone);
}

// A "pass" is a fully-correct attempt — the bar for counting toward mastery.
function blockPass(block, meta = {}) {
  switch (block.type) {
    case "quiz":
    case "scheduler-sim":
    case "scheduler-practice":
      return Boolean(meta.total) && meta.score === meta.total;
    case "flashcards":
      return Boolean(meta.total) && meta.known === meta.total;
    case "ordering":
      return Boolean(meta.allCorrect);
    case "matching":
      return (meta.mistakes ?? 0) === 0;
    case "race-sim":
      return Boolean(meta.correct);
    default:
      return false;
  }
}

// Recording an attempt updates a streak of consecutive fully-correct passes;
// a block only counts as "done" once that streak hits the required length —
// a single lucky/complete run is not enough to call it mastered.
function recordAttempt(topic, block, meta = {}) {
  progress[topic.id] = progress[topic.id] || {};
  const required = block.masteryStreak ?? DEFAULT_STREAK;
  const pass = blockPass(block, meta);
  const prev = progress[topic.id][block.id];
  const streak = pass ? (prev?.streak ?? 0) + 1 : 0;
  const done = streak >= required;
  progress[topic.id][block.id] = { done, streak, required, pass, meta };
  saveProgress(progress);
  return { done, streak, required, pass };
}

function isBlockDone(topicId, blockId) {
  return Boolean(progress[topicId]?.[blockId]?.done);
}

function blockStreakInfo(topicId, blockId) {
  const entry = progress[topicId]?.[blockId];
  if (!entry) return null;
  return { streak: entry.streak ?? 0, required: entry.required ?? DEFAULT_STREAK, done: Boolean(entry.done) };
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

// Turn a block's recorded completion meta into a 0-100 mastery percentage.
function blockPercent(block, meta) {
  if (!meta) return null;
  switch (block.type) {
    case "quiz":
    case "scheduler-sim":
    case "scheduler-practice":
      return meta.total ? (meta.score / meta.total) * 100 : null;
    case "flashcards":
      return meta.total ? (meta.known / meta.total) * 100 : null;
    case "ordering":
      return meta.total ? (meta.correctCount / meta.total) * 100 : null;
    case "matching":
      return meta.total != null ? (meta.total / (meta.total + (meta.mistakes || 0))) * 100 : null;
    case "race-sim":
      return meta.correct ? 100 : 0;
    default:
      return null;
  }
}

function topicMastery(topic) {
  const tp = progress[topic.id] || {};
  let sum = 0;
  let count = 0;
  const weak = [];
  const unattempted = [];
  topic.blocks.forEach((b) => {
    const entry = tp[b.id];
    if (!entry) {
      unattempted.push(b);
      return;
    }
    const pct = blockPercent(b, entry.meta);
    if (pct == null) return;
    sum += pct;
    count++;
    if (pct < 70) weak.push({ block: b, pct });
  });
  return { avg: count ? sum / count : null, attempted: count, totalBlocks: topic.blocks.length, weak, unattempted };
}

function masteryBadge(mastery) {
  if (mastery.attempted === 0) return { cls: "neutral", label: "Not started" };
  if (mastery.avg < 60) return { cls: "bad", label: `Needs review — ${Math.round(mastery.avg)}%` };
  if (mastery.avg < 85) return { cls: "warn", label: `Keep practicing — ${Math.round(mastery.avg)}%` };
  return { cls: "good", label: `Solid — ${Math.round(mastery.avg)}%` };
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

function renderReadings() {
  clearRoot();

  const header = document.createElement("div");
  header.className = "module-header";
  header.innerHTML = `<button class="back-btn">&lt;&lt; Topics</button><h2>📖 Readings & Review Guide</h2>`;
  header.querySelector(".back-btn").addEventListener("click", () => navigate(""));
  root.appendChild(header);

  const intro = document.createElement("div");
  intro.className = "hub-intro";
  intro.innerHTML = `
    <p>Your own course materials, organized by topic, plus suggestions based on how you've actually been scoring — not just whether you clicked through something.</p>
  `;
  root.appendChild(intro);

  TOPICS.forEach((topic) => {
    const mastery = topicMastery(topic);
    const badge = masteryBadge(mastery);

    const card = document.createElement("div");
    card.className = "readings-card";

    const head = document.createElement("div");
    head.className = "readings-card-head";
    head.innerHTML = `
      <h3>${topic.icon} ${topic.title}</h3>
      <span class="mastery-badge ${badge.cls}">${badge.label}</span>
    `;
    card.appendChild(head);

    if (topic.readings?.length) {
      const list = document.createElement("ul");
      list.className = "reading-list";
      topic.readings.forEach((r, idx) => {
        const li = document.createElement("li");

        if (r.kind === "missing") {
          li.className = "reading-item missing";
          li.innerHTML = `<span class="reading-kind-tag">⚠ missing</span><span>${r.title}</span>`;
          list.appendChild(li);
          return;
        }

        const done = Boolean(readingsDone[topic.id]?.[idx]);
        li.className = `reading-item ${done ? "read" : ""}`;
        const cbId = `read-${topic.id}-${idx}`;
        const kindTag = {
          chapter: `📄 Ch. ${r.chapter}`,
          slides: "🖥 slides",
          code: "💻 code",
          handout: "📋 handout",
        }[r.kind] ?? "";
        li.innerHTML = `
          <input type="checkbox" id="${cbId}" ${done ? "checked" : ""} />
          <label for="${cbId}">${kindTag ? `<span class="reading-kind-tag">${kindTag}</span> ` : ""}${r.title} <span class="reading-file">(${r.file})</span></label>
        `;
        li.querySelector("input").addEventListener("change", () => {
          toggleReadingDone(topic.id, idx);
          renderReadings();
        });
        list.appendChild(li);
      });
      card.appendChild(list);
    }

    if (mastery.attempted === 0) {
      const box = document.createElement("div");
      box.className = "suggestions-box";
      box.innerHTML = `<h4>Suggestion</h4>`;
      if (topic.notes?.length) {
        const notesBtn = document.createElement("button");
        notesBtn.className = "suggestion-item";
        notesBtn.textContent = `📖 Read the study notes for ${topic.title} →`;
        notesBtn.addEventListener("click", () => navigate(`topic/${topic.id}/notes`));
        box.appendChild(notesBtn);
      }
      const btn = document.createElement("button");
      btn.className = "suggestion-item";
      btn.textContent = `Start with ${topic.title} →`;
      btn.addEventListener("click", () => navigate(`topic/${topic.id}`));
      box.appendChild(btn);
      card.appendChild(box);
    } else if (mastery.weak.length > 0 || mastery.unattempted.length > 0) {
      const box = document.createElement("div");
      box.className = "suggestions-box";
      box.innerHTML = `<h4>Looks like you're struggling with this one — review, then retry</h4>`;
      if (topic.notes?.length) {
        const notesBtn = document.createElement("button");
        notesBtn.className = "suggestion-item";
        notesBtn.textContent = `📖 Read the study notes for ${topic.title} →`;
        notesBtn.addEventListener("click", () => navigate(`topic/${topic.id}/notes`));
        box.appendChild(notesBtn);
      }
      mastery.weak
        .sort((a, b) => a.pct - b.pct)
        .forEach(({ block, pct }) => {
          const btn = document.createElement("button");
          btn.className = "suggestion-item";
          btn.textContent = `↻ ${block.title} — ${Math.round(pct)}%`;
          btn.addEventListener("click", () => navigate(`topic/${topic.id}/${block.id}`));
          box.appendChild(btn);
        });
      mastery.unattempted.forEach((block) => {
        const btn = document.createElement("button");
        btn.className = "suggestion-item";
        btn.textContent = `• Not tried yet: ${block.title}`;
        btn.addEventListener("click", () => navigate(`topic/${topic.id}/${block.id}`));
        box.appendChild(btn);
      });
      card.appendChild(box);
    } else {
      const box = document.createElement("div");
      box.className = "suggestions-box ok";
      box.innerHTML = `<h4>You're solid here</h4><div style="color:var(--text-dim); font-size:0.88rem;">Every activity in this topic is averaging 70%+. Keep it up, or jump into Random Practice for more reps.</div>`;
      card.appendChild(box);
    }

    root.appendChild(card);
  });
}

function blockLabel(type) {
  switch (type) {
    case "quiz": return "Quiz";
    case "flashcards": return "Flashcards";
    case "ordering": return "Ordering Puzzle";
    case "matching": return "Matching";
    case "scheduler-sim": return "Scheduler Sim";
    case "scheduler-practice": return "Random Practice";
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
  header.innerHTML = `<button class="back-btn">&lt;&lt; Topics</button><h2>${topic.icon} ${topic.title}</h2>`;
  header.querySelector(".back-btn").addEventListener("click", () => navigate(""));
  root.appendChild(header);

  const desc = document.createElement("p");
  desc.style.color = "var(--text-dim)";
  desc.textContent = topic.description;
  root.appendChild(desc);

  if (topic.notes?.length) {
    const notesBtn = document.createElement("button");
    notesBtn.className = "btn";
    notesBtn.style.marginBottom = "18px";
    notesBtn.textContent = "📖 Read the study notes for this topic";
    notesBtn.addEventListener("click", () => navigate(`topic/${topic.id}/notes`));
    root.appendChild(notesBtn);
  }

  const list = document.createElement("div");
  list.className = "block-list";

  topic.blocks.forEach((block) => {
    const row = document.createElement("div");
    row.className = "block-row";
    const info = blockStreakInfo(topic.id, block.id);
    let statusText = "Not started";
    let statusCls = "";
    if (info) {
      if (info.done) {
        statusText = "🏆 Mastered";
        statusCls = "done";
      } else if (info.streak > 0) {
        statusText = `Streak ${info.streak}/${info.required}`;
        statusCls = "streak";
      } else {
        statusText = `Needs ${info.required} perfect in a row`;
        statusCls = "retry";
      }
    }
    row.innerHTML = `
      <div>
        <div class="block-title">${block.title}</div>
        <div class="block-type">${blockLabel(block.type)}</div>
      </div>
      <div class="block-status ${statusCls}">${statusText}</div>
    `;
    row.addEventListener("click", () => navigate(`topic/${topic.id}/${block.id}`));
    list.appendChild(row);
  });

  root.appendChild(list);
}

function renderNotesHub() {
  clearRoot();

  const header = document.createElement("div");
  header.className = "module-header";
  header.innerHTML = `<button class="back-btn">&lt;&lt; Topics</button><h2>📝 Study Notes</h2>`;
  header.querySelector(".back-btn").addEventListener("click", () => navigate(""));
  root.appendChild(header);

  const intro = document.createElement("div");
  intro.className = "hub-intro";
  intro.innerHTML = `<p>Condensed study notes for every topic — covering the textbook chapters AND the lecture slides, in one place. Pick a topic to start reading.</p>`;
  root.appendChild(intro);

  const grid = document.createElement("div");
  grid.className = "topic-grid";

  TOPICS.forEach((topic) => {
    const card = document.createElement("div");
    card.className = "topic-card";
    card.tabIndex = 0;
    card.innerHTML = `
      <div class="topic-head">
        <span class="topic-icon">${topic.icon}</span>
        <h3>${topic.title}</h3>
      </div>
      <p>${topic.description}</p>
      <div class="topic-meta"><span>${topic.notes?.length ?? 0} note sections</span></div>
    `;
    const go = () => navigate(`topic/${topic.id}/notes`);
    card.addEventListener("click", go);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") go();
    });
    grid.appendChild(card);
  });

  root.appendChild(grid);
}

function renderNotes(topicId) {
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) {
    navigate("");
    return;
  }
  clearRoot();

  const header = document.createElement("div");
  header.className = "module-header";
  header.innerHTML = `<button class="back-btn">&lt;&lt; ${topic.title}</button><h2>📖 ${topic.title} — Study Notes</h2>`;
  header.querySelector(".back-btn").addEventListener("click", () => navigate(`topic/${topic.id}`));
  root.appendChild(header);

  const shell = document.createElement("div");
  shell.className = "mode-shell notes-shell";

  if (!topic.notes?.length) {
    shell.textContent = "No notes written for this topic yet.";
  } else {
    topic.notes.forEach((section) => {
      const h = document.createElement("h3");
      h.textContent = section.heading;
      const p = document.createElement("p");
      p.textContent = section.body;
      shell.appendChild(h);
      shell.appendChild(p);
    });
  }
  root.appendChild(shell);

  const row = document.createElement("div");
  row.className = "flex-row";
  row.style.marginTop = "18px";
  const practiceBtn = document.createElement("button");
  practiceBtn.className = "btn";
  practiceBtn.textContent = "Done reading — go practice →";
  practiceBtn.addEventListener("click", () => navigate(`topic/${topic.id}`));
  row.appendChild(practiceBtn);
  root.appendChild(row);
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
  header.innerHTML = `<button class="back-btn">&lt;&lt; ${topic.title}</button><h2>${block.title}</h2>`;
  header.querySelector(".back-btn").addEventListener("click", () => navigate(`topic/${topic.id}`));
  root.appendChild(header);

  const shell = document.createElement("div");
  shell.className = "mode-shell";
  root.appendChild(shell);

  const ctx = {
    onComplete: (meta) => recordAttempt(topic, block, meta),
    goBackToTopic: () => navigate(`topic/${topic.id}`),
  };

  switch (block.type) {
    case "quiz": mountQuiz(shell, block, ctx); break;
    case "flashcards": mountFlashcards(shell, block, ctx); break;
    case "ordering": mountOrdering(shell, block, ctx); break;
    case "matching": mountMatching(shell, block, ctx); break;
    case "scheduler-sim": mountSchedulerSim(shell, block, ctx); break;
    case "scheduler-practice": mountSchedulerPractice(shell, block, ctx); break;
    case "race-sim": mountRaceSim(shell, block, ctx); break;
    default: shell.textContent = `Unknown block type: ${block.type}`;
  }
}

function router() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  if (parts[0] === "topic" && parts[1] && parts[2] === "notes") {
    renderNotes(parts[1]);
  } else if (parts[0] === "topic" && parts[1] && parts[2]) {
    renderBlock(parts[1], parts[2]);
  } else if (parts[0] === "topic" && parts[1]) {
    renderTopic(parts[1]);
  } else if (parts[0] === "readings") {
    renderReadings();
  } else if (parts[0] === "notes") {
    renderNotesHub();
  } else {
    renderHub();
  }
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", router);
document.addEventListener("DOMContentLoaded", router);
if (document.readyState !== "loading") router();

document.getElementById("btn-notes").addEventListener("click", () => navigate("notes"));
document.getElementById("btn-readings").addEventListener("click", () => navigate("readings"));

document.getElementById("btn-reset-progress").addEventListener("click", () => {
  if (confirm("Reset all progress? This can't be undone.")) {
    progress = {};
    saveProgress(progress);
    router();
  }
});
