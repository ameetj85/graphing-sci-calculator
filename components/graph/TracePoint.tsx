"use client";

import { MovablePoint, Text, type vec } from "mafs";
import { formatCoordinate } from "@/lib/graph/keyPoints";
import { derivativeAt } from "@/lib/math/calculus";
import type { PlotFunction } from "@/lib/math/engine";

type TracePointProps = {
  fn: PlotFunction;
  x: number;
  color: string;
  onMove: (x: number) => void;
};

/**
 * A draggable point locked to y = fn(x), with a coordinate and slope readout. It also
 * moves with the arrow keys once focused. Must be rendered inside <Mafs>.
 */
export function TracePoint({ fn, x, color, onMove }: TracePointProps) {
  const y = fn(x);
  if (!Number.isFinite(y)) return null;
  const slope = derivativeAt(fn, x);

  const constrain = ([px]: vec.Vector2): vec.Vector2 => {
    const py = fn(px);
    return Number.isFinite(py) ? [px, py] : [x, y];
  };

  return (
    <>
      <MovablePoint point={[x, y]} color={color} constrain={constrain} onMove={([px]) => onMove(px)} />
      <Text
        x={x}
        y={y}
        attach="ne"
        attachDistance={16}
        size={14}
        color={color}
        svgTextProps={{ style: { paintOrder: "stroke", stroke: "var(--mafs-bg)", strokeWidth: 4, fontWeight: 600 } }}
      >
        {`(${formatCoordinate(x)}, ${formatCoordinate(y)})${Number.isFinite(slope) ? `  slope ${formatCoordinate(slope)}` : ""}`}
      </Text>
    </>
  );
}
