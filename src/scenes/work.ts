import gsap from "gsap";
import { projects } from "../content/projects";
import { extrude, poly, rrect, seeded, type Pt } from "../gfx/shapes";
import { COLOR, MONO, el, group, sceneSvg, text, wrap, type Frame, type TextStyle } from "../gfx/svg";
import { drawWord, wordWidth } from "../gfx/type";
import { F, persp } from "../motion/eases";
import { idle, slam } from "../motion/kit";
import { EMBLEMS, gridBackdrop } from "./emblems";

const BEAT = 58;
/** Frames an outgoing project spends covering the frame. */
const COVER = 15;
const LEAVE = 30;
const VEIL_AT = BEAT * projects.length - 8;
export const WORK_LENGTH = VEIL_AT + LEAVE;

const { ink: INK, paper: PAPER, lime: LIME, cyan: CYAN } = COLOR;

/** Paper first, to match the title, and paper last, because the halftone exit is ink. */
const GROUNDS = [PAPER, INK, PAPER, INK, PAPER, INK, PAPER, PAPER];

const LANDSCAPE = {
  plate: { w: 580, h: 590, y: 150, left: 110, right: 910 },
  copy: { y: 214, leftX: 760, rightX: 110, width: 680, title: 680, titleMax: 96, lede: 25, ledeLine: 35 },
};
const PORTRAIT = {
  plate: { w: 740, h: 690, y: 130, left: 80, right: 80 },
  copy: { y: 900, leftX: 80, rightX: 80, width: 740, title: 730, titleMax: 96, lede: 31, ledeLine: 43 },
};

/** Where the first project's plate rests. The title's first spine opens into exactly this. */
export const firstPlate = (portrait: boolean) => {
  const { w, h, y, left } = (portrait ? PORTRAIT : LANDSCAPE).plate;
  return { x: left, y, w, h };
};

/** One big accent shape behind each plate, so no two projects share a silhouette. */
const BACKDROPS: ((g: SVGGElement, line: string) => void)[] = [
  (g, line) => el("circle", { r: 270, fill: CYAN, stroke: line, "stroke-width": 4 }, g),
  (g) => el("rect", { x: -210, y: -210, width: 420, height: 420, fill: LIME, transform: "rotate(12)" }, g),
  (g, line) => el("path", { d: "M0 0H380A380 380 0 0 1 0 380Z", fill: LIME, stroke: line, "stroke-width": 4, transform: "translate(-190,-190)" }, g),
  (g) => el("path", { d: poly(Array.from({ length: 6 }, (_, i): Pt => [Math.cos((i / 6) * Math.PI * 2) * 290, Math.sin((i / 6) * Math.PI * 2) * 290])), fill: CYAN }, g),
  (g, line) => {
    el("path", { d: "M-420 0C-280 -170 -140 170 0 0S280 -170 420 0", fill: "none", stroke: line, "stroke-width": 100, "stroke-linecap": "round" }, g);
    el("path", { d: "M-420 0C-280 -170 -140 170 0 0S280 -170 420 0", fill: "none", stroke: LIME, "stroke-width": 92, "stroke-linecap": "round" }, g);
  },
  (g) => el("circle", { r: 240, fill: "none", stroke: CYAN, "stroke-width": 76 }, g),
  (g, line) => el("path", { d: poly([[0, -300], [300, 0], [0, 300], [-300, 0]]), fill: LIME, stroke: line, "stroke-width": 4 }, g),
  (g, line) => el("path", { d: "M-210 300V-60A210 210 0 0 1 210 -60V300Z", fill: CYAN, stroke: line, "stroke-width": 4 }, g),
];
/** Offset from the plate centre: x points away from the copy, so a shape never sits behind text. */
const BACKDROP_AT: Pt[] = [[150, -170], [150, 170], [150, 170], [150, -170], [40, 210], [150, 170], [150, -170], [150, -150]];

interface Cover {
  tl: gsap.core.Timeline;
  layer: SVGGElement;
  /** Frame on which the cover is complete. */
  exit: number;
  centre: Pt;
  /** Scale at which a shape of this half-size, centred on `centre`, overflows the frame. */
  fill: (halfW: number, halfH: number) => number;
  frame: Frame;
}

const hide = (tl: gsap.core.Timeline, target: gsap.TweenTarget, at: number) => tl.set(target, { display: "none" }, F(at));

/** ZINGBOT: a black chat bubble swells over the frame. */
function bubbleSwell({ tl, layer, exit, centre: [x, y], fill }: Cover) {
  const bubble = group(group(layer, { transform: `translate(${x},${y})` }));
  el("path", { d: rrect(-170, -120, 340, 220, 54), fill: INK }, bubble);
  el("path", { d: poly([[-110, 90], [-150, 170], [-20, 96]]), fill: INK }, bubble);
  const typing = [-70, 0, 70].map((dx) => el("circle", { cx: dx, cy: -10, r: 18, fill: PAPER }, bubble));
  gsap.set(bubble, { svgOrigin: "0 0", scale: 0 });
  tl.to(bubble, { scale: 1, duration: F(5), ease: "back.out(2)" }, F(exit - COVER));
  tl.to(typing, { y: -18, duration: F(2.5), yoyo: true, repeat: 1, stagger: F(0.8), ease: "sine.inOut" }, F(exit - COVER + 3));
  tl.to(typing, { autoAlpha: 0, duration: F(2) }, F(exit - 6));
  tl.to(bubble, { scale: fill(170, 110), duration: F(COVER - 5), ease: persp(0.05) }, F(exit - COVER + 5));
  hide(tl, bubble, exit);
}

/** WMS: paper stock stacks up from the floor, bay by bay, until the frame is full. */
function baysFill({ tl, layer, exit, frame }: Cover) {
  const [cols, rows] = [7, 4];
  const left = (frame.W - frame.vw) / 2 - 6;
  const top = (frame.H - frame.vh) / 2 - 6;
  const [cw, ch] = [(frame.vw + 12) / cols, (frame.vh + 12) / rows];
  const bays = group(layer);
  const rnd = seeded(4);
  for (let row = rows - 1; row >= 0; row--) {
    for (let col = 0; col < cols; col++) {
      const bay = el("rect", { x: left + col * cw - 1, y: top + row * ch - 1, width: cw + 2, height: ch + 2, fill: PAPER }, bays);
      gsap.set(bay, { scaleY: 0, transformOrigin: "50% 100%" });
      tl.to(bay, { scaleY: 1, duration: F(5), ease: "power2.out" }, F(exit - COVER + (rows - 1 - row) * 2.6 + rnd() * 2));
    }
  }
  hide(tl, bays, exit);
}

/** PIXELPIPE: the frame dissolves into black pixels, biggest last. */
function pixelFlood({ tl, layer, exit, frame }: Cover) {
  const [cols, rows] = [12, 7];
  const left = (frame.W - frame.vw) / 2 - 4;
  const top = (frame.H - frame.vh) / 2 - 4;
  const [cw, ch] = [(frame.vw + 8) / cols, (frame.vh + 8) / rows];
  const pixels = group(layer);
  const rnd = seeded(18);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const pixel = el("rect", { x: left + col * cw - 1, y: top + row * ch - 1, width: cw + 2, height: ch + 2, fill: INK }, pixels);
      gsap.set(pixel, { scale: 0, transformOrigin: "50% 50%" });
      tl.to(pixel, { scale: 1, duration: F(5), ease: "power2.in" }, F(exit - COVER + rnd() * (COVER - 5)));
    }
  }
  hide(tl, pixels, exit);
}

/** V-MEET: one isometric face grows until the frame is inside it. */
function faceDive({ tl, layer, exit, centre: [x, y], fill }: Cover) {
  const face = group(group(layer, { transform: `translate(${x},${y})` }));
  el("path", { d: poly([[0, -120], [208, 0], [0, 120], [-208, 0]]), fill: PAPER, stroke: LIME, "stroke-width": 8, "vector-effect": "non-scaling-stroke" }, face);
  gsap.set(face, { svgOrigin: "0 0", scale: 0, rotation: -30 });
  tl.to(face, { rotation: 0, duration: F(COVER), ease: "soft" }, F(exit - COVER));
  tl.to(face, { scale: fill(104, 60) * 1.1, duration: F(COVER), ease: persp(0.03) }, F(exit - COVER));
  hide(tl, face, exit);
}

/** NEURORYTHM: a brainwave front sweeps the frame in black. */
function waveSweep({ tl, layer, exit, frame }: Cover) {
  const top = (frame.H - frame.vh) / 2 - 40;
  const bottom = frame.H + (frame.vh - frame.H) / 2 + 40;
  const edge = (shift: number) => {
    let d = "";
    for (let y = top; y <= bottom; y += 18) {
      const t = (y - top) / (bottom - top);
      const x = shift + Math.sin(t * Math.PI * 6) * 56 + Math.sin(t * Math.PI * 17) * 18;
      d += `${d ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };
  const front = group(layer);
  el("path", { d: `${edge(0)}L${-frame.vw * 2} ${bottom}L${-frame.vw * 2} ${top}Z`, fill: INK }, front);
  el("path", { d: edge(34), fill: "none", stroke: CYAN, "stroke-width": 10 }, front);
  el("path", { d: edge(60), fill: "none", stroke: LIME, "stroke-width": 5 }, front);
  const start = (frame.W - frame.vw) / 2 - 120;
  const end = frame.W + (frame.vw - frame.W) / 2 + 160;
  gsap.set(front, { x: start, autoAlpha: 0 });
  tl.set(front, { autoAlpha: 1 }, F(exit - COVER));
  tl.to(front, { x: end, duration: F(COVER), ease: "power2.in" }, F(exit - COVER));
  hide(tl, front, exit);
}

/** SCHOLAR: citations fire outward and the hub opens into paper. */
function hubIris({ tl, layer, exit, centre: [x, y], fill }: Cover) {
  const burst = group(layer, { transform: `translate(${x},${y})` });
  const rays = Array.from({ length: 16 }, (_, i) => {
    const turn = group(burst, { transform: `rotate(${(i / 16) * 360})` });
    const ray = el("rect", { x: 40, y: -5, width: 320, height: 10, fill: i % 4 === 0 ? CYAN : i % 4 === 2 ? LIME : PAPER }, turn);
    gsap.set(ray, { svgOrigin: "0 0", scaleX: 0 });
    return ray;
  });
  tl.to(rays, { scaleX: 3.4, duration: F(10), ease: "power2.in", stagger: F(0.2) }, F(exit - COVER));
  const iris = el("circle", { r: 40, fill: PAPER }, burst);
  gsap.set(iris, { svgOrigin: "0 0", scale: 0 });
  tl.to(iris, { scale: fill(28, 28), duration: F(COVER - 2), ease: persp(0.04) }, F(exit - COVER + 2));
  hide(tl, burst, exit);
}

/** KALLOS: a single facet of the gem grows until the frame is inside it. */
function facetDive({ tl, layer, exit, centre: [x, y], fill }: Cover) {
  const facet = group(group(layer, { transform: `translate(${x},${y})` }));
  el("path", { d: poly([[0, -150], [150, 90], [-150, 90]]), fill: PAPER }, facet);
  gsap.set(facet, { svgOrigin: "0 0", scale: 0, rotation: -90 });
  tl.to(facet, { rotation: 60, duration: F(COVER), ease: "soft" }, F(exit - COVER));
  tl.to(facet, { scale: fill(62, 62), duration: F(COVER), ease: persp(0.03) }, F(exit - COVER));
  hide(tl, facet, exit);
}

const COVERS = [bubbleSwell, baysFill, pixelFlood, faceDive, waveSweep, hubIris, facetDive];

export function buildWork(frame: Frame, stage: Element, root: HTMLElement) {
  const { W, H, vw, vh, portrait } = frame;
  const L = portrait ? PORTRAIT : LANDSCAPE;
  const svg = sceneSvg("work", frame, stage);
  const film = gsap.timeline({ defaults: { ease: "none" } });
  const cut = (i: number) => i * BEAT;
  const [padX, padY] = [(vw - W) / 2, (vh - H) / 2];

  const defs = el("defs", {}, svg);
  const pattern = el("pattern", { id: "halftone", width: 56, height: 56, patternUnits: "userSpaceOnUse" }, defs);
  const halftoneDot = el("circle", { cx: 28, cy: 28, r: 0, fill: INK }, pattern);

  const ground = el("rect", { x: -W, y: -H, width: W * 3, height: H * 3, fill: PAPER }, svg);
  const holders = group(svg);
  const covers = group(svg);

  const C = L.copy;
  const P = L.plate;
  const labelSize = portrait ? 22 : 12;

  projects.forEach((project, i) => {
    const at = cut(i);
    const bg = GROUNDS[i];
    const dark = bg === INK;
    const fg = dark ? PAPER : INK;
    const flip = !portrait && i % 2 === 1;
    const plateX = flip ? P.right : P.left;
    const copyX = flip ? C.rightX : C.leftX;
    const [pcx, pcy] = [plateX + P.w / 2, P.y + P.h / 2];

    const holder = group(holders);
    if (i > 0) {
      gsap.set(holder, { display: "none" });
      film.set(holder, { display: "block" }, F(at));
    }
    if (i < projects.length - 1) film.set(holder, { display: "none" }, F(cut(i + 1)));

    // Big accent shape behind the plate.
    const [bx, by] = portrait ? [(i % 2 ? 1 : -1) * 260, -110] : BACKDROP_AT[i];
    const backdrop = group(group(holder, { transform: `translate(${pcx + (portrait ? bx : bx * (flip ? 1 : -1))},${pcy + by})` }));
    BACKDROPS[i](backdrop, INK);
    gsap.set(backdrop, { svgOrigin: "0 0", scale: 0, rotation: -50 });
    film.to(backdrop, { scale: 1.1, rotation: 0, duration: F(16), ease: "snap" }, F(at + 4));
    film.to(backdrop, { scale: 1, rotation: 10, duration: F(BEAT - 24), ease: "none" }, F(at + 20));

    // Ghost index, huge and outlined, drifting the opposite way to the type.
    const ghostSize = portrait ? 300 : 330;
    const ghost = text(holder, portrait ? W - 40 : flip ? plateX - 40 : W - 30, portrait ? H - 120 : H - 42, String(i + 1).padStart(2, "0"), {
      size: ghostSize,
      weight: 900,
      stretch: "125%",
      fill: "none",
      anchor: "end",
    });
    ghost.setAttribute("stroke", fg);
    ghost.setAttribute("stroke-width", "1.5");
    // Fades in, so the first frame after a cut is a clean ground.
    gsap.set(ghost, { x: flip ? -180 : 180, opacity: 0 });
    film.to(ghost, { opacity: dark ? 0.3 : 0.22, duration: F(10) }, F(at + 6));
    film.to(ghost, { x: flip ? 60 : -60, duration: F(BEAT), ease: "none" }, F(at));

    // Plate: the black screen each emblem lives on. Lands from far away, already performing.
    const plate = el("a", { href: `#work/${project.slug}`, "data-case": project.slug, "data-hover": "" }, holder);
    const body = rrect(plateX, P.y, P.w, P.h, 22);
    el("path", { d: extrude(body, -14, 14), fill: dark ? PAPER : INK, stroke: dark ? PAPER : INK }, plate);
    el("path", { d: body, fill: PAPER, stroke: INK, "stroke-width": 4 }, plate);
    const screen = { x: plateX + 16, y: P.y + 16, w: P.w - 32, h: P.h - 32 };
    el("path", { d: rrect(screen.x, screen.y, screen.w, screen.h, 12), fill: INK }, plate);
    const inner = group(plate, { transform: `translate(${pcx},${pcy})` });
    el("path", { d: gridBackdrop(screen.w, screen.h), fill: COLOR.white, opacity: 0.16 }, inner);
    const emblem = group(group(group(inner), { transform: `scale(${Math.min(screen.w, screen.h) / 590})` }));
    idle(emblem.parentNode, { y: -7, duration: 2.4 + i * 0.13, ease: "sine.inOut", yoyo: true });

    // The first plate is already here: the title's first spine opened into it.
    if (i > 0) {
      gsap.set(plate, { svgOrigin: `${pcx} ${pcy}`, scale: 0.04, rotation: flip ? 10 : -10, autoAlpha: 0 });
      film.set(plate, { autoAlpha: 1 }, F(at));
      film.to(plate, { scale: 1, rotation: 0, duration: F(22), ease: "snap" }, F(at));
    }

    // Emblems perform on arrival and are finished before the hold.
    const performance = EMBLEMS[project.slug](emblem);
    performance.timeScale(Math.max(1, performance.duration() / F(30)));
    film.add(performance, F(at + 3));

    // Copy: the title hits, the lede rises by line, the facts follow.
    const words = group(holder);
    const inboundX = flip ? -520 : 520;
    let y = C.y;
    const label = text(words, copyX, y, `${String(i + 1).padStart(2, "0")} / ${projects.length}  ·  ${project.sector}`, {
      size: labelSize + 2,
      family: MONO,
      weight: 600,
      fill: fg,
    });
    gsap.set(label, { autoAlpha: 0 });
    film.set(label, { autoAlpha: 1 }, F(at + 8));

    const titleSize = Math.min(C.titleMax, (C.title / wordWidth(project.title, 1000)) * 1000);
    y += titleSize + 12;
    const titleGroup = group(words);
    drawWord(titleGroup, project.title, copyX, y, {
      size: titleSize,
      face: LIME,
      side: dark ? PAPER : INK,
      outline: 2.6,
      depth: [7, 11],
      ticks: bg,
    });
    gsap.set(titleGroup, { autoAlpha: 0 });
    film.set(titleGroup, { autoAlpha: 1 }, F(at + 7));
    slam(film, titleGroup, at + 7, inboundX, flip ? -12 : 12, 16);

    y += 66;
    const bodyStyle: TextStyle = { size: C.lede, weight: 500, stretch: "90%", fill: fg };
    const placed = wrap(project.lede, C.width, C.ledeLine, bodyStyle);
    const rows = new Map<number, SVGGElement>();
    for (const word of placed) {
      if (!rows.has(word.y)) rows.set(word.y, group(words));
      text(rows.get(word.y)!, copyX + word.x, y + word.y, word.word, bodyStyle);
    }
    const ledeRows = [...rows.values()];
    gsap.set(ledeRows, { autoAlpha: 0, y: 22 });
    film.to(ledeRows, { autoAlpha: 1, y: 0, duration: F(9), ease: "settle", stagger: F(1.6) }, F(at + 13));
    y += placed.at(-1)!.y + C.ledeLine + 24;

    const facts = group(words);
    const meta: [string, string][] = [["Client", project.client], ["Year", project.year], ["Role", project.role]];
    const columnWidth = C.width / 3;
    meta.forEach(([name, value], m) => {
      text(facts, copyX + m * columnWidth, y, name.toUpperCase(), { size: labelSize, family: MONO, weight: 600, fill: fg, spacing: "0.08em" });
      text(facts, copyX + m * columnWidth, y + (portrait ? 34 : 24), value, { size: portrait ? 27 : 18, weight: 600, stretch: "90%", fill: fg });
    });
    y += portrait ? 86 : 62;

    let tagX = copyX;
    const tagSize = portrait ? 24 : 13;
    project.tags.forEach((tag) => {
      const width = tag.length * tagSize * 0.62 + 28;
      el("rect", { x: tagX, y, width, height: tagSize * 2.3, rx: tagSize * 1.15, fill: "none", stroke: fg, "stroke-width": 1.6 }, facts);
      text(facts, tagX + 14, y + tagSize * 1.5, tag, { size: tagSize, family: MONO, weight: 600, fill: fg });
      tagX += width + 8;
    });
    const link = el("a", { href: `#work/${project.slug}`, class: "cta", "data-case": project.slug, "data-hover": "" }, facts);
    const linkWidth = portrait ? 240 : 168;
    el("rect", { x: tagX + 10, y, width: linkWidth, height: tagSize * 2.3, rx: tagSize * 1.15, fill: fg }, link);
    text(link, tagX + 28, y + tagSize * 1.5, "Open case", { size: tagSize, family: MONO, weight: 600, fill: bg });
    el("circle", { cx: tagX + linkWidth - 8, cy: y + tagSize * 1.15, r: tagSize * 0.45, fill: LIME }, link);
    gsap.set(facts, { autoAlpha: 0, y: 22 });
    film.to(facts, { autoAlpha: 1, y: 0, duration: F(9), ease: "settle" }, F(at + 19));

    if (i === projects.length - 1) return;

    // Leaving: the copy clears, then this project's own motif covers the frame.
    const exit = cut(i + 1);
    film.to(words, { x: flip ? -50 : 50, autoAlpha: 0, duration: F(6), ease: "power2.in" }, F(exit - COVER - 2));

    const toEdge = (x: number, y2: number) => ({
      x: Math.max(x + padX, W - x + padX),
      y: Math.max(y2 + padY, H - y2 + padY),
    });
    const reach = toEdge(pcx, pcy);
    COVERS[i]({
      tl: film,
      layer: covers,
      exit,
      centre: [pcx, pcy],
      fill: (halfW, halfH) => Math.max(reach.x / halfW, reach.y / halfH) * 1.25,
      frame,
    });

    // Behind the full cover, the ground and chrome flip to the next project.
    const nextBg = GROUNDS[i + 1];
    film.set(ground, { attr: { fill: nextBg } }, F(exit));
    film.set(root, { "--chrome-ink": nextBg === INK ? PAPER : INK }, F(exit - 2));
  });

  // Halftone: one animated radius eats the last panel in black dots.
  const veil = el("rect", { x: -vw, y: -vh, width: vw * 3, height: vh * 3, fill: "url(#halftone)" }, svg);
  gsap.set(veil, { autoAlpha: 0 });
  film.set(veil, { autoAlpha: 1 }, F(VEIL_AT));
  film.to(halftoneDot, { attr: { r: 42 }, duration: F(LEAVE), ease: "power2.in" }, F(VEIL_AT));
  film.set({}, {}, F(WORK_LENGTH));

  return {
    el: svg,
    film,
    stops: projects.map((_, i) => cut(i) + 42),
    cuts: projects.slice(1).map((_, i) => cut(i + 1)),
  };
}
