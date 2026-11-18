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
};

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
  return { id, text, visible: true, color: nextColor(existing) };
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

export type ShareState = {
  equations: string[];
  angleMode: AngleMode;
  /** Omitted from the URL when 2D. */
  view?: GraphView;
};

/** Query string that reproduces the graph, e.g. `eq=sin(x)&eq=x%5E2&angle=deg&view=3d`. */
export function encodeShareState({ equations, angleMode, view }: ShareState): string {
  const params = new URLSearchParams();
  for (const text of equations) if (text.trim()) params.append("eq", text);
  if (angleMode !== "rad") params.set("angle", angleMode);
  if (view === "3d") params.set("view", "3d");
  return params.toString();
}

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
  return result;
}
