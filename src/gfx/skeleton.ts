import { subpaths, type Pt } from "./shapes";

/** One drawn step of an outline: its end point, and the control point if it is a curve. */
export interface Segment {
  from: Pt;
  to: Pt;
  control?: Pt;
  /** How far along the contour this step ends, 0 to 1. */
  at: number;
}

export interface Contour {
  d: string;
  start: Pt;
  segments: Segment[];
  /** The point at a given fraction of the contour's length. */
  walk: (t: number) => Pt;
}

const SAMPLES = 8;

/** Reads an outline's real points, the ones a font editor would show, for one contour at a time. */
export function skeleton(d: string): Contour[] {
  return subpaths(d).map((sub) => {
    const line: Pt[] = [];
    const lengths = [0];
    const segments: Segment[] = [];
    const advance = (p: Pt) => {
      const last = line[line.length - 1];
      lengths.push(lengths[lengths.length - 1] + Math.hypot(p[0] - last[0], p[1] - last[1]));
      line.push(p);
    };
    let cur: Pt = [0, 0];
    let start: Pt = [0, 0];
    for (const [, cmd, args] of sub.matchAll(/([MLQZ])([^MLQZ]*)/g)) {
      const v = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
      if (cmd === "M") {
        start = cur = [v[0], v[1]];
        line.push(cur);
      } else if (cmd === "L" || cmd === "Z") {
        const to: Pt = cmd === "L" ? [v[0], v[1]] : start;
        if (to[0] === cur[0] && to[1] === cur[1]) continue;
        advance(to);
        segments.push({ from: cur, to, at: lengths[lengths.length - 1] });
        cur = to;
      } else if (cmd === "Q") {
        const control: Pt = [v[0], v[1]];
        const to: Pt = [v[2], v[3]];
        for (let i = 1; i <= SAMPLES; i++) {
          const t = i / SAMPLES;
          const u = 1 - t;
          advance([
            u * u * cur[0] + 2 * u * t * control[0] + t * t * to[0],
            u * u * cur[1] + 2 * u * t * control[1] + t * t * to[1],
          ]);
        }
        segments.push({ from: cur, to, control, at: lengths[lengths.length - 1] });
        cur = to;
      }
    }
    const total = lengths[lengths.length - 1] || 1;
    for (const segment of segments) segment.at /= total;
    const walk = (t: number): Pt => {
      const target = Math.min(Math.max(t, 0), 1) * total;
      let lo = 0;
      let hi = lengths.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (lengths[mid] <= target) lo = mid;
        else hi = mid;
      }
      const span = lengths[hi] - lengths[lo] || 1;
      const f = (target - lengths[lo]) / span;
      return [line[lo][0] + (line[hi][0] - line[lo][0]) * f, line[lo][1] + (line[hi][1] - line[lo][1]) * f];
    };
    return { d: sub, start, segments, walk };
  });
}
