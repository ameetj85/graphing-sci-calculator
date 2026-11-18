"use client";

import { useEffect, useState } from "react";
import { runPlotJob } from "@/lib/graph/plotClient";
import type { PlotJob, PlotJobResult } from "@/lib/graph/plotJobs";
import type { Scope } from "@/lib/math/engine";

/**
 * Runs `job` in the plotting worker and returns the latest result. A newer
 * job cancels the one before it. `busy` is true until the current job's
 * result arrives; the previous result is kept meanwhile so nothing flickers.
 */
export function usePlotJob(job: PlotJob | null, scope: Scope): { result: PlotJobResult | null; busy: boolean } {
  const [state, setState] = useState<{ job: PlotJob | null; result: PlotJobResult | null }>({ job: null, result: null });

  useEffect(() => {
    if (!job) return;
    const handle = runPlotJob(job, scope);
    let active = true;
    handle.promise.then((result) => {
      if (active) setState({ job, result });
    });
    return () => {
      active = false;
      handle.cancel();
    };
  }, [job, scope]);

  return { result: job ? state.result : null, busy: job !== null && state.job !== job };
}
