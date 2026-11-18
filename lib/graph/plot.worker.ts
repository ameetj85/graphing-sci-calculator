/// <reference lib="webworker" />
/**
 * Plotting worker: samples surfaces and traces implicit curves off the main
 * thread, so typing, panning and the keypad stay responsive.
 */
import { computeJob, transferables, type PlotJob, type PlotJobResult } from "./plotJobs";

type Request = { id: number; job: PlotJob };

const worker = self as unknown as DedicatedWorkerGlobalScope;

worker.onmessage = (event: MessageEvent<Request>) => {
  const { id, job } = event.data;
  let result: PlotJobResult;
  try {
    result = computeJob(job);
  } catch (err) {
    result = { kind: "error", error: err instanceof Error ? err.message : String(err) };
  }
  worker.postMessage({ id, result }, transferables(result));
};
