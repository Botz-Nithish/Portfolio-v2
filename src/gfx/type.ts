import { WORDS } from "./glyphs.gen";
import { extrude, hatch } from "./shapes";
import { COLOR, el, group } from "./svg";

export interface WordStyle {
  size: number;
  face?: string;
  side?: string;
  outline?: number;
  depth?: [number, number];
  /** Colour of the tick marks across the extrusion. */
  ticks?: string;
  anchor?: "start" | "middle" | "end";
}

export const wordWidth = (word: string, size: number) => (WORDS[word].width * size) / 1000;

/** Display word as drawn outlines, with an optional hard extrusion. */
export function drawWord(parent: Element, word: string, x: number, y: number, style: WordStyle) {
  const { size, face = COLOR.ink, side = COLOR.ink, outline = 0, depth, ticks, anchor = "start" } = style;
  const data = WORDS[word];
  const k = size / 1000;
  const shift = anchor === "start" ? 0 : anchor === "middle" ? -data.width / 2 : -data.width;
  const root = group(parent, { transform: `translate(${x},${y}) scale(${k})` });
  const d = data.glyphs.map((glyph) => shiftPath(glyph.d, glyph.x + shift)).join("");
  if (depth) {
    el("path", { d: extrude(d, depth[0] / k, depth[1] / k), fill: side, stroke: side, "stroke-width": 1.2 / k }, root);
    if (ticks) {
      el("path", { d: hatch(d, depth[0] / k, depth[1] / k, 9 / k), fill: "none", stroke: ticks, "stroke-width": 1.1 / k }, root);
    }
  }
  el(
    "path",
    { d, fill: face, stroke: outline ? side : undefined, "stroke-width": outline ? outline / k : undefined, "stroke-linejoin": "round" },
    root,
  );
  return root;
}

function shiftPath(d: string, dx: number) {
  return d.replace(/([MLQCZ])([^MLQCZ]*)/g, (_, cmd: string, args: string) => {
    const numbers = args.trim().split(/\s+/).filter(Boolean).map(Number);
    const moved = numbers.map((value, i) => (i % 2 === 0 ? Math.round((value + dx) * 10) / 10 : value));
    return cmd + moved.join(" ");
  });
}
