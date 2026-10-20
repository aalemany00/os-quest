import { TOPICS } from "./content/index.js?v=14";
import { mountQuiz } from "./modes/quiz.js?v=14";
import { mountOrdering } from "./modes/ordering.js?v=14";
import { mountMatching } from "./modes/matching.js?v=14";
import { mountSchedulerSim } from "./modes/scheduler-sim.js?v=14";
import { mountSchedulerPractice } from "./modes/scheduler-practice.js?v=14";
import { mountRaceSim } from "./modes/race-sim.js?v=14";
import { mountFlashcards } from "./modes/flashcards.js?v=14";

// Legacy (pre-profile) single-user keys — migrated into the first profile created
// on a given device, so nobody loses progress when this feature rolls out.
const LEGACY_PROGRESS_KEY = "osquest_progress_v2";
const LEGACY_READINGS_KEY = "osquest_readings_v1";

const PROFILES_KEY = "osquest_profiles_v1";
const ACTIVE_PROFILE_KEY = "osquest_active_profile_v1";
const DEFAULT_STREAK = 3;
const root = document.getElementById("view-root");

function loadJSON(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore (e.g. private browsing storage quota) */
  }
}

function progressKey(id) {
  return `osquest_progress_v2::${id}`;
}
function readingsKey(id) {
  return `osquest_readings_v1::${id}`;
}

function makeProfileId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// An optional PIN is a casual deterrent, not real security — everything here is
// still client-side and inspectable — but it stops someone from just clicking
// another profile in the list on a shared device. Stored hashed, never in plain text.
async function hashPin(pin) {
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(pin);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for very old browsers without SubtleCrypto: a simple non-cryptographic
  // checksum. Still fine for "casual deterrent" purposes, just not collision-proof.
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }
  return `djb2:${hash}`;
}

// Prompts for a profile's PIN and checks it. Returns true if there's no PIN set,
// or if the entered one matches; false if the user cancels or gets it wrong.
async function verifyPin(name, pinHash) {
  if (!pinHash) return true;
  const entered = prompt(`Enter the PIN for ${name}:`);
  if (entered == null) return false;
  const hash = await hashPin(entered);
  if (hash !== pinHash) {
    alert("Incorrect PIN.");
    return false;
  }
  return true;
}

// Profiles are { id, name } — the id (not the name) is what scopes storage, so two
// different people who happen to type the same name never share or overwrite a save.
let profiles = loadJSON(PROFILES_KEY, []);
let activeProfileId = loadJSON(ACTIVE_PROFILE_KEY, null);

// One-time migration from the very first version of profiles, where both `profiles`
// and the active-profile pointer were just plain name strings with no id — and
// progress/readings were keyed directly by that name. Give each a real id, and move
// its saved data from the old name-keyed storage to the new id-keyed storage.
if (profiles.some((p) => typeof p === "string")) {
  profiles = profiles.map((p) => {
    if (typeof p !== "string") return p;
    const id = makeProfileId();
    const name = p;
    const oldProgress = loadJSON(progressKey(name), null);
    const oldReadings = loadJSON(readingsKey(name), null);
    if (oldProgress) saveJSON(progressKey(id), oldProgress);
    if (oldReadings) saveJSON(readingsKey(id), oldReadings);
    try {
      localStorage.removeItem(progressKey(name));
      localStorage.removeItem(readingsKey(name));
    } catch {
      /* ignore */
    }
    return { id, name };
  });
  saveJSON(PROFILES_KEY, profiles);
}
if (typeof activeProfileId === "string" && !profiles.some((p) => p.id === activeProfileId)) {
  const match = profiles.find((p) => p.name === activeProfileId);
  activeProfileId = match ? match.id : null;
  saveJSON(ACTIVE_PROFILE_KEY, activeProfileId);
}

function activeProfile() {
  return profiles.find((p) => p.id === activeProfileId) ?? null;
}

let progress = activeProfileId ? loadJSON(progressKey(activeProfileId), {}) : {};
let readingsDone = activeProfileId ? loadJSON(readingsKey(activeProfileId), {}) : {};

function saveProgress(p) {
  if (!activeProfileId) return;
  saveJSON(progressKey(activeProfileId), p);
}

function saveReadingsDone(r) {
  if (!activeProfileId) return;
  saveJSON(readingsKey(activeProfileId), r);
}

function toggleReadingDone(topicId, idx) {
  readingsDone[topicId] = readingsDone[topicId] || {};
  readingsDone[topicId][idx] = !readingsDone[topicId][idx];
  saveReadingsDone(readingsDone);
}

// Always creates a brand-new, distinctly-scoped profile — even if the name matches
// an existing one (that's two different people, not the same returning person; the
// caller is responsible for warning about the name collision before calling this).
function createProfile(name, pinHash = null) {
  const id = makeProfileId();
  profiles = [...profiles, { id, name, pinHash }];
  saveJSON(PROFILES_KEY, profiles);
  if (profiles.length === 1) {
    const legacyProgress = loadJSON(LEGACY_PROGRESS_KEY, null);
    const legacyReadings = loadJSON(LEGACY_READINGS_KEY, null);
    if (legacyProgress) saveJSON(progressKey(id), legacyProgress);
    if (legacyReadings) saveJSON(readingsKey(id), legacyReadings);
  }
  selectProfileById(id);
}

function selectProfileById(id) {
  activeProfileId = id;
  saveJSON(ACTIVE_PROFILE_KEY, id);
  progress = loadJSON(progressKey(id), {});
  readingsDone = loadJSON(readingsKey(id), {});
}

function signOutProfile() {
  activeProfileId = null;
  saveJSON(ACTIVE_PROFILE_KEY, null);
  progress = {};
  readingsDone = {};
}

// Export/Import is how a save follows a specific person across devices: there's no
// server here to "log in" to, so the sync code itself — carrying the profile's real
// id, not just its display name — is what proves it's the same person's data. It's
// a plain copy-pasteable string (not a file), so it works fine on a phone.
function encodeSyncCode(payload) {
  const json = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeSyncCode(code) {
  const json = decodeURIComponent(escape(atob(code.trim())));
  return JSON.parse(json);
}

function buildSyncCode(id) {
  const p = profiles.find((prof) => prof.id === id);
  if (!p) return null;
  const payload = {
    kind: "osquest-save",
    version: 1,
    id: p.id,
    name: p.name,
    pinHash: p.pinHash ?? null,
    exportedAt: new Date().toISOString(),
    progress: loadJSON(progressKey(id), {}),
    readingsDone: loadJSON(readingsKey(id), {}),
  };
  return encodeSyncCode(payload);
}

// Importing re-homes a profile on this device by its id: if a profile with that
// exact id already exists here (you studying on a second device), its data is
// overwritten with the imported save — a true continuation, not a name-based guess.
// If this id has never been seen on this device, a new profile entry is created for
// it (still using the original id), independent of any other locally-named profile.
function importProfile(data) {
  if (!data || data.kind !== "osquest-save" || !data.id || !data.name) {
    alert("That doesn't look like a valid OS Quest sync code.");
    return;
  }
  const existing = profiles.find((p) => p.id === data.id);
  if (existing) {
    profiles = profiles.map((p) => (p.id === data.id ? { ...p, name: data.name, pinHash: data.pinHash ?? p.pinHash ?? null } : p));
  } else {
    profiles = [...profiles, { id: data.id, name: data.name, pinHash: data.pinHash ?? null }];
  }
  saveJSON(PROFILES_KEY, profiles);
  saveJSON(progressKey(data.id), data.progress ?? {});
  saveJSON(readingsKey(data.id), data.readingsDone ?? {});
  selectProfileById(data.id);
}

function deleteProfile(id) {
  profiles = profiles.filter((p) => p.id !== id);
  saveJSON(PROFILES_KEY, profiles);
  try {
    localStorage.removeItem(progressKey(id));
    localStorage.removeItem(readingsKey(id));
  } catch {
    /* ignore */
  }
  if (activeProfileId === id) signOutProfile();
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
  const current = window.location.hash.replace(/^#\/?/, "");
  if (current === view) {
    // Setting the hash to its current value doesn't fire 'hashchange' — re-render directly
    // (this matters right after selecting a profile while already sitting at the bare hub URL).
    router();
  } else {
    window.location.hash = view;
  }
}

function clearRoot() {
  root.innerHTML = "";
}

function renderProfileGate() {
  clearRoot();

  const intro = document.createElement("div");
  intro.className = "hub-intro";
  intro.innerHTML = `
    <h1>🕹️ Who's Playing?</h1>
    <p>Everyone studying from this device/link gets their own save file — pick your name to load your progress, or create a new one. Nothing here is sent anywhere; it's saved only in this browser.</p>
  `;
  root.appendChild(intro);

  if (profiles.length > 0) {
    // If two profiles share a display name (two different people with the same
    // name), label them "(#1)", "(#2)", ... in creation order so they're distinguishable.
    const nameCounts = {};
    profiles.forEach((p) => { nameCounts[p.name] = (nameCounts[p.name] ?? 0) + 1; });
    const nameSeen = {};

    const list = document.createElement("div");
    list.className = "profile-list";
    profiles.forEach((p) => {
      let label = p.name;
      if (nameCounts[p.name] > 1) {
        nameSeen[p.name] = (nameSeen[p.name] ?? 0) + 1;
        label = `${p.name} (#${nameSeen[p.name]})`;
      }
      const row = document.createElement("div");
      row.className = "profile-row";
      const btn = document.createElement("button");
      btn.className = "btn profile-select-btn";
      btn.textContent = `${p.pinHash ? "🔒" : "👤"} ${label}`;
      btn.addEventListener("click", async () => {
        if (!(await verifyPin(label, p.pinHash))) return;
        selectProfileById(p.id);
        navigate("");
      });
      const del = document.createElement("button");
      del.className = "ghost-btn profile-delete-btn";
      del.textContent = "🗑";
      del.title = `Delete ${label}'s profile and progress`;
      del.addEventListener("click", async () => {
        if (!(await verifyPin(label, p.pinHash))) return;
        if (confirm(`Delete ${label}'s profile? This permanently erases their saved progress on this device.`)) {
          deleteProfile(p.id);
          renderProfileGate();
        }
      });
      row.appendChild(btn);
      row.appendChild(del);
      list.appendChild(row);
    });
    root.appendChild(list);
  }

  const formWrap = document.createElement("div");
  formWrap.className = "mode-shell";
  formWrap.innerHTML = `
    <h3>${profiles.length > 0 ? "New player" : "Enter your name to start"}</h3>
    <div class="flex-row">
      <input type="text" id="new-profile-input" placeholder="Your name" maxlength="40" style="flex:1; min-width:160px;" />
      <input type="password" id="new-profile-pin" placeholder="PIN (optional)" maxlength="12" inputmode="numeric" style="width:140px;" />
      <button class="btn" id="new-profile-btn">Start studying</button>
    </div>
    <p style="color:var(--text-dim); font-size:0.9rem; margin-bottom:0;">Setting a PIN keeps others on this device from opening or deleting your profile — a light deterrent, not a real lock, since everything here lives in this browser. Leave it blank if you don't need that.</p>
  `;
  root.appendChild(formWrap);

  const input = formWrap.querySelector("#new-profile-input");
  const pinInput = formWrap.querySelector("#new-profile-pin");
  const go = async () => {
    const name = input.value.trim();
    if (!name) return;
    const collision = profiles.some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (collision) {
      const ok = confirm(
        `There's already a profile named "${name}" on this device.\n\n` +
        `If that's you, click Cancel and select it from the list above instead.\n` +
        `Click OK to create a separate NEW profile (also named "${name}") for a different person.`
      );
      if (!ok) return;
    }
    const pin = pinInput.value.trim();
    const pinHash = pin ? await hashPin(pin) : null;
    createProfile(name, pinHash);
    navigate("");
  };
  formWrap.querySelector("#new-profile-btn").addEventListener("click", go);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") go();
  });
  input.focus();

  const importWrap = document.createElement("div");
  importWrap.className = "mode-shell";
  importWrap.style.marginTop = "16px";
  importWrap.innerHTML = `
    <h3>Studying on a different device?</h3>
    <p style="color:var(--text-dim); font-size:1.05rem; margin-top:0;">If you've got a sync code from another device (look for the 💾 Export button in the top bar there), paste it below to continue exactly where you left off.</p>
    <textarea id="sync-code-input" rows="4" placeholder="Paste your sync code here" style="width:100%; background:var(--bg-elevated); color:var(--text); border:2px solid var(--border); border-radius:var(--radius); padding:10px; font-family:'SF Mono',Consolas,monospace; font-size:0.8rem; word-break:break-all;"></textarea>
    <div class="flex-row" style="margin-top:12px;">
      <button class="btn" id="import-code-btn">Load sync code</button>
    </div>
  `;
  root.appendChild(importWrap);
  importWrap.querySelector("#import-code-btn").addEventListener("click", () => {
    const code = importWrap.querySelector("#sync-code-input").value.trim();
    if (!code) return;
    try {
      const data = decodeSyncCode(code);
      importProfile(data);
      navigate("");
    } catch {
      alert("That doesn't look like a valid sync code — make sure you copied the whole thing from the Export screen.");
    }
  });
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

function renderExportView() {
  const p = activeProfile();
  if (!p) {
    navigate("");
    return;
  }
  clearRoot();

  const header = document.createElement("div");
  header.className = "module-header";
  header.innerHTML = `<button class="back-btn">&lt;&lt; Topics</button><h2>💾 Sync Code for ${p.name}</h2>`;
  header.querySelector(".back-btn").addEventListener("click", () => navigate(""));
  root.appendChild(header);

  const code = buildSyncCode(p.id);

  const shell = document.createElement("div");
  shell.className = "mode-shell";
  shell.innerHTML = `
    <p style="color:var(--text-dim); font-size:1.1rem; margin-top:0;">Copy this code, then on your other device open OS Quest, go to "Studying on a different device?" on the sign-in screen, and paste it in. It carries a hidden unique ID, so it'll always find (or create) <em>your</em> profile there — never someone else's, even if they share your name.</p>
    <textarea id="sync-code-output" readonly rows="6" style="width:100%; background:var(--bg-elevated); color:var(--text); border:2px solid var(--border); border-radius:var(--radius); padding:10px; font-family:'SF Mono',Consolas,monospace; font-size:0.8rem; word-break:break-all;"></textarea>
    <div class="flex-row" style="margin-top:14px;">
      <button class="btn" id="copy-code-btn">📋 Copy code</button>
    </div>
    <div id="copy-feedback" class="mode-progress" style="margin-top:10px;"></div>
  `;
  root.appendChild(shell);

  const textarea = shell.querySelector("#sync-code-output");
  textarea.value = code;

  shell.querySelector("#copy-code-btn").addEventListener("click", async () => {
    const feedback = shell.querySelector("#copy-feedback");
    try {
      await navigator.clipboard.writeText(code);
      feedback.textContent = "✅ Copied to clipboard!";
    } catch {
      textarea.focus();
      textarea.select();
      feedback.textContent = "Couldn't auto-copy — the code is selected, so just copy it manually (Ctrl/Cmd+C).";
    }
  });
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

function updateProfileBadge() {
  const badge = document.getElementById("profile-badge");
  if (!badge) return;
  const p = activeProfile();
  badge.textContent = p ? `👤 ${p.name}` : "";
  badge.style.display = p ? "" : "none";
}

function router() {
  updateProfileBadge();
  if (!activeProfileId) {
    renderProfileGate();
    return;
  }
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
  } else if (parts[0] === "export") {
    renderExportView();
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

document.getElementById("btn-switch-user").addEventListener("click", () => {
  signOutProfile();
  router();
});

document.getElementById("btn-export").addEventListener("click", () => {
  if (!activeProfile()) return;
  navigate("export");
});

document.getElementById("btn-reset-progress").addEventListener("click", () => {
  const p = activeProfile();
  if (!p) return;
  if (confirm(`Reset ${p.name}'s progress? This can't be undone — other profiles on this device are unaffected.`)) {
    progress = {};
    readingsDone = {};
    saveProgress(progress);
    saveReadingsDone(readingsDone);
    router();
  }
});
