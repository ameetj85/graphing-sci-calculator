This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Project Synopsis

Build a full-featured graphing scientific calculator using TypeScript and the latest stable version of Next.js. 

Recommended Tech Stack

To avoid writing complex math parsers and rendering engines from scratch, you can pair Next.js and TypeScript with specialized libraries:
• Math Evaluation Engine. Use Math.js or Nerdamer to safely parse strings (like sin(x) + 2^3) instead of using JavaScript's unsafe eval() function. They handle trigonometry, logarithms, complex numbers, matrices, and symbolic derivatives out of the box.
• Graphing & Plotting. Use Mafs (built specifically for React/Next.js) or Function Plot for interactive, zoomable 2D function graphs. For general data plotting, Plotly.js also works well for 2D and 3D graphs.
• Math Formatting (LaTeX). Use KaTeX or MathLive so users see properly formatted fractions, exponents, and square roots as they type.
• UI & Styling. Use Tailwind CSS and shadcn/ui to build a responsive keypad grid, history panel, and dark mode toggle. [1] (https://dev.to/ro_lax/how-i-built-3-professional-calculators-in-one-weekend-with-nextjs-14-1904)

Key Architecture Tips for Next.js

When building this in the Next.js App Router, keep these architectural details in mind:
• Client Components. Mark your calculator and graph components with 'use client'. Real-time button presses, keyboard shortcuts, and canvas panning require browser-side state (useState, useReducer) and DOM access.
• Zero-Latency Calculations. Run all math evaluations directly in the user's browser rather than sending requests to a Next.js API route. This makes slider adjustments and graph zooming feel instantaneous.
• Web Workers for Heavy Plotting. If you allow users to plot multiple complex equations or implicit functions simultaneously, offload the coordinate calculations to a Web Worker so the UI never freezes.
• Persistent History. Use localStorage or URL query parameters to save calculation history and shareable graph equations. [1] (https://dev.to/danstanhope/compound-interest-calculator-using-chartjs-react-1lac), [2] (https://mudassirkhan.me/blog/build-calculator-nextjs), [3] (https://dev.to/ro_lax/how-i-built-3-professional-calculators-in-one-weekend-with-nextjs-14-1904), [4] (https://www.linkedin.com/posts/addhyan-awasthi-99a07630a_nextjs-tailwindcss-typescript-activity-7316669248615976960-P21S)

Suggested Build Order

1. Basic Evaluator. Set up a Next.js TypeScript project (npx create-next-app@latest), install mathjs, and build a basic text input that evaluates expressions. [1] (https://www.geeksforgeeks.org/reactjs/create-a-calculator-app-using-next-js/), [2] (https://www.youtube.com/watch?v=rftadFuDmC8)
2. Scientific Keypad. Create a responsive CSS Grid of buttons for numbers, operators, and scientific functions (sin, cos, log, π, ^), plus keyboard event listeners. [1] (https://mudassirkhan.me/blog/build-calculator-nextjs), [2] (https://dev.to/ro_lax/how-i-built-3-professional-calculators-in-one-weekend-with-nextjs-14-1904)
3. 2D Canvas Integration. Add a plotting library like mafs or function-plot side-by-side with your keypad to render y = f(x) expressions in real time.
4. Advanced Features. Add support for multiple simultaneous equations, trace/intersection points, degree/radian mode toggles, and calculation history. [1] (https://dev.to/ro_lax/how-i-built-3-professional-calculators-in-one-weekend-with-nextjs-14-1904)


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
