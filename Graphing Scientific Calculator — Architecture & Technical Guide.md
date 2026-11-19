# Graphing Scientific Calculator — Architecture & Technical Guide

Nov 19, 2026 · @Ameet

## Overview

The project is a browser-only graphing scientific calculator: a Next.js shell around a sandboxed Math.js engine, a Mafs-based 2D graph, a hand-written canvas 3D renderer and a Web Worker for heavy plotting. Every calculation runs on the client; the server only delivers the page.

**What it does**

- Scientific evaluation: nested expressions, powers, roots, factorials, trig/inverse/hyperbolic functions, logs, complex numbers, units and constants, with exact-form display (fractions, multiples of √n and π).
- Numeric calculus and solving: `nDeriv` (derivative at a point), `fnInt` (definite integral) and `solve` (roots near a guess or in a bracket), usable in expressions and graphs.
- Graphing: `y = f(x)` curves, inequalities and arbitrary shaded regions (including chains such as `1 < x <= 2`), implicit curves `F(x, y) = 0`, parametric and polar curves, slope fields `dy/dx = f(x, y)`, vector fields `field(P, Q)`, and 3D surfaces `z = f(x, y)`.
- Inspection: trace point with slope, roots, local maxima and minima, intersections, an adaptive grid, and a value table synced with the trace.
- Presentation: an exact graph window, grid and axis-number toggles, axis titles, per-equation colour, line type and thickness, and sliders for free variables.
- Data: lists `L1`/`L2`, matrices `A`–`F`, summary statistics, probability distributions and regression with the fitted curve plotted.
- State: radian/degree/gradian modes, unit conversion, a variables and constants panel, history, and a share URL that also carries styles and graph settings.
- Programmability: a small line-based scripting language whose saved programs become callable functions in expressions and graphs.

**Technology stack**

| Layer | Choice | Version |
| --- | --- | --- |
| Framework | Next.js App Router (Turbopack, `cacheComponents`) | 16.4.6 |
| UI | React | 19.3.0 |
| Math | Math.js (sandboxed instances) | ^15.2 |
| 2D graph | Mafs | ^0.21 |
| Typesetting | KaTeX | ^0.19 |
| Styling | Tailwind CSS v4, configured in CSS | 4.3.3 |
| Tests | Vitest | ^5.1 |
| Language | TypeScript (strict) | ^5 |

**Guiding principles**

1. All math runs in the browser; no API routes or server actions evaluate anything.
2. User input is never passed to `eval()`. Expressions go through a Math.js instance with `import`, `evaluate`, `parse` and similar functions disabled.
3. Heavy plotting runs in a Web Worker so the UI thread never blocks.
4. Pure logic lives in `lib/` with Vitest tests beside it; React components in `components/` stay thin.
5. Shareable state lives in the URL; personal state (history, angle mode, workspace, programs) lives in `localStorage`.

## System architecture

One client component, `Calculator`, owns all application state and passes slices to three areas of UI: input, graph and tools. Every expression from any of them is parsed by `lib/math/engine.ts`. Expensive plot work is described as plain-data jobs and sent to a Web Worker that has its own engine copy.

&#91;embedded content: system architecture · main thread and plotting worker\]

**Request flow for a typed expression.** Keypress → `editor.ts` reducer updates text and selection → Enter calls `evaluateExpression(text, scope, angleMode)` → the result is pushed to history and `ans` → the scope is copied into `graphScope` React state → every equation row recompiles against the new scope.

**Request flow for a graph row.** Equation text → `compilePlot` classifies it into a `PlotSpec` → light kinds (inequality `y > f(x)`, parametric, polar) are drawn on the main thread; heavy kinds (function curves, key points, implicit curves, regions, surfaces) become `PlotJob`s → `usePlotJob` posts them through `plotClient` → the worker returns SVG path strings or `Float64Array` grids, transferred without copying.

**Rendering model.** `app/page.tsx` stays a server component. `Calculator` calls `use(browser())` so it renders only on the client (it reads `localStorage` and the URL during first render), inside a `<Suspense>` with a skeleton fallback. This avoids hydration mismatches without moving reads into effects.

## Repository layout

About 10,300 lines of TypeScript and CSS, split into a thin `app/` shell, client components in `components/`, and framework-free logic in `lib/` (each module with a `*.test.ts` beside it).

| Path | Role |
| --- | --- |
| `app/layout.tsx` | Root layout: Geist fonts, KaTeX, Mafs and global CSS |
| `app/page.tsx` | Server component; renders `<Calculator>` inside `<Suspense>` with a skeleton fallback |
| `app/globals.css` | Tailwind v4 `@theme inline` tokens and `.MafsView` colour variables |
| `components/calculator/Calculator.tsx` | Root client component (about 870 lines): owns all state, wires every panel |
| `components/calculator/` | `ExpressionInput`, `Keypad`, `HistoryPanel` |
| `components/graph/Graph.tsx` | Mafs host: measures its size, renders curves, shapes, fields and overlays, owns the view and the Window panel |
| `components/graph/` | `FunctionCurve`, `ParametricCurve`, `ImplicitCurve`, `InequalityRegion`, `ImplicitRegion`, `VectorField`, `KeyPoints`, `TracePoint`, `AdaptiveGrid`, `WindowPanel`, `EquationList` (with the style picker), `SliderList`, `ValueTable`, `SurfaceView`, `usePlotJob` |
| `components/tools/` | `ToolsPanel` tabs: `StatsPanel`, `MatrixPanel`, `UnitsPanel`, `VariablesPanel`, `ProgramsPanel` |
| `components/Tex.tsx` | KaTeX renderer |
| `lib/math/` | `engine.ts` (the only parser/evaluator), `calculus.ts` (numeric derivative, integral, roots, extrema), `calculusFunctions.ts` (`nDeriv`, `fnInt`, `solve`), `exact.ts`, `units.ts`, `constants.ts` |
| `lib/calculator/` | `editor.ts` (input reducer), `keys.ts` (keypad layout), `history.ts`, `workspace.ts` (lists and matrices) |
| `lib/graph/plotSpec.ts` | Classifies each equation row into a plot kind |
| `lib/graph/equations.ts` | Equation model, line styles, graph settings, share-URL encoding |
| `lib/graph/` | `sample.ts`, `implicit.ts`, `region.ts`, `field.ts`, `surface.ts`, `keyPoints.ts`, `sliders.ts`, `table.ts`, `gridStep.ts` |
| `lib/graph/plotJobs.ts`, `plotClient.ts`, `plot.worker.ts`, `scopeSnapshot.ts` | Worker job definitions, client, worker entry, scope serialisation |
| `lib/stats/` | `stats.ts` (summary, regression), `distributions.ts` (pdf/cdf functions) |
| `lib/script/` | `interpreter.ts` (language), `programs.ts` (validation, storage, examples) |
| `next.config.ts` | `cacheComponents`, `partialPrefetching`, Tailwind Turbopack loader |
| `vitest.config.mts` | Vitest config with the `@/` alias |

## Math engine

`lib/math/engine.ts` is the only place expressions are parsed or evaluated. It wraps Math.js (`number` mode, 64-digit precision setting) in sandboxed instances, one per angle mode, built lazily and cached by `getEngine(mode)`.

**Sandboxing.** Each instance is created with `create(all, …)`. The module captures `parse` and `format` first, then overrides `import`, `createUnit`, `evaluate`, `parse`, `simplify`, `derivative`, `resolve` and `reviver` with functions that throw. This follows the Math.js security guide: user text cannot redefine the instance or re-enter the parser.

**Angle modes.** `AngleMode` is `"rad" | "deg" | "grad"`; `HALF_TURN` maps each to π, 180 or 200. `trigFunctions(math, mode)` replaces sin, cos, tan, sec, csc, cot and their inverses (plus `atan2`). In degree and gradian modes, exact multiples of a quarter turn return exactly 0 (sin 180° = 0), and tan at an odd quarter turn throws. Results under 1e-15 for non-tiny inputs are snapped to 0. Angle units (`30 deg`) and complex numbers pass straight to Math.js; any other unit is rejected with a message that names the function (`cos needs an angle, such as 30 deg, but got a value in m`), with a hint when `pi/6 rad` was read as `pi / (6 rad)`. A node must be parsed by the same instance that evaluates it.

**Extensions.** Units `cal`, `knot` and `nmi` are added with `createUnit` before that function is disabled. The distribution functions from `lib/stats/distributions.ts` (`normalpdf`, `normalcdf`, `invNorm`, `binompdf`, `binomcdf`, `poissonpdf`, `poissoncdf`) and the calculus functions from `lib/math/calculusFunctions.ts` (`nDeriv`, `fnInt`, `solve`) are imported into every instance.

**Calculus functions.** `nDeriv(expr, var, a)`, `fnInt(expr, var, a, b)` and `solve(expr, var, guess)` / `solve(expr, var, a, b)` are Math.js `rawArgs` functions: they receive their arguments as unevaluated nodes, so the variable named in the second argument is bound only inside the first. A `BoundScope` overlay reads through to the caller's scope and keeps the bound variable (and any assignments) local. Compiled nodes are cached in a `WeakMap`, because graphs call these functions hundreds of times per redraw. `solve` also accepts `lhs == rhs`, solved as lhs − rhs. The numerics live in `lib/math/calculus.ts`: `derivativeAt` (five-point central difference), `integrate` (adaptive Gauss–Kronrod 7/15, up to 400 intervals, nodes never on the ends), `rootNear` (Newton's method, then an outward sign-change search) and `rootInBracket` (bisection, rejecting poles and jumps). `compileInVariables` treats variables bound by these functions as known, so `y = fnInt(t, t, 0, x)` compiles without an "Undefined symbol: t" error.

**Public API**

| Function | Purpose |
| --- | --- |
| `createScope()` | New `Map` with `ans = 0`; owned by the caller |
| `evaluateExpression(expr, scope, mode)` | Evaluate, store assignments, update `ans`; returns `{ ok, value, display, tex }` or `{ ok: false, error }`. Multi-statement input returns the last visible result |
| `compileFunction(expr, scope, mode)` | `y = f(x)` → `(x) => number` returning NaN where the value isn't real |
| `compileIn` / `compileInVariables` | Same, for any variable list (`t`, `theta`, `[x, y]`). Rejects unknown symbols up front, except variables bound by `nDeriv`, `fnInt` and `solve` |
| `compileStatement(source, mode)` | Compiled statement for the script interpreter |
| `functionDefinition(fn)` | The `{ source, angleMode }` recorded on functions made by `f(x) = …` |
| `rebindFunctions(scope, mode)` | Re-evaluates recorded definitions when the angle mode changes |
| `convertUnits(value, from, to)` | Unit conversion using the same engine as typed expressions |
| `isBuiltInName(name)` | True for Math.js built-ins (used by sliders and program validation) |
| `expressionToTex`, `formatValue` | Display helpers (12 significant digits) |

**Function definitions.** When an expression contains `f(x) = …`, `recordDefinitions` attaches the source text and angle mode to the resulting function under a private `Symbol`. That record lets the worker rebuild user functions from source and lets `rebindFunctions` move them to a new angle mode.

**Exact forms.** `lib/math/exact.ts` (`toExactForm`) recognises fractions (continued-fraction approximation), rational multiples of √n for square-free n, and rational multiples of π, within a relative tolerance. Values within rounding noise of a whole number (`tan(pi/4)` = 0.9999999999999999) get no exact form, so they display as the whole number. It is for display only; stored values and history stay decimal.

**Constants and units.** `lib/math/constants.ts` lists mathematical and physical constants for the Variables panel. `lib/math/units.ts` defines the unit categories for the Units panel. Name collisions to remember: `min` is the function (use `minute`), and `mph` is undefined (use `mi/h`).

## Calculator UI and state

`components/calculator/Calculator.tsx` is the client root and the single owner of state. Child components receive values and callbacks; none of them hold their own copy of shared data.

**State held in `Calculator`**

| State | Type | Notes |
| --- | --- | --- |
| `scopeRef` | `Scope` (ref) | The live, mutable Math.js scope |
| `graphScope` | `Scope` (state) | A copy taken after each change, so memoised compilation re-runs |
| `expression` | `EditorState` via `useReducer(editorReducer)` | Text plus selection of the main input |
| `equations` | `Equation[]` | id, `text`, `visible`, `color` and `style` (`{ dash, width }`); max 6 rows |
| `selections` | `Record<id, Selection>` | Cursor per equation row, kept apart from `text` so cursor moves don't recompile |
| `activeField` | `"expression"` or an equation id | Where the keypad types |
| `angleMode`, `displayMode`, `view` | `rad/deg/grad`, `exact/decimal`, `2d/3d` | Global modes |
| `graphSettings` | `GraphSettings` | Window (or null), grid, axis numbers, x/y axis titles; goes into the share URL |
| `sliderRanges` | `Record<name, SliderRange>` | Slider bounds the user edited; others use `defaultRange` |
| `history`, `data`, `matrices`, `programs` | persisted | Saved by effects on change |
| `traceId`, `traceX` | | Shared by `Graph` and `ValueTable` |

**Editor reducer.** `lib/calculator/editor.ts` is a pure reducer over `{ value, start, end }` with actions `set`, `select`, `insert`, `wrap` (e.g. `sin(` around the selection), `backspace` and `clear`. Keypad presses and page-level shortcuts dispatch to it; a layout effect copies the selection back into the `<input>`. Equation rows reuse the same reducer through `editorFor(eq)` and `dispatchEquation`.

**Keypad.** `lib/calculator/keys.ts` holds the 5-column `KEYPAD` data. Each `KeyDef` has an action (`insert`, `wrap`, `backspace`, `clear`, `evaluate`, `toggleSecond`) and an optional `second` layer. `KEYBOARD_TO_KEY` maps physical keys to keypad ids so the matching button flashes for 120 ms. A window `keydown` listener (via `useEffectEvent`) routes typing into the active field when focus is elsewhere, but ignores keys pressed on the graph so Mafs can pan and trace.

**Evaluation path.** `evaluate()` runs `evaluateExpression` inside `captureOutput` (to collect `print` output from programs), stores the result, copies the scope into `graphScope`, and prepends a history entry (max 50).

**Derived data.** `compiled` memoises `compilePlot` for each row against `graphScope` and `angleMode`. A second memo splits results into `curves` (y = f(x): traceable and tabulated), `shapes` (inequalities, implicit curves, regions, fields, parametric/polar curves, data points) and `surfaces` (3D); curves and shapes carry the row's colour and style. `sliderInfo` (`sliderVariables`) lists the free variables the equations use. `snapshot` is a memoised `snapshotScope(graphScope)` for the worker.

**Sliders and styles.** `setVariable(name, value)` writes the scope and refreshes `graphScope`, so a slider redraws every equation that uses the variable; **+ name** calls it with 1. `setEquationLook(id, change)` merges a partial `LookChange` (colour, dash or width) into the row's current look, so quick successive picks never overwrite each other.

**Mode changes.** `changeAngleMode` sets the mode, calls `rebindFunctions` so user functions follow it, and re-registers programs (`syncPrograms`).

**Layout.** The top-level grid is calculator | graph over history | tools, with `grid-cols-1` on mobile. The graph card stretches to the calculator card's height; `Graph` measures itself with a `ResizeObserver` and passes numeric `width` and `height` to Mafs.

## Graphing pipeline

A single equation input handles every plot type: `compilePlot(text, scope, angleMode)` in `lib/graph/plotSpec.ts` infers the kind from the syntax and returns a `PlotSpec`. Only `function` specs become traceable `GraphCurve`s; the rest are `GraphShape`s or 3D `GraphSurface`s.

**Classification** (checked roughly in this order)

| Syntax | Spec kind | Computed by | Drawn by |
| --- | --- | --- | --- |
| `r = 2 sin(3 theta)` (θ, `theta` or `t`) | `polar` | main thread, `sampleParametric` | `ParametricCurve` |
| `(cos(t), sin(t))` | `parametric` | main thread | `ParametricCurve` |
| `dy/dx = x - y` | `field`, `slope: true` | main thread, `fieldPaths` | `VectorField` |
| `field(-y, x)` | `field`, `slope: false` | main thread, `fieldPaths` | `VectorField` |
| `z = sin(x) cos(y)` | `surface` | worker `surface` job | `SurfaceView` (3D view) |
| `x^2 + y^2 = 4` (single top-level `=`, `y` on the right or no `y =` form) | `implicit`, source `(lhs) - (rhs)` | worker `implicit` job | `ImplicitCurve` |
| `y > x^2`, `x^2 <= y` | `inequality` | main thread, curve + fill path | `InequalityRegion` |
| `x > 2`, `x^2 + y^2 < 4`, `1 < x <= 2` | `region`, one condition per comparison | worker `region` job | `ImplicitRegion` |
| `x^2`, `y = x^2` | `function` | worker `curve` job | `FunctionCurve` |

Polar and parametric rows may end with a range such as `{0 <= t <= 4pi}`; otherwise the parameter covers one full turn in the current angle mode. Because the range lives in the text, the share URL needs no extra fields. `splitComparisons` splits chains at top-level comparisons; `splitEquation` finds exactly one top-level `=` outside brackets.

**Curve sampling** (`lib/graph/sample.ts`). `sampleFunction` and `sampleParametric` share one sampler over a parameter. It splits the polyline where the function is undefined and at jumps larger than 5% of the visible range, then refines ends next to undefined regions (40 bisection steps) so `sqrt(x)` reaches x = 0. This is why the app uses its own `FunctionCurve` instead of Mafs' `Plot.OfX`, which bridges asymptotes. Paths are drawn inside Mafs with `var(--mafs-view-transform)`.

**Implicit curves** (`lib/graph/implicit.ts`). Marching squares on a grid; each sign-changing cell yields a segment between edge crossings. Sign changes caused by poles (e.g. `1/x = y` at x = 0) are rejected. Curves that touch zero without crossing (`(x^2 + y^2 - 4)^2 = 0`) are found with `isTouchCandidate` + `minimizeAbs` along grid lines. Zero-length segments are dropped, and `joinSegments` stitches segments into polylines so dashed edges run continuously.

**Regions** (`lib/graph/region.ts`). Every condition `F(x, y) op 0` is sampled on a grid. Cells fully inside merge into horizontal runs; boundary cells are clipped by each condition in turn (Sutherland–Hodgman with linear interpolation). `regionBoundaries` returns each condition's edge, clipped by bisection to where the other conditions hold; strict edges (`<`, `>`) are dashed. Cell corners are computed from grid indices (`xMin + (i + 1) * dx`) so neighbouring endpoints match exactly.

**Fields** (`lib/graph/field.ts`). `fieldPaths` places one point per grid cell, on a `niceStep` grid offset half a step from the grid lines so arrows don't sit on the axes, at most 60 per axis. Directions are computed in pixels (from the view transform's x and y scales), so arrows keep their shape on unequal axes, and converted back to graph units. Arrows have a fixed length (75% of the spacing); their length in graph units picks one of four opacity shades. A slope field draws plain segments, and an infinite slope draws a vertical one. Fields cost a few hundred evaluations per view, so `VectorField` computes them on the main thread.

**Key points and trace** (`lib/graph/keyPoints.ts`, `lib/math/calculus.ts`). `findKeyPoints` returns roots of each curve, local maxima and minima (`findExtrema`: sampled, refined by golden-section search, rejected next to jumps and asymptotes, and skipped where the same curve has a root), and intersections of each pair, over the visible pane. `TracePoint` follows the selected curve, shows the slope from `derivativeAt`, and uses `nearestDefinedX` to skip gaps. `traceX` lives in `Calculator`, so `ValueTable` (11 rows, `lib/graph/table.ts`) highlights the matching row.

**Sliders** (`lib/graph/sliders.ts`). `sliderVariables` scans the equation texts for identifiers (skipping function calls, number exponents such as `2e3`, and the `dy/dx =` prefix). Numeric user variables get sliders; undefined names are offered as **+ name** buttons; graph coordinates, built-ins and workspace names are excluded. `SliderList` renders the rows; `snapToStep` keeps values free of floating-point noise, and `stepFor` picks a power-of-ten step for edited bounds.

**Grid, window and styles.** `AdaptiveGrid` picks a spacing from the view transform (`niceStep`, at least 48 px between lines), can hide grid lines and axis numbers, and reports the current scale to `Graph`. A window applied from `WindowPanel` (or Trig view) is stored in `GraphSettings.window` and shown with Mafs `padding: 0`, so its bounds are exact; the default view keeps Mafs' 0.5 padding. Because Mafs doesn't export its coordinate context, the panel reads the visible window from the SVG `viewBox` and that scale. Axis titles are HTML overlays in the graph's corners. Every curve component takes a `LineStyle`: `LINE_WIDTH_PX` gives the stroke width and `dashArray` the dash pattern, scaled to the width; strict inequality edges stay dashed. Mafs colours are themed through `.MafsView` CSS variables.

**3D surfaces** (`components/graph/SurfaceView.tsx`). A hand-written canvas renderer, no 3D library. The worker samples each surface on an n × n grid (`sampleSurface` → `Float64Array`). The view normalises x and y to [-1, 1] and z to [-0.75, 0.75], applies yaw/pitch rotation and perspective, sorts quads back to front (painter's algorithm) and shades them with Lambert lighting. Drawn quads are kept so `hitTest` can read out (x, y, z) on hover; click pins it and Escape clears it.

## Web Worker plot jobs

Heavy plotting is described as plain data (`PlotJob` in `lib/graph/plotJobs.ts`) so the same `computeJob` function runs either in the worker or on the main thread. Five job kinds exist: `curve`, `keyPoints`, `implicit`, `region` and `surface`. Each carries its bounds or grid size, the angle mode, and a `ScopeSnapshot`.

&#91;embedded content: plot job lifecycle · latest job wins\]

**Results.** `curve` returns an SVG path string; `keyPoints` a list of points; `implicit` a `Float64Array` of segment endpoints; `region` a fill path plus one `{ path, strict }` boundary per condition; `surface` one `Float64Array` z-grid per surface. Typed-array buffers are listed by `transferables()` and moved, not copied, back to the main thread.

**Scope snapshots** (`lib/graph/scopeSnapshot.ts`). Functions cannot be posted to a worker, so `snapshotScope` splits the scope into:

- plain values (numbers, booleans, strings, nested arrays);
- matrices, as nested arrays (rebuilt with `toMatrix`);
- user functions, as their recorded `f(x) = …` source and angle mode;
- programs, as their `Program` record (re-registered with `registerPrograms`);
- `missing`: names whose values can't be copied (units, complex numbers).

`restoreScope` rebuilds a working scope in the worker. If a job's source text, or any function or program body, mentions a `missing` name (`needsMissing`), the job runs on the main thread instead.

**Client** (`lib/graph/plotClient.ts`). The worker is created lazily with `new Worker(new URL("./plot.worker.ts", import.meta.url), { type: "module" })`. Fallbacks to the main thread (after a `setTimeout(0)` so the browser paints first):

1. `Worker` is unavailable (as in Vitest) or construction throws.
2. The worker fires `onerror`: it is terminated, and its pending jobs finish on the main thread.
3. The job needs a value that couldn't be copied.

**Hook** (`components/graph/usePlotJob.ts`). `usePlotJob(job, scope)` starts a job in an effect and cancels it on cleanup, so a newer job always supersedes the previous one. It keeps the previous result while `busy` so nothing flickers.

**First paint.** Until the worker has answered once (`isWorkerWarm()`), `FunctionCurve` computes its first path on the main thread so curves appear immediately on load. Trace and the value table always stay on the main thread.

**Step limits.** The worker calls `setBackgroundStepLimit(MAX_STEPS_WORKER)` (10,000 steps per program call); the main thread keeps 2,000 for graph and table calls.

## Tools panel

The bottom-right card is `components/tools/ToolsPanel`, a generic accessible tab strip (`role="tablist"`) that receives its tabs and content from `Calculator`. It has six tabs; their data lives in `Calculator` state, not in the panels.

| Tab | Component | Backing logic | What it does |
| --- | --- | --- | --- |
| Table | `ValueTable` | `lib/graph/table.ts` | 11 rows of (x, y₁, y₂, …) for visible function curves, synced with `traceX` |
| Statistics | `StatsPanel` | `lib/stats/stats.ts` | Edits lists `L1`/`L2`; one-variable summary (n, sum, mean, Sx, σx, five-number summary with TI-84 quartiles); regression (linear, quadratic, exponential, power, logarithmic) with the fitted curve plotted; optional data-point overlay |
| Matrices | `MatrixPanel` | `lib/calculator/workspace.ts` | Edits matrices `A`–`F`, up to 6 × 6 |
| Units | `UnitsPanel` | `lib/math/units.ts`, `engine.convertUnits` | Category-based converter using the same engine as typed conversions |
| Variables | `VariablesPanel` | `lib/math/constants.ts` | Lists user variables and functions from `graphScope` (excluding `WORKSPACE_VARIABLES`), with delete, plus constants to insert |
| Programs | `ProgramsPanel` | `lib/script/programs.ts` | Edit, validate, save, delete and run programs |

**Workspace variables.** Lists and matrices are exposed to expressions as scope variables (`L1`, `L2`, `A`–`F`) through `updateWorkspace`, which replaces them in the scope and refreshes `graphScope`. So `mean(L1)`, `det(A)` or `y = A[1,1] x` work anywhere.

**Distributions.** `normalpdf`, `normalcdf`, `invNorm`, `binompdf`, `binomcdf`, `poissonpdf` and `poissoncdf` are plain functions in `lib/stats/distributions.ts`, imported into every engine instance so they work in expressions and graphs.

## Scripting language

`lib/script/interpreter.ts` implements a small line-based language. Control lines are parsed by the interpreter; every other line is a Math.js statement compiled once by `engine.compileStatement`, so scripts get the same sandbox and angle mode as everything else.

**Syntax**

```
# comment
s = 0                              # any Math.js statement
for i = 1 to n step 2 … end        # counted loop, step optional
for v in L1 … end                  # loop over a list
while cond … end
if cond … elseif cond … else … end # "else if" and a trailing "then" also accepted
print "label", value
return value
break / continue
```

**Execution model.** `parseProgram` turns the body into a tree of `Statement`s (`expr`, `print`, `return`, `break`, `continue`, `if`, `for`, `forIn`, `while`). `runProgram(program, args, globals, angleMode)` runs it in a copy of the scope: programs read calculator variables and functions, but their assignments stay local. Control flow unwinds through internal signals that never escape `runProgram`.

**Programs as functions.** `registerPrograms` puts each saved program into the scope as a function marked with `isProgramFunction`, so `fib(10)` works in an expression, a graph (`y = collatz(x)`) or a table. Re-registration happens whenever the programs or the angle mode change (`syncPrograms`).

**Limits**

| Limit | Value | Applies to |
| --- | --- | --- |
| `MAX_STEPS` | 100,000 | Runs with captured output: Run button, Expression input |
| `MAX_STEPS_BACKGROUND` | 2,000 per call | Graphs and tables on the main thread |
| `MAX_STEPS_WORKER` | 10,000 per call | Calls inside the plotting worker |
| `MAX_DEPTH` | 64 | Nested program calls |
| `MAX_OUTPUT_LINES` | 500 | `print` lines per run |
| `MAX_PROGRAMS` / `MAX_PROGRAM_LENGTH` | 30 / 10,000 chars | Saved programs |

**Storage and validation** (`lib/script/programs.ts`). `validateProgram` rejects reserved words, keywords and duplicate names. Programs are saved under `gsc.programs.v1`. When nothing is saved, five examples are loaded: `sumTo`, `fib`, `quadratic`, `newton` and `collatz`.

## State, persistence and security

Shareable graph state goes in the URL; everything personal goes in `localStorage`. All reads happen once, in `loadInitialState` during the first client render; writes happen in effects keyed to each piece of state.

| Key / parameter | Contents | Module |
| --- | --- | --- |
| `?eq=…&eq=…` | Equation texts (max 6, 200 chars each) | `lib/graph/equations.ts` |
| `?angle=deg` / `grad` | Angle mode (omitted for rad) | `encodeShareState` |
| `?view=3d` | 3D view (omitted for 2D) | `encodeShareState` |
| `?st=1.3d3_2.2o1` | Colour and line style per equation, only where not the default: index.colour-number dash-code (`s`/`d`/`o`) width (1–3) | `encodeShareState` |
| `?win=xMin,xMax,yMin,yMax` | Applied graph window (10 significant digits) | `encodeShareState` |
| `?grid=0`, `?nums=0` | Grid lines / axis numbers turned off | `encodeShareState` |
| `?xl=…`, `?yl=…` | Axis titles (max 40 chars) | `encodeShareState` |
| `gsc.history.v1` | Up to 50 `{ expression, result, at }` entries, newest first | `lib/calculator/history.ts` |
| `gsc.angle.v1` | Saved angle mode (URL value wins) | `Calculator` |
| `gsc.display.v1` | `exact` or `decimal` | `Calculator` |
| `gsc.data.v1` | Lists `l1`, `l2` as text | `lib/calculator/workspace.ts` |
| `gsc.matrices.v1` | Matrices `A`–`F` | `lib/calculator/workspace.ts` |
| `gsc.programs.v1` | Saved programs | `lib/script/programs.ts` |

The URL is updated with `history.replaceState` whenever equations, their styles, the angle mode, the view or the graph settings change, so the address bar is always a shareable link (the Copy link button copies it). Panning and zooming are not written to the URL; only an applied window is. Every storage access is wrapped in `try/catch`; blocked storage falls back to defaults, and corrupt JSON is validated and discarded. `decodeShareState` drops style entries for missing equations, unknown colours or codes, windows that aren't finite and ordered, and over-long titles.

Variables, functions, slider values and slider ranges are not persisted.

**Security model**

- No `eval()` or `new Function` on user input. All parsing goes through Math.js.
- Each Math.js instance disables `import`, `createUnit`, `evaluate`, `parse`, `simplify`, `derivative`, `resolve` and `reviver` for expressions. The calculus functions compile only nodes that the sandboxed parser already produced.
- Share-URL input is bounded (6 equations, 200 characters each, 40-character titles) and unknown parameter values are dropped.
- Scripts run under step, depth and output limits, so a runaway loop stops with an error instead of freezing the tab; in the worker, a superseded stuck job gets the worker restarted.
- No server-side evaluation, so user input never reaches the server.

## Build, testing and workflow

**Commands**

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:3000 (Turbopack) |
| `npm run build` | Production build, including type-checking |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint flat config (`eslint-config-next` core-web-vitals + TypeScript) |
| `npx tsc --noEmit` | Type-check only |
| `npm test` | Vitest, all suites once (`npm run test:watch` to watch) |
| `npx vitest run lib/math/engine.test.ts -t "name"` | One file or one test |

**Unit tests.** 223 Vitest tests in 24 files, all under `lib/`. The largest suites cover the engine (26), interpreter (23), calculus numerics (13), 3D (13), graphing limitations (13), calculus functions (12), regions (12), sampling (11) and statistics (10). No `Worker` exists in Vitest, so plot jobs run through the main-thread path. There are no React component tests. Run Vitest from PowerShell: under Git Bash every suite fails with "Cannot read properties of undefined (reading 'config')" because of drive-letter casing.

**Browser checks.** UI behaviour is verified by running `next start` and driving headless Edge over the Chrome DevTools Protocol with Node's built-in `WebSocket`. Use a fresh `--user-data-dir` per run (saved history and angle mode carry over), and call `Page.bringToFront` and `Emulation.setFocusEmulationEnabled` after every navigation; a hidden tab pauses `ResizeObserver`, so the graph never gets a height. Return plain values from `Runtime.evaluate` (`!!element`, not the element), since DOM nodes can't be serialised.

**Configuration.** Tailwind v4 is configured in CSS (`@import "tailwindcss"`, `@theme inline` in `app/globals.css`) and processed by `@tailwindcss/turbopack`. `next.config.ts` enables `cacheComponents`, `partialPrefetching` and `experimental.agentFeedback`. The `@/*` path alias maps to the repo root in both `tsconfig.json` and `vitest.config.mts`.

**Branching.** Work is delivered in phases, one branch each (`phase-15-fields-and-graph-styles` was the latest). Each phase is tested by the owner, then pushed, opened as a PR into `master` and merged with `gh pr merge --merge`.

| Phase | Delivered |
| --- | --- |
| 1–4 | Evaluator, keypad and shortcuts, live graph, multiple equations, trace, intersections, angle toggle, history |
| 5 | Graph matches calculator height, value table, exact/decimal display |
| 6 | Parametric, polar and shaded-inequality graphs |
| 7 | Lists, matrices, statistics, distributions, regression |
| 8 | Gradians, unit conversion, constants and variables panel |
| 9 | Scripting and saved programs |
| 10 | 3D surfaces, implicit curves, plotting worker |
| 11 | Curves and key points moved to the worker, touching zeros, 3D hover |
| 12 | Arbitrary inequality regions, functions follow angle mode |
| 13 | Chained inequalities |
| 14 | `nDeriv`, `fnInt`, `solve`; maxima and minima on the graph; trace slope; sliders |
| 15 | Slope and vector fields; Window panel (exact bounds, grid, axis numbers, titles); per-equation colour, line type and thickness; all in the share link |

## Extending the project

**Recipes**

- **New built-in function.** Implement it as a plain function in `lib/` with tests, then add it to the `math.import({...})` call in `buildEngine`. It then works in every angle mode, in graphs, programs and the worker.
- **New function that binds a variable** (like `nDeriv`). Write it as a Math.js `rawArgs` function in `lib/math/calculusFunctions.ts`: compile its argument nodes (cached), evaluate them in a `BoundScope`, and add its name to `CALCULUS_FUNCTIONS` so `compileInVariables` accepts the bound variable.
- **New plot kind.** Add a variant to `PlotSpec` and a branch in `compilePlot` (mind the classification order). If it is expensive, add a job kind to `PlotJob`/`PlotJobResult`, handle it in `computeJob`, list any typed arrays in `transferables`, and render the result with `usePlotJob` in a component under `components/graph/`. Accept a `style` prop and use `LINE_WIDTH_PX` and `dashArray` so the style picker applies to it.
- **New share-link setting.** Add it to `GraphSettings` (or `EquationLook`), encode only non-default values in `encodeShareState`, validate it in `decodeShareState`, and add round-trip and invalid-value tests to `equations.test.ts`.
- **New persisted setting.** Read it in `loadInitialState` (never in an effect) and write it in its own `useEffect`. Version the key (`gsc.<name>.v1`) and validate what you load.
- **New tools tab.** Build a panel in `components/tools/`, keep its data in `Calculator` state, and pass it in the `tabs` array of `ToolsPanel`.

**Rules to keep**

- Parse a node with the same engine instance (angle mode) that evaluates it.
- Pass `angleMode` to both `evaluateExpression` and every compile function.
- Copy the scope into `graphScope` after any change, or graphs won't recompile.
- Keep cursor positions out of `Equation`, so moving the cursor doesn't recompile curves.
- Pass Mafs a measured numeric `width` and `height`; with `width="auto"` it renders nothing until its own `ResizeObserver` fires.
- Don't read refs during render (React's lint rules flag it); read them in event handlers, as `Graph` does for the visible window.
- Read the bundled Next.js docs in `node_modules/next/dist/docs/` before using Next.js APIs; version 16.4 differs from older releases.

**Known quirks and limitations**

- Values that can't be copied to the worker (units, complex numbers) force their plot jobs onto the main thread.
- Programs called from graphs stop after 2,000 steps per call on the main thread, 10,000 in the worker.
- Exact forms only cover fractions and rational multiples of √n and π; anything else shows as a decimal.
- Unit names collide with functions: `min` is the function (use `minute`); `mph` is undefined (use `mi/h`).
- With an exact window (no padding), axis numbers that fall right on the edge are slightly clipped.
- Panning and zooming aren't written to the share URL; only an applied window is. Slider ranges and variable values aren't saved.
- In headless Edge, after a scripted click that remounts Mafs, wait 100 ms before polling in the same `Runtime.evaluate`, or worker answers and new axis labels can miss the poll window. Real input doesn't show this.
- On mobile the top-level grid needs `grid-cols-1`, or the six-tab tools bar widens the page.
