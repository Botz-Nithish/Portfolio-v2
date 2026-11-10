import gsap from "gsap";
import { lenis } from "./scroll";
import "./eases";
import { drawWord, wordWidth } from "../gfx/type";

export interface NavItem {
  /** Link hash, and the key of its drawing. */
  key: string;
  label: string;
  caption: string;
  /** First film frame of the section. */
  from: number;
  /** The resting frame a jump lands on, never a seam. */
  target: number;
}

const INK = "#0B0B0C";
const PAPER = "#E6E6E3";
const LIME = "#C8FF00";
const CYAN = "#00E5FF";

/** The O of CODE, as drawn for the favicon. */
const O_PATH =
  "M32 53.72Q23.4 53.72 17.12 51.09Q10.83 48.47 7.42 43.62Q4 38.77 4 32Q4 25.23 7.42 20.35Q10.83 15.47 17.12 12.88Q23.4 10.28 32 10.28Q40.66 10.28 46.92 12.88Q53.17 15.47 56.58 20.35Q60 25.23 60 32Q60 38.77 56.58 43.62Q53.17 48.47 46.92 51.09Q40.66 53.72 32 53.72Z";
// The O's box in its own units, and the slot the pupil runs along.
const O_X = 4;
const O_Y = 10.28;
const O_W = 56;
const SLOT = { cx: 32, cy: 32, w: 38, h: 17, tilt: -32 };
const REACH = 11;

const eye = () => `
  <svg class="eye" viewBox="${O_X} ${O_Y} ${O_W} 43.44" aria-hidden="true">
    <path class="eye__o" d="${O_PATH}" />
    <g transform="translate(${SLOT.cx} ${SLOT.cy}) rotate(${SLOT.tilt})">
      <rect class="eye__slot" x="${-SLOT.w / 2}" y="${-SLOT.h / 2}" width="${SLOT.w}" height="${SLOT.h}" rx="${SLOT.h / 2}" />
      <circle class="eye__pupil" r="6" />
    </g>
  </svg>`;

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const spines = [44, 52, 40, 48, 55, 42, 50, 46];
const spineFill = [LIME, PAPER, CYAN, PAPER, LIME, PAPER, CYAN, PAPER];

/** One small, concrete drawing per section: what the visitor will see there. */
const ART: Record<string, string> = {
  top: `<g class="a-code"></g>`, // The hero's own extruded CODE, drawn in once the list exists.
  about: `
    <rect x="12" y="8" width="58" height="38" rx="4" fill="none" stroke="currentColor" stroke-width="2.5" />
    <rect x="17" y="13" width="48" height="28" rx="1.5" fill="${CYAN}" />
    <path class="a-type" d="M22 21h20M22 27h28M22 33h14" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" />
    <path d="M41 46v10M28 58h26" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
    <rect x="82" y="34" width="20" height="24" rx="3" fill="${LIME}" />
    <path d="M102 39h4a5 5 0 0 1 0 10h-4" fill="none" stroke="${LIME}" stroke-width="3" />
    <path class="a-steam" d="M88 29q-3-5 0-10t0-10M96 29q-3-5 0-10t0-10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />`,
  journey: `
    <circle cx="90" cy="26" r="11" fill="${LIME}" />
    <rect x="0" y="26" width="120" height="46" fill="${INK}" />
    <path d="M2 26H118" stroke="currentColor" stroke-width="1.5" />
    <path d="M54 26h12l44 44H10z" fill="${PAPER}" />
    <path class="a-lane" d="M60 26V72" stroke="${INK}" stroke-width="3" stroke-dasharray="5 6" />`,
  projects: `
    <path d="M4 64H116" stroke="currentColor" stroke-width="2" />
    ${spines
      .map(
        (h, i) =>
          `<rect${i === 0 ? ' class="a-spine"' : ""} x="${14 + i * 12}" y="${64 - h}" width="9" height="${h}" rx="1" fill="${spineFill[i]}" />`,
      )
      .join("")}`,
  process: `
    <g fill="none" stroke="${CYAN}" stroke-width="1.5">
      <circle cx="60" cy="36" r="30" /><circle cx="60" cy="36" r="20" /><circle cx="60" cy="36" r="10" />
      <path d="M30 36h60M60 6v60" />
    </g>
    <path class="a-sweep" d="M60 36V6A30 30 0 0 1 81.2 14.8Z" fill="${CYAN}" opacity=".45" />
    <circle class="a-blip" cx="74" cy="24" r="3.5" fill="${LIME}" />`,
  skills: range(6)
    .map((i) => {
      const x = 16 + (i % 3) * 30 + (i > 2 ? 8 : 0);
      const y = i > 2 ? 38 : 10;
      return `
    <rect x="${x}" y="${y + 5}" width="24" height="18" rx="3" fill="${PAPER}" />
    <g class="a-key" style="--i:${[0, 3, 1, 4, 2, 5][i]}">
      <rect x="${x}" y="${y}" width="24" height="18" rx="3" fill="${INK}" stroke="${PAPER}" stroke-width="2" />
    </g>`;
    })
    .join(""),
  contact: `
    <circle class="a-ring" cx="60" cy="36" r="20" fill="none" stroke="${LIME}" stroke-width="2" />
    <circle class="a-ring a-ring--late" cx="60" cy="36" r="20" fill="none" stroke="${LIME}" stroke-width="2" />
    <circle cx="60" cy="36" r="20" fill="${LIME}" />
    <rect x="49" y="28" width="22" height="15" rx="1.5" fill="none" stroke="${INK}" stroke-width="2" />
    <path d="M49 29.5l11 7.5 11-7.5" fill="none" stroke="${INK}" stroke-width="2" stroke-linejoin="round" />`,
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The index. The O in the top bar is the button: its slot opens past the camera, like the dive into the O,
 * and the list sits on the ink it leaves. A pick jumps the film while the ink covers it, then the slot closes.
 */
export function initNav({
  items,
  frames,
  now,
  seek,
  calm,
}: {
  items: NavItem[];
  frames: number;
  now: () => number;
  seek: (frame: number) => void;
  calm: boolean;
}) {
  const header = document.querySelector<HTMLElement>(".bar--top")!;
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "bar__eye is-waiting";
  trigger.disabled = true; // Until the intro has played.
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "nav");
  trigger.setAttribute("data-hover", "");
  trigger.innerHTML = `${eye()}<span class="bar__eye-label">Menu</span>`;
  header.appendChild(trigger);

  const length = (i: number) => (items[i + 1]?.from ?? frames) - items[i].from;
  const nav = document.createElement("div");
  nav.id = "nav";
  nav.className = "nav";
  nav.hidden = true;
  nav.setAttribute("role", "dialog");
  nav.setAttribute("aria-modal", "true");
  nav.setAttribute("aria-label", "Sections");
  nav.setAttribute("data-lenis-prevent", "");
  nav.innerHTML = `
    <div class="nav__bar">
      <span>Index<span class="nav__count"> · ${pad(items.length)} sections</span></span>
      <button class="bar__eye nav__close" type="button" data-hover>${eye()}<span class="bar__eye-label">Close</span></button>
      <span class="nav__hint">Esc to close</span>
    </div>
    <ol class="nav__list">
      ${items
        .map(
          (item, i) => `
      <li>
        <a class="nav__item" href="#${item.key}" data-index="${i}" data-hover>
          <span class="nav__num">${pad(i + 1)}</span>
          <span class="nav__name">
            <span class="nav__title">${item.label}</span>
            <span class="nav__caption">${item.caption}</span>
            <span class="nav__here">You are here</span>
          </span>
          <svg class="nav__art" viewBox="0 0 120 72" aria-hidden="true">${ART[item.key] ?? ""}</svg>
          <span class="nav__line" aria-hidden="true"></span>
          <span class="nav__block" aria-hidden="true"></span>
        </a>
      </li>`,
        )
        .join("")}
    </ol>
    <div class="nav__rail" aria-hidden="true">
      <div class="nav__track">
        ${items.map((_, i) => `<span class="nav__seg" style="flex-grow:${length(i)}"><i>${pad(i + 1)}</i></span>`).join("")}
        <span class="nav__head"><b>You are here</b></span>
      </div>
    </div>`;
  document.body.appendChild(nav);
  const code = nav.querySelector(".a-code");
  if (code) {
    const size = (100 / wordWidth("CODE", 1000)) * 1000;
    drawWord(code, "CODE", 58, 50, { size, face: LIME, side: "#9A9A95", depth: [3, 3], anchor: "middle" });
  }

  const iris = document.createElement("div");
  iris.className = "nav-iris";
  iris.setAttribute("aria-hidden", "true");
  document.body.appendChild(iris);

  const rows = [...nav.querySelectorAll<HTMLAnchorElement>(".nav__item")];
  const segs = [...nav.querySelectorAll<HTMLElement>(".nav__seg")];
  const head = nav.querySelector<HTMLElement>(".nav__head")!;
  const rail = nav.querySelector<HTMLElement>(".nav__rail")!;
  const close = nav.querySelector<HTMLButtonElement>(".nav__close")!;
  const outerPupil = trigger.querySelector(".eye__pupil")!;
  const innerPupil = close.querySelector(".eye__pupil")!;
  const page = [document.querySelector("#film"), header, document.querySelector(".bar--bottom")].filter(Boolean) as HTMLElement[];

  // At rest the pupil looks along its slot, like the loader's.
  if (!calm) {
    gsap.fromTo(
      outerPupil,
      { attr: { cx: -REACH } },
      { attr: { cx: REACH }, duration: 1.7, ease: "soft", yoyo: true, repeat: -1, repeatDelay: 0.5 },
    );
  }

  let current = -1;
  let hot = -1;
  let open = false;
  let busy = false;

  const indexAt = (frame: number) => {
    let index = 0;
    items.forEach((item, i) => {
      if (frame >= item.from) index = i;
    });
    return index;
  };

  /** The open eye looks at the row in play: the one under the pointer, else the one you are in. */
  const look = (i: number) => {
    const cx = REACH - (i / Math.max(items.length - 1, 1)) * REACH * 2;
    gsap.to(innerPupil, { attr: { cx }, duration: calm ? 0 : 0.35, ease: "snap", overwrite: true });
  };

  const heat = (i: number) => {
    if (i === hot) return;
    hot = i;
    rows.forEach((row, r) => row.classList.toggle("is-hot", r === i));
    segs.forEach((seg, s) => seg.classList.toggle("is-hot", s === i));
    look(i < 0 ? current : i);
  };

  const update = (frame: number) => {
    const index = indexAt(frame);
    if (index === current) return index;
    current = index;
    rows.forEach((row, r) => {
      if (r === index) row.setAttribute("aria-current", "location");
      else row.removeAttribute("aria-current");
    });
    segs.forEach((seg, s) => {
      seg.classList.toggle("is-past", s < index);
      seg.classList.toggle("is-current", s === index);
    });
    return index;
  };

  /** The slot, measured on screen, and the scale at which it covers every corner of the viewport. */
  const placeIris = () => {
    const box = trigger.querySelector("svg")!.getBoundingClientRect();
    const k = box.width / O_W;
    const cx = box.left + (SLOT.cx - O_X) * k;
    const cy = box.top + (SLOT.cy - O_Y) * k;
    const w = SLOT.w * k;
    const h = SLOT.h * k;
    gsap.set(iris, { display: "block", left: cx - w / 2, top: cy - h / 2, width: w, height: h, rotation: SLOT.tilt, scale: 1 });
    // Undo the tilt to test each corner against the stadium in its own frame.
    const a = (-SLOT.tilt * Math.PI) / 180;
    const corners = [
      [0, 0],
      [innerWidth, 0],
      [0, innerHeight],
      [innerWidth, innerHeight],
    ];
    const covers = (s: number) =>
      corners.every(([x, y]) => {
        const dx = x - cx;
        const dy = y - cy;
        const lx = Math.abs(dx * Math.cos(a) - dy * Math.sin(a));
        const ly = dx * Math.sin(a) + dy * Math.cos(a);
        const r = (h / 2) * s;
        return Math.hypot(Math.max(lx - (w / 2) * s + r, 0), ly) <= r;
      });
    let scale = 1;
    while (!covers(scale)) scale *= 1.08;
    return scale * 1.06;
  };

  const reveal = () => {
    nav.hidden = false;
    nav.scrollTop = 0;
    page.forEach((el) => (el.inert = true));
    (rows[current] ?? close).focus({ preventScroll: true });
    if (calm) return;
    const parts = rows.map((row) => row.querySelectorAll(".nav__num, .nav__name, .nav__art"));
    gsap.set(parts.flatMap((p) => [...p]), { autoAlpha: 0 });
    const tl = gsap.timeline();
    // Each row is led on by a lime block, as the hero's MEETS is.
    rows.forEach((row, i) => {
      const block = row.querySelector(".nav__block")!;
      const at = i * 0.045;
      tl.fromTo(block, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.2, ease: "snap" }, at)
        .set(parts[i], { autoAlpha: 1 }, at + 0.2)
        .to(block, { scaleX: 0, transformOrigin: "100% 50%", duration: 0.26, ease: "snap" }, at + 0.2);
    });
    tl.fromTo(rail, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "snap" }, 0.3);
  };

  const show = () => {
    if (open || busy || trigger.disabled) return;
    open = true;
    const frame = now();
    update(frame);
    const at = Math.min(Math.max(frame / frames, 0), 1);
    head.style.left = `${(at * 100).toFixed(2)}%`;
    head.classList.toggle("is-start", at < 0.08);
    head.classList.toggle("is-end", at > 0.92);
    hot = -2;
    heat(-1);
    trigger.setAttribute("aria-expanded", "true");
    lenis.stop();
    if (calm) {
      reveal();
      return;
    }
    busy = true;
    const scale = placeIris();
    gsap
      .timeline({ onComplete: () => void (busy = false) })
      .to(outerPupil, { attr: { r: 0 }, duration: 0.12, ease: "power2.in" }, 0)
      .to(iris, { scale, duration: 0.62, ease: "power4.in" }, 0)
      .call(reveal)
      .set(iris, { display: "none" });
  };

  const hide = (target?: number) => {
    if (!open || busy) return;
    busy = true;
    const restore = document.activeElement !== null && nav.contains(document.activeElement);
    const settle = () => {
      open = false;
      busy = false;
      trigger.setAttribute("aria-expanded", "false");
      lenis.start();
      if (restore) trigger.focus({ preventScroll: true });
    };
    const leave = () => {
      nav.hidden = true;
      page.forEach((el) => (el.inert = false));
      heat(-1);
      // The film moves only while the ink covers it.
      if (target !== undefined) seek(target);
    };
    if (calm) {
      leave();
      settle();
      return;
    }
    const scale = placeIris();
    gsap.set(iris, { scale });
    gsap
      .timeline({ onComplete: settle })
      .to(nav, { autoAlpha: 0, duration: 0.14, ease: "power1.in" })
      .call(leave)
      .set(nav, { clearProps: "opacity,visibility" })
      .to(iris, { scale: 1, duration: 0.62, ease: "snap" })
      .set(iris, { display: "none" })
      .fromTo(outerPupil, { attr: { r: 0 } }, { attr: { r: 6 }, duration: 0.35, ease: "back.out(3)" });
  };

  trigger.addEventListener("click", show);
  close.addEventListener("click", () => hide());
  rows.forEach((row, i) => {
    row.addEventListener("pointerenter", () => heat(i));
    // Only a keyboard focus heats a row: opening by mouse focuses the current one, which should not look hovered.
    row.addEventListener("focus", () => row.matches(":focus-visible") && heat(i));
    row.addEventListener("click", (e) => {
      e.preventDefault();
      hide(items[i].target);
    });
  });
  nav.querySelector(".nav__list")!.addEventListener("pointerleave", () => heat(-1));
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) hide();
  });

  return {
    update,
    /** The intro is all about the big O, so the small one stays away until it has played, then pops in. */
    enable() {
      trigger.disabled = false;
      trigger.classList.remove("is-waiting");
      if (calm) return;
      const mark = trigger.querySelector(".eye")!;
      gsap
        .timeline()
        .set(mark, { transition: "none" })
        .fromTo(mark, { scale: 0 }, { scale: 1.15, duration: 0.4, ease: "snap" })
        .to(mark, { scale: 1, duration: 0.35, ease: "settle" })
        .fromTo(trigger.querySelector(".bar__eye-label"), { autoAlpha: 0, x: -8 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: "snap" }, 0.2)
        .set(mark, { clearProps: "transition,transform" });
    },
  };
}
