import gsap from "gsap";
import { skills } from "../content/skills";
import { drawCube, drawCubeDetails } from "../gfx/iso";
import { WORDS } from "../gfx/glyphs.gen";
import { extrude, hatch, rrect, type Pt } from "../gfx/shapes";
import { COLOR, MONO, el, group, sceneSvg, text, wrap, type Frame, type TextStyle } from "../gfx/svg";
import { drawWord, wordWidth } from "../gfx/type";
import { F, persp } from "../motion/eases";
import { blockWipe, slam } from "../motion/kit";
import { SHIPPED_CUBE } from "./process";

/** The cube has landed and the board is awake. */
const LANDED = 34;
const ENTRY = 62;
const STEP = 58;
const COLLAPSE = ENTRY + STEP * skills.length;
export const SKILLS_LENGTH = COLLAPSE + 46;

const { ink: INK, paper: PAPER, lime: LIME, cyan: CYAN, slate: SLATE, grey: GREY } = COLOR;

const LIT = [LIME, CYAN, LIME, CYAN];

const LANDSCAPE = {
  board: { x: 322, y: 424, w: 1176, pitch: 104, pad: 24, shear: 0.36, squash: 0.66, wall: 26, edge: 44 },
  keyText: 33,
  copy: { x: 110, y: 112, wordMax: 88, wordFit: 660, label: 15, bodyX: 836, bodyY: 150, body: 25, line: 36, width: 650, typed: 19 },
  title: { x: 110, y: 330, size: 262, my: 104 },
};
const PORTRAIT = {
  board: { x: 92, y: 850, w: 778, pitch: 112, pad: 22, shear: 0.14, squash: 0.74, wall: 24, edge: 40 },
  keyText: 33,
  copy: { x: 66, y: 190, wordMax: 96, wordFit: 770, label: 24, bodyX: 66, bodyY: 490, body: 31, line: 43, width: 770, typed: 25 },
  title: { x: 66, y: 620, size: 200, my: 120 },
};

interface KeyDef {
  label: string;
  /** Share of the row's width. */
  width: number;
  kind: "tool" | "mark" | "enter" | "space";
  row: number;
}

const tool = (label: string, row: number): KeyDef => ({ label: label.toUpperCase(), width: Math.max(1.5, label.length * 0.24), kind: "tool", row });
const mark = (label: string, row: number, width = 0.86): KeyDef => ({ label, width, kind: "mark", row });

/** A row of the keyboard, and the skill it belongs to. */
const landscapeRows = (): { skill: number; keys: KeyDef[] }[] => [
  { skill: 0, keys: [mark("01", 0), ...skills[0].tools.map((t) => tool(t, 0)), { label: "ENTER", width: 1.34, kind: "enter", row: 0 }] },
  { skill: 1, keys: [mark("02", 1, 1.05), ...skills[1].tools.map((t) => tool(t, 1)), mark("{", 1), mark("}", 1), mark("[", 1), mark("]", 1)] },
  { skill: 2, keys: [mark("03", 2, 1.3), ...skills[2].tools.map((t) => tool(t, 2)), mark(";", 2), mark(":", 2), mark("'", 2)] },
  { skill: 3, keys: [mark("04", 3, 1.05), ...skills[3].tools.map((t) => tool(t, 3)), mark("/", 3), mark("=>", 3, 1.05), mark("?", 3)] },
];

/** Five tools do not fit one row at phone width, so the first skill takes two. */
const portraitRows = (): { skill: number; keys: KeyDef[] }[] => {
  const first = skills[0].tools;
  return [
    { skill: 0, keys: [...first.slice(0, 3).map((t) => tool(t, 0)), { label: "ENTER", width: 1.5, kind: "enter", row: 0 }] },
    { skill: 0, keys: first.slice(3).map((t) => tool(t, 1)) },
    { skill: 1, keys: skills[1].tools.map((t) => tool(t, 2)) },
    { skill: 2, keys: skills[2].tools.map((t) => tool(t, 3)) },
    { skill: 3, keys: skills[3].tools.map((t) => tool(t, 4)) },
  ];
};

export function buildSkills(frame: Frame, stage: Element) {
  const { vw, vh, portrait } = frame;
  const L = portrait ? PORTRAIT : LANDSCAPE;
  const target = portrait ? SHIPPED_CUBE.portrait : SHIPPED_CUBE.landscape;
  const svg = sceneSvg("skills", frame, stage);
  const film = gsap.timeline({ defaults: { ease: "none" } });
  const beat = (i: number) => ENTRY + i * STEP;

  el("rect", { x: -vw, y: -vh, width: vw * 3, height: vh * 3, fill: PAPER }, svg);

  // ---- The board, drawn flat and tilted as a whole, so keys and their labels share one plane.
  const B = L.board;
  const rows = portrait ? portraitRows() : landscapeRows();
  const bottom: KeyDef[] = portrait
    ? [{ label: "LET’S TALK", width: 1, kind: "space", row: rows.length }]
    : [mark("FN", rows.length, 0.9), mark("CTRL", rows.length, 1.1), { label: "LET’S TALK", width: 6.2, kind: "space", row: rows.length }, mark("ALT", rows.length, 1.1), mark("←", rows.length, 0.9), mark("→", rows.length, 0.9)];
  const rowCount = rows.length + 1;
  const boardH = rowCount * B.pitch + B.pad * 2;
  const onScreen = (u: number, v: number): Pt => [B.x + u - v * B.shear, B.y + v * B.squash];

  const board = group(svg);
  const plane = group(board, { transform: `matrix(1 0 ${-B.shear} ${B.squash} ${B.x} ${B.y})` });
  // A straight drop on screen, written in the board's own tilted coordinates.
  const down = (screen: number): Pt => [(screen * B.shear) / B.squash, screen / B.squash];
  const body = rrect(0, 0, B.w, boardH, 30);
  const [edgeX, edgeY] = down(B.edge);
  el("path", { d: extrude(body, edgeX, edgeY), fill: INK, stroke: INK, "stroke-width": 3 }, plane);
  el("path", { d: hatch(body, edgeX, edgeY, 16), fill: "none", stroke: PAPER, "stroke-width": 2 }, plane);
  el("path", { d: body, fill: "#1B1B1E", stroke: INK, "stroke-width": 4 }, plane);

  const [wallX, wallY] = down(B.wall);
  const press: Pt = [wallX * 0.72, wallY * 0.72];
  const gap = 10;
  const keyH = B.pitch - gap;

  const makeKey = (def: KeyDef, x: number, y: number, w: number) => {
    const root = group(plane);
    const d = rrect(x, y, w, keyH, 13);
    el("path", { d: extrude(d, wallX, wallY), fill: SLATE, stroke: INK, "stroke-width": 3 }, root);
    // The socket: what shows above a key when it goes down.
    el("path", { d, fill: "#0F0F11" }, root);
    const cap = group(root);
    const tap = group(cap);
    const dark = def.kind === "mark";
    const base = dark ? "#2A2A2E" : PAPER;
    const top = el("path", { d, fill: base, stroke: INK, "stroke-width": 3.5 }, tap);
    el("path", { d: rrect(x + 9, y + 8, w - 18, keyH - 18, 9), fill: "none", stroke: dark ? SLATE : INK, "stroke-width": 1.4, opacity: 0.4 }, tap);
    const size = def.kind === "mark" ? 24 : Math.min(L.keyText, ((w - 26) / (def.label.length * 0.68)));
    const label = text(tap, x + w / 2, y + keyH / 2 + size * 0.3, def.label, {
      size,
      family: dark ? MONO : undefined,
      weight: 800,
      stretch: dark ? undefined : "108%",
      fill: dark ? GREY : INK,
      anchor: "middle",
    });
    return { def, root, cap, tap, top, label, x, y, w, base, centre: onScreen(x + w / 2, y + keyH / 2) };
  };

  const lay = (keys: KeyDef[], r: number) => {
    const total = keys.reduce((sum, key) => sum + key.width, 0);
    const unit = (B.w - B.pad * 2 - gap * (keys.length - 1)) / total;
    let x = B.pad;
    return keys.map((def) => {
      const w = def.width * unit;
      const key = makeKey(def, x, B.pad + r * B.pitch, w);
      x += w + gap;
      return key;
    });
  };
  const keyRows = rows.map(({ keys }, r) => lay(keys, r));
  const spaceRow = lay(bottom, rows.length);
  const keys = [...keyRows.flat(), ...spaceRow];
  const toolKeys = (skill: number) => rows.flatMap(({ skill: s }, r) => (s === skill ? keyRows[r] : [])).filter((key) => key.def.kind === "tool");
  const enter = keys.find((key) => key.def.kind === "enter")!;
  const space = keys.find((key) => key.def.kind === "space")!;

  // A key dips and springs back.
  const dip = (key: (typeof keys)[number], at: number, depth = 1) => {
    film.to(key.cap, { x: press[0] * depth, y: press[1] * depth, duration: F(3), ease: "power2.out" }, F(at));
    film.to(key.cap, { x: 0, y: 0, duration: F(9), ease: "back.out(3)" }, F(at + 3));
  };

  // The board slams up from below, while the cube hangs where Process left it.
  gsap.set(board, { y: vh + 160 });
  film.to(board, { y: 0, duration: F(22), ease: "snap" }, F(2));

  // Same cube, same place, same size as the last frame of Process: this is the seam.
  const cube = drawCube(svg, target.x, target.y, target.a, { top: LIME, left: LIME, right: LIME });
  drawCubeDetails(cube.root, target.x, target.y, target.a);
  gsap.set(cube.root, { svgOrigin: `${target.x} ${target.y}` });
  const [slotX, slotY] = enter.centre;
  film.to(cube.root, { x: slotX - target.x, y: slotY - target.y - target.a * 0.5, scale: 0.84, duration: F(14), ease: "power3.in" }, F(LANDED - 14));
  film.set(cube.root, { autoAlpha: 0 }, F(LANDED));

  // It lands as the Enter key, and the shock runs through the board.
  gsap.set(enter.top, { attr: { fill: LIME } });
  gsap.set(enter.root, { autoAlpha: 0 });
  film.set(enter.root, { autoAlpha: 1 }, F(LANDED));
  keys.forEach((key) => {
    dip(key, LANDED + Math.hypot(key.centre[0] - slotX, key.centre[1] - slotY) * 0.012, 0.8);
  });
  film.fromTo(board, { y: 0 }, { y: 12, duration: F(2), ease: "power1.out", immediateRender: false }, F(LANDED));
  film.to(board, { y: 0, duration: F(10), ease: "back.out(3)" }, F(LANDED + 2));

  // ---- The title, before the first row.
  const T = L.title;
  const titleGroup = group(svg);
  const my = group(titleGroup);
  const titleSize = Math.min(T.size, ((frame.W - T.x * 2) / wordWidth("SKILLS", 1000)) * 1000);
  const myCap = WORDS.MY.capHeight * (T.my / 1000);
  const wordTop = T.y - WORDS.SKILLS.capHeight * (titleSize / 1000);
  drawWord(my, "MY", T.x, wordTop - 26, { size: T.my });
  const myBlock = el("rect", { x: T.x - 4, y: wordTop - 26 - myCap - 6, width: WORDS.MY.width * (T.my / 1000) + 10, height: myCap + 12, fill: INK }, titleGroup);
  blockWipe(film, myBlock, my, 16, 6);
  const titleWord = group(titleGroup);
  drawWord(titleWord, "SKILLS", T.x, T.y, { size: titleSize, face: LIME, side: INK, outline: 2.8, depth: [10, 15], ticks: PAPER });
  slam(film, titleWord, 12, -(T.x + wordWidth("SKILLS", titleSize) + (vw - frame.W) / 2 + 80), -12, 18);
  const tools = skills.reduce((sum, skill) => sum + skill.tools.length, 0);
  const caption = text(titleGroup, portrait ? T.x : T.x + wordWidth("SKILLS", titleSize) + 40, portrait ? T.y + 66 : T.y, `${skills.length} AREAS · ${tools} TOOLS`, {
    size: portrait ? 24 : 16,
    family: MONO,
    weight: 600,
    spacing: "0.12em",
  });
  gsap.set(caption, { autoAlpha: 0, y: 14 });
  film.to(caption, { autoAlpha: 1, y: 0, duration: F(9), ease: "settle" }, F(26));
  film.to(titleGroup, { x: -80, autoAlpha: 0, duration: F(7), ease: "power2.in" }, F(ENTRY - 8));

  // ---- One skill at a time: its keys light up and get typed.
  const C = L.copy;
  const bodyStyle: TextStyle = { size: C.body, weight: 500, stretch: "90%" };
  skills.forEach((skill, i) => {
    const at = beat(i);
    const lit = toolKeys(i);
    lit.forEach((key, k) => {
      film.set(key.top, { attr: { fill: LIT[i] } }, F(at + 4 + k * 4));
      dip(key, at + 4 + k * 4);
      film.set(key.top, { attr: { fill: key.base } }, F(at + STEP - 2));
    });

    const panel = group(group(svg, { transform: `translate(${C.x},${C.y})` }));
    const label = text(panel, 0, 0, `${String(i + 1).padStart(2, "0")} / ${skills.length}`, { size: C.label, family: MONO, weight: 700 });
    const size = Math.min(C.wordMax, ...skill.lines.map((line) => (C.wordFit / wordWidth(line, 1000)) * 1000));
    let y = 18;
    const words = skill.lines.map((line) => {
      y += size * 1.04;
      const word = group(panel);
      drawWord(word, line, -2, y, { size, face: LIT[i], side: INK, outline: 2.4, depth: [7, 11], ticks: PAPER });
      return word;
    });

    const details = group(panel);
    const [bodyX, bodyY] = [C.bodyX - C.x, C.bodyY - C.y];
    const placed = wrap(skill.text, C.width, C.line, bodyStyle);
    placed.forEach((word) => text(details, bodyX + word.x, bodyY + word.y, word.word, bodyStyle));

    // What the keys are typing.
    const typedY = bodyY + placed.at(-1)!.y + C.line + 18;
    const charWidth = C.typed * 0.6;
    let typedX = bodyX + charWidth * 2;
    const typedLine = group(panel);
    text(typedLine, bodyX, typedY, ">", { size: C.typed, family: MONO, weight: 700 });
    lit.forEach((key, k) => {
      const token = text(typedLine, typedX, typedY, key.def.label.toLowerCase(), { size: C.typed, family: MONO, weight: 600 });
      typedX += (key.def.label.length + 1) * charWidth;
      gsap.set(token, { autoAlpha: 0 });
      film.set(token, { autoAlpha: 1 }, F(at + 4 + k * 4));
    });
    el("rect", { class: "blink", x: typedX - charWidth * 0.6, y: typedY - C.typed * 0.86, width: C.typed * 0.56, height: C.typed * 1.04, fill: INK }, typedLine);

    gsap.set(panel, { autoAlpha: 0 });
    film.set(panel, { autoAlpha: 1 }, F(at + 3));
    gsap.set(label, { autoAlpha: 0 });
    film.set(label, { autoAlpha: 1 }, F(at + 4));
    words.forEach((word, w) => slam(film, word, at + 3 + w * 3, -760, -12, 15));
    gsap.set(details, { autoAlpha: 0, y: 20 });
    film.to(details, { autoAlpha: 1, y: 0, duration: F(9), ease: "settle" }, F(at + 12));
    gsap.set(typedLine, { autoAlpha: 0 });
    film.set(typedLine, { autoAlpha: 1 }, F(at + 3));
    film.to(panel, { x: -60, autoAlpha: 0, duration: F(6), ease: "power2.in" }, F(at + STEP - 7));
  });

  // ---- The last key: the spacebar lights up, goes down, and Contact floods out from under it.
  const [spaceX, spaceY] = space.centre;
  film.set(space.top, { attr: { fill: LIME } }, F(COLLAPSE + 4));
  dip(space, COLLAPSE + 4, 0.5);
  film.to(space.cap, { x: press[0], y: press[1], duration: F(5), ease: "power3.in" }, F(COLLAPSE + 18));

  const reach = Math.hypot(vw, vh);
  const flood = el("circle", { cx: spaceX, cy: spaceY, r: 16, fill: LIME }, svg);
  gsap.set(flood, { transformOrigin: "50% 50%", scale: 0 });
  film.to(flood, { scale: (reach * 1.15) / 16, duration: F(SKILLS_LENGTH - COLLAPSE - 23), ease: persp(0.03) }, F(COLLAPSE + 23));
  film.set({}, {}, F(SKILLS_LENGTH));

  // ---- While the scroll rests the row in play keeps typing. Any key also goes down under the pointer.
  const tap = (key: (typeof keys)[number]) => {
    gsap.to(key.tap, { x: press[0], y: press[1], duration: 0.07, ease: "power2.out", yoyo: true, repeat: 1, overwrite: true });
  };
  keys.forEach((key) => key.root.addEventListener("pointerenter", () => tap(key)));

  let playing: typeof keys = [];
  const typist = gsap.to({}, {
    duration: 0.17,
    repeat: -1,
    paused: true,
    onRepeat() {
      const pool = playing.length ? playing : keys;
      tap(pool[Math.floor(Math.random() * pool.length)]);
    },
  });
  const live = (f: number) => {
    const on = f >= 0 && f < COLLAPSE + 20;
    typist.paused(!on);
    const row = Math.floor((f - ENTRY) / STEP);
    playing = row >= 0 && row < skills.length ? toolKeys(row) : [];
  };

  return { el: svg, film, live, title: 44, stops: skills.map((_, i) => beat(i) + 40) };
}
