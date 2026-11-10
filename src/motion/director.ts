import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { lenis } from "./scroll";
import { F, FPS } from "./eases";
import { initCase } from "./case";
import { initJumps } from "./chrome";
import { initNav, type NavItem } from "./nav";
import { journey as events } from "../content/journey";
import { phases } from "../content/process";
import { skills as areas } from "../content/skills";
import { initCursor } from "./cursor";
import { initPresence } from "./presence";
import { stopIdle } from "./kit";
import type { Frame } from "../gfx/svg";
import { buildHero } from "../scenes/hero";
import { projects } from "../content/projects";
import { ABOUT_BUILT, ABOUT_HOLD, ABOUT_LENGTH, buildAbout } from "../scenes/about";
import { JOURNEY_LENGTH, buildJourney } from "../scenes/journey";
import {
  PROCESS_TITLE_HOLD,
  PROCESS_TITLE_LENGTH,
  PROJECTS_TITLE_LENGTH,
  buildProcessTitle,
  buildProjectsTitle,
} from "../scenes/titles";
import { WORK_LENGTH, buildWork, firstPlate } from "../scenes/work";
import { PROCESS_LENGTH, buildProcess, radarCentre } from "../scenes/process";
import { SKILLS_LENGTH, buildSkills } from "../scenes/skills";
import { CONTACT_LENGTH, buildContact } from "../scenes/contact";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

/** Scroll distance per comp frame. The reference runs at 13 px per frame. */
const PX_PER_FRAME = 13;

const INK = "#0B0B0C";
const PAPER = "#E6E6E3";

/** Lets the count repaint between scenes. Hidden tabs get no frames, so a timer backs it up. */
const breathe = () =>
  new Promise<void>((done) => {
    const backup = setTimeout(done, 50);
    requestAnimationFrame(() => {
      clearTimeout(backup);
      done();
    });
  });

export async function start() {
  const loader = window.__loader;
  performance.mark("load:bundle");
  initPresence();
  lenis.stop();
  loader.step();
  await Promise.all(
    ['500 30px "Archivo Variable"', 'italic 500 30px "Archivo Variable"', '500 14px "JetBrains Mono Variable"'].map(async (font) => {
      await document.fonts.load(font);
      loader.step();
    }),
  );

  const stage = document.querySelector("#stage")!;
  const filmEl = document.querySelector<HTMLElement>("#film")!;
  const label = document.querySelector("#scene-label")!;
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  // Phones report a shorter height while the URL bar shows. The stage is built for the tall state.
  const probe = document.body.appendChild(document.createElement("div"));
  probe.style.cssText = "position:absolute;visibility:hidden;width:0;height:100lvh";
  const stageHeight = probe.offsetHeight || innerHeight;
  probe.remove();
  const portrait = stageHeight > innerWidth;
  const [W, H] = portrait ? [900, 1600] : [1600, 900];
  const aspect = innerWidth / stageHeight;
  const frame: Frame = { W, H, vw: Math.max(W, H * aspect), vh: Math.max(H, W / aspect), portrait };
  // Layouts differ by orientation, so a flip rebuilds the film.
  matchMedia("(orientation: portrait)").addEventListener("change", () => location.reload());

  performance.mark("load:fonts");
  gsap.set(root, { "--chrome-ink": INK });
  // A timeline plays from the moment it exists, so each scene joins the paused film before the next yield.
  const film = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  const scene = async <T extends { film: gsap.core.Timeline }>(at: number, build: () => T) => {
    const built = build();
    film.add(built.film, F(at));
    loader.step();
    performance.mark(`load:built ${at}`);
    await breathe();
    return built;
  };
  const hero = await scene(0, () => buildHero(frame, stage));
  const about = await scene(hero.handoff, () => buildAbout(frame, stage, hero));
  const journeyAt = hero.handoff + ABOUT_LENGTH;
  const journey = await scene(journeyAt, () => buildJourney(frame, stage, root));
  const projectsTitleAt = journeyAt + JOURNEY_LENGTH;
  const projectsTitle = await scene(projectsTitleAt, () => buildProjectsTitle(frame, stage, firstPlate(portrait)));
  const workAt = projectsTitleAt + PROJECTS_TITLE_LENGTH;
  const work = await scene(workAt, () => buildWork(frame, stage, root));
  const processTitleAt = workAt + WORK_LENGTH;
  const processAt = processTitleAt + PROCESS_TITLE_HOLD;
  const process = await scene(processAt, () => buildProcess(frame, stage, root));
  // The title opens onto Process through the O, so it has to sit above it.
  const processTitle = await scene(processTitleAt, () => buildProcessTitle(frame, stage, radarCentre(portrait)));
  const skillsAt = processAt + PROCESS_LENGTH;
  const skills = await scene(skillsAt, () => buildSkills(frame, stage));
  const contactAt = skillsAt + SKILLS_LENGTH;
  const contact = await scene(contactAt, () => buildContact(frame, stage));
  stage.appendChild(hero.anchorLayer); // The dot rides above every scene.

  // Scene swaps sit inside the film, so jumps and reverse scrolling always land correctly.
  // Only now: while scenes build, anything on screen gets laid out again on every measurement.
  // The wall alone is 38 long rows of text, and showing it early cost seconds in real Chrome.
  gsap.set(hero.wall, { display: "block", willChange: "transform" });
  gsap.set(hero.el, { display: "block" });
  gsap.set(hero.anchorLayer, { display: "block" });
  film.set(about.el, { display: "block" }, F(hero.handoff));
  film.set(hero.el, { display: "none" }, F(hero.handoff));
  film.set(root, { "--chrome-ink": PAPER }, F(hero.handoff - 4));
  film.set(root, { "--chrome-ink": INK }, F(hero.handoff + about.papered));
  film.set(journey.el, { display: "block" }, F(journeyAt));
  film.set(about.el, { display: "none" }, F(journeyAt));
  film.set(root, { "--chrome-ink": PAPER }, F(journeyAt));
  film.set(projectsTitle.el, { display: "block" }, F(projectsTitleAt));
  film.set(journey.el, { display: "none" }, F(projectsTitleAt));
  film.set(root, { "--chrome-ink": INK }, F(projectsTitleAt - 2));
  film.set(work.el, { display: "block" }, F(workAt));
  film.set(projectsTitle.el, { display: "none" }, F(workAt));
  film.set(processTitle.el, { display: "block" }, F(processTitleAt));
  film.set(work.el, { display: "none" }, F(processTitleAt));
  film.set(root, { "--chrome-ink": PAPER }, F(processTitleAt));
  film.set(process.el, { display: "block" }, F(processAt));
  film.set(processTitle.el, { display: "none" }, F(processTitleAt + PROCESS_TITLE_LENGTH));
  film.set(skills.el, { display: "block" }, F(skillsAt));
  film.set(process.el, { display: "none" }, F(skillsAt));
  film.set(root, { "--chrome-ink": INK }, F(skillsAt));
  film.set(contact.el, { display: "block" }, F(contactAt));
  film.set(skills.el, { display: "none" }, F(contactAt));

  const frames = Math.round(film.duration() * FPS);
  // Plain names, so visitors know what each section is. Each jump lands on a still, never mid-seam.
  const sections: NavItem[] = [
    { key: "top", label: "Start", caption: "Code meets craft", from: 0, target: 0 },
    { key: "about", label: "About me", caption: "Who I am", from: hero.handoff, target: hero.handoff + ABOUT_BUILT },
    {
      key: "journey",
      label: "My journey",
      caption: `${events.length} stops · ${events[0].year}–${events.at(-1)!.year}`,
      from: journeyAt,
      target: journeyAt + journey.title,
    },
    {
      key: "projects",
      label: "My projects",
      caption: `${projects.length} projects`,
      from: projectsTitleAt,
      target: projectsTitleAt + projectsTitle.title,
    },
    {
      key: "process",
      label: "My process",
      caption: `${phases.length} steps`,
      from: processTitleAt,
      target: processTitleAt + processTitle.title,
    },
    {
      key: "skills",
      label: "My skills",
      caption: `${areas.reduce((sum, area) => sum + area.tools.length, 0)} tools`,
      from: skillsAt,
      target: skillsAt + skills.title,
    },
    { key: "contact", label: "Contact", caption: "Let’s talk", from: contactAt, target: frames },
  ];
  filmEl.style.height = `calc(100lvh + ${frames * PX_PER_FRAME}px)`;

  const hud = document.querySelector<HTMLElement>("#hud")!;
  hud.hidden = !params.has("hud");

  // Reduced motion: no dives, tunnels or zooms. Scroll steps between still frames, as hard cuts.
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stills = [
    0,
    hero.handoff + ABOUT_HOLD,
    journeyAt + journey.title,
    ...journey.stops.map((f) => f + journeyAt),
    projectsTitleAt + projectsTitle.title,
    ...work.stops.map((f) => f + workAt),
    processTitleAt + processTitle.title,
    ...process.stops.map((f) => f + processAt),
    skillsAt + skills.title,
    ...skills.stops.map((f) => f + skillsAt),
    frames,
  ];
  const stillAt = (progress: number) => stills[Math.round(progress * (stills.length - 1))];
  if (calm) stopIdle();
  if (calm) filmEl.style.height = `calc(100lvh + ${stills.length * 460}px)`;

  const nav = initNav({ items: sections, frames, now: () => film.time() * FPS, seek: (f) => seek(f), calm });

  let past = false;
  let shown = -1;
  const trigger = ScrollTrigger.create({
    trigger: filmEl,
    start: "top top",
    end: "bottom bottom",
    animation: calm ? undefined : film,
    scrub: calm ? false : true,
    onUpdate(self) {
      if (calm) film.time(F(stillAt(self.progress)));
      const now = film.time() * FPS;
      // The pointer may not move again, so leaving the hero has to end its reactions by itself.
      if (now >= 26 !== past) {
        past = !past;
        if (past) hero.look(0, 0, false);
      }
      if (!calm) {
        journey.live(now - journeyAt);
        skills.live(now - skillsAt);
      }
      const section = nav.update(now);
      if (section !== shown) {
        shown = section;
        label.textContent = sections[section].label;
      }
      if (!hud.hidden) hud.textContent = `f ${Math.round(now)} / ${frames}`;
    },
  });

  // Measured, not frames times pixels: the scroll range differs on phones and in calm mode.
  const seek = (f: number) => {
    let progress = f / frames;
    if (calm) {
      const nearest = stills.reduce((best, still, i) => (Math.abs(still - f) < Math.abs(stills[best] - f) ? i : best), 0);
      progress = nearest / (stills.length - 1);
    }
    lenis.scrollTo(trigger.start + progress * (trigger.end - trigger.start), { immediate: true, force: true });
    ScrollTrigger.update();
  };

  const boot = hero.boot;
  initCursor();
  addEventListener("pointermove", (e) => hero.look(e.clientX, e.clientY, boot.progress() === 1 && film.time() < F(26)));
  const cases = initCase();
  initJumps(
    {
      ...Object.fromEntries(sections.map((s) => [s.key, s.target])),
      work: workAt + work.stops[0], // The hero CTA goes straight to the first project.
    },
    seek,
    calm,
  );

  // Debug handles for the QA contact sheets.
  Object.assign(window, {
    __qa: {
      frames,
      cuts: {
        about: hero.handoff,
        journey: journeyAt,
        projectsTitle: projectsTitleAt,
        work: workAt,
        processTitle: processTitleAt,
        processOpen: processTitleAt + PROCESS_TITLE_LENGTH,
        skills: skillsAt,
        contact: contactAt,
      },
      eventCuts: [
        ...journey.cuts.map((c) => c + journeyAt),
        ...work.cuts.map((c) => c + workAt),
        ...process.cuts.map((c) => c + processAt),
      ],
      seek,
      film,
      stopIdle,
      bootAt(f: number) {
        boot.pause().time(F(f));
      },
      bootPlay: () => boot.restart(),
      bootProgress: () => boot.progress(),
      bootLength: Math.round(boot.duration() * FPS),
      lenis,
    },
  });

  // Every load starts at the top with the intro. Only a link into a project, or reduced motion, skips it.
  const deepLink = location.hash.match(/^#work\/(.+)/);
  if (params.has("noboot") || calm || deepLink) {
    boot.progress(1).pause();
    lenis.start();
    const project = deepLink && projects.find((p) => p.slug === deepLink[1]);
    if (project) {
      // Both libraries cache page height, and neither has seen the film's height yet.
      lenis.resize();
      ScrollTrigger.refresh();
      seek(workAt + work.stops[projects.indexOf(project)]);
      cases.open(project, innerWidth / 2, innerHeight / 2);
    }
    await loader.dismiss();
    nav.enable();
    return;
  }

  performance.mark("load:ready");
  await loader.finish();
  performance.mark("load:gone");
  lenis.scrollTo(0, { immediate: true, force: true });
  // Nobody should miss the intro by having the tab in the background.
  if (document.hidden) await new Promise((seen) => document.addEventListener("visibilitychange", seen, { once: true }));
  document.addEventListener("visibilitychange", () => {
    if (boot.progress() < 1) boot.paused(document.hidden);
  });
  boot.eventCallback("onComplete", () => {
    lenis.start();
    nav.enable();
  });
  const hurry = () => boot.timeScale(5);
  addEventListener("wheel", hurry, { once: true, passive: true });
  addEventListener("touchstart", hurry, { once: true, passive: true });
  addEventListener("keydown", hurry, { once: true });
  boot.play();
  loader.remove();
}
