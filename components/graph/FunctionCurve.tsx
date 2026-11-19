"use client";

import { usePaneContext } from "mafs";
import { useMemo, useState } from "react";
import { isWorkerWarm } from "@/lib/graph/plotClient";
import { computeJob, type PlotJob } from "@/lib/graph/plotJobs";
import type { ScopeSnapshot } from "@/lib/graph/scopeSnapshot";
import type { AngleMode, Scope } from "@/lib/math/engine";
import { usePlotJob } from "./usePlotJob";

const SAMPLES = 1200;

type FunctionCurveProps = {
  /** f in y = f(x). */
  source: string;
  color?: string;
  weight?: number;
  scope: Scope;
  snapshot: ScopeSnapshot;
  angleMode: AngleMode;
};

/**
 * Plots y = f(x) across the visible panes with the gap-aware sampler, so
 * asymptotes and undefined regions are not bridged by straight lines.
 * Sampling runs in the plotting worker. While the worker is still loading,
 * the first path is computed here so the graph doesn't start blank; while a
 * new path is computed the previous one stays (it is in graph coordinates).
 * Must be inside <Mafs>.
 */
export function FunctionCurve({ source, color = "var(--mafs-blue)", weight = 2.5, scope, snapshot, angleMode }: FunctionCurveProps) {
  const { xPaneRange, yPaneRange } = usePaneContext();
  const [xMin, xMax] = xPaneRange;
  const [yMin, yMax] = yPaneRange;

  const job = useMemo(
    (): PlotJob => ({ kind: "curve", source, samples: SAMPLES, xMin, xMax, yMin, yMax, angleMode, scope: snapshot }),
    [source, xMin, xMax, yMin, yMax, angleMode, snapshot],
  );
  // On first load the worker is still starting, so draw once on this thread.
  const [initial] = useState(() => (isWorkerWarm() ? null : computeJob(job, scope)));
  const { result } = usePlotJob(job, scope);
  const latest = result ?? initial;
  const path = latest?.kind === "curve" ? latest.path : "";

  return (
    <path
      d={path}
      fill="none"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        stroke: color,
        vectorEffect: "non-scaling-stroke",
        transform: "var(--mafs-view-transform)",
      }}
    />
  );
}
