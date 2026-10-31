import gsap from "gsap";
import { WORDS } from "../gfx/glyphs.gen";
import { rrect, subpaths, type Pt } from "../gfx/shapes";
import { skeleton, type Contour } from "../gfx/skeleton";
import { COLOR, MONO, el, group, text, type Frame, type TextStyle } from "../gfx/svg";
import { F } from "../motion/eases";
import { contourIn } from "../motion/kit";
import type { Letter } from "./hero";

/** The camera has pushed in on the O. */
const ARRIVE = 14;
/** The pen starts on the C. */
const PLOT = 18;
/** CRAFT lands. Black code world starts turning into the paper craft world. */
const IMPACT = 92;
const WAVE = 20;
/** Boot length in frames. Its last frame is film frame 0. */
export const INTRO_LENGTH = IMPACT + 44;

export interface IntroParts {
  frame: Frame;
  size: number;
  depth: Pt;
  wall: SVGSVGElement;
  bootCam: SVGGElement;
  anchorCam: SVGGElement;
  codeWorld: SVGGElement;
  craftWorld: SVGGElement;
  ground: SVGRectElement;
  waveEdge: SVGCircleElement;
  dropLayer: SVGGElement;
  topLayer: SVGGElement;
  code: Letter[];
  craft: Letter[];
  anchorInner: SVGGElement;
  anchorLook: SVGGElement;
  dotRadius: number;
  aim: (dx: number, dy: number) => Pt;
  slot: { length: number; height: number; tilt: number };
  field: SVGGElement;
  rings: SVGPathElement[];
  meetsLetters: { face: SVGPathElement; block: SVGRectElement }[];
  stamp: SVGGElement;
  stampAt: Pt;
  blurbLines: SVGGElement[];
  cta: SVGAElement[];
}

export function buildIntro(p: IntroParts) {
  const { W, H, vw, vh, portrait } = p.frame;
  const boot = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  const k = p.size / 1000;
  const [cx, cy] = [W / 2, H / 2];
  const portal = p.code[1];
  const [Cx, Cy] = portal.center;
  const zoom = portrait ? 1.84 : 2.43;
  const startZoom = window.__loader.layout.zoom;
  const [left, top] = [(W - vw) / 2, (H - vh) / 2];
  const [x0, x1, y0, y1] = [left - 40, left + vw + 40, top - 40, top + vh + 40];

  // The camera frames a world point at the centre of the screen.
  const focus = (x: number, y: number, z: number) => ({ x: cx - x * z, y: cy - y * z, scale: z });
  const cams = [p.bootCam, p.anchorCam];
  gsap.set(cams, { svgOrigin: "0 0", ...focus(Cx, Cy, startZoom) });

  // ---- The wall: the real path data of the title, behind everything, on its own layer.
  el("rect", { x: left - 60, y: top - 60, width: vw + 120, height: vh + 120, fill: COLOR.ink }, p.wall);
  const source = ["CODE", "CRAFT", "MEETS"]
    .flatMap((word) => WORDS[word].glyphs.map((glyph) => `<path id="${glyph.ch}" d="${glyph.d}"/>`))
    .join(" ");
  const wallStyle: TextStyle = { size: portrait ? 19 : 16, family: MONO, fill: COLOR.slate };
  const rowHeight = wallStyle.size * 1.5;
  const columns = Math.ceil(vw / (wallStyle.size * 0.6)) + 2;
  const wallText = group(p.wall, { opacity: 0.3 });
  const rows = Array.from({ length: Math.ceil(vh / rowHeight) + 1 }, (_, i) => {
    const from = (i * columns) % source.length;
    return text(wallText, left + 10, top + rowHeight * (i + 1), (source + source).slice(from, from + columns), wallStyle);
  });
  gsap.set(rows, { autoAlpha: 0 });
  boot.to(rows, { autoAlpha: 1, duration: F(2), stagger: F(34 / rows.length) }, F(PLOT - 4));

  // ---- The loader's filled O, rebuilt here so the loader can be removed over it.
  // This one is flat: it has not been crafted yet.
  const glyphO = WORDS.CODE.glyphs[1];
  const seed = group(p.codeWorld);
  el(
    "path",
    { d: subpaths(glyphO.d)[0], fill: COLOR.lime },
    group(seed, { transform: `translate(${portal.origin[0]},${portal.origin[1]}) scale(${k})` }),
  );
  el(
    "path",
    { d: rrect(-p.slot.length / 2, -p.slot.height / 2, p.slot.length, p.slot.height, p.slot.height / 2), fill: COLOR.ink },
    group(seed, { transform: `translate(${Cx},${Cy}) rotate(${p.slot.tilt})` }),
  );
  gsap.set(p.anchorInner, { svgOrigin: `${Cx} ${Cy}` });

  // The camera pushes in on the O, and the eye blinks awake.
  boot.to(cams, { ...focus(Cx, Cy, zoom), duration: F(ARRIVE), ease: "snap" }, 0);

  // ---- The type designer's grid shoots across the frame.
  const [ox, oy] = p.code[0].origin;
  const cap = WORDS.CODE.capHeight * k;
  const metrics = group(p.codeWorld);
  const hairline = { stroke: COLOR.paper, "stroke-opacity": 0.5, "stroke-width": 1.4, "vector-effect": "non-scaling-stroke" };
  const guides: [number, string][] = [
    [oy, "baseline 0"],
    [oy - cap * 0.76, "x-height 520"],
    [oy - cap, "cap height 686"],
  ];
  const markStyle: TextStyle = { size: portrait ? 7 : 6, family: MONO, fill: COLOR.slate };
  guides.forEach(([y, name], i) => {
    const line = el("line", { x1: x0, x2: x1, y1: y, y2: y, ...hairline }, metrics);
    gsap.set(line, { svgOrigin: `${x0} ${y}`, scaleX: 0 });
    boot.to(line, { scaleX: 1, duration: F(11), ease: "snap" }, F(ARRIVE + i * 1.5));
    const tag = text(metrics, ox + 2, y - 2.5, name, markStyle);
    gsap.set(tag, { autoAlpha: 0 });
    boot.set(tag, { autoAlpha: 1 }, F(ARRIVE + 6 + i * 1.5));
  });
  const stops = [...p.code.map((letter) => letter.origin[0]), ox + WORDS.CODE.width * k];
  stops.forEach((x, i) => {
    const line = el("line", { x1: x, x2: x, y1: y0, y2: y1, ...hairline, "stroke-opacity": 0.28 }, metrics);
    gsap.set(line, { svgOrigin: `${x} ${y1}`, scaleY: 0 });
    boot.to(line, { scaleY: 1, duration: F(10), ease: "snap" }, F(ARRIVE + 3 + i));
  });

  // ---- The pen, with crosshairs that span the frame.
  const pen = { x: Cx, y: Cy };
  const inFont = { x: 0, y: 0 };
  const penLayer = group(p.codeWorld);
  const hair = { stroke: COLOR.lime, "stroke-opacity": 0.55, "stroke-width": 1, "vector-effect": "non-scaling-stroke" };
  const hairX = el("line", { x1: x0, x2: x1, y1: pen.y, y2: pen.y, ...hair }, penLayer);
  const hairY = el("line", { x1: pen.x, x2: pen.x, y1: y0, y2: y1, ...hair }, penLayer);
  const head = group(penLayer);
  el("rect", { x: -7, y: -7, width: 14, height: 14, fill: COLOR.lime }, head);
  const readout = text(head, 16, -14, "", { size: portrait ? 22 : 15, family: MONO, weight: 600, fill: COLOR.lime });
  const penMarks = [hairX, hairY, head];
  gsap.set(penMarks, { autoAlpha: 0 });

  const watching = { t: 0 };
  boot.to(watching, { t: 1, duration: F(10), ease: "soft" }, F(PLOT - 2));
  const drawPen = () => {
    const scale = gsap.getProperty(p.bootCam, "scale") as number;
    hairX.setAttribute("y1", String(pen.y));
    hairX.setAttribute("y2", String(pen.y));
    hairY.setAttribute("x1", String(pen.x));
    hairY.setAttribute("x2", String(pen.x));
    head.setAttribute("transform", `translate(${pen.x},${pen.y}) scale(${1 / scale})`);
    readout.textContent = `${Math.round(inFont.x)} ${Math.round(-inFont.y)}`;
    // The eye in the O watches its letters being written.
    const [ex, ey] = p.aim((pen.x - Cx) * 3, (pen.y - Cy) * 3);
    gsap.set(p.anchorLook, { x: ex * watching.t, y: ey * watching.t });
  };

  /** Draws one contour behind the pen. Its real points appear as the pen reaches them. */
  const plot = (contour: Contour, line: SVGPathElement, marks: Element[], origin: Pt, scale: number, at: number, dur: number) => {
    let shown = 0;
    gsap.set(line, { drawSVG: "0%" });
    boot.to(
      line,
      {
        drawSVG: "100%",
        duration: F(dur),
        ease: "sine.inOut",
        onUpdate(this: gsap.core.Tween) {
          const t = this.ratio;
          const [fx, fy] = contour.walk(t);
          inFont.x = fx;
          inFont.y = fy;
          pen.x = origin[0] + fx * scale;
          pen.y = origin[1] + fy * scale;
          while (shown < marks.length && contour.segments[shown].at <= t) {
            marks[shown++].setAttribute("visibility", "visible");
          }
          while (shown > 0 && contour.segments[shown - 1].at > t) {
            marks[--shown].setAttribute("visibility", "hidden");
          }
          drawPen();
        },
      },
      F(at),
    );
  };

  const flyTo = ([x, y]: Pt, at: number, dur: number) =>
    boot.to(pen, { x, y, duration: F(dur), ease: "soft", onUpdate: drawPen }, F(at));

  // Each letter is an outline plus the points that define it, as a font editor shows it.
  const wire = group(p.codeWorld);
  const outlined = ([p.code[0], p.code[2], p.code[3]] as Letter[]).map((letter) => {
    const place = group(wire, { transform: `translate(${letter.origin[0]},${letter.origin[1]}) scale(${k})` });
    const contours = skeleton(letter.d).map((contour) => {
      const line = el(
        "path",
        { d: contour.d, fill: "none", stroke: COLOR.white, "stroke-width": 6, "stroke-linejoin": "round" },
        place,
      );
      const marks = contour.segments.map(({ from, to, control }) => {
        const mark = group(place, { visibility: "hidden" });
        if (control) {
          el(
            "path",
            { d: `M${from[0]} ${from[1]}L${control[0]} ${control[1]}L${to[0]} ${to[1]}`, fill: "none", stroke: COLOR.slate, "stroke-width": 2.4 },
            mark,
          );
          el("circle", { cx: control[0], cy: control[1], r: 8, fill: COLOR.cyan }, mark);
        }
        el("rect", { x: to[0] - 9, y: to[1] - 9, width: 18, height: 18, fill: COLOR.lime }, mark);
        return mark;
      });
      return { contour, line, marks };
    });
    return { letter, contours };
  });

  const [wireC, wireD, wireE] = outlined;
  const point = ({ letter }: (typeof outlined)[number], contour: Contour): Pt => [
    letter.origin[0] + contour.start[0] * k,
    letter.origin[1] + contour.start[1] * k,
  ];
  const run = (entry: (typeof outlined)[number], i: number, at: number, dur: number) => {
    const { contour, line, marks } = entry.contours[i];
    plot(contour, line, marks, entry.letter.origin, k, at, dur);
  };

  // Fast, slow, fast: long enough on the C to see what is happening, then the pen is confident.
  boot.set(penMarks, { autoAlpha: 1 }, F(PLOT - 3));
  const startC = wireC.contours[0].contour;
  gsap.set(pen, { x: point(wireC, startC)[0], y: point(wireC, startC)[1] });
  run(wireC, 0, PLOT, 24);
  flyTo(point(wireD, wireD.contours[0].contour), 44, 4);
  run(wireD, 0, 48, 9);
  flyTo(point(wireD, wireD.contours[1].contour), 57, 1.5);
  run(wireD, 1, 58.5, 3.5);
  flyTo(point(wireE, wireE.contours[0].contour), 62, 1.5);
  run(wireE, 0, 63.5, 4.5);

  // Camera: over the C, a whip to the D, then all the way out to the frame the title rests in.
  const [letterC, letterO, letterD, letterE] = p.code;
  const pairCentre = (a: Letter, b: Letter) => (a.center[0] + b.center[0]) / 2;
  const plotZoom = zoom * 1.08;
  boot.to(cams, { ...focus(pairCentre(letterC, letterO), Cy, plotZoom), duration: F(16), ease: "soft" }, F(ARRIVE));
  boot.to(cams, { ...focus(pairCentre(letterD, letterE), Cy, plotZoom), duration: F(9), ease: "soft" }, F(43));
  boot.to(cams, { x: 0, y: 0, scale: 1, duration: F(20), ease: "snap" }, F(64));
  const lines = outlined.flatMap((entry) => entry.contours.map((contour) => contour.line));
  boot.to(lines, { attr: { "stroke-width": 11 }, duration: F(20), ease: "snap" }, F(64));

  // ---- A placeholder for what code cannot make by itself.
  const [craftX, craftY] = p.craft[0].origin;
  const craftWidth = WORDS.CRAFT.width * k;
  const craftCap = WORDS.CRAFT.capHeight * k;
  const [dx, dy] = p.depth;
  const pad = 14;
  const box = {
    x0: craftX - pad,
    x1: craftX + craftWidth + dx + pad,
    y0: craftY - craftCap - pad,
    y1: craftY + dy + pad,
  };
  const boxD = `M${box.x0} ${box.y0}L${box.x1} ${box.y0}L${box.x1} ${box.y1}L${box.x0} ${box.y1}Z`;
  const slotBox = group(p.codeWorld);
  const boxLine = el("path", { d: boxD, fill: "none", stroke: COLOR.lime, "stroke-width": 2 }, slotBox);
  const diagonals = [
    `M${box.x0} ${box.y0}L${box.x1} ${box.y1}`,
    `M${box.x1} ${box.y0}L${box.x0} ${box.y1}`,
  ].map((d) => {
    const line = el("path", { d, fill: "none", stroke: COLOR.lime, "stroke-width": 1, "stroke-opacity": 0.6 }, slotBox);
    gsap.set(line, { drawSVG: "0%" });
    return line;
  });
  const boxTag = text(slotBox, box.x0, box.y0 - 10, "<CRAFT />", { size: portrait ? 24 : 15, family: MONO, weight: 600, fill: COLOR.lime });
  gsap.set(boxTag, { autoAlpha: 0 });
  flyTo([box.x0, box.y0], 68, 2.5);
  plot(skeleton(boxD)[0], boxLine, [], [0, 0], 1, 70.5, 7);
  boot.to(diagonals, { drawSVG: "100%", duration: F(5), ease: "soft", stagger: F(1) }, F(74));
  boot.set(boxTag, { autoAlpha: 1 }, F(73));
  boot.set(penMarks, { autoAlpha: 0 }, F(78));
  boot.to(p.anchorLook, { x: 0, y: 0, duration: F(6), ease: "soft" }, F(78));

  // ---- CRAFT drops out of the camera into the box, solid and already finished.
  const dropCentre = `${(box.x0 + box.x1) / 2} ${(box.y0 + box.y1) / 2}`;
  const drops = p.craft.map((letter, i) => {
    const copy = group(p.dropLayer);
    const weight = group(copy);
    el("use", { href: `#${letter.id}` }, weight);
    const dur = 11 + Math.abs(i - 2);
    const at = IMPACT - dur;
    gsap.set(copy, { svgOrigin: dropCentre, scale: 6.5, rotation: (i - 2) * 3, autoAlpha: 0 });
    boot.set(copy, { autoAlpha: 1 }, F(at));
    boot.to(copy, { scale: 1, rotation: 0, duration: F(dur), ease: "power3.in" }, F(at));
    return weight;
  });

  // ---- Impact: paper spreads from where CRAFT landed, and whatever it reaches is finished.
  const [wx, wy] = [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2];
  const reach = Math.max(
    ...[
      [left, top],
      [left + vw, top],
      [left, top + vh],
      [left + vw, top + vh],
    ].map(([x, y]) => Math.hypot(x - wx, y - wy)),
  ) + 60;
  p.waveEdge.setAttribute("cx", String(wx));
  p.waveEdge.setAttribute("cy", String(wy));
  const wave = { duration: F(WAVE), ease: "power2.out" };
  boot.to(p.waveEdge, { attr: { r: reach }, ...wave }, F(IMPACT));
  /** The frame the wave front reaches a point, the inverse of power2.out. */
  const reached = (x: number, y: number) => IMPACT + WAVE * (1 - Math.sqrt(1 - Math.min(Math.hypot(x - wx, y - wy) / reach, 1)));

  const crests = group(p.topLayer);
  ([[COLOR.lime, 26, 0], [COLOR.cyan, 12, 1.5]] as [string, number, number][]).forEach(([stroke, width, late]) => {
    const crest = el("circle", { cx: wx, cy: wy, r: 0, fill: "none", stroke, "stroke-width": width }, crests);
    gsap.set(crest, { autoAlpha: 0 });
    boot.set(crest, { autoAlpha: 1 }, F(IMPACT + late));
    boot.to(crest, { attr: { r: reach, "stroke-width": 2 }, ...wave }, F(IMPACT + late));
  });
  boot.set(crests, { autoAlpha: 0 }, F(IMPACT + WAVE + 2));

  // The whole frame takes the hit, and a beat later the camera has recovered.
  const shake: Pt[] = [[-17, 12], [13, -9], [-9, 7], [6, -4], [-3, 2], [0, 0]];
  shake.forEach(([x, y], i) => {
    boot.to(cams, { x, y, duration: F(1.7), ease: "power1.out" }, F(IMPACT + i * 1.7));
  });

  // CRAFT takes the weight. The real letters do too, so the swap under the wave is invisible.
  p.craft.forEach((letter, i) => {
    const pair = [letter.inner, drops[i]];
    gsap.set(pair, { svgOrigin: `${letter.center[0]} ${craftY}` });
    gsap.set(pair, { scaleY: 0.84, scaleX: 1.05 });
    boot.to(pair, { scaleY: 1, scaleX: 1, duration: F(16), ease: "back.out(3)" }, F(IMPACT + Math.abs(i - 2) * 0.6));
  });
  boot.set(p.dropLayer, { autoAlpha: 0 }, F(Math.ceil(reached(box.x0 - 40, box.y0 - 40)) + 1));

  // CODE is lifted by the wave as it passes, and gains its depth on the way down.
  p.code.forEach((letter) => {
    const at = reached(letter.center[0], letter.center[1]);
    const grow = { t: 0 };
    letter.setDepth(0);
    boot.to(grow, { t: 1, duration: F(15), ease: "back.out(2.4)", onUpdate: () => letter.setDepth(grow.t) }, F(at));
    gsap.set(letter.inner, { svgOrigin: `${letter.center[0]} ${oy}` });
    boot.to(letter.inner, { y: -26, duration: F(5), ease: "power2.out" }, F(at));
    boot.to(letter.inner, { y: 0, duration: F(10), ease: "bounce.out" }, F(at + 5));
  });

  contourIn(boot, p.field, p.rings, IMPACT, 96, 0.3, 36);

  // MEETS is the last word in, wiped on behind a block.
  p.meetsLetters.forEach(({ face, block }, i) => {
    const at = IMPACT + 12 + i * 3.6;
    gsap.set(face, { autoAlpha: 0 });
    gsap.set(block, { scaleX: 0, transformOrigin: "0% 50%" });
    boot.to(block, { scaleX: 1, duration: F(6), ease: "soft" }, F(at));
    boot.set(face, { autoAlpha: 1 }, F(at + 6));
    boot.set(block, { transformOrigin: "100% 50%" }, F(at + 6));
    boot.to(block, { scaleX: 0, duration: F(9), ease: "soft" }, F(at + 6));
  });

  gsap.set(p.stamp, { svgOrigin: `${p.stampAt[0]} ${p.stampAt[1]}`, scale: 0 });
  boot.to(p.stamp, { scale: 1.14, duration: F(10), ease: "soft" }, F(IMPACT + 20));
  boot.to(p.stamp, { scale: 1, duration: F(8), ease: "settle" }, F(IMPACT + 30));

  gsap.set(p.blurbLines, { autoAlpha: 0, y: 14 });
  boot.to(p.blurbLines, { autoAlpha: 1, y: 0, duration: F(12), ease: "settle", stagger: F(2) }, F(IMPACT + 20));
  gsap.set(p.cta, { autoAlpha: 0, y: 14 });
  boot.to(p.cta, { autoAlpha: 1, y: 0, duration: F(12), ease: "settle", stagger: F(3) }, F(IMPACT + 26));

  // Nothing from the code world survives into the film.
  const gone = IMPACT + WAVE + 2;
  boot.set([p.codeWorld, p.wall, p.ground, p.topLayer], { display: "none" }, F(gone));
  boot.set(p.craftWorld, { attr: { "clip-path": "none" } }, F(gone));
  boot.set({}, {}, F(INTRO_LENGTH));

  return boot;
}
