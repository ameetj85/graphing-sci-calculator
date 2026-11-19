import type { AngleMode } from "@/lib/math/engine";

/**
 * A graphed equation. The cursor/selection of its input is kept separately
 * (see Calculator) so that moving the cursor does not invalidate compiled
 * curves and key points.
 */
export type Equation = {
  id: string;
  text: string;
  visible: boolean;
  color: string;
  style: LineStyle;
};

export type LineDash = "solid" | "dashed" | "dotted";
export type LineWidth = 1 | 2 | 3;
/** How an equation's curve is drawn. */
export type LineStyle = { dash: LineDash; width: LineWidth };

/** A change from the style picker: only the fields given change. */
export type LookChange = { color?: string; dash?: LineDash; width?: LineWidth };

export const DEFAULT_LINE_STYLE: LineStyle = { dash: "solid", width: 2 };

/** Stroke width in pixels for each width setting (thin, normal, thick). */
export const LINE_WIDTH_PX: Record<LineWidth, number> = { 1: 1.5, 2: 2.5, 3: 4 };

/** SVG stroke-dasharray for a style, scaled to its width; undefined for solid lines. */
export function dashArray(style: LineStyle): string | undefined {
  const px = LINE_WIDTH_PX[style.width];
  if (style.dash === "dashed") return `${(px * 3.5).toFixed(1)} ${(px * 2.5).toFixed(1)}`;
  // A near-zero dash with round caps draws a row of dots.
  if (style.dash === "dotted") return `0.01 ${(px * 2.2).toFixed(1)}`;
  return undefined;
}

/** The visible part of the graph, set from the Window panel. */
export type GraphWindow = { xMin: number; xMax: number; yMin: number; yMax: number };

/** Graph-wide display settings. */
export type GraphSettings = {
  /** A window chosen in the Window panel, or null for the default view. */
  window: GraphWindow | null;
  grid: boolean;
  /** Numbers along the axes. */
  numbers: boolean;
  xLabel: string;
  yLabel: string;
};

export const DEFAULT_GRAPH_SETTINGS: GraphSettings = { window: null, grid: true, numbers: true, xLabel: "", yLabel: "" };
export const MAX_AXIS_LABEL_LENGTH = 40;

/** True when the window has finite bounds in the right order. */
export function isValidWindow(w: GraphWindow): boolean {
  return [w.xMin, w.xMax, w.yMin, w.yMax].every(Number.isFinite) && w.xMax > w.xMin && w.yMax > w.yMin;
}

export const MAX_EQUATIONS = 6;
const MAX_EQUATION_LENGTH = 200;

/** Curve colors, themed in app/globals.css. */
export const EQUATION_COLORS = [
  "var(--mafs-blue)",
  "var(--mafs-red)",
  "var(--mafs-green)",
  "var(--mafs-violet)",
  "var(--mafs-orange)",
  "var(--mafs-pink)",
];

export function nextColor(equations: Equation[]): string {
  const used = new Set(equations.map((eq) => eq.color));
  return EQUATION_COLORS.find((color) => !used.has(color)) ?? EQUATION_COLORS[equations.length % EQUATION_COLORS.length];
}

export function createEquation(id: string, text: string, existing: Equation[]): Equation {
  return { id, text, visible: true, color: nextColor(existing), style: DEFAULT_LINE_STYLE };
}

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";

/** Display name for the equation at `index`: y₁, y₂, ... */
export function equationName(index: number): string {
  const digits = String(index + 1)
    .split("")
    .map((d) => SUBSCRIPTS[Number(d)])
    .join("");
  return `y${digits}`;
}

export type GraphView = "2d" | "3d";

/** An equation's colour and line style, as carried in a share link. */
export type EquationLook = { color: string; style: LineStyle };

export type ShareState = {
  equations: string[];
  angleMode: AngleMode;
  /** Omitted from the URL when 2D. */
  view?: GraphView;
  /** Colour and style for each equation, in the same order; omitted ones use the defaults. */
  looks?: (EquationLook | undefined)[];
  /** Graph settings; defaults are omitted from the URL. */
  settings?: Partial<GraphSettings>;
};

const DASH_CODES: Record<LineDash, string> = { solid: "s", dashed: "d", dotted: "o" };

/** The colour an equation gets by default at position `index` (see nextColor). */
const defaultColor = (index: number) => EQUATION_COLORS[index % EQUATION_COLORS.length];

/** Shortest decimal for a window bound, e.g. 6.283185307 for 2π. */
const formatBound = (n: number) => String(Number(n.toPrecision(10)));

/**
 * Query string that reproduces the graph, e.g.
 * `eq=sin(x)&eq=x%5E2&angle=deg&st=1.1d3&win=-5,5,-2,2`. `st` lists the
 * equations whose colour or style isn't the default, as
 * index.colour-number dash-code width.
 */
export function encodeShareState({ equations, angleMode, view, looks, settings }: ShareState): string {
  const params = new URLSearchParams();
  const styles: string[] = [];
  let index = 0;
  equations.forEach((text, i) => {
    if (!text.trim()) return;
    params.append("eq", text);
    const look = looks?.[i];
    const colorIndex = look ? EQUATION_COLORS.indexOf(look.color) : -1;
    if (
      look &&
      colorIndex !== -1 &&
      (look.color !== defaultColor(index) || look.style.dash !== DEFAULT_LINE_STYLE.dash || look.style.width !== DEFAULT_LINE_STYLE.width)
    ) {
      styles.push(`${index}.${colorIndex}${DASH_CODES[look.style.dash]}${look.style.width}`);
    }
    index++;
  });
  if (angleMode !== "rad") params.set("angle", angleMode);
  if (view === "3d") params.set("view", "3d");
  if (styles.length) params.set("st", styles.join("_"));
  const w = settings?.window;
  if (w && isValidWindow(w)) params.set("win", [w.xMin, w.xMax, w.yMin, w.yMax].map(formatBound).join(","));
  if (settings?.grid === false) params.set("grid", "0");
  if (settings?.numbers === false) params.set("nums", "0");
  if (settings?.xLabel?.trim()) params.set("xl", settings.xLabel.trim());
  if (settings?.yLabel?.trim()) params.set("yl", settings.yLabel.trim());
  return params.toString();
}

const STYLE_ENTRY = /^(\d)\.(\d)([sdo])([123])$/;

/** Reads a query string written by encodeShareState. Unknown or oversized values are dropped. */
export function decodeShareState(search: string): Partial<ShareState> {
  const params = new URLSearchParams(search);
  const result: Partial<ShareState> = {};
  const equations = params
    .getAll("eq")
    .filter((text) => text.trim() && text.length <= MAX_EQUATION_LENGTH)
    .slice(0, MAX_EQUATIONS);
  if (equations.length > 0) result.equations = equations;
  const angle = params.get("angle");
  if (angle === "deg" || angle === "rad" || angle === "grad") result.angleMode = angle;
  const view = params.get("view");
  if (view === "2d" || view === "3d") result.view = view;

  const looks: (EquationLook | undefined)[] = [];
  for (const entry of (params.get("st") ?? "").split("_")) {
    const match = STYLE_ENTRY.exec(entry);
    if (!match) continue;
    const [, index, color, dash, width] = match;
    if (Number(index) >= (result.equations?.length ?? 0) || Number(color) >= EQUATION_COLORS.length) continue;
    const dashName = (Object.keys(DASH_CODES) as LineDash[]).find((d) => DASH_CODES[d] === dash)!;
    looks[Number(index)] = { color: EQUATION_COLORS[Number(color)], style: { dash: dashName, width: Number(width) as LineWidth } };
  }
  if (looks.length) result.looks = looks;

  const settings: Partial<GraphSettings> = {};
  const bounds = (params.get("win") ?? "").split(",").map(Number);
  if (bounds.length === 4) {
    const [xMin, xMax, yMin, yMax] = bounds;
    if (isValidWindow({ xMin, xMax, yMin, yMax })) settings.window = { xMin, xMax, yMin, yMax };
  }
  if (params.get("grid") === "0") settings.grid = false;
  if (params.get("nums") === "0") settings.numbers = false;
  for (const [key, name] of [["xl", "xLabel"], ["yl", "yLabel"]] as const) {
    const label = params.get(key)?.trim();
    if (label && label.length <= MAX_AXIS_LABEL_LENGTH) settings[name] = label;
  }
  if (Object.keys(settings).length) result.settings = settings;
  return result;
}
