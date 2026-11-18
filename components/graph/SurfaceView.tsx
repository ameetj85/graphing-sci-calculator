"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatCoordinate } from "@/lib/graph/keyPoints";
import type { PlotJob, PlotJobResult } from "@/lib/graph/plotJobs";
import type { ScopeSnapshot } from "@/lib/graph/scopeSnapshot";
import { zRange } from "@/lib/graph/surface";
import type { AngleMode, Scope } from "@/lib/math/engine";
import { usePlotJob } from "./usePlotJob";

export type GraphSurface = { id: string; name: string; source: string; color: string };

type SurfaceViewProps = {
  surfaces: GraphSurface[];
  scope: Scope;
  snapshot: ScopeSnapshot;
  angleMode: AngleMode;
};

/** Half-width of the x/y domain by angle mode: trig surfaces show about one turn. */
const DEFAULT_RADIUS: Record<AngleMode, number> = { rad: 5, deg: 360, grad: 400 };
const DEFAULT_ROTATION = { yaw: -0.65, pitch: 0.5 };
const BOX_HEIGHT = 0.75; // z spans [-0.75, 0.75] in the normalized box; x and y span [-1, 1]
const PERSPECTIVE = 5;
const MIN_PITCH = -1.45;
const MAX_PITCH = 1.45;

type Rotation = { yaw: number; pitch: number };
type Rgb = [number, number, number];

function parseColor(text: string): Rgb {
  const hex = text.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = text.match(/(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : [37, 99, 235];
}

/** Resolves `var(--name)` (or a plain color) against the element's styles. */
function resolveColor(element: Element, color: string): Rgb {
  const variable = color.match(/^var\((--[\w-]+)\)$/);
  return parseColor(variable ? getComputedStyle(element).getPropertyValue(variable[1]) : color);
}

/** Projects normalized box coordinates to the canvas. */
function makeProjector(rotation: Rotation, width: number, height: number) {
  const cy = Math.cos(rotation.yaw);
  const sy = Math.sin(rotation.yaw);
  const cp = Math.cos(rotation.pitch);
  const sp = Math.sin(rotation.pitch);
  // Rotated and tilted, the box reaches about 1.45 units from the centre across and 1.35 up or down.
  const scale = Math.min(width * 0.31, height * 0.3);
  const centerX = width / 2;
  const centerY = height / 2 - 8;
  /** Rotates into camera space: u right, v up, d away from the viewer. */
  const rotate = (x: number, y: number, z: number): [number, number, number] => {
    const x1 = x * cy - y * sy;
    const y1 = x * sy + y * cy;
    return [x1, z * cp + y1 * sp, y1 * cp - z * sp];
  };
  const project = (x: number, y: number, z: number): [number, number, number] => {
    const [u, v, d] = rotate(x, y, z);
    const s = PERSPECTIVE / (PERSPECTIVE + d);
    return [centerX + u * s * scale, centerY - v * s * scale, d];
  };
  return { rotate, project };
}

type DrawInput = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  rotation: Rotation;
  result: Extract<PlotJobResult, { kind: "surface" }> | null;
  colors: Record<string, string>;
  range: { min: number; max: number } | null;
};

function draw({ canvas, width, height, rotation, result, colors, range }: DrawInput) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const style = getComputedStyle(canvas);
  const bg = style.getPropertyValue("--mafs-bg").trim() || "#fff";
  const fg = style.getPropertyValue("--mafs-fg").trim() || "#18181b";
  const line = style.getPropertyValue("--mafs-line-color").trim() || "#d4d4d8";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const { rotate, project } = makeProjector(rotation, width, height);
  const H = BOX_HEIGHT;

  // Bounding box.
  const corners: [number, number, number][] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-H, H]) corners.push([x, y, z]);
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let a = 0; a < corners.length; a++) {
    for (let b = a + 1; b < corners.length; b++) {
      const differing = corners[a].filter((v, k) => v !== corners[b][k]).length;
      if (differing !== 1) continue;
      const [x1, y1] = project(...corners[a]);
      const [x2, y2] = project(...corners[b]);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
  }
  ctx.stroke();

  if (result && range) {
    const n = result.n;
    const size = n + 1;
    const mid = (range.min + range.max) / 2;
    const half = (range.max - range.min) / 2;
    const light = (() => {
      const l: [number, number, number] = [-0.35, 0.55, -0.75]; // from upper left, towards the viewer
      const len = Math.hypot(...l);
      return l.map((v) => v / len) as [number, number, number];
    })();

    type Quad = { depth: number; points: number[]; fill: string; stroke: string };
    const quads: Quad[] = [];
    for (const grid of result.grids) {
      if (!("z" in grid)) continue;
      const base = resolveColor(canvas, colors[grid.id] ?? "var(--mafs-blue)");
      const px = new Float64Array(size * size);
      const py = new Float64Array(size * size);
      const pd = new Float64Array(size * size);
      const wz = new Float64Array(size * size);
      for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
          const k = j * size + i;
          const z = grid.z[k];
          if (Number.isNaN(z)) {
            wz[k] = NaN;
            continue;
          }
          wz[k] = Math.max(-1, Math.min(1, (z - mid) / half)) * H;
          [px[k], py[k], pd[k]] = project(-1 + (2 * i) / n, -1 + (2 * j) / n, wz[k]);
        }
      }
      const step = 2 / n;
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const a = j * size + i;
          const b = a + 1;
          const c = a + size + 1;
          const d = a + size;
          if (Number.isNaN(wz[a]) || Number.isNaN(wz[b]) || Number.isNaN(wz[c]) || Number.isNaN(wz[d])) continue;
          // Normal from the cell's diagonals, in camera space for lighting.
          const e1: [number, number, number] = [step, step, wz[c] - wz[a]];
          const e2: [number, number, number] = [-step, step, wz[d] - wz[b]];
          const normal = rotate(
            e1[1] * e2[2] - e1[2] * e2[1],
            e1[2] * e2[0] - e1[0] * e2[2],
            e1[0] * e2[1] - e1[1] * e2[0],
          );
          const len = Math.hypot(...normal) || 1;
          const lambert = Math.abs((normal[0] * light[0] + normal[1] * light[1] + normal[2] * light[2]) / len);
          const shade = 0.35 + 0.65 * lambert;
          const rgb = base.map((v) => Math.round(v * shade));
          const edge = base.map((v) => Math.round(v * shade * 0.8));
          quads.push({
            depth: (pd[a] + pd[b] + pd[c] + pd[d]) / 4,
            points: [px[a], py[a], px[b], py[b], px[c], py[c], px[d], py[d]],
            fill: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`,
            stroke: `rgb(${edge[0]},${edge[1]},${edge[2]})`,
          });
        }
      }
    }
    // Painter's algorithm: farthest cells first.
    quads.sort((p, q) => q.depth - p.depth);
    ctx.lineWidth = 0.6;
    ctx.lineJoin = "round";
    for (const quad of quads) {
      const p = quad.points;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(p[2], p[3]);
      ctx.lineTo(p[4], p[5]);
      ctx.lineTo(p[6], p[7]);
      ctx.closePath();
      ctx.fillStyle = quad.fill;
      ctx.fill();
      ctx.strokeStyle = quad.stroke;
      ctx.stroke();
    }
  }

  // Axis names at the middle of three box edges.
  ctx.fillStyle = fg;
  ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = (text: string, x: number, y: number, z: number) => {
    const [sx, sy] = project(x, y, z);
    ctx.fillText(text, sx, sy);
  };
  label("x", 0, -1.18, -H);
  label("y", 1.18, 0, -H);
  label("z", -1.12, -1.12, 0);
}

export function SurfaceView({ surfaces, scope, snapshot, angleMode }: SurfaceViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [radius, setRadius] = useState(DEFAULT_RADIUS[angleMode]);
  const [rotation, setRotation] = useState<Rotation>(DEFAULT_ROTATION);
  const [themeVersion, setThemeVersion] = useState(0);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: Math.floor(entry.contentRect.width), height: Math.floor(entry.contentRect.height) }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Redraw with the new colors when the system theme changes.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setThemeVersion((v) => v + 1);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Scroll to zoom. A native listener, because React's wheel listener is passive.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setRadius((r) => clampRadius(r * Math.exp(event.deltaY * 0.0015)));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const job = useMemo((): PlotJob | null => {
    if (surfaces.length === 0) return null;
    return {
      kind: "surface",
      items: surfaces.map(({ id, source }) => ({ id, source })),
      domain: { xMin: -radius, xMax: radius, yMin: -radius, yMax: radius },
      n: surfaces.length > 2 ? 36 : 56,
      angleMode,
      scope: snapshot,
    };
  }, [surfaces, radius, angleMode, snapshot]);
  const { result, busy } = usePlotJob(job, scope);
  const surfaceResult = result?.kind === "surface" ? result : null;

  const range = useMemo(
    () => (surfaceResult ? zRange(surfaceResult.grids.flatMap((g) => ("z" in g ? [g.z] : []))) : null),
    [surfaceResult],
  );
  const colors = useMemo(() => Object.fromEntries(surfaces.map((s) => [s.id, s.color])), [surfaces]);
  const errors = surfaceResult?.grids.flatMap((g) => ("error" in g ? [g] : [])) ?? [];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    draw({ canvas, width: size.width, height: size.height, rotation, result: surfaceResult, colors, range });
  }, [size, rotation, surfaceResult, colors, range, themeVersion]);

  const rotateBy = (dYaw: number, dPitch: number) =>
    setRotation((r) => ({ yaw: r.yaw + dYaw, pitch: Math.max(MIN_PITCH, Math.min(MAX_PITCH, r.pitch + dPitch)) }));

  const shownDomain = surfaceResult?.domain;
  const description =
    surfaces.length === 0
      ? "3D view with no surfaces"
      : `3D graph of ${surfaces.map((s) => `${s.name}: z = ${s.source}`).join("; ")}` +
        (shownDomain ? `, for x and y from ${formatCoordinate(shownDomain.xMin)} to ${formatCoordinate(shownDomain.xMax)}` : "") +
        (range ? `, z from ${formatCoordinate(range.min)} to ${formatCoordinate(range.max)}` : "");

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={description}
        tabIndex={0}
        style={{ width: size.width, height: size.height, touchAction: "none" }}
        className="block cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const last = drag.current;
          if (!last || last.id !== event.pointerId) return;
          rotateBy((event.clientX - last.x) * 0.01, (event.clientY - last.y) * 0.01);
          drag.current = { ...last, x: event.clientX, y: event.clientY };
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(event) => {
          const actions: Record<string, () => void> = {
            ArrowLeft: () => rotateBy(-0.1, 0),
            ArrowRight: () => rotateBy(0.1, 0),
            ArrowUp: () => rotateBy(0, -0.1),
            ArrowDown: () => rotateBy(0, 0.1),
            "+": () => setRadius((r) => clampRadius(r / 1.25)),
            "=": () => setRadius((r) => clampRadius(r / 1.25)),
            "-": () => setRadius((r) => clampRadius(r * 1.25)),
          };
          const action = actions[event.key];
          if (action) {
            event.preventDefault();
            action();
          }
        }}
      />

      <div className="absolute top-2 right-2 flex gap-1">
        <OverlayButton onClick={() => setRadius((r) => clampRadius(r / 1.25))} title="Zoom in (+)">
          +
        </OverlayButton>
        <OverlayButton onClick={() => setRadius((r) => clampRadius(r * 1.25))} title="Zoom out (−)">
          −
        </OverlayButton>
        <OverlayButton
          onClick={() => {
            setRadius(DEFAULT_RADIUS[angleMode]);
            setRotation(DEFAULT_ROTATION);
          }}
          title={`Show x and y from -${DEFAULT_RADIUS[angleMode]} to ${DEFAULT_RADIUS[angleMode]}`}
        >
          Reset view
        </OverlayButton>
      </div>

      <div className="pointer-events-none absolute bottom-2 left-2 flex flex-col gap-0.5 rounded-md bg-white/85 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-900/85 dark:text-zinc-300">
        {surfaces.length === 0 ? (
          <span>
            Type an equation such as <code>z = sin(x) cos(y)</code> to draw a surface.
          </span>
        ) : (
          <>
            {shownDomain && (
              <span>
                x, y: {formatCoordinate(shownDomain.xMin)} to {formatCoordinate(shownDomain.xMax)}
                {range && (
                  <>
                    {" "}· z: {formatCoordinate(range.min)} to {formatCoordinate(range.max)}
                  </>
                )}
              </span>
            )}
            <span>Drag to rotate, scroll to zoom{busy ? " · Computing…" : ""}</span>
          </>
        )}
        {errors.map((e) => (
          <span key={e.id} className="text-red-600 dark:text-red-400">
            {surfaces.find((s) => s.id === e.id)?.name}: {e.error}
          </span>
        ))}
      </div>
    </div>
  );
}

function clampRadius(r: number): number {
  return Math.max(1e-3, Math.min(1e6, r));
}

function OverlayButton({ onClick, title, children }: { onClick: () => void; title: string; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="min-w-7 rounded-md border border-zinc-300 bg-white/90 px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-900"
    >
      {children}
    </button>
  );
}
