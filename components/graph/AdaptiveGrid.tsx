"use client";

import { Coordinates, useTransformContext } from "mafs";
import { formatTick, niceStep } from "@/lib/graph/gridStep";

/**
 * Cartesian grid whose line spacing follows the zoom level and graph size, so
 * labels never crowd together (Mafs' default is a fixed 1 unit). Must be
 * rendered inside <Mafs>.
 */
export function AdaptiveGrid() {
  const { viewTransform } = useTransformContext();
  // Mafs matrices are [a, c, tx, b, d, ty]; a and d are the x and y scales in pixels per unit.
  const xStep = niceStep(Math.abs(viewTransform[0]), 56);
  const yStep = niceStep(Math.abs(viewTransform[4]), 36);

  return (
    <Coordinates.Cartesian
      subdivisions={2}
      xAxis={{ lines: xStep, labels: (n) => formatTick(n, xStep) }}
      yAxis={{ lines: yStep, labels: (n) => formatTick(n, yStep) }}
    />
  );
}
