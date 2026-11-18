"use client";

import type { HistoryEntry } from "@/lib/calculator/history";

type HistoryPanelProps = {
  entries: HistoryEntry[];
  onUseExpression: (expression: string) => void;
  onInsertResult: (result: string) => void;
  onClear: () => void;
};

export function HistoryPanel({ entries, onUseExpression, onInsertResult, onClear }: HistoryPanelProps) {
  return (
    <section
      aria-labelledby="history-heading"
      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 id="history-heading" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          History
        </h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            Clear
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-400">Evaluated expressions appear here and are saved in this browser.</p>
      ) : (
        <ol className="max-h-72 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
          {entries.map((entry) => (
            <li key={`${entry.at}-${entry.expression}`} className="flex items-baseline justify-between gap-3 py-1.5">
              <button
                type="button"
                onClick={() => onUseExpression(entry.expression)}
                title="Edit this expression"
                className="min-w-0 truncate rounded px-1 text-left font-mono text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                {entry.expression}
              </button>
              <button
                type="button"
                onClick={() => onInsertResult(entry.result)}
                title="Insert this result"
                className="max-w-[50%] shrink-0 truncate rounded px-1 text-right font-mono text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                = {entry.result}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
