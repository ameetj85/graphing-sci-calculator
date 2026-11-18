import { describe, expect, it } from "vitest";
import { EQUATION_COLORS, MAX_EQUATIONS, createEquation, decodeShareState, encodeShareState } from "./equations";

describe("equation colors", () => {
  it("gives each new equation the first unused color", () => {
    const first = createEquation("a", "x", []);
    const second = createEquation("b", "x^2", [first]);
    expect(first.color).toBe(EQUATION_COLORS[0]);
    expect(second.color).toBe(EQUATION_COLORS[1]);
    const third = createEquation("c", "x^3", [second]);
    expect(third.color).toBe(EQUATION_COLORS[0]);
  });
});

describe("share URL state", () => {
  it("round-trips equations and degree mode", () => {
    const query = encodeShareState({ equations: ["sin(x)", "x^2 + 1", " "], angleMode: "deg" });
    expect(query).toBe("eq=sin%28x%29&eq=x%5E2+%2B+1&angle=deg");
    expect(decodeShareState(`?${query}`)).toEqual({ equations: ["sin(x)", "x^2 + 1"], angleMode: "deg" });
  });

  it("round-trips gradian mode", () => {
    expect(decodeShareState(encodeShareState({ equations: ["x"], angleMode: "grad" }))).toEqual({
      equations: ["x"],
      angleMode: "grad",
    });
  });

  it("round-trips the 3D view and omits 2D", () => {
    expect(encodeShareState({ equations: ["z = x y"], angleMode: "rad", view: "3d" })).toBe("eq=z+%3D+x+y&view=3d");
    expect(decodeShareState("eq=x&view=3d")).toEqual({ equations: ["x"], view: "3d" });
    expect(encodeShareState({ equations: ["x"], angleMode: "rad", view: "2d" })).toBe("eq=x");
    expect(decodeShareState("eq=x&view=4d")).toEqual({ equations: ["x"] });
  });

  it("omits the default radian mode", () => {
    expect(encodeShareState({ equations: ["x"], angleMode: "rad" })).toBe("eq=x");
  });

  it("drops invalid values and caps the equation count", () => {
    const many = Array.from({ length: 10 }, (_, i) => `eq=x%2B${i}`).join("&");
    expect(decodeShareState(many).equations).toHaveLength(MAX_EQUATIONS);
    expect(decodeShareState(`eq=${"x".repeat(500)}&angle=turns`)).toEqual({});
    expect(decodeShareState("")).toEqual({});
  });
});
