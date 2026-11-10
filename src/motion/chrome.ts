import gsap from "gsap";

/**
 * Long jumps never scroll the film: that would fast-forward every zoom in a second.
 * A cover closes from the click, the page jumps behind it, then the cover opens.
 */
export function initJumps(targets: Record<string, number>, seek: (frame: number) => void, calm = false) {
  const cover = document.querySelector<HTMLElement>("#cover")!;
  const jump = (frame: number, x: number, y: number) => {
    if (calm) {
      seek(frame);
      return;
    }
    gsap
      .timeline()
      .set(cover, { display: "block", clipPath: `circle(0% at ${x}px ${y}px)` })
      .to(cover, { clipPath: `circle(150% at ${x}px ${y}px)`, duration: 0.55, ease: "power3.in" })
      .call(() => seek(frame))
      .to(cover, { clipPath: "circle(0% at 50% 50%)", duration: 0.6, ease: "power3.out" }, "+=0.08")
      .set(cover, { display: "none" });
  };

  document.addEventListener("click", (e) => {
    const link = (e.target as Element).closest?.<HTMLAnchorElement | SVGAElement>('a[href^="#"]');
    // The index runs its own cover.
    if (!link || link.closest("#nav")) return;
    const key = link.getAttribute("href")?.slice(1);
    if (!key || key.includes("/")) return;
    const frame = targets[key];
    if (frame === undefined) return;
    e.preventDefault();
    // A key press has no pointer position, so the cover grows from the link itself.
    let { clientX: x, clientY: y } = e;
    if (e.detail === 0) {
      const box = link.getBoundingClientRect();
      x = box.left + box.width / 2;
      y = box.top + box.height / 2;
    }
    jump(frame, x, y);
  });
}
