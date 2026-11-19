"use client";

import { Coordinates, useTransformContext } from "mafs";
import { useEffect, type RefObject } from "react";
import { formatTick, niceStep } from "@/lib/graph/gridStep";

type AdaptiveGridProps = {
  /** Grid lines; the axes are always drawn. */
  grid?: boolean;
  /** Numbers along the axes. */
  numbers?: boolean;
  /** Receives the current pixels-per-unit scales, so the graph can work out the visible window. */
  scaleRef?: RefObject<{ x: number; y: number } | null>;
};

/**
 * Cartesian grid whose line spacing follows the zoom level and graph size, so
 * labels never crowd together (Mafs' default is a fixed 1 unit). Must be
 * rendered inside <Mafs>.
 */
export function AdaptiveGrid({ grid = true, numbers = true, scaleRef }: AdaptiveGridProps) {
  const { viewTransform } = useTransformContext();
  // Mafs matrices are [a, c, tx, b, d, ty]; a and d are the x and y scales in pixels per unit.
  const xScale = Math.abs(viewTransform[0]);
  const yScale = Math.abs(viewTransform[4]);
  const xStep = niceStep(xScale, 56);
  const yStep = niceStep(yScale, 36);

  useEffect(() => {
    if (scaleRef) scaleRef.current = { x: xScale, y: yScale };
  }, [scaleRef, xScale, yScale]);

  return (
    <Coordinates.Cartesian
      subdivisions={grid ? 2 : false}
      xAxis={{ lines: grid ? xStep : false, labels: numbers ? (n) => formatTick(n, xStep) : false }}
      yAxis={{ lines: grid ? yStep : false, labels: numbers ? (n) => formatTick(n, yStep) : false }}
    />
  );
}
