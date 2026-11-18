"use client";

import { KEYPAD, type KeyAction, type KeyDef, type KeyKind } from "@/lib/calculator/keys";

const KIND_STYLES: Record<KeyKind, string> = {
  digit: "bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700",
  operator: "bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600",
  function: "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-700",
  control: "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60",
  equals: "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500",
};

type KeypadProps = {
  secondActive: boolean;
  /** Id of the key to highlight because its physical key was just pressed. */
  flashedKeyId: string | null;
  onKey: (action: KeyAction) => void;
};

export function Keypad({ secondActive, flashedKeyId, onKey }: KeypadProps) {
  return (
    <div className="grid grid-cols-5 gap-2" role="group" aria-label="Calculator keypad">
      {KEYPAD.map((key) => (
        <KeyButton
          key={key.id}
          def={key}
          secondActive={secondActive}
          flashed={flashedKeyId === key.id}
          onKey={onKey}
        />
      ))}
    </div>
  );
}

function KeyButton({
  def,
  secondActive,
  flashed,
  onKey,
}: {
  def: KeyDef;
  secondActive: boolean;
  flashed: boolean;
  onKey: (action: KeyAction) => void;
}) {
  const useSecond = secondActive && def.second !== undefined;
  const face = useSecond && def.second ? def.second : def;
  const isToggle = def.action.type === "toggleSecond";

  return (
    <button
      type="button"
      // Keep focus (and the cursor position) in the expression input.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onKey(face.action)}
      aria-label={face.ariaLabel ?? face.label}
      aria-pressed={isToggle ? secondActive : undefined}
      className={[
        "relative h-12 rounded-lg text-lg font-medium shadow-sm transition-colors select-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
        KIND_STYLES[def.kind],
        useSecond ? "ring-2 ring-amber-400 ring-inset" : "",
        isToggle && secondActive ? "bg-amber-400! text-amber-950! dark:bg-amber-500!" : "",
        flashed ? "brightness-90 scale-95 dark:brightness-125" : "",
      ].join(" ")}
    >
      {face.label}
      {def.second && !useSecond && (
        <span className="pointer-events-none absolute top-0.5 right-1 text-[0.6rem] leading-none text-amber-700 dark:text-amber-300">
          {def.second.label}
        </span>
      )}
    </button>
  );
}
