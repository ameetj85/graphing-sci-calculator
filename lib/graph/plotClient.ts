/**
 * Sends plot jobs to the plotting worker. Falls back to computing on the main
 * thread when workers are unavailable, when the worker fails, or when the job
 * needs a value that can't be copied to the worker.
 */
import type { Scope } from "@/lib/math/engine";
import { computeJob, type PlotJob, type PlotJobResult } from "./plotJobs";
import { needsMissing } from "./scopeSnapshot";

type Pending = { job: PlotJob; scope: Scope; sentAt: number; resolve: (result: PlotJobResult) => void; cancelled: boolean };

/** A job still running this long after it was superseded gets the worker restarted. */
const RESTART_AFTER_MS = 1000;

let worker: Worker | null | undefined;
/** Set once the worker has returned a result, i.e. it has loaded. */
let warm = false;
let nextId = 1;
const pending = new Map<number, Pending>();

function settleOnMainThread(entry: Pending) {
  if (!entry.cancelled) entry.resolve(computeJob(entry.job, entry.scope));
}

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    const created = new Worker(new URL("./plot.worker.ts", import.meta.url), { type: "module" });
    created.onmessage = (event: MessageEvent<{ id: number; result: PlotJobResult }>) => {
      warm = true;
      const entry = pending.get(event.data.id);
      pending.delete(event.data.id);
      if (entry && !entry.cancelled) entry.resolve(event.data.result);
    };
    created.onerror = () => {
      // The worker couldn't load or crashed: finish its jobs here and stop using it.
      created.terminate();
      worker = null;
      const entries = [...pending.values()];
      pending.clear();
      entries.forEach(settleOnMainThread);
    };
    worker = created;
  } catch {
    worker = null;
  }
  return worker;
}

/** Restarts the worker if everything it is working on was cancelled long ago. */
function restartIfStuck() {
  if (!worker || pending.size === 0) return;
  const entries = [...pending.values()];
  if (entries.every((e) => e.cancelled) && entries.some((e) => performance.now() - e.sentAt > RESTART_AFTER_MS)) {
    worker.terminate();
    worker = undefined;
    pending.clear();
  }
}

/**
 * True once the worker is answering. Until then (while it loads, on first
 * paint) callers may compute a first result on the main thread.
 */
export function isWorkerWarm(): boolean {
  return warm && worker != null;
}

export type PlotHandle = { promise: Promise<PlotJobResult>; cancel: () => void; inWorker: boolean };

/** Starts a job. `scope` is the live calculator scope, used for the main-thread fallback. */
export function runPlotJob(job: PlotJob, scope: Scope): PlotHandle {
  const sources =
    job.kind === "surface"
      ? job.items.map((i) => i.source).join(" ")
      : job.kind === "keyPoints"
        ? job.curves.map((c) => c.source).join(" ")
        : job.source;
  const target = needsMissing(sources, job.scope) ? null : getWorker();

  if (!target) {
    let cancelled = false;
    const promise = new Promise<PlotJobResult>((resolve) => {
      // Let the browser paint first; the result arrives on the next task.
      setTimeout(() => {
        if (!cancelled) resolve(computeJob(job, scope));
      }, 0);
    });
    return { promise, cancel: () => (cancelled = true), inWorker: false };
  }

  const id = nextId++;
  let entry!: Pending;
  const promise = new Promise<PlotJobResult>((resolve) => {
    entry = { job, scope, sentAt: performance.now(), resolve, cancelled: false };
  });
  pending.set(id, entry);
  target.postMessage({ id, job });
  return {
    promise,
    cancel: () => {
      entry.cancelled = true;
      restartIfStuck();
    },
    inWorker: true,
  };
}
