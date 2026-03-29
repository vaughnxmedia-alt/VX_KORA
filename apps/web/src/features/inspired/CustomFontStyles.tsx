import type { CustomFont } from "./fonts";

export function CustomFontStyles({ fonts }: { fonts: CustomFont[] }) {
  if (fonts.length === 0) return null;
  const css = fonts
    .map(
      (f) =>
        `@font-face{font-family:${f.fontFamily};src:url("${f.url}") format("${f.format ?? "truetype"}");font-display:swap;}`
    )
    .join("\n");
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
