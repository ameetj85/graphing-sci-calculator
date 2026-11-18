import { describe, expect, it } from "vitest";
import { EMPTY_EDITOR, editorReducer, type EditorAction, type EditorState } from "./editor";

/** Builds a state from a string with `|` marking the cursor, or `[` `]` marking a selection. */
function s(marked: string): EditorState {
  if (marked.includes("|")) {
    const start = marked.indexOf("|");
    return { value: marked.replace("|", ""), start, end: start };
  }
  const start = marked.indexOf("[");
  const end = marked.indexOf("]") - 1;
  return { value: marked.replace("[", "").replace("]", ""), start, end };
}

function apply(marked: string, ...actions: EditorAction[]) {
  return actions.reduce(editorReducer, s(marked));
}

describe("editorReducer", () => {
  it("inserts text at the cursor", () => {
    expect(apply("12|", { type: "insert", text: "+3" })).toEqual(s("12+3|"));
    expect(apply("1|3", { type: "insert", text: "2" })).toEqual(s("12|3"));
  });

  it("replaces the selection when inserting", () => {
    expect(apply("1[23]4", { type: "insert", text: "x" })).toEqual(s("1x|4"));
  });

  it("wraps functions around the selection or opens an empty call", () => {
    expect(apply("2*|", { type: "wrap", name: "sin" })).toEqual(s("2*sin(|)"));
    expect(apply("[pi/2]", { type: "wrap", name: "sin" })).toEqual(s("sin(pi/2)|"));
  });

  it("deletes one character on backspace", () => {
    expect(apply("123|", { type: "backspace" })).toEqual(s("12|"));
    expect(apply("|123", { type: "backspace" })).toEqual(s("|123"));
    expect(apply("1[23]", { type: "backspace" })).toEqual(s("1|"));
  });

  it("deletes a function opener and its matching closing parenthesis together", () => {
    expect(apply("2*sin(|)", { type: "backspace" })).toEqual(s("2*|"));
    expect(apply("log10(|5)", { type: "backspace" })).toEqual(s("|5"));
    expect(apply("sqrt(|(1+2)*3)+1", { type: "backspace" })).toEqual(s("|(1+2)*3+1"));
    expect(apply("sin(|", { type: "backspace" })).toEqual(s("|"));
    expect(apply("2*(|", { type: "backspace" })).toEqual(s("2*|"));
    expect(apply("(|)", { type: "backspace" })).toEqual(s("|"));
  });

  it("clears everything", () => {
    expect(apply("1+[2]", { type: "clear" })).toEqual(EMPTY_EDITOR);
  });

  it("clamps and orders selections from the input element", () => {
    expect(apply("abc|", { type: "select", start: 5, end: 1 })).toEqual(s("a[bc]"));
    const state = s("ab|");
    expect(editorReducer(state, { type: "select", start: 2, end: 2 })).toBe(state);
  });
});
