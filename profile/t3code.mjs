// The T3 Code section of the profile README:
//   t3codeStats(token, login)   live numbers for pingdotgg/t3code from GitHub
//   t3codeTitleSvg(theme)       "T3 CODE" drawn as a git graph that draws itself in
//   t3codeChartsSvg(s, theme)   headline numbers, commits per week and merged PRs
//                               per month (mine stacked on top), animated in once
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

// "T3 CODE" as a git graph: each letter is a branch line with commits at its
// joints, the lanes running green to cyan, blue and violet. The lines draw themselves in, then the commits pop in, once per page load.
const LETTERS = {
  T: { lines: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]], dots: [[0, 0], [4, 0], [2, 6]] },
  3: { lines: [[[0, 0], [4, 0], [4, 6], [0, 6]], [[1.5, 3], [4, 3]]], dots: [[0, 0], [1.5, 3], [0, 6]] },
  C: { lines: [[[4, 0], [0, 0], [0, 6], [4, 6]]], dots: [[4, 0], [4, 6]] },
  O: { lines: [[[0, 0], [4, 0], [4, 6], [0, 6], [0, 0]]], dots: [[0, 0], [4, 6]] },
  D: { lines: [[[0, 0], [2.6, 0], [4, 1.4], [4, 4.6], [2.6, 6], [0, 6], [0, 0]]], dots: [[0, 0], [0, 6]] },
  E: { lines: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]], dots: [[4, 0], [3, 3], [4, 6]] },
};

export function t3codeTitleSvg(theme) {
  const t = THEMES[theme];
  const U = 15; // grid unit
  const pad = 10;
  let x = 0;
  const placed = [];
  for (const ch of ["T", "3", " ", "C", "O", "D", "E"]) {
    if (ch === " ") { x += 3.5; continue; }
    placed.push({ ch, x });
    x += 6;
  }
  const width = (x - 2) * U + pad * 2;
  const height = 6 * U + pad * 2;
  const css = [
    "@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}",
    "@keyframes pop{from{opacity:0;transform:scale(0.2)}to{opacity:1;transform:scale(1)}}",
  ];
  const out = [`<defs><linearGradient id="lane" gradientUnits="userSpaceOnUse" x1="${pad}" y1="0" x2="${width - pad}" y2="0">` +
    `${t.lane.map((c, i) => `<stop offset="${i / (t.lane.length - 1)}" stop-color="${c}"/>`).join("")}</linearGradient></defs>`];
  const at = ([gx, gy], ox) => [pad + (ox + gx) * U, pad + gy * U];
  placed.forEach(({ ch, x: ox }, i) => {
    const { lines, dots } = LETTERS[ch];
    lines.forEach((line, j) => {
      const d = line.map((pt, k) => `${k ? "L" : "M"}${at(pt, ox).join(" ")}`).join(" ");
      out.push(`<path d="${d}" pathLength="1" fill="none" stroke="url(#lane)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" ` +
        `style="stroke-dasharray:1;stroke-dashoffset:1;animation:draw 0.7s cubic-bezier(.5,0,.2,1) ${(0.15 + i * 0.16 + j * 0.2).toFixed(2)}s forwards"/>`);
    });
    dots.forEach((pt, j) => {
      const [cx, cy] = at(pt, ox);
      out.push(`<g transform="translate(${cx} ${cy})"><circle r="6.5" fill="${t.bg}" stroke="url(#lane)" stroke-width="3.5" ` +
        `style="opacity:0;animation:pop 0.35s cubic-bezier(.3,1.6,.5,1) ${(0.75 + i * 0.16 + j * 0.08).toFixed(2)}s forwards"/></g>`);
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="T3 Code"><style>${css.join("")}</style>${out.join("")}</svg>\n`;
}

// Round a maximum up to a tidy axis top, so its half is a tidy gridline too.
const niceTop = (max) => {
  const step = 10 ** Math.floor(Math.log10(max / 2));
  return Math.ceil(max / 2 / step) * step * 2;
};

// A bar drawn upward from (0, 0), its top corners rounded by r.
const bar = (w, h, fill, r = 2) => {
  if (h <= 0) return "";
  const rr = Math.min(r, w / 2, h);
  return `<path d="M0 0 V${-(h - rr)} Q0 ${-h} ${rr} ${-h} H${w - rr} Q${w} ${-h} ${w} ${-(h - rr)} V0 Z" fill="${fill}"/>`;
};

export function t3codeChartsSvg(s, theme) {
  const t = THEMES[theme];
  const W = 840;
  const H = 316;
  const css = [
    "@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}",
    "@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}",
    "@keyframes fade{from{opacity:0}to{opacity:1}}",
  ];
  const text = (x, y, str, { size = 11, fill = t.muted, weight = 400, anchor = "start", style = "" } = {}) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}"${style ? ` style="${style}"` : ""}>${str}</text>`;
  const fadeIn = (delay) => `opacity:0;animation:fade 0.5s ease ${delay.toFixed(2)}s forwards`;
  const out = [];

  // Headline numbers.
  const heads = [[s.stars, "stars"], [s.contributors, "contributors"], [s.merged, "merged pull requests"], [s.releases, "releases"]];
  heads.forEach(([value, label], i) => {
    out.push(`<g style="opacity:0;animation:rise 0.6s cubic-bezier(.2,.7,.2,1) ${(i * 0.12).toFixed(2)}s forwards">` +
      text(i * 214, 34, fmt(value), { size: 30, fill: t.fg, weight: 700 }) + text(i * 214, 56, label, { size: 12.5 }) + `</g>`);
  });

  const top = 104;
  const base = 290;
  const plotH = base - top - 30;
  const axis = (x0, x1, yTop) =>
    [0, yTop / 2, yTop].map((v) => {
      const y = base - (v / yTop) * plotH;
      return `<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="${t.grid}"/>` + text(x0 - 6, y + 4, fmt(v), { size: 10, anchor: "end" });
    }).join("");

  // Commits per week, last 52 weeks.
  {
    const x0 = 38;
    const x1 = 396;
    const yTop = niceTop(Math.max(...s.weekly.map((w) => w.total)));
    const step = (x1 - x0) / s.weekly.length;
    out.push(text(0, top, "Commits per week, last 52 weeks", { size: 13, fill: t.fg, weight: 600 }));
    out.push(axis(x0, x1, yTop));
    let peak = 0;
    s.weekly.forEach((w, i) => {
      if (w.total > s.weekly[peak].total) peak = i;
      out.push(`<g transform="translate(${(x0 + i * step + 1).toFixed(1)} ${base})"><g style="transform:scaleY(0);animation:grow 0.7s cubic-bezier(.2,.7,.2,1) ${(0.4 + i * 0.018).toFixed(3)}s forwards">${bar(step - 2, (w.total / yTop) * plotH, t.all)}</g></g>`);
    });
    const px = x0 + peak * step + step / 2;
    out.push(text(px, base - (s.weekly[peak].total / yTop) * plotH - 7, `${fmt(s.weekly[peak].total)} at the peak`, { size: 10.5, fill: t.fg, weight: 600, anchor: px > x1 - 50 ? "end" : "middle", style: fadeIn(1.6) }));
    [0, Math.floor(s.weekly.length / 2), s.weekly.length - 1].forEach((i, k) => {
      const d = new Date(s.weekly[i].week * 1000);
      out.push(text(x0 + i * step + step / 2, base + 16, `${MONTH(d.getUTCMonth())} ${d.getUTCFullYear()}`, { size: 10, anchor: ["start", "middle", "end"][k] }));
    });
  }

  // Merged PRs per month: everyone else's, with mine stacked on top.
  {
    const x0 = 482;
    const x1 = W;
    const yTop = niceTop(Math.max(...s.monthly.map((m) => m.all)));
    const step = (x1 - x0) / s.monthly.length;
    const bw = Math.min(26, step - 8);
    out.push(text(440, top, "Merged pull requests per month", { size: 13, fill: t.fg, weight: 600 }));
    out.push(`<rect x="${W - 132}" y="${top - 9}" width="10" height="10" rx="2" fill="${t.all}"/>` + text(W - 118, top, "everyone"));
    out.push(`<rect x="${W - 54}" y="${top - 9}" width="10" height="10" rx="2" fill="${t.mine}"/>` + text(W - 40, top, "mine"));
    out.push(axis(x0, x1, yTop));
    s.monthly.forEach((m, i) => {
      const x = x0 + i * step + (step - bw) / 2;
      const hRest = ((m.all - m.mine) / yTop) * plotH;
      const hMine = m.mine > 0 ? Math.max((m.mine / yTop) * plotH, 2) : 0;
      // A 2px surface gap separates my segment from everyone else's.
      const mine = hMine ? `<g transform="translate(0 ${-(hRest + 2)})">${bar(bw, hMine, t.mine)}</g>` : "";
      out.push(`<g transform="translate(${x.toFixed(1)} ${base})"><g style="transform:scaleY(0);animation:grow 0.8s cubic-bezier(.2,.7,.2,1) ${(0.5 + i * 0.07).toFixed(2)}s forwards">${bar(bw, hRest, t.all, hMine ? 0 : 2)}${mine}</g></g>`);
      out.push(text(x + bw / 2, base + 16, MONTH(m.month), { size: 10, anchor: "middle" }));
    });
    // Direct labels on the busiest month: its total and my part of it.
    const best = s.monthly.reduce((b, m, i) => (m.all > s.monthly[b].all ? i : b), 0);
    const bm = s.monthly[best];
    const lx = x0 + best * step + step / 2;
    const ly = base - (bm.all / yTop) * plotH - 4;
    const anchor = best === s.monthly.length - 1 ? "end" : "middle";
    const ax = anchor === "end" ? x0 + best * step + (step + bw) / 2 : lx;
    out.push(text(ax, ly - 16, fmt(bm.all), { size: 10.5, fill: t.fg, weight: 600, anchor, style: fadeIn(1.7) }));
    out.push(text(ax, ly - 4, `${fmt(bm.mine)} mine`, { size: 10, anchor, style: fadeIn(1.8) }));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family='${SANS}' role="img" aria-label="T3 Code: ${fmt(s.stars)} stars, ${fmt(s.contributors)} contributors, ${fmt(s.merged)} merged pull requests, ${fmt(s.releases)} releases; commits per week and merged pull requests per month"><style>${css.join("")}</style>${out.join("")}</svg>\n`;
}
