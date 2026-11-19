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

  it("round-trips colours and line styles, omitting defaults", () => {
    const query = encodeShareState({
      equations: ["sin(x)", " ", "x^2", "x^3"],
      angleMode: "rad",
      looks: [
        { color: EQUATION_COLORS[0], style: { dash: "solid", width: 2 } }, // default for position 0
        undefined,
        { color: EQUATION_COLORS[3], style: { dash: "dashed", width: 3 } },
        { color: EQUATION_COLORS[2], style: { dash: "dotted", width: 1 } }, // default colour for position 2, other style
      ],
    });
    expect(query).toBe("eq=sin%28x%29&eq=x%5E2&eq=x%5E3&st=1.3d3_2.2o1");
    expect(decodeShareState(query).looks).toEqual([
      undefined,
      { color: EQUATION_COLORS[3], style: { dash: "dashed", width: 3 } },
      { color: EQUATION_COLORS[2], style: { dash: "dotted", width: 1 } },
    ]);
  });

  it("round-trips the window, grid, axis numbers and labels", () => {
    const query = encodeShareState({
      equations: ["x"],
      angleMode: "rad",
      settings: { window: { xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -2, yMax: 2 }, grid: false, numbers: false, xLabel: "time (s)", yLabel: " " },
    });
    expect(query).toBe("eq=x&win=-6.283185307%2C6.283185307%2C-2%2C2&grid=0&nums=0&xl=time+%28s%29");
    expect(decodeShareState(query).settings).toEqual({
      window: { xMin: -6.283185307, xMax: 6.283185307, yMin: -2, yMax: 2 },
      grid: false,
      numbers: false,
      xLabel: "time (s)",
    });
  });

  it("drops invalid styles and windows", () => {
    expect(decodeShareState("eq=x&st=0.9s2_5.1d2_0.1x2&win=5,1,0,1")).toEqual({ equations: ["x"] });
    expect(decodeShareState(`eq=x&win=1,2,3&xl=${"a".repeat(41)}`)).toEqual({ equations: ["x"] });
  });

  it("drops invalid values and caps the equation count", () => {
    const many = Array.from({ length: 10 }, (_, i) => `eq=x%2B${i}`).join("&");
    expect(decodeShareState(many).equations).toHaveLength(MAX_EQUATIONS);
    expect(decodeShareState(`eq=${"x".repeat(500)}&angle=turns`)).toEqual({});
    expect(decodeShareState("")).toEqual({});
  });
});
