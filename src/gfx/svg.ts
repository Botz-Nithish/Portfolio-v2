const NS = "http://www.w3.org/2000/svg";

export type Attrs = Record<string, string | number | undefined>;

export const COLOR = {
  ink: "#0B0B0C",
  paper: "#E6E6E3",
  white: "#FFFFFF",
  lime: "#C8FF00",
  cyan: "#00E5FF",
  grey: "#C9C9C4",
  slate: "#9A9A95",
};

export const DISPLAY = '"Archivo Variable", "Arial Narrow", sans-serif';
export const MONO = '"JetBrains Mono Variable", ui-monospace, monospace';

export function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) node.setAttribute(key, String(value));
  }
  parent?.appendChild(node);
  return node;
}

export const group = (parent: Element, attrs: Attrs = {}) => el("g", attrs, parent);

export interface Frame {
  /** Safe frame: everything inside it is always visible. */
  W: number;
  H: number;
  /** What the viewport actually shows, in the same units. At least W by H. */
  vw: number;
  vh: number;
  portrait: boolean;
}

/** One full-viewport SVG per scene. `meet` keeps the safe frame whole; grounds run past it. */
export function sceneSvg(id: string, { W, H }: Frame, stage: Element) {
  const svg = el("svg", {
    id,
    class: "scene",
    viewBox: `0 0 ${W} ${H}`,
    preserveAspectRatio: "xMidYMid meet",
    "aria-hidden": "true",
  });
  stage.appendChild(svg);
  return svg;
}

export interface TextStyle {
  size: number;
  fill?: string;
  family?: string;
  weight?: number;
  stretch?: string;
  spacing?: string;
  anchor?: "start" | "middle" | "end";
  italic?: boolean;
}

export function textAttrs(style: TextStyle): Attrs {
  return {
    fill: style.fill ?? COLOR.ink,
    "font-family": style.family ?? DISPLAY,
    "font-size": style.size,
    "font-weight": style.weight ?? 500,
    "font-stretch": style.stretch,
    "font-style": style.italic ? "italic" : undefined,
    "letter-spacing": style.spacing,
    "text-anchor": style.anchor,
  };
}

export function text(parent: Element, x: number, y: number, content: string, style: TextStyle) {
  const node = el("text", { x, y, ...textAttrs(style) }, parent);
  node.textContent = content;
  return node;
}

let ruler: SVGTextElement | undefined;

/** Measures text in a hidden, attached SVG. Scene SVGs are display:none at build time. */
export function measure(content: string, style: TextStyle) {
  if (!ruler) {
    const svg = el("svg", { style: "position:absolute;width:0;height:0;visibility:hidden" });
    document.body.appendChild(svg);
    ruler = el("text", {}, svg);
  }
  for (const [key, value] of Object.entries(textAttrs(style))) {
    if (value !== undefined) ruler.setAttribute(key, String(value));
  }
  ruler.textContent = content;
  return ruler.getComputedTextLength();
}

export interface PlacedWord {
  word: string;
  x: number;
  y: number;
  width: number;
}

/** Greedy line wrap that keeps every word's position, so words can animate one at a time. */
export function wrap(content: string, maxWidth: number, lineHeight: number, style: TextStyle) {
  const space = measure("n n", style) - measure("nn", style);
  const placed: PlacedWord[] = [];
  let x = 0;
  let y = 0;
  for (const word of content.split(" ")) {
    const width = measure(word, style);
    if (x > 0 && x + width > maxWidth) {
      x = 0;
      y += lineHeight;
    }
    placed.push({ word, x, y, width });
    x += width + space;
  }
  return placed;
}
