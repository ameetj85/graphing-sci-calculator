"use client";

import { DEFAULT_LINE_STYLE, LINE_WIDTH_PX, dashArray, type LineStyle } from "@/lib/graph/equations";
import { usePaneContext } from "mafs";
import { useMemo } from "react";
import { sampleParametric, segmentsToPath, type Point } from "@/lib/graph/sample";

const SAMPLES = 2000;

type ParametricCurveProps = {
  xy: (t: number) => Point;
  tMin: number;
  tMax: number;
  color: string;
  style?: LineStyle;
};

/** Plots (x(t), y(t)) for t in [tMin, tMax], breaking at gaps. Must be rendered inside <Mafs>. */
export function ParametricCurve({ xy, tMin, tMax, color, style = DEFAULT_LINE_STYLE }: ParametricCurveProps) {
  const { xPaneRange, yPaneRange } = usePaneContext();
  const [xMin, xMax] = xPaneRange;
  const [yMin, yMax] = yPaneRange;

  const path = useMemo(() => {
    const viewSize = Math.max(xMax - xMin, yMax - yMin);
    return segmentsToPath(sampleParametric(xy, tMin, tMax, SAMPLES, viewSize), yMin, yMax, [xMin, xMax]);
  }, [xy, tMin, tMax, xMin, xMax, yMin, yMax]);

  return (
    <path
      d={path}
      fill="none"
      strokeWidth={LINE_WIDTH_PX[style.width]}
      strokeDasharray={dashArray(style)}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ stroke: color, vectorEffect: "non-scaling-stroke", transform: "var(--mafs-view-transform)" }}
    />
  );
}
