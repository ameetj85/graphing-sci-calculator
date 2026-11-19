"use client";

import { useMemo, useState } from "react";
import { parseProgram, type Program } from "@/lib/script/interpreter";
import { MAX_PROGRAMS, parseParams } from "@/lib/script/programs";
import type { AngleMode } from "@/lib/math/engine";

export type ProgramRun = { ok: true; value: string | null; output: string[] } | { ok: false; error: string; output: string[] };

type ProgramsPanelProps = {
  programs: Program[];
  angleMode: AngleMode;
  /** Saves a new or changed program; returns an error message or null. */
  onSave: (program: Program) => string | null;
  onDelete: (id: string) => void;
  /** Runs a saved program with argument expressions. */
  onRun: (program: Program, args: string[]) => ProgramRun;
  onInsert: (text: string) => void;
};

const NEW_ID = "new";
const NEW_PROGRAM_BODY = `# Your program. Parameters are variables here.
result = 0
return result`;

const buttonClass =
  "rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:hover:bg-zinc-800";
const fieldClass =
  "rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 font-mono text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950";

export function ProgramsPanel({ programs, angleMode, onSave, onDelete, onRun, onInsert }: ProgramsPanelProps) {
  const [selectedId, setSelectedId] = useState<string>(programs[0]?.id ?? NEW_ID);
  const selected = programs.find((p) => p.id === selectedId) ?? null;
  const [dirty, setDirty] = useState(false);
  // Changes only when the user picks another program, so saving a new one keeps its editor (and run output).
  const [editorKey, setEditorKey] = useState(0);

  function select(id: string) {
    if (id === selectedId) return;
    if (dirty && !window.confirm("Discard unsaved changes to this program?")) return;
    setDirty(false);
    setSelectedId(id);
    setEditorKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5" role="list" aria-label="Saved programs">
        {programs.map((program) => (
          <button
            key={program.id}
            type="button"
            role="listitem"
            onClick={() => select(program.id)}
            aria-current={program.id === selectedId}
            className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${
              program.id === selectedId
                ? "border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-200"
                : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            }`}
          >
            {program.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => select(NEW_ID)}
          disabled={programs.length >= MAX_PROGRAMS}
          aria-current={selectedId === NEW_ID}
          className={`rounded-full border border-dashed px-2.5 py-0.5 text-xs ${
            selectedId === NEW_ID ? "border-blue-500 text-blue-700 dark:text-blue-300" : "border-zinc-400 text-zinc-600 dark:text-zinc-400"
          }`}
        >
          + New program
        </button>
      </div>

      <ProgramEditor
        key={editorKey}
        program={selected}
        angleMode={angleMode}
        onDirtyChange={setDirty}
        onSave={(program) => {
          const error = onSave(program);
          if (!error) {
            setDirty(false);
            setSelectedId(program.id);
          }
          return error;
        }}
        onDelete={(id) => {
          onDelete(id);
          setDirty(false);
          setSelectedId(programs.find((p) => p.id !== id)?.id ?? NEW_ID);
          setEditorKey((k) => k + 1);
        }}
        onRun={onRun}
        onInsert={onInsert}
      />

      <ProgramHelp />
    </div>
  );
}

type ProgramEditorProps = {
  program: Program | null;
  angleMode: AngleMode;
  onDirtyChange: (dirty: boolean) => void;
  onSave: (program: Program) => string | null;
  onDelete: (id: string) => void;
  onRun: (program: Program, args: string[]) => ProgramRun;
  onInsert: (text: string) => void;
};

function ProgramEditor({ program, angleMode, onDirtyChange, onSave, onDelete, onRun, onInsert }: ProgramEditorProps) {
  const [name, setName] = useState(program?.name ?? "");
  const [paramsText, setParamsText] = useState(program?.params.join(", ") ?? "");
  const [body, setBody] = useState(program?.body ?? NEW_PROGRAM_BODY);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [args, setArgs] = useState<string[]>([]);
  const [run, setRun] = useState<ProgramRun | null>(null);

  const params = parseParams(paramsText);
  const dirty = !program || name !== program.name || paramsText !== program.params.join(", ") || body !== program.body;
  const syntax = useMemo(() => parseProgram(body, angleMode), [body, angleMode]);

  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setSaveError(null);
      onDirtyChange(true);
    };
  }

  /** Saves the draft; returns the saved program, or null if it is invalid. */
  function save(): Program | null {
    if (!syntax.ok) {
      setSaveError(syntax.error);
      return null;
    }
    const next: Program = { id: program?.id ?? `p${Date.now().toString(36)}`, name: name.trim(), params, body };
    const error = onSave(next);
    setSaveError(error);
    return error ? null : next;
  }

  function runProgram() {
    const target = dirty ? save() : program;
    if (!target) return;
    setRun(onRun(target, params.map((_, i) => args[i] ?? "")));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <label className="flex items-center gap-2">
          Name
          <input
            value={name}
            onChange={(e) => edit(setName)(e.target.value)}
            aria-label="Program name"
            placeholder="myProgram"
            spellCheck={false}
            className={`${fieldClass} w-36`}
          />
        </label>
        <label className="flex items-center gap-2">
          Parameter names
          <input
            value={paramsText}
            onChange={(e) => edit(setParamsText)(e.target.value)}
            aria-label="Parameter names"
            aria-describedby="params-hint"
            placeholder="e.g. a, b"
            spellCheck={false}
            className={`${fieldClass} w-32`}
          />
        </label>
        <p id="params-hint" className="w-full text-xs text-zinc-500">
          Names the program uses for its inputs. Enter the values to run it with in the <strong>Run</strong> row below.
        </p>
      </div>

      <textarea
        value={body}
        onChange={(e) => edit(setBody)(e.target.value)}
        onKeyDown={(e) => {
          // Tab indents instead of leaving the editor (Esc then Tab still moves focus).
          if (e.key !== "Tab" || e.shiftKey) return;
          e.preventDefault();
          const el = e.currentTarget;
          const { selectionStart: start, selectionEnd: end } = el;
          const next = `${body.slice(0, start)}  ${body.slice(end)}`;
          edit(setBody)(next);
          requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
        }}
        aria-label="Program code"
        spellCheck={false}
        rows={Math.min(16, Math.max(6, body.split("\n").length + 1))}
        className={`${fieldClass} resize-y leading-relaxed`}
      />

      {(saveError ?? (!syntax.ok ? syntax.error : null)) && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {saveError ?? (!syntax.ok && syntax.error)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => save()} disabled={!dirty} className={buttonClass}>
          {program ? "Save changes" : "Save program"}
        </button>
        {program && (
          <>
            <button
              type="button"
              onClick={() => onInsert(`${program.name}(`)}
              title="Use the program in an expression, e.g. fib(10)"
              className={buttonClass}
            >
              Insert into expression
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete the program ${program.name}?`)) onDelete(program.id);
              }}
              className={`${buttonClass} ml-auto text-red-700 dark:text-red-400`}
            >
              Delete
            </button>
          </>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runProgram();
        }}
        className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-950"
      >
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Run {params.length > 0 ? "with" : <span className="font-mono">{name.trim() || "program"}()</span>}
        </span>
        {params.map((param, i) => (
          <label key={`${i}-${param}`} className="flex items-center gap-1 font-mono text-sm">
            {param} =
            <input
              value={args[i] ?? ""}
              onChange={(e) => setArgs((a) => Object.assign([...a], { [i]: e.target.value }))}
              aria-label={`Value for ${param}`}
              placeholder="value"
              spellCheck={false}
              className={`${fieldClass} w-20 bg-white`}
            />
          </label>
        ))}
        <button type="submit" className={`${buttonClass} ml-auto bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500 border-blue-600`}>
          {dirty ? "Save & run" : "Run"}
        </button>
      </form>

      {run && (
        <div aria-live="polite" aria-label="Program output" className="flex flex-col gap-1 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          {run.output.length > 0 && (
            <pre className="max-h-48 overflow-auto font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              {run.output.join("\n")}
            </pre>
          )}
          {run.ok ? (
            <p className="font-mono text-sm">
              {run.value === null ? (
                <span className="text-zinc-500">Done (no return value)</span>
              ) : (
                <>
                  <span className="text-zinc-500">Result: </span>
                  <strong>{run.value}</strong>
                  <span className="text-xs text-zinc-500"> (saved as ans)</span>
                </>
              )}
            </p>
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400">{run.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ProgramHelp() {
  return (
    <details className="text-sm text-zinc-600 dark:text-zinc-400">
      <summary className="cursor-pointer select-none">How to write programs</summary>
      <div className="mt-2 flex flex-col gap-2">
        <p>
          Each line is an expression (as in the Expression input) or one of these statements. Indenting is optional;
          every block ends with <code>end</code>. <code>#</code> starts a comment.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-zinc-50 p-2 font-mono text-xs leading-relaxed dark:bg-zinc-950">{`s = 0                      # assign, or any expression
for i = 1 to n step 2      # step is optional
for v in L1                # each item of a list
while s < 100
if s > 10                  # elseif …, else
end
print "s is", s            # output
return s                   # result; also stored as ans
break / continue`}</pre>
        <p>
          Programs can read your variables, functions and other programs, but their assignments stay inside the program.
          Saved programs work in expressions and graphs, e.g. <code>fib(10) + 1</code> or <code>y = sumTo(x)</code>.
          A run stops after 100,000 steps. In graphs, a program stops after 10,000 steps per point; in the trace and value table, after 2,000.
        </p>
      </div>
    </details>
  );
}
