import gsap from "gsap";
import { hero as copy, site } from "../content/site";
import { WORDS } from "../gfx/glyphs.gen";
import { contourRings, dots, extrudeOutline, flatten, hatchOutline, outline, rrect, subpaths, type Pt } from "../gfx/shapes";
import { skeleton } from "../gfx/skeleton";
import { COLOR, MONO, el, group, sceneSvg, text, wrap, type Frame, type TextStyle } from "../gfx/svg";
import { F, persp } from "../motion/eases";
import { idle } from "../motion/kit";
import { buildIntro } from "./intro";

const LANDSCAPE = {
  size: 214,
  depth: [13, 20] as Pt,
  code: [150, 432] as Pt,
  craft: [452, 640] as Pt,
  meets: { x: 985, y: 432, size: 176 },
  stamp: [1092, 232] as Pt,
  blurb: { x: 150, y: 512, width: 272 },
  cta: { x: 150, y: 704, gap: 16, stacked: false },
  contour: { cx: 820, cy: 430, rx: 240, ry: 170, gap: 19, count: 16, seed: 11 },
};

const PORTRAIT = {
  size: 174,
  depth: [11, 17] as Pt,
  code: [64, 540] as Pt,
  craft: [64, 860] as Pt,
  meets: { x: 66, y: 700, size: 146 },
  stamp: [660, 636] as Pt,
  blurb: { x: 66, y: 960, width: 760 },
  cta: { x: 66, y: 1130, gap: 18, stacked: true },
  contour: { cx: 450, cy: 700, rx: 200, ry: 230, gap: 19, count: 16, seed: 11 },
};

/** Film frame where the slot fully covers the viewport. */
const HANDOFF = 58;
const DIVE_START = 30;

export interface Letter {
  id: string;
  outer: SVGGElement;
  inner: SVGGElement;
  center: Pt;
  /** The glyph's own origin in the frame, and its face outline. */
  origin: Pt;
  d: string;
  /** Rebuilds the extrusion. 1 is its resting depth, and lean tilts it away from rest. */
  setDepth: (t: number, leanX?: number, leanY?: number) => void;
}

function bbox(contours: Pt[][]) {
  const pts = contours.flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

export function buildHero(frame: Frame, stage: Element) {
  const { W, H, vw, vh, portrait } = frame;
  const L = portrait ? PORTRAIT : LANDSCAPE;
  const k = L.size / 1000;
  const [cx, cy] = [W / 2, H / 2];

  const wall = sceneSvg("wall", frame, stage);
  const svg = sceneSvg("hero", frame, stage);
  const defs = el("defs", {}, svg);
  const blockFill = el("linearGradient", { id: "block", x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
  el("stop", { offset: 0.55, "stop-color": COLOR.ink }, blockFill);
  el("stop", { offset: 1, "stop-color": COLOR.ink, "stop-opacity": 0 }, blockFill);
  const waveEdge = el("circle", { r: 0 }, el("clipPath", { id: "wave" }, defs));

  // The intro plays in two worlds. At rest only the craft world is left, and bootCam is untouched.
  const bootCam = group(svg);
  const codeWorld = group(bootCam);
  const craftWorld = group(bootCam, { "clip-path": "url(#wave)" });
  const ground = el("rect", { x: -vw, y: -vh, width: vw * 3, height: vh * 3, fill: COLOR.paper }, craftWorld);
  const cam = group(craftWorld);
  const dropLayer = group(bootCam);
  const topLayer = group(svg);

  const field = group(cam);
  const fieldIdle = group(field);
  const rings = contourRings(L.contour).map((d, i) =>
    el("path", { d, fill: "none", stroke: COLOR.white, "stroke-width": i % 5 === 4 ? 2.6 : 1.3 }, fieldIdle),
  );
  idle(fieldIdle, { rotation: 5, transformOrigin: "50% 50%", duration: 11, ease: "sine.inOut", yoyo: true });

  // Display type: real outlines with a hard extrusion, so each letter is an object.
  const [dx, dy] = L.depth;
  const title = group(cam);
  const makeWord = (word: string, [ox, oy]: Pt): Letter[] =>
    WORDS[word].glyphs.map((glyph, i) => {
      const outer = group(title);
      const inner = group(outer);
      const id = `${word}-${i}`;
      const origin: Pt = [ox + glyph.x * k, oy];
      const place = group(inner, { id, transform: `translate(${origin[0]},${origin[1]}) scale(${k})` });
      const isPortal = word === "CODE" && glyph.ch === "O";
      const d = isPortal ? subpaths(glyph.d)[0] : glyph.d;
      const side = el("path", { fill: COLOR.ink, stroke: COLOR.ink, "stroke-width": 1.4 / k }, place);
      const ticks = el("path", { fill: "none", stroke: COLOR.paper, "stroke-width": 1.3 / k }, place);
      el(
        "path",
        { d, fill: COLOR.lime, stroke: COLOR.ink, "stroke-width": 3.4 / k, "stroke-linejoin": "round" },
        place,
      );
      const [solid, edges] = [outline(d), outline(d, 8)];
      const setDepth = (t: number, leanX = 0, leanY = 0) => {
        const [x, y] = [((dx + leanX) * t) / k, ((dy + leanY) * t) / k];
        side.setAttribute("d", extrudeOutline(solid, x, y));
        ticks.setAttribute("d", hatchOutline(edges, x, y, 11 / k));
      };
      setDepth(1);
      const box = bbox(flatten(d));
      return {
        id,
        outer,
        inner,
        origin,
        d,
        setDepth,
        center: [ox + (glyph.x + (box.x0 + box.x1) / 2) * k, oy + ((box.y0 + box.y1) / 2) * k] as Pt,
      };
    });
  const code = makeWord("CODE", L.code);
  const craft = makeWord("CRAFT", L.craft);

  // The O is the first portal: a black slot the camera flies into.
  const portal = code[1];
  const [Cx, Cy] = portal.center;
  const slotLength = L.size * 0.6;
  const slotHeight = L.size * 0.24;
  const SLOT_TILT = -32;
  el(
    "path",
    { d: rrect(-slotLength / 2, -slotHeight / 2, slotLength, slotHeight, slotHeight / 2), fill: COLOR.ink },
    group(portal.inner, { transform: `translate(${Cx},${Cy}) rotate(${SLOT_TILT})` }),
  );

  // MEETS arrives letter by letter behind a solid block.
  const meetsWord = WORDS.MEETS;
  const mk = L.meets.size / 1000;
  const meets = group(cam);
  const meetsLetters = meetsWord.glyphs.map((glyph, i) => {
    const place = group(meets, { transform: `translate(${L.meets.x + glyph.x * mk},${L.meets.y}) scale(${mk})` });
    const face = el("path", { d: glyph.d, fill: COLOR.ink }, place);
    const next = meetsWord.glyphs[i + 1]?.x ?? meetsWord.width;
    const block = el(
      "rect",
      {
        x: L.meets.x + glyph.x * mk - 3,
        y: L.meets.y - meetsWord.capHeight * mk - 4,
        width: (next - glyph.x) * mk + 24,
        height: meetsWord.capHeight * mk + 8,
        fill: "url(#block)",
      },
      meets,
    );
    return { face, block };
  });

  // Rotating stamp, the small studio mark above the headline.
  const stamp = group(cam, { transform: `translate(${L.stamp[0]},${L.stamp[1]})` });
  const stampTurn = group(stamp);
  const stampSpin = group(stampTurn);
  el("path", { id: "stamp-ring", d: "M-52 0a52 52 0 1 1 104 0a52 52 0 1 1 -104 0", fill: "none" }, stampSpin);
  idle(stampSpin, { rotation: 360, svgOrigin: "0 0", duration: 26, ease: "none" });
  const stampText = el(
    "text",
    { "font-family": MONO, "font-size": 12.4, "font-weight": 600, "letter-spacing": "0.14em", fill: COLOR.ink },
    stampSpin,
  );
  el("textPath", { href: "#stamp-ring" }, stampText).textContent = `${site.name} · ${site.role} · `.toUpperCase();
  const stampCore = el("circle", { r: 26, fill: COLOR.ink }, stamp);
  const stampDot = el("circle", { r: 8, fill: COLOR.lime }, stamp);

  // Supporting copy.
  const blurbStyle: TextStyle = { size: portrait ? 34 : 19, weight: 500, stretch: "88%" };
  const lineHeight = portrait ? 46 : 27;
  const blurb = group(cam, { transform: `translate(${L.blurb.x},${L.blurb.y})` });
  const lineGroups = new Map<number, SVGGElement>();
  for (const word of wrap(copy.blurb, L.blurb.width, lineHeight, blurbStyle)) {
    if (!lineGroups.has(word.y)) lineGroups.set(word.y, group(blurb));
    text(lineGroups.get(word.y)!, word.x, word.y, word.word, blurbStyle);
  }
  const blurbLines = [...lineGroups.values()];

  const ctaScale = portrait ? 1.8 : 1;
  const ctaHeight = 50 * ctaScale;
  const makeCta = (label: string, x: number, y: number, width: number, filled: boolean) => {
    const link = el("a", { href: "#work", class: "cta", "data-hover": "" }, cam);
    el(
      "rect",
      {
        x,
        y,
        width: width * ctaScale,
        height: ctaHeight,
        rx: ctaHeight / 2,
        fill: filled ? COLOR.ink : "none",
        stroke: COLOR.ink,
        "stroke-width": 2,
      },
      link,
    );
    text(link, x + 24 * ctaScale, y + 30 * ctaScale, label, {
      size: 14 * ctaScale,
      family: MONO,
      weight: 600,
      fill: filled ? COLOR.paper : COLOR.ink,
    });
    if (filled) {
      el("circle", { cx: x + (width - 25) * ctaScale, cy: y + ctaHeight / 2, r: 9 * ctaScale, fill: COLOR.lime }, link);
    }
    return link;
  };
  const primary = makeCta(copy.primary, L.cta.x, L.cta.y, 262, true);
  const secondary = L.cta.stacked
    ? makeCta(copy.secondary, L.cta.x, L.cta.y + ctaHeight + L.cta.gap, 190, false)
    : makeCta(copy.secondary, L.cta.x + 262 + L.cta.gap, L.cta.y, 190, false);
  secondary.setAttribute("href", "#contact");

  // Under the lens the finished title shows the outlines and points it was drawn from.
  const lensEdge = el("circle", { r: 0 }, el("clipPath", { id: "lens" }, defs));
  const lensView = group(cam, { "clip-path": "url(#lens)", display: "none" });
  el("rect", { x: -vw, y: -vh, width: vw * 3, height: vh * 3, fill: COLOR.ink }, lensView);
  for (const letter of [...code, ...craft]) {
    const place = group(lensView, { transform: `translate(${letter.origin[0]},${letter.origin[1]}) scale(${k})` });
    const contours = skeleton(letter.d);
    const segments = contours.flatMap((contour) => contour.segments);
    const curves = segments.filter((segment) => segment.control);
    const stroke = (d: string, color: string, width: number) =>
      el("path", { d, fill: "none", stroke: color, "stroke-width": width / k, "stroke-linejoin": "round" }, place);
    stroke(curves.map(({ from, to, control }) => `M${from.join(" ")}L${control!.join(" ")}L${to.join(" ")}`).join(""), COLOR.slate, 0.7);
    stroke(contours.map((contour) => contour.d).join(""), COLOR.white, 1.5);
    el("path", { d: dots(curves.map((segment) => segment.control!), 1.7 / k), fill: COLOR.cyan }, place);
    const size = 1.9 / k;
    el(
      "path",
      { d: segments.map(({ to }) => `M${to[0] - size} ${to[1] - size}h${size * 2}v${size * 2}h${-size * 2}Z`).join(""), fill: COLOR.lime },
      place,
    );
  }
  const lensRing = el("circle", { r: 0, fill: "none", stroke: COLOR.lime, "stroke-width": 2.5, display: "none" }, cam);
  const lensRead = text(cam, 0, 0, "", { size: portrait ? 24 : 13, family: MONO, weight: 600, fill: COLOR.ink, anchor: "middle" });

  // The cyan dot sits above every scene and carries across the first seam.
  const anchorLayer = sceneSvg("anchor", frame, stage);
  const anchorCam = group(anchorLayer);
  const anchorOuter = group(anchorCam);
  const anchorInner = group(anchorOuter);
  const anchorLook = group(anchorInner);
  const dotRadius = L.size * 0.058;
  el("circle", { cx: Cx, cy: Cy, r: dotRadius, fill: COLOR.cyan }, anchorLook);

  // While the hero rests the O is an eye: the dot follows the pointer along the slot.
  const eyeX = gsap.quickTo(anchorLook, "x", { duration: 0.5, ease: "power3" });
  const eyeY = gsap.quickTo(anchorLook, "y", { duration: 0.5, ease: "power3" });
  const driftFieldX = gsap.quickTo(field, "x", { duration: 1.4, ease: "power3" });
  const driftFieldY = gsap.quickTo(field, "y", { duration: 1.4, ease: "power3" });
  const driftMeetsX = gsap.quickTo(meets, "x", { duration: 1.2, ease: "power3" });
  const driftMeetsY = gsap.quickTo(meets, "y", { duration: 1.2, ease: "power3" });
  const LENS = portrait ? 170 : 132;
  const titleBoxes = ([["CODE", L.code], ["CRAFT", L.craft]] as [string, Pt][]).map(([word, [x, y]]) => ({
    x0: x - 24,
    x1: x + WORDS[word].width * k + 34,
    y0: y - WORDS[word].capHeight * k - 24,
    y1: y + 44,
  }));
  const lens = { x: 0, y: 0, r: 0 };
  const paintLens = () => {
    const open = lens.r > 0.5;
    const display = open ? "block" : "none";
    lensView.setAttribute("display", display);
    lensRing.setAttribute("display", display);
    lensRead.setAttribute("display", display);
    if (!open) return;
    for (const circle of [lensEdge, lensRing]) {
      circle.setAttribute("cx", lens.x.toFixed(1));
      circle.setAttribute("cy", lens.y.toFixed(1));
      circle.setAttribute("r", lens.r.toFixed(1));
    }
    lensRead.setAttribute("x", lens.x.toFixed(1));
    lensRead.setAttribute("y", (lens.y + lens.r + 24).toFixed(1));
    lensRead.textContent = `x ${Math.round(lens.x)}  y ${Math.round(lens.y)}`;
  };
  paintLens();
  const lensX = gsap.quickTo(lens, "x", { duration: 0.3, ease: "power3", onUpdate: paintLens });
  const lensY = gsap.quickTo(lens, "y", { duration: 0.3, ease: "power3", onUpdate: paintLens });
  const lensR = gsap.quickTo(lens, "r", { duration: 0.35, ease: "power3", onUpdate: paintLens });

  // The letters are solid: as the pointer moves, their sides swing the way a real block's would.
  const lean = { x: 0, y: 0 };
  const paintLean = () => [...code, ...craft].forEach((letter) => letter.setDepth(1, lean.x, lean.y));
  const leanX = gsap.quickTo(lean, "x", { duration: 0.7, ease: "power3", onUpdate: paintLean });
  const leanY = gsap.quickTo(lean, "y", { duration: 0.7, ease: "power3", onUpdate: paintLean });

  const axis = (SLOT_TILT * Math.PI) / 180;
  // A capsule: the dot's centre stays on a segment of half-length reachAlong, within reachAcross of it.
  const reachAlong = slotLength / 2 - slotHeight / 2;
  const reachAcross = slotHeight / 2 - dotRadius - 2;
  const aim = (x: number, y: number): Pt => {
    const along = Math.tanh((x * Math.cos(axis) + y * Math.sin(axis)) / 320) * reachAlong;
    const across = Math.tanh((-x * Math.sin(axis) + y * Math.cos(axis)) / 320) * reachAcross;
    return [along * Math.cos(axis) - across * Math.sin(axis), along * Math.sin(axis) + across * Math.cos(axis)];
  };
  const look = (clientX: number, clientY: number, active: boolean) => {
    if (!active) {
      eyeX(0);
      eyeY(0);
      lensR(0);
      leanX(0);
      leanY(0);
      return;
    }
    const ctm = anchorLayer.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    const [ex, ey] = aim(p.x - Cx, p.y - Cy);
    eyeX(ex);
    eyeY(ey);
    const [nx, ny] = [clientX / innerWidth - 0.5, clientY / innerHeight - 0.5];
    if (lens.r < 1) {
      lensX.tween.progress(1);
      lensY.tween.progress(1);
      lens.x = p.x;
      lens.y = p.y;
    }
    lensX(p.x);
    lensY(p.y);
    lensR(titleBoxes.some((b) => p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1) ? LENS : 0);
    leanX(nx * -20);
    leanY(ny * -14);
    driftFieldX(nx * -26);
    driftFieldY(ny * -20);
    driftMeetsX(nx * 22);
    driftMeetsY(ny * 16);
  };

  const boot = buildIntro({
    frame,
    size: L.size,
    depth: L.depth,
    wall,
    bootCam,
    anchorCam,
    codeWorld,
    craftWorld,
    ground,
    waveEdge,
    dropLayer,
    topLayer,
    code,
    craft,
    anchorInner,
    anchorLook,
    dotRadius,
    aim,
    slot: { length: slotLength, height: slotHeight, tilt: SLOT_TILT },
    field,
    rings,
    meetsLetters,
    stamp,
    stampAt: L.stamp,
    blurbLines,
    cta: [primary, secondary],
  });

  // ---- Film: a slow push, then the dive into the slot.
  const film = gsap.timeline({ defaults: { ease: "none" } });
  const toScreenCentre = { x: cx - Cx, y: cy - Cy };
  // Scale at which the level slot overflows every edge of the frame.
  const cover = Math.max(vh / slotHeight, vw / (slotLength - slotHeight)) * 1.12;

  gsap.set(cam, { svgOrigin: `${Cx} ${Cy}` });
  film.to(cam, { scale: 1.04, rotation: -0.5, duration: F(DIVE_START), ease: "none" }, 0);
  gsap.set(stampTurn, { svgOrigin: "0 0" });
  film.to(stampTurn, { rotation: 150, duration: F(HANDOFF), ease: "none" }, 0);

  const span = HANDOFF - DIVE_START;
  film.to(cam, { ...toScreenCentre, duration: F(18), ease: "soft" }, F(DIVE_START));
  film.to(anchorOuter, { ...toScreenCentre, duration: F(18), ease: "soft" }, F(DIVE_START));
  film.to(cam, { rotation: -SLOT_TILT, duration: F(span), ease: "soft" }, F(DIVE_START));
  film.to(cam, { scale: cover, duration: F(span), ease: persp(0.07) }, F(DIVE_START));

  // Near letters leave first: CRAFT peels away before CODE does.
  gsap.set(
    [...code, ...craft].map((letter) => letter.outer),
    { svgOrigin: `${Cx} ${Cy}` },
  );
  craft.forEach((letter, i) => {
    film.to(letter.outer, { scale: 2.2, duration: F(16), ease: "power2.in" }, F(DIVE_START + i * 0.8));
  });
  [code[0], code[2], code[3]].forEach((letter, i) => {
    film.to(letter.outer, { scale: 1.5, duration: F(20), ease: "power2.in" }, F(DIVE_START + 2 + i));
  });

  gsap.set(wall, { display: "block", willChange: "transform" });

  return { el: svg, anchorLayer, anchorOuter, anchorInner, dotCentre: [Cx, Cy] as Pt, dotRadius, film, boot, look, handoff: HANDOFF };
}

export type Hero = ReturnType<typeof buildHero>;
