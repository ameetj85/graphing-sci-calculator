/**
 * Heavy plotting work, described as plain data so it can run in the plotting
 * worker (lib/graph/plot.worker.ts) or, as a fallback, on the main thread.
 */
import { compileInVariables, type AngleMode, type Scope } from "@/lib/math/engine";
import { segmentsPath, traceImplicit } from "./implicit";
import type { Comparison } from "./plotSpec";
import { shadeRegion } from "./region";
import { findKeyPoints, type KeyPoint } from "./keyPoints";
import { sampleFunction, segmentsToPath } from "./sample";
import { restoreScope, type ScopeSnapshot } from "./scopeSnapshot";
import { sampleSurface, type Domain } from "./surface";

export type SurfaceJob = { kind: "surface"; items: { id: string; source: string }[]; domain: Domain; n: number };
export type ImplicitJob = { kind: "implicit"; source: string; xMin: number; xMax: number; yMin: number; yMax: number; cols: number; rows: number };
type Bounds = { xMin: number; xMax: number; yMin: number; yMax: number };
/** Samples y = f(x) into SVG path data. */
export type CurveJob = { kind: "curve"; source: string; samples: number } & Bounds;
/** Roots of each curve and intersections of each pair. */
export type KeyPointsJob = { kind: "keyPoints"; curves: { id: string; source: string }[] } & Bounds;
/** Shades F(x, y) op 0 and traces its boundary F = 0. */
export type RegionJob = { kind: "region"; source: string; op: Comparison; cols: number; rows: number } & Bounds;
export type PlotJob = (SurfaceJob | ImplicitJob | CurveJob | KeyPointsJob | RegionJob) & { angleMode: AngleMode; scope: ScopeSnapshot };

export type SurfaceGrid = { id: string; z: Float64Array } | { id: string; error: string };
export type PlotJobResult =
  | { kind: "surface"; domain: Domain; n: number; grids: SurfaceGrid[] }
  | { kind: "implicit"; segments: Float64Array }
  | { kind: "curve"; path: string }
  | { kind: "keyPoints"; points: KeyPoint[] }
  | { kind: "region"; fill: string; boundary: string }
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
  if (job.kind === "curve") {
    const f = compileInVariables(job.source, ["x"], live, job.angleMode);
    if (!f.ok) return { kind: "error", error: f.error };
    const fn = (x: number) => f.fn(x);
    const segments = sampleFunction(fn, job.xMin, job.xMax, { samples: job.samples, yMin: job.yMin, yMax: job.yMax });
    return { kind: "curve", path: segmentsToPath(segments, job.yMin, job.yMax) };
  }
  if (job.kind === "keyPoints") {
    const curves = job.curves.flatMap(({ id, source }) => {
      const f = compileInVariables(source, ["x"], live, job.angleMode);
      return f.ok ? [{ id, fn: (x: number) => f.fn(x) }] : [];
    });
    return { kind: "keyPoints", points: findKeyPoints(curves, job.xMin, job.xMax, job.yMin, job.yMax) };
  }
  const f = compileInVariables(job.source, ["x", "y"], live, job.angleMode);
  if (!f.ok) return { kind: "error", error: f.error };
  if (job.kind === "region") {
    const F = (x: number, y: number) => f.fn(x, y);
    const { xMin, xMax, yMin, yMax, cols, rows } = job;
    return {
      kind: "region",
      fill: shadeRegion(F, job.op, xMin, xMax, yMin, yMax, cols, rows),
      boundary: segmentsPath(traceImplicit(F, xMin, xMax, yMin, yMax, cols, rows)),
    };
  }
  return { kind: "implicit", segments: traceImplicit(f.fn, job.xMin, job.xMax, job.yMin, job.yMax, job.cols, job.rows) };
}

/** Buffers to transfer (not copy) when posting a result back. */
export function transferables(result: PlotJobResult): ArrayBuffer[] {
  if (result.kind === "implicit") return [result.segments.buffer as ArrayBuffer];
  if (result.kind === "surface") return result.grids.flatMap((g) => ("z" in g ? [g.z.buffer as ArrayBuffer] : []));
  return [];
}
