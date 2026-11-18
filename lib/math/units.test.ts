import { describe, expect, it } from "vitest";
import { MATH_CONSTANTS, PHYSICAL_CONSTANTS } from "./constants";
import { convertUnits, createScope, evaluateExpression } from "./engine";
import { UNIT_CATEGORIES } from "./units";

describe("unit converter", () => {
  it("converts between every pair of units in each category", () => {
    for (const category of UNIT_CATEGORIES) {
      const [first] = category.units;
      for (const unit of category.units) {
        expect(() => convertUnits(1, first.name, unit.name), `${category.label}: ${unit.name}`).not.toThrow();
      }
    }
  });

  it("gives correct values, including temperature offsets and added units", () => {
    expect(convertUnits(5, "inch", "cm")).toBeCloseTo(12.7, 12);
    expect(convertUnits(100, "degF", "degC")).toBeCloseTo(37.777777777778, 10);
    expect(convertUnits(0, "degC", "K")).toBeCloseTo(273.15, 10);
    expect(convertUnits(60, "mi/h", "km/h")).toBeCloseTo(96.56064, 10);
    expect(convertUnits(1, "kcal", "J")).toBeCloseTo(4184, 9);
    expect(convertUnits(10, "knot", "km/h")).toBeCloseTo(18.52, 10);
    expect(convertUnits(1, "nmi", "m")).toBe(1852);
  });

  it("rejects incompatible units", () => {
    expect(() => convertUnits(1, "m", "kg")).toThrow();
  });

  it("supports conversions typed in expressions", () => {
    const result = evaluateExpression("1 kcal to kJ", createScope());
    expect(result.ok && result.display).toBe("4.184 kJ");
    // The example shown in the Units panel.
    const combined = evaluateExpression("2 hour + 30 minute to minute", createScope());
    expect(combined.ok && combined.display).toBe("150 minute");
  });
});

describe("constants", () => {
  it("lists only constants that exist in expressions", () => {
    for (const constant of [...MATH_CONSTANTS, ...PHYSICAL_CONSTANTS]) {
      expect(evaluateExpression(constant.name, createScope()).ok, constant.name).toBe(true);
    }
  });
});
