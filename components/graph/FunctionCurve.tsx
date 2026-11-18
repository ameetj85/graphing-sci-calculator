"use client";

import { usePaneContext } from "mafs";
import { useMemo } from "react";
import { sampleFunction, segmentsToPath } from "@/lib/graph/sample";
import type { PlotFunction } from "@/lib/math/engine";

const SAMPLES = 1200;

type FunctionCurveProps = {
  fn: PlotFunction;
  color?: string;
  weight?: number;
};

/**
 * Plots y = fn(x) across the visible panes. Drawn with the gap-aware sampler
 * instead of Mafs' Plot.OfX so asymptotes and undefined regions are not
 * bridged by straight lines. Must be rendered inside <Mafs>.
 */
export function FunctionCurve({ fn, color = "var(--mafs-blue)", weight = 2.5 }: FunctionCurveProps) {
  const { xPaneRange, yPaneRange } = usePaneContext();
  const [xMin, xMax] = xPaneRange;
  const [yMin, yMax] = yPaneRange;

  const path = useMemo(
    () => segmentsToPath(sampleFunction(fn, xMin, xMax, { samples: SAMPLES, yMin, yMax }), yMin, yMax),
    [fn, xMin, xMax, yMin, yMax],
  );

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
