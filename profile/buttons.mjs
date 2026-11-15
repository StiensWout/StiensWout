// Link buttons for the README: one small SVG per link, so each is its own
// clickable image. They rise in once, in order, when the page loads.
//
//   buttonSvg("Download", theme, { index: 0, accent: "#3fb950" })
const SANS = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`;
const THEMES = {
  dark: { face: "#161b22", edge: "#30363d", shade: "#010409", fg: "#e6edf3", muted: "#8b949e" },
  light: { face: "#f6f8fa", edge: "#d0d7de", shade: "#d0d7de", fg: "#1f2328", muted: "#656d76" },
};

export function buttonSvg(label, theme, { index = 0, accent } = {}) {
  const t = THEMES[theme];
  const w = Math.round(44 + label.length * 7.6);
  const h = 40;
  const delay = (0.2 + index * 0.09).toFixed(2);
  // A key: its face sits on a darker edge, with a small accent mark and an arrow.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family='${SANS}' role="img" aria-label="${label}">` +
    `<style>@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}</style>` +
    `<g style="opacity:0;animation:rise .5s cubic-bezier(.2,.7,.2,1) ${delay}s forwards">` +
    `<rect x="0.5" y="3.5" width="${w - 1}" height="${h - 4}" rx="9" fill="${t.shade}"/>` +
    `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 5}" rx="9" fill="${t.face}" stroke="${t.edge}"/>` +
    (accent ? `<circle cx="15" cy="18" r="3.5" fill="${accent}"/>` : "") +
    `<text x="${accent ? 26 : 14}" y="22.5" font-size="13" font-weight="600" fill="${t.fg}">${label}</text>` +
    `<text x="${w - 14}" y="22.5" font-size="12" fill="${t.muted}" text-anchor="end">↗</text>` +
    `</g></svg>\n`;
}
