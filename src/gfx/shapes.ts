export type Pt = [number, number];

const n = (v: number) => Math.round(v * 10) / 10;

export const poly = (pts: Pt[]) => `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}Z`;

/** Rounded rectangle with cubic corners, so `flatten` can read it. */
export function rrect(x: number, y: number, w: number, h: number, r: number) {
  const k = r * 0.5523;
  const [R, B] = [x + w, y + h];
  return (
    `M${n(x + r)} ${n(y)}L${n(R - r)} ${n(y)}C${n(R - r + k)} ${n(y)} ${n(R)} ${n(y + r - k)} ${n(R)} ${n(y + r)}` +
    `L${n(R)} ${n(B - r)}C${n(R)} ${n(B - r + k)} ${n(R - r + k)} ${n(B)} ${n(R - r)} ${n(B)}` +
    `L${n(x + r)} ${n(B)}C${n(x + r - k)} ${n(B)} ${n(x)} ${n(B - r + k)} ${n(x)} ${n(B - r)}` +
    `L${n(x)} ${n(y + r)}C${n(x)} ${n(y + r - k)} ${n(x + r - k)} ${n(y)} ${n(x + r)} ${n(y)}Z`
  );
}

function circleSub(cx: number, cy: number, r: number) {
  return `M${n(cx - r)} ${n(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

/** Many dots as one path, one DOM node however many dots there are. */
export const dots = (pts: Pt[], r: number) => pts.map(([x, y]) => circleSub(x, y, r)).join("");

export function dotGrid(x: number, y: number, cols: number, rows: number, gap: number): Pt[] {
  const pts: Pt[] = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) pts.push([x + col * gap, y + row * gap]);
  return pts;
}

export function dotRings(cx: number, cy: number, rings: [radius: number, count: number][]): Pt[] {
  return rings.flatMap(([radius, count]) =>
    Array.from({ length: count }, (_, i): Pt => {
      const a = (i / count) * Math.PI * 2;
      return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
    }),
  );
}

/** Reads the absolute M L Q C Z paths used in this project into polygons. */
export function flatten(d: string, steps = 14): Pt[][] {
  const contours: Pt[][] = [];
  let contour: Pt[] = [];
  let cur: Pt = [0, 0];
  for (const [, cmd, args] of d.matchAll(/([MLQCZ])([^MLQCZ]*)/g)) {
    const v = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (cmd === "M") {
      contour = [[v[0], v[1]]];
      contours.push(contour);
      cur = [v[0], v[1]];
    } else if (cmd === "L") {
      contour.push([v[0], v[1]]);
      cur = [v[0], v[1]];
    } else if (cmd === "Q") {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        contour.push([
          u * u * cur[0] + 2 * u * t * v[0] + t * t * v[2],
          u * u * cur[1] + 2 * u * t * v[1] + t * t * v[3],
        ]);
      }
      cur = [v[2], v[3]];
    } else if (cmd === "C") {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        contour.push([
          u * u * u * cur[0] + 3 * u * u * t * v[0] + 3 * u * t * t * v[2] + t * t * t * v[4],
          u * u * u * cur[1] + 3 * u * u * t * v[1] + 3 * u * t * t * v[3] + t * t * t * v[5],
        ]);
      }
      cur = [v[4], v[5]];
    }
  }
  return contours;
}

const signedArea = (p: Pt[]) =>
  p.reduce((sum, [x, y], i) => {
    const [nx, ny] = p[(i + 1) % p.length];
    return sum + (x * ny - nx * y);
  }, 0);

/** A flattened outline, kept so an extrusion can be rebuilt at any depth without parsing again. */
export interface Outline {
  contours: Pt[][];
  areas: number[];
  sign: number;
}

export function outline(d: string, steps = 14): Outline {
  const contours = flatten(d, steps);
  const areas = contours.map(signedArea);
  const main = areas.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
  return { contours, areas, sign: Math.sign(main) || 1 };
}

/**
 * Hard directional extrusion: the rear face plus one quad per edge, all wound the same way
 * so `nonzero` fills them as a single solid.
 */
export function extrudeOutline({ contours, areas, sign }: Outline, dx: number, dy: number) {
  const parts: string[] = [];
  contours.forEach((contour, i) => {
    const rear = contour.map(([x, y]): Pt => [x + dx, y + dy]);
    parts.push(poly(Math.sign(areas[i]) === sign ? rear : [...rear].reverse()));
    contour.forEach((a, j) => {
      const b = contour[(j + 1) % contour.length];
      const quad: Pt[] = [a, b, [b[0] + dx, b[1] + dy], [a[0] + dx, a[1] + dy]];
      parts.push(poly(Math.sign(signedArea(quad)) === sign ? quad : quad.reverse()));
    });
  });
  return parts.join("");
}

/** Short ticks across every downward-facing edge of an extrusion, spaced evenly along the edge. */
export function hatchOutline({ contours, sign }: Outline, dx: number, dy: number, gap: number) {
  const ticks: string[] = [];
  for (const contour of contours) {
    let carry = 0;
    contour.forEach(([ax, ay], i) => {
      const [bx, by] = contour[(i + 1) % contour.length];
      const [ex, ey] = [bx - ax, by - ay];
      const length = Math.hypot(ex, ey);
      // Outward normal, using the outline's winding. Only edges facing the extrusion get ticks.
      const facing = (ey * dx - ex * dy) * sign;
      if (length === 0 || facing <= 0 || Math.abs(ex) < length * 0.75) {
        carry = 0;
        return;
      }
      for (let at = gap - carry; at < length; at += gap) {
        const t = at / length;
        const [x, y] = [ax + ex * t, ay + ey * t];
        ticks.push(`M${n(x + dx * 0.16)} ${n(y + dy * 0.16)}L${n(x + dx * 0.86)} ${n(y + dy * 0.86)}`);
      }
      carry = (carry + length) % gap;
    });
  }
  return ticks.join("");
}

export const extrude = (d: string, dx: number, dy: number) => extrudeOutline(outline(d), dx, dy);
export const hatch = (d: string, dx: number, dy: number, gap: number) => hatchOutline(outline(d, 8), dx, dy, gap);

/** Splits a path into its subpaths. Font outlines list the outer contour first. */
export const subpaths = (d: string): string[] => d.match(/M[^M]*/g) ?? [];

/** Seeded random, so procedural art never changes between visits. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface ContourOptions {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  gap: number;
  count: number;
  seed: number;
}

/** Topographic rings: a noisy closed curve repeated outward, wobblier with distance. */
export function contourRings({ cx, cy, rx, ry, gap, count, seed }: ContourOptions) {
  const rnd = seeded(seed);
  const waves = [2, 3, 4, 5].map((k) => ({ k, amp: 0.05 + rnd() * 0.09, phase: rnd() * Math.PI * 2 }));
  const samples = 56;
  return Array.from({ length: count }, (_, ring) => {
    const t = ring / (count - 1);
    const points = Array.from({ length: samples }, (_, i): Pt => {
      const a = (i / samples) * Math.PI * 2;
      const wobble = waves.reduce((sum, w) => sum + w.amp * (0.45 + t) * Math.sin(w.k * a + w.phase + t * 0.9), 0);
      const grow = 1 + (ring * gap) / rx;
      return [cx + Math.cos(a) * rx * grow * (1 + wobble), cy + Math.sin(a) * ry * grow * (1 + wobble)];
    });
    return closedCurve(points);
  });
}

/** Catmull-Rom through every point, as cubic Beziers. */
function closedCurve(p: Pt[]) {
  const at = (i: number) => p[(i + p.length) % p.length];
  let d = `M${n(p[0][0])} ${n(p[0][1])}`;
  for (let i = 0; i < p.length; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d +=
      `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ` +
      `${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return `${d}Z`;
}
