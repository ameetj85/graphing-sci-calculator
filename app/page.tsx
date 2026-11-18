import { Suspense } from "react";
import { Calculator } from "@/components/calculator/Calculator";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Graphing Scientific Calculator</h1>
        <p className="text-sm text-zinc-500">
          Type an expression and press Enter, or graph functions of x on the right. Define variables with{" "}
          <code>a = 3</code> or functions with <code>f(x) = x^2</code>; the last result is available as{" "}
          <code>ans</code>. Separate multiple statements with <code>;</code>, as in <code>r = 2; pi r^2</code>.
        </p>
      </header>
      {/* The calculator reads saved history and shared graphs from the browser, so it renders client-side. */}
      <Suspense fallback={<CalculatorSkeleton />}>
        <Calculator />
      </Suspense>
    </main>
  );
}

function CalculatorSkeleton() {
  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]" aria-busy="true">
      <div className="h-[640px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      <div className="h-[640px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      <p className="sr-only">Loading calculator…</p>
    </div>
  );
}
