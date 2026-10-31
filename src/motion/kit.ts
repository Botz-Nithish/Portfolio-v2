import gsap from "gsap";
import { F, persp } from "./eases";

type TL = gsap.core.Timeline;
type Target = gsap.TweenTarget;

const ambient: gsap.core.Tween[] = [];

/** Motion that runs while the page rests. Reduced motion stops all of it. */
export function idle(target: Target, vars: gsap.TweenVars) {
  ambient.push(gsap.to(target, { repeat: -1, ...vars }));
}

export const stopIdle = () => ambient.forEach((tween) => tween.pause(0));

/** Scale 0 to overshoot to 1, the reference's two-keyframe pop. */
export function pop(tl: TL, target: Target, at: number, over = 1.15, rise = 12, fall = 11) {
  tl.set(target, { autoAlpha: 1 }, F(at));
  tl.fromTo(target, { scale: 0 }, { scale: over, duration: F(rise), ease: "soft" }, F(at));
  tl.to(target, { scale: 1, duration: F(fall), ease: "settle" }, F(at + rise));
}

/** A prop flies in on its own depth and settles. `from` is its offset, scale and rotation at the start. */
export function land(tl: TL, target: Target, at: number, from: gsap.TweenVars, dur = 18) {
  // The origin must be set before any transform, or GSAP offsets the element to compensate.
  gsap.set(target, { transformOrigin: "50% 50%" });
  gsap.set(target, { autoAlpha: 0, ...from });
  tl.set(target, { autoAlpha: 1 }, F(at));
  tl.to(target, { x: 0, y: 0, scale: 1, rotation: 0, duration: F(dur), ease: "snap" }, F(at));
}

/** Rings spin in from far away, each line one frame behind the last. */
export function contourIn(tl: TL, field: Element, lines: Element[], at: number, turn = 300, zoom = 4.2, dur = 53) {
  gsap.set(field, { rotation: turn, scale: zoom, transformOrigin: "50% 50%" });
  gsap.set(lines, { autoAlpha: 0 });
  tl.to(field, { rotation: 0, scale: 1, duration: F(dur), ease: "settle" }, F(at));
  tl.to(lines, { autoAlpha: 1, duration: F(6), ease: "none", stagger: F(1) }, F(at));
}

/** An object travels from the vanishing point and past the camera. */
export function rush(tl: TL, target: Target, at: number, dur: number, reach = 7, near = 0.03) {
  gsap.set(target, { scale: 0.01, autoAlpha: 0 });
  tl.set(target, { autoAlpha: 1 }, F(at));
  tl.to(target, { scale: reach, duration: F(dur), ease: persp(near) }, F(at));
  tl.set(target, { autoAlpha: 0 }, F(at + dur));
}

/** Draws a stroke through itself: the head leads, the tail catches up. */
export function swoosh(tl: TL, target: Target, at: number, dur: number) {
  gsap.set(target, { drawSVG: "0% 0%" });
  tl.to(target, { drawSVG: "0% 70%", duration: F(dur * 0.55), ease: "soft" }, F(at));
  tl.to(target, { drawSVG: "100% 100%", duration: F(dur * 0.45), ease: "power1.in" }, F(at + dur * 0.55));
}

/** A word hits from off-frame, leaning into the stop. */
export function slam(tl: TL, target: Target, at: number, from = -640, lean = -14, dur = 15) {
  gsap.set(target, { x: from, skewX: lean, transformOrigin: "0% 100%" });
  tl.to(target, { x: 0, skewX: 0, duration: F(dur), ease: "snap" }, F(at));
}

/** A solid block sweeps over a line of type, and the line is there as the block retreats. */
export function blockWipe(tl: TL, block: Target, line: Target, at: number, dur = 6) {
  gsap.set(line, { autoAlpha: 0 });
  gsap.set(block, { scaleX: 0, transformOrigin: "0% 50%" });
  tl.to(block, { scaleX: 1, duration: F(dur), ease: "soft" }, F(at));
  tl.set(line, { autoAlpha: 1 }, F(at + dur));
  tl.set(block, { transformOrigin: "100% 50%" }, F(at + dur));
  tl.to(block, { scaleX: 0, duration: F(dur + 1), ease: "soft" }, F(at + dur));
}
