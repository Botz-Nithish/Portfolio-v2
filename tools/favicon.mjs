// Draws the favicons from the O of CODE, so they stay the same shape as the title.
// PNG versions come from tools/favicon-png.sh.
import * as fontkit from "fontkit";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const font = fontkit.openSync(resolve(root, "tools/fonts/Archivo.ttf"));
const glyph = font.getVariation({ wght: 900, wdth: 125 }).layout("O").glyphs[0];
const { minX, minY, maxX, maxY } = glyph.path.bbox;

const SIZE = 64;
const scale = 56 / (maxX - minX);
const round = (n) => Math.round(n * 100) / 100;
const x = (v) => round(SIZE / 2 + (v - (minX + maxX) / 2) * scale);
const y = (v) => round(SIZE / 2 - (v - (minY + maxY) / 2) * scale);

// Outer contour only, as in the title. Fonts list it first.
const end = glyph.path.commands.findIndex((c) => c.command === "closePath");
const d = glyph.path.commands
  .slice(0, end + 1)
  .map(({ command, args: a }) => {
    if (command === "moveTo") return `M${x(a[0])} ${y(a[1])}`;
    if (command === "lineTo") return `L${x(a[0])} ${y(a[1])}`;
    if (command === "quadraticCurveTo") return `Q${x(a[0])} ${y(a[1])} ${x(a[2])} ${y(a[3])}`;
    return "Z";
  })
  .join("");

const tile = `<rect width="${SIZE}" height="${SIZE}" rx="14" fill="#0B0B0C"/>`;
const body = `<path d="${d}" fill="#C8FF00"/>`;
const svg = (content) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">${tile}${body}${content}</svg>\n`;

// The slot and pupil are heavier than in the title, so they survive at 16 pixels.
const open = `<g transform="translate(32 32) rotate(-32)"><rect x="-19" y="-8.5" width="38" height="17" rx="8.5" fill="#0B0B0C"/><circle r="6" fill="#00E5FF"/></g>`;
// Away from the tab, the eye closes.
const shut = `<rect x="-19" y="-2.2" width="38" height="4.4" rx="2.2" fill="#0B0B0C" transform="translate(32 32) rotate(-32)"/>`;

writeFileSync(resolve(root, "public/favicon.svg"), svg(open));
writeFileSync(resolve(root, "public/favicon-away.svg"), svg(shut));
