import { describe, expect, it } from "vitest";
import { HISTORY_KEY, MAX_HISTORY, addHistoryEntry, loadHistory, saveHistory, type HistoryEntry } from "./history";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

const entry = (expression: string, result = "1", at = 0): HistoryEntry => ({ expression, result, at });

describe("history", () => {
  it("adds newest first and skips an exact repeat of the latest entry", () => {
    let entries = addHistoryEntry([], entry("1+1", "2"));
    entries = addHistoryEntry(entries, entry("2*3", "6"));
    entries = addHistoryEntry(entries, entry("2*3", "6"));
    expect(entries.map((e) => e.expression)).toEqual(["2*3", "1+1"]);
  });

  it("caps the number of entries", () => {
    let entries: HistoryEntry[] = [];
    for (let i = 0; i < MAX_HISTORY + 5; i++) entries = addHistoryEntry(entries, entry(`${i}`));
    expect(entries).toHaveLength(MAX_HISTORY);
    expect(entries[0].expression).toBe(`${MAX_HISTORY + 4}`);
  });

  it("saves and loads through storage", () => {
    const storage = memoryStorage();
    saveHistory(storage, [entry("pi", "3.14159265359", 5)]);
    expect(loadHistory(storage)).toEqual([entry("pi", "3.14159265359", 5)]);
  });

  it("ignores corrupt data, invalid entries and unavailable storage", () => {
    expect(loadHistory(memoryStorage({ [HISTORY_KEY]: "{not json" }))).toEqual([]);
    expect(loadHistory(memoryStorage({ [HISTORY_KEY]: JSON.stringify([{ expression: 1 }, entry("x")]) }))).toEqual([
      entry("x"),
    ]);
    expect(loadHistory(undefined)).toEqual([]);
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadHistory(throwing)).toEqual([]);
    expect(() => saveHistory(throwing, [])).not.toThrow();
  });
});
