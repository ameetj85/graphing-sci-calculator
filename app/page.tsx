import { Calculator } from "@/components/calculator/Calculator";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Graphing Scientific Calculator</h1>
        <p className="text-sm text-zinc-500">
          Type an expression and press Enter. Define variables with <code>a = 3</code> or functions with{" "}
          <code>f(x) = x^2</code>; the last result is available as <code>ans</code>. Separate multiple statements
          with <code>;</code>, as in <code>r = 2; pi r^2</code>.
        </p>
      </header>
      <Calculator />
    </main>
  );
}
