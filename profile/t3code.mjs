// The T3 Code section of the profile README:
//   t3codeStats(token, login)   live numbers for pingdotgg/t3code from GitHub
//   t3codeTitleSvg(theme)       "T3 CODE" outlined, filled by a gradient sweep once
//   t3codeChartsSvg(s, theme)   headline numbers, commits per week and merged PRs
//                               per month (mine stacked on top), animated in once
import { readFileSync } from "node:fs";

const REPO = "pingdotgg/t3code";
const SANS = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`;
const THEMES = {
  dark: { bg: "#0d1117", fg: "#e6edf3", muted: "#8b949e", grid: "#21262d", all: "#2ea043", mine: "#a371f7", lane: ["#3fb950", "#39c5cf", "#58a6ff", "#a371f7"] },
  light: { bg: "#ffffff", fg: "#1f2328", muted: "#656d76", grid: "#eaeef2", all: "#2da44e", mine: "#8250df", lane: ["#1a7f37", "#1b7c83", "#0969da", "#8250df"] },
};
const fmt = (n) => n.toLocaleString("en-US");
const MONTH = (i) => new Date(Date.UTC(2000, i, 1)).toLocaleString("en-US", { month: "short", timeZone: "UTC" });

export async function t3codeStats(token, login) {
  const headers = { authorization: `bearer ${token}`, "user-agent": "profile-t3code", accept: "application/vnd.github+json" };
  const rest = (path) => fetch(`https://api.github.com/${path}`, { headers });
  const graphql = async (query) => {
    const res = await fetch("https://api.github.com/graphql", { method: "POST", headers, body: JSON.stringify({ query }) });
    const json = await res.json();
    if (!res.ok || json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors ?? json)}`);
    return json.data;
  };

  const repo = await rest(`repos/${REPO}`).then((r) => r.json());
  // The API's contributor list stops linking users after 500 author emails, so
  // take the count GitHub's own repo page shows (its sidebar data), and fall back
  // to the API's list with anonymous contributors.
  let contributors = await fetch(`https://github.com/${REPO}/_sidebar`, {
    headers: { accept: "application/json", "x-requested-with": "XMLHttpRequest", "user-agent": "profile-t3code" },
  }).then((r) => (r.ok ? r.json() : null)).then((j) => j?.contributors?.contributorCount).catch(() => undefined);
  if (!contributors) {
    const res = await rest(`repos/${REPO}/contributors?per_page=1&anon=1`);
    contributors = Number(res.headers.get("link")?.match(/[?&]page=(\d+)>; rel="last"/)?.[1] ?? 1);
  }

  // GitHub computes commit activity on demand and answers 202 until it is ready.
  let weekly;
  for (let tries = 0; tries < 8 && !Array.isArray(weekly); tries++) {
    if (tries) await new Promise((r) => setTimeout(r, 5000));
    const res = await rest(`repos/${REPO}/stats/commit_activity`);
    if (res.status === 200) weekly = await res.json();
  }
  if (!Array.isArray(weekly)) throw new Error("commit activity is still being computed");

  // Merged PRs per month since the repo was created, everyone's and mine, in one query.
  const months = [];
  const created = new Date(repo.created_at);
  const now = new Date();
  for (let d = new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), 1)); d <= now; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    months.push({ month: d.getUTCMonth(), range: `${d.toISOString().slice(0, 10)}..${end.toISOString().slice(0, 10)}` });
  }
  const search = (q) => `search(query: "${q}", type: ISSUE) { issueCount }`;
  const counts = await graphql(`{
    total: ${search(`repo:${REPO} is:pr is:merged`)}
    repository(owner: "pingdotgg", name: "t3code") { releases { totalCount } }
    ${months.map((m, i) => `a${i}: ${search(`repo:${REPO} is:pr is:merged merged:${m.range}`)} b${i}: ${search(`repo:${REPO} is:pr is:merged author:${login} merged:${m.range}`)}`).join("\n")}
  }`);

  return {
    stars: repo.stargazers_count,
    contributors,
    releases: counts.repository.releases.totalCount,
    merged: counts.total.issueCount,
    weekly: weekly.map((w) => ({ week: w.week, total: w.total })),
    monthly: months.map((m, i) => ({ month: m.month, all: counts[`a${i}`].issueCount, mine: counts[`b${i}`].issueCount })),
  };
}

// "T3 CODE" as outlined letters that fill with a green-to-violet sweep once,
// left to right, as the page loads. The letter outlines come from
// t3code-title.json (Unbounded ExtraBold, SIL OFL), so every viewer sees the
// same shapes. The sweep uses SMIL, which images in GitHub READMEs play.
const TITLE = JSON.parse(readFileSync(new URL("./t3code-title.json", import.meta.url), "utf8"));

export function t3codeTitleSvg(theme) {
  const t = THEMES[theme];
  const pad = 14;
  const w = Math.ceil(TITLE.width + pad * 2);
  const h = Math.ceil(TITLE.capHeight + pad * 2);
  const ease = `calcMode="spline" keyTimes="0;1" keySplines="0.65 0 0.25 1"`;
  const sweep = `dur="1.6s" begin="0.3s" fill="freeze" ${ease}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="T3 Code">` +
    `<defs><linearGradient id="lane" gradientUnits="userSpaceOnUse" x1="${pad}" y1="0" x2="${w - pad}" y2="0">` +
    `${t.lane.map((c, i) => `<stop offset="${i / (t.lane.length - 1)}" stop-color="${c}"/>`).join("")}</linearGradient>` +
    `<clipPath id="sweep"><rect x="0" y="0" width="0" height="${h}"><animate attributeName="width" from="0" to="${w}" ${sweep}/></rect></clipPath></defs>` +
    `<g transform="translate(${pad} ${pad})"><path d="${TITLE.d}" fill="none" stroke="url(#lane)" stroke-width="1.6" stroke-linejoin="round"/></g>` +
    `<g clip-path="url(#sweep)"><g transform="translate(${pad} ${pad})"><path d="${TITLE.d}" fill="url(#lane)"/></g></g>` +
    // The sweep's bright leading edge, gone once the letters are full.
    `<rect x="0" y="${pad - 6}" width="2" height="${TITLE.capHeight + 12}" rx="1" fill="${t.fg}" opacity="0">` +
    `<animate attributeName="x" from="0" to="${w - 2}" ${sweep}/>` +
    `<animate attributeName="opacity" values="0;0.85;0.85;0" keyTimes="0;0.08;0.85;1" dur="1.6s" begin="0.3s" fill="freeze"/></rect>` +
    `</svg>\n`;
}

// Round a maximum up to a tidy axis top: the next multiple of half its power of ten.
const niceTop = (max) => {
  const unit = 10 ** Math.floor(Math.log10(max)) / 2;
  return Math.ceil(max / unit) * unit;
};

// A bar drawn upward from (0, 0), its top corners rounded by r.
const bar = (w, h, fill, r = 2) => {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `<path d="M0 0 V${-(h - rr)} Q0 ${-h} ${rr} ${-h} H${w - rr} Q${w} ${-h} ${w} ${-(h - rr)} V0 Z" fill="${fill}"/>`;
};

export function t3codeChartsSvg(s, theme) {
  const t = THEMES[theme];
  // 640 wide with large type, so it stays readable when a phone scales it down.
  const W = 640;
  const css = [
    "@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
    "@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}",
    "@keyframes fade{from{opacity:0}to{opacity:1}}",
  ];
  const text = (x, y, str, { size = 14, fill = t.muted, weight = 400, anchor = "start", style = "" } = {}) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}"${style ? ` style="${style}"` : ""}>${str}</text>`;
  const fadeIn = (delay) => `opacity:0;animation:fade 0.5s ease ${delay.toFixed(2)}s forwards`;
  const out = [];

  // Headline numbers, two by two.
  const heads = [[s.stars, "stars"], [s.contributors, "contributors"], [s.merged, "merged pull requests"], [s.releases, "releases"]];
  heads.forEach(([value, label], i) => {
    const x = (i % 2) * 330;
    const y = 42 + Math.floor(i / 2) * 84;
    out.push(`<g style="opacity:0;animation:rise 0.6s cubic-bezier(.2,.7,.2,1) ${(i * 0.12).toFixed(2)}s forwards">` +
      text(x, y, fmt(value), { size: 42, fill: t.fg, weight: 800 }) + text(x, y + 26, label, { size: 17 }) + `</g>`);
  });

  // A bar chart: title, optional legend line, gridlines, bars from draw(i, x, w, scale).
  const chart = ({ title, legend, top, n, max, draw, labels }) => {
    const x0 = 64;
    const plotTop = top + (legend ? 64 : 40);
    const base = plotTop + 170;
    const plotH = 150;
    const yTop = niceTop(max);
    out.push(text(0, top, title, { size: 21, fill: t.fg, weight: 700 }));
    if (legend) {
      let lx = 0;
      legend.forEach(([name, color]) => {
        out.push(`<rect x="${lx}" y="${top + 15}" width="13" height="13" rx="3" fill="${color}"/>` + text(lx + 19, top + 27, name, { size: 16 }));
        lx += name.length * 9 + 44;
      });
    }
    [0, yTop / 2, yTop].forEach((v) => {
      const y = base - (v / yTop) * plotH;
      out.push(`<line x1="${x0}" x2="${W}" y1="${y}" y2="${y}" stroke="${t.grid}"/>` + text(x0 - 8, y + 5, fmt(v), { size: 14, anchor: "end" }));
    });
    const step = (W - x0) / n;
    for (let i = 0; i < n; i++) draw(i, x0 + i * step, step, (v) => (v / yTop) * plotH, base);
    labels(x0, step, base);
    return base;
  };

  // Commits per week, last 52 weeks.
  let peak = 0;
  s.weekly.forEach((w, i) => { if (w.total > s.weekly[peak].total) peak = i; });
  const end1 = chart({
    title: "Commits per week, last 52 weeks",
    top: 232,
    n: s.weekly.length,
    max: Math.max(...s.weekly.map((w) => w.total)),
    draw: (i, x, step, y, base) => {
      out.push(`<g transform="translate(${(x + 1).toFixed(1)} ${base})"><g style="transform:scaleY(0);animation:grow 0.7s cubic-bezier(.2,.7,.2,1) ${(0.4 + i * 0.018).toFixed(3)}s forwards">${bar(Math.max(step - 2.5, 1.5), y(s.weekly[i].total), t.all)}</g></g>`);
      if (i === peak) out.push(text(x + step / 2, base - y(s.weekly[i].total) - 9, `${fmt(s.weekly[i].total)} at the peak`, { size: 16, fill: t.fg, weight: 700, anchor: "end", style: fadeIn(1.6) }));
    },
    labels: (x0, step, base) => [0, Math.floor(s.weekly.length / 2), s.weekly.length - 1].forEach((i, k) => {
      const d = new Date(s.weekly[i].week * 1000);
      out.push(text(x0 + i * step + step / 2, base + 24, `${MONTH(d.getUTCMonth())} ${d.getUTCFullYear()}`, { size: 15, anchor: ["start", "middle", "end"][k] }));
    }),
  });

  // Merged PRs per month: everyone else's, with mine stacked on top.
  const best = s.monthly.reduce((b, m, i) => (m.all > s.monthly[b].all ? i : b), 0);
  const end2 = chart({
    title: "Merged pull requests per month",
    legend: [["everyone", t.all], ["mine", t.mine]],
    top: end1 + 74,
    n: s.monthly.length,
    max: Math.max(...s.monthly.map((m) => m.all)),
    draw: (i, x, step, y, base) => {
      const m = s.monthly[i];
      const bw = Math.min(40, step - 12);
      const bx = x + (step - bw) / 2;
      const hRest = y(m.all - m.mine);
      const hMine = m.mine > 0 ? Math.max(y(m.mine), 3) : 0;
      // A 2px surface gap separates my segment from everyone else's.
      const mine = hMine ? `<g transform="translate(0 ${-(hRest + 2)})">${bar(bw, hMine, t.mine, 3)}</g>` : "";
      out.push(`<g transform="translate(${bx.toFixed(1)} ${base})"><g style="transform:scaleY(0);animation:grow 0.8s cubic-bezier(.2,.7,.2,1) ${(0.5 + i * 0.07).toFixed(2)}s forwards">${bar(bw, hRest, t.all, hMine ? 0 : 3)}${mine}</g></g>`);
      out.push(text(x + step / 2, base + 24, MONTH(m.month), { size: 15, anchor: "middle" }));
      if (i === best) {
        const anchor = i === s.monthly.length - 1 ? "end" : "middle";
        const lx = anchor === "end" ? bx + bw : x + step / 2;
        const ly = base - y(m.all) - 6;
        out.push(text(lx, ly - 20, fmt(m.all), { size: 16, fill: t.fg, weight: 700, anchor, style: fadeIn(1.7) }));
        out.push(text(lx, ly - 2, `${fmt(m.mine)} mine`, { size: 15, anchor, style: fadeIn(1.8) }));
      }
    },
    labels: () => {},
  });

  const H = end2 + 36;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family='${SANS}' role="img" aria-label="T3 Code: ${fmt(s.stars)} stars, ${fmt(s.contributors)} contributors, ${fmt(s.merged)} merged pull requests, ${fmt(s.releases)} releases; commits per week and merged pull requests per month"><style>${css.join("")}</style>${out.join("")}</svg>\n`;
}

// What T3 Code is, as a picture: the agents on the left flow into T3 Code,
// which serves every client on the right. Lines draw in, a few pulses travel
// through, then it settles.
const AGENTS = ["Claude Code", "Codex", "Cursor", "OpenCode", "Grok Build", "Antigravity", "Kiro", "Pi", "Muse Code", "any ACP agent"];
const CLIENTS = ["Desktop", "Web", "iPhone", "Android"];

export function t3codeHubSvg(theme) {
  const t = THEMES[theme];
  const W = 640;
  const hub = { x: 262, y: 62, w: 124, h: 160 };
  const cy = hub.y + hub.h / 2;
  const out = [];
  out.push(`<defs><linearGradient id="lane" gradientUnits="userSpaceOnUse" x1="120" y1="0" x2="520" y2="0">` +
    `${t.lane.map((c, i) => `<stop offset="${i / (t.lane.length - 1)}" stop-color="${c}"/>`).join("")}</linearGradient></defs>`);
  const draw = (d, id, delay) =>
    `<path id="${id}" d="${d}" pathLength="1" fill="none" stroke="url(#lane)" stroke-width="2" stroke-opacity="0.75" ` +
    `style="stroke-dasharray:1;stroke-dashoffset:1;animation:draw .8s cubic-bezier(.5,0,.2,1) ${delay.toFixed(2)}s forwards"/>`;
  const pulse = (id, delay, color) =>
    `<circle r="4" fill="${color}" opacity="0"><animateMotion dur="1.4s" begin="${delay.toFixed(2)}s" repeatCount="3" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1"><mpath href="#${id}"/></animateMotion>` +
    `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="1.4s" begin="${delay.toFixed(2)}s" repeatCount="3"/></circle>`;
  const fade = (d) => `opacity:0;animation:fade .4s ease ${d.toFixed(2)}s forwards`;

  AGENTS.forEach((name, i) => {
    const y = 20 + i * 27;
    const ty = cy - 56 + i * (112 / (AGENTS.length - 1));
    out.push(`<text x="122" y="${y + 5}" font-size="16" fill="${i === AGENTS.length - 1 ? t.muted : t.fg}" text-anchor="end" style="${fade(0.05 * i)}">${name}</text>`);
    out.push(`<circle cx="132" cy="${y}" r="3.5" fill="${t.lane[0]}" style="${fade(0.05 * i)}"/>`);
    out.push(draw(`M135 ${y} C200 ${y} 205 ${ty} ${hub.x} ${ty}`, `a${i}`, 0.35 + i * 0.05));
    out.push(pulse(`a${i}`, 1.6 + i * 0.16, t.lane[1]));
  });
  CLIENTS.forEach((name, i) => {
    const y = 52 + i * 60;
    const sy = cy - 42 + i * 28;
    out.push(draw(`M${hub.x + hub.w} ${sy} C${hub.x + hub.w + 70} ${sy} 455 ${y} 512 ${y}`, `c${i}`, 0.9 + i * 0.08));
    out.push(`<circle cx="515" cy="${y}" r="3.5" fill="${t.lane[3]}" style="${fade(1.1 + i * 0.08)}"/>`);
    out.push(`<text x="527" y="${y + 6}" font-size="17" fill="${t.fg}" font-weight="700" style="${fade(1.1 + i * 0.08)}">${name}</text>`);
    out.push(pulse(`c${i}`, 2.6 + i * 0.25, t.lane[3]));
  });
  out.push(`<g style="opacity:0;animation:pop .6s cubic-bezier(.3,1.4,.5,1) .2s forwards;transform-origin:${hub.x + hub.w / 2}px ${cy}px">` +
    `<rect x="${hub.x}" y="${hub.y}" width="${hub.w}" height="${hub.h}" rx="22" fill="${t.bg}" stroke="url(#lane)" stroke-width="3"/>` +
    `<text x="${hub.x + hub.w / 2}" y="${cy - 4}" font-size="36" font-weight="800" fill="${t.fg}" text-anchor="middle">T3</text>` +
    `<text x="${hub.x + hub.w / 2}" y="${cy + 22}" font-size="16" font-weight="600" fill="${t.muted}" text-anchor="middle">Code</text></g>`);
  const lines = [
    ["The open-source control plane for coding agents", 19, t.fg, 700],
    ["Your own subscriptions · every agent in one place", 16, t.muted, 400],
    ["desktop, web and phone · git built in", 16, t.muted, 400],
  ];
  lines.forEach(([str, size, fill, weight], i) =>
    out.push(`<text x="${W / 2}" y="${310 + i * 26}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="middle" style="${fade(1.6 + i * 0.15)}">${str}</text>`));
  const H = 310 + lines.length * 26;
  const css = "@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}@keyframes fade{from{opacity:0}to{opacity:1}}@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family='${SANS}' role="img" aria-label="T3 Code connects Claude Code, Codex, Cursor, OpenCode, Grok Build, Antigravity, Kiro, Pi, Muse Code and any ACP agent to desktop, web, iPhone and Android"><style>${css}</style>${out.join("")}</svg>\n`;
}

// My merged T3 Code PRs, by area and by kind, from their conventional-commit titles.
const KINDS = [
  ["fix", "fixes", { dark: "#4493f8", light: "#0969da" }],
  ["perf", "speed", { dark: "#2ea043", light: "#1a7f37" }],
  ["feat", "features", { dark: "#a371f7", light: "#8250df" }],
  ["other", "other", { dark: "#db6d28", light: "#bc4c00" }],
];
const AREAS = [
  ["Web app", ["web", "ui"]],
  ["Server", ["server", "terminal"]],
  ["Agent providers", ["pi", "acp", "providers", "provider", "cursor", "codex", "claude", "grok", "muse", "antigravity", "opencode"]],
  ["Mobile", ["mobile", "ios", "android"]],
  ["Desktop", ["desktop"]],
];

export async function myPrs(token, login) {
  const titles = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`https://api.github.com/search/issues?q=repo:${REPO}+author:${login}+is:pr+is:merged&per_page=100&page=${page}`, {
      headers: { authorization: `bearer ${token}`, "user-agent": "profile-t3code", accept: "application/vnd.github+json" },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`search: ${res.status} ${JSON.stringify(json)}`);
    titles.push(...json.items.map((i) => i.title));
    if (titles.length >= json.total_count || json.items.length < 100) break;
  }
  return titles;
}

export function t3codeMineSvg(titles, theme) {
  const t = THEMES[theme];
  const rows = [...AREAS.map(([name]) => name), "Everything else"].map((name) => ({ name, counts: { fix: 0, perf: 0, feat: 0, other: 0 } }));
  for (const title of titles) {
    const m = title.match(/^([a-z]+)(?:\(([^)]+)\))?!?:/);
    const kind = m && ["fix", "perf", "feat"].includes(m[1]) ? m[1] : "other";
    const scope = m?.[2]?.split(/[,/]/)[0].trim().toLowerCase() ?? "";
    const area = AREAS.findIndex(([, scopes]) => scopes.includes(scope));
    rows[area === -1 ? rows.length - 1 : area].counts[kind]++;
  }
  const W = 640;
  const rowH = 42;
  const top = 104;
  const H = top + rows.length * rowH;
  const x0 = 168;
  const x1 = W - 48;
  const max = Math.max(...rows.map((r) => Object.values(r.counts).reduce((a, b) => a + b, 0)));
  const scale = (x1 - x0) / max;
  const out = [];
  out.push(`<text x="0" y="24" font-size="22" font-weight="800" fill="${t.fg}">What I built in T3 Code</text>`);
  out.push(`<text x="0" y="50" font-size="17" fill="${t.muted}">${fmt(titles.length)} merged pull requests, by area</text>`);
  let lx = 0;
  KINDS.forEach(([, label, colors]) => {
    out.push(`<rect x="${lx}" y="66" width="13" height="13" rx="3" fill="${colors[theme]}"/><text x="${lx + 19}" y="78" font-size="16" fill="${t.muted}">${label}</text>`);
    lx += label.length * 9 + 44;
  });
  rows.forEach((row, i) => {
    const y = top + i * rowH;
    const total = Object.values(row.counts).reduce((a, b) => a + b, 0);
    out.push(`<text x="${x0 - 14}" y="${y + 18}" font-size="17" fill="${t.fg}" text-anchor="end">${row.name}</text>`);
    let x = 0;
    const segs = [];
    for (const [kind, , colors] of KINDS) {
      const w = row.counts[kind] * scale;
      if (!w) continue;
      // Segments sit 2px apart; the last one gets the rounded end.
      segs.push({ x, w: Math.max(w - 2, 2), fill: colors[theme] });
      x += w;
    }
    const last = segs.length - 1;
    const body = segs.map((sg, k) => k === last
      ? `<path d="M${sg.x} 0 H${sg.x + sg.w - 5} Q${sg.x + sg.w} 0 ${sg.x + sg.w} 5 V19 Q${sg.x + sg.w} 24 ${sg.x + sg.w - 5} 24 H${sg.x} Z" fill="${sg.fill}"/>`
      : `<rect x="${sg.x}" y="0" width="${sg.w}" height="24" fill="${sg.fill}"/>`).join("");
    out.push(`<g transform="translate(${x0} ${y})"><g style="transform:scaleX(0);animation:grow .8s cubic-bezier(.2,.7,.2,1) ${(0.3 + i * 0.1).toFixed(2)}s forwards">${body}</g></g>`);
    out.push(`<text x="${x0 + x + 10}" y="${y + 18}" font-size="17" font-weight="700" fill="${t.fg}" style="opacity:0;animation:fade .4s ease ${(0.9 + i * 0.1).toFixed(2)}s forwards">${total}</text>`);
  });
  const css = "@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes fade{from{opacity:0}to{opacity:1}}";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family='${SANS}' role="img" aria-label="${fmt(titles.length)} merged T3 Code pull requests by Wout, by area"><style>${css}</style>${out.join("")}</svg>\n`;
}
