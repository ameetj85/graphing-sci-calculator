"use client";

import { Coordinates, Mafs } from "mafs";
import { useState } from "react";
import type { PlotFunction } from "@/lib/math/engine";
import { FunctionCurve } from "./FunctionCurve";

const DEFAULT_VIEW = { x: [-10, 10] as [number, number], y: [-6, 6] as [number, number] };

type GraphProps = {
  fn: PlotFunction | null;
  height?: number;
};

export function Graph({ fn, height = 440 }: GraphProps) {
  // Remounting Mafs is the only way to reset its internal pan/zoom state.
  const [viewKey, setViewKey] = useState(0);

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <Mafs
        key={viewKey}
        height={height}
        viewBox={DEFAULT_VIEW}
        preserveAspectRatio={false}
        pan
        zoom={{ min: 0.05, max: 20 }}
      >
        <Coordinates.Cartesian subdivisions={2} />
        {fn && <FunctionCurve fn={fn} />}
      </Mafs>
      <button
        type="button"
        onClick={() => setViewKey((key) => key + 1)}
        className="absolute top-2 right-2 rounded-md border border-zinc-300 bg-white/90 px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        Reset view
      </button>
    </div>
  );
}
