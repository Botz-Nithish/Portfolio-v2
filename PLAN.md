# Portfolio v2: motion implementation plan

Status: **approved 2026-10-31 with GSAP. Full site in progress. The user waived the Phase 1 sign-off gate while asleep and will review the whole build on waking.**
Scope change: SEO does not matter for this site. Visitors are here to see the design, so display type is drawn art and there is no no-JS version.
Reference: https://2024.liquidink.design/ and `refference/motion-graphics/`
Content source: `refference/portfolio-v1/` (facts only, none of its design)

---

## 1. How the reference was made (verified)

**The stack, from the live site and its bundles**

| Layer | What they used | Evidence |
|---|---|---|
| Site builder | Framer | `<meta generator="Framer f082bd6">` |
| Motion graphics | After Effects comps exported as Lottie JSON, bodymovin 5.7.4 and 5.9.0 | At least 9 JSON files, `layers` / `fr` / `ip` / `op` keys |
| Player | lottie-web and dotlottie-player, SVG renderer | 0 `<canvas>` on the page |
| Scroll sync | A Framer code override | See below |
| Pinning | CSS `position: sticky` in tall parents | Layers named `sticky stack` |
| Smooth scroll | Lenis | `class="lenis lenis-smooth"` on `<html>` |
| UI motion | Framer Motion springs and scroll transforms | `__framer__spring`, `__framer__transformTrigger` |
| anime.js | **Not used** | 0 hits in all bundles |
| GSAP, Three.js, WebGL | **Not used** | 0 hits, 0 canvases |

**The scroll trick is one line.** Everything looks like a 3D camera, but it is this (de-minified: the bundle's names are `Tt`, `tt` and `L`, and the readable names are inferred from usage):

```js
function Td(t){return a=>{let{scrollY:s}=useScroll(),o=useTransform(s,[300,2300],[0,1]);
  return createElement(t,{...a,progress:o})}}
```

Scroll position 300 to 2300 maps to Lottie progress 0 to 1. A second override maps `[6100, 12235]`.

**Probable pipeline:** Figma vectors (layer names like `Rectangle 34626916`, `Vector 9011`), animated in After Effects, exported with bodymovin, dropped into Framer.

**Timing**

- The first comp, `Master`, autoplays for 4.5 s on load (frames 0 to 135).
- The second comp, `Master 2`, is the same After Effects timeline cut at marker frame 135. It is scrubbed by scroll (frames 135 to 287).
- That cut is why the handoff is invisible: both files share one frame.
- 2000 px of scroll across 152 frames is **13 px per frame**. One viewport is about 2.3 s of comp time.
- Stepping the live site through 20 scroll offsets gave 20 settled frames. It is scrubbed, not triggered.

**The video covers roughly the first 3,500 px of a 19,087 px page.** The rest of the reference is simpler: sticky titles, scroll-linked transforms and short Lottie loops. Their best work sits in 10 s of hand-animated comp. We are asking for that quality everywhere, which is about five times the volume (section 11).

**The white dot in the video is the cursor**, not a graphic: a fixed 60 px white circle with `mix-blend-mode: difference`. It looks teal over red because that is white inverted over red. The nav and footer bars use the same blend, which is why they flip automatically between light and dark scenes.

---

## 2. The motion grammar to copy

All numbers come from the Lottie files. Frames are at 30 fps.

1. **Fake camera.** Every object is parented to one Null. The Null moves scale, x and y. Example: scale 100 to 80 over 16 frames.
2. **Fake depth.** Each object also has its own guide Null, so objects move at different speeds.
   - Landing: from 170 to 210% down to 100% in 17 frames.
   - Leaving: up to 320 to 610% in 8 to 12 frames.
   - Near objects leave first. The box and pot are gone by frame 243, the stairs by frame 246.
3. **Rhythm: fast, slow, fast.** 17 frames in, a brief hold, about 23 frames of slow drift, 8 to 12 frames out. Scenes keep drifting between the fast moves, so the frame rarely sits still.
4. **Portal dive.** Tilt about -7 degrees, near props fly past, the black door fills the screen.
5. **Nested portal (Droste).** Inside the door, a small arch grows past the camera. Polarity flips dark and back to light with no crossfade. A plain scroll-linked fade to dark follows.
6. **Object wipe.** The next scene's huge foreground shape sweeps over the current scene, then pulls back to reveal the whole scene.
7. **Vanishing-point rush.** Quads, discs and black and white wedges rush out of a centre point.
8. **Slam assembly.** Extruded letters fly in along opposing diagonals and settle.
9. **Overshoot pop.** Scale 0 to 115 to 100 (or 125), about 0.4 s + 0.35 s.
10. **Block-wipe type.** Each letter is led by a solid block with a gradient tail, about 5 frames apart. Heavy forms then settle into the final light italic.
11. **Contour field.** 16 lines in white, 1-frame stagger. The group spins in from 300 degrees to -17 degrees and scales from 600% to 140%.
12. **Speed lines.** Gradient strokes with trim paths. `Master` has 78 gradient strokes and 16 trim paths.
13. **Ring ripple.** Concentric arcs sweep out while a line of text holds.

**Dominant curves** (`cubic-bezier`):

| Curve | Uses in Master | Role |
|---|---|---|
| `.33, 0, .13, 1` | 85 | Primary. Quick start, long settle |
| `.42, 0, .24, 1` | 64 | Softer move |
| `.33, 0, .28, 1` | 42 | Softer move |
| `.17, 0, .83, 1` | 39 | Long symmetrical ease |

---

## 3. Rebuilding it without After Effects

The reference's Lottie files render through browser SVG, so inline SVG reaches the same pixels with no export step. A GSAP timeline is the same model as an After Effects comp: named layers, keyframes and a playhead that scroll can drive.

| After Effects | Code |
|---|---|
| Comp at 30 fps | Scene timeline, with durations in frames |
| Layer in and out points | Zero-duration `set` calls in the film toggle scene art |
| Null camera | `<g id="camera">` animated with scale, x, y |
| Guide Null per object | `<g data-depth>` wrappers, one per prop |
| Shape layers | Inline SVG, generated at build time |
| Trim paths | DrawSVGPlugin |
| Path keyframes | MorphSVGPlugin |
| Graph-editor easing | CustomEase, using the curves in section 2 |
| Text animators | SplitText plus `clip-path` |
| Track matte | SVG `clipPath` |

**Architecture: one sticky stage, one film**

```text
<main id="film">                 tall scroll spacer, height comes from total frames
  <div class="stage">            position: sticky, 100svh
    contour field                persistent SVG, restyled per scene
    <svg id="hero">              scene art and type, one SVG per scene
    <svg id="about">             ...stacked, only active scenes display
    ...
  chrome                         nav, bottom bar, cursor
```

```ts
const FRAME = 1 / 30, PX_PER_FRAME = 13;
const film = gsap.timeline({ defaults: { ease: "none" } });
scenes.forEach(s => film.add(s.timeline(), s.label));
filmEl.style.height = `calc(100svh + ${(film.duration() / FRAME) * PX_PER_FRAME}px)`;
ScrollTrigger.create({ trigger: filmEl, start: "top top", end: "bottom bottom",
                       animation: film, scrub: true });
```

Why this shape:

- **Seams are overlaps inside one timeline.** There are no scroll offsets to line up, so the exit of one scene can share frames with the entry of the next.
- **Length comes from frame counts, never hard-coded pixels.** The reference's fixed `[300, 2300]` is what we avoid. Scenes can be retimed freely.
- **Reverse scrolling is free.** Scrubbing plays every move backward correctly.
- **Nav resolves through labels.** Each scene has a label, and links use `ScrollTrigger#labelToScroll`.
- **Long jumps never scroll the film.** A smooth scroll over 17,000 px would fast-forward every zoom in about a second. Nav, the hero CTA and back to top play a short time-based cover (a portal flash or halftone), jump while the viewport is covered, then uncover.
- **Scene state lives in the timeline.** Visibility uses zero-duration `set` calls inside the film, not callbacks, so jumps and reverse scrolling always land in the correct state.

**Seam rules (what "perfect transition" means here)**

1. The last frame of a scene is identical to the first frame of the next.
2. Each handoff is a shared shape or a full-bleed field of one colour. Scene swaps happen while that shape fully covers the viewport.
3. No crossfades as the main device.
4. The camera never reverses direction across a seam. It can change axis.
5. Text is still and fully legible during its hold.

**Procedural art kit.** It runs once at load and builds each scene's SVG, so art and motion live together in one scene file:

- `extrude(path, dx, dy)` builds hard side faces as one path.
- `hardShadow(shape)` builds flat cast shadows.
- `contourField(seed)` builds the 16 line field.
- `speedLines(n)`, `tunnel(n)`, `floorGrid()` and `ringRipple()` build the shared effects.

Every scene shares this language, while its artwork stays unique.

---

## 4. Dependencies

Sizes are measured: real esbuild bundles, minified and gzipped, with tree-shaking.

**Runtime**

| Package | Version | Purpose | Gzip |
|---|---|---|---|
| `gsap` (core, ScrollTrigger, DrawSVG, MorphSVG, SplitText, CustomEase, Flip) | 3.15.0 | Timeline, scrub, SVG, type | 67.6 KB |
| `lenis` | 1.3.27 | Smooth scroll | 5.3 KB |

**Runtime total: about 73 KB.** The reference ships 467 KB of JS plus 592 KB of Lottie JSON.

**Build only**

| Package | Purpose |
|---|---|
| `vite` 8.3 | Dev server and bundling. No framework |
| `typescript` | All scene and motion code |
| `fontkit` | Glyph outlines, so display type can be extruded and morphed as art |

**anime.js 4.5 versus GSAP 3.15**

| | GSAP stack | anime.js stack |
|---|---|---|
| Gzip | 67.6 KB | 25.8 KB |
| Licence | Free, including commercial. Proprietary, not MIT | MIT |
| Scrubbed timelines | Yes, and mature | Yes (`createTimeline`, `onScroll({ sync })`) |
| SVG draw and morph | DrawSVG, MorphSVG | `createDrawable`, `morphTo` |
| Split text | SplitText | `text.split` |
| Pinning | Yes, but not needed with a sticky stage | None in source. CSS sticky covers it |
| Agent skills | 8 official GSAP skills already installed | Third-party only in search results |

**Recommendation: GSAP.** anime.js can do this, and it is 42 KB lighter. GSAP is still the safer choice for a nested timeline of about 1,450 frames that gets scrubbed in both directions, and for morphs between shapes with different point counts. I have not tested anime.js at that length, and it would be the riskier bet. Neither library is what the reference used, so this is an engineering choice, not imitation.

All GSAP plugins ship in the public npm package (confirmed in `node_modules`). The licence covers commercial use. Its main restriction is on tools that compete with Webflow's visual builder, which does not apply here.

**Rejected**

| Option | Why not |
|---|---|
| Lottie | Same SVG output through a heavier player and slower iteration. After Effects only pays off with a human animator. If one joins later, `lottie-web` light (47.8 KB) can run a single scene off the same timeline |
| Astro | Its main gain was pre-rendered HTML for SEO, which no longer matters |
| `scroll-world` skill | Scrubs AI-generated video: bitmap, heavy, spends Higgsfield credits, and hard to hold to a strict palette |
| Three.js / OGL | The reference has no 3D. Its depth is scale and parallax. Three alone is 129 KB |
| Motion | No gain over GSAP for one long scrubbed film |
| Rive | Needs its own editor, like After Effects |

---

## 5. Visual system

**Palette**

| Token | Value | Use |
|---|---|---|
| `--ink` | `#0B0B0C` | Black ground, type, shadows |
| `--paper` | `#E6E6E3` | Light ground |
| `--white` | `#FFFFFF` | Contour lines, highlights |
| `--lime` | `#C8FF00` | Primary accent: path, action, "you are here" |
| `--cyan` | `#00E5FF` | Secondary accent: data, signal |

Paper is deliberately a light grey and not pure white. The contour lines and white discs only show on a ground darker than white. That is why the reference uses cream.

**Colour rules**

- Lime and cyan are fills and shapes. They are never small text on a light ground.
- Text is ink on paper, lime or cyan, or paper on ink.
- Journey and Process's blueprint phase use lime or cyan as full grounds. Everywhere else accents stay as shapes, until the Contact lime flood.

**Type (proposal)**

- Display: Archivo variable, using its width and weight axes. Wide black for extrusions, condensed italic for contrast. Headlines are glyph outlines, not HTML text.
- Labels: JetBrains Mono. It suits a developer and replaces the reference's condensed labels.
- Both are self-hosted, and neither was used in v1.

**Chrome**

- Layout follows the reference: name top-left, CV top-right, current scene bottom-left, chevrons bottom-centre, year bottom-right.
- **The reference's `mix-blend-mode: difference` cannot be copied.** Over lime it turns violet, and over cyan it turns red-orange, which breaks the palette. Contact is full-bleed lime, and portals scale accent shapes past the camera, so this would show.
- Nav and bottom bar: a per-scene `--chrome-ink` variable, set inside the film at the frame the covering shape passes the bars. Ink on paper and lime, paper on ink. This is cheap and always on palette. `backdrop-filter` on full-width bars would re-sample every frame during zooms.
- Cursor: a 60 px element, so `backdrop-filter: invert(1) hue-rotate(180deg)` is affordable. By the filter matrix it gives dark green over lime, dark teal over cyan, and still inverts black and white. Confirm in the browser in Phase 1.

---

## 6. Storyboard

### Scenes

| # | Section | Ground | Unique graphic | Frames | Scroll |
|---|---|---|---|---|---|
| 0 | Loader, then Boot | Ink, then paper | **The compile.** A small O fills with lime liquid while its pupil looks around, then the camera pushes in. C, D and E plot as real font outlines over a wall of their own path data. CRAFT drops into a placeholder box, and the impact wave turns the black code world into the paper craft world | 136, autoplay on every load | 0 |
| 1 | Hero | Paper | **Type sculpture.** Extruded CODE MEETS CRAFT, lime faces, black sides, cyan slot in the O | 60 | 780 px |
| 2 | About | Paper | **The Desk.** The computer and the mug spawn first, each in its own wind of tapered air lines. Then keyboard, speaker and floating cards land | 252 | 3,276 px |
| 3 | Journey | Changes per event | **The Drive.** "MY LIFE JOURNEY" lies on the road as raised letters and the camera drives over it. Then a solid road through 9 full-frame set pieces, each with its own ground, signature action and transition | 652 | 8,476 px |
| 4 | Work | Paper and ink | **The shelf, then eight landings.** "MY PROJECTS": one spine per project, and the first opens into its plate. Each project then lands from depth on its own ground, leaves through its own motif | 606 | 7,878 px |
| 5 | Process | Ink, cyan, paper, ink | **Sonar, then the Cube.** "MY PROCESS": a ping from the O finds the word, and the camera flies through the O into the radar. Then blueprint, faces slam on, numbers rise, lime launch | 324 | 4,212 px |
| 6 | Skills | Paper | **The Keyboard.** One giant tilted keyboard: 35 tools from the resume, each a labelled keycap, across 5 areas. The shipped cube lands as Enter, rows light and type themselves, and the spacebar floods into Contact | 398 | 5,174 px |
| 7 | Contact | Lime | **Flood.** Rings ripple, closing type, mail button | 90 | 1,170 px |

Total: 2,386 scrubbed frames, about 31,000 px at 13 px per frame. The reference page is 19,087 px.

**The 9 set pieces and their way out:**

| Event | Ground | Set piece | Transition out |
|---|---|---|---|
| Born | Ink | Sun rises over the Marina, lighthouse sweeps its beam, waves draw on | Fly into the sun |
| Finished school | Paper | Building rises, clock spins, books drop, flag unfurls | Dive through the door, tilted |
| Started engineering | Ink | Braces slam round a terminal, code rain, gears, circuit traces | Braces part on a lime blade |
| 1st place | Lime | Trophy drops and squashes, sunburst spins, confetti fires | Cyan shutter blades |
| First internship | Cyan | Tower windows light in a wave, React atom spins up | Dive into one dark window |
| 2nd place | Ink | Stopwatch counts down two hours, a site assembles block by block | The hand sweeps a paper pie |
| Ran Xynthraa | Paper | Spotlights swing, podium slams up, bunting drops, crowd rises | Cyan bars rise |
| Full-stack intern | Cyan | Messages stack in a phone, typing dots, user network spreads | Black bubble swells, dive through |
| Graduated | Ink | Doorway opens, caps toss, lime light, confetti falls | Fly through the doorway into Work |

**The 8 emblems:**

| Project | Emblem |
|---|---|
| ZINGBOT | Chat bubbles running through a workflow graph |
| WMS | Shelving grid with 8 role badges |
| PIXELPIPE | Squares compressing through a funnel, 5x |
| V-MEET | VM cubes deploying in a row |
| NEURORYTHM | EEG wave resolving into notes |
| SCHOLAR | Citation graph growing |
| KALLOS | Faceted gem turning |
| FINSOL | One structure rebuilt into another, the migration |

### Seams

Each row is the exact handoff. Direction of travel changes from seam to seam and never reverses.

| Seam | Move | Scene A exit | Shared handoff | Scene B entry | Frames |
|---|---|---|---|---|---|
| Boot to Hero | **Impact wave** | Paper spreads from where CRAFT lands | Last boot frame is film frame 0: nothing from the code world survives it | Letters lift on the wave and gain their depth, then MEETS wipes on | Autoplay |
| Hero to About | **O dive** | Camera pushes into the O until its black counter covers the viewport | Black field, speed lines, then a small paper screen grows past the camera | Paper field. Desk props land on their own depth timing | 30 |
| About to Journey | **Screen dive** | Tilt -7 degrees, near props leave first, black monitor screen covers viewport | Black field | The road grows out of the vanishing point | 30 |
| Journey to Work | **Doorway and corner** | Gate 9, a paper doorway, covers viewport | Paper field. Radial speed lines morph into horizontals | Forward motion becomes sideways. Panel 1 slides in | 30 |
| Work to Process | **Halftone** | Black dots grow over panel 8 until the viewport is black | The same dot grid, shrinking and inverting | White dot fog on ink: Discover phase | 24 |
| Process to Skills | **Launch** | Lime cube launches up, contrail widens to cover viewport | The cube itself and a paper field | Camera keeps rising. Plates arrive from below and dock under the cube | 24 |
| Skills to Contact | **Collapse and flood** | Plates compress to a line, then a dot | The dot | Lime disc floods the viewport, rings ripple | 24 |

---

## 7. Content from v1

Built from `index.html`, `js/gallery.js` and `assets/cv.pdf`, stored in `src/content/*.ts`.

| Section | Content carried over |
|---|---|
| Identity | Nithish Rao Perumenki, Full-Stack Developer, Chennai, GitHub, LinkedIn, email, CV |
| Hero | CODE MEETS CRAFT, blurb, 2 CTAs |
| About | Manifesto |
| Journey | 9 dated events |
| Work | 8 projects: title, client, year, sector, role, tags, lede |
| Process | 4 phases with deliverables |
| Skills | 4 skills |
| Contact | Headline, email, links, location, IST clock |

Project video exists for 3 of the 8: `kallos.mp4`, `vmeet.mp4`, `wms.mp4`. The other five get their emblem only.

**Not carried over**

- Marquee (it repeats Skills), sound toggle, the 3D gallery, the night drive, the particle hero, the project SVG art.
- Kind Words, Recognition and count-up stats. The README describes them, but they are not in v1's HTML. No testimonials will be invented.

**Corrections to confirm**

- Hero blurb says "final-year CS engineer", but Journey says graduated in 2026. Proposed: "I'm a full-stack engineer who builds products end to end, and sweats the motion and detail most engineers skip."
- `cv.pdf` also still says "Final-year CSE student". You would need to update that file.

---

## 8. Project structure

```text
portfolio-website-v2/
  PLAN.md
  index.html  package.json  tsconfig.json  vite.config.ts
  public/           cv.pdf  og.png  media/*.mp4
  refference/       untouched, excluded from the build
  tools/
    glyphs.mjs      font outlines to src/gfx/glyphs.gen.ts
    qa-sheet.sh     contact sheets across film frames, driven by agent-browser
  src/
    main.ts
    content/        site.ts  journey.ts  projects.ts  process.ts  skills.ts
    scenes/         intro.ts  hero.ts  about.ts  journey.ts  titles.ts  work.ts  process.ts  skills.ts  contact.ts
                    each file builds its SVG and returns its timeline
    motion/
      director.ts   film, labels, scene visibility, resize, debug seek
      eases.ts      named curves from section 2
      kit.ts        pop, typeWipe, depth landing, portal, ripple, perspective
      scroll.ts     Lenis + ScrollTrigger
      cursor.ts  chrome.ts
    gfx/            svg helpers, extrude, shadow, contour, speed lines, floor grid
    styles/         tokens.css  base.css
```

---

## 9. Build phases

**Phase 0: foundation**

- Scaffold Vite and TypeScript in the project root and add tokens and fonts.
- Add `refference/` to `.gitignore`. It holds a nested `.git` clone and a 30 MB video.
- Set up the sticky stage, Lenis, ScrollTrigger and director, with a debug HUD showing the current frame.
- Build the motion kit and art kit. Move content into data files.
- Done when an empty film scrubs both ways with labels working.

**Phase 1: vertical slice, then stop for your sign-off**

- Build Boot, Hero, the O dive and About (The Desk).
- Include chrome, cursor, and portrait framing.
- Deliver a working local build plus contact sheets.
- **This is the go or no-go gate.** The largest risk is whether hand-authored SVG reaches the reference's density. It is much cheaper to find out here than in scene 6.

**Phase 2: remaining film.** One scene and its incoming seam at a time, each with a contact sheet.

1. Journey and Screen dive
2. Work, Doorway and corner, and the case view
3. Process and Halftone
4. Skills and Launch
5. Contact and Collapse and flood

**Phase 3: hardening.** Performance, mobile, reduced motion, link preview image, static deploy. Output must work on GitHub Pages, with the base path set (v1 lives at `/Portfolio-web/`).

**Skills used during the build:** `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-performance`, `gsap-utils`, `agent-browser`. No install is needed.

---

## 10. Quality gates

**Performance**

- Only the active scene's art layer and its seam partner render. Art is the cost, so art alone is culled.
- During a zoom, animate at most 12 wrappers, never individual paths.
- At most 250 SVG nodes in an active scene.
- No `filter` or `mask` on zooming groups. No `will-change` on the SVG root, because it would rasterise and blur at 500%.
- Targets: 60 fps on an M-series laptop at 1440x900 @2x, at least 45 fps with 4x CPU throttle.
- `quality.ts` samples real frame rate and sheds contour lines and speed lines if it drops.
- Budget: page under 350 KB gzip, excluding video.

**Accessibility and resilience**

- SEO is out of scope, so display type is drawn art and there is no no-JS version.
- Links and buttons stay real elements with visible focus styles.
- `prefers-reduced-motion`: seams become hard cuts between holds. Tunnels and dives can cause motion sickness, so this stays.
- Case view is a real dialog with focus trap, Escape and focus restore.
- The loader and intro run on every load and reload, and scroll or keypress fast-forwards the intro. Only a link into a project, reduced motion or `?noboot` skips them.

**Mobile**

- Every scene gets its own portrait framing through `gsap.matchMedia()`. Not a crop.
- Native touch scroll, `svh` units, `ignoreMobileResize`.
- Tested at 390x844 and 360x640.

**Verification, repeated per scene**

- Contact sheets across scroll, the method used for this analysis.
- Pixel diff either side of each seam.
- Reverse scroll, resize mid-film, deep link to each label.
- Console clean, no horizontal overflow.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Hand-authored SVG looks thinner than studio illustration | Keep to strict geometry, hard shadows and hairlines. Procedural kit. Phase 1 gate |
| Volume: about 48 s of comp, against the reference's 10 s. Portrait framing per scene adds substantial authoring on top | Shared kit, one scene at a time. Journey is the easiest place to cut |
| Work sits deep: about 8,450 px down, roughly 9 screens at 900 px | Hero CTA jumps straight there. Order is decision 6 |
| SVG zoom cost at 500%, worst on Safari and low-end devices | Budgets in section 10, quality tier, test throttled early |
| Text unreadable during motion | Hold frames under every text block, rule 5 of the seams |
| Scroll length feels long | `PX_PER_FRAME` is one constant, so pacing can be retuned globally |

---

## 12. Decisions

1. **Motion engine:** GSAP. Confirmed.
2. **Build:** Vite and TypeScript, because SEO is out of scope.
3. **Palette:** `--paper #E6E6E3`, `--lime #C8FF00`, `--cyan #00E5FF`, for the reasons in section 5. Default accepted.
4. **Project detail:** overlay dialog that zooms from the panel, with a `#work/<slug>` deep link. Default accepted.
5. **Copy:** hero blurb rewrite in section 7. Default accepted.
6. **Section order:** v1's order (About, Journey, Work, Process, Skills, Contact). Default accepted. Review at the Phase 1 gate: Work sits about 9 screens in, so Journey may need cutting to 30 frames per gate, which saves about 1,600 px.

---

## Build log

**2026-10-31, overnight run**

- Done: Vite and TypeScript setup, glyph tool, art kit, motion kit, director.
- Done: all 8 scenes in film order (Boot, Hero, About, Journey, Work, Process, Skills, Contact) and all 7 seams.
- Done: chrome, cursor, jump cover, case dialog, reduced motion holds.
- Build: JS 87 KB gzip, CSS 4.5 KB gzip. MorphSVG, SplitText and Flip turned out not to be needed.
- Run locally: `npm run dev`, then open http://localhost:5173/
- Debug: `?hud` shows the frame counter, `?noboot` skips the loader and intro, `?hold` stops on the loader's last frame.
- QA: `bash tools/qa-sheet.sh <name> <cols> film <frames...>` writes a contact sheet to `/private/tmp/portfolio-qa/<name>/sheet.jpg`.

Film map in frames (13 px of scroll per frame): Hero 0, About 58, Journey 282, Work 822, Process 1308, Skills 1548, Contact 1796, end 1892. About 24,600 px in total.

Second pass, same night:

- Fixed a real pop at the doorway cut (found by pixel diff), the cube detail mismatch at Process to Skills, and clipped portrait margins. All scenes now use a whole safe frame (`meet`) and compute zoom covers from the visible size, so ultra-wide and phone both hold.
- Added hatch ticks on hero type, a shockwave at each gate, three-depth parallax in Work, clickable emblem plates, and idle life: the O's dot tracks the pointer like an eye, plus breathing contours and floating cards.
- Measured: 60 fps in every scene in headless Chrome on this Mac, p95 under 20 ms. Not yet tested on real phones or Safari.

Third pass, after review:

- Fixed: CV link for sub-path deploys, eye dot clamped to its slot, ink fade behind Journey copy, Next updates the URL.
- Reduced motion is now hard cuts between still frames (no tunnel), and jumps resolve to the nearest still.
- Phones: stage is `100lvh` and the frame is measured against it, `ignoreMobileResize` is on, and seek uses the measured scroll range. **Unverified: headless browsers cannot reproduce the URL bar collapsing.**
- Verified by pixel diff, 0.16 frame gap: f58 SSIM 0.9995 landscape, 0.998 portrait. f702 SSIM 0.9991.
- Verified by serving `dist/` under `/Portfolio-web/`: page, CV, video and fonts all return 200.

Fourth pass, 01:38 to 02:10, after the user said the timeline felt plain:

- Journey rebuilt as **The Drive**: 9 full-frame set pieces, 8 different transitions, and a ground colour per event.
- Why it felt plain: one constant-speed primitive, a locked camera, and mostly black void with hairlines.
- The road is now a solid wedge. Lanes, rumble strips and speed lines are one path each, rebuilt from a single scroll value, so they keep true perspective and move fast-slow-fast.
- The world banks 6 degrees into every cut. Years slam in, titles block-wipe, and a timeline rail runs through the section.
- Beats went from 44 to 60 frames, so text gets a real hold. Journey is 540 frames and Work moves about 1,560 px deeper.
- New `tools/qa-seams.sh` pop-tests every cut. It caught all 8 new cuts jumping (SSIM 0.78), because the road reappeared at full size. Each era's road now grows out of the vanishing point.
- Verified: every cut SSIM 0.983 or better in both orientations. Forward, backward and jump land on the same frame (0.9997 to 1.0). 60 fps in every scene, with Journey at 427 active nodes, down from 645.

### Known gaps, next

- Not tested on Safari or Firefox. `backdrop-filter` on the cursor and CSS `r` on hover need checking in Safari.
- Not tested on real phones. Check the URL bar collapse, and touch scroll feel.
- No CPU-throttled run, and no automatic quality tier yet. 60 fps was measured on this Mac in headless Chrome.
- Resizing mid-film: zoom covers are computed once at load, so a large aspect change needs a refresh. Only orientation flips rebuild automatically.
- Scroll pacing has not been felt by a person. `PX_PER_FRAME` in `director.ts` retunes the whole film.
- No link preview image yet. v1's `og-image.png` shows the old design, so it was not copied.
- Not deployed, not committed.

### Ideas for the advanced pass

- Secondary motion inside the holds: gate lights, keyboard keys pressing as words type, plate parallax on pointer.
- Block-wipe titles for Process, Skills and Contact, to match MEETS.
- Scroll-velocity response: streak density or a slight camera lean when scrolling fast.
- If the film feels slow, lower `PX_PER_FRAME` first. See the sixth pass for current lengths.

Fifth pass, from 03:03:

- Work rebuilt: no more sliding track. Each project lands from depth on its own ground (ink or paper), with its plate on alternating sides, one big accent shape, a ghost index and a slammed title.
- Each project leaves through its own motif: chat bubble, stacking bays, pixel flood, isometric face, brainwave front, citation burst, gem facet.
- Work beats are 58 frames so the copy gets a real hold. Later scenes sit about 1,200 px deeper.
- Pop test now covers Work's 7 internal cuts: all SSIM 0.998 or better in landscape.
- Skills rebuilt as a deck: the stack opens around one enlarged plate, its surface performs (grid fills, waves flow, ripples, network wakes), its name slams in, and huge tool names run in opposite directions behind it.
- Process upgraded: radar sweep with pinging blips for Discover, cyan blueprint for Architect, paper with a hard shadow for Build, black with rising bars for Ship. Each phase opens as an iris from the cube. Phase words are extruded and slam in.
- Contact: "LIKE WHAT YOU SEE?" now block-wipes on.
- `slam`, `blockWipe` and `idle` moved into `kit.ts`. Idle motion now stops under reduced motion.
- Work's old scrub dips (0.956 to 0.98) were the idle float landing at a different phase, confirmed by a difference image, not a timing bug.
- Decided against the advisor-suggested 42 to 48 frame Work beat: 58 frames keeps the copy readable. Cost: later scenes sit deeper, and the film is now about 24,600 px.
- Verified: landscape cuts 0.986 or better, 60 fps in every scene, hero CTA, deep links, case dialog and reduced motion all pass, no console errors. JS is 100 KB gzip.

Sixth pass, 31 Oct, from the user's notes after seeing it:

- Reload bug fixed. The session gate that skipped the intro after the first view is gone, and `history.scrollRestoration` is manual, so every load starts at the top with the loader and intro. Verified from the plain URL: load, reload, and reload from f900.
- Preloader added, inline in `index.html`, so it paints before any script or font. Rolling digits in the title's type, with slashed zeros. The cyan dot runs the baseline. The log is real: bundle, fonts and each scene with measured times. It finishes on real readiness, with a 1.3 s minimum. Reduced motion gets no count and a short fade. `tools/glyphs.mjs` writes the digit outlines into `index.html`.
- Intro rebuilt in `src/scenes/intro.ts`, about 4.5 s, replacing the copy of the reference's rush. At 100 the third digit, a zero with a slash, rolls left and is the O of CODE. The dot hops in and the eye watches a pen plot C, D and E as real TrueType outlines, anchors and handles, from `gfx/skeleton.ts`. The wall behind is the title's real path data. The pen draws a placeholder box, CRAFT drops into it from the camera, and a wave wipes the black code world to the paper craft world. CODE gains its depth as the wave passes.
- Resting composition unchanged. At rest, a lens over the title shows the outlines, points and live coordinates, and the extrusions lean with the pointer. Both end by themselves once the film leaves the hero.
- About: the computer then the mug spawn first, spinning horizontally like a turntable, then squashing onto the point they stand on. The computer is a true box: front, back, sides and top are flat planes, so each is projected by one affine matrix per frame. The mug is round, so only its handle and label move. Each has two wrapper groups for the two pivots, and a flat ring of air on the floor. `motion/air.ts` draws tapered ribbons rebuilt from head and tail values, a wide band thinning into lines, with a ball on the lead arc, as in the reference's pot. About grew by 28 frames.
- Title scenes added, because visitors did not know what section 3 was. Each caption states a real count.
  - MY LIFE JOURNEY is inside Journey: raised letters on the road plane, in the same projection as the lanes, rebuilt each frame. There is no cut into the timeline.
  - MY PROJECTS, `scenes/titles.ts`: PROJECTS has 8 letters and there are 8 projects, so each letter is a spine with its project's name. The shelf drops away and the first spine opens into ZINGBOT's plate, so Work now starts with that plate at rest.
  - MY PROCESS, `scenes/titles.ts`: sonar pings from the O reveal the letters, then the camera flies through the counter. The title sheet has a real hole and sits above Process, so the radar is already running inside the O.
- Bug found by comparing against the old build: scene timelines play as soon as they exist, and the loader now yields between scenes. So they played during load and locked in wrong start values, a 4% camera pop at f30. Each scene now joins the paused film before the next yield. Do not fix this with `gsap.globalTimeline.pause()`: it stops `gsap.set` rendering immediately.
- `about.ts` no longer re-sets `svgOrigin` on the dot. GSAP treats it as global when transforms are already applied.
- Film map: Hero 0, About 58, Journey 310, Projects title 962, Work 1082, Process title 1568, Process 1652, Skills 1892, Contact 2140, end 2236.
- Verified in headless Chrome on this Mac: loader end to intro f0 SSIM 0.9993 to 0.9998 at three aspect ratios, intro end to film f0 0.9988 to 0.9999, hero film frames match the old build. Landscape and portrait cuts all 0.98 or better. Forward, backward and jumped scrubs match. 60 fps with p99 17.7 ms through the intro, desk and all three titles. Hero CTA, case dialog, deep links, skip by wheel, reduced motion and a production build pass with no console errors. JS is 111 KB gzip.
- Trade-offs: the film is now about 29,000 px, and `PX_PER_FRAME = 10` would bring it to about 22,400 px. The hero CTA still lands on the first project, past the MY PROJECTS title. Over the road title the bottom chrome is paper on paper, because the chrome has one colour for both bars. The lens is pointer only, so touch visitors do not see it.
- Still untested: real phones, Safari and Firefox, CPU throttling, and pacing felt by a person.

Seventh pass, 31 Oct, from the user's notes:

- Preloader redesigned because the big count lagged and took over the screen. A small O at the title's own size, centred, fills with lime liquid while the pupil looks along the slot. One line under it names the real step. It then becomes the first frame of the intro, and the camera pushes in on it.
- Lag fixed at the cause. The old count was driven by JavaScript, which stalled while scenes built. Now the script only sets targets, and everything moving is a CSS transform on its own layer, so it runs on the compositor. Verified by freezing the main thread for 4 s during loading: frames kept changing.
- Timeline: every stop keeps moving while the scroll is parked. Each loop runs on its own wrapper group, so it adds to the scrubbed motion instead of fighting it. `journey.live()` runs only the stop on screen. Reduced motion runs none. The road also keeps rolling, through `cruise`, which adds to the scrubbed distance.
  - Born: two lighthouse beams turn, sea swells, birds flap, sun halo breathes.
  - School: clock runs, flag flutters, windows flick.
  - Engineering: code rain wraps, gears turn at their true ratio, signals run down the traces, a terminal line types.
  - First place: rays spin clockwise, glints twinkle, confetti keeps falling.
  - Internship: clouds drift, office lights switch, the atom spins.
  - Resonance: stopwatch hand sweeps, readout blinks, a deploy bar fills, the medal swings.
  - Xynthraa: spotlights sweep, bunting flutters, the crowd keeps a wave going, the X turns on its axis.
  - Full-stack intern: nodes pulse, messages run down the wires, typing dots hop.
  - Graduated: rays sway, caps hang and turn, confetti falls.
- Skills rebuilt as a keyboard, replacing the patterned plates, which were abstract and said nothing. Every tool is a keycap with its name on it. The board is one affine plane, so keys and labels share a tilt. The shipped cube lands as Enter and the shock runs through the keys. MY SKILLS opens the section. Each row lights and types, with what it types shown beside the copy. At rest the row in play keeps typing, and any key presses under the pointer. The spacebar reads LET’S TALK, and pressing it floods lime into Contact. On phones the first skill takes two rows so labels stay readable.
- Film map: Hero 0, About 58, Journey 310, Projects title 962, Work 1082, Process title 1568, Process 1652, Skills 1892, Contact 2232, end 2328.
- Verified in headless Chrome on this Mac: loader to intro SSIM 0.999 or better at three aspect ratios. Every cut 0.98 or better in landscape and portrait. All nine stops change while parked. 60 fps with p99 18.7 ms, parked and scrubbing. Hero CTA, case dialog, deep links, skip by wheel, reduced motion, reload flow and a production build pass with no console errors. JS is 113 KB gzip.
- Scrub frames in the road title differ slightly by direction now (SSIM 0.97), because the lanes keep their rolled phase. Nothing jumps during play.
- Still untested: real phones, Safari and Firefox, CPU throttling, and pacing felt by a person. The compositor claim for `clip-path` on the loader needs checking in Safari.

Eighth pass, 31 Oct:

- Favicon drawn from the O of CODE by `tools/favicon.mjs`, with a heavier slot and pupil so it holds at 16 pixels. PNGs for Safari and iOS come from `tools/favicon-png.sh`.
- `motion/presence.ts`: on another tab the title reads "Come back! 👀" and the eye in the favicon closes. Tested by simulating `document.hidden`, because headless Chrome does not hide background tabs.
- The intro waits for a hidden tab to be seen, and pauses if the visitor leaves during it.
- Repository: https://github.com/Botz-Nithish/Portfolio-v2. `refference/` and `.claude/` are ignored.

Ninth pass, 31 Oct, from resume V6:

- The resume is now the source of truth for facts. `public/cv.pdf` is V6, which replaces a copy showing CGPA 6.98 with 7.01.
- Skills rebuilt from its competencies: Languages, Front-End, Back-End & APIs, Data & Cloud, Tools & Process, 35 keys. GSAP stays although the resume does not list it, because this site is built with it. Prisma and Supabase come from its project lines. Gemini and LLMs are gone from the keys: Gemini still appears under V-Meet.
- Corrected against the resume: ZingBot capacity no longer claims it was scaled to 50+ clients, Zingbizz roles read Intern, NeuroRythm states its IEEE publication, SCHOLAR names the Journalist Profile Viewer, Kallos states two rounds, Finsol states the team of four, the Zingbizz timeline stop lists what was built, and CI/CD was dropped from Process.
- Kept although the resume omits them: 2nd place at RESONANCE’25, running Xynthraa 26, and the birth date, all from v1.
- The IEEE publication and the Claude Code certificate are not timeline stops. They sit in Work and Skills.
- The PROJECTS spines still map to 8 projects. Film map: Skills 1892, Contact 2290, end 2386. Everything before Skills is unchanged.
