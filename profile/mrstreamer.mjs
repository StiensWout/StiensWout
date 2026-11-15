// The Mr. Streamer section of the profile README:
//   mrstreamerStats(token)            downloads per stable release and platform, stars
//   mrstreamerTitleSvg(theme)         the hat and "MR. STREAMER", switched on like an old TV
//   mrstreamerGuideSvg(theme)         what it does, as a programme guide that loads in
//   mrstreamerChartsSvg(s, theme)     headline numbers and downloads per release
import { readFileSync } from "node:fs";

const REPO = "Mr-Streamer-OSS/MrStreamer";
const SANS = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`;
const THEMES = {
  dark: { bg: "#0d1117", panel: "#010409", cell: "#161b22", edge: "#30363d", fg: "#e6edf3", muted: "#8b949e", grid: "#21262d", live: "#f85149", glow: "#ffffff" },
  light: { bg: "#ffffff", panel: "#f6f8fa", cell: "#ffffff", edge: "#d0d7de", fg: "#1f2328", muted: "#656d76", grid: "#eaeef2", live: "#cf222e", glow: "#1f2328" },
};
const PLATFORMS = [
  ["macOS", /\.dmg$|-mac-.*\.zip$/, { dark: "#4493f8", light: "#0969da" }],
  ["Windows", /\.exe$/, { dark: "#db6d28", light: "#bc4c00" }],
  ["Linux", /\.AppImage$|\.deb$/, { dark: "#a371f7", light: "#8250df" }],
];
const fmt = (n) => n.toLocaleString("en-US");
const TITLE = JSON.parse(readFileSync(new URL("./mrstreamer-title.json", import.meta.url), "utf8"));
// The project's mark: a top hat with a play button and a band cut out of the crown.
const HAT = {
  crown: "M31.5 73C31 55 29.5 35 28.2 16.5Q27.9 11 33.5 11L66.5 11Q72.1 11 71.8 16.5C70.5 35 69 55 68.5 73Z",
  brim: "M10 70C13 65 19 69.5 28 70.3Q50 72.3 72 70.3C81 69.5 87 65 90 70C88.5 79.5 78 81.36 70 82Q50 83.6 30 82C22 81.36 11.5 79.5 10 70Z",
  play: "43.5,25 43.5,47 62,36",
  band: "M20 57.5Q50 59.5 80 57.5L80 64.5Q50 66.5 20 64.5Z",
};

export async function mrstreamerStats(token) {
  const headers = { authorization: `bearer ${token}`, "user-agent": "profile-mrstreamer", accept: "application/vnd.github+json" };
  const repo = await fetch(`https://api.github.com/repos/${REPO}`, { headers }).then((r) => r.json());
  const releases = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100&page=${page}`, { headers }).then((r) => r.json());
    if (!Array.isArray(batch)) throw new Error(`releases: ${JSON.stringify(batch)}`);
    releases.push(...batch);
    if (batch.length < 100) break;
  }
  // Installers only: update manifests, blockmaps and source archives are left out.
  const byPlatform = (assets) =>
    Object.fromEntries(PLATFORMS.map(([name, re]) => [name, assets.filter((a) => re.test(a.name)).reduce((n, a) => n + a.download_count, 0)]));
  const stable = releases
    .filter((r) => !r.prerelease && !r.draft)
    .map((r) => ({ tag: r.tag_name, date: r.published_at, downloads: byPlatform(r.assets) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const all = byPlatform(releases.flatMap((r) => r.assets));
  return {
    stars: repo.stargazers_count,
    latest: stable.at(-1)?.tag ?? "",
    stableCount: stable.length,
    nightlyCount: releases.length - stable.length,
    downloads: Object.values(all).reduce((a, b) => a + b, 0),
    stable: stable.slice(-14),
  };
}

// Off, then a bright line across the middle, then the picture opens up from it.
export function mrstreamerTitleSvg(theme) {
  const t = THEMES[theme];
  const hatSize = 64;
  const gap = 18;
  const pad = 12;
  const w = Math.ceil(pad * 2 + hatSize + gap + TITLE.width);
  const h = Math.ceil(pad * 2 + hatSize);
  const cx = w / 2;
  const cy = h / 2;
  const textY = cy - TITLE.capHeight / 2;
  const scan = Array.from({ length: Math.ceil(h / 3) }, (_, i) => `<rect x="0" y="${i * 3}" width="${w}" height="1" fill="${t.bg}" opacity="0.22"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Mr. Streamer">` +
    `<defs><mask id="hat" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><rect width="100" height="100" fill="#fff"/>` +
    `<polygon points="${HAT.play}" fill="#000" stroke="#000" stroke-width="4.5" stroke-linejoin="round"/><path d="${HAT.band}" fill="#000"/></mask></defs>` +
    `<g transform="translate(${cx} ${cy})"><g>` +
    `<animateTransform attributeName="transform" type="scale" values="0 0.015;0 0.015;1 0.015;1 0.015;1 1" keyTimes="0;0.2;0.5;0.6;1" dur="1.3s" fill="freeze" calcMode="spline" keySplines="0 0 1 1;0.6 0 0.2 1;0 0 1 1;0.2 0.8 0.2 1"/>` +
    `<g transform="translate(${-cx} ${-cy})">` +
    `<g transform="translate(${pad} ${pad}) scale(${hatSize / 100})"><g transform="translate(0 3)" fill="${t.fg}"><path mask="url(#hat)" d="${HAT.crown}"/><path d="${HAT.brim}"/></g></g>` +
    `<g transform="translate(${pad + hatSize + gap} ${textY})"><path d="${TITLE.d}" fill="${t.fg}"/></g>` +
    // Scanlines, faint, for the old-set look.
    scan +
    // The flash while it switches on.
    `<rect x="0" y="0" width="${w}" height="${h}" fill="${t.glow}" opacity="0"><animate attributeName="opacity" values="0;0.9;0.9;0.25;0" keyTimes="0;0.2;0.55;0.75;1" dur="1.3s" fill="freeze"/></rect>` +
    `</g></g></g></svg>\n`;
}

// What it does, laid out like a programme guide: rows load in, and the "now"
// line slides into place. 640 wide with large type, for phones.
const GUIDE = [
  ["Live TV", [["M3U", 1], ["Xtream Codes", 1.5], ["Programme guide", 1.5]]],
  ["Movies", [["Xtream library", 2], ["Mapped playlists", 2]]],
  ["Series", [["Seasons", 1.2], ["Resume", 1.1], ["Continue watching", 1.7]]],
  ["Cast", [["AirPlay", 1.5], ["Chromecast", 2.5]]],
];

export function mrstreamerGuideSvg(theme) {
  const t = THEMES[theme];
  const W = 640;
  const head = 44;
  const rowH = 50;
  const label = 96;
  const H = head + GUIDE.length * rowH + 10;
  const slot = (W - label - 10) / 4;
  const out = [];
  out.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.panel}" stroke="${t.edge}"/>`);
  ["20:00", "20:30", "21:00", "21:30"].forEach((time, i) =>
    out.push(`<text x="${label + i * slot + 10}" y="28" font-size="15" fill="${t.muted}">${time}</text>`));
  out.push(`<circle cx="22" cy="23" r="5.5" fill="${t.live}"/><text x="34" y="28" font-size="15" font-weight="800" fill="${t.live}" letter-spacing="1">LIVE</text>`);
  GUIDE.forEach(([channel, shows], r) => {
    const y = head + r * rowH;
    out.push(`<text x="16" y="${y + 30}" font-size="17" font-weight="800" fill="${t.fg}" style="opacity:0;animation:fade .4s ease ${(0.1 + r * 0.08).toFixed(2)}s forwards">${channel}</text>`);
    let x = label;
    shows.forEach(([name, span], k) => {
      const w = span * slot - 5;
      out.push(`<g style="opacity:0;animation:slide .55s cubic-bezier(.2,.7,.2,1) ${(0.25 + r * 0.12 + k * 0.08).toFixed(2)}s forwards">` +
        `<rect x="${x}" y="${y + 5}" width="${w}" height="${rowH - 10}" rx="9" fill="${t.cell}" stroke="${t.edge}"/>` +
        `<text x="${x + 12}" y="${y + 30}" font-size="16" fill="${k === 0 ? t.fg : t.muted}">${name}</text></g>`);
      x += span * slot;
    });
  });
  const nowX = label + slot * 1.3;
  out.push(`<g style="transform:translateX(${label - nowX}px);animation:now 1.4s cubic-bezier(.3,.6,.2,1) .4s forwards">` +
    `<line x1="${nowX}" x2="${nowX}" y1="38" y2="${H - 8}" stroke="${t.live}" stroke-width="2.5"/><circle cx="${nowX}" cy="38" r="5" fill="${t.live}"/></g>`);
  const css = `@keyframes fade{from{opacity:0}to{opacity:1}}@keyframes slide{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}@keyframes now{to{transform:none}}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family='${SANS}' role="img" aria-label="Mr. Streamer: live TV from M3U playlists or Xtream Codes with a programme guide, movies and series, AirPlay and Chromecast"><style>${css}</style>${out.join("")}</svg>\n`;
}

const bar = (w, h, fill, r = 3) => {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `<path d="M0 0 V${-(h - rr)} Q0 ${-h} ${rr} ${-h} H${w - rr} Q${w} ${-h} ${w} ${-(h - rr)} V0 Z" fill="${fill}"/>`;
};

export function mrstreamerChartsSvg(s, theme) {
  const t = THEMES[theme];
  const W = 640;
  const out = [];
  const text = (x, y, str, { size = 14, fill = t.muted, weight = 400, anchor = "start", style = "" } = {}) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}"${style ? ` style="${style}"` : ""}>${str}</text>`;
  const heads = [[fmt(s.downloads), "installer downloads"], [s.latest, "latest release"], [fmt(s.stableCount), `releases, plus ${fmt(s.nightlyCount)} nightlies`], ["GPL-3.0", "free and open source"]];
  heads.forEach(([value, label], i) => {
    const x = (i % 2) * 330;
    const y = 42 + Math.floor(i / 2) * 84;
    out.push(`<g style="opacity:0;animation:rise .6s cubic-bezier(.2,.7,.2,1) ${(i * 0.12).toFixed(2)}s forwards">` +
      text(x, y, value, { size: 42, fill: t.fg, weight: 800 }) + text(x, y + 26, label, { size: 17 }) + `</g>`);
  });

  const top = 232;
  const plotTop = top + 64;
  const base = plotTop + 170;
  const plotH = 150;
  const x0 = 64;
  const totals = s.stable.map((r) => Object.values(r.downloads).reduce((a, b) => a + b, 0));
  const max = Math.max(...totals, 1);
  const unit = 10 ** Math.floor(Math.log10(max)) / 2;
  const yTop = Math.ceil(max / unit) * unit;
  out.push(text(0, top, "Downloads per release", { size: 21, fill: t.fg, weight: 700 }));
  let lx = 0;
  PLATFORMS.forEach(([name, , colors]) => {
    out.push(`<rect x="${lx}" y="${top + 15}" width="13" height="13" rx="3" fill="${colors[theme]}"/>` + text(lx + 19, top + 27, name, { size: 16 }));
    lx += name.length * 9 + 44;
  });
  [0, yTop / 2, yTop].forEach((v) => {
    const y = base - (v / yTop) * plotH;
    out.push(`<line x1="${x0}" x2="${W}" y1="${y}" y2="${y}" stroke="${t.grid}"/>` + text(x0 - 8, y + 5, fmt(v), { size: 14, anchor: "end" }));
  });
  const step = (W - x0) / s.stable.length;
  const bw = Math.min(34, step - 10);
  s.stable.forEach((r, i) => {
    const x = x0 + i * step + (step - bw) / 2;
    let y = 0;
    const segs = PLATFORMS.map(([name, , colors]) => {
      const h = (r.downloads[name] / yTop) * plotH;
      const seg = h > 0 ? { y, h, fill: colors[theme] } : null;
      y += h;
      return seg;
    }).filter(Boolean);
    // Platforms stack bottom to top, 2px apart; the top one gets the rounded end.
    const body = segs.map((sg, k) => k === segs.length - 1
      ? `<g transform="translate(0 ${-sg.y})">${bar(bw, Math.max(sg.h, 1), sg.fill)}</g>`
      : `<rect x="0" y="${-(sg.y + sg.h)}" width="${bw}" height="${Math.max(sg.h - 2, 1)}" fill="${sg.fill}"/>`).join("");
    out.push(`<g transform="translate(${x.toFixed(1)} ${base})"><g style="transform:scaleY(0);animation:grow .8s cubic-bezier(.2,.7,.2,1) ${(0.4 + i * 0.06).toFixed(2)}s forwards">${body}</g></g>`);
    if (i % 2 === (s.stable.length - 1) % 2) out.push(text(x + bw / 2, base + 24, r.tag.replace(/^v/, ""), { size: 13, anchor: "middle" }));
  });
  const last = s.stable.length - 1;
  if (last >= 0) {
    const lxr = x0 + last * step + (step + bw) / 2;
    out.push(text(lxr, base - (totals[last] / yTop) * plotH - 10, fmt(totals[last]), { size: 16, fill: t.fg, weight: 700, anchor: "end", style: "opacity:0;animation:fade .5s ease 1.6s forwards" }));
  }
  const H = base + 36;
  const css = "@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}@keyframes fade{from{opacity:0}to{opacity:1}}";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family='${SANS}' role="img" aria-label="Mr. Streamer: ${fmt(s.downloads)} installer downloads, latest ${s.latest}; downloads per release by platform"><style>${css}</style>${out.join("")}</svg>\n`;
}
