import { describe, expect, it } from "vitest";
import { KEYBOARD_TO_KEY, KEYPAD } from "./keys";

describe("keypad definitions", () => {
  it("has unique key ids in a full 5-column grid", () => {
    const ids = KEYPAD.map((key) => key.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(KEYPAD.length % 5).toBe(0);
  });

  it("maps every keyboard shortcut to an existing key", () => {
    const ids = new Set(KEYPAD.map((key) => key.id));
    for (const keyId of Object.values(KEYBOARD_TO_KEY)) expect(ids).toContain(keyId);
  });
});
