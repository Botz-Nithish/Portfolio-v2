import gsap from "gsap";
import { journey } from "../content/journey";
import { WORDS } from "../gfx/glyphs.gen";
import { dotRings, dots, extrude, outline, poly, rrect, seeded, type Pt } from "../gfx/shapes";
import { COLOR, MONO, el, group, sceneSvg, text, wrap, type Frame, type TextStyle } from "../gfx/svg";
import { drawWord } from "../gfx/type";
import { F, persp } from "../motion/eases";
import { blockWipe, land, pop, slam, swoosh } from "../motion/kit";

const BEAT = 60;
/** Frames spent on the title, which is laid on the same road the timeline runs along. */
const PRELUDE = 112;
const TITLE_IN = 36;
const TITLE_OUT = 76;
export const JOURNEY_LENGTH = PRELUDE + BEAT * journey.length;

const { ink: INK, paper: PAPER, lime: LIME, cyan: CYAN, grey: GREY, slate: SLATE, white: WHITE } = COLOR;

/** Every event has its own ground, so the road changes colour with the story. */
const ERAS = [
  { sky: INK, road: PAPER, lane: INK, fg: PAPER, year: LIME, side: PAPER },
  { sky: PAPER, road: INK, lane: PAPER, fg: INK, year: LIME, side: INK },
  { sky: INK, road: LIME, lane: INK, fg: PAPER, year: PAPER, side: LIME },
  { sky: LIME, road: INK, lane: LIME, fg: INK, year: PAPER, side: INK },
  { sky: CYAN, road: INK, lane: CYAN, fg: INK, year: PAPER, side: INK },
  { sky: INK, road: PAPER, lane: INK, fg: PAPER, year: LIME, side: PAPER },
  { sky: PAPER, road: INK, lane: PAPER, fg: INK, year: CYAN, side: INK },
  { sky: CYAN, road: INK, lane: CYAN, fg: INK, year: PAPER, side: INK },
  { sky: INK, road: PAPER, lane: INK, fg: PAPER, year: LIME, side: PAPER },
];

const LANDSCAPE = {
  vp: [1010, 480] as Pt,
  art: 1,
  copy: { x: 96, y: 178, width: 440, year: 140, title: 46, titleLine: 52, body: 21, bodyLine: 30, label: 14 },
  rail: { x: 96, y: 800, w: 330 },
  title: {
    vp: [800, 236] as Pt,
    caption: { y: 150, size: 17 },
    rows: [
      { word: "MY LIFE", near: 268, far: 112, half: 0.74 },
      { word: "JOURNEY", near: 598, far: 316, half: 1.16 },
    ],
  },
};
const PORTRAIT = {
  vp: [450, 560] as Pt,
  art: 0.7,
  copy: { x: 66, y: 930, width: 770, year: 124, title: 56, titleLine: 62, body: 30, bodyLine: 41, label: 24 },
  rail: { x: 66, y: 1490, w: 770 },
  title: {
    vp: [450, 470] as Pt,
    caption: { y: 370, size: 27 },
    rows: [
      { word: "MY LIFE", near: 306, far: 138, half: 0.6 },
      { word: "JOURNEY", near: 700, far: 404, half: 0.6 },
    ],
  },
};

interface Stage {
  back: SVGGElement;
  front: SVGGElement;
  /** Group the portal zoom acts on. */
  dolly: SVGGElement;
  /** Layer above the world for wipes, in frame coordinates. */
  wipes: SVGGElement;
  tl: gsap.core.Timeline;
  at: number;
  exit: number;
  /** Maps a set-piece point to frame coordinates. */
  toFrame: (x: number, y: number) => Pt;
  /** Visible distance from the vanishing point, in set-piece units. */
  reachX: number;
  reachY: number;
  frame: Frame;
  /** Motion that keeps running while this stop is on screen, whatever the scroll is doing. */
  loop: (target: gsap.TweenTarget, vars: gsap.TweenVars) => void;
}

/** Scale at which a centred box of this size overflows the frame from the vanishing point. */
const coverBox = (s: Stage, w: number, h: number) => Math.max(s.reachX / (w / 2), s.reachY / (h / 2)) * 1.25;
const coverDisc = (s: Stage, r: number) => (Math.hypot(s.reachX, s.reachY) / r) * 1.2;

/** The camera flies into a shape: it swings onto the vanishing point and grows past every edge. */
function dive({ dolly, tl, exit }: Stage, [ox, oy]: Pt, cover: number, frames = 15, turn = 0) {
  gsap.set(dolly, { svgOrigin: `${ox} ${oy}` });
  tl.to(dolly, { x: -ox, y: -oy, duration: F(frames * 0.6), ease: "soft" }, F(exit - frames));
  tl.to(dolly, { rotation: turn, duration: F(frames), ease: "soft" }, F(exit - frames));
  tl.to(dolly, { scale: cover, duration: F(frames), ease: persp(0.05) }, F(exit - frames));
}

const star = (x: number, y: number, s: number) =>
  `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;

function gearPath(radius: number, teeth: number) {
  const pts: Pt[] = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2;
    const r = i % 4 < 2 ? radius : radius * 0.8;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return poly(pts);
}

/** Pieces that keep falling through the frame, each on its own clock. */
function rain(s: Stage, count: number, seed: number, colours: string[]) {
  const rnd = seeded(seed);
  for (let i = 0; i < count; i++) {
    const fill = colours[i % colours.length];
    const piece = i % 2 ? el("rect", { x: -9, y: -6, width: 18, height: 12, fill }, s.front) : el("circle", { r: 6 + rnd() * 5, fill }, s.front);
    const x = (rnd() - 0.5) * 1040;
    const [top, bottom] = [-s.reachY - 40, s.reachY + 60];
    gsap.set(piece, { x, y: top, transformOrigin: "50% 50%" });
    s.loop(piece, { y: bottom, x: x + (rnd() - 0.5) * 120, rotation: 240 + rnd() * 400, duration: 3 + rnd() * 3, ease: "none", delay: rnd() * 3 });
  }
}

// ---- The nine set pieces. Drawn around the vanishing point at 0,0, with up as negative y.

/** Born: the sun over Chennai's Marina, with the lighthouse sweeping its beam. */
function born(s: Stage) {
  const { back, front, tl, at, exit, loop } = s;
  const [sx, sy, sr] = [0, -196, 178];

  const halo = group(back);
  const rings = [212, 246, 284, 326].map((r, i) =>
    el("circle", { cx: sx, cy: sy, r, fill: "none", stroke: PAPER, "stroke-width": 3 - i * 0.6 }, halo),
  );
  gsap.set(rings, { drawSVG: "0%", rotation: -90, transformOrigin: "50% 50%" });
  tl.to(rings, { drawSVG: "100%", duration: F(26), ease: "soft", stagger: F(2) }, F(at + 8));
  loop(halo, { scale: 1.04, svgOrigin: `${sx} ${sy}`, duration: 2.4, ease: "sine.inOut", yoyo: true });

  const sun = group(back);
  el("circle", { cx: sx, cy: sy, r: sr, fill: PAPER }, sun);
  [[-92, 10], [-58, 14], [-22, 18]].forEach(([y, h]) =>
    el("rect", { x: sx - sr - 4, y, width: sr * 2 + 8, height: h, fill: INK }, sun),
  );
  gsap.set(sun, { y: 420 });
  tl.to(sun, { y: 0, duration: F(32), ease: "snap" }, F(at));

  // Sea on the left of the road: wave lines that draw on and keep sliding.
  const sea = group(front);
  const waves = Array.from({ length: 6 }, (_, i) => {
    const y = 16 + i * i * 4 + i * 10;
    const amp = 3 + i * 1.6;
    let d = `M-420 ${y}`;
    for (let x = -420; x < -60 - i * 40; x += 44) d += `q11 ${-amp} 22 0t22 0`;
    const swell = group(sea);
    loop(swell, { x: i % 2 ? 44 : -44, duration: 1.7 + i * 0.3, ease: "sine.inOut", yoyo: true });
    return el("path", { d, fill: "none", stroke: PAPER, "stroke-width": 1.5 + i * 0.4 }, swell);
  });
  gsap.set(waves, { drawSVG: "0%" });
  tl.to(waves, { drawSVG: "100%", duration: F(20), ease: "soft", stagger: F(1.4) }, F(at + 8));
  tl.to(waves, { x: (i: number) => (i % 2 ? 26 : -26), duration: F(44), ease: "none" }, F(at + 8));

  // Marina lighthouse on the right of the road.
  const tower = group(front);
  const [tx, base, top] = [352, 150, -214];
  // Two beams back to back, turning for as long as this stop is on screen.
  const lamp = `${tx} ${top - 26}`;
  const lantern = group(tower);
  const beams = [-1, 1].map((side) =>
    el(
      "path",
      { d: `M${tx} ${top - 26}L${tx + 700 * side} ${top - 170}L${tx + 700 * side} ${top + 60}Z`, fill: LIME, opacity: 0.85 },
      lantern,
    ),
  );
  gsap.set(beams, { svgOrigin: lamp, scaleX: 0 });
  tl.to(beams, { scaleX: 1, duration: F(10), ease: "soft" }, F(at + 22));
  gsap.set(lantern, { svgOrigin: lamp, rotation: -26 });
  loop(lantern, { rotation: 334, duration: 8, ease: "none" });
  el("path", { d: poly([[tx + 92, base], [tx + 250, base], [tx + 200, base + 22], [tx + 70, base + 22]]), fill: SLATE }, tower);
  el("path", { d: poly([[tx - 52, base], [tx + 52, base], [tx + 30, top], [tx - 30, top]]), fill: PAPER }, tower);
  [0, 2, 4].forEach((band) => {
    const [y0, y1] = [base + ((top - base) / 6) * band, base + ((top - base) / 6) * (band + 1)];
    const w = (y: number) => 52 - ((y - base) / (top - base)) * 22;
    el("path", { d: poly([[tx - w(y0), y0], [tx + w(y0), y0], [tx + w(y1), y1], [tx - w(y1), y1]]), fill: LIME }, tower);
  });
  el("rect", { x: tx - 42, y: top - 10, width: 84, height: 12, fill: PAPER }, tower);
  el("rect", { x: tx - 22, y: top - 44, width: 44, height: 34, fill: LIME, stroke: PAPER, "stroke-width": 4 }, tower);
  el("path", { d: poly([[tx - 28, top - 44], [tx, top - 76], [tx + 28, top - 44]]), fill: PAPER }, tower);
  land(tl, tower, at + 6, { y: 520 }, 22);

  const birds = group(front);
  const flock = group(birds);
  ([[-150, -330, 1], [-92, -366, 0.8], [-214, -372, 0.7]] as const).forEach(([x, y, k], i) => {
    const bird = el("path", { d: `M${x} ${y}q${14 * k} ${-14 * k} ${28 * k} 0q${14 * k} ${-14 * k} ${28 * k} 0`, fill: "none", stroke: PAPER, "stroke-width": 3, "stroke-linecap": "round" }, flock);
    loop(bird, { scaleY: 0.35, svgOrigin: `${x + 28 * k} ${y}`, duration: 0.32 + i * 0.05, ease: "sine.inOut", yoyo: true });
  });
  loop(flock, { x: 60, y: -18, duration: 2.8, ease: "sine.inOut", yoyo: true });
  gsap.set(birds, { x: -240, autoAlpha: 0 });
  tl.set(birds, { autoAlpha: 1 }, F(at + 16));
  tl.to(birds, { x: 180, duration: F(40), ease: "none" }, F(at + 16));

  // The whole sun swings to the vanishing point and the camera flies into it.
  const disc = el("circle", { cx: sx, cy: sy, r: sr, fill: PAPER }, s.dolly);
  gsap.set(disc, { autoAlpha: 0 });
  tl.set(disc, { autoAlpha: 1 }, F(exit - 15));
  dive(s, [sx, sy], coverDisc(s, sr));
}

/** Finished school: the building rises, its clock spins, and the door is the way out. */
function school(s: Stage) {
  const { back, front, tl, at, loop } = s;
  el("path", { d: poly([[300, 18], [520, 18], [430, 70], [300, 70]]), fill: GREY }, back);

  const wings = group(front);
  const wing = rrect(-330, -176, 660, 196, 3);
  el("path", { d: extrude(wing, -14, 12), fill: INK, stroke: INK }, wings);
  el("path", { d: wing, fill: GREY, stroke: INK, "stroke-width": 4 }, wings);
  el("rect", { x: -346, y: -196, width: 692, height: 20, fill: PAPER, stroke: INK, "stroke-width": 4 }, wings);
  const panes: SVGElement[] = [];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const x = side * (116 + col * 50) - 15;
        panes.push(el("rect", { x, y: -148 + row * 74, width: 30, height: 50, fill: col % 2 === row % 2 ? INK : LIME, stroke: INK, "stroke-width": 3 }, wings));
      }
    }
  }
  gsap.set(panes, { scaleY: 0, transformOrigin: "50% 100%" });
  tl.to(panes, { scaleY: 1, duration: F(8), ease: "back.out(2)", stagger: { each: F(0.5), from: "center" } }, F(at + 16));
  panes.forEach((pane, i) => {
    if (i % 3) return;
    loop(pane, { opacity: 0.2, duration: 0.5, repeatDelay: 1 + (i % 5) * 0.6, ease: "steps(1)", yoyo: true });
  });
  land(tl, wings, at + 4, { y: 300 }, 20);

  const tower = group(front);
  const body = rrect(-84, -320, 168, 340, 3);
  el("path", { d: extrude(body, -14, 12), fill: INK, stroke: INK }, tower);
  el("path", { d: body, fill: PAPER, stroke: INK, "stroke-width": 4 }, tower);
  el("path", { d: poly([[-104, -320], [0, -402], [104, -320]]), fill: INK }, tower);
  el("circle", { cy: -236, r: 62, fill: PAPER, stroke: INK, "stroke-width": 6 }, tower);
  el("path", { d: dots(dotRings(0, -236, [[50, 12]]), 3.2), fill: INK }, tower);
  const [minuteTurn, hourTurn] = [group(tower), group(tower)];
  const minute = el("line", { x1: 0, y1: -236, x2: 0, y2: -282, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, minuteTurn);
  const hour = el("line", { x1: 0, y1: -236, x2: 26, y2: -222, stroke: LIME, "stroke-width": 8, "stroke-linecap": "round" }, hourTurn);
  gsap.set([minute, hour], { svgOrigin: "0 -236" });
  loop(minuteTurn, { rotation: 360, svgOrigin: "0 -236", duration: 5, ease: "none" });
  loop(hourTurn, { rotation: 360, svgOrigin: "0 -236", duration: 60, ease: "none" });
  tl.to(minute, { rotation: 1080, duration: F(40), ease: "soft" }, F(at + 6));
  tl.to(hour, { rotation: 120, duration: F(40), ease: "soft" }, F(at + 6));
  el("path", { d: "M-52 22V-54A52 52 0 0 1 52 -54V22Z", fill: INK }, tower);
  el("path", { d: "M-66 22V-54A66 66 0 0 1 66 -54V22", fill: "none", stroke: INK, "stroke-width": 3 }, tower);
  land(tl, tower, at + 1, { y: 460 }, 22);

  // Flag on the roof.
  const flag = group(front);
  el("line", { x1: 0, y1: -400, x2: 0, y2: -470, stroke: INK, "stroke-width": 5 }, flag);
  const flutter = group(flag);
  const cloth = el("path", { d: "M2 -470L74 -452L2 -432Z", fill: CYAN, stroke: INK, "stroke-width": 3 }, flutter);
  loop(flutter, { skewY: 11, svgOrigin: "2 -451", duration: 0.42, ease: "sine.inOut", yoyo: true });
  gsap.set(flag, { autoAlpha: 0 });
  tl.set(flag, { autoAlpha: 1 }, F(at + 20));
  gsap.set(cloth, { scaleX: 0, transformOrigin: "0% 50%" });
  tl.to(cloth, { scaleX: 1, duration: F(10), ease: "back.out(2)" }, F(at + 20));

  // Books drop into the foreground, and a dotted pencil line runs up to the door.
  const books = group(front);
  ([[372, 212, 150, PAPER], [392, 176, 118, CYAN], [362, 146, 128, LIME]] as const).forEach(([x, y, w, fill], i) => {
    const book = group(books);
    const d = rrect(x, y, w, 30, 3);
    el("path", { d: extrude(d, -8, 8), fill: INK, stroke: INK }, book);
    el("path", { d, fill, stroke: INK, "stroke-width": 3.5 }, book);
    gsap.set(book, { y: -560, autoAlpha: 0 });
    tl.set(book, { autoAlpha: 1 }, F(at + 12 + i * 3));
    tl.to(book, { y: 0, duration: F(14), ease: "bounce.out" }, F(at + 12 + i * 3));
  });

  const pencil = el("path", { d: "M-400 240C-300 150 -220 280 -140 190S-60 90 0 60", fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, front);
  gsap.set(pencil, { drawSVG: "0%" });
  tl.to(pencil, { drawSVG: "100%", duration: F(24), ease: "soft" }, F(at + 12));

  dive(s, [0, -30], coverBox(s, 100, 96), 15, -7);
}

/** Started engineering: braces slam shut around a terminal, gears turn, code rains behind. */
function engineering(s: Stage) {
  const { back, front, tl, at, exit, loop } = s;
  const rnd = seeded(21);

  Array.from({ length: 13 }, (_, c) => {
    const x = -470 + c * 78;
    let d = "";
    for (let row = 0; row < 16; row++) {
      if (rnd() < 0.34) continue;
      const w = 12 + rnd() * 34;
      // The same rows twice over, so the rain can wrap without a jump.
      for (const offset of [0, -480]) d += `M${x} ${-700 + offset + row * 30}h${w}v8h${-w}Z`;
    }
    const fill = c % 5 === 2 ? LIME : c % 3 === 0 ? CYAN : SLATE;
    const fall = group(back);
    const column = el("path", { d, fill }, fall);
    tl.fromTo(column, { y: -160 - c * 40 }, { y: 360, duration: F(BEAT), ease: "none", immediateRender: false }, F(at));
    loop(fall, { y: 480, duration: 3.4 + (c % 4) * 0.5, ease: "none" });
  });

  const gears = group(front);
  const [bigTurn, smallTurn] = [group(group(gears, { transform: "translate(380,-214)" })), group(group(gears, { transform: "translate(498,-122)" }))];
  const big = el("path", { d: gearPath(94, 12), fill: "none", stroke: PAPER, "stroke-width": 4, "stroke-linejoin": "round" }, bigTurn);
  const small = el("path", { d: gearPath(58, 8), fill: LIME }, smallTurn);
  // Geared: twelve teeth turn eight teeth one and a half times the other way.
  loop(bigTurn, { rotation: 360, svgOrigin: "0 0", duration: 9, ease: "none" });
  loop(smallTurn, { rotation: -540, svgOrigin: "0 0", duration: 9, ease: "none" });
  el("circle", { cx: 380, cy: -214, r: 20, fill: PAPER }, gears);
  el("circle", { cx: 498, cy: -122, r: 12, fill: INK }, gears);
  gsap.set([big, small], { svgOrigin: "0 0" });
  tl.to(big, { rotation: 170, duration: F(BEAT), ease: "none" }, F(at));
  tl.to(small, { rotation: -262, duration: F(BEAT), ease: "none" }, F(at));
  land(tl, gears, at + 8, { x: 420, y: -120, rotation: 30 }, 18);

  const tracePaths = ["M-450 -70H-300V-170H-170", "M-450 -10H-260V-110H-170", "M-450 -130H-340V-230H-170"];
  const traces = tracePaths.map((d) => el("path", { d, fill: "none", stroke: CYAN, "stroke-width": 2.5 }, front));
  gsap.set(traces, { drawSVG: "0%" });
  tl.to(traces, { drawSVG: "100%", duration: F(16), ease: "soft", stagger: F(2) }, F(at + 6));
  // Signals keep running down the traces into the terminal.
  tracePaths.forEach((d, i) => {
    const signal = el("path", { d, fill: "none", stroke: LIME, "stroke-width": 5, "stroke-linecap": "round" }, front);
    gsap.set(signal, { drawSVG: "0% 0%" });
    loop(signal, { startAt: { drawSVG: "0% 12%" }, drawSVG: "88% 100%", duration: 1.1, ease: "none", delay: i * 0.35, repeatDelay: 0.5 });
  });

  // Terminal between the braces.
  const terminal = group(front);
  const frame = rrect(-170, -320, 340, 310, 12);
  el("path", { d: extrude(frame, -12, 12), fill: LIME, stroke: LIME }, terminal);
  el("path", { d: frame, fill: PAPER }, terminal);
  el("rect", { x: -170, y: -296, width: 340, height: 3, fill: INK }, terminal);
  [0, 1, 2].forEach((i) => el("circle", { cx: -150 + i * 16, cy: -308, r: 4.5, fill: INK }, terminal));
  const lines = [0.7, 0.45, 0.82, 0.3, 0.6, 0.5].map((w, i) =>
    el("rect", { x: -146 + (i % 3) * 22, y: -272 + i * 40, width: 270 * w, height: 15, fill: i === 2 ? CYAN : i === 4 ? LIME : INK }, terminal),
  );
  gsap.set(lines, { scaleX: 0, transformOrigin: "0% 50%" });
  tl.to(lines, { scaleX: 1, duration: F(6), ease: "soft", stagger: F(2) }, F(at + 16));
  // A last line keeps being typed and cleared.
  const typing = el("rect", { x: -146, y: -272 + 6 * 40, width: 214, height: 15, fill: LIME }, terminal);
  gsap.set(typing, { svgOrigin: "-146 0", scaleX: 0 });
  loop(typing, { startAt: { scaleX: 0 }, scaleX: 1, duration: 1.3, ease: "steps(9)", repeatDelay: 0.7 });
  gsap.set(terminal, { svgOrigin: "0 -165" });
  pop(tl, terminal, at + 6, 1.1, 12, 10);

  // The braces snap shut on the terminal, then part to open the way out.
  const style: TextStyle = { size: 470, family: MONO, weight: 800, fill: LIME, anchor: "middle" };
  const left = group(front);
  const right = group(front);
  text(left, -262, -2, "{", style);
  text(right, 262, -2, "}", style);
  gsap.set(left, { x: -800, rotation: -18, transformOrigin: "50% 50%" });
  gsap.set(right, { x: 800, rotation: 18, transformOrigin: "50% 50%" });
  tl.to(left, { x: 0, rotation: 0, duration: F(16), ease: "snap" }, F(at + 10));
  tl.to(right, { x: 0, rotation: 0, duration: F(16), ease: "snap" }, F(at + 12));

  // A lime blade grows between them, and the camera goes through it.
  const blade = el("rect", { x: -100, y: -370, width: 200, height: 460, fill: LIME }, s.dolly);
  gsap.set(blade, { scaleX: 0, transformOrigin: "50% 50%" });
  tl.to(blade, { scaleX: 1, duration: F(10), ease: "power3.in" }, F(exit - 16));
  tl.to(left, { x: -320, duration: F(12), ease: "power3.in" }, F(exit - 16));
  tl.to(right, { x: 320, duration: F(12), ease: "power3.in" }, F(exit - 16));
  dive(s, [0, -140], coverBox(s, 200, 460), 12);
}

/** First place: a trophy drops into a spinning sunburst, and confetti goes everywhere. */
function firstPlace(s: Stage) {
  const { back, front, tl, at, exit, wipes, loop } = s;
  const rnd = seeded(47);
  const [cx, cy] = [0, -176];

  const burst = group(back, { transform: `translate(${cx},${cy})` });
  const spin = group(burst);
  const rays = group(spin);
  for (let i = 0; i < 18; i++) {
    el("path", { d: "M0 0L560 -40L560 40Z", fill: INK, transform: `rotate(${(i / 18) * 360})` }, rays);
  }
  // Clockwise, for as long as the trophy is on screen.
  loop(rays, { rotation: 360, svgOrigin: "0 0", duration: 16, ease: "none" });
  gsap.set(spin, { svgOrigin: "0 0", scale: 0 });
  tl.to(spin, { scale: 1, duration: F(20), ease: "snap" }, F(at + 2));
  tl.to(spin, { rotation: 80, duration: F(BEAT), ease: "none" }, F(at));
  el("circle", { r: 214, fill: LIME }, burst);

  const podium = group(front);
  const block = rrect(-128, 40, 256, 62, 3);
  el("path", { d: extrude(block, -12, 12), fill: INK, stroke: INK }, podium);
  el("path", { d: block, fill: PAPER, stroke: INK, "stroke-width": 4 }, podium);
  land(tl, podium, at + 4, { y: 240 }, 16);

  const trophy = group(front);
  const cup = "M-108 -372H108V-276C108 -188 46 -150 18 -142V-52H74V-8H-74V-52H-18V-142C-46 -150 -108 -188 -108 -276Z";
  const handles = "M-108 -336H-166V-284C-166 -240 -132 -224 -104 -220M108 -336H166V-284C166 -240 132 -224 104 -220";
  el("path", { d: handles, fill: "none", stroke: INK, "stroke-width": 20 }, trophy);
  el("path", { d: extrude(cup, -12, 12), fill: INK, stroke: INK }, trophy);
  el("path", { d: cup, fill: PAPER, stroke: INK, "stroke-width": 5, "stroke-linejoin": "round" }, trophy);
  el("path", { d: "M-74 -344V-268", fill: "none", stroke: CYAN, "stroke-width": 12, "stroke-linecap": "round" }, trophy);
  text(trophy, 8, -222, "1", { size: 136, weight: 900, stretch: "125%", anchor: "middle" });
  gsap.set(trophy, { y: -860, transformOrigin: "50% 100%" });
  tl.to(trophy, { y: 0, duration: F(14), ease: "power3.in" }, F(at + 6));
  tl.fromTo(trophy, { scaleY: 0.78, scaleX: 1.16 }, { scaleY: 1, scaleX: 1, duration: F(14), ease: "back.out(3)", immediateRender: false }, F(at + 20));

  // Confetti fires from the impact.
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + rnd();
    const r = 240 + rnd() * 330;
    const fill = [INK, PAPER, CYAN][i % 3];
    const piece =
      i % 2
        ? el("rect", { x: -11, y: -7, width: 22, height: 14, fill }, front)
        : el("circle", { r: 9 + rnd() * 6, fill }, front);
    gsap.set(piece, { x: cx, y: cy + 80, scale: 0, transformOrigin: "50% 50%" });
    tl.to(piece, { scale: 1, duration: F(4), ease: "none" }, F(at + 20));
    tl.to(piece, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.7, rotation: 300 * (rnd() - 0.5), duration: F(16), ease: "power3.out" }, F(at + 20));
    tl.to(piece, { y: `+=${130 + rnd() * 70}`, rotation: `+=${200 * (rnd() - 0.5)}`, duration: F(22), ease: "power1.in" }, F(at + 36));
  }

  const glints = ([[-196, -330, 34], [214, -252, 24], [172, -388, 18]] as const).map(([x, y, r], i) => {
    const twinkle = group(front);
    loop(twinkle, { scale: 0.45, rotation: 45, svgOrigin: `${x} ${y}`, duration: 0.8 + i * 0.25, ease: "sine.inOut", yoyo: true });
    return el("path", { d: star(x, y, r), fill: PAPER, stroke: INK, "stroke-width": 2 }, twinkle);
  });
  glints.forEach((glint, i) => {
    gsap.set(glint, { transformOrigin: "50% 50%", autoAlpha: 0 });
    pop(tl, glint, at + 24 + i * 3, 1.3, 7, 7);
  });

  rain(s, 18, 47, [INK, PAPER, CYAN]);

  // Cyan blades open from the trophy like a shutter.
  const [fx, fy] = s.toFrame(cx, cy);
  const shutter = group(wipes, { transform: `translate(${fx},${fy})` });
  const spinShutter = group(shutter);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const turn = group(spinShutter, { transform: `rotate(${(i / n) * 360})` });
    const wedge = el("path", { d: "M0 0L3000 -860L3000 860Z", fill: CYAN }, turn);
    gsap.set(wedge, { svgOrigin: "0 0", scaleY: 0 });
    tl.to(wedge, { scaleY: 1, duration: F(13), ease: "power2.in" }, F(exit - 14 + (i % 2)));
  }
  gsap.set(spinShutter, { svgOrigin: "0 0" });
  tl.to(spinShutter, { rotation: 50, duration: F(14), ease: "soft" }, F(exit - 14));
  tl.set(shutter, { display: "none" }, F(exit));
}

/** First internship: a tower of windows lights up, and one of them is the way in. */
function internship(s: Stage) {
  const { back, front, tl, at, loop } = s;

  ([[-400, -300, 1, 70], [424, -360, 0.8, -50], [250, -120, 0.6, 40]] as const).forEach(([x, y, k, drift]) => {
    const cloud = group(back, { transform: `translate(${x},${y}) scale(${k})` });
    const breeze = group(cloud);
    const puff = group(breeze);
    loop(breeze, { x: drift * 1.1, duration: 4 + k * 3, ease: "sine.inOut", yoyo: true });
    el("path", { d: rrect(-110, -24, 220, 48, 24), fill: WHITE }, puff);
    el("path", { d: rrect(-60, -56, 120, 60, 30), fill: WHITE }, puff);
    tl.to(puff, { x: drift, duration: F(BEAT), ease: "none" }, F(at));
  });

  const tower = group(front);
  const [cols, rows] = [6, 8];
  const [cw, ch, gap] = [50, 38, 8];
  const [fw, fh] = [cols * (cw + gap) + 34, rows * (ch + gap) + 34];
  const [fx, fy] = [-fw / 2, -fh + 16];
  el("path", { d: poly([[-fx, fy], [-fx + 70, fy - 30], [-fx + 70, 16 - 30], [-fx, 16]]), fill: INK }, tower);
  el("path", { d: poly([[fx, fy], [fx + 70, fy - 30], [-fx + 70, fy - 30], [-fx, fy]]), fill: PAPER, stroke: INK, "stroke-width": 4 }, tower);
  el("rect", { x: fx, y: fy, width: fw, height: fh, fill: PAPER, stroke: INK, "stroke-width": 5 }, tower);
  const glass: SVGRectElement[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      glass.push(el("rect", { x: fx + 17 + col * (cw + gap), y: fy + 17 + row * (ch + gap), width: cw, height: ch, fill: INK }, tower));
    }
  }
  land(tl, tower, at, { y: 620 }, 22);

  // Lights spread out from the centre, in a wave. The dark middle window stays dark.
  const rnd = seeded(12);
  glass.forEach((pane, i) => {
    const d = Math.hypot((i % cols) - 2.5, Math.floor(i / cols) - 3.5);
    const roll = rnd();
    if (d < 1) return;
    tl.set(pane, { attr: { fill: roll < 0.3 ? CYAN : roll < 0.46 ? INK : roll < 0.62 ? LIME : WHITE } }, F(at + 16 + d * 3.4));
    // People keep switching lights on and off.
    if (roll > 0.72) loop(pane, { opacity: 0.12, duration: 0.45, repeatDelay: 0.8 + (i % 6) * 0.45, ease: "steps(1)", yoyo: true });
  });

  // A React atom spins up beside the tower, for the AngularJS migration.
  const atom = group(front, { transform: "translate(372,-250)" });
  const spin = group(atom);
  const whirl = group(spin);
  const orbits = [0, 60, 120].map((angle) =>
    el("ellipse", { rx: 104, ry: 40, fill: "none", stroke: INK, "stroke-width": 5 }, group(whirl, { transform: `rotate(${angle})` })),
  );
  loop(whirl, { rotation: 360, svgOrigin: "0 0", duration: 6, ease: "none" });
  gsap.set(orbits, { drawSVG: "0%" });
  tl.to(orbits, { drawSVG: "100%", duration: F(14), ease: "soft", stagger: F(2) }, F(at + 14));
  el("circle", { r: 18, fill: INK }, atom);
  gsap.set(spin, { svgOrigin: "0 0" });
  tl.to(spin, { rotation: 90, duration: F(40), ease: "none" }, F(at + 14));

  const briefcase = group(front);
  const bag = rrect(-426, 150, 170, 112, 8);
  el("path", { d: extrude(bag, -10, 10), fill: INK, stroke: INK }, briefcase);
  el("path", { d: bag, fill: PAPER, stroke: INK, "stroke-width": 4 }, briefcase);
  el("path", { d: "M-380 150V126H-302V150", fill: "none", stroke: INK, "stroke-width": 7 }, briefcase);
  el("rect", { x: -426, y: 196, width: 170, height: 7, fill: INK }, briefcase);
  el("rect", { x: -356, y: 188, width: 30, height: 22, fill: LIME, stroke: INK, "stroke-width": 3 }, briefcase);
  land(tl, briefcase, at + 12, { x: -420, y: 180, rotation: -14 }, 16);

  // The camera dives into a dark window. It sits on a seam of the grid, so aim at a real pane.
  const pane: Pt = [fx + 17 + 2 * (cw + gap) + cw / 2, fy + 17 + 3 * (ch + gap) + ch / 2];
  dive(s, pane, coverBox(s, cw, ch), 15, 6);
}

/** Second place: a stopwatch counts down two hours while a website assembles beside it. */
function resonance(s: Stage) {
  const { back, front, tl, at, exit, wipes, frame, loop } = s;
  const [wx, wy] = [-40, -190];

  const arcs = ["M-300 -330C-400 -210 -390 -70 -280 10", "M-262 -360C-352 -220 -350 -60 -246 40", "M210 -380C300 -300 330 -150 250 -30"].map((d) =>
    el("path", { d, fill: "none", stroke: PAPER, "stroke-width": 4, "stroke-linecap": "round" }, back),
  );
  arcs.forEach((arc, i) => swoosh(tl, arc, at + 6 + i * 2, 24));

  const watch = group(front);
  el("rect", { x: wx - 26, y: wy - 226, width: 52, height: 34, fill: LIME }, watch);
  el("rect", { x: wx - 44, y: wy - 244, width: 88, height: 20, fill: PAPER }, watch);
  el("circle", { cx: wx - 14, cy: wy + 14, r: 190, fill: PAPER }, watch);
  el("circle", { cx: wx, cy: wy, r: 190, fill: LIME }, watch);
  el("circle", { cx: wx, cy: wy, r: 164, fill: "none", stroke: INK, "stroke-width": 4 }, watch);
  el("path", { d: dots(dotRings(wx, wy, [[146, 60]]), 2.4), fill: INK }, watch);
  el("path", { d: dots(dotRings(wx, wy, [[140, 12]]), 6.5), fill: INK }, watch);
  const readout = text(watch, wx, wy + 86, "02:00", { size: 42, family: MONO, weight: 800, fill: INK, anchor: "middle" });
  const sweep = group(watch);
  const hand = el("line", { x1: wx, y1: wy + 24, x2: wx, y2: wy - 126, stroke: INK, "stroke-width": 9, "stroke-linecap": "round" }, sweep);
  el("circle", { cx: wx, cy: wy, r: 15, fill: INK }, watch);
  gsap.set(hand, { svgOrigin: `${wx} ${wy}` });
  loop(sweep, { rotation: 360, svgOrigin: `${wx} ${wy}`, duration: 2.6, ease: "none" });
  loop(readout, { opacity: 0.2, duration: 0.45, ease: "steps(1)", yoyo: true });
  tl.to(hand, { rotation: 720, duration: F(38), ease: "none" }, F(at + 8));
  ["01:30", "01:00", "00:30", "00:10", "00:00"].forEach((value, i) => {
    tl.set(readout, { textContent: value }, F(at + 14 + i * 6.5));
  });
  gsap.set(watch, { svgOrigin: `${wx} ${wy}` });
  pop(tl, watch, at + 2, 1.16, 12, 10);

  // A site assembles block by block, inside the two hours.
  const site = group(front);
  const page = rrect(216, -340, 266, 300, 10);
  el("path", { d: extrude(page, -11, 11), fill: PAPER, stroke: PAPER }, site);
  el("path", { d: page, fill: INK, stroke: PAPER, "stroke-width": 4 }, site);
  el("rect", { x: 216, y: -314, width: 266, height: 3, fill: PAPER }, site);
  const blocks: [number, number, number, number, string][] = [
    [234, -296, 230, 90, LIME],
    [234, -196, 70, 62, PAPER],
    [314, -196, 70, 62, CYAN],
    [394, -196, 70, 62, PAPER],
    [234, -124, 150, 14, PAPER],
    [234, -102, 110, 14, SLATE],
    [234, -80, 230, 22, LIME],
  ];
  const built = blocks.map(([x, y, w, h, fill]) => el("rect", { x, y, width: w, height: h, fill }, site));
  gsap.set(built, { scale: 0, transformOrigin: "0% 0%" });
  tl.to(built, { scale: 1, duration: F(8), ease: "back.out(1.8)", stagger: F(3.2) }, F(at + 14));
  // The site keeps deploying: a bar fills, clears and goes again.
  const deploy = el("rect", { x: 234, y: -80, width: 230, height: 22, fill: CYAN }, site);
  gsap.set(deploy, { svgOrigin: "234 0", scaleX: 0 });
  loop(deploy, { startAt: { scaleX: 0 }, scaleX: 1, duration: 1.6, ease: "power1.inOut", repeatDelay: 0.3 });
  land(tl, site, at + 6, { x: 460, y: -60, rotation: 8 }, 16);

  const medal = group(front);
  const swing = group(medal);
  el("path", { d: poly([[-372, -120], [-340, -40], [-316, -120]]), fill: CYAN }, swing);
  el("path", { d: poly([[-322, -120], [-300, -40], [-272, -120]]), fill: LIME }, swing);
  el("circle", { cx: -320, cy: -170, r: 62, fill: PAPER }, swing);
  el("circle", { cx: -320, cy: -170, r: 48, fill: "none", stroke: INK, "stroke-width": 3 }, swing);
  text(swing, -320, -150, "2", { size: 62, weight: 900, stretch: "125%", anchor: "middle" });
  gsap.set(swing, { svgOrigin: "-320 -40", rotation: -9 });
  loop(swing, { rotation: 9, svgOrigin: "-320 -40", duration: 1.1, ease: "sine.inOut", yoyo: true });
  gsap.set(medal, { svgOrigin: "-320 -170", autoAlpha: 0 });
  pop(tl, medal, at + 18, 1.2, 8, 8);

  // The hand sweeps a paper pie across the whole frame.
  const [px, py] = s.toFrame(wx, wy);
  const radius = Math.hypot(frame.vw, frame.vh) * 1.1;
  const pie = el("circle", { cx: px, cy: py, r: radius / 2, fill: "none", stroke: PAPER, "stroke-width": radius, transform: `rotate(-90 ${px} ${py})` }, wipes);
  gsap.set(pie, { drawSVG: "0%", autoAlpha: 0 });
  tl.set(pie, { autoAlpha: 1 }, F(exit - 15));
  tl.to(pie, { drawSVG: "100%", duration: F(15), ease: "power2.in" }, F(exit - 15));
  tl.set(pie, { display: "none" }, F(exit));
}

/** Ran Xynthraa: spotlights swing over a stage, the podium slams up, the crowd rises. */
function xynthraa(s: Stage) {
  const { back, front, tl, at, exit, wipes, frame, loop } = s;
  const rnd = seeded(66);

  ([[-470, LIME, 18], [0, GREY, -6], [470, CYAN, -18]] as const).forEach(([x, fill, tilt]) => {
    const sway = group(back);
    const beam = el("path", { d: `M${x} -640L${x - 90} 120L${x + 90} 120Z`, fill }, sway);
    gsap.set(sway, { svgOrigin: `${x} -640`, rotation: tilt * 0.9 });
    loop(sway, { rotation: tilt * -0.9, svgOrigin: `${x} -640`, duration: 2.1, ease: "sine.inOut", yoyo: true });
    gsap.set(beam, { svgOrigin: `${x} -640`, rotation: tilt * 2, scaleY: 0 });
    tl.to(beam, { scaleY: 1, duration: F(14), ease: "snap" }, F(at + 2));
    tl.to(beam, { rotation: -tilt, duration: F(50), ease: "sine.inOut" }, F(at + 2));
  });

  const rope = el("path", { d: "M-480 -350Q0 -230 480 -350", fill: "none", stroke: INK, "stroke-width": 3 }, front);
  gsap.set(rope, { drawSVG: "0%" });
  tl.to(rope, { drawSVG: "100%", duration: F(14), ease: "soft" }, F(at + 8));
  for (let i = 0; i < 13; i++) {
    const t = i / 12;
    const x = -480 + t * 960;
    const y = -350 + 240 * t * (1 - t);
    const breeze = group(front);
    const flag = el("path", { d: poly([[x - 26, y], [x + 26, y], [x, y + 50]]), fill: [INK, LIME, CYAN][i % 3], stroke: INK, "stroke-width": 2 }, breeze);
    gsap.set(breeze, { svgOrigin: `${x} ${y}`, skewX: -14 });
    loop(breeze, { skewX: 14, svgOrigin: `${x} ${y}`, duration: 0.6 + (i % 3) * 0.12, ease: "sine.inOut", yoyo: true });
    gsap.set(flag, { transformOrigin: "50% 0%", scaleY: 0 });
    tl.to(flag, { scaleY: 1, duration: F(8), ease: "back.out(2.4)" }, F(at + 10 + i * 0.8));
  }

  // Podium: 2nd and 3rd slam up, then 1st.
  const tiers: [number, number, number, string, string][] = [
    [-218, 150, 148, "2", GREY],
    [68, 150, 112, "3", GREY],
    [-74, 142, 196, "1", LIME],
  ];
  tiers.forEach(([x, w, h, label, fill], i) => {
    const tier = group(front);
    const d = rrect(x, 16 - h, w, h, 2);
    el("path", { d: extrude(d, -11, 11), fill: INK, stroke: INK }, tier);
    el("path", { d, fill, stroke: INK, "stroke-width": 4 }, tier);
    text(tier, x + w / 2, 16 - h + 72, label, { size: 62, weight: 900, stretch: "125%", anchor: "middle" });
    gsap.set(tier, { y: h + 40, autoAlpha: 0 });
    tl.set(tier, { autoAlpha: 1 }, F(at + 10 + i * 5));
    tl.to(tier, { y: 0, duration: F(12), ease: "back.out(2.2)" }, F(at + 10 + i * 5));
  });

  // The X26 mark drops above the top step and spins flat.
  const mark = group(front, { transform: "translate(0,-262)" });
  const spin = group(mark);
  const coin = group(spin);
  const hex = Array.from({ length: 6 }, (_, i): Pt => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a) * 74, Math.sin(a) * 74];
  });
  el("path", { d: poly(hex), fill: INK }, coin);
  text(coin, 0, 24, "X", { size: 76, weight: 900, stretch: "125%", fill: LIME, anchor: "middle" });
  // It turns on its axis like a sign on a pole.
  loop(coin, { scaleX: -1, svgOrigin: "0 0", duration: 1.5, ease: "sine.inOut", yoyo: true });
  gsap.set(spin, { svgOrigin: "0 0", scale: 0, rotation: -240 });
  tl.to(spin, { scale: 1, rotation: 0, duration: F(16), ease: "back.out(1.6)" }, F(at + 22));

  // Crowd on both sides of the road, rising in a wave.
  const crowd: SVGGElement[] = [];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 6 - row; i++) {
        const y = 120 + (2 - row) * 60;
        const x = side * (190 + (2 - row) * 90 + i * (48 + (2 - row) * 14) + rnd() * 8);
        const r = 13 + (2 - row) * 5;
        if (side < 0 && Math.abs(x) > 500) continue; // Keeps the crowd clear of the copy column.
        const person = group(front);
        const body = group(person);
        el("path", { d: `M${x - r * 1.4} ${y + r * 3.4}V${y + r * 1.9}Q${x} ${y + r * 0.6} ${x + r * 1.4} ${y + r * 1.9}V${y + r * 3.4}Z`, fill: INK }, body);
        el("circle", { cx: x, cy: y, r, fill: i % 4 === 1 ? LIME : i % 4 === 3 ? CYAN : INK, stroke: INK, "stroke-width": 2.5 }, body);
        // The crowd keeps a wave going along the road.
        loop(body, { y: -16, duration: 0.42, ease: "sine.inOut", yoyo: true, delay: (x + 700) * 0.0016 });
        gsap.set(person, { y: 110, autoAlpha: 0 });
        tl.set(person, { autoAlpha: 1 }, F(at + 12));
        tl.to(person, { y: 0, duration: F(11), ease: "back.out(2)" }, F(at + 12 + Math.abs(x) * 0.012 + row * 2));
        crowd.push(person);
      }
    }
  }
  tl.to(crowd, { y: -14, duration: F(6), ease: "sine.inOut", yoyo: true, repeat: 1, stagger: F(0.18) }, F(at + 30));

  // Cyan bars rise across the frame, from the middle out.
  const bars = 14;
  const left = (frame.W - frame.vw) / 2 - 20;
  const barW = (frame.vw + 40) / bars;
  for (let i = 0; i < bars; i++) {
    const bar = el("rect", { x: left + i * barW - 1, y: -frame.vh, width: barW + 2, height: frame.vh * 3, fill: CYAN }, wipes);
    gsap.set(bar, { transformOrigin: "50% 100%", scaleY: 0 });
    tl.to(bar, { scaleY: 1, duration: F(12), ease: "power3.in" }, F(exit - 14 + Math.abs(i - bars / 2) * 0.3));
    tl.set(bar, { display: "none" }, F(exit));
  }
}

/** Full-stack intern: a phone fills with messages while the user network spreads. */
function intern(s: Stage) {
  const { back, front, tl, at, exit, loop } = s;
  const rnd = seeded(29);

  // The network: real users, real scale.
  const hubs = Array.from({ length: 22 }, (_, i): Pt => {
    const a = (i / 22) * Math.PI * 2 + rnd();
    const r = 240 + rnd() * 250;
    return [Math.cos(a) * r, -170 + Math.sin(a) * r * 0.7];
  });
  const wires = hubs.map(([x, y]) => el("line", { x1: 0, y1: -170, x2: x, y2: y, stroke: INK, "stroke-width": 2 }, back));
  gsap.set(wires, { drawSVG: "0%" });
  tl.to(wires, { drawSVG: "100%", duration: F(12), ease: "soft", stagger: F(0.5) }, F(at + 8));
  const nodes = hubs.map(([x, y], i) => {
    const pulse = group(back);
    loop(pulse, { scale: 1.5, svgOrigin: `${x} ${y}`, duration: 0.6 + (i % 5) * 0.14, ease: "sine.inOut", yoyo: true });
    return el("circle", { cx: x, cy: y, r: 7 + (i % 4) * 4, fill: [PAPER, INK, LIME][i % 3], stroke: INK, "stroke-width": 2.5 }, pulse);
  });
  gsap.set(nodes, { scale: 0, transformOrigin: "50% 50%" });
  tl.to(nodes, { scale: 1, duration: F(8), ease: "back.out(2.6)", stagger: F(0.5) }, F(at + 14));
  // Messages keep leaving the phone along the wires.
  hubs.forEach(([x, y], i) => {
    if (i % 3) return;
    const message = el("line", { x1: 0, y1: -170, x2: x, y2: y, stroke: PAPER, "stroke-width": 5, "stroke-linecap": "round" }, back);
    gsap.set(message, { drawSVG: "0% 0%" });
    loop(message, { startAt: { drawSVG: "0% 10%" }, drawSVG: "90% 100%", duration: 0.9, ease: "none", delay: i * 0.08, repeatDelay: 0.4 });
  });

  const phone = group(front);
  const shell = rrect(-132, -398, 264, 452, 34);
  el("path", { d: extrude(shell, -14, 14), fill: PAPER, stroke: PAPER }, phone);
  el("path", { d: shell, fill: INK }, phone);
  el("path", { d: rrect(-116, -382, 232, 420, 22), fill: PAPER }, phone);
  el("path", { d: rrect(-40, -376, 80, 16, 8), fill: INK }, phone);
  land(tl, phone, at, { y: 760, rotation: 7 }, 20);

  const bubble = (x: number, y: number, w: number, h: number, fill: string, tail: number) => {
    const b = group(phone);
    el("path", { d: rrect(x, y, w, h, 16), fill }, b);
    el("path", { d: poly(tail < 0 ? [[x + 14, y + h - 2], [x + 2, y + h + 14], [x + 34, y + h - 2]] : [[x + w - 34, y + h - 2], [x + w - 2, y + h + 14], [x + w - 14, y + h - 2]]), fill }, b);
    gsap.set(b, { transformOrigin: tail < 0 ? "0% 100%" : "100% 100%", scale: 0 });
    return b;
  };
  [
    bubble(-100, -346, 150, 52, INK, -1),
    bubble(-48, -276, 148, 62, LIME, 1),
    bubble(-100, -196, 170, 52, CYAN, -1),
    bubble(-30, -126, 130, 46, LIME, 1),
  ].forEach((b, i) => {
    tl.to(b, { scale: 1, duration: F(9), ease: "back.out(2.4)" }, F(at + 10 + i * 5));
  });
  const typing = bubble(-100, -62, 104, 44, INK, -1);
  tl.to(typing, { scale: 1, duration: F(8), ease: "back.out(2.4)" }, F(at + 30));
  [-72, -48, -24].forEach((x, i) => {
    const hop = group(typing);
    loop(hop, { y: -9, duration: 0.26, ease: "sine.inOut", yoyo: true, delay: i * 0.1 });
    el("circle", { cx: x, cy: -40, r: 7, fill: PAPER }, hop);
  });

  // One black bubble swells over everything, and the camera goes through it.
  const swell = group(s.dolly);
  el("path", { d: rrect(-180, -270, 360, 200, 44), fill: INK }, swell);
  el("path", { d: poly([[-120, -76], [-150, -8], [-40, -76]]), fill: INK }, swell);
  gsap.set(swell, { svgOrigin: "0 -170", scale: 0 });
  tl.to(swell, { scale: 1, duration: F(9), ease: "back.out(1.4)" }, F(exit - 18));
  dive(s, [0, -170], coverBox(s, 300, 150), 11);
}

/** Graduated: caps fly, light spills from the doorway, and the next stretch begins. */
function graduated(s: Stage) {
  const { back, front, tl, at, exit, loop } = s;
  const rnd = seeded(83);

  const fan = group(back);
  gsap.set(fan, { svgOrigin: "0 -170", rotation: -6 });
  loop(fan, { rotation: 6, svgOrigin: "0 -170", duration: 2.6, ease: "sine.inOut", yoyo: true });
  [[-340, 30], [-190, 18], [0, 22], [190, 18], [340, 30]].forEach(([x, w]) => {
    const ray = el("path", { d: `M${x * 0.12 - 8} -170L${x - w} -760L${x + w} -760L${x * 0.12 + 8} -170Z`, fill: LIME, opacity: 0.9 }, fan);
    gsap.set(ray, { svgOrigin: "0 -170", scaleY: 0 });
    tl.to(ray, { scaleY: 1, duration: F(16), ease: "snap" }, F(at + 12 + rnd() * 6));
  });

  const doorway = group(s.dolly);
  el("rect", { x: -150, y: -172, width: 300, height: 322, fill: PAPER }, doorway);
  el("rect", { x: -168, y: -190, width: 336, height: 340, fill: "none", stroke: PAPER, "stroke-width": 6 }, doorway);
  drawWord(doorway, "2026", 0, -66, { size: 62, anchor: "middle" });
  text(doorway, 0, -34, "THE ROAD AHEAD", { size: 14, family: MONO, weight: 700, spacing: "0.1em", anchor: "middle" });
  gsap.set(doorway, { svgOrigin: "0 150", scaleY: 0 });
  tl.to(doorway, { scaleY: 1, duration: F(16), ease: "back.out(1.6)" }, F(at + 2));

  // Caps toss in arcs.
  ([[-340, -300, 1.1, -30], [320, -340, 1.2, 24], [10, -390, 0.9, 12], [442, -160, 0.8, -18]] as const).forEach(([x, y, k, turn], i) => {
    const flyer = group(front);
    const hang = group(flyer);
    loop(hang, { y: -20, rotation: 7, duration: 1.3 + i * 0.2, ease: "sine.inOut", yoyo: true });
    const cap = group(hang, { transform: `scale(${k})` });
    el("path", { d: "M-58 8V50C-30 74 30 74 58 50V8Z", fill: SLATE, stroke: PAPER, "stroke-width": 3 }, cap);
    el("path", { d: poly([[0, -46], [128, 8], [0, 62], [-128, 8]]), fill: PAPER }, cap);
    el("path", { d: "M94 20V76", stroke: LIME, "stroke-width": 7 }, cap);
    el("rect", { x: 82, y: 74, width: 24, height: 30, fill: LIME }, cap);
    gsap.set(flyer, { x: x * 0.2, y: 260, rotation: -turn * 5, autoAlpha: 0 });
    tl.set(flyer, { autoAlpha: 1 }, F(at + 8 + i * 3));
    tl.to(flyer, { x, y, rotation: turn, duration: F(24), ease: "power3.out" }, F(at + 8 + i * 3));
  });

  for (let i = 0; i < 22; i++) {
    const speck = el("circle", { r: 4 + rnd() * 5, fill: [LIME, PAPER, CYAN][i % 3] }, front);
    gsap.set(speck, { x: (rnd() - 0.5) * 900, y: -400 - rnd() * 200, autoAlpha: 0 });
    tl.set(speck, { autoAlpha: 1 }, F(at + 18));
    tl.to(speck, { y: 120 + rnd() * 160, duration: F(38), ease: "none" }, F(at + 18));
  }

  const diploma = group(front);
  el("path", { d: rrect(286, 170, 220, 58, 28), fill: PAPER }, diploma);
  el("ellipse", { cx: 486, cy: 199, rx: 14, ry: 29, fill: GREY }, diploma);
  el("rect", { x: 372, y: 166, width: 34, height: 66, fill: LIME }, diploma);
  land(tl, diploma, at + 14, { x: 340, y: 240, rotation: 20 }, 16);

  rain(s, 14, 83, [LIME, PAPER, CYAN]);

  // Forward through the doorway: the same paper the Work scene opens on. The zoom aims low
  // on the door, so its lettering flies out of the top of the frame before the cut.
  dive(s, [0, 60], Math.max(s.reachX / 150, s.reachY / 90) * 1.25, 18);
}

const STAGES = [born, school, engineering, firstPlace, internship, resonance, xynthraa, intern, graduated];

export function buildJourney(frame: Frame, stage: Element, root: HTMLElement) {
  const { W, H, vw, vh, portrait } = frame;
  const L = portrait ? PORTRAIT : LANDSCAPE;
  const [vx, vy] = L.vp;
  const svg = sceneSvg("journey", frame, stage);
  const film = gsap.timeline({ defaults: { ease: "none" } });
  const cut = (i: number) => PRELUDE + i * BEAT;
  const hold = (i: number) => cut(i) + 38;
  const [padX, padY] = [(vw - W) / 2, (vh - H) / 2];
  const T = L.title;

  const sky = el("rect", { x: -vw * 2, y: -vh * 2, width: vw * 5, height: vh * 5, fill: ERAS[0].sky }, svg);

  // The camera arrives on the frame centre from the About dive, tilts down onto the title,
  // and steers onto the timeline's line as it drives over it.
  const view = group(svg);
  gsap.set(view, { x: W / 2 - vx, y: H / 2 - vy });
  film.to(view, { x: T.vp[0] - vx, y: T.vp[1] - vy, duration: F(TITLE_IN), ease: "snap" }, 0);
  film.to(view, { x: 0, y: 0, duration: F(PRELUDE - TITLE_OUT + 8), ease: "soft" }, F(TITLE_OUT));

  // The whole world banks through each change of era.
  const bank = group(view);
  gsap.set(bank, { svgOrigin: `${vx} ${vy}` });
  const world = group(bank, { transform: `translate(${vx},${vy})` });

  const backs = group(world);
  const ground = el("rect", { x: -vw * 3, y: 0, width: vw * 6, height: vh * 4, fill: ERAS[0].sky }, world);

  // Everything that belongs to the road grows out of the vanishing point after each cut.
  const roadGroup = group(world);
  gsap.set(roadGroup, { svgOrigin: "0 0", scale: 0.02 });
  // In landscape the horizon stops short of the copy column.
  const horizon = el("line", { x1: -vw * 3, x2: vw * 3, y1: 0, y2: 0, stroke: ERAS[0].fg, "stroke-width": 2 }, roadGroup);
  if (!portrait) film.to(horizon, { attr: { x1: -440 }, duration: F(24), ease: "soft" }, F(TITLE_OUT + 10));

  // The road is one solid wedge: the biggest shape in the frame, and it never stops.
  const B = H - vy + padY + 260;
  const R = B * 1.5;
  const roadShape = el("path", { d: `M0 0L${R} ${B}L${-R} ${B}Z`, fill: ERAS[0].road }, roadGroup);
  const lane = el("path", { fill: ERAS[0].lane }, roadGroup);
  const rumble = el("path", { fill: ERAS[0].lane }, roadGroup);

  // The title: raised letters lying on the road, in the same perspective as the lanes.
  const titleLayer = group(world);
  const fronts = group(world);
  const streaks = el("path", { fill: ERAS[0].fg, opacity: 0 }, world);

  // Lanes, rumble strips and speed lines are one path each, rebuilt from a single value.
  // That keeps them in true perspective and tied to the scrub in both directions.
  const flow = { z: 0 };
  // The car never stops: this adds to the scrubbed distance, and runs by itself.
  const cruise = { z: 0 };
  const NEAR = 0.035;
  const depth = persp(NEAR);
  // The camera covers this much of the road before the title stops in front of it.
  const TITLE_Z = 1.3;
  const distance = (y: number) => 1 / (1 + (y * (1 - NEAR)) / (B * NEAR));
  const rise = T.rows.map(() => ({ t: 0 }));
  const titleRows = T.rows.map((row, r) => {
    const word = WORDS[row.word];
    const [near, far] = [distance(row.near), distance(row.far)];
    const walls = el("path", { fill: INK, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, titleLayer);
    const tops = el("path", { fill: LIME, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, titleLayer);
    const shapes = word.glyphs.filter((glyph) => glyph.d).map((glyph) => {
      const shape = outline(glyph.d, 5);
      // Ground plan: x across the road, z along it. The tops of the letters point away from the camera.
      const plan = shape.contours.map((contour) =>
        contour.map(([u, v]): Pt => [
          ((glyph.x + u - word.width / 2) / word.width) * 2 * row.half,
          near + (far - near) * Math.min(-v / word.capHeight, 1.04),
        ]),
      );
      return { shape, plan };
    });
    return { walls, tops, shapes, r };
  });
  const drawTitle = () => {
    const travel = (flow.z - TITLE_Z) * (1 - NEAR);
    const scale = (B * NEAR) / (1 - NEAR);
    for (const { walls, tops, shapes, r } of titleRows) {
      const height = 0.11 * rise[r].t;
      let wallD = "";
      let topD = "";
      for (const { shape, plan } of shapes) {
        plan.forEach((contour) => {
          const base: Pt[] = contour.map(([x, z]) => {
            const y = scale * (1 / Math.max(Math.min(z - travel, 1), 0.012) - 1);
            return [x * y, y];
          });
          const top: Pt[] = base.map(([x, y]) => [x, y * (1 - height)]);
          topD += `M${top.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
          for (let i = 0; i < base.length; i++) {
            const j = (i + 1) % base.length;
            // Only the walls facing the camera: the rest are under the tops.
            const [ex, ey] = [base[j][0] - base[i][0], base[j][1] - base[i][1]];
            const [dx, dy] = [top[i][0] - base[i][0], top[i][1] - base[i][1]];
            if ((ex * dy - ey * dx) * shape.sign < 0) continue;
            wallD += `M${base[i][0].toFixed(1)} ${base[i][1].toFixed(1)}L${base[j][0].toFixed(1)} ${base[j][1].toFixed(1)}L${top[j][0].toFixed(1)} ${top[j][1].toFixed(1)}L${top[i][0].toFixed(1)} ${top[i][1].toFixed(1)}Z`;
          }
        });
      }
      walls.setAttribute("d", wallD);
      tops.setAttribute("d", topD);
    }
  };
  const q = (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) =>
    `M${a.toFixed(1)} ${b.toFixed(1)}L${c.toFixed(1)} ${d.toFixed(1)}L${e.toFixed(1)} ${f.toFixed(1)}L${g.toFixed(1)} ${h.toFixed(1)}Z`;
  const rnd = seeded(5);
  const rays = Array.from({ length: 42 }, () => ({ a: rnd() * Math.PI * 2, p: rnd(), w: 0.006 + rnd() * 0.01, l: 0.16 + rnd() * 0.3 }));
  const drawFlow = () => {
    let laneD = "";
    let rumbleD = "";
    let rayD = "";
    for (let i = 0; i < 9; i++) {
      const t = (i / 9 + flow.z + cruise.z) % 1;
      const [y0, y1] = [B * depth(t), B * depth(Math.min(1, t + 0.05))];
      const [w0, w1] = [y0 * 0.022, y1 * 0.022];
      laneD += q(-w0, y0, w0, y0, w1, y1, -w1, y1);
    }
    for (let i = 0; i < 14; i++) {
      const t = (i / 14 + flow.z + cruise.z) % 1;
      const [y0, y1] = [B * depth(t), B * depth(Math.min(1, t + 0.034))];
      for (const side of [-1, 1]) {
        const [a0, a1] = [y0 * 1.44 * side, y1 * 1.44 * side];
        const [b0, b1] = [y0 * 1.33 * side, y1 * 1.33 * side];
        rumbleD += q(a0, y0, a1, y1, b1, y1, b0, y0);
      }
    }
    const reach = Math.hypot(vw, vh) * 1.2;
    for (const ray of rays) {
      const t = (ray.p + flow.z * 1.4) % 1;
      const r = reach * depth(t);
      const [c, s] = [Math.cos(ray.a), Math.sin(ray.a)];
      const r2 = r * (1 + ray.l);
      const w = r2 * ray.w;
      rayD += `M${(c * r).toFixed(1)} ${(s * r).toFixed(1)}L${(c * r2 - s * w).toFixed(1)} ${(s * r2 + c * w).toFixed(1)}L${(c * r2 + s * w).toFixed(1)} ${(s * r2 - c * w).toFixed(1)}Z`;
    }
    lane.setAttribute("d", laneD);
    rumble.setAttribute("d", rumbleD);
    streaks.setAttribute("d", rayD);
    drawTitle();
  };
  drawFlow();

  // Fast in, nearly stopped on the title, then away over the top of it.
  film.to(flow, { z: TITLE_Z, duration: F(TITLE_IN), ease: "power3.out", onUpdate: drawFlow }, 0);
  film.to(flow, { z: TITLE_Z + 0.008, duration: F(TITLE_OUT - TITLE_IN), onUpdate: drawFlow }, F(TITLE_IN));
  rise.forEach((row, r) => {
    film.to(row, { t: 1, duration: F(16), ease: "back.out(2.2)", onUpdate: drawTitle }, F(12 + r * 6));
  });

  // The one line that says how much road there is.
  const caption = text(svg, T.vp[0], T.caption.y, `${journey.length} STOPS · ${journey[0].year} TO ${journey.at(-1)!.year}`, {
    size: T.caption.size,
    family: MONO,
    weight: 600,
    spacing: "0.14em",
    fill: PAPER,
    anchor: "middle",
  });
  gsap.set(caption, { autoAlpha: 0, y: 16 });
  film.to(caption, { autoAlpha: 1, y: 0, duration: F(9), ease: "settle" }, F(24));
  film.to(caption, { autoAlpha: 0, y: -16, duration: F(6), ease: "power2.in" }, F(TITLE_OUT - 2));

  // On phones the copy sits on a panel in the ground colour, so the road never runs under text.
  const dash = portrait ? el("rect", { x: -vw, y: 880, width: vw * 3, height: vh, fill: ERAS[0].sky }, svg) : undefined;
  if (dash) gsap.set(dash, { y: vh });

  // Wipes that are not zooms sit above the world and ignore the camera.
  const wipes = group(svg);

  // Copy.
  const C = L.copy;
  journey.forEach((event, i) => {
    const era = ERAS[i];
    const panel = group(group(svg, { transform: `translate(${C.x},${C.y})` }));
    const index = text(panel, 0, 0, `${String(i + 1).padStart(2, "0")} / ${journey.length}`, {
      size: C.label,
      family: MONO,
      weight: 700,
      fill: era.fg,
    });
    const yearAt = C.year * 0.82 + 22;
    const yearWord = group(panel);
    drawWord(yearWord, event.year, -4, yearAt, {
      size: C.year,
      face: era.year,
      side: era.side,
      outline: 2.6,
      depth: [9, 14],
      ticks: era.sky,
    });

    const titleStyle: TextStyle = { size: C.title, weight: 800, stretch: "100%", fill: era.fg };
    const bodyStyle: TextStyle = { size: C.body, weight: 500, stretch: "92%", fill: era.fg };
    let y = yearAt + 38 + C.titleLine;
    const titleWords = wrap(event.title, C.width, C.titleLine, titleStyle);
    const lines = new Map<number, SVGGElement>();
    const wipeBlocks: SVGRectElement[] = [];
    for (const word of titleWords) {
      if (!lines.has(word.y)) {
        lines.set(word.y, group(panel));
        const end = titleWords.filter((w) => w.y === word.y).at(-1)!;
        wipeBlocks.push(
          el("rect", { x: -4, y: y + word.y - C.title * 0.86, width: end.x + end.width + 8, height: C.title * 1.04, fill: era.fg }, panel),
        );
      }
      text(lines.get(word.y)!, word.x, y + word.y, word.word, titleStyle);
    }
    y += titleWords.at(-1)!.y + C.titleLine * 0.72;
    const details = group(panel);
    text(details, 0, y, event.when, { size: portrait ? 23 : 14, family: MONO, weight: 600, fill: era.fg });
    y += C.bodyLine * 1.3;
    for (const word of wrap(event.text, C.width, C.bodyLine, bodyStyle)) {
      text(details, word.x, y + word.y, word.word, bodyStyle);
    }

    // Year slams in, the title wipes on behind a block, the details rise.
    const at = cut(i);
    gsap.set(panel, { autoAlpha: 0 });
    film.set(panel, { autoAlpha: 1 }, F(at + 6));
    gsap.set(index, { autoAlpha: 0 });
    film.set(index, { autoAlpha: 1 }, F(at + 8));
    slam(film, yearWord, at + 6);
    const rows = [...lines.values()];
    wipeBlocks.forEach((block, b) => blockWipe(film, block, rows[b], at + 12 + b * 3));
    gsap.set(details, { autoAlpha: 0, y: 20 });
    film.to(details, { autoAlpha: 1, y: 0, duration: F(9), ease: "settle" }, F(at + 19));
    film.to(panel, { x: -70, autoAlpha: 0, duration: F(7), ease: "power2.in" }, F(cut(i + 1) - 12));
  });

  // Timeline rail: the through-line of the section.
  const rail = group(svg);
  const railBase = el("line", { x1: L.rail.x, x2: L.rail.x + L.rail.w, y1: L.rail.y, y2: L.rail.y, stroke: ERAS[0].fg, "stroke-width": 2, opacity: 0.3 }, rail);
  const railFill = el("line", { x1: L.rail.x, x2: L.rail.x + L.rail.w, y1: L.rail.y, y2: L.rail.y, stroke: ERAS[0].fg, "stroke-width": 5 }, rail);
  const railDot = el("circle", { cx: L.rail.x, cy: L.rail.y, r: 9, fill: ERAS[0].fg }, rail);
  gsap.set(railFill, { drawSVG: "0%" });
  gsap.set(rail, { autoAlpha: 0 });
  film.set(rail, { autoAlpha: 1 }, F(cut(0) + 10));
  film.to(railFill, { drawSVG: "100%", duration: F(JOURNEY_LENGTH - PRELUDE - 12), ease: "none" }, F(cut(0) + 6));
  film.to(railDot, { x: L.rail.w, duration: F(JOURNEY_LENGTH - PRELUDE - 12), ease: "none" }, F(cut(0) + 6));
  film.set(rail, { autoAlpha: 0 }, F(JOURNEY_LENGTH - 16));

  // Each stop keeps its own loops, and only the stop on screen runs them.
  const loops: gsap.core.Tween[][] = journey.map(() => []);

  // Build each set piece. Arrival, portal and colours all happen on the same film.
  const art = L.art;
  STAGES.forEach((build, i) => {
    const at = cut(i);
    const exit = cut(i + 1);
    const backHolder = group(backs);
    const frontHolder = group(fronts);
    const backRide = group(group(backHolder, { transform: `scale(${art})` }));
    const frontRide = group(group(frontHolder, { transform: `scale(${art})` }));
    const dolly = group(frontRide);
    const front = group(dolly);
    const back = group(backRide);

    // Arrive from the vanishing point: fast, then a long settle, then a slow push.
    gsap.set([backRide, frontRide], { svgOrigin: "0 0", scale: 0.07 });
    film.to([backRide, frontRide], { scale: 1, duration: F(24), ease: "snap" }, F(at));
    film.to([backRide, frontRide], { scale: 1.07, duration: F(BEAT - 24 - 15), ease: "none" }, F(at + 24));

    build({
      back,
      front,
      dolly,
      wipes,
      tl: film,
      at,
      exit,
      frame,
      toFrame: (x, y) => [vx + x * art, vy + y * art],
      reachX: Math.max(vx + padX, W - vx + padX) / art,
      reachY: Math.max(vy + padY, H - vy + padY) / art,
      loop: (target, vars) => loops[i].push(gsap.to(target, { repeat: -1, paused: true, ...vars })),
    });

    if (i > 0) {
      gsap.set([backHolder, frontHolder], { display: "none" });
      film.set([backHolder, frontHolder], { display: "block" }, F(at));
    }
    if (i < journey.length - 1) film.set([backHolder, frontHolder], { display: "none" }, F(exit));

    if (dash) {
      // The panel drops away during a transition, so the wipe owns the whole frame.
      if (i < journey.length) film.to(dash, { y: vh, duration: F(10), ease: "power2.in" }, F(exit - 13));
      film.to(dash, { y: 0, duration: F(14), ease: "snap" }, F(at + 2));
    }
    // The rail steps aside for the transition, then returns in the new colour.
    if (i < journey.length - 1) film.to(rail, { autoAlpha: 0, duration: F(5) }, F(exit - 10));

    if (i > 0) {
      film.set(roadGroup, { scale: 0.02 }, F(at));
      film.to(rail, { autoAlpha: 1, duration: F(6) }, F(at + 10));
    }
    // The first stretch of road is already there: it is the one the title lies on.
    film.to(roadGroup, { scale: 1, duration: F(22), ease: "snap" }, F(i === 0 ? 2 : at));
    if (i === 0) return;

    // Hidden behind the portal: every surface flips to the new era on the same frame.
    const era = ERAS[i];
    film.set(sky, { attr: { fill: era.sky } }, F(at));
    film.set(ground, { attr: { fill: era.sky } }, F(at));
    film.set(roadShape, { attr: { fill: era.road } }, F(at));
    film.set([lane, rumble], { attr: { fill: era.lane } }, F(at));
    film.set(horizon, { attr: { stroke: era.fg } }, F(at));
    film.set(streaks, { attr: { fill: era.fg } }, F(at - 11));
    film.set([railBase, railFill], { attr: { stroke: era.fg } }, F(at));
    film.set(railDot, { attr: { fill: era.fg } }, F(at));
    if (dash) film.set(dash, { attr: { fill: era.sky } }, F(at));
    film.set(root, { "--chrome-ink": era.fg }, F(at - 2));
  });

  // Fast-slow-fast travel: the road races through each cut and eases at each hold.
  journey.forEach((_, i) => {
    const from = i === 0 ? TITLE_OUT : hold(i - 1);
    const to = i === journey.length - 1 ? JOURNEY_LENGTH : hold(i);
    film.to(flow, { z: TITLE_Z + (i + 1) * 1.6, duration: F(to - from), ease: i === 0 ? "power2.inOut" : "whoosh", onUpdate: drawFlow }, F(from));
  });
  film.to(streaks, { attr: { opacity: 0.7 }, duration: F(10) }, F(TITLE_OUT + 8));
  film.to(streaks, { attr: { opacity: 0 }, duration: F(12) }, F(PRELUDE));
  film.set(titleLayer, { display: "none" }, F(cut(0)));

  // The camera leans into every change of era and straightens for the hold.
  for (let i = 1; i < journey.length; i++) {
    const lean = i % 2 ? 6 : -6;
    const at = cut(i);
    film.to(bank, { rotation: lean, duration: F(12), ease: "sine.in" }, F(at - 12));
    film.to(bank, { rotation: 0, duration: F(22), ease: "snap" }, F(at));
    // Wipes hide the world, so speed lines would only pop in as the wipe clears.
    if (![4, 6, 7].includes(i)) {
      film.to(streaks, { attr: { opacity: 0.85 }, duration: F(8) }, F(at - 10));
      film.to(streaks, { attr: { opacity: 0 }, duration: F(12) }, F(at + 2));
    }
  }
  film.set({}, {}, F(JOURNEY_LENGTH));

  const rolling = gsap.to(cruise, { z: 1, duration: 11, ease: "none", repeat: -1, paused: true, onUpdate: drawFlow });
  let current = -1;
  /** Starts the loops of the stop under this frame of the scene, and stops the rest. */
  const live = (f: number) => {
    const next = f >= PRELUDE && f < JOURNEY_LENGTH ? Math.floor((f - PRELUDE) / BEAT) : -1;
    if (next === current) return;
    if (current >= 0) loops[current].forEach((tween) => tween.pause());
    if (next >= 0) loops[next].forEach((tween) => tween.play());
    rolling.paused(next < 0);
    current = next;
  };

  return { el: svg, film, live, title: TITLE_IN + 14, stops: journey.map((_, i) => hold(i)), cuts: journey.slice(1).map((_, i) => cut(i + 1)) };
}
