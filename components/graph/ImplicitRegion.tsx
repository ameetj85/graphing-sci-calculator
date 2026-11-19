"use client";

import { usePaneContext } from "mafs";
import { useMemo } from "react";
import type { PlotJob } from "@/lib/graph/plotJobs";
import type { Comparison } from "@/lib/graph/plotSpec";
import type { ScopeSnapshot } from "@/lib/graph/scopeSnapshot";
import type { AngleMode, Scope } from "@/lib/math/engine";
import { usePlotJob } from "./usePlotJob";

const COLS = 280;
const ROWS = 200;

type ImplicitRegionProps = {
  /** F in F(x, y) op 0. */
  source: string;
  op: Comparison;
  color: string;
  scope: Scope;
  snapshot: ScopeSnapshot;
  angleMode: AngleMode;
};

/**
 * Shades F(x, y) op 0 (x > 2, x^2 + y^2 < 4) over the visible panes, computed
 * in the plotting worker. The boundary is dashed for < and >, as for
 * y > f(x). Must be rendered inside <Mafs>.
 */
export function ImplicitRegion({ source, op, color, scope, snapshot, angleMode }: ImplicitRegionProps) {
  const { xPaneRange, yPaneRange } = usePaneContext();
  const [xMin, xMax] = xPaneRange;
  const [yMin, yMax] = yPaneRange;

  const job = useMemo(
    (): PlotJob => ({ kind: "region", source, op, xMin, xMax, yMin, yMax, cols: COLS, rows: ROWS, angleMode, scope: snapshot }),
    [source, op, xMin, xMax, yMin, yMax, angleMode, snapshot],
  );
  const { result } = usePlotJob(job, scope);
  const region = result?.kind === "region" ? result : null;
  const strict = op === "<" || op === ">";
  const transform = "var(--mafs-view-transform)";

  return (
    <>
      <path d={region?.fill ?? ""} data-region="" style={{ fill: color, fillOpacity: 0.18, stroke: "none", transform }} />
      <path
        d={region?.boundary ?? ""}
        data-region-boundary=""
        fill="none"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={strict ? "8 6" : undefined}
        style={{ stroke: color, vectorEffect: "non-scaling-stroke", transform }}
      />
    </>
  );
}
