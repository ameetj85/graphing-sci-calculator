"use client";

import { Mafs } from "mafs";
import { useMemo, useState } from "react";
import { nearestDefinedX } from "@/lib/graph/keyPoints";
import type { AngleMode, PlotFunction } from "@/lib/math/engine";
import { AdaptiveGrid } from "./AdaptiveGrid";
import { FunctionCurve } from "./FunctionCurve";
import { KeyPoints } from "./KeyPoints";
import { TracePoint } from "./TracePoint";

type ViewBox = { x: [number, number]; y: [number, number] };

const DEFAULT_VIEW: ViewBox = { x: [-10, 10], y: [-6, 6] };
/** One full cycle either side of 0, like a handheld calculator's trig zoom. */
const TRIG_VIEW: Record<AngleMode, ViewBox> = {
  deg: { x: [-360, 360], y: [-2, 2] },
  rad: { x: [-2 * Math.PI, 2 * Math.PI], y: [-2, 2] },
};

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
  angleMode: AngleMode;
  height?: number;
};

export function Graph({ curves, traceId, showKeyPoints, angleMode, height = 460 }: GraphProps) {
  // Remounting Mafs is the only way to reset its internal pan/zoom state.
  const [view, setView] = useState<{ key: number; box: ViewBox }>({ key: 0, box: DEFAULT_VIEW });
  const showView = (box: ViewBox) => setView((current) => ({ key: current.key + 1, box }));
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
        key={view.key}
        height={height}
        viewBox={view.box}
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
      <div className="absolute top-2 right-2 flex gap-1">
        <ViewButton
          onClick={() => showView(TRIG_VIEW[angleMode])}
          title={angleMode === "deg" ? "Show x from -360° to 360°" : "Show x from -2π to 2π"}
        >
          Trig view
        </ViewButton>
        <ViewButton onClick={() => showView(DEFAULT_VIEW)} title="Show x from -10 to 10">
          Reset view
        </ViewButton>
      </div>
    </div>
  );
}

function ViewButton({ onClick, title, children }: { onClick: () => void; title: string; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded-md border border-zinc-300 bg-white/90 px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      {children}
    </button>
  );
}
