"use client";

import { usePaneContext } from "mafs";
import { useMemo } from "react";
import type { PlotJob } from "@/lib/graph/plotJobs";
import type { RegionCondition } from "@/lib/graph/plotSpec";
import type { ScopeSnapshot } from "@/lib/graph/scopeSnapshot";
import type { AngleMode, Scope } from "@/lib/math/engine";
import { usePlotJob } from "./usePlotJob";

const COLS = 280;
const ROWS = 200;

type ImplicitRegionProps = {
  /** Every condition F(x, y) op 0 must hold, e.g. two for 1 < x < 2. */
  conditions: RegionCondition[];
  color: string;
  scope: Scope;
  snapshot: ScopeSnapshot;
  angleMode: AngleMode;
};

/**
 * Shades where every condition holds (x > 2, 1 < x < 2, x^2 + y^2 < 4) over
 * the visible panes, computed in the plotting worker. Each condition's edge
 * is drawn only where it borders the region: dashed for < and >, solid for
 * <= and >=. Must be rendered inside <Mafs>.
 */
export function ImplicitRegion({ conditions, color, scope, snapshot, angleMode }: ImplicitRegionProps) {
  const { xPaneRange, yPaneRange } = usePaneContext();
  const [xMin, xMax] = xPaneRange;
  const [yMin, yMax] = yPaneRange;

  const job = useMemo(
    (): PlotJob => ({ kind: "region", conditions, xMin, xMax, yMin, yMax, cols: COLS, rows: ROWS, angleMode, scope: snapshot }),
    [conditions, xMin, xMax, yMin, yMax, angleMode, snapshot],
  );
  const { result } = usePlotJob(job, scope);
  const region = result?.kind === "region" ? result : null;
  const transform = "var(--mafs-view-transform)";

  return (
    <>
      <path d={region?.fill ?? ""} data-region="" style={{ fill: color, fillOpacity: 0.18, stroke: "none", transform }} />
      {region?.boundaries.map((boundary, i) => (
        <path
          key={i}
          d={boundary.path}
          data-region-boundary=""
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={boundary.strict ? "8 6" : undefined}
          style={{ stroke: color, vectorEffect: "non-scaling-stroke", transform }}
        />
      ))}
    </>
  );
}
