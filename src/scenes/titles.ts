import gsap from "gsap";
import { phases } from "../content/process";
import { projects } from "../content/projects";
import { WORDS } from "../gfx/glyphs.gen";
import { extrude, flatten, hatch, poly, rrect, seeded, subpaths, type Pt } from "../gfx/shapes";
import { COLOR, MONO, el, group, sceneSvg, text, type Frame } from "../gfx/svg";
import { drawWord, wordWidth } from "../gfx/type";
import { F, persp } from "../motion/eases";
import { blockWipe, slam } from "../motion/kit";
import { gridBackdrop } from "./emblems";

const { ink: INK, paper: PAPER, lime: LIME, cyan: CYAN, white: WHITE } = COLOR;

const box = (d: string) => {
  const pts = flatten(d).flat();
  const [xs, ys] = [pts.map((p) => p[0]), pts.map((p) => p[1])];
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

/** The small word that sits with each title: wiped on behind a solid block. */
function myWord(film: gsap.core.Timeline, parent: Element, x: number, y: number, size: number, fill: string, at: number) {
  const k = size / 1000;
  const line = group(parent);
  drawWord(line, "MY", x, y, { size, face: fill });
  const block = el(
    "rect",
    { x: x - 4, y: y - WORDS.MY.capHeight * k - 6, width: WORDS.MY.width * k + 10, height: WORDS.MY.capHeight * k + 12, fill },
    parent,
  );
  blockWipe(film, block, line, at, 6);
  return line;
}

const PROJECTS_IN = 54;
const PROJECTS_OUT = 86;
export const PROJECTS_TITLE_LENGTH = PROJECTS_OUT + 34;

/**
 * PROJECTS has one letter for each project, so each letter is a spine on a shelf.
 * The shelf clears, and the first spine opens into the first project's plate.
 */
export function buildProjectsTitle(frame: Frame, stage: Element, plate: { x: number; y: number; w: number; h: number }) {
  const { W, H, vw, vh, portrait } = frame;
  const svg = sceneSvg("projects-title", frame, stage);
  const film = gsap.timeline({ defaults: { ease: "none" } });
  const rnd = seeded(31);

  const S = portrait
    ? { w: 176, h: 372, gap: 16, cols: 4, x: 74, rows: [430, 826], letter: 216, my: [74, 396], myCap: 96, name: 21, label: 22 }
    : { w: 166, h: 440, gap: 14, cols: 8, x: 87, rows: [214], letter: 256, my: [87, 180], myCap: 92, name: 17, label: 15 };

  const defs = el("defs", {}, svg);
  const stream = el("linearGradient", { id: "title-streak", x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
  el("stop", { offset: 0, "stop-color": INK }, stream);
  el("stop", { offset: 1, "stop-color": INK, "stop-opacity": 0 }, stream);

  el("rect", { x: -vw, y: -vh, width: vw * 3, height: vh * 3, fill: PAPER }, svg);

  // The radial speed lines of the road swing round to horizontal: forward turns into sideways.
  const corner = group(svg, { transform: `translate(${W / 2},${H / 2})` });
  for (let i = 0; i < 18; i++) {
    const z = group(corner);
    const thick = 1.5 + rnd() * 5;
    const offsetY = (rnd() - 0.5) * H * 0.9;
    el("rect", { x: 80 + rnd() * 160, y: -thick / 2, width: 220 + rnd() * 340, height: thick, fill: "url(#title-streak)" }, z);
    // Starts at zero size: the first frame after the doorway must be plain paper.
    gsap.set(z, { svgOrigin: "0 0", rotation: (i / 18) * 360, scale: 0 });
    film.to(z, { rotation: 180, y: offsetY, scale: 1.6, duration: F(14), ease: "soft" }, F(i * 0.3));
    film.to(z, { x: -W * 1.5, duration: F(20), ease: "power2.in" }, F(10 + i * 0.4));
    film.set(z, { autoAlpha: 0 }, F(34 + i * 0.4));
  }

  // The shelf.
  S.rows.forEach((y) => {
    const line = el("line", { x1: (W - vw) / 2 - 10, x2: W + (vw - W) / 2 + 10, y1: y + S.h + 13, y2: y + S.h + 13, stroke: INK, "stroke-width": 3 }, svg);
    gsap.set(line, { drawSVG: "0%" });
    film.to(line, { drawSVG: "100%", duration: F(16), ease: "soft" }, F(6));
    film.to(line, { drawSVG: "100% 100%", duration: F(16), ease: "power2.in" }, F(PROJECTS_OUT));
  });

  const my = myWord(film, svg, S.my[0], S.my[1], (S.myCap / WORDS.MY.capHeight) * 1000, INK, 20);
  const caption = text(
    svg,
    S.x + (S.w + S.gap) * S.cols - S.gap,
    S.my[1],
    `${projects.length} PROJECTS · ${Math.min(...projects.map((p) => +p.year))} TO ${Math.max(...projects.map((p) => +p.year))}`,
    { size: S.label, family: MONO, weight: 600, spacing: "0.12em", anchor: "end" },
  );
  gsap.set(caption, { autoAlpha: 0, y: 14 });
  film.to(caption, { autoAlpha: 1, y: 0, duration: F(9), ease: "settle" }, F(34));
  film.to([my, caption], { autoAlpha: 0, duration: F(6), ease: "power2.in" }, F(PROJECTS_OUT));

  const letters = WORDS["PROJECTS TALL"];
  const k = S.letter / 1000;
  const inset = 11;
  const paint = (side: SVGPathElement, body: SVGPathElement, screen: SVGPathElement, x: number, y: number, w: number, h: number, t: number) => {
    const outline = rrect(x, y, w, h, 12 + 10 * t);
    const edge = 8 + 6 * t;
    side.setAttribute("d", extrude(outline, -edge, edge));
    body.setAttribute("d", outline);
    const pad = inset + (16 - inset) * t;
    screen.setAttribute("d", rrect(x + pad, y + pad, w - pad * 2, h - pad * 2, 8 + 4 * t));
  };

  const spines = projects.map((project, i) => {
    const x = S.x + (i % S.cols) * (S.w + S.gap);
    const y = S.rows[Math.floor(i / S.cols)];
    const outer = group(svg);
    const side = el("path", { fill: INK, stroke: INK }, outer);
    const body = el("path", { fill: PAPER, stroke: INK, "stroke-width": 4 }, outer);
    const screen = el("path", { fill: INK }, outer);
    paint(side, body, screen, x, y, S.w, S.h, 0);

    const glyph = letters.glyphs[i];
    const bounds = box(glyph.d);
    const letter = group(outer);
    el(
      "path",
      { d: glyph.d, fill: LIME },
      group(letter, {
        transform: `translate(${x + S.w / 2 - ((bounds.x0 + bounds.x1) / 2) * k},${y + 26 + letters.capHeight * k}) scale(${k})`,
      }),
    );
    const label = group(outer);
    const bottom = y + S.h - 26;
    text(label, x + 24, bottom, String(i + 1).padStart(2, "0"), { size: S.name, family: MONO, weight: 700, fill: LIME });
    const name = text(label, 0, 0, project.title, { size: S.name, family: MONO, weight: 600, spacing: "0.1em", fill: PAPER });
    name.setAttribute("transform", `translate(${x + S.w - 28},${bottom}) rotate(-90)`);

    // Pushed along the shelf from the right, leaning into the stop.
    slam(film, outer, 8 + i * 2.8, vw + S.w - x + (W - vw) / 2, -14, 19);
    return { outer, side, body, screen, letter, label, x, y };
  });

  // The rest of the shelf drops away, last spine first.
  spines.slice(1).forEach(({ outer }, i) => {
    film.to(
      outer,
      { y: vh + 300, rotation: i % 2 ? 7 : -7, duration: F(14), ease: "power2.in" },
      F(PROJECTS_OUT + (spines.length - 2 - i) * 1.5),
    );
  });

  // The first spine opens into the plate. Its screen and edge end up exactly the plate's.
  const first = spines[0];
  const open = { x: first.x, y: first.y, w: S.w, h: S.h, t: 0 };
  const redraw = () => paint(first.side, first.body, first.screen, open.x, open.y, open.w, open.h, open.t);
  const OPEN_AT = PROJECTS_OUT + 8;
  film.to(open, { x: plate.x, y: plate.y, w: plate.w, h: plate.h, t: 1, duration: F(PROJECTS_TITLE_LENGTH - OPEN_AT), ease: "snap", onUpdate: redraw }, F(OPEN_AT));
  film.to(first.label, { autoAlpha: 0, duration: F(5) }, F(PROJECTS_OUT + 2));
  film.to(
    first.letter,
    { x: plate.x + plate.w / 2 - (first.x + S.w / 2), y: plate.y + plate.h / 2 - (first.y + 26 + (letters.capHeight * k) / 2), duration: F(PROJECTS_TITLE_LENGTH - OPEN_AT), ease: "snap" },
    F(OPEN_AT),
  );
  film.to(first.letter, { autoAlpha: 0, duration: F(9), ease: "power1.in" }, F(PROJECTS_TITLE_LENGTH - 12));
  const screen = { w: plate.w - 32, h: plate.h - 32 };
  const grid = el(
    "path",
    { d: gridBackdrop(screen.w, screen.h), fill: WHITE, transform: `translate(${plate.x + plate.w / 2},${plate.y + plate.h / 2})` },
    first.outer,
  );
  gsap.set(grid, { opacity: 0 });
  film.to(grid, { opacity: 0.16, duration: F(7) }, F(PROJECTS_TITLE_LENGTH - 7));
  film.set({}, {}, F(PROJECTS_TITLE_LENGTH));

  return { el: svg, film, title: PROJECTS_IN + 14 };
}

/** Process has already started underneath by this frame of the title, ready to be flown into. */
export const PROCESS_TITLE_HOLD = 84;
export const PROCESS_TITLE_LENGTH = PROCESS_TITLE_HOLD + 22;

/** A sonar ping from the O finds the rest of the word. The camera then flies through the O into the radar. */
export function buildProcessTitle(frame: Frame, stage: Element, [radarX, radarY]: Pt) {
  const { W, H, vw, vh, portrait } = frame;
  const svg = sceneSvg("process-title", frame, stage);
  const film = gsap.timeline({ defaults: { ease: "none" } });

  const name = portrait ? "PROCESS TALL" : "PROCESS";
  const word = WORDS[name];
  const size = ((portrait ? 780 : 1400) / word.width) * 1000;
  const k = size / 1000;
  const originX = (W - wordWidth(name, size)) / 2;
  const baseline = H / 2 + (word.capHeight * k) / 2;
  const [depthX, depthY] = portrait ? [9, 14] : [11, 17];

  // What the O looks onto until the film underneath has started.
  const backing = el("rect", { x: -vw, y: -vh, width: vw * 3, height: vh * 3, fill: INK }, svg);
  film.set(backing, { display: "none" }, F(PROCESS_TITLE_HOLD));

  const cam = group(svg);
  const glyphO = word.glyphs[2];
  const counterO = subpaths(glyphO.d)[1];
  const counter = box(counterO);
  const [Ox, Oy] = [originX + (glyphO.x + (counter.x0 + counter.x1) / 2) * k, baseline + ((counter.y0 + counter.y1) / 2) * k];
  const placeOf = (glyph: { x: number }) => `translate(${originX + glyph.x * k},${baseline}) scale(${k})`;

  // A black sheet with one hole in it: the counter of the O.
  el(
    "path",
    { d: `M-100000 -100000H100000V100000H-100000Z${counterO}`, fill: INK, "fill-rule": "evenodd" },
    group(cam, { transform: placeOf(glyphO) }),
  );

  // A small radar already turning inside the O.
  const scopeRadius = (Math.min(counter.x1 - counter.x0, counter.y1 - counter.y0) / 2) * k * 0.82;
  const scope = group(group(cam, { transform: `translate(${Ox},${Oy})` }));
  el("circle", { r: scopeRadius, fill: "none", stroke: CYAN, "stroke-width": 1.6 }, scope);
  const sweep = group(scope);
  el("path", { d: `M0 0L${scopeRadius} 0A${scopeRadius} ${scopeRadius} 0 0 0 ${scopeRadius * 0.5} ${-scopeRadius * 0.866}Z`, fill: LIME, opacity: 0.4 }, sweep);
  el("line", { x2: scopeRadius, stroke: LIME, "stroke-width": 3 }, sweep);
  gsap.set(sweep, { svgOrigin: "0 0" });
  gsap.set(scope, { autoAlpha: 0 });
  film.set(scope, { autoAlpha: 1 }, F(16));
  film.to(sweep, { rotation: 900, duration: F(PROCESS_TITLE_HOLD), ease: "none" }, 0);
  film.to(scope, { autoAlpha: 0, duration: F(6) }, F(PROCESS_TITLE_HOLD - 4));

  // An extrusion fills its counters, so the O is built by hand: its side stops at the counter,
  // and the counter shows only its own inner wall. Everything else in there is the hole.
  const defs = el("defs", {}, svg);
  const outside = el("clipPath", { id: "o-outside" }, defs);
  el("path", { d: `M-100000 -100000H100000V100000H-100000Z${counterO}`, "clip-rule": "evenodd" }, outside);
  const inside = el("clipPath", { id: "o-inside" }, defs);
  el("path", { d: counterO }, inside);
  const [rimX, rimY] = [depthX / k, depthY / k];
  const rim = flatten(counterO)[0];
  const openO = (place: SVGGElement) => {
    el("path", { d: extrude(subpaths(glyphO.d)[0], rimX, rimY), fill: PAPER, stroke: PAPER, "stroke-width": 1.4 / k, "clip-path": "url(#o-outside)" }, place);
    el(
      "path",
      { d: `${poly(rim)}${poly(rim.map(([x, y]): Pt => [x + rimX, y + rimY]))}`, fill: PAPER, "fill-rule": "evenodd", "clip-path": "url(#o-inside)" },
      place,
    );
  };

  const letters = word.glyphs.map((glyph, i) => {
    const d = glyph.d;
    const outer = group(cam);
    const place = group(outer, { transform: placeOf(glyph) });
    if (i === 2) openO(place);
    else el("path", { d: extrude(d, rimX, rimY), fill: PAPER, stroke: PAPER, "stroke-width": 1.4 / k }, place);
    el("path", { d: hatch(d, rimX, rimY, 11 / k), fill: "none", stroke: INK, "stroke-width": 1.3 / k }, place);
    el("path", { d, fill: LIME, stroke: INK, "stroke-width": 2.6 / k, "stroke-linejoin": "round" }, place);
    const bounds = box(d);
    const centre: Pt = [originX + (glyph.x + (bounds.x0 + bounds.x1) / 2) * k, baseline + ((bounds.y0 + bounds.y1) / 2) * k];
    gsap.set(outer, { svgOrigin: `${centre[0]} ${centre[1]}`, scale: 0 });
    return { outer, centre, i };
  });

  // Pings leave the O. Each letter appears as the first one reaches it.
  const PING = 12;
  const PING_LENGTH = 26;
  const reach = Math.max(Ox + (vw - W) / 2, W - Ox + (vw - W) / 2) * 1.08;
  const pulses = group(cam);
  [[LIME, 7, 0], [CYAN, 3.5, 7], [LIME, 2, 15]].forEach(([stroke, width, late]) => {
    const pulse = el("circle", { cx: Ox, cy: Oy, r: 1, fill: "none", stroke: stroke as string, "stroke-width": width as number }, pulses);
    gsap.set(pulse, { autoAlpha: 0 });
    film.set(pulse, { autoAlpha: 1 }, F(PING + (late as number)));
    film.to(pulse, { attr: { r: reach }, duration: F(PING_LENGTH), ease: "power1.out" }, F(PING + (late as number)));
    film.to(pulse, { autoAlpha: 0, duration: F(8) }, F(PING + (late as number) + PING_LENGTH - 8));
  });
  letters.forEach(({ outer, centre, i }) => {
    const distance = Math.abs(centre[0] - Ox) / reach;
    const at = i === 2 ? 2 : PING + PING_LENGTH * (1 - Math.sqrt(1 - Math.min(distance, 1)));
    film.to(outer, { scale: 1.16, duration: F(6), ease: "soft" }, F(at));
    film.to(outer, { scale: 1, duration: F(9), ease: "settle" }, F(at + 6));
  });

  const top = baseline - word.capHeight * k;
  const my = myWord(film, cam, originX, top - (portrait ? 38 : 30), portrait ? 150 : 132, PAPER, 34);
  const list = phases.map((phase) => phase.word).join(" · ");
  const caption = text(cam, originX, baseline + depthY + (portrait ? 74 : 56), `${phases.length} STEPS · ${list}`, {
    size: portrait ? 23 : 16,
    family: MONO,
    weight: 600,
    spacing: "0.12em",
    fill: PAPER,
  });
  gsap.set(caption, { autoAlpha: 0, y: 14 });
  film.to(caption, { autoAlpha: 1, y: 0, duration: F(9), ease: "settle" }, F(44));
  film.to([my, caption], { autoAlpha: 0, duration: F(5), ease: "power2.in" }, F(PROCESS_TITLE_HOLD - 4));

  // Through the O: it swings onto the radar's centre and grows until its counter holds the frame.
  const [spanX, spanY] = [Math.max(radarX, W - radarX) + (vw - W) / 2, Math.max(radarY, H - radarY) + (vh - H) / 2];
  const [holeW, holeH] = [(counter.x1 - counter.x0) * k - depthX * 2, (counter.y1 - counter.y0) * k - depthY * 2];
  // Times two, because the corners of the frame are further out than the sides of an oval hole.
  const cover = Math.max(spanX / (holeW / 2), spanY / (holeH / 2)) * 2;
  gsap.set(cam, { svgOrigin: `${Ox} ${Oy}` });
  film.to(cam, { x: radarX - Ox, y: radarY - Oy, duration: F(14), ease: "soft" }, F(PROCESS_TITLE_HOLD));
  film.to(cam, { scale: cover, duration: F(PROCESS_TITLE_LENGTH - PROCESS_TITLE_HOLD), ease: persp(0.05) }, F(PROCESS_TITLE_HOLD));
  film.set({}, {}, F(PROCESS_TITLE_LENGTH));

  return { el: svg, film, title: 70 };
}
