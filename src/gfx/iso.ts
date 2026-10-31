import { dotGrid, dots, poly, type Pt } from "./shapes";
import { COLOR, el, group } from "./svg";

/** Corners of an isometric cube of edge `a` centred on cx, cy. */
export function cubePoints(cx: number, cy: number, a: number) {
  const [hx, hy] = [a * 0.866, a * 0.5];
  return {
    top: [cx, cy - a] as Pt,
    right: [cx + hx, cy - hy] as Pt,
    lowerRight: [cx + hx, cy + hy] as Pt,
    bottom: [cx, cy + a] as Pt,
    lowerLeft: [cx - hx, cy + hy] as Pt,
    left: [cx - hx, cy - hy] as Pt,
    centre: [cx, cy] as Pt,
  };
}

export interface CubeColors {
  top: string;
  left: string;
  right: string;
}

const edge = { stroke: COLOR.ink, "stroke-width": 4, "stroke-linejoin": "round" };

export function drawCube(parent: Element, cx: number, cy: number, a: number, colors: CubeColors) {
  const p = cubePoints(cx, cy, a);
  const root = group(parent);
  const left = el("path", { d: poly([p.left, p.centre, p.bottom, p.lowerLeft]), fill: colors.left, ...edge }, root);
  const right = el("path", { d: poly([p.centre, p.right, p.lowerRight, p.bottom]), fill: colors.right, ...edge }, root);
  const top = el("path", { d: poly([p.top, p.right, p.centre, p.left]), fill: colors.top, ...edge }, root);
  return { root, top, left, right };
}

/** Code lines, grille and ring on the cube's faces. Process and Skills must draw identical art at the seam. */
export function drawCubeDetails(parent: Element, cx: number, cy: number, a: number) {
  const p = cubePoints(cx, cy, a);
  const details = group(parent);
  const skew = (x: number, y: number, m: string) => group(details, { transform: `translate(${x},${y}) matrix(${m})` });
  const code = skew(p.left[0], p.left[1], "0.866,0.5,0,1,0,0");
  [0.8, 0.55, 0.7, 0.4, 0.62].forEach((w, i) =>
    el("rect", { x: a * 0.14, y: a * (0.16 + i * 0.15), width: a * 0.72 * w, height: a * 0.06, fill: COLOR.ink }, code),
  );
  const grille = skew(p.centre[0], p.centre[1], "0.866,-0.5,0,1,0,0");
  el("path", { d: dots(dotGrid(a * 0.16, a * 0.18, 8, 8, a * 0.095), a * 0.018), fill: COLOR.ink }, grille);
  const ring = skew(p.top[0], p.top[1], "0.866,0.5,-0.866,0.5,0,0");
  el("circle", { cx: a * 0.5, cy: a * 0.5, r: a * 0.26, fill: "none", stroke: COLOR.ink, "stroke-width": a * 0.05 }, ring);
  return details;
}

/** A flat slab seen from the same isometric angle. `halfW` is half its width. */
export function drawPlate(parent: Element, cx: number, cy: number, halfW: number, thick: number, face: string) {
  const halfH = halfW * 0.5;
  const root = group(parent);
  el(
    "path",
    { d: poly([[cx - halfW, cy], [cx, cy + halfH], [cx, cy + halfH + thick], [cx - halfW, cy + thick]]), fill: COLOR.grey, ...edge },
    root,
  );
  el(
    "path",
    { d: poly([[cx, cy + halfH], [cx + halfW, cy], [cx + halfW, cy + thick], [cx, cy + halfH + thick]]), fill: COLOR.ink, ...edge },
    root,
  );
  const top = el("path", { d: poly([[cx, cy - halfH], [cx + halfW, cy], [cx, cy + halfH], [cx - halfW, cy]]), fill: face, ...edge }, root);
  // Maps a 0..1 square onto the plate's top face, so patterns can be drawn flat.
  const skin = group(root, {
    transform: `translate(${cx},${cy - halfH}) matrix(${halfW},${halfH},${-halfW},${halfH},0,0)`,
  });
  return { root, top, skin };
}
