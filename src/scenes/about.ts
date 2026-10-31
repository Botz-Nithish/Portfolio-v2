import gsap from "gsap";
import { about as copy } from "../content/site";
import {
  contourRings,
  dotGrid,
  dotRings,
  dots,
  extrude,
  extrudeOutline,
  outline,
  poly,
  rrect,
  seeded,
  type Pt,
} from "../gfx/shapes";
import { COLOR, MONO, el, group, sceneSvg, text, wrap, type Frame, type TextStyle } from "../gfx/svg";
import { gust, type Gust } from "../motion/air";
import { F, persp } from "../motion/eases";
import { contourIn, idle, land, rush } from "../motion/kit";
import type { Hero } from "./hero";

const LANDSCAPE = {
  monitor: { x: 500, y: 118, w: 640, h: 430 },
  textSize: 31,
  lineHeight: 42,
  keyboard: { backY: 716, frontY: 806, backW: 470, frontW: 590, cx: 820 },
  mug: [292, 620] as Pt,
  speaker: { x: 1216, y: 540, s: 158 },
  win: { x: 1188, y: 112, w: 232, h: 176 },
  tag: { x: 240, y: 300, h: 78 },
  horizon: 690,
  vp: [820, 560] as Pt,
  contour: { cx: 820, cy: 330, rx: 260, ry: 170, gap: 21, count: 16, seed: 41 },
};

const PORTRAIT = {
  monitor: { x: 70, y: 360, w: 760, h: 610 },
  textSize: 35,
  lineHeight: 47,
  keyboard: { backY: 1170, frontY: 1270, backW: 520, frontW: 650, cx: 450 },
  mug: [156, 1310] as Pt,
  speaker: { x: 590, y: 1300, s: 150 },
  win: { x: 560, y: 136, w: 240, h: 170 },
  tag: { x: 84, y: 190, h: 78 },
  horizon: 1130,
  vp: [450, 1040] as Pt,
  contour: { cx: 450, cy: 620, rx: 220, ry: 260, gap: 21, count: 16, seed: 41 },
};

/** About starts black, inside the O. Paper covers the frame at this offset. */
const PAPERED = 30;
/** The desk scene ends with the screen covering the frame, at this offset. */
export const ABOUT_LENGTH = 252;
const DIVE = 226;
/** A frame with the whole desk built, and one with the whole manifesto on screen. */
export const ABOUT_BUILT = 104;
export const ABOUT_HOLD = 208;

/** Degrees of turn at which a spinning object is seen from above, and how far above. */
const TILT = { until: 60, angle: (15 * Math.PI) / 180 };

/**
 * Out of nothing, spinning like a turntable. It grows around its own centre, `draw` poses it
 * at each angle, and its weight comes down on the point it stands on. Two groups, two pivots.
 */
function spawn(
  tl: gsap.core.Timeline,
  landing: Element,
  grower: Element,
  [cx, cy]: Pt,
  [fx, fy]: Pt,
  at: number,
  turn: number,
  draw: (degrees: number) => void,
) {
  gsap.set(grower, { svgOrigin: `${cx} ${cy}` });
  gsap.set(landing, { svgOrigin: `${fx} ${fy}` });
  gsap.set(grower, { autoAlpha: 0, scale: 0 });
  tl.set(grower, { autoAlpha: 1 }, F(at));
  tl.to(grower, { scale: 1.06, duration: F(14), ease: "power2.out" }, F(at));
  tl.to(grower, { scale: 1, duration: F(10), ease: "sine.inOut" }, F(at + 22));

  const spin = { degrees: -turn };
  const pose = () => draw(spin.degrees);
  pose();
  tl.to(spin, { degrees: 13, duration: F(30), ease: "power2.out", onUpdate: pose }, F(at));
  tl.to(spin, { degrees: 0, duration: F(9), ease: "sine.inOut", onUpdate: pose }, F(at + 30));
  tl.to(landing, { scaleX: 1.08, scaleY: 0.89, duration: F(5), ease: "power2.out" }, F(at + 28));
  tl.to(landing, { scaleX: 1, scaleY: 1, duration: F(12), ease: "back.out(2.8)" }, F(at + 33));
}

export function buildAbout(frame: Frame, stage: Element, hero: Hero) {
  const { W, H, vw, vh, portrait } = frame;
  const P = portrait ? PORTRAIT : LANDSCAPE;
  const [cx, cy] = [W / 2, H / 2];
  const svg = sceneSvg("about", frame, stage);
  const film = gsap.timeline({ defaults: { ease: "none" } });
  const rnd = seeded(5);

  const defs = el("defs", {}, svg);
  const streakFill = el("linearGradient", { id: "streak", x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
  el("stop", { offset: 0, "stop-color": COLOR.white, "stop-opacity": 0 }, streakFill);
  el("stop", { offset: 1, "stop-color": COLOR.white }, streakFill);
  const ringStroke = el("linearGradient", { id: "ring", x1: 0, x2: 1, y1: 0.3, y2: 0.7 }, defs);
  el("stop", { offset: 0.1, "stop-color": COLOR.white, "stop-opacity": 0.04 }, ringStroke);
  el("stop", { offset: 1, "stop-color": COLOR.white }, ringStroke);

  // Inside the O: a black field the camera is still travelling through.
  el("rect", { x: -W, y: -H, width: W * 3, height: H * 3, fill: COLOR.ink }, svg);
  const tunnel = group(svg, { transform: `translate(${cx},${cy})` });

  for (let i = 0; i < 30; i++) {
    const turn = group(tunnel, { transform: `rotate(${rnd() * 360})` });
    const z = group(turn);
    const thick = 1.5 + rnd() * 3.5;
    el(
      "rect",
      { x: 150 + rnd() * 160, y: -thick / 2, width: 70 + rnd() * 90, height: thick, rx: thick / 2, fill: "url(#streak)" },
      z,
    );
    gsap.set(z, { svgOrigin: "0 0" });
    rush(film, z, -2 + i * 1.05, 16 + rnd() * 10, 7, 0.08);
  }
  [0, 9, 17].forEach((at, i) => {
    const z = group(tunnel);
    el("circle", { r: 150, fill: "none", stroke: "url(#ring)", "stroke-width": 11 - i * 2 }, z);
    gsap.set(z, { svgOrigin: "0 0" });
    rush(film, z, at, 26, 6, 0.1);
  });

  // A paper screen grows out of the dot and passes the camera: the polarity flip.
  const screen = group(svg, { transform: `translate(${cx},${cy})` });
  const screenInner = group(screen);
  el("rect", { x: -vw / 2, y: -vh / 2, width: vw, height: vh, rx: 80, fill: COLOR.paper }, screenInner);
  gsap.set(screenInner, { svgOrigin: "0 0", scale: 0.012, autoAlpha: 0 });
  film.set(screenInner, { autoAlpha: 1 }, F(8));
  film.to(screenInner, { scale: 1.5, duration: F(PAPERED - 8), ease: persp(0.04) }, F(8));

  // ---- The desk
  const world = group(svg);
  const dolly = group(world);
  const cam = group(dolly);
  gsap.set(cam, { svgOrigin: `${P.vp[0]} ${P.vp[1]}` });

  const field = group(cam);
  const rings = contourRings(P.contour).map((d, i) =>
    el("path", { d, fill: "none", stroke: COLOR.white, "stroke-width": i % 5 === 4 ? 2.8 : 1.4 }, field),
  );
  contourIn(film, field, rings, PAPERED - 6, 110, 2.6, 40);

  // Floor: hairlines out of the vanishing point, cut off at the horizon.
  const floor = group(cam);
  const horizon = el(
    "line",
    { x1: -vw, x2: W + vw, y1: P.horizon, y2: P.horizon, stroke: COLOR.ink, "stroke-width": 1.2 },
    floor,
  );
  const floorBottom = H + (vh - H) / 2 + 60;
  const floorLines = Array.from({ length: 11 }, (_, i) => {
    const t = (i + 0.5) / 11;
    const [vx, vy] = P.vp;
    const reachX = -W * 0.7 + t * W * 2.4;
    const y0 = P.horizon;
    const startT = (y0 - vy) / (floorBottom - vy);
    return el(
      "line",
      {
        x1: vx + (reachX - vx) * startT,
        y1: y0,
        x2: reachX,
        y2: floorBottom,
        stroke: COLOR.ink,
        "stroke-width": 1.1,
      },
      floor,
    );
  });
  gsap.set([horizon, ...floorLines], { drawSVG: "0%" });
  film.to(horizon, { drawSVG: "100%", duration: F(22), ease: "soft" }, F(PAPERED));
  film.to(floorLines, { drawSVG: "100%", duration: F(20), ease: "soft", stagger: F(0.8) }, F(PAPERED + 2));

  const m = P.monitor;
  const mcx = m.x + m.w / 2;

  // Cables run behind the monitor into the floating cards.
  const cables = group(cam);
  const cable = (d: string) => {
    el("path", { d, fill: "none", stroke: COLOR.ink, "stroke-width": 11, "stroke-linecap": "round" }, cables);
    const core = el("path", { d, fill: "none", stroke: COLOR.paper, "stroke-width": 5.5 }, cables);
    return core;
  };
  const w = P.win;
  const tagWidth = P.tag.h * 2;
  cable(`M${w.x} ${w.y + w.h * 0.62}H${m.x + m.w - 90}Q${m.x + m.w - 130} ${w.y + w.h * 0.62} ${m.x + m.w - 130} ${m.y + 30}`);
  cable(`M${P.tag.x + tagWidth} ${P.tag.y + P.tag.h / 2}H${m.x + 40}`);
  gsap.set(cables, { autoAlpha: 0 });
  film.set(cables, { autoAlpha: 1 }, F(PAPERED + 50));

  // The computer spins in as one object, so stand and monitor share two wrappers.
  const computerLanding = group(cam);
  const computerSpin = group(computerLanding);

  // Monitor stand: neck, foot, and a stepped hard shadow.
  const stand = group(computerSpin);
  const standArt = group(stand);
  const neckTop = m.y + m.h;
  const neckH = 96;
  const footY = neckTop + neckH;
  const footW = 320;
  el(
    "path",
    {
      d: poly([
        [mcx + footW / 2, footY + 22],
        [mcx + footW / 2 + 170, footY + 22],
        [mcx + footW / 2 + 130, footY + 44],
        [mcx + footW / 2 + 60, footY + 44],
        [mcx + footW / 2 + 40, footY + 62],
        [mcx - footW / 2 + 40, footY + 62],
        [mcx - footW / 2, footY + 22],
      ]),
      fill: COLOR.ink,
    },
    standArt,
  );
  el(
    "path",
    {
      d: poly([
        [mcx + 44, neckTop],
        [mcx + 66, neckTop - 8],
        [mcx + 66, footY - 12],
        [mcx + 44, footY],
      ]),
      fill: COLOR.slate,
      stroke: COLOR.ink,
      "stroke-width": 3.5,
      "stroke-linejoin": "round",
    },
    standArt,
  );
  el(
    "rect",
    { x: mcx - 44, y: neckTop, width: 88, height: neckH, fill: COLOR.grey, stroke: COLOR.ink, "stroke-width": 4 },
    standArt,
  );
  el(
    "path",
    {
      d: poly([
        [mcx - footW / 2 + 26, footY - 14],
        [mcx + footW / 2 + 26, footY - 14],
        [mcx + footW / 2, footY],
        [mcx - footW / 2, footY],
      ]),
      fill: COLOR.paper,
      stroke: COLOR.ink,
      "stroke-width": 3.5,
      "stroke-linejoin": "round",
    },
    standArt,
  );
  el(
    "rect",
    { x: mcx - footW / 2, y: footY, width: footW, height: 22, fill: COLOR.grey, stroke: COLOR.ink, "stroke-width": 4 },
    standArt,
  );

  // Monitor: a black mass, a double outline and a hard extruded edge.
  const monitor = group(computerSpin);
  const body = rrect(m.x, m.y, m.w, m.h, 26);
  const monitorEdge = el("path", { fill: COLOR.ink, stroke: COLOR.ink }, monitor);
  el("path", { d: body, fill: COLOR.paper, stroke: COLOR.ink, "stroke-width": 4.5 }, monitor);
  el(
    "path",
    { d: rrect(m.x + 11, m.y + 11, m.w - 22, m.h - 22, 18), fill: "none", stroke: COLOR.ink, "stroke-width": 1.5 },
    monitor,
  );
  const screenBox = { x: m.x + 22, y: m.y + 22, w: m.w - 44, h: m.h - 66 };
  el("path", { d: rrect(screenBox.x, screenBox.y, screenBox.w, screenBox.h, 12), fill: COLOR.ink }, monitor);
  el("circle", { cx: m.x + m.w - 40, cy: m.y + m.h - 22, r: 5, fill: COLOR.lime }, monitor);
  text(monitor, m.x + 28, m.y + m.h - 17, "NR-2026", { size: 11, family: MONO, weight: 600, spacing: "0.1em" });

  // Terminal chrome on the screen.
  const term = group(monitor);
  [COLOR.lime, COLOR.cyan, COLOR.white].forEach((fill, i) => {
    el("circle", { cx: screenBox.x + 24 + i * 18, cy: screenBox.y + 24, r: 5, fill }, term);
  });
  text(term, screenBox.x + screenBox.w - 22, screenBox.y + 29, "~/about", {
    size: 13,
    family: MONO,
    weight: 500,
    fill: COLOR.slate,
    anchor: "end",
  });

  // Manifesto: words are typed by a lime caret as you scroll.
  const textStyle: TextStyle = { size: P.textSize, weight: 500, stretch: "90%", fill: COLOR.paper };
  const textX = screenBox.x + 30;
  const textY = screenBox.y + 78;
  const caret = el("rect", { class: "blink", x: textX, y: textY - P.textSize, width: 14, height: P.textSize + 7, fill: COLOR.lime }, monitor);
  gsap.set(caret, { autoAlpha: 0 });
  const words = wrap(copy.manifesto, screenBox.w - 60, P.lineHeight, textStyle);
  const typed = words.map((placed, i) => {
    const hot = placed.word === copy.highlight || i >= words.length - copy.highlightLast;
    const node = group(monitor);
    if (hot) {
      el(
        "rect",
        {
          x: textX + placed.x - 3,
          y: textY + placed.y - P.textSize + 1,
          width: placed.width + 6,
          height: P.textSize + 7,
          fill: COLOR.lime,
        },
        node,
      );
    }
    text(node, textX + placed.x, textY + placed.y, placed.word, { ...textStyle, fill: hot ? COLOR.ink : COLOR.paper });
    gsap.set(node, { autoAlpha: 0 });
    return { node, placed, i };
  });

  // The rest of the box, seen only while it turns: back, two sides and a top.
  const THICK = 88;
  const faces = group(computerSpin);
  const monitorBack = group(faces);
  el("path", { d: body, fill: COLOR.paper, stroke: COLOR.ink, "stroke-width": 4.5 }, monitorBack);
  el("path", { d: rrect(m.x + 64, m.y + 54, m.w - 128, m.h - 118, 34), fill: COLOR.grey, stroke: COLOR.ink, "stroke-width": 3.5 }, monitorBack);
  el(
    "path",
    {
      d: Array.from({ length: 7 }, (_, i) => `M${mcx - 150} ${m.y + 92 + i * 15}H${mcx + 150}`).join(""),
      fill: "none",
      stroke: COLOR.ink,
      "stroke-width": 4,
    },
    monitorBack,
  );
  el("rect", { x: mcx - 54, y: m.y + m.h - 170, width: 108, height: 96, rx: 8, fill: COLOR.ink }, monitorBack);
  el("circle", { cx: m.x + m.w - 34, cy: m.y + m.h - 34, r: 9, fill: COLOR.lime }, monitorBack);
  const sideFace = () => el("rect", { x: -THICK / 2, y: -m.h / 2, width: THICK, height: m.h, rx: 12, fill: COLOR.ink }, faces);
  const [sideRight, sideLeft] = [sideFace(), sideFace()];
  const topFace = el("rect", { x: -m.w / 2, y: -THICK / 2, width: m.w, height: THICK, rx: 12, fill: COLOR.grey, stroke: COLOR.ink, "stroke-width": 3.5 }, faces);

  // A true box: each face is a flat plane, so its projection is one affine matrix.
  const bodyShape = outline(body);
  const [boxX, boxY] = [mcx, m.y + m.h / 2];
  const matrix = (node: Element, a: number, b: number, c: number, d: number, e: number, f: number) =>
    node.setAttribute("transform", `matrix(${[a, b, c, d, e, f].map((v) => v.toFixed(4)).join(" ")})`);
  const show = (node: Element, visible: boolean) => node.setAttribute("visibility", visible ? "visible" : "hidden");
  const drawComputer = (degrees: number) => {
    const turn = (degrees * Math.PI) / 180;
    const [cos, sin] = [Math.cos(turn), Math.sin(turn)];
    const lift = Math.min(Math.abs(degrees) / TILT.until, 1) * TILT.angle;
    const [up, over] = [Math.cos(lift), Math.sin(lift)];
    const [half, deep] = [m.w / 2, THICK / 2];
    const plane = (node: Element, z: number) =>
      matrix(node, cos, -sin * over, 0, up, boxX - boxX * cos + z * sin, boxY - boxY * up + boxX * sin * over + z * cos * over);
    plane(monitor, deep);
    plane(monitorBack, -deep);
    matrix(sideRight, sin, cos * over, 0, up, boxX + half * cos, boxY - half * sin * over);
    matrix(sideLeft, sin, cos * over, 0, up, boxX - half * cos, boxY + half * sin * over);
    matrix(topFace, cos, -sin * over, sin, cos * over, boxX, boxY - (m.h / 2) * up);
    show(monitor, cos > 0);
    show(monitorBack, cos <= 0);
    show(sideRight, sin < 0);
    show(sideLeft, sin > 0);
    show(topFace, lift > 0);
    // The hard edge belongs to the resting pose, so it grows back in as the box comes level.
    const edge = 1 - Math.min(Math.abs(degrees) / 26, 1);
    monitorEdge.setAttribute("d", extrudeOutline(bodyShape, -17 * edge, 17 * edge));
    monitorEdge.setAttribute("visibility", edge > 0 ? "visible" : "hidden");
    // The foot is nearly as deep as it is wide, so it barely narrows as it turns.
    const foot = Math.hypot(cos, sin * 0.62);
    matrix(standArt, foot, 0, 0, 1, mcx * (1 - foot), 0);
  };

  // Keyboard: one trapezoid, keys interpolated across it in perspective.
  const kb = P.keyboard;
  const keyboard = group(cam);
  const corner = (u: number, v: number): Pt => {
    const y = kb.backY + (kb.frontY - kb.backY) * v;
    const half = (kb.backW + (kb.frontW - kb.backW) * v) / 2;
    return [kb.cx - half + u * half * 2, y];
  };
  const deck = poly([corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)]);
  el("path", { d: extrude(deck, 0, 15), fill: COLOR.ink, stroke: COLOR.ink }, keyboard);
  el("path", { d: deck, fill: COLOR.paper, stroke: COLOR.ink, "stroke-width": 3.5, "stroke-linejoin": "round" }, keyboard);
  const [rows, cols] = [4, 14];
  const keys: Record<string, string> = { plain: "", lime: "", cyan: "", ink: "" };
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const pad = 0.012;
      const [u0, u1] = [0.03 + (col / cols) * 0.94 + pad, 0.03 + ((col + 1) / cols) * 0.94 - pad];
      const [v0, v1] = [0.09 + (row / rows) * 0.82 + 0.02, 0.09 + ((row + 1) / rows) * 0.82 - 0.02];
      const quad = poly([corner(u0, v0), corner(u1, v0), corner(u1, v1), corner(u0, v1)]);
      const roll = rnd();
      const tint = roll < 0.05 ? "lime" : roll < 0.1 ? "cyan" : roll < 0.22 ? "ink" : "plain";
      keys[tint] += quad;
    }
  }
  el("path", { d: keys.plain, fill: COLOR.grey, stroke: COLOR.ink, "stroke-width": 1.1 }, keyboard);
  el("path", { d: keys.ink, fill: COLOR.ink }, keyboard);
  el("path", { d: keys.lime, fill: COLOR.lime, stroke: COLOR.ink, "stroke-width": 1.1 }, keyboard);
  el("path", { d: keys.cyan, fill: COLOR.cyan, stroke: COLOR.ink, "stroke-width": 1.1 }, keyboard);

  // Mug.
  const [mx, my] = P.mug;
  const mugLanding = group(cam);
  const mugSpin = group(mugLanding);
  const mug = group(mugSpin);
  const [mugW, mugH] = [108, 116];
  el("ellipse", { cx: mx + 34, cy: my + mugH + 6, rx: 86, ry: 17, fill: COLOR.ink }, mug);
  // The cup is round, so turning it only moves what is on it: the handle goes round
  // behind and in front, and the label slides across the face and away.
  const handleAt = (x: number) => `M${mx + (mugW / 2 - 4) * x} ${my + 26}c${44 * x} -6 ${60 * x} 50 ${-4 * x} 62`;
  const handleParts = () => {
    const parts = group(mug);
    const shapes = [
      el("path", { fill: "none", stroke: COLOR.ink, "stroke-width": 13, "stroke-linecap": "round" }, parts),
      el("path", { fill: "none", stroke: COLOR.paper, "stroke-width": 5 }, parts),
    ];
    return { parts, shapes };
  };
  const handleBehind = handleParts();
  el(
    "path",
    {
      d: `M${mx - mugW / 2} ${my}L${mx - mugW / 2 + 8} ${my + mugH}A${mugW / 2 - 8} 13 0 0 0 ${mx + mugW / 2 - 8} ${my + mugH}L${mx + mugW / 2} ${my}Z`,
      fill: COLOR.paper,
      stroke: COLOR.ink,
      "stroke-width": 4,
      "stroke-linejoin": "round",
    },
    mug,
  );
  el("ellipse", { cx: mx, cy: my, rx: mugW / 2, ry: 15, fill: COLOR.grey, stroke: COLOR.ink, "stroke-width": 4 }, mug);
  el("ellipse", { cx: mx, cy: my + 2, rx: mugW / 2 - 10, ry: 10, fill: COLOR.ink }, mug);
  const mugLabel = group(mug);
  text(mugLabel, mx, my + 68, "</>", { size: 28, family: MONO, weight: 700, anchor: "middle" });
  const handleFront = handleParts();
  const drawMug = (degrees: number) => {
    const turn = (degrees * Math.PI) / 180;
    const [cos, sin] = [Math.cos(turn), Math.sin(turn)];
    for (const { shapes } of [handleBehind, handleFront]) {
      for (const shape of shapes) shape.setAttribute("d", handleAt(cos));
    }
    show(handleBehind.parts, sin >= 0);
    show(handleFront.parts, sin < 0);
    matrix(mugLabel, cos, 0, 0, 1, mx * (1 - cos) + (mugW / 2 - 8) * sin, 0);
    show(mugLabel, cos > 0);
  };
  const steam = [-22, 2, 26].map((dx, i) =>
    el(
      "path",
      {
        d: `M${mx + dx} ${my - 22}c-16 -22 16 -34 0 -58c-10 -16 8 -26 2 -44`,
        fill: "none",
        stroke: COLOR.ink,
        "stroke-width": i === 1 ? 2.4 : 1.4,
        "stroke-linecap": "round",
      },
      mug,
    ),
  );

  // Speaker: a cube with a dotted grille and a long hard shadow.
  const { x: sx, y: sy, s } = P.speaker;
  const speaker = group(cam);
  const [ox, oy] = [46, -36];
  el(
    "path",
    {
      d: poly([
        [sx + s, sy + s],
        [sx + s + ox, sy + s + oy],
        [sx + s + ox + 118, sy + s + 30],
        [sx + s + 66, sy + s + 30],
        [sx + s + 34, sy + s + 22],
      ]),
      fill: COLOR.ink,
    },
    speaker,
  );
  el(
    "path",
    {
      d: poly([
        [sx + s, sy],
        [sx + s + ox, sy + oy],
        [sx + s + ox, sy + s + oy],
        [sx + s, sy + s],
      ]),
      fill: COLOR.ink,
      stroke: COLOR.ink,
      "stroke-width": 4,
      "stroke-linejoin": "round",
    },
    speaker,
  );
  el(
    "path",
    {
      d: poly([
        [sx, sy],
        [sx + ox, sy + oy],
        [sx + s + ox, sy + oy],
        [sx + s, sy],
      ]),
      fill: COLOR.paper,
      stroke: COLOR.ink,
      "stroke-width": 4,
      "stroke-linejoin": "round",
    },
    speaker,
  );
  el("rect", { x: sx, y: sy, width: s, height: s, fill: COLOR.grey, stroke: COLOR.ink, "stroke-width": 4 }, speaker);
  el(
    "path",
    {
      d: dots(
        dotRings(sx + s / 2, sy + s / 2, [
          [s * 0.14, 12],
          [s * 0.21, 18],
          [s * 0.28, 24],
          [s * 0.35, 30],
          [s * 0.42, 36],
        ]),
        1.9,
      ),
      fill: COLOR.ink,
    },
    speaker,
  );
  el("circle", { cx: sx + s / 2, cy: sy + s / 2, r: s * 0.075, fill: COLOR.ink }, speaker);

  // Floating window. The cyan dot from the hero lands here as its disc.
  const win = group(cam);
  const winIdle = group(win);
  idle(winIdle, { y: -7, duration: 2.6, ease: "sine.inOut", yoyo: true });
  const winBody = rrect(w.x, w.y, w.w, w.h, 6);
  el("path", { d: extrude(winBody, -10, 10), fill: COLOR.ink, stroke: COLOR.ink }, winIdle);
  el("path", { d: winBody, fill: COLOR.grey, stroke: COLOR.ink, "stroke-width": 3.5 }, winIdle);
  el("line", { x1: w.x, x2: w.x + w.w, y1: w.y + 26, y2: w.y + 26, stroke: COLOR.ink, "stroke-width": 2.5 }, winIdle);
  [0, 1, 2].forEach((i) => el("circle", { cx: w.x + 15 + i * 13, cy: w.y + 13, r: 3.6, fill: COLOR.ink }, winIdle));
  const blackDisc: Pt = [w.x + w.w * 0.42, w.y + 88];
  const cyanDisc: Pt = [w.x + w.w * 0.6, w.y + 112];
  el("circle", { cx: blackDisc[0], cy: blackDisc[1], r: 47, fill: COLOR.ink }, winIdle);
  const cyanFinal = el("circle", { cx: cyanDisc[0], cy: cyanDisc[1], r: 42, fill: COLOR.cyan }, winIdle);
  gsap.set(cyanFinal, { autoAlpha: 0 });
  el(
    "path",
    { d: dots(dotGrid(w.x + 12, w.y + w.h + 12, 14, 3, 8), 1.7), fill: COLOR.ink },
    win,
  );

  // Tag: two cells, a lime disc and a black diamond.
  const tag = group(cam);
  const tagIdle = group(tag);
  idle(tagIdle, { y: 6, duration: 3.1, ease: "sine.inOut", yoyo: true });
  const h = P.tag.h;
  const tagBody = rrect(P.tag.x, P.tag.y, h * 2, h, 4);
  el("path", { d: extrude(tagBody, -8, 8), fill: COLOR.ink, stroke: COLOR.ink }, tagIdle);
  el("path", { d: tagBody, fill: COLOR.paper, stroke: COLOR.ink, "stroke-width": 3.5 }, tagIdle);
  el(
    "line",
    { x1: P.tag.x + h, x2: P.tag.x + h, y1: P.tag.y, y2: P.tag.y + h, stroke: COLOR.ink, "stroke-width": 3 },
    tagIdle,
  );
  el("circle", { cx: P.tag.x + h / 2, cy: P.tag.y + h / 2, r: 22, fill: COLOR.lime, stroke: COLOR.ink, "stroke-width": 3 }, tagIdle);
  const [dcx, dcy] = [P.tag.x + h * 1.5, P.tag.y + h / 2];
  el(
    "path",
    {
      d: poly([
        [dcx, dcy - 25],
        [dcx + 25, dcy],
        [dcx, dcy + 25],
        [dcx - 25, dcy],
      ]),
      fill: COLOR.ink,
    },
    tagIdle,
  );

  const near = PAPERED + 1;
  const [footX, footY2] = [mcx, footY + 22];
  const [mugX, mugY] = [mx, my + mugH];

  // The computer and the mug spawn first, one after the other, each in its own wind.
  gsap.set(stand, { svgOrigin: `${footX} ${footY2}` });
  gsap.set(mug, { svgOrigin: `${mugX} ${mugY}` });
  spawn(film, computerLanding, computerSpin, [mcx, (m.y + footY2) / 2], [footX, footY2], near + 3, 720, drawComputer);
  spawn(film, mugLanding, mugSpin, [mx, my + mugH / 2], [mugX, mugY], near + 17, 900, drawMug);

  const air = group(cam);
  const computerWind = { centre: [mcx, m.y + m.h * 0.62] as Pt, rx: m.w * 0.66, ry: m.h * 0.9 };
  const computerAir: Gust[] = [
    { from: 128, sweep: 150, start: 1, end: 1.1, width: 58, band: true, delay: 0 },
    { from: 118, sweep: 186, start: 1.14, end: 1.28, width: 12, delay: 2 },
    { from: 146, sweep: 164, start: 1.3, end: 1.4, width: 3.4, delay: 4 },
    { from: -46, sweep: 118, start: 1.08, end: 1.16, width: 9, delay: 3 },
    { from: -28, sweep: 96, start: 1.26, end: 1.32, width: 2.6, delay: 6 },
  ];
  gust(film, air, computerWind, computerAir, near + 2, 38);
  // A flat ring of air on the floor: what a horizontal spin throws off.
  const floorRing = (from: number): Gust[] => [
    { from, sweep: 250, start: 1, end: 1.08, width: 9, delay: 0 },
    { from: from + 150, sweep: 220, start: 1.2, end: 1.26, width: 3, delay: 2 },
  ];
  gust(film, air, { centre: [footX, footY2 - 6], rx: footW * 0.86, ry: 60 }, floorRing(150), near + 4, 34);

  // The mug's air wraps round it from below and over the top, the way a wind leaves a pot.
  const ball = group(cam);
  el("circle", { r: 15, fill: COLOR.ink }, ball);
  el("path", { d: "M-20 3L20 -6", fill: "none", stroke: COLOR.white, "stroke-width": 3.4 }, ball);
  gsap.set(ball, { autoAlpha: 0 });
  film.set(ball, { autoAlpha: 1 }, F(near + 15));
  const mugWind = { centre: [mugX, my + mugH * 0.4] as Pt, rx: 168, ry: 168 };
  const mugAir: Gust[] = [
    { from: 112, sweep: 152, start: 0.92, end: 1.08, width: 15, delay: 0 },
    { from: 96, sweep: 176, start: 0.72, end: 0.96, width: 70, band: true, delay: 0 },
    { from: 158, sweep: 122, start: 1.28, end: 1.26, width: 5.5, delay: 2 },
    { from: 218, sweep: 96, start: 1.5, end: 1.42, width: 2.8, delay: 4 },
  ];
  gust(film, air, mugWind, mugAir, near + 15, 40, ball);
  gust(film, air, { centre: [mugX, mugY - 2], rx: mugW * 1.05, ry: 26 }, floorRing(170), near + 18, 32);

  // The rest of the desk arrives around them, on its own depth.
  land(film, keyboard, near + 32, { y: 460, scale: 2.1 }, 18);
  land(film, speaker, near + 36, { x: 760, y: 280, scale: 2, rotation: 10 }, 18);
  land(film, win, near + 38, { x: 620, y: -340, scale: 1.9, rotation: 12 }, 18);
  land(film, tag, near + 39, { x: -640, y: -240, scale: 1.9, rotation: -12 }, 18);
  const speakerWind = { centre: [sx + s / 2 + 20, sy + s / 2] as Pt, rx: 170, ry: 170 };
  gust(
    film,
    air,
    speakerWind,
    [
      { from: -70, sweep: 120, start: 1, end: 1.1, width: 10, delay: 0 },
      { from: -50, sweep: 110, start: 1.26, end: 1.3, width: 3, delay: 3 },
    ],
    near + 37,
    26,
  );
  gsap.set(steam, { drawSVG: "0%" });
  film.to(steam, { drawSVG: "100%", duration: F(30), ease: "soft", stagger: F(4) }, F(near + 42));

  // The hero's dot travels on to the window and becomes its cyan disc.
  const [dotX, dotY] = hero.dotCentre;
  const dotScale = 42 / hero.dotRadius;
  const dotLand = near + 38;
  film.to(
    hero.anchorOuter,
    {
      x: cyanDisc[0] - dotX,
      y: cyanDisc[1] - dotY,
      duration: F(18),
      ease: "snap",
    },
    F(dotLand),
  );
  film.to(hero.anchorInner, { scale: dotScale, duration: F(18), ease: "snap" }, F(dotLand));
  film.set(cyanFinal, { autoAlpha: 1 }, F(dotLand + 18));
  film.set(hero.anchorLayer, { display: "none" }, F(dotLand + 18));

  // Typing, one word every few frames, with a slow push on the desk underneath.
  const typeStart = near + 62;
  const typeLength = Math.round(words.length * 2.9);
  film.set(caret, { autoAlpha: 1 }, F(typeStart - 2));
  typed.forEach(({ node, placed }, i) => {
    const at = typeStart + (i / words.length) * typeLength;
    film.set(node, { autoAlpha: 1 }, F(at));
    film.set(
      caret,
      { attr: { x: textX + placed.x + placed.width + 8, y: textY + placed.y - P.textSize } },
      F(at),
    );
  });
  film.to(cam, { scale: 1.055, rotation: -0.7, duration: F(DIVE - near - 22), ease: "none" }, F(near + 22));

  // The text backspaces away, then the camera dives into the empty screen.
  film.set(caret, { attr: { x: textX, y: textY - P.textSize } }, F(DIVE));
  [...typed].reverse().forEach(({ node }, i) => {
    film.set(node, { autoAlpha: 0 }, F(DIVE - 12 + (i / words.length) * 12));
  });
  film.set(caret, { autoAlpha: 0 }, F(DIVE + 6));

  const [scx, scy] = [screenBox.x + screenBox.w / 2, screenBox.y + screenBox.h / 2];
  const cover = Math.max(vw / (screenBox.w - 34), vh / (screenBox.h - 34)) * 1.12;
  gsap.set(dolly, { svgOrigin: `${scx} ${scy}` });
  film.to(dolly, { x: cx - scx, y: cy - scy, duration: F(14), ease: "soft" }, F(DIVE));
  film.to(dolly, { rotation: -7, duration: F(12), ease: "soft" }, F(DIVE));
  film.to(dolly, { rotation: 0, duration: F(14), ease: "soft" }, F(DIVE + 10));
  film.to(dolly, { scale: cover, duration: F(ABOUT_LENGTH - DIVE), ease: persp(0.14) }, F(DIVE));

  // Near props leave first, the same order the reference uses.
  const leave = { duration: F(12), ease: "power2.in" };
  film.to(mug, { x: -900, y: 560, scale: 3, rotation: -16, ...leave }, F(DIVE));
  film.to(keyboard, { y: 640, scale: 3, ...leave }, F(DIVE + 1));
  film.to(speaker, { x: 980, y: 460, scale: 3, rotation: 12, ...leave }, F(DIVE + 1));
  film.to(stand, { y: 420, scale: 2.2, ...leave }, F(DIVE + 3));
  film.to(tag, { x: -820, y: -300, scale: 2.6, ...leave, duration: F(14) }, F(DIVE + 3));
  film.to(win, { x: 820, y: -420, scale: 2.6, ...leave, duration: F(14) }, F(DIVE + 3));
  film.set({}, {}, F(ABOUT_LENGTH));

  return { el: svg, film, papered: PAPERED };
}
