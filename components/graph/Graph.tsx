"use client";

import { Mafs } from "mafs";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
  /** x of the trace point, shared with the value table. */
  traceX: number;
  onTraceMove: (x: number) => void;
  showKeyPoints: boolean;
  angleMode: AngleMode;
};

/** Fills its container: the parent decides the size, the graph measures it. */
export function Graph({ curves, traceId, traceX, onTraceMove, showKeyPoints, angleMode }: GraphProps) {
  // Remounting Mafs is the only way to reset its internal pan/zoom state.
  const [view, setView] = useState<{ key: number; box: ViewBox }>({ key: 0, box: DEFAULT_VIEW });
  const showView = (box: ViewBox) => setView((current) => ({ key: current.key + 1, box }));

  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setHeight(Math.floor(entry.contentRect.height)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const traced = curves.find((curve) => curve.id === traceId) ?? null;
  // Step off any x where the (possibly edited) traced function is undefined.
  const tracePointX = useMemo(
    () => (traced ? nearestDefinedX(traced.fn, traceX, 0.05) : null),
    [traced, traceX],
  );

  const keyPointCurves = useMemo(() => curves.map(({ id, fn }) => ({ id, fn })), [curves]);
  const names = useMemo(() => Object.fromEntries(curves.map((c) => [c.id, c.name])), [curves]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
    >
      {height > 0 && (
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
          {traced && tracePointX !== null && (
            <TracePoint fn={traced.fn} x={tracePointX} color={traced.color} onMove={onTraceMove} />
          )}
        </Mafs>
      )}
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
