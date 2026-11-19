"use client";

import { usePaneContext, useTransformContext } from "mafs";
import { useMemo } from "react";
import { DEFAULT_LINE_STYLE, LINE_WIDTH_PX, type LineStyle } from "@/lib/graph/equations";
import { fieldPaths, type FieldFn } from "@/lib/graph/field";

type VectorFieldProps = {
  fn: FieldFn;
  /** Short segments for dy/dx = f(x, y); arrows for field(P, Q). */
  slope: boolean;
  color: string;
  style?: LineStyle;
};

/**
 * A slope or vector field on a grid that re-spaces with the zoom level.
 * Longer vectors are drawn more opaque. A few hundred evaluations per view,
 * so it is computed here rather than in the plotting worker. Must be
 * rendered inside <Mafs>.
 */
export function VectorField({ fn, slope, color, style = DEFAULT_LINE_STYLE }: VectorFieldProps) {
  const { xPaneRange, yPaneRange } = usePaneContext();
  const { viewTransform } = useTransformContext();
  const [xMin, xMax] = xPaneRange;
  const [yMin, yMax] = yPaneRange;
  // Mafs matrices are [a, c, tx, b, d, ty]; a and d are the x and y scales in pixels per unit.
  const xScale = Math.abs(viewTransform[0]);
  const yScale = Math.abs(viewTransform[4]);

  const paths = useMemo(
    () => fieldPaths(fn, { xMin, xMax, yMin, yMax, xScale, yScale, slope }),
    [fn, xMin, xMax, yMin, yMax, xScale, yScale, slope],
  );

  return (
    <g data-field="">
      {paths.map(({ d, opacity }) => (
        <path
          key={opacity}
          d={d}
          fill="none"
          strokeWidth={Math.max(1.25, LINE_WIDTH_PX[style.width] * 0.7)}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ stroke: color, strokeOpacity: opacity, vectorEffect: "non-scaling-stroke", transform: "var(--mafs-view-transform)" }}
        />
      ))}
    </g>
  );
}
