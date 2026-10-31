import gsap from "gsap";
import { phases } from "../content/process";
import { cubePoints, drawCube, drawCubeDetails } from "../gfx/iso";
import { poly, seeded, type Pt } from "../gfx/shapes";
import { COLOR, MONO, el, group, sceneSvg, text, wrap, type Frame, type TextStyle } from "../gfx/svg";
import { drawWord, wordWidth } from "../gfx/type";
import { F, persp } from "../motion/eases";
import { slam } from "../motion/kit";

const PHASE = 52;
const OPEN = 6;
const LAUNCH = OPEN + PHASE * phases.length;
export const PROCESS_LENGTH = LAUNCH + 26;

const { ink: INK, paper: PAPER, lime: LIME, cyan: CYAN, grey: GREY, slate: SLATE, white: WHITE } = COLOR;

export const SHIPPED_CUBE = {
  landscape: { x: 1070, y: 268, a: 62 },
  portrait: { x: 450, y: 250, a: 58 },
};

/** Fog on black, blueprint on cyan, build on paper, ship on black. */
const MOODS = [
  { ground: INK, fg: PAPER, face: LIME, side: PAPER },
  { ground: CYAN, fg: INK, face: PAPER, side: INK },
  { ground: PAPER, fg: INK, face: LIME, side: INK },
  { ground: INK, fg: PAPER, face: LIME, side: PAPER },
];

const LANDSCAPE = {
  cube: [1060, 440] as Pt,
  a: 168,
  copy: { x: 110, y: 270, width: 480, wordMax: 84, wordFit: 490, body: 23, line: 33 },
};
const PORTRAIT = {
  cube: [450, 470] as Pt,
  a: 170,
  copy: { x: 70, y: 880, width: 760, wordMax: 96, wordFit: 760, body: 31, line: 43 },
};

/** The centre of the Discover radar. The title's O flies onto this point. */
export const radarCentre = (portrait: boolean) => (portrait ? PORTRAIT : LANDSCAPE).cube;

export function buildProcess(frame: Frame, stage: Element, root: HTMLElement) {
  const { W, H, vw, vh, portrait } = frame;
  const L = portrait ? PORTRAIT : LANDSCAPE;
  const [cx, cy] = L.cube;
  const a = L.a;
  const svg = sceneSvg("process", frame, stage);
  const film = gsap.timeline({ defaults: { ease: "none" } });
  const rnd = seeded(61);
  const at = (phase: number) => OPEN + phase * PHASE;
  const [padX, padY] = [(vw - W) / 2, (vh - H) / 2];

  const ground = el("rect", { x: -vw, y: -vh, width: vw * 3, height: vh * 3, fill: INK }, svg);

  // Discover: a radar sweeps the fog, looking for the real problem.
  const radar = group(svg, { transform: `translate(${cx},${cy})` });
  const radii = portrait ? [90, 180, 270, 360] : [108, 216, 324, 432];
  const scopeRings = radii.map((r, i) => el("circle", { r, fill: "none", stroke: PAPER, "stroke-width": i === 3 ? 2.4 : 1.2 }, radar));
  gsap.set(scopeRings, { drawSVG: "0%", rotation: -90, transformOrigin: "50% 50%" });
  film.to(scopeRings, { drawSVG: "100%", duration: F(16), ease: "soft", stagger: F(1.6) }, F(1));
  const span = radii[3];
  const cross = [`M${-span} 0H${span}`, `M0 ${-span}V${span}`].map((d) => el("path", { d, fill: "none", stroke: PAPER, "stroke-width": 1.2 }, radar));
  gsap.set(cross, { drawSVG: "50% 50%" });
  film.to(cross, { drawSVG: "0% 100%", duration: F(14), ease: "soft" }, F(3));
  const sweep = group(radar);
  const wedge = (degrees: number, opacity: number) => {
    const end = (-degrees * Math.PI) / 180;
    el("path", { d: `M0 0L${span} 0A${span} ${span} 0 0 0 ${(Math.cos(end) * span).toFixed(1)} ${(Math.sin(end) * span).toFixed(1)}Z`, fill: LIME, opacity }, sweep);
  };
  wedge(70, 0.16);
  wedge(40, 0.26);
  wedge(16, 0.5);
  el("line", { x1: 0, y1: 0, x2: span, y2: 0, stroke: LIME, "stroke-width": 5 }, sweep);
  gsap.set(sweep, { svgOrigin: "0 0", rotation: -130, scale: 0 });
  film.to(sweep, { scale: 1, duration: F(10), ease: "back.out(1.6)" }, F(2));
  film.to(sweep, { rotation: 590, duration: F(at(1) - 4), ease: "none" }, F(2));

  // Blips ping as the sweep crosses them.
  for (let i = 0; i < 12; i++) {
    const angle = rnd() * Math.PI * 2;
    const r = span * (0.25 + rnd() * 0.65);
    const blip = el("circle", { cx: Math.cos(angle) * r, cy: Math.sin(angle) * r, r: 9 + rnd() * 9, fill: i % 3 ? CYAN : LIME }, radar);
    gsap.set(blip, { transformOrigin: "50% 50%", scale: 0 });
    const hit = 6 + rnd() * (PHASE - 16);
    film.to(blip, { scale: 1.3, duration: F(3), ease: "back.out(3)" }, F(hit));
    film.to(blip, { scale: 0.7, duration: F(16), ease: "none" }, F(hit + 3));
  }

  // Each phase opens as an iris from the cube, in the next ground colour.
  const reach = Math.hypot(Math.max(cx + padX, W - cx + padX), Math.max(cy + padY, H - cy + padY));
  [1, 2, 3].forEach((phase) => {
    const iris = el("circle", { cx, cy, r: 40, fill: MOODS[phase].ground }, svg);
    gsap.set(iris, { svgOrigin: `${cx} ${cy}`, scale: 0 });
    film.to(iris, { scale: (reach * 1.1) / 40, duration: F(12), ease: persp(0.06) }, F(at(phase) - 12));
    film.set(iris, { display: "none" }, F(at(phase)));
    film.set(ground, { attr: { fill: MOODS[phase].ground } }, F(at(phase)));
    film.set(root, { "--chrome-ink": MOODS[phase].fg }, F(at(phase) - 1));
  });
  film.set(radar, { display: "none" }, F(at(1)));

  // Isometric floor, so the cube has somewhere to stand.
  const floorPath: string[] = [];
  for (let i = -9; i <= 9; i++) {
    const s = i * 86;
    floorPath.push(`M${cx + s * 0.866 - 860} ${cy + a + s * 0.5 + 430}L${cx + s * 0.866 + 860} ${cy + a + s * 0.5 - 430}`);
    floorPath.push(`M${cx + s * 0.866 - 860} ${cy + a - s * 0.5 - 430}L${cx + s * 0.866 + 860} ${cy + a - s * 0.5 + 430}`);
  }
  const floorLines = el("path", { d: floorPath.join(""), fill: "none", stroke: INK, "stroke-width": 1 }, svg);
  gsap.set(floorLines, { opacity: 0 });
  film.to(floorLines, { opacity: 0.2, duration: F(14) }, F(at(1) + 2));
  film.to(floorLines, { opacity: 0, duration: F(6) }, F(at(3) - 8));
  film.set(floorLines, { attr: { stroke: WHITE } }, F(at(3)));
  film.to(floorLines, { opacity: 0.12, duration: F(10) }, F(at(3) + 2));

  // Live numbers rise behind the cube once it ships.
  const metrics = group(svg);
  const chartX = cx - (portrait ? 400 : 430);
  const chartW = portrait ? 800 : 860;
  const bars = Array.from({ length: 11 }, (_, i) => {
    const h = 60 + i * i * 3.2 + rnd() * 30;
    const bar = el("rect", { x: chartX + i * (chartW / 11), y: cy + a + 120 - h, width: chartW / 11 - 10, height: h, fill: i > 7 ? LIME : SLATE }, metrics);
    gsap.set(bar, { scaleY: 0, transformOrigin: "50% 100%" });
    return bar;
  });
  film.to(bars, { scaleY: 1, duration: F(10), ease: "back.out(1.6)", stagger: F(1.5) }, F(at(3) + 6));

  const fog = group(svg);
  const p = cubePoints(cx, cy, a);
  const edges: [Pt, Pt][] = [
    [p.top, p.right], [p.right, p.centre], [p.centre, p.left], [p.left, p.top],
    [p.left, p.lowerLeft], [p.lowerLeft, p.bottom], [p.bottom, p.lowerRight], [p.lowerRight, p.right],
    [p.centre, p.bottom],
  ];
  const motes = Array.from({ length: 170 }, () => {
    const angle = rnd() * Math.PI * 2;
    const radius = Math.sqrt(rnd());
    const x = cx + Math.cos(angle) * radius * span * 0.98;
    const y = cy + Math.sin(angle) * radius * span * 0.98;
    const mote = el("circle", { cx: x, cy: y, r: 2 + rnd() * 5, fill: rnd() < 0.1 ? CYAN : PAPER }, fog);
    const [start, end] = edges[Math.floor(rnd() * edges.length)];
    const t = rnd();
    const target: Pt = [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
    return { mote, dx: target[0] - x, dy: target[1] - y, driftX: (rnd() - 0.5) * 70, driftY: (rnd() - 0.5) * 70 };
  });
  const moteEls = motes.map((m) => m.mote);
  gsap.set(moteEls, { transformOrigin: "50% 50%", scale: 0 });
  film.to(moteEls, { scale: 1, duration: F(10), ease: "back.out(2)", stagger: { each: F(0.06), from: "random" } }, 0);
  motes.forEach((m) => {
    film.to(m.mote, { x: m.driftX, y: m.driftY, duration: F(PHASE - 12), ease: "none" }, F(OPEN));
    // Architect: each mote snaps onto an edge of the blueprint.
    film.to(m.mote, { x: m.dx, y: m.dy, duration: F(20), ease: "soft" }, F(at(1) - 8 + rnd() * 6));
  });
  film.to(moteEls, { autoAlpha: 0, duration: F(10) }, F(at(1) + 22));

  // Architect: the blueprint draws itself between the dots.
  const blueprint = group(svg);
  const wires = edges.map(([start, end]) =>
    el("line", { x1: start[0], y1: start[1], x2: end[0], y2: end[1], stroke: INK, "stroke-width": 3.4, "stroke-linecap": "round" }, blueprint),
  );
  gsap.set(wires, { drawSVG: "0%" });
  film.to(wires, { drawSVG: "100%", duration: F(14), ease: "soft", stagger: F(1.2) }, F(at(1) + 4));

  // Dimension lines and module callouts.
  const callouts: [Pt, string, number][] = [
    [p.right, "api/", 1],
    [p.left, "schema/", -1],
    [p.bottom, "services/", 1],
  ];
  const calloutGroups = callouts.map(([[x, y], label, side]) => {
    const c = group(blueprint);
    const lead = 66 * side;
    const size = portrait ? 22 : 14;
    const tagW = label.length * size * 0.66 + 22;
    el("path", { d: `M${x} ${y}L${x + lead} ${y - 40}H${x + lead * 1.6}`, fill: "none", stroke: INK, "stroke-width": 2 }, c);
    const tagX = side > 0 ? x + lead * 1.6 : x + lead * 1.6 - tagW;
    el("rect", { x: tagX, y: y - 40 - size, width: tagW, height: size * 2, fill: INK }, c);
    text(c, tagX + 11, y - 40 + size * 0.36, label, { size, family: MONO, weight: 700, fill: CYAN });
    return c;
  });
  gsap.set(calloutGroups, { autoAlpha: 0, scale: 0.7, transformOrigin: "50% 50%" });
  film.to(calloutGroups, { autoAlpha: 1, scale: 1, duration: F(8), ease: "back.out(2)", stagger: F(4) }, F(at(1) + 14));
  const dimRing = el("ellipse", { cx, cy: cy + a, rx: a * 1.5, ry: a * 0.75, fill: "none", stroke: INK, "stroke-width": 2.4, "stroke-dasharray": "4 10" }, blueprint);
  gsap.set(dimRing, { drawSVG: "0%" });
  film.to(dimRing, { drawSVG: "100%", duration: F(22), ease: "soft" }, F(at(1) + 6));

  // Build: a hard shadow, then faces slam on. The wires stay until solid forms replace them.
  const shadow = el("path", { d: poly([[p.lowerRight[0], p.lowerRight[1]], [p.bottom[0], p.bottom[1]], [p.bottom[0] + 190, p.bottom[1] + 24], [p.lowerRight[0] + 210, p.lowerRight[1] + 34]]), fill: INK }, svg);
  gsap.set(shadow, { autoAlpha: 0 });
  film.set(shadow, { autoAlpha: 1 }, F(at(2) + 20));
  film.set(shadow, { autoAlpha: 0 }, F(at(3) - 2));

  const launcher = group(svg);
  const trail = el("path", { d: `M-7 40Q0 -60 7 40V${H * 2.6}H-7Z`, fill: PAPER }, group(launcher, { transform: `translate(${cx},${cy})` }));
  gsap.set(trail, { autoAlpha: 0, svgOrigin: "0 0" });

  const cube = drawCube(launcher, cx, cy, a, { top: PAPER, left: GREY, right: SLATE });
  const details = drawCubeDetails(cube.root, cx, cy, a);

  const faces = [cube.left, cube.right, cube.top];
  gsap.set([...faces, details], { autoAlpha: 0 });
  const slamFrom: gsap.TweenVars[] = [
    { x: -180, y: 110 },
    { x: 180, y: 110 },
    { y: -200 },
  ];
  faces.forEach((face, i) => {
    gsap.set(face, slamFrom[i]);
    film.set(face, { autoAlpha: 1 }, F(at(2) + 6 + i * 7));
    film.to(face, { x: 0, y: 0, duration: F(13), ease: "snap" }, F(at(2) + 6 + i * 7));
  });
  film.set(details, { autoAlpha: 1 }, F(at(2) + 28));
  film.set([...wires, dimRing, ...calloutGroups], { autoAlpha: 0 }, F(at(2) + 28));

  // Ship: the object goes live.
  const live = at(3) + 4;
  film.to(faces, { attr: { fill: LIME }, duration: F(4), stagger: F(2.4) }, F(live));
  [0, 7, 14].forEach((delay) => {
    const ring = el("ellipse", { cx, cy: cy + a, rx: a, ry: a * 0.5, fill: "none", stroke: delay ? PAPER : LIME, "stroke-width": 3 }, metrics);
    gsap.set(ring, { transformOrigin: "50% 50%", scale: 0.6, autoAlpha: 0 });
    film.set(ring, { autoAlpha: 1 }, F(live + delay));
    film.to(ring, { scale: 2.8, autoAlpha: 0, duration: F(24), ease: "settle" }, F(live + delay));
  });

  // Copy. One panel per phase, still during its beat.
  const C = L.copy;
  phases.forEach((phase, i) => {
    const mood = MOODS[i];
    const bodyStyle: TextStyle = { size: C.body, weight: 500, stretch: "90%", fill: mood.fg };
    const panel = group(group(svg, { transform: `translate(${C.x},${C.y})` }));
    const label = text(panel, 0, 0, `PHASE ${String(i + 1).padStart(2, "0")}`, {
      size: portrait ? 24 : 14,
      family: MONO,
      weight: 700,
      fill: mood.fg,
      spacing: "0.1em",
    });
    const size = Math.min(C.wordMax, (C.wordFit / wordWidth(phase.word, 1000)) * 1000);
    const word = group(panel);
    drawWord(word, phase.word, -3, size + 18, { size, face: mood.face, side: mood.side, outline: 2.4, depth: [6, 10], ticks: mood.ground });
    let y = size + 76;
    const details2 = group(panel);
    const placed = wrap(phase.text, C.width, C.line, bodyStyle);
    placed.forEach((w) => text(details2, w.x, y + w.y, w.word, bodyStyle));
    y += placed.at(-1)!.y + C.line + 14;
    let chipX = 0;
    let chipY = y;
    const chipSize = portrait ? 24 : 13;
    phase.chips.forEach((chip) => {
      const width = chip.length * chipSize * 0.62 + 28;
      if (chipX + width > C.width) {
        chipX = 0;
        chipY += chipSize * 3;
      }
      el("rect", { x: chipX, y: chipY, width, height: chipSize * 2.3, rx: chipSize * 1.15, fill: "none", stroke: mood.fg, "stroke-width": 1.5 }, details2);
      text(details2, chipX + 14, chipY + chipSize * 1.5, chip, { size: chipSize, family: MONO, weight: 500, fill: mood.fg });
      chipX += width + 8;
    });

    const start = at(i) + 3;
    gsap.set(panel, { autoAlpha: 0 });
    film.set(panel, { autoAlpha: 1 }, F(start));
    gsap.set(label, { autoAlpha: 0 });
    film.set(label, { autoAlpha: 1 }, F(start + 2));
    slam(film, word, start, -700, -12, 15);
    gsap.set(details2, { autoAlpha: 0, y: 22 });
    film.to(details2, { autoAlpha: 1, y: 0, duration: F(9), ease: "settle" }, F(start + 8));
    film.to(panel, { x: -60, autoAlpha: 0, duration: F(6), ease: "power2.in" }, F(at(i + 1) - 13));
  });

  // Launch: the cube climbs to where Skills will catch it, and its contrail fills the frame with paper.
  const target = portrait ? SHIPPED_CUBE.portrait : SHIPPED_CUBE.landscape;
  gsap.set(launcher, { svgOrigin: `${cx} ${cy}` });
  film.to(cube.root, {
    x: target.x - cx,
    y: target.y - cy,
    scale: target.a / a,
    svgOrigin: `${cx} ${cy}`,
    duration: F(24),
    ease: "power3.inOut",
  }, F(LAUNCH));
  film.to(bars, { scaleY: 0, duration: F(8), ease: "power2.in", stagger: F(0.4) }, F(LAUNCH));
  film.set(trail, { autoAlpha: 1 }, F(LAUNCH + 4));
  film.to(trail, { scaleX: (vw * 2.6) / 14, duration: F(21), ease: "power3.in" }, F(LAUNCH + 4));
  film.to(trail, { y: -(cy + vh * 0.9), duration: F(21), ease: "power2.in" }, F(LAUNCH + 4));
  film.set({}, {}, F(PROCESS_LENGTH));

  return {
    el: svg,
    film,
    stops: phases.map((_, i) => at(i) + 36),
    cuts: [1, 2, 3].map((phase) => at(phase)),
  };
}
