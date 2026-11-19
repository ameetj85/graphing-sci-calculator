"use client";

import { DEFAULT_LINE_STYLE, LINE_WIDTH_PX, dashArray, type LineStyle } from "@/lib/graph/equations";
import { usePaneContext } from "mafs";
import { useMemo } from "react";
import type { Comparison } from "@/lib/graph/plotSpec";
import { inequalityFillPath, sampleFunction, segmentsToPath } from "@/lib/graph/sample";

const SAMPLES = 1200;

type InequalityRegionProps = {
  fn: (x: number) => number;
  op: Comparison;
  color: string;
  style?: LineStyle;
};

/**
 * Shades y > f(x), y ≥ f(x), y < f(x) or y ≤ f(x) across the visible panes.
 * The boundary is dashed for strict inequalities (< and >) and solid
 * otherwise, as in textbooks. Must be rendered inside <Mafs>.
 */
export function InequalityRegion({ fn, op, color, style = DEFAULT_LINE_STYLE }: InequalityRegionProps) {
  const { xPaneRange, yPaneRange } = usePaneContext();
  const [xMin, xMax] = xPaneRange;
  const [yMin, yMax] = yPaneRange;
  const above = op === ">" || op === ">=";
  const strict = op === ">" || op === "<";

  const { fill, boundary } = useMemo(() => {
    const segments = sampleFunction(fn, xMin, xMax, { samples: SAMPLES, yMin, yMax });
    return {
      fill: inequalityFillPath(segments, above, yMin, yMax),
      boundary: segmentsToPath(segments, yMin, yMax),
    };
  }, [fn, xMin, xMax, yMin, yMax, above]);

  const transform = "var(--mafs-view-transform)";
  return (
    <>
      <path d={fill} style={{ fill: color, fillOpacity: 0.18, stroke: "none", transform }} />
      <path
        d={boundary}
        fill="none"
        strokeWidth={LINE_WIDTH_PX[style.width]}
        strokeLinecap="round"
        strokeDasharray={dashArray(strict ? { ...style, dash: "dashed" } : style)}
        style={{ stroke: color, vectorEffect: "non-scaling-stroke", transform }}
      />
    </>
  );
}
