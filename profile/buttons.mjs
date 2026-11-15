// Link buttons for the README: one small SVG per link, so each is its own
// clickable image. They rise in once, in order, when the page loads.
//
// The labels are drawn from Inter SemiBold outlines in button-labels.json, not
// typed: fonts differ per device, and iOS ignored textLength, so typed labels
// ran into the arrow. A label missing from that file needs a new extraction.
//
//   buttonSvg("Download", theme, { index: 0 })
import { readFileSync } from "node:fs";

const LABELS = JSON.parse(readFileSync(new URL("./button-labels.json", import.meta.url), "utf8")).labels;
const THEMES = {
  dark: { face: "#161b22", edge: "#30363d", shade: "#010409", fg: "#e6edf3", muted: "#8b949e" },
  light: { face: "#f6f8fa", edge: "#d0d7de", shade: "#d0d7de", fg: "#1f2328", muted: "#656d76" },
};

export function buttonSvg(label, theme, { index = 0 } = {}) {
  const t = THEMES[theme];
  const glyphs = LABELS[label];
  if (!glyphs) throw new Error(`no outlines for button label "${label}" in button-labels.json`);
  const pad = 16;
  const arrowGap = 12;
  const arrow = 8;
  const w = Math.ceil(pad + glyphs.width + arrowGap + arrow + pad);
  const h = 40;
  const ax = pad + glyphs.width + arrowGap;
  const delay = (0.2 + index * 0.09).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">` +
    `<style>@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}</style>` +
    `<g style="opacity:0;animation:rise .5s cubic-bezier(.2,.7,.2,1) ${delay}s forwards">` +
    `<rect x="0.5" y="3.5" width="${w - 1}" height="${h - 4}" rx="9" fill="${t.shade}"/>` +
    `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 5}" rx="9" fill="${t.face}" stroke="${t.edge}"/>` +
    `<path transform="translate(${pad} 23)" d="${glyphs.d}" fill="${t.fg}"/>` +
    `<path d="M${ax} 22 L${ax + arrow} 14 M${ax + 2} 14 H${ax + arrow} V20" fill="none" stroke="${t.muted}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</g></svg>\n`;
}
