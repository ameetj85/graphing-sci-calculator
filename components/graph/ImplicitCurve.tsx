"use client";

import { usePaneContext } from "mafs";
import { useMemo } from "react";
import { segmentsPath } from "@/lib/graph/implicit";
import type { PlotJob } from "@/lib/graph/plotJobs";
import type { ScopeSnapshot } from "@/lib/graph/scopeSnapshot";
import type { AngleMode, Scope } from "@/lib/math/engine";
import { usePlotJob } from "./usePlotJob";

/** Grid cells across the visible panes; about 56,000 evaluations per trace. */
const COLS = 280;
const ROWS = 200;

type ImplicitCurveProps = {
  /** F in F(x, y) = 0. */
  source: string;
  color: string;
  scope: Scope;
  snapshot: ScopeSnapshot;
  angleMode: AngleMode;
};

/**
 * Draws F(x, y) = 0 over the visible panes. The curve is traced in the
 * plotting worker; while panning, the previous trace stays in place (it is in
 * graph coordinates) until the new one arrives. Must be rendered inside <Mafs>.
 */
export function ImplicitCurve({ source, color, scope, snapshot, angleMode }: ImplicitCurveProps) {
  const { xPaneRange, yPaneRange } = usePaneContext();
  const [xMin, xMax] = xPaneRange;
  const [yMin, yMax] = yPaneRange;

  const job = useMemo(
    (): PlotJob => ({ kind: "implicit", source, xMin, xMax, yMin, yMax, cols: COLS, rows: ROWS, angleMode, scope: snapshot }),
    [source, xMin, xMax, yMin, yMax, angleMode, snapshot],
  );
  const { result } = usePlotJob(job, scope);
  const path = useMemo(() => (result?.kind === "implicit" ? segmentsPath(result.segments) : ""), [result]);

  return (
    <path
      d={path}
      fill="none"
      strokeWidth={2.5}
      strokeLinecap="round"
      data-implicit=""
      style={{ stroke: color, vectorEffect: "non-scaling-stroke", transform: "var(--mafs-view-transform)" }}
    />
  );
}
