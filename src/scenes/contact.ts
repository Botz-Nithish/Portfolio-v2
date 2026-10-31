import gsap from "gsap";
import { site } from "../content/site";
import { contact as copy } from "../content/skills";
import { contourRings, type Pt } from "../gfx/shapes";
import { COLOR, MONO, el, group, sceneSvg, text, type Frame, type TextStyle } from "../gfx/svg";
import { drawWord } from "../gfx/type";
import { F } from "../motion/eases";
import { blockWipe, idle } from "../motion/kit";

export const CONTACT_LENGTH = 96;

const LANDSCAPE = {
  lead: { x: 110, y: 240, size: 42 },
  see: { size: 112 },
  lets: { x: 104, y: 450, size: 196 },
  talk: { x: 104, y: 660, size: 196 },
  mail: { x: 930, y: 300, w: 540, h: 84, size: 28 },
  cols: { x: 930, y: 450, gap: 190 },
  foot: { y: 790 },
  contour: { cx: 1120, cy: 500, rx: 150, ry: 120, gap: 28, count: 16, seed: 91 },
};
const PORTRAIT = {
  lead: { x: 70, y: 300, size: 54 },
  see: { size: 130 },
  lets: { x: 64, y: 590, size: 196 },
  talk: { x: 64, y: 790, size: 196 },
  mail: { x: 70, y: 900, w: 760, h: 96, size: 36 },
  cols: { x: 70, y: 1070, gap: 262 },
  foot: { y: 1430 },
  contour: { cx: 450, cy: 700, rx: 200, ry: 240, gap: 26, count: 16, seed: 91 },
};

/** Width of the "LIKE WHAT YOU SEE?" line, for the block that wipes it on. */
const seeWidth = (L: typeof LANDSCAPE) => (L === PORTRAIT ? 790 : 690);

export function buildContact(frame: Frame, stage: Element) {
  const { W, H, portrait } = frame;
  const L = portrait ? PORTRAIT : LANDSCAPE;
  const svg = sceneSvg("contact", frame, stage);
  const film = gsap.timeline({ defaults: { ease: "none" } });

  el("rect", { x: -W, y: -H, width: W * 3, height: H * 3, fill: COLOR.lime }, svg);

  // The opening contour field returns, now drawn in ink: the film closes where it began.
  const field = group(svg);
  const fieldIdle = group(field);
  const rings = contourRings(L.contour).map((d, i) =>
    el("path", { d, fill: "none", stroke: COLOR.ink, "stroke-width": i % 5 === 4 ? 1.6 : 0.9, opacity: 0.42 }, fieldIdle),
  );
  idle(fieldIdle, { rotation: -6, transformOrigin: "50% 50%", duration: 12, ease: "sine.inOut", yoyo: true });
  gsap.set(field, { rotation: 80, scale: 2.4, transformOrigin: "50% 50%" });
  gsap.set(rings, { autoAlpha: 0 });
  film.to(field, { rotation: 0, scale: 1, duration: F(40), ease: "settle" }, 0);
  film.to(rings, { autoAlpha: 1, duration: F(5), stagger: F(1) }, 0);

  const leadStyle: TextStyle = { size: L.lead.size, weight: 800, stretch: "125%" };
  const lead = group(group(svg));
  text(lead, L.lead.x, L.lead.y, copy.lead, leadStyle);
  const seeX = L.lead.x + (portrait ? 560 : 496);
  drawWord(lead, "SEE?", seeX, L.lead.y + 4, { size: L.see.size });
  const leadBlock = el("rect", { x: L.lead.x - 6, y: L.lead.y - L.lead.size * 1.02, width: seeWidth(L), height: L.lead.size * 1.3, fill: COLOR.ink }, svg);
  blockWipe(film, leadBlock, lead, 6, 7);

  const style = { face: COLOR.paper, side: COLOR.ink, outline: 3.2, depth: [14, 22] as Pt };
  const lets = group(group(svg));
  drawWord(lets, "LET’S", L.lets.x, L.lets.y, { ...style, size: L.lets.size });
  const talk = group(group(svg));
  drawWord(talk, "TALK.", L.talk.x, L.talk.y, { ...style, size: L.talk.size });
  gsap.set(lets, { x: -W, rotation: -6, transformOrigin: "50% 50%" });
  gsap.set(talk, { x: W, rotation: 6, transformOrigin: "50% 50%" });
  film.to(lets, { x: 0, rotation: 0, duration: F(22), ease: "snap" }, F(10));
  film.to(talk, { x: 0, rotation: 0, duration: F(22), ease: "snap" }, F(13));

  // Mail, the one call to action on the page.
  const M = L.mail;
  const mail = el("a", { href: `mailto:${copy.mail}`, class: "cta", "data-hover": "" }, svg);
  el("rect", { x: M.x, y: M.y, width: M.w, height: M.h, rx: M.h / 2, fill: COLOR.ink }, mail);
  text(mail, M.x + M.h / 2, M.y + M.h / 2 + M.size * 0.34, copy.mail, {
    size: M.size,
    family: MONO,
    weight: 600,
    fill: COLOR.paper,
  });
  el("circle", { cx: M.x + M.w - M.h / 2, cy: M.y + M.h / 2, r: M.size * 0.46, fill: COLOR.lime }, mail);
  gsap.set(mail, { autoAlpha: 0, scale: 0.6, transformOrigin: "0% 50%" });
  film.to(mail, { autoAlpha: 1, scale: 1, duration: F(14), ease: "back.out(1.8)" }, F(24));

  // Facts.
  const small = portrait ? 25 : 18;
  const labelSize = portrait ? 22 : 12;
  const label = (parent: Element, x: number, y: number, value: string) =>
    text(parent, x, y, value.toUpperCase(), { size: labelSize, family: MONO, weight: 700, spacing: "0.08em" });
  const body: TextStyle = { size: small, weight: 600, stretch: "90%" };
  const C = L.cols;
  const line = small * 1.55;
  const facts = group(svg);

  const links: [string, string][] = [
    ["GitHub", site.github],
    ["LinkedIn", site.linkedin],
    ["Résumé", "cv.pdf"],
  ];
  label(facts, C.x, C.y, "Elsewhere");
  links.forEach(([name, href], i) => {
    const a = el("a", { href, target: "_blank", rel: "noopener", "data-hover": "" }, facts);
    text(a, C.x, C.y + 34 + i * line, name, body);
  });
  label(facts, C.x + C.gap, C.y, "Based in");
  text(facts, C.x + C.gap, C.y + 34, copy.based, body);
  text(facts, C.x + C.gap, C.y + 34 + line, portrait ? "Open to relocate" : "Open to relocate", body);
  text(facts, C.x + C.gap, C.y + 34 + line * 2, "or remote", body);
  label(facts, C.x + C.gap * 2, C.y, "Local time");
  const clock = text(facts, C.x + C.gap * 2, C.y + 34, "--:--:-- IST", { ...body, family: MONO, stretch: undefined });
  const tick = () => {
    const now = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata" });
    clock.textContent = `${now} IST`;
  };
  tick();
  setInterval(tick, 1000);
  gsap.set(facts, { autoAlpha: 0, y: 24 });
  film.to(facts, { autoAlpha: 1, y: 0, duration: F(14), ease: "settle" }, F(34));

  // Footer line and the way back.
  const foot = group(svg);
  text(foot, portrait ? 70 : 110, L.foot.y, copy.credit, { size: portrait ? 21 : 13, family: MONO, weight: 500 });
  const top = el("a", { href: "#top", "data-hover": "" }, foot);
  text(top, portrait ? 70 : 1470, portrait ? L.foot.y + 40 : L.foot.y, "Back to top ↑", {
    size: portrait ? 24 : 13,
    family: MONO,
    weight: 700,
    anchor: portrait ? "start" : "end",
  });
  gsap.set(foot, { autoAlpha: 0 });
  film.to(foot, { autoAlpha: 1, duration: F(10) }, F(42));
  film.set({}, {}, F(CONTACT_LENGTH));

  return { el: svg, film };
}
