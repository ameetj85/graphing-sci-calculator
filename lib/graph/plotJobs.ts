/**
 * Heavy plotting work, described as plain data so it can run in the plotting
 * worker (lib/graph/plot.worker.ts) or, as a fallback, on the main thread.
 */
import { compileInVariables, type AngleMode, type Scope } from "@/lib/math/engine";
import { traceImplicit } from "./implicit";
import { restoreScope, type ScopeSnapshot } from "./scopeSnapshot";
import { sampleSurface, type Domain } from "./surface";

export type SurfaceJob = { kind: "surface"; items: { id: string; source: string }[]; domain: Domain; n: number };
export type ImplicitJob = { kind: "implicit"; source: string; xMin: number; xMax: number; yMin: number; yMax: number; cols: number; rows: number };
export type PlotJob = (SurfaceJob | ImplicitJob) & { angleMode: AngleMode; scope: ScopeSnapshot };

export type SurfaceGrid = { id: string; z: Float64Array } | { id: string; error: string };
export type PlotJobResult =
  | { kind: "surface"; domain: Domain; n: number; grids: SurfaceGrid[] }
  | { kind: "implicit"; segments: Float64Array }
  | { kind: "error"; error: string };

/**
 * Runs a job. `scope` is the live calculator scope when running on the main
 * thread; the worker rebuilds one from the job's snapshot.
 */
export function computeJob(job: PlotJob, scope?: Scope): PlotJobResult {
  const live = scope ?? restoreScope(job.scope, job.angleMode);
  if (job.kind === "surface") {
    const grids = job.items.map((item): SurfaceGrid => {
      const f = compileInVariables(item.source, ["x", "y"], live, job.angleMode);
      return f.ok ? { id: item.id, z: sampleSurface(f.fn, job.domain, job.n) } : { id: item.id, error: f.error };
    });
    return { kind: "surface", domain: job.domain, n: job.n, grids };
  }
  const f = compileInVariables(job.source, ["x", "y"], live, job.angleMode);
  if (!f.ok) return { kind: "error", error: f.error };
  return { kind: "implicit", segments: traceImplicit(f.fn, job.xMin, job.xMax, job.yMin, job.yMax, job.cols, job.rows) };
}

/** Buffers to transfer (not copy) when posting a result back. */
export function transferables(result: PlotJobResult): ArrayBuffer[] {
  if (result.kind === "implicit") return [result.segments.buffer as ArrayBuffer];
  if (result.kind === "surface") return result.grids.flatMap((g) => ("z" in g ? [g.z.buffer as ArrayBuffer] : []));
  return [];
}
