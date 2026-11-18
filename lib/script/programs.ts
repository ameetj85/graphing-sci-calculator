/** Saved programs: validation, persistence and the examples new users start with. */
import { WORKSPACE_VARIABLES, writeJson } from "@/lib/calculator/workspace";
import { isBuiltInName } from "@/lib/math/engine";
import { IDENTIFIER, type Program } from "./interpreter";

export const PROGRAMS_KEY = "gsc.programs.v1";
export const MAX_PROGRAMS = 30;
export const MAX_PROGRAM_LENGTH = 10_000;

const RESERVED = new Set(["ans", "x", "y", "r", "t", "theta", ...WORKSPACE_VARIABLES]);
const KEYWORDS = new Set(["if", "elseif", "else", "end", "for", "while", "print", "return", "break", "continue", "to", "in", "step"]);

export const EXAMPLE_PROGRAMS: Omit<Program, "id">[] = [
  {
    name: "sumTo",
    params: ["n"],
    body: `# Adds 1 + 2 + … + n
s = 0
for i = 1 to n
  s = s + i
end
return s`,
  },
  {
    name: "fib",
    params: ["n"],
    body: `# The nth Fibonacci number
a = 0; b = 1;
for i = 1 to n
  c = a + b;
  a = b;
  b = c;
end
return a`,
  },
  {
    name: "quadratic",
    params: ["a", "b", "c"],
    body: `# Solves a x^2 + b x + c = 0
d = b^2 - 4 a c
if d > 0
  print "two real roots"
elseif d == 0
  print "one repeated root"
  return -b / (2a)
else
  print "complex roots"
end
return [(-b + sqrt(d)) / (2a), (-b - sqrt(d)) / (2a)]`,
  },
  {
    name: "newton",
    params: ["x0"],
    body: `# Newton's method for a root of f(x) = x^3 - 2x - 5
f(x) = x^3 - 2x - 5
df(x) = 3x^2 - 2
x = x0
for i = 1 to 50
  dx = f(x) / df(x)
  x = x - dx
  print "step", i, ":", x
  if abs(dx) < 1e-12
    break
  end
end
return x`,
  },
  {
    name: "collatz",
    params: ["n"],
    body: `# Steps for n to reach 1 (halve if even, else 3n + 1)
steps = 0
while n != 1
  if mod(n, 2) == 0
    n = n / 2
  else
    n = 3n + 1
  end
  steps = steps + 1
end
return steps`,
  },
];

export function examplePrograms(): Program[] {
  return EXAMPLE_PROGRAMS.map((program, i) => ({ ...program, id: `p${i + 1}` }));
}

/** Parses "a, b" into parameter names. */
export function parseParams(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Returns an error message for an invalid program, or null. `others` are the other saved programs. */
export function validateProgram(program: Omit<Program, "id">, others: Program[]): string | null {
  const { name, params, body } = program;
  if (!name) return "Give the program a name";
  if (!IDENTIFIER.test(name)) return "Names use letters, digits and _, and start with a letter";
  if (RESERVED.has(name) || KEYWORDS.has(name)) return `${name} is reserved`;
  if (isBuiltInName(name)) return `${name} is a built-in function or constant`;
  if (others.some((other) => other.name === name)) return `There's already a program called ${name}`;
  for (const param of params) {
    if (!IDENTIFIER.test(param)) return `Parameter "${param}" isn't a valid name`;
    if (KEYWORDS.has(param)) return `Parameter ${param} is a reserved word`;
  }
  if (new Set(params).size !== params.length) return "Parameter names must be different";
  if (body.length > MAX_PROGRAM_LENGTH) return `Programs are limited to ${MAX_PROGRAM_LENGTH.toLocaleString("en-US")} characters`;
  return null;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** Loads saved programs; with nothing saved yet, returns the examples. */
export function loadPrograms(storage: StorageLike | undefined): Program[] {
  let raw: string | null | undefined;
  try {
    raw = storage?.getItem(PROGRAMS_KEY);
  } catch {
    raw = null;
  }
  if (raw == null) return examplePrograms();
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const programs: Program[] = [];
    for (const item of value.slice(0, MAX_PROGRAMS)) {
      if (
        typeof item?.id === "string" &&
        typeof item.name === "string" &&
        typeof item.body === "string" &&
        Array.isArray(item.params) &&
        item.params.every((p: unknown) => typeof p === "string")
      ) {
        const program: Program = { id: item.id, name: item.name, params: item.params, body: item.body };
        if (!validateProgram(program, programs) && !programs.some((p) => p.id === program.id)) programs.push(program);
      }
    }
    return programs;
  } catch {
    return [];
  }
}

export function savePrograms(storage: StorageLike | undefined, programs: Program[]): void {
  writeJson(storage, PROGRAMS_KEY, programs);
}
