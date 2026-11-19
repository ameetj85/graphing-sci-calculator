# Graphing Scientific Calculator — User Manual

Nov 19, 2026 · @Ameet

## Getting started

Type an expression, press **Enter**, and the result appears under the input. Graphs update live as you type equations in the graph card. Everything runs in your browser, and your history, settings, lists, matrices and programs are saved on this device.

**Screen layout** (on narrow screens the cards stack in this order)

| Card | Position | What it holds |
| --- | --- | --- |
| Calculator | Top left | Expression input, angle unit (DEG/RAD/GRAD), formatted preview, result, keypad, shortcut list |
| Graph | Top right | Equation rows (each with a style button), sliders, 2D/3D switch, Trace selector, Key points toggle, Copy link to graph, and the graph with its Window, Trig view and Reset view buttons |
| History | Bottom left | Past calculations; reuse an expression or insert a result |
| Tools | Bottom right | Tabs: Table, Statistics, Matrices, Units, Variables, Programs |

**Basic workflow**

1. Click the **Expression** box and type `2 + 3 * 4`. The preview shows the formatted maths.
2. Press **Enter** (or the **=** key). The result shows `14`, with `2 + 3 * 4 =` above it.
3. In the graph card, type `x^2 - 4` in an equation row. The parabola appears at once, with dots at its roots (-2, 0) and (2, 0) and its minimum (0, -4).
4. Click **+ Add equation** (below the rows) to plot up to 6 equations together.
5. Type `a sin(x)` in a new row and click **+ a** under the equations: a slider for `a` appears, and dragging it reshapes the curve.

The keypad always types into the input you used last; the line “Keypad types into …” above it tells you which.

## Entering expressions

Type maths as you would write it on one line. As you type, the **preview** shows the formatted expression; after **Enter**, the result appears with the expression above it. Results show up to 12 significant digits.

**Operators and order of operations.** Parentheses first, then factorial `!`, then powers `^` (right to left), then unary minus, then `*` `/` `%` (and implied multiplication), then `+` `-`.

| Input | Output | Note |
| --- | --- | --- |
| `2 + 3 * 4` | `14` | Multiplication before addition |
| `(2 + 3) * 4` | `20` | Parentheses first |
| `2^3^2` | `512` | Powers group right to left: 2^(3^2) |
| `-2^2` | `-4` | Power before the minus sign |
| `7 / 2` | `7/2` (≈ 3.5) | Shown as an exact fraction |
| `17 % 5` or `mod(17, 5)` | `2` | Remainder |
| `2pi` | `2π` (≈ 6.28318530718) | Implied multiplication |
| `3(4 + 1)` | `15` | Implied multiplication before parentheses |

**Number formats**

| Input | Output |
| --- | --- |
| `1.5e3` | `1500` |
| `2e-4 * 3` | `3/5000` (≈ 6e-4) |
| `1e20 * 3` | `3e+20` |
| `0.1 + 0.2` | `3/10` (≈ 0.3) |
| `1/0` | `Infinity` |
| `0/0` | `NaN` |

The **EE** key inserts `e` for scientific notation (`1.5`, **EE**, `3` → `1.5e3`).

**The previous answer: `ans`.** Every successful result is stored in `ans`.

| Step | Input | Output |
| --- | --- | --- |
| 1 | `sqrt(16)` | `4` |
| 2 | `ans * 2` | `8` |
| 3 | `ans^2 + 1` | `65` |

The **ans** key inserts `ans`. Results that are functions (such as `f(x) = x^2`) do not replace `ans`.

**Several statements in one line.** Separate statements with `;`. The result of the last visible statement is shown; a trailing `;` hides a statement's result.

| Input | Output |
| --- | --- |
| `r = 2; pi r^2` | `4π` (≈ 12.5663706144) |
| `a = 5;` | *No result* (a is still set to 5) |
| `a = 5; b = a + 1; a b` | `30` |

**Comparisons and booleans.** `1 < 2` returns `true`; `3 == 4` returns `false`. Use `==` for equality (a single `=` assigns).

## Keypad and keyboard shortcuts

The 5-column keypad types into the **active input**: the Expression box or the equation row you clicked last. Function keys wrap the current selection, so selecting `x+1` and pressing **sin** gives `sin(x+1)`. With nothing selected they insert an empty pair such as `sin()` with the cursor inside, so you never need to close it. **DEL** right after an opener removes the whole function name and its closing parenthesis (`sin()` disappears in one press).

**2nd layer.** Press **2nd** to switch keys to their alternate function for one key press (the key highlights while active).

| Key | Inserts | 2nd function | Inserts |
| --- | --- | --- | --- |
| sin / cos / tan | `sin(` `cos(` `tan(` | sin⁻¹ / cos⁻¹ / tan⁻¹ | `asin(` `acos(` `atan(` |
| ln | `log(` (natural log) | eˣ | `exp(` |
| log | `log10(` | 10ˣ | `10^` |
| x² | `^2` | x⁻¹ | `^-1` |
| xʸ | `^` | ʸ√x | `nthRoot(` |
| √ | `sqrt(` | ∛ | `cbrt(` |
| x! | `!` | \|x\| | `abs(` |
| π | `pi` | e | `e` |
| EE | `e` (exponent) |  |  |
| x, ans, `,` | `x`, `ans`, `,` |  |  |
| AC / DEL / = | clear / delete / evaluate |  |  |

**Example.** Press **2nd**, **√**, `2`, `7`, **=** → the input reads `cbrt(27)` → result `3`.

**Keyboard shortcuts.** The matching keypad button flashes when you press a physical key.

| Key | Action |
| --- | --- |
| **Enter** | Evaluate the expression (in an equation row, graphs already update live) |
| **Esc** | Clear the focused input |
| **Backspace** | Delete |
| Any character | Typing anywhere on the page edits the last-used input |
| `^` `!` `(` `)` `+ - * /` | Same as the keypad keys |
| Arrow keys / drag (on the graph) | Pan the graph, or move a focused trace point |
| Scroll / pinch (on the graph) | Zoom |

Open **Keyboard shortcuts** under the keypad for this list in the app.

## Scientific functions

All examples below are in **RAD** mode unless marked. Function names are case-sensitive.

**Roots, powers and factorials**

| Input | Output |
| --- | --- |
| `sqrt(16)` | `4` |
| `sqrt(8)` | `2√2` (≈ 2.82842712475) |
| `cbrt(27)` | `3` |
| `nthRoot(32, 5)` | `2` |
| `5!` or `factorial(5)` | `120` |
| `abs(-7.5)` | `15/2` (≈ 7.5) |
| `2^10` | `1024` |

**Logarithms and exponentials.** `log` is the **natural** log; there is no `ln` function (typing `ln(5)` gives *Undefined function ln*; the keypad's **ln** key inserts `log(`).

| Input | Output |
| --- | --- |
| `log(e)` | `1` |
| `log10(1000)` | `3` |
| `log2(8)` | `3` |
| `log(100, 10)` | `2` (log of 100 in base 10) |
| `exp(1)` | `2.71828182846` |

**Trigonometry** (angles follow the DEG/RAD/GRAD switch; see the next section)

| Mode | Input | Output |
| --- | --- | --- |
| RAD | `sin(pi/6)` | `1/2` (≈ 0.5) |
| RAD | `sin(pi/4)` | `√2/2` (≈ 0.707106781187) |
| RAD | `cos(pi)` | `-1` |
| RAD | `acos(0.5)` | `π/3` (≈ 1.0471975512) |
| RAD | `atan(1)` | `π/4` (≈ 0.785398163397) |
| DEG | `sin(30)` | `1/2` (≈ 0.5) |
| DEG | `cos(90)` | `0` (exactly, not 6e-17) |
| DEG | `asin(0.5)` | `30` |
| DEG | `atan2(1, 1)` | `45` |
| DEG | `tan(90)` | Error: *tan is undefined at 90°* |

Also available: `sec`, `csc`, `cot` and inverses `asec`, `acsc`, `acot`; hyperbolic `sinh`, `cosh`, `tanh` and inverses `asinh`, `acosh`, `atanh`. Examples: `sinh(1)` → `1.17520119364`, `cosh(0)` → `1`, `sec(0)` → `1`.

**Rounding and integers**

| Input | Output |
| --- | --- |
| `round(3.14159, 2)` | `157/50 (≈ 3.14; Decimal shows 3.14)` |
| `floor(-2.5)` / `ceil(2.1)` | `-3` / `3` |
| `gcd(12, 18)` / `lcm(4, 6)` | `6` / `12` |
| `combinations(5, 2)` / `permutations(5, 2)` | `10` / `20` |
| `isPrime(97)` | `true` |
| `fraction(0.75)` | `3/4` |
| `max(3, 9, 2)` / `min(3, 9, 2)` | `9` / `2` |

**Complex numbers.** Use `i` for the imaginary unit. Square roots of negatives return complex results.

| Input | Output |
| --- | --- |
| `sqrt(-4)` | `2i` |
| `(2 + 3i) * (1 - i)` | `5 + i` |
| `i^2` | `-1` |
| `abs(3 + 4i)` | `5` |
| `arg(1 + i)` | `π/4` (≈ 0.785398163397) |
| `conj(2 + 3i)` | `2 - 3i` |

The full Math.js function library is available apart from a few disabled for safety (`evaluate`, `parse`, `import`, `simplify`, `derivative` and similar); calling one gives *Function … is disabled*.

## Calculus and solving equations

Three functions cover derivatives, definite integrals and equation solving. The second argument names the variable, which exists only inside the function, so it never changes a variable of yours with the same name. They follow the angle mode and work in graphs as well as in the Expression input.

| Function | Meaning |
| --- | --- |
| `nDeriv(expr, var, a)` | Derivative of expr with respect to var, at var = a |
| `fnInt(expr, var, a, b)` | Definite integral of expr from a to b |
| `solve(expr, var, guess)` | A root of expr (where it equals 0) near guess |
| `solve(expr, var, a, b)` | A root between a and b; expr must change sign there |

**Examples** (RAD mode)

| Input | Output |
| --- | --- |
| `nDeriv(x^2, x, 3)` | `6` |
| `nDeriv(sin(t), t, 0)` | `1` |
| `fnInt(x^2, x, 0, 3)` | `9` |
| `fnInt(sin(x), x, 0, pi)` | `2` |
| `fnInt(1/x, x, 1, e)` | `1` |
| `solve(x^3 - 2x - 5, x, 2)` | `2.09455148154` |
| `solve(x^2 - 2, x, 0, 5)` | `√2` (≈ 1.41421356237) |
| `solve(cos(x) == x, x, 1)` | `0.739085133215` |

**Equations.** Write an equation with `==` to solve it as it stands: `solve(cos(x) == x, x, 1)` finds where cos x = x.

**Your own functions and variables.** After `f(x) = x^3 - 3x`, `nDeriv(f(x), x, 2)` gives `9`. Variables work too: after `a = 3`, `nDeriv(a x^2, x, 2)` gives `12`.

**Angle mode.** In DEG mode, `nDeriv(sin(x), x, 0)` gives `0.0174532925199` (π/180), because x is measured in degrees.

**In graphs.** `y = nDeriv(t^3, t, x)` draws the derivative 3x², and `y = fnInt(t, t, 0, x)` draws the running integral x²/2. Use a letter other than x for the inner variable.

**Accuracy.** Derivatives use a five-point difference (about 10 correct digits). Integrals use adaptive Gauss–Kronrod quadrature, which also copes with integrable spikes at an end point: `fnInt(1/sqrt(x), x, 0, 1)` gives approximately 2. The solver tries Newton's method from the guess, then searches outward for a sign change.

## Angle modes and result formats

**Angle unit.** The **DEG / RAD / GRAD** switch beside the Expression label sets how trig functions read and return angles. It applies everywhere: expressions, your own functions, programs, graphs and tables. The setting is remembered.

| Mode | Full turn | Input | Output |
| --- | --- | --- | --- |
| RAD | 2π | `sin(pi/2)` | `1` |
| DEG | 360 | `sin(90)` | `1` |
| GRAD | 400 | `sin(100)` | `1` |
| GRAD | 400 | `acos(0)` | `100` |
| DEG | 360 | `sin(pi/6)` | `0.00913839539718` (π/6 is read as 0.52°) |

In DEG and GRAD modes, exact quarter turns give exact answers: `cos(90)` is `0`, not a tiny rounding error, and `tan(90)` is an error rather than a huge number.

**Explicit angle units** override the mode for one value: in any mode, `sin(30 deg)` → `1/2`.

Put parentheses around a calculated angle before its unit: `sin((pi/6) rad)` → `1/2`. Without them, `pi/6 rad` means `pi / (6 rad)`, so `sin(pi/6 rad)` gives the error *sin needs an angle, such as 30 deg, but got a value in rad^-1; write (pi/6) rad, not pi/6 rad, which means pi / (6 rad)*. A non-angle unit gives a similar error: `cos(5 m)` → *cos needs an angle, such as 30 deg, but got a value in m*.

**Functions follow the mode.** If you define `h(x) = sin(x)` and then switch from RAD to DEG, `h(30)` changes from `-0.988031624093` to `0.5`.

**Graphs follow the mode.** In DEG mode, `y = sin(x)` has period 360 on the x-axis; the note “x in degrees” under the graph controls reminds you. Use **Trig view** on the graph to jump to a window that fits one or two periods.

**Exact vs decimal results.** When a result has a simple exact form, it is shown exactly, with the decimal underneath (“≈ …”), and an **Exact / Decimal** switch appears above it.

| Input | Exact | Decimal |
| --- | --- | --- |
| `1/3` | `1/3` | `0.333333333333` |
| `sqrt(8)` | `2√2` | `2.82842712475` |
| `sin(pi/4)` | `√2/2` | `0.707106781187` |
| `2pi` | `2π` | `6.28318530718` |
| `std([2, 4, 4, 4, 5, 5, 7, 9])` | `4√14/7` | `2.1380899353` |
| `exp(1)` | (none) | `2.71828182846` |

Recognised forms are fractions (denominator up to 10,000), rational multiples of √n, and rational multiples of π. Whole numbers, very large or very small values are always decimal. The choice only affects display: `ans` and history always store the decimal value.

## Variables, functions and constants

**Variables.** Assign with a single `=`. Names start with a letter or `_`. Variables persist until you delete them or reload the page.

| Step | Input | Output |
| --- | --- | --- |
| 1 | `a = 4` | `4` |
| 2 | `b = a^2 + 1` | `17` |
| 3 | `a b` | `68` |

**Functions.** Define with `name(params) = expression`. The result shows the function signature.

| Step | Input | Output |
| --- | --- | --- |
| 1 | `f(x) = x^2 + 1` | `f(x)` |
| 2 | `f(3)` | `10` |
| 3 | `f(a)` (with a = 4) | `17` |
| 4 | `g(x, y) = x y + 1` | `g(x, y)` |
| 5 | `g(2, 5)` | `11` |

Your variables and functions also work in graphs: after `a = 2`, the equation `y = a sin(x)` plots with amplitude 2, and `y = f(x)` plots your function. Change `a` and the graph redraws.

**The graph's `x`.** In the graph, `x` is always the horizontal axis. If you assign `x = 5` in the calculator, a note appears in the graph card explaining that this value isn't used for graphing, with a **Remove x** button.

**Constants**

| Name | Value |
| --- | --- |
| `pi` | 3.14159265359 |
| `e` | 2.71828182846 |
| `phi` (golden ratio) | 1.61803398875 |
| `tau` (2π) | 6.28318530718 |
| `speedOfLight` | `2.99792458e+8 m / s` |
| `gravity` | `9.80665 m / s^2` |
| `avogadro` | `6.02214076e+23 mol^-1` |

Physical constants carry units. The Variables tab also lists `gravitationConstant`, `planckConstant`, `reducedPlanckConstant`, `elementaryCharge`, `electronMass`, `protonMass`, `neutronMass`, `atomicMass`, `boltzmann`, `gasConstant`, `faraday`, `electricConstant`, `magneticConstant`, `coulomb`, `stefanBoltzmann`, `bohrRadius` and `rydberg`.

**Variables tab** (Tools card). Two lists:

- **Your variables and functions**: each with its current value and **Insert** and **Delete** buttons. Data lists, matrices and programs are managed in their own tabs and aren't listed here.
- **Constants**: mathematical and physical constants with their symbols and an **Insert** button.

## Units and conversion

Attach units by writing them after a number. Convert with `to`. Arithmetic on units checks that they are compatible.

| Input | Output |
| --- | --- |
| `5 inch to cm` | `12.7 cm` |
| `100 km/h to mi/h` | `62.1371192237 mi / h` |
| `25 degC to degF` | `77 degF` |
| `90 minute to hour` | `1.5 hour` |
| `10 knot to km/h` | `18.52 km / h` |
| `1 cal to J` | `4.184 J` |
| `3 kg + 500 g` | `3.5 kg` |
| `2 m * 3 m` | `6 m^2` |
| `5 N * 2 m to J` | `10 J` |
| `5 m + 2 s` | Error: *Units do not match* |

**Name gotchas.** `min` is the minimum function, so write `minute`. `mph` is not defined: write `mi/h`. Inches are `inch` (`in` is a keyword).

**Units tab** (Tools card). Pick a **Quantity**, type a value, and choose the from and to units; the result updates as you type. **⇄** swaps the units, and **Insert into expression** inserts the equivalent typed conversion (for example `5 inch to cm`).

| Quantity | Units offered |
| --- | --- |
| Length | mm, cm, m, km, inch, ft, yd, mi, nmi |
| Mass | mg, g, kg, tonne, oz, lb, stone |
| Time | s, minute, hour, day, week, year |
| Temperature | degC, degF, K |
| Area, Volume, Speed, Energy, Power, Pressure, Angle, Data | Common metric and imperial units for each (e.g. BTU under Energy) |

## Graphing functions

Type a function of `x` in an equation row; the graph redraws as you type. Writing `y =` is optional. Each row has its own colour and is named y₁, y₂, … in the trace and table.

| Input | What you see |
| --- | --- |
| `x^2 - 4` | Parabola crossing the x-axis at -2 and 2 |
| `y = sin(x)` | Sine wave (period 2π in RAD) |
| `1/x` | Hyperbola, with no false line joining the two branches |
| `tan(x)` | Separate branches at each asymptote |
| `sqrt(x)` | Curve starting exactly at the origin; nothing for x < 0 |
| `floor(x)` | Steps, broken at each jump |
| `a x^2` (after `a = 0.5`) | Wider parabola; redraws when `a` changes |
| `f(x)` (after defining f) | Your function |

**Equation rows**

- **+ Add equation** adds a row (up to 6).
- The coloured dot hides or shows a row without deleting it.
- The line button next to **×** opens the row's style: colour, line type and thickness (see *Window, axes and line styles*).
- **×** removes the row.
- A hint under each row says how it is read (e.g. *Polar, θ from 0 to 2π*). If the text can't be graphed, the error is shown instead, e.g. *Undefined symbol: k*.

**Moving around the graph**

| Action | How |
| --- | --- |
| Pan | Drag, or arrow keys when the graph has focus |
| Zoom | Scroll wheel or pinch |
| Exact bounds | **Window**: type x and y limits (see *Window, axes and line styles*) |
| Standard window | **Reset view**: x from -10 to 10, y from -6 to 6 |
| Trig window | **Trig view**: x from -2π to 2π (RAD), -360° to 360° (DEG) or -400 to 400 (GRAD); y from -2 to 2 |

Grid lines and labels re-space themselves as you zoom.

**Key points.** With **Key points** ticked, dots mark, within the visible window: where each function crosses or touches the x-axis (roots), its local maxima and minima, and where any two functions meet. Hover a dot to see what it is, such as *Maximum of y₁ at (-1, 2)*; click it to pin its coordinates.

| Equations | Dots shown |
| --- | --- |
| `x^2 - 4` | Roots at (-2, 0) and (2, 0); minimum at (0, -4) |
| `x^3 - 3x` | Roots at (-1.73205, 0), (0, 0) and (1.73205, 0); maximum at (-1, 2); minimum at (1, -2) |
| `x^2` | Root at (0, 0) (a minimum that is also a root is shown once, as the root) |
| `x^2` and `x + 2` | Roots of each, and intersections (-1, 1) and (2, 4) |
| `sin(x)` and `cos(x)` (RAD) | Maxima, minima, roots, and intersections at x ≈ 0.785398, -2.35619, … |

Steps and asymptotes (`floor(x)`, `tan(x)`, `1/x`) never produce false maxima or minima.

**Trace.** Choose a curve in the **Trace** list (Off, y₁, y₂, …). A point appears on that curve with its coordinates and slope, e.g. `(0, 0)  slope -3` on `x^3 - 3x`. Drag it, or focus it and use the arrow keys. Over a gap (such as `sqrt(x)` for x < 0) it jumps to the nearest x where the function is defined.

**Table of values** (Tools → **Table**). Shows 11 rows of x and every visible function. **Start** (default -5) and **Step** (default 1) accept expressions such as `pi/4`. Undefined values show *undefined*.

| x | y₁ = `x^2` | y₂ = `sqrt(x)` |
| --- | --- | --- |
| -1 | 1 | undefined |
| 0 | 0 | 0 |
| 1 | 1 | 1 |
| 4 | 16 | 2 |

The table and trace are linked: the row nearest the trace point is highlighted, clicking a row moves the trace point there (turning on trace for y₁ if it was off), and **Center on trace** recentres the table on the trace point.

**Only `y = f(x)` rows** are traced, tabulated and searched for key points. Inequalities, implicit, parametric, polar, field and 3D rows are drawn but have no trace or table.

## Other graph types

The same equation row draws every graph type; the calculator decides the type from what you type. The hint under the row confirms how it was read.

| You type | Graph type | Result |
| --- | --- | --- |
| `y > x^2` | Inequality | Region above the parabola shaded; dashed edge |
| `y <= 2x + 1` | Inequality | Region below the line shaded; solid edge |
| `x > 2` | Region | Everything right of x = 2 shaded |
| `x^2 + y^2 < 9` | Region | Inside of the circle of radius 3 shaded |
| `1 < x <= 3` | Chained region | Vertical band: left edge dashed, right edge solid |
| `-2 <= y < x` | Chained region | Area above y = -2 and below y = x |
| `x^2 + y^2 = 4` | Implicit curve | Circle of radius 2 |
| `x^2/9 + y^2/4 = 1` | Implicit curve | Ellipse |
| `y^2 = x` | Implicit curve | Sideways parabola |
| `r = 2 sin(3 theta)` | Polar | Three-petal rose |
| `r = 1 + cos(θ)` | Polar | Cardioid |
| `(cos(t), sin(t))` | Parametric | Unit circle |
| `(t, t^2) {-2 <= t <= 2}` | Parametric | Parabola segment from (-2, 4) to (2, 4) |
| `dy/dx = x - y` | Slope field | Short segments showing the slope at each grid point |
| `field(-y, x)` | Vector field | Arrows circling the origin, darker where they are longer |
| `z = sin(x) cos(y)` | 3D surface | Egg-crate surface in the 3D view |

**Inequalities and regions.** Use `<`, `<=`, `>` or `>=` (or `≤`, `≥`). Strict comparisons (`<`, `>`) draw a dashed edge because the edge is not included; `<=` and `>=` draw a solid edge. A chain such as `1 < x < 2` shades where every comparison holds.

**Implicit curves.** Any equation with a single `=` that isn't `y = f(x)` (or `r = …`, `z = …`, `dy/dx = …`) is drawn as the set of points where both sides are equal. Curves that touch zero without crossing, such as `(x^2 + y^2 - 4)^2 = 0`, are also found. A row like `y = y^2 + x` is implicit because `y` appears on the right.

**Polar curves.** Start with `r =` and use `theta`, `θ` or `t` as the angle. By default the angle runs one full turn in the current angle mode (0 to 2π, 0 to 360°, or 0 to 400 grad).

**Parametric curves.** Write a pair `(x(t), y(t))`. By default `t` also runs over one full turn.

**Custom range.** End a polar or parametric row with `{a <= t <= b}` (or `theta`), for example `r = theta {0 <= theta <= 6pi}` for a three-turn spiral.

**Slope and vector fields.** `dy/dx = f(x, y)` draws a slope field: a short segment at each grid point with slope f(x, y), useful for sketching solutions of differential equations. `field(P, Q)` draws a vector field: an arrow at each grid point pointing along (P(x, y), Q(x, y)). Arrow length is fixed so the field stays readable; longer vectors are drawn darker. The grid of arrows re-spaces as you zoom, and arrows keep their direction when the axes have different scales. Your variables and sliders work in fields too, e.g. `dy/dx = k y`.

**3D surfaces.** Type `z = f(x, y)`. In the 2D view the row's hint offers **Show 3D view**; or pick **3D** in the 2D/3D switch.

| 3D action | How |
| --- | --- |
| Rotate | Drag |
| Zoom | **+** / **−** buttons, or scroll |
| Reset | **Reset view** (x and y from -5 to 5 in RAD, -360 to 360 in DEG, -400 to 400 in GRAD) |
| Read a point | Hover: the (x, y, z) readout shows under the view |
| Pin / unpin | Click to pin the point; **Esc** clears it |

Several surfaces can be shown together, each in its row's colour. Examples: `z = x^2 - y^2` (saddle), `z = sqrt(x^2 + y^2)` (cone), `z = exp(-(x^2 + y^2)/10)` (bump).

## Sliders

When an equation uses a variable of your own, the graph card shows a slider for it, between the equation rows and the graph controls. Drag it and the graph redraws.

1. Type `a sin(b x)` in an equation row. Because `a` and `b` aren't defined yet, **Add a slider: + a + b** appears under the equations.
2. Click **+ a** and **+ b**. Each is set to 1 and gets a slider.
3. Drag the **a** slider to 3: the wave becomes three times as tall. Drag **b** to 2: it oscillates twice as fast.

Each slider row shows the name, a minimum field, the slider, a maximum field and a value field.

| To | Do this |
| --- | --- |
| Set an exact value | Type it in the value field (after **=**) |
| Change the range | Type new minimum and maximum values; the step adapts (0.1 for -10 to 10, 0.01 for 0 to 1) |
| Get a slider for an existing variable | Use the variable in an equation: after `k = 2` in the Expression input, typing `k x` in a row shows a **k** slider |

The default range is -10 to 10 in steps of 0.1; larger values get a wider range (for `a = 250`, -1000 to 1000). A slider changes the variable everywhere: the Expression input, the Variables tab and every equation that uses it.

Graph coordinates (`x`, `y`, `z`, `r`, `t`, `theta`), built-in names (`pi`, `e`), function names, lists and matrices never get sliders. Slider ranges reset when you reload the page, and slider values, like other variables, are not saved.

## Window, axes and line styles

**Window panel.** Click **Window** at the top right of the graph. The panel opens with the bounds currently on screen.

| Setting | What it does |
| --- | --- |
| x min, x max, y min, y max | Exact bounds; expressions work (`-pi`, `2pi`). **Apply window** shows exactly these bounds |
| Grid lines | Shows or hides the grid; the axes stay |
| Axis numbers | Shows or hides the numbers along the axes |
| x-axis title, y-axis title | Text shown in the bottom-right and top-left corners of the graph (up to 40 characters) |

Example: x min `-pi`, x max `2pi`, y min `-1.5`, y max `1.5` shows one and a half periods of `sin(x)`, edge to edge.

Grid, numbers and titles apply as you change them. Press **Esc** or **×** to close the panel. A bound that isn't a number gives *Enter a number for x min (expressions such as 2pi work)*; a max not larger than its min gives *Each max must be larger than its min*.

**Saved views.** An applied window and **Trig view** are kept in the share link. **Reset view** returns to x from -10 to 10 and y from -6 to 6 and clears the saved window. The default view adds a small margin, so the Window panel shows -10.5 to 10.5 until you apply bounds of your own. Panning and zooming change only what you see, not the saved window.

**Line styles.** Click the line button next to an equation's **×** to open its style row. The button shows a preview of the current style.

| Option | Choices |
| --- | --- |
| Colour | 6 colours |
| Line type | Solid, Dashed, Dotted |
| Thickness | Thin, Normal, Thick |

Styles apply to every graph type. Edges of strict inequalities (`<`, `>`) stay dashed so you can still tell they aren't included. Fields use the colour and a lighter version of the thickness.

## Statistics, distributions and regression

**Data lists.** Open Tools → **Statistics** and type numbers into **L1** and **L2**, separated by commas, spaces, semicolons or new lines. Anything that isn't a number is flagged. The lists are saved and are available everywhere as `L1` and `L2`.

**Summary statistics.** A table shows each list's statistics as you type. Quartiles use the TI-84 method (medians of the lower and upper halves, leaving out the middle value when n is odd).

Example with L1 = `2, 4, 4, 4, 5, 5, 7, 9`:

| Statistic | Value |
| --- | --- |
| n | 8 |
| Mean x̄ | 5 |
| Sample SD (Sx) | 2.13809 |
| Population SD (σx) | 2 |
| Sum Σx | 40 |
| Min / Q1 / Median / Q3 / Max | 2 / 4 / 4.5 / 6 / 9 |

**Statistics in expressions**

| Input | Output |
| --- | --- |
| `mean([2, 4, 9])` | `5` |
| `median([5, 1, 3])` | `3` |
| `std([2, 4, 4, 4, 5, 5, 7, 9])` | `4√14/7` (≈ 2.1380899353), sample SD |
| `variance([1, 2, 3, 4])` | `5/3` (≈ 1.66666666667) |
| `sum([1, 2, 3, 4])` | `10` |
| `mean(L1)`, `std(L2)`, `sum(L1 .* L2)` | Statistics of your saved lists |

**Probability distributions**

| Function | Meaning | Example | Output |
| --- | --- | --- | --- |
| `normalpdf(x, μ, σ)` | Normal density (μ = 0, σ = 1 if omitted) | `normalpdf(0)` | `0.398942280401` |
| `normalcdf(a, b, μ, σ)` | P(a ≤ X ≤ b) | `normalcdf(-1, 1)` | `0.682689492137` |
|  |  | `normalcdf(90, 110, 100, 15)` | `0.495014924906` |
| `invNorm(p, μ, σ)` | x with P(X ≤ x) = p | `invNorm(0.975)` | `1.95996398454` |
| `binompdf(n, p, k)` | P(exactly k successes) | `binompdf(10, 0.5, 5)` | `63/256` (≈ 0.24609375) |
| `binomcdf(n, p, k)` | P(at most k) | `binomcdf(10, 0.5, 5)` | `319/512` (≈ 0.623046875) |
| `poissonpdf(λ, k)` | P(exactly k events) | `poissonpdf(3, 2)` | `0.224041807655` |
| `poissoncdf(λ, k)` | P(at most k) | `poissoncdf(3, 2)` | `0.423190081127` |

These work in graphs too: `y = normalpdf(x, 0, 1)` draws the bell curve.

**Regression.** Under **Regression of L2 on L1**, choose a model. The fitted equation, its coefficients and r² appear immediately. **Graph this fit** adds the equation as a new graph row; tick **Plot (L1, L2) points** to show the data as dots.

| Model | Form |
| --- | --- |
| Linear | y = ax + b |
| Quadratic | y = ax² + bx + c |
| Exponential | y = a·bˣ |
| Power | y = a·xᵇ |
| Logarithmic | y = a + b·ln x |

Example with L1 = `1, 2, 3, 4, 5` and L2 = `2.1, 3.9, 6.2, 7.8, 10.1`:

| Model | Fitted equation | r² |
| --- | --- | --- |
| Linear | `1.99*x + 0.05` | 0.9973 |
| Quadratic | `0.0214286*x^2 + 1.86143*x + 0.2` | 0.9975 |
| Power | `2.06451*x^0.975385` | 0.9970 |
| Exponential | `1.66283*1.46732^x` | 0.9348 |
| Logarithmic | `1.41924 + 4.80498*log(x)` | 0.9393 |

With L1 = `0, 1, 2, 3` and L2 = `3, 6, 12, 24`, the exponential fit is exactly `3*2^x` with r² = 1. Exponential and power fits need positive y values (and power, positive x); logarithmic needs positive x.

## Matrices, vectors and lists

**Typing matrices.** Write rows in square brackets: `[[1, 2], [3, 4]]` is a 2 × 2 matrix; `[1, 2, 3]` is a vector (list).

| Input | Output |
| --- | --- |
| `det([[1, 2], [3, 4]])` | `-2` |
| `inv([[1, 2], [3, 4]])` | `[[-2, 1], [1.5, -0.5]]` |
| `[[1, 2], [3, 4]]^2` | `[[7, 10], [15, 22]]` (matrix product) |
| `[[1, 2], [3, 4]] * [[5], [6]]` | `[[17], [39]]` |
| `[[1, 2], [3, 4]] .* [[5, 6], [7, 8]]` | `[[5, 12], [21, 32]]` (element by element) |
| `transpose([[1, 2, 3], [4, 5, 6]])` | `[[1, 4], [2, 5], [3, 6]]` |
| `identity(2)` | `[[1, 0], [0, 1]]` |
| `zeros(2, 3)` | `[[0, 0, 0], [0, 0, 0]]` |
| `size([[1, 2, 3], [4, 5, 6]])` | `[2, 3]` |
| `lusolve([[2, 1], [1, 3]], [3, 5])` | `[[0.8], [1.4]]` (solves 2x + y = 3, x + 3y = 5) |

**Vectors**

| Input | Output |
| --- | --- |
| `[1, 2, 3] * 2` | `[2, 4, 6]` |
| `dot([1, 2, 3], [4, 5, 6])` | `32` |
| `cross([1, 0, 0], [0, 1, 0])` | `[0, 0, 1]` |
| `norm([3, 4])` | `5` |

**Matrices tab** (Tools card). Pick a name **A**–**F**, set **Rows** and **Columns** (up to 6 × 6), fill the grid and press **Save as A**. Saved matrices are listed with **Insert**, **Edit** and **Delete** buttons and kept between visits.

Once saved, use the names anywhere:

| Input (with A = \[\[1, 2\], \[3, 4\]\], B = \[\[0, 1\], \[1, 0\]\]) | Output |
| --- | --- |
| `det(A)` | `-2` |
| `A * B` | `[[2, 1], [4, 3]]` |
| `A + B` | `[[1, 3], [4, 4]]` |
| `A^-1` | `[[-2, 1], [1.5, -0.5]]` |

**Common errors.** `det([[1, 2, 3], [4, 5, 6]])` → *Matrix must be square (size: \[2, 3\])*. `[1, 2] + [1, 2, 3]` → *shape mismatch …*.

## Programs

Programs are saved routines with named parameters. Once saved, a program works like a function in expressions, graphs and tables.

**Creating a program.** Tools → **Programs** → **+ New program**. Enter a **Name** (e.g. `sumTo`), **Parameter names** (e.g. `n`), and the body. Save it, then run it with arguments in the panel, or click **Insert into expression** and call it as `sumTo(10)`. When nothing is saved yet, five example programs are provided.

**Language reference.** One statement per line; `#` starts a comment. Any line that isn't a keyword is an ordinary calculator statement.

| Statement | Meaning |
| --- | --- |
| `s = s + i` | Any assignment or expression |
| `for i = 1 to n` … `end` | Counted loop (add `step 2` for another step) |
| `for v in L1` … `end` | Loop over each value of a list |
| `while cond` … `end` | Loop while `cond` is true |
| `if cond` … `elseif cond` … `else` … `end` | Branches (`else if` also works) |
| `print "label", value` | Write a line of output |
| `return value` | End the program with a result |
| `break` / `continue` | Leave the loop / skip to the next pass |

Programs read your variables, functions and other programs, but variables they assign stay inside the program.

**Example programs** (provided by default)

```
# sumTo(n): adds 1 + 2 + … + n
s = 0
for i = 1 to n
  s = s + i
end
return s
```

| Call | Output | Printed |
| --- | --- | --- |
| `sumTo(100)` | `5050` |  |
| `fib(10)` | `55` |  |
| `fib(20)` | `6765` |  |
| `quadratic(1, -3, 2)` | `[2, 1]` | two real roots |
| `quadratic(1, 2, 1)` | `-1` | one repeated root |
| `newton(2)` | `2.09455148154` | step 1 : 2.1, step 2 : 2.0945681211, … |
| `collatz(27)` | `111` |  |
| `sumTo(10) + 1` | `56` |  |

**A program with a list loop**

```
# sumSquares(L): sum of squares of the non-negative values
t = 0
for v in L
  if v < 0
    continue
  end
  t = t + v^2
end
print "total", t
return t
```

`sumSquares([1, -2, 3])` → `10`, printing `total 10`.

**Programs in graphs.** `y = collatz(x)` or `y = sumTo(x)` plot like any function. Graphs call programs many times, so each call there is limited to 2,000 steps (10,000 when plotted in the background); a call that runs longer is left out of the curve.

**Limits and errors**

| Situation | Message |
| --- | --- |
| Endless loop (over 100,000 steps when run directly) | *Line 2: Stopped after 100,000 steps (an endless loop?)* |
| Missing `end` | *bad: Line 1: for has no matching end* |
| Name is a keyword or built-in | *… is reserved* |

Other limits: 64 nested program calls, 500 printed lines per run, 30 saved programs of up to 10,000 characters each.

## History, sharing and saved settings

**History.** Each successful calculation is added to the top of the **History** card (the last 50 are kept).

| Click | Effect |
| --- | --- |
| The expression (left) | Puts it back in the Expression box to edit and re-run |
| `= result` (right) | Inserts the result at the cursor in the Expression box |
| **Clear** | Empties the history |

**Sharing a graph.** The page address always describes the current graph. Click **Copy link to graph** (it changes to *Link copied*) and send the link; opening it shows the same equations, angle mode, 2D/3D view, colours and line styles, window, grid and axis-number settings, and axis titles.

| Graph | Link ends with |
| --- | --- |
| `sin(x)` and `x^2` | `?eq=sin%28x%29&eq=x%5E2` |
| `sin(x)` in DEG mode | `?eq=sin%28x%29&angle=deg` |
| `z = x^2 - y^2` in 3D | `?eq=z+%3D+x%5E2+-+y%5E2&view=3d` |
| `x^2`, dashed, thick, fourth colour | `?eq=x%5E2&st=0.3d3` |
| `sin(x)` with window -π to 2π, -1.5 to 1.5 | `?eq=sin%28x%29&win=-3.141592654%2C6.283185307%2C-1.5%2C1.5` |
| Grid and axis numbers off, x-axis titled "time (s)" | `…&grid=0&nums=0&xl=time+%28s%29` |

Links don't carry variables, functions, slider values, lists, matrices or programs, so equations that use them (such as `y = a x`) need them defined on the other device.

**What is remembered on this device**

| Item | Kept until |
| --- | --- |
| History (50 entries) | You press Clear |
| Angle mode, Exact/Decimal choice | You change them |
| Lists L1, L2 and matrices A–F | You edit or delete them |
| Programs | You delete them |
| Variables, functions and slider values | Page reload (not saved) |
| Slider ranges | Page reload (not saved) |
| Equations, styles, window and axis settings | Kept in the page address; bookmark it to keep them |

All of this is stored in your browser only. Private windows or blocked site storage start fresh each time.

## Error messages and troubleshooting

| Message or symptom | Example input | Cause and fix |
| --- | --- | --- |
| *Undefined symbol foo* | `foo + 1` | The name isn't defined. Assign it first (`foo = 2`) or check spelling (names are case-sensitive) |
| *Undefined function ln* | `ln(5)` | Use `log(5)` for the natural log |
| *Undefined symbol mph* | `60 mph` | Write `60 mi/h` |
| *Unexpected end of expression (char 4)* | `2 +` | The expression is incomplete |
| *Unexpected type of argument …* | `1 min to s` | `min` is the minimum function; use `minute` |
| *Units do not match* | `5 m + 2 s` | You can only add or convert compatible units |
| *tan is undefined at 90°* | `tan(90)` in DEG | tan has no value at odd quarter turns |
| *sin needs an angle, … got a value in rad^-1; write (pi/6) rad …* | `sin(pi/6 rad)` | `pi/6 rad` means `pi / (6 rad)`. Write `sin((pi/6) rad)` |
| *cos needs an angle, such as 30 deg, but got a value in m* | `cos(5 m)` | sin, cos and tan take a plain number or an angle unit (`rad`, `deg`, `grad`) |
| *nDeriv: the expression isn't defined around 0* | `nDeriv(sqrt(x), x, 0)` | The expression must be defined on both sides of the point |
| *nDeriv: the second argument must be a variable name, …* | `nDeriv(x^2, 3, 1)` | Give the variable, then the point: `nDeriv(x^2, x, 3)` |
| *fnInt: no result; is the expression undefined somewhere between -1 and 1?* | `fnInt(log(x), x, -1, 1)` | The expression must be defined across the whole interval |
| *fnInt: the bounds must be finite* | `fnInt(x, x, 0, Infinity)` | Use finite bounds |
| *solve: no root found near 0* | `solve(x^2 + 1, x, 0)` | There may be no real root; try another guess, or a bracket `solve(expr, x, a, b)` |
| *solve: no root found between 2 and 5 (the expression must change sign there)* | `solve(x^2 - 2, x, 2, 5)` | Choose a bracket where the expression changes sign |
| *A vector field has two parts: field(P(x, y), Q(x, y))* | `field(x)` | Give both components |
| *Matrix must be square* | `det([[1,2,3],[4,5,6]])` | Determinant and inverse need square matrices |
| *shape mismatch …* | `[1, 2] + [1, 2, 3]` | Vector and matrix sizes must agree |
| *Function evaluate is disabled* | `evaluate("1+1")` | Some functions are switched off for safety |
| *No result* | `a = 5;` | A trailing `;` hides the result; the assignment still happened |
| *Stopped after 100,000 steps* | A program with an endless loop | Check the loop condition |
| `Infinity` / `NaN` | `1/0`, `0/0` | Division by zero; not an error |

**Graph troubleshooting**

| Symptom | What to check |
| --- | --- |
| Curve doesn't appear | The row may be hidden (click its colour dot), or the curve is outside the window: press **Reset view** |
| Trig curve looks flat or squashed | The angle mode: in DEG, `sin(x)` has period 360; press **Trig view** |
| A note says the calculator's `x` isn't used | You assigned `x` in the calculator. The graph always uses its own x; press **Remove x** or ignore it |
| A `z = …` row draws nothing | Surfaces appear only in the 3D view: press **Show 3D view** |
| No trace, table or key points for a row | Only `y = f(x)` rows support trace, table and key points |
| No slider for a variable | Sliders appear only for numbers used in an equation; graph coordinates (x, y, t, …) never get one |
| Window panel shows -10.5 to 10.5 | The default view adds a margin; apply your own bounds for an exact window |
| Grid or axis numbers missing | They were switched off in the **Window** panel (also kept in shared links) |
| Can't add an equation | The limit is 6 rows; remove one first |
| **Graph this fit** says *Remove an equation first* | Same 6-row limit |
| A graph using a program has gaps | Calls that take too many steps are left out; simplify the program |
| Settings or history gone | You're in a private window, or site data was cleared |
