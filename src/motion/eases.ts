import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

export const FPS = 30;

/** Frames to timeline seconds. All scene timing is written in 30 fps frames. */
export const F = (frames: number) => frames / FPS;

// Curves measured from the reference's After Effects comps.
CustomEase.create("snap", ".33,0,.13,1");
CustomEase.create("soft", ".42,0,.24,1");
CustomEase.create("settle", ".33,0,.28,1");
CustomEase.create("long", ".17,0,.83,1");
// Fast through the middle, slow but never stopped at both ends.
CustomEase.create("whoosh", ".5,.12,.5,.88");

/** Dolly curve: constant forward speed grows on screen as 1/z. Use for scale and for anything riding it. */
export const persp = (near = 0.05) => (t: number) => ((1 / (1 - t * (1 - near)) - 1) * near) / (1 - near);
