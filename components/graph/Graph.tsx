"use client";

import { Mafs } from "mafs";
import { useMemo, useState } from "react";
import { nearestDefinedX } from "@/lib/graph/keyPoints";
import type { PlotFunction } from "@/lib/math/engine";
import { AdaptiveGrid } from "./AdaptiveGrid";
import { FunctionCurve } from "./FunctionCurve";
import { KeyPoints } from "./KeyPoints";
import { TracePoint } from "./TracePoint";

const DEFAULT_VIEW = { x: [-10, 10] as [number, number], y: [-6, 6] as [number, number] };

export type GraphCurve = {
  id: string;
  name: string;
  fn: PlotFunction;
  color: string;
};

type GraphProps = {
  curves: GraphCurve[];
  /** Id of the curve to trace, or null to hide the trace point. */
  traceId: string | null;
  showKeyPoints: boolean;
  height?: number;
};

export function Graph({ curves, traceId, showKeyPoints, height = 460 }: GraphProps) {
  // Remounting Mafs is the only way to reset its internal pan/zoom state.
  const [viewKey, setViewKey] = useState(0);
  const [trace, setTrace] = useState<{ id: string | null; x: number }>({ id: null, x: 0 });

  const traced = curves.find((curve) => curve.id === traceId) ?? null;
  // Start tracing near x = 0 when the traced curve changes, and step off any
  // x where the (possibly edited) function is undefined.
  const traceX = useMemo(() => {
    if (!traced) return null;
    const x = trace.id === traced.id ? trace.x : 0;
    return nearestDefinedX(traced.fn, x, 0.05);
  }, [traced, trace]);

  const keyPointCurves = useMemo(() => curves.map(({ id, fn }) => ({ id, fn })), [curves]);
  const names = useMemo(() => Object.fromEntries(curves.map((c) => [c.id, c.name])), [curves]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <Mafs
        key={viewKey}
        height={height}
        viewBox={DEFAULT_VIEW}
        preserveAspectRatio={false}
        pan
        zoom={{ min: 0.05, max: 20 }}
      >
        <AdaptiveGrid />
        {curves.map((curve) => (
          <FunctionCurve key={curve.id} fn={curve.fn} color={curve.color} />
        ))}
        {showKeyPoints && curves.length > 0 && <KeyPoints curves={keyPointCurves} names={names} />}
        {traced && traceX !== null && (
          <TracePoint
            fn={traced.fn}
            x={traceX}
            color={traced.color}
            onMove={(x) => setTrace({ id: traced.id, x })}
          />
        )}
      </Mafs>
      <button
        type="button"
        onClick={() => setViewKey((key) => key + 1)}
        className="absolute top-2 right-2 rounded-md border border-zinc-300 bg-white/90 px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        Reset view
      </button>
    </div>
  );
}
