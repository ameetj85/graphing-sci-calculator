import katex from "katex";
import { useMemo } from "react";

type TexProps = {
  tex: string;
  display?: boolean;
  className?: string;
};

/** Renders a TeX string with KaTeX. Invalid TeX renders as red source text. */
export function Tex({ tex, display = false, className }: TexProps) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: display, throwOnError: false, trust: false }),
    [tex, display],
  );
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
