"use client";

import { Point, Text, usePaneContext } from "mafs";
import { useMemo, useState } from "react";
import { findKeyPoints, formatCoordinate, type Curve, type KeyPoint } from "@/lib/graph/keyPoints";

type KeyPointsProps = {
  curves: Curve[];
  /** Display names by curve id, e.g. "y₁". */
  names: Record<string, string>;
};

const pointKey = (p: KeyPoint) => `${p.kind}:${p.curveIds.join(",")}:${p.x.toFixed(9)}`;

function describe(p: KeyPoint, names: Record<string, string>): string {
  const where = `(${formatCoordinate(p.x)}, ${formatCoordinate(p.y)})`;
  return p.kind === "root"
    ? `Root of ${names[p.curveIds[0]]} at ${where}`
    : `${names[p.curveIds[0]]} and ${names[p.curveIds[1]]} intersect at ${where}`;
}

/**
 * Marks roots and intersections of the visible curves. Hovering a point shows
 * its coordinates; clicking it pins a label. Must be rendered inside <Mafs>.
 */
export function KeyPoints({ curves, names }: KeyPointsProps) {
  const { xPaneRange, yPaneRange } = usePaneContext();
  const [xMin, xMax] = xPaneRange;
  const [yMin, yMax] = yPaneRange;
  const [selected, setSelected] = useState<string | null>(null);

  const points = useMemo(() => findKeyPoints(curves, xMin, xMax, yMin, yMax), [curves, xMin, xMax, yMin, yMax]);
  const selectedPoint = points.find((p) => pointKey(p) === selected);

  return (
    <>
      {points.map((p) => {
        const key = pointKey(p);
        return (
          <Point
            key={key}
            x={p.x}
            y={p.y}
            color="var(--mafs-fg)"
            opacity={key === selected ? 1 : 0.75}
            svgCircleProps={{
              r: key === selected ? 6 : 4.5,
              style: { cursor: "pointer" },
              onClick: () => setSelected(key === selected ? null : key),
              children: <title>{describe(p, names)}</title>,
            }}
          />
        );
      })}
      {selectedPoint && (
        <Text
          x={selectedPoint.x}
          y={selectedPoint.y}
          attach="se"
          attachDistance={12}
          size={14}
          svgTextProps={{ style: { paintOrder: "stroke", stroke: "var(--mafs-bg)", strokeWidth: 4 } }}
        >
          {`(${formatCoordinate(selectedPoint.x)}, ${formatCoordinate(selectedPoint.y)})`}
        </Text>
      )}
    </>
  );
}
