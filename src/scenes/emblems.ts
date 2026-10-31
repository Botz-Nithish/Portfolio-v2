import gsap from "gsap";
import { dots, dotGrid, poly, rrect, seeded, type Pt } from "../gfx/shapes";
import { COLOR, MONO, el, group, text } from "../gfx/svg";
import { F } from "../motion/eases";

type Emblem = (g: SVGGElement) => gsap.core.Timeline;

const INK = COLOR.ink;
const PAPER = COLOR.paper;
const LIME = COLOR.lime;
const CYAN = COLOR.cyan;

const popIn = (tl: gsap.core.Timeline, targets: gsap.TweenTarget, at: number, stagger = 1.2, dur = 12) => {
  gsap.set(targets, { scale: 0, transformOrigin: "50% 50%" });
  tl.to(targets, { scale: 1, duration: F(dur), ease: "back.out(2.2)", stagger: F(stagger) }, F(at));
};

const drawIn = (tl: gsap.core.Timeline, targets: gsap.TweenTarget, at: number, stagger = 1, dur = 14) => {
  gsap.set(targets, { drawSVG: "0%" });
  tl.to(targets, { drawSVG: "100%", duration: F(dur), ease: "soft", stagger: F(stagger) }, F(at));
};

/** ZINGBOT: messages run through a visual workflow. */
const zingbot: Emblem = (g) => {
  const tl = gsap.timeline();
  const nodes: [number, number, number, string][] = [
    [-190, -150, 130, PAPER],
    [-60, -10, 150, LIME],
    [120, -150, 130, PAPER],
    [130, 130, 130, CYAN],
    [-200, 130, 130, PAPER],
  ];
  const links = [
    "M-125 -120V-60Q-125 -40 -105 -40H-60",
    "M15 -46V-90Q15 -120 45 -120H55",
    "M90 -10H165Q195 -10 195 20V100",
    "M-60 26H-110Q-135 26 -135 50V100",
  ].map((d) => el("path", { d, fill: "none", stroke: PAPER, "stroke-width": 3 }, g));
  const boxes = nodes.map(([x, y, w, fill]) => {
    const box = group(g);
    el("path", { d: rrect(x, y - 36, w, 72, 14), fill }, box);
    el("rect", { x: x + 16, y: y - 18, width: w * 0.5, height: 7, fill: INK }, box);
    el("rect", { x: x + 16, y: y - 2, width: w * 0.68, height: 7, fill: INK, opacity: 0.5 }, box);
    el("rect", { x: x + 16, y: y + 14, width: w * 0.32, height: 7, fill: INK, opacity: 0.5 }, box);
    return box;
  });
  const bubble = group(g);
  el("path", { d: rrect(-36, -24, 72, 44, 14), fill: CYAN }, bubble);
  el("path", { d: poly([[-16, 18], [-22, 36], [4, 18]]), fill: CYAN }, bubble);
  [-16, 0, 16].forEach((x) => el("circle", { cx: x, cy: -2, r: 4.5, fill: INK }, bubble));
  popIn(tl, boxes, 0, 2.6);
  drawIn(tl, links, 8, 2);
  gsap.set(bubble, { x: -125, y: -220, scale: 0, transformOrigin: "50% 50%" });
  tl.to(bubble, { scale: 1, duration: F(8), ease: "back.out(2)" }, F(14));
  tl.to(bubble, { x: 15, y: -90, duration: F(12), ease: "soft" }, F(22));
  tl.to(bubble, { x: 195, y: 40, duration: F(12), ease: "soft" }, F(32));
  return tl;
};

/** WMS: bays fill up, with one badge for each of the 8 user roles. */
const wms: Emblem = (g) => {
  const tl = gsap.timeline();
  const rnd = seeded(3);
  const [cols, rows, cw, ch] = [5, 4, 88, 84];
  const [x0, y0] = [(-cols * cw) / 2, (-rows * ch) / 2 - 34];
  const frame = el("path", { d: `M${x0} ${y0}H${-x0}V${y0 + rows * ch}H${x0}Z` + Array.from({ length: rows - 1 }, (_, r) => `M${x0} ${y0 + (r + 1) * ch}H${-x0}`).join("") + Array.from({ length: cols - 1 }, (_, c) => `M${x0 + (c + 1) * cw} ${y0}V${y0 + rows * ch}`).join(""), fill: "none", stroke: PAPER, "stroke-width": 3 }, g);
  const stock: SVGElement[] = [];
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = 0; c < cols; c++) {
      if (rnd() < 0.2) continue;
      const roll = rnd();
      const fill = roll < 0.16 ? LIME : roll < 0.3 ? CYAN : PAPER;
      const h = 34 + rnd() * 30;
      const w = 50 + rnd() * 22;
      stock.push(el("rect", { x: x0 + c * cw + (cw - w) / 2, y: y0 + (r + 1) * ch - h, width: w, height: h, fill }, g));
    }
  }
  drawIn(tl, frame, 0, 0, 16);
  gsap.set(stock, { scaleY: 0, transformOrigin: "50% 100%" });
  tl.to(stock, { scaleY: 1, duration: F(9), ease: "back.out(1.8)", stagger: F(0.7) }, F(8));
  const roles = Array.from({ length: 8 }, (_, i) => el("circle", { cx: -196 + i * 56, cy: 196, r: 15, fill: i < 2 ? LIME : PAPER }, g));
  popIn(tl, roles, 18, 1);
  return tl;
};

/** PIXELPIPE: a heavy image squeezes through the pipe at a fifth of its weight. */
const pixelpipe: Emblem = (g) => {
  const tl = gsap.timeline();
  el("path", { d: "M-60 -210C-4 -210 -10 -46 60 -46H250M-60 210C-4 210 -10 46 60 46H250", fill: "none", stroke: PAPER, "stroke-width": 3 }, g);
  const pixels: SVGRectElement[] = [];
  const tints = [PAPER, LIME, PAPER, CYAN, PAPER, PAPER];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 5; c++) {
      const rect = el("rect", { x: -230 + c * 34, y: -102 + r * 34, width: 30, height: 30, fill: tints[(r * 2 + c) % 6] }, g);
      pixels.push(rect);
    }
  }
  gsap.set(pixels, { transformOrigin: "50% 50%" });
  tl.from(pixels, { scale: 0, duration: F(8), ease: "back.out(2)", stagger: F(0.3) }, 0);
  tl.to(pixels, {
    x: (i: number) => 330 - (i % 5) * 28,
    y: (i: number) => 18 - Math.floor(i / 5) * 7,
    scale: 0.2,
    duration: F(14),
    ease: "soft",
    stagger: F(0.3),
  }, F(10));
  const label = text(g, 128, -86, "5×", { size: 62, weight: 900, stretch: "125%", fill: LIME });
  popIn(tl, label, 26);
  return tl;
};

/** V-MEET: one click deploys a whole class of virtual machines. */
const vmeet: Emblem = (g) => {
  const tl = gsap.timeline();
  const a = 58;
  const cube = (cx: number, cy: number, top: string) => {
    const c = group(g);
    const [hx, hy] = [a * 0.866, a * 0.5];
    el("path", { d: poly([[cx, cy - a], [cx + hx, cy - hy], [cx, cy], [cx - hx, cy - hy]]), fill: top, stroke: INK, "stroke-width": 2 }, c);
    el("path", { d: poly([[cx - hx, cy - hy], [cx, cy], [cx, cy + a], [cx - hx, cy + hy]]), fill: PAPER, stroke: INK, "stroke-width": 2 }, c);
    el("path", { d: poly([[cx, cy], [cx + hx, cy - hy], [cx + hx, cy + hy], [cx, cy + a]]), fill: COLOR.slate, stroke: INK, "stroke-width": 2 }, c);
    return c;
  };
  const cells: SVGGElement[] = [];
  for (let sum = 0; sum < 5; sum++) {
    for (let col = 0; col < 3; col++) {
      const row = sum - col;
      if (row < 0 || row > 2) continue;
      cells.push(cube((col - row) * 100, (col + row - 2) * 58 - 10, sum % 2 ? CYAN : LIME));
    }
  }
  popIn(tl, cells, 2, 2);
  const ring = el("circle", { cx: 0, cy: 0, r: 240, fill: "none", stroke: PAPER, "stroke-width": 2, "stroke-dasharray": "4 12" }, g);
  gsap.set(ring, { transformOrigin: "50% 50%", scale: 0.2, autoAlpha: 0 });
  tl.set(ring, { autoAlpha: 1 }, 0);
  tl.to(ring, { scale: 1, rotation: 40, duration: F(26), ease: "snap" }, 0);
  return tl;
};

/** NEURORYTHM: brainwave bands, Delta to Gamma, resolve into a MIDI piano roll. */
const neurorythm: Emblem = (g) => {
  const tl = gsap.timeline();
  const rnd = seeded(9);
  const waves = [1.5, 3, 6, 12].map((cycles, band) => {
    let d = "";
    for (let x = -250; x <= 250; x += 6) {
      const y = -176 + band * 46 + Math.sin(((x + 250) / 500) * cycles * Math.PI * 2) * (17 - band * 2) * (0.6 + rnd() * 0.6);
      d += `${d ? "L" : "M"}${x} ${y.toFixed(1)}`;
    }
    return el("path", { d, fill: "none", stroke: band === 3 ? CYAN : PAPER, "stroke-width": 2.6 }, g);
  });
  drawIn(tl, waves, 0, 3, 16);
  const notes: SVGRectElement[] = [];
  let x = -250;
  while (x < 230) {
    const w = 26 + rnd() * 54;
    const row = Math.floor(rnd() * 7);
    notes.push(el("rect", { x, y: 40 + row * 26, width: w, height: 18, rx: 3, fill: rnd() < 0.3 ? CYAN : LIME }, g));
    x += w * (0.5 + rnd() * 0.6);
  }
  gsap.set(notes, { scaleX: 0, transformOrigin: "0% 50%" });
  tl.to(notes, { scaleX: 1, duration: F(6), ease: "soft", stagger: F(0.9) }, F(14));
  el("line", { x1: -260, x2: 260, y1: 16, y2: 16, stroke: COLOR.slate, "stroke-width": 1.5 }, g);
  return tl;
};

/** SCHOLAR: a citation graph grows out from one author. */
const scholar: Emblem = (g) => {
  const tl = gsap.timeline();
  const rnd = seeded(14);
  const lines: SVGElement[] = [];
  const nodes: SVGElement[] = [];
  const ring = (count: number, radius: number, from: Pt[] | null) => {
    const pts: Pt[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + radius;
      const r = radius * (0.9 + rnd() * 0.22);
      const p: Pt = [Math.cos(a) * r, Math.sin(a) * r];
      pts.push(p);
      const [ox, oy] = from ? from[Math.floor((i / count) * from.length)] : [0, 0];
      lines.push(el("line", { x1: ox, y1: oy, x2: p[0], y2: p[1], stroke: PAPER, "stroke-width": 1.8 }, g));
      nodes.push(el("circle", { cx: p[0], cy: p[1], r: 7 + rnd() * 15, fill: rnd() < 0.22 ? CYAN : PAPER }, g));
    }
    return pts;
  };
  const inner = ring(6, 120, null);
  ring(14, 228, inner);
  const hub = el("circle", { r: 40, fill: LIME }, g);
  g.appendChild(hub);
  popIn(tl, hub, 0, 0, 14);
  drawIn(tl, lines, 4, 0.7, 10);
  popIn(tl, nodes, 8, 0.8, 10);
  return tl;
};

/** KALLOS: a faceted gem, the 1st-place e-commerce concept. */
const kallos: Emblem = (g) => {
  const tl = gsap.timeline();
  const top = -120;
  const girdle = -30;
  const tip = 200;
  const row: Pt[] = [[-230, girdle], [-120, girdle], [0, girdle], [120, girdle], [230, girdle]];
  const crown: Pt[] = [[-140, top], [0, top], [140, top]];
  const tris: [Pt[], string][] = [
    [[row[0], crown[0], row[1]], PAPER],
    [[crown[0], row[1], row[2]], LIME],
    [[crown[0], crown[1], row[2]], PAPER],
    [[crown[1], crown[2], row[2]], COLOR.slate],
    [[crown[2], row[2], row[3]], PAPER],
    [[crown[2], row[3], row[4]], LIME],
    [[row[0], row[1], [0, tip]], COLOR.slate],
    [[row[1], row[2], [0, tip]], PAPER],
    [[row[2], row[3], [0, tip]], LIME],
    [[row[3], row[4], [0, tip]], COLOR.slate],
  ];
  const facets = tris.map(([pts, fill]) => el("path", { d: poly(pts), fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g));
  gsap.set(facets, { transformOrigin: "50% 50%", scale: 0, rotation: -40 });
  tl.to(facets, { scale: 1, rotation: 0, duration: F(14), ease: "back.out(1.6)", stagger: F(1.4) }, 0);
  const glints = ([[-210, -170], [206, -196], [262, 60]] as Pt[]).map(([x, y]) => {
    const s = 26;
    return el("path", { d: `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`, fill: CYAN }, g);
  });
  popIn(tl, glints, 18, 3);
  return tl;
};

/** FINSOL: the legacy app's shield is taken apart and rebuilt as orbiting components. */
const finsol: Emblem = (g) => {
  const tl = gsap.timeline();
  const hex = poly(Array.from({ length: 6 }, (_, i): Pt => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a) * 180, Math.sin(a) * 180];
  }));
  const shield = el("path", { d: hex, fill: "none", stroke: COLOR.slate, "stroke-width": 16, "stroke-linejoin": "round" }, g);
  const old = text(g, 0, 22, "ng", { size: 86, family: MONO, weight: 700, fill: COLOR.slate, anchor: "middle" });
  gsap.set([shield, old], { transformOrigin: "50% 50%" });
  drawIn(tl, shield, 0, 0, 12);
  tl.to([shield, old], { scale: 0.5, rotation: 60, autoAlpha: 0, duration: F(12), ease: "power2.in" }, F(14));
  const orbits = [0, 60, 120].map((angle) =>
    el("ellipse", { rx: 236, ry: 92, fill: "none", stroke: PAPER, "stroke-width": 4, transform: `rotate(${angle})` }, g),
  );
  drawIn(tl, orbits, 20, 3, 14);
  const nucleus = el("circle", { r: 34, fill: LIME }, g);
  popIn(tl, nucleus, 22, 0, 12);
  const electrons = ([[236, 0], [-118, -204], [-118, 204]] as Pt[]).map(([x, y]) => el("circle", { cx: x, cy: y, r: 13, fill: CYAN }, g));
  popIn(tl, electrons, 28, 1.5, 10);
  return tl;
};

export const EMBLEMS: Record<string, Emblem> = { zingbot, wms, pixelpipe, vmeet, neurorythm, scholar, kallos, finsol };

export const gridBackdrop = (w: number, h: number) => dots(dotGrid(-w / 2 + 16, -h / 2 + 16, Math.floor(w / 32), Math.floor(h / 32), 32), 1.1);
