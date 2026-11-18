/** Calculation history persisted in localStorage, newest first. */
export type HistoryEntry = {
  expression: string;
  result: string;
  at: number;
};

export const HISTORY_KEY = "gsc.history.v1";
export const MAX_HISTORY = 50;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.expression === "string" && typeof entry.result === "string" && typeof entry.at === "number";
}

/** Reads history, returning [] if storage is unavailable or the data is corrupt. */
export function loadHistory(storage: StorageLike | undefined): HistoryEntry[] {
  try {
    const raw = storage?.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export function saveHistory(storage: StorageLike | undefined, entries: HistoryEntry[]): void {
  try {
    storage?.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or blocked (private mode): history stays in memory only.
  }
}

/** Adds an entry at the top, skipping an exact repeat of the latest one. */
export function addHistoryEntry(entries: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const latest = entries[0];
  if (latest && latest.expression === entry.expression && latest.result === entry.result) return entries;
  return [entry, ...entries].slice(0, MAX_HISTORY);
}
