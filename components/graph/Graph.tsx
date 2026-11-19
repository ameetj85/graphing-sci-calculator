"use client";

import { Mafs, Point as MafsPoint } from "mafs";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_LINE_STYLE, type GraphSettings, type GraphWindow, type LineStyle } from "@/lib/graph/equations";
import type { FieldFn } from "@/lib/graph/field";
import { formatCoordinate, nearestDefinedX } from "@/lib/graph/keyPoints";
import type { Comparison, RegionCondition } from "@/lib/graph/plotSpec";
import type { Point } from "@/lib/graph/sample";
import type { ScopeSnapshot } from "@/lib/graph/scopeSnapshot";
import type { AngleMode, PlotFunction, Scope } from "@/lib/math/engine";
import { ImplicitCurve } from "./ImplicitCurve";
import { ImplicitRegion } from "./ImplicitRegion";
import { AdaptiveGrid } from "./AdaptiveGrid";
import { FunctionCurve } from "./FunctionCurve";
import { InequalityRegion } from "./InequalityRegion";
import { ParametricCurve } from "./ParametricCurve";
import { KeyPoints } from "./KeyPoints";
import { TracePoint } from "./TracePoint";
import { VectorField } from "./VectorField";
import { WindowPanel } from "./WindowPanel";

type ViewBox = { x: [number, number]; y: [number, number] };

const toViewBox = (w: GraphWindow): ViewBox => ({ x: [w.xMin, w.xMax], y: [w.yMin, w.yMax] });
const toWindow = (box: ViewBox): GraphWindow => ({ xMin: box.x[0], xMax: box.x[1], yMin: box.y[0], yMax: box.y[1] });

const DEFAULT_VIEW: ViewBox = { x: [-10, 10], y: [-6, 6] };
const TRIG_VIEW_LABEL: Record<AngleMode, string> = {
  deg: "Show x from -360° to 360°",
  rad: "Show x from -2π to 2π",
  grad: "Show x from -400 to 400 grad",
};
/** One full cycle either side of 0, like a handheld calculator's trig zoom. */
const TRIG_VIEW: Record<AngleMode, ViewBox> = {
  deg: { x: [-360, 360], y: [-2, 2] },
  rad: { x: [-2 * Math.PI, 2 * Math.PI], y: [-2, 2] },
  grad: { x: [-400, 400], y: [-2, 2] },
};

/** A y = f(x) curve. Only these support trace, key points and the value table. */
export type GraphCurve = {
  id: string;
  name: string;
  fn: PlotFunction;
  /** f in y = f(x), sampled in the plotting worker. */
  source: string;
  color: string;
  style: LineStyle;
};

/** Other drawable equations: shaded inequalities, parametric/polar and implicit curves, fields, data points. */
export type GraphShape = { id: string; color: string; style?: LineStyle } & (
  | { kind: "inequality"; fn: PlotFunction; op: Comparison }
  | { kind: "curve"; xy: (t: number) => Point; tMin: number; tMax: number }
  | { kind: "points"; points: Point[] }
  /** F(x, y) = 0, traced in the plotting worker. */
  | { kind: "implicit"; source: string }
  /** F(x, y) op 0, shaded in the plotting worker. */
  | { kind: "region"; conditions: RegionCondition[] }
  /** dy/dx = f(x, y) (slope) or field(P, Q). */
  | { kind: "field"; fn: FieldFn; slope: boolean }
);

const MAX_DATA_POINTS = 500;

type GraphProps = {
  curves: GraphCurve[];
  shapes: GraphShape[];
  /** Id of the curve to trace, or null to hide the trace point. */
  traceId: string | null;
  /** x of the trace point, shared with the value table. */
  traceX: number;
  onTraceMove: (x: number) => void;
  showKeyPoints: boolean;
  angleMode: AngleMode;
  /** The calculator scope and its worker copy, for curves traced in the plotting worker. */
  scope: Scope;
  snapshot: ScopeSnapshot;
  /** Window, grid, axis numbers and axis titles. */
  settings: GraphSettings;
  onSettingsChange: (settings: GraphSettings) => void;
};

/** Fills its container: the parent decides the size, the graph measures it. */
export function Graph({
  curves,
  shapes,
  traceId,
  traceX,
  onTraceMove,
  showKeyPoints,
  angleMode,
  scope,
  snapshot,
  settings,
  onSettingsChange,
}: GraphProps) {
  // Remounting Mafs is the only way to reset its internal pan/zoom state.
  // `exact` views (a window set by the user) show their bounds without Mafs' default 0.5 padding.
  const [view, setView] = useState<{ key: number; box: ViewBox; exact: boolean }>(() => ({
    key: 0,
    box: settings.window ? toViewBox(settings.window) : DEFAULT_VIEW,
    exact: settings.window !== null,
  }));
  const showView = (box: ViewBox, exact: boolean) => setView((current) => ({ key: current.key + 1, box, exact }));
  /** The window on screen when the Window panel was opened, or null while it's closed. */
  const [panelWindow, setPanelWindow] = useState<GraphWindow | null>(null);

  /** Shows `window` and remembers it (it goes into the share link). */
  function applyWindow(window: GraphWindow | null) {
    onSettingsChange({ ...settings, window });
    showView(window ? toViewBox(window) : DEFAULT_VIEW, window !== null);
  }

  // The grid reports the zoom scale; with the SVG's viewBox that gives the window on screen.
  const scaleRef = useRef<{ x: number; y: number } | null>(null);
  function visibleWindow(): GraphWindow {
    const svg = containerRef.current?.querySelector("svg");
    const scale = scaleRef.current;
    if (!svg || !scale) return toWindow(view.box);
    const { x, y, width, height } = svg.viewBox.baseVal;
    return { xMin: x / scale.x, xMax: (x + width) / scale.x, yMin: -(y + height) / scale.y, yMax: -y / scale.y };
  }

  const containerRef = useRef<HTMLDivElement>(null);
  // Mafs needs a numeric height. Passing the width too means a remounted
  // Mafs (Trig view, Reset view) draws at once instead of waiting a frame
  // for its own ResizeObserver before rendering any curves.
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const traced = curves.find((curve) => curve.id === traceId) ?? null;
  // Step off any x where the (possibly edited) traced function is undefined.
  const tracePointX = useMemo(
    () => (traced ? nearestDefinedX(traced.fn, traceX, 0.05) : null),
    [traced, traceX],
  );

  const keyPointCurves = useMemo(() => curves.map(({ id, source }) => ({ id, source })), [curves]);
  const names = useMemo(() => Object.fromEntries(curves.map((c) => [c.id, c.name])), [curves]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
    >
      {size.width > 0 && size.height > 0 && (
        <Mafs
          key={view.key}
          width={size.width}
          height={size.height}
          viewBox={view.exact ? { ...view.box, padding: 0 } : view.box}
          preserveAspectRatio={false}
          pan
          zoom={{ min: 0.05, max: 20 }}
        >
          <AdaptiveGrid grid={settings.grid} numbers={settings.numbers} scaleRef={scaleRef} />
          {/* Fields and shaded regions first so curves draw on top of them. */}
          {shapes.map((shape) =>
            shape.kind === "field" ? (
              <VectorField key={shape.id} fn={shape.fn} slope={shape.slope} color={shape.color} style={shape.style} />
            ) : null,
          )}
          {shapes.map((shape) =>
            shape.kind === "inequality" ? (
              <InequalityRegion key={shape.id} fn={shape.fn} op={shape.op} color={shape.color} style={shape.style} />
            ) : shape.kind === "region" ? (
              <ImplicitRegion
                key={shape.id}
                conditions={shape.conditions}
                color={shape.color}
                style={shape.style}
                scope={scope}
                snapshot={snapshot}
                angleMode={angleMode}
              />
            ) : null,
          )}
          {shapes.map((shape) =>
            shape.kind === "curve" ? (
              <ParametricCurve key={shape.id} xy={shape.xy} tMin={shape.tMin} tMax={shape.tMax} color={shape.color} style={shape.style} />
            ) : null,
          )}
          {shapes.map((shape) =>
            shape.kind === "implicit" ? (
              <ImplicitCurve
                key={shape.id}
                source={shape.source}
                color={shape.color}
                style={shape.style}
                scope={scope}
                snapshot={snapshot}
                angleMode={angleMode}
              />
            ) : null,
          )}
          {curves.map((curve) => (
            <FunctionCurve
              key={curve.id}
              source={curve.source}
              color={curve.color}
              style={curve.style ?? DEFAULT_LINE_STYLE}
              scope={scope}
              snapshot={snapshot}
              angleMode={angleMode}
            />
          ))}
          {shapes.map((shape) =>
            shape.kind === "points"
              ? shape.points.slice(0, MAX_DATA_POINTS).map(([x, y], i) => (
                  <MafsPoint
                    key={`${shape.id}-${i}`}
                    x={x}
                    y={y}
                    color={shape.color}
                    svgCircleProps={{ r: 4.5, children: <title>{`(${formatCoordinate(x)}, ${formatCoordinate(y)})`}</title> }}
                  />
                ))
              : null,
          )}
          {showKeyPoints && curves.length > 0 && <KeyPoints curves={keyPointCurves} names={names} scope={scope} snapshot={snapshot} angleMode={angleMode} />}
          {traced && tracePointX !== null && (
            <TracePoint fn={traced.fn} x={tracePointX} color={traced.color} onMove={onTraceMove} />
          )}
        </Mafs>
      )}
      {settings.yLabel.trim() && <AxisTitle className="top-2 left-2">{settings.yLabel}</AxisTitle>}
      {settings.xLabel.trim() && <AxisTitle className="right-2 bottom-2">{settings.xLabel}</AxisTitle>}
      <div className="absolute top-2 right-2 flex gap-1">
        <ViewButton
          onClick={() => setPanelWindow(panelWindow ? null : visibleWindow())}
          title="Set exact bounds, grid, axis numbers and axis titles"
        >
          Window
        </ViewButton>
        <ViewButton onClick={() => applyWindow(toWindow(TRIG_VIEW[angleMode]))} title={TRIG_VIEW_LABEL[angleMode]}>
          Trig view
        </ViewButton>
        <ViewButton onClick={() => applyWindow(null)} title="Show x from -10 to 10">
          Reset view
        </ViewButton>
      </div>
      {panelWindow && (
        <WindowPanel
          current={panelWindow}
          settings={settings}
          angleMode={angleMode}
          onApply={applyWindow}
          onSettingsChange={onSettingsChange}
          onClose={() => setPanelWindow(null)}
        />
      )}
    </div>
  );
}

/** An axis title pinned to a corner of the graph, so it stays visible however the graph is panned. */
function AxisTitle({ className, children }: { className: string; children: string }) {
  return (
    <span
      className={`pointer-events-none absolute max-w-[45%] truncate rounded bg-white/80 px-1.5 py-0.5 text-sm font-semibold text-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-100 ${className}`}
    >
      {children}
    </span>
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
