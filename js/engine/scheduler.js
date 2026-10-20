// Tick-based CPU scheduling simulator.
// jobs: [{ name, arrival, burst }]  (integer ticks)
// Returns { timeline: [{t, job|null}], perJob: { [name]: { completion, turnaround, response, waiting, burst, arrival } } }

export function runSchedule({ algorithm, jobs, quantum = 1, mlfq = null }) {
  const state = jobs.map((j) => ({
    ...j,
    remaining: j.burst,
    started: false,
    completion: null,
    firstRun: null,
    queue: 0, // MLFQ bookkeeping: current level, for display/debugging only
  }));

  const byName = Object.fromEntries(state.map((j) => [j.name, j]));
  const timeline = [];
  const maxTicks = jobs.reduce((s, j) => s + j.burst, 0) + Math.max(0, ...jobs.map((j) => j.arrival)) + 5;

  // RR ready queue (FIFO of job names)
  let rrQueue = [];
  let rrCurrent = null;
  let rrTicksLeftInQuantum = 0;

  // MLFQ ready queues per level (FIFO of job names). Strict priority (Rule 1): a job
  // running at a lower-priority level is preempted the instant a higher-priority queue
  // becomes non-empty, and resumes later with its remaining quantum intact.
  const numLevels = mlfq?.quantums?.length ?? 3;
  const mlfqQuantums = mlfq?.quantums ?? [2, 4, 8];
  const boostInterval = mlfq?.boostInterval ?? null;
  let mlfqQueues = Array.from({ length: numLevels }, () => []);
  let mlfqActive = null; // { name, level, quantumLeft }
  let ticksSinceBoost = 0;
  const enqueued = new Set();

  function arrivedNotDone(t) {
    return state.filter((j) => j.arrival <= t && j.remaining > 0);
  }

  function markRun(j, t) {
    if (!j.started) {
      j.started = true;
      j.firstRun = t;
    }
    j.remaining -= 1;
    if (j.remaining === 0) j.completion = t + 1;
  }

  for (let t = 0; t < maxTicks; t++) {
    const pending = arrivedNotDone(t);

    if (pending.length === 0 && state.every((j) => j.remaining === 0 || j.arrival > t)) {
      if (state.every((j) => j.remaining === 0)) break;
      timeline.push({ t, job: null });
      continue;
    }

    let runJobName = null;

    if (algorithm === "FIFO") {
      const candidate = [...pending].sort((a, b) => a.arrival - b.arrival || a.name.localeCompare(b.name))[0];
      runJobName = candidate?.name ?? null;
    } else if (algorithm === "SJF") {
      // Non-preemptive: stick with current job until it finishes.
      if (rrCurrent && byName[rrCurrent].remaining > 0) {
        runJobName = rrCurrent;
      } else {
        const candidate = [...pending].sort((a, b) => a.burst - b.burst || a.arrival - b.arrival || a.name.localeCompare(b.name))[0];
        runJobName = candidate?.name ?? null;
        rrCurrent = runJobName;
      }
    } else if (algorithm === "STCF") {
      const candidate = [...pending].sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival || a.name.localeCompare(b.name))[0];
      runJobName = candidate?.name ?? null;
    } else if (algorithm === "RR") {
      // enqueue new arrivals (in arrival order) that aren't queued/running yet
      pending
        .filter((j) => !enqueued.has(j.name))
        .sort((a, b) => a.arrival - b.arrival || a.name.localeCompare(b.name))
        .forEach((j) => {
          rrQueue.push(j.name);
          enqueued.add(j.name);
        });

      if (!rrCurrent) {
        rrCurrent = rrQueue.shift() ?? null;
        rrTicksLeftInQuantum = quantum;
      }
      runJobName = rrCurrent;
    } else if (algorithm === "MLFQ") {
      pending
        .filter((j) => !enqueued.has(j.name))
        .sort((a, b) => a.arrival - b.arrival || a.name.localeCompare(b.name))
        .forEach((j) => {
          mlfqQueues[0].push(j.name);
          enqueued.add(j.name);
          byName[j.name].queue = 0;
        });

      if (boostInterval && ticksSinceBoost >= boostInterval) {
        const all = mlfqQueues.flat().concat(mlfqActive ? [mlfqActive.name] : []);
        mlfqQueues = Array.from({ length: numLevels }, () => []);
        mlfqQueues[0] = all.filter((n) => byName[n].remaining > 0);
        mlfqQueues[0].forEach((n) => { byName[n].queue = 0; });
        mlfqActive = null;
        ticksSinceBoost = 0;
      }

      // Rule 1 (strict priority): if a strictly higher-priority queue is non-empty
      // than the currently active job's level, preempt it back to the FRONT of its
      // own queue (it keeps its remaining quantum for when it resumes).
      const highestNonEmpty = mlfqQueues.findIndex((q) => q.length > 0);
      if (mlfqActive && highestNonEmpty !== -1 && highestNonEmpty < mlfqActive.level) {
        mlfqQueues[mlfqActive.level].unshift(mlfqActive.name);
        mlfqActive = null;
      }

      if (!mlfqActive) {
        for (let lvl = 0; lvl < numLevels; lvl++) {
          if (mlfqQueues[lvl].length > 0) {
            const name = mlfqQueues[lvl].shift();
            mlfqActive = { name, level: lvl, quantumLeft: mlfqQuantums[lvl] };
            byName[name].queue = lvl;
            break;
          }
        }
      }
      runJobName = mlfqActive?.name ?? null;
    }

    if (!runJobName) {
      timeline.push({ t, job: null });
      ticksSinceBoost++;
      continue;
    }

    const j = byName[runJobName];
    markRun(j, t);
    timeline.push({ t, job: runJobName });
    ticksSinceBoost++;

    if (algorithm === "RR") {
      rrTicksLeftInQuantum--;
      if (j.remaining === 0) {
        rrCurrent = null;
      } else if (rrTicksLeftInQuantum === 0) {
        rrQueue.push(runJobName);
        rrCurrent = null;
      }
    } else if (algorithm === "SJF") {
      if (j.remaining === 0) rrCurrent = null;
    } else if (algorithm === "MLFQ") {
      mlfqActive.quantumLeft--;
      if (j.remaining === 0) {
        mlfqActive = null;
      } else if (mlfqActive.quantumLeft === 0) {
        const nextLevel = Math.min(mlfqActive.level + 1, numLevels - 1);
        j.queue = nextLevel;
        mlfqQueues[nextLevel].push(runJobName);
        mlfqActive = null;
      }
    }
  }

  const perJob = {};
  for (const j of state) {
    perJob[j.name] = {
      arrival: j.arrival,
      burst: j.burst,
      completion: j.completion,
      turnaround: j.completion != null ? j.completion - j.arrival : null,
      response: j.firstRun != null ? j.firstRun - j.arrival : null,
      waiting: j.completion != null ? j.completion - j.arrival - j.burst : null,
    };
  }

  return { timeline, perJob };
}
