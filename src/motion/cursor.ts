import gsap from "gsap";

export function initCursor() {
  const cursor = document.querySelector<HTMLElement>("#cursor");
  if (!cursor || matchMedia("(hover: none)").matches) return;

  const x = gsap.quickTo(cursor, "x", { duration: 0.25, ease: "power3" });
  const y = gsap.quickTo(cursor, "y", { duration: 0.25, ease: "power3" });

  addEventListener("pointermove", (e) => {
    x(e.clientX);
    y(e.clientY);
    gsap.set(cursor, { opacity: 1 });
    const hovering = (e.target as Element | null)?.closest?.("a, button, [data-hover]");
    gsap.to(cursor, { scale: hovering ? 2.2 : 1, duration: 0.3, ease: "power3", overwrite: "auto" });
  });
  document.documentElement.addEventListener("pointerleave", () => gsap.set(cursor, { opacity: 0 }));
}
