"use client";

import { useMemo } from "react";
import { WORKSPACE_VARIABLES } from "@/lib/calculator/workspace";
import { isProgramFunction } from "@/lib/script/interpreter";
import { MATH_CONSTANTS, PHYSICAL_CONSTANTS, type ConstantInfo } from "@/lib/math/constants";
import { createScope, evaluateExpression, formatValue, type Scope } from "@/lib/math/engine";

type VariablesPanelProps = {
  /** Snapshot of the calculator scope (updated after each evaluation). */
  scope: Scope;
  onInsert: (name: string) => void;
  onDelete: (name: string) => void;
};

const buttonClass =
  "rounded-md border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800";

function constantValue(constant: ConstantInfo): string {
  const result = evaluateExpression(constant.name, createScope());
  return result.ok ? result.display : "—";
}

export function VariablesPanel({ scope, onInsert, onDelete }: VariablesPanelProps) {
  const variables = useMemo(
    () =>
      [...scope.entries()]
        // Data lists, matrices and programs have their own tabs.
        .filter(([name, value]) => !WORKSPACE_VARIABLES.includes(name) && !isProgramFunction(value))
        .sort(([a], [b]) => (a === "ans" ? -1 : b === "ans" ? 1 : a.localeCompare(b))),
    [scope],
  );
  const constants = useMemo(
    () => [...MATH_CONSTANTS, ...PHYSICAL_CONSTANTS].map((c) => ({ ...c, value: constantValue(c) })),
    [],
  );

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="variables-heading">
        <h3 id="variables-heading" className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Your variables and functions
        </h3>
        <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {variables.map(([name, value]) => (
            <li key={name} className="flex items-center gap-3 py-1.5">
              <span className="min-w-0 flex-1 truncate font-mono text-sm">
                <span className="font-semibold">{name}</span>
                <span className="text-zinc-500"> = </span>
                {formatValue(value)}
              </span>
              <button type="button" onClick={() => onInsert(name)} aria-label={`Insert ${name}`} className={buttonClass}>
                Insert
              </button>
              <button type="button" onClick={() => onDelete(name)} aria-label={`Delete ${name}`} className={buttonClass}>
                Delete
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-zinc-500">
          Store values with <code>name = value</code> and functions with <code>f(x) = …</code> in the Expression input.
          Data lists, matrices and programs are in their own tabs.
        </p>
      </section>

      <section aria-labelledby="constants-heading">
        <h3 id="constants-heading" className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Constants
        </h3>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {constants.map((c) => (
                <tr key={c.name} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                  <td className="w-10 py-1.5 pr-2 font-serif text-base italic">{c.symbol}</td>
                  <td className="py-1.5 pr-2">
                    <div>{c.label}</div>
                    <div className="font-mono text-xs text-zinc-500">{c.name}</div>
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono text-xs text-zinc-700 dark:text-zinc-300">{c.value}</td>
                  <td className="py-1.5 text-right">
                    <button type="button" onClick={() => onInsert(c.name)} aria-label={`Insert ${c.name}`} className={buttonClass}>
                      Insert
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Physical constants carry units, so <code>speedOfLight * 2 s to km</code> gives a distance.
        </p>
      </section>
    </div>
  );
}
