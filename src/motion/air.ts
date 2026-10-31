import gsap from "gsap";
import type { Pt } from "../gfx/shapes";
import { COLOR, el } from "../gfx/svg";
import { F } from "./eases";

type TL = gsap.core.Timeline;

export interface Gust {
  /** Degrees, 0 is right and 90 is down, so a growing angle turns clockwise on screen. */
  from: number;
  sweep: number;
  /** Radius at the start and end of the arc, as a multiple of the wind's radius. */
  start: number;
  end: number;
  width: number;
  /** A wide outlined band instead of a solid line: the body of the gust. */
  band?: boolean;
  /** Frames after the wind starts. */
  delay: number;
}

export interface Wind {
  centre: Pt;
  rx: number;
  ry: number;
}

const SAMPLES = 40;
const SLICES = 22;

function arcPoints({ centre: [cx, cy], rx, ry }: Wind, { from, sweep, start, end }: Gust) {
  return Array.from({ length: SAMPLES }, (_, i): Pt => {
    const t = i / (SAMPLES - 1);
    const angle = ((from + sweep * t) * Math.PI) / 180;
    const grow = start + (end - start) * t;
    return [cx + Math.cos(angle) * rx * grow, cy + Math.sin(angle) * ry * grow];
  });
}

const at = (curve: Pt[], t: number): Pt => {
  const position = Math.min(Math.max(t, 0), 1) * (curve.length - 1);
  const i = Math.min(Math.floor(position), curve.length - 2);
  const f = position - i;
  return [curve[i][0] + (curve[i + 1][0] - curve[i][0]) * f, curve[i][1] + (curve[i + 1][1] - curve[i][1]) * f];
};

/** A stroke between two fractions of a curve, thin at both ends and widest through the middle. */
export function ribbon(curve: Pt[], tail: number, head: number, width: number) {
  if (head - tail < 0.004) return "";
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= SLICES; i++) {
    const u = i / SLICES;
    const t = tail + (head - tail) * u;
    const [x, y] = at(curve, t);
    const [ax, ay] = at(curve, t - 0.01);
    const [bx, by] = at(curve, t + 0.01);
    const length = Math.hypot(bx - ax, by - ay) || 1;
    const half = (width / 2) * Math.pow(Math.sin(Math.PI * u), 0.7);
    const [nx, ny] = [(-(by - ay) / length) * half, ((bx - ax) / length) * half];
    left.push(`${(x + nx).toFixed(1)} ${(y + ny).toFixed(1)}`);
    right.unshift(`${(x - nx).toFixed(1)} ${(y - ny).toFixed(1)}`);
  }
  return `M${left.join("L")}L${right.join("L")}Z`;
}

/**
 * Air: each gust's head runs out along its arc, then its tail catches up and it is gone.
 * Rebuilt from two numbers, so the taper travels and it all stays tied to the scrub.
 * `rider` is carried on the head of the first gust.
 */
export function gust(tl: TL, parent: Element, wind: Wind, gusts: Gust[], start: number, dur: number, rider?: Element) {
  gusts.forEach((g, i) => {
    const curve = arcPoints(wind, g);
    const shape = el(
      "path",
      g.band
        ? { fill: COLOR.paper, stroke: COLOR.ink, "stroke-width": 3, "stroke-linejoin": "round" }
        : { fill: COLOR.ink },
      parent,
    );
    const run = { head: 0, tail: 0 };
    const draw = () => {
      shape.setAttribute("d", ribbon(curve, run.tail, run.head, g.width));
      if (i === 0 && rider) {
        const [x, y] = at(curve, run.head);
        gsap.set(rider, { x, y, rotation: run.head * 420 });
      }
    };
    const begin = start + g.delay;
    tl.to(run, { head: 1, duration: F(dur * 0.62), ease: "power2.out", onUpdate: draw }, F(begin));
    tl.to(run, { tail: 1, duration: F(dur * 0.66), ease: "power2.in", onUpdate: draw }, F(begin + dur * 0.34));
  });
}
