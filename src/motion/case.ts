import gsap from "gsap";
import { projects, type Project } from "../content/projects";
import { EMBLEMS } from "../scenes/emblems";
import { el } from "../gfx/svg";
import { lenis } from "./scroll";

/** Project detail: a real dialog that irises open from the click. */
export function initCase() {
  const dialog = document.createElement("dialog");
  dialog.id = "case";
  dialog.setAttribute("aria-labelledby", "case-title");
  dialog.setAttribute("data-lenis-prevent", ""); // The dialog scrolls natively on small screens.
  dialog.innerHTML = `
    <div class="case">
      <div class="case__bar case__reveal">
        <span data-field="index"></span>
        <button class="case__close" type="button" data-hover>Close</button>
      </div>
      <h2 class="case__title case__reveal" id="case-title"></h2>
      <div class="case__grid">
        <div class="case__media case__reveal"></div>
        <div class="case__reveal">
          <p class="case__lede"></p>
          <dl class="case__meta"></dl>
          <ul class="case__tags"></ul>
          <button class="case__next" type="button" data-hover></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(dialog);

  const $ = <T extends Element>(selector: string) => dialog.querySelector<T>(selector)!;
  let current = 0;
  let origin = "50% 50%";

  const fill = (project: Project) => {
    current = projects.indexOf(project);
    $("[data-field=index]").textContent =
      `${String(current + 1).padStart(2, "0")} / ${projects.length} · ${project.sector}`;
    $("#case-title").textContent = project.title;
    $(".case__lede").textContent = project.lede;
    $(".case__meta").innerHTML = (
      [
        ["Client", project.client],
        ["Year", project.year],
        ["Role", project.role],
        ["Sector", project.sector],
      ] as const
    )
      .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
      .join("");
    $(".case__tags").innerHTML = project.tags.map((tag) => `<li>${tag}</li>`).join("");
    $(".case__next").textContent = `Next: ${projects[(current + 1) % projects.length].title}`;

    const media = $(".case__media");
    media.replaceChildren();
    if (project.video) {
      const video = document.createElement("video");
      Object.assign(video, { src: project.video, muted: true, loop: true, autoplay: true, playsInline: true });
      video.setAttribute("aria-label", `${project.title} demo`);
      media.appendChild(video);
    } else {
      const svg = el("svg", { viewBox: "-320 -200 640 400", "aria-hidden": "true" }, media);
      const art = el("g", { transform: "scale(.72)" }, svg);
      EMBLEMS[project.slug](art);
    }
  };

  const open = (project: Project, x: number, y: number) => {
    fill(project);
    origin = `${x}px ${y}px`;
    dialog.showModal();
    lenis.stop();
    history.replaceState(null, "", `#work/${project.slug}`);
    gsap.fromTo(
      dialog,
      { clipPath: `circle(0px at ${origin})` },
      { clipPath: `circle(150vmax at ${origin})`, duration: 0.75, ease: "power3.inOut" },
    );
    gsap.fromTo(
      ".case__reveal",
      { autoAlpha: 0, y: 26 },
      { autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.07, delay: 0.32 },
    );
  };

  const close = () => {
    gsap.to(dialog, {
      clipPath: `circle(0px at ${origin})`,
      duration: 0.55,
      ease: "power3.inOut",
      onComplete() {
        dialog.close();
        $(".case__media").replaceChildren();
        history.replaceState(null, "", location.pathname + location.search);
        lenis.start();
      },
    });
  };

  $(".case__close").addEventListener("click", close);
  $(".case__next").addEventListener("click", () => {
    const next = projects[(current + 1) % projects.length];
    fill(next);
    history.replaceState(null, "", `#work/${next.slug}`);
  });
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });

  document.addEventListener("click", (e) => {
    const link = (e.target as Element).closest?.("[data-case]");
    if (!link) return;
    e.preventDefault();
    const project = projects.find((p) => p.slug === link.getAttribute("data-case"));
    if (project) open(project, e.clientX, e.clientY);
  });

  return { open };
}
