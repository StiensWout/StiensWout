// Draws the profile's SVGs into OUT_DIR (default dist):
//   snake-{dark,light}.svg  the last year's contribution graph, eaten column by
//                           column by a snake that grows one segment per active
//                           day, then a results screen and a countdown to the
//                           next run
//   title-{dark,light}.svg  the name spelled in contribution cells
//   t3code-title-{dark,light}.svg, t3code-{dark,light}.svg
//                           the T3 Code title and its animated charts (t3code.mjs)
//
//   GITHUB_TOKEN=... node profile/generate.mjs [OUT_DIR]
//   CALENDAR_JSON=cal.json T3CODE_JSON=t3code.json node profile/generate.mjs [OUT_DIR]   (offline)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { t3codeChartsSvg, t3codeStats, t3codeTitleSvg } from "./t3code.mjs";

const LOGIN = process.env.PROFILE_LOGIN ?? "StiensWout";
const NAME = "WOUT STIENS";
const OUT = process.argv[2] ?? "dist";

const THEMES = {
  dark: {
    bg: "#0d1117", fg: "#e6edf3", muted: "#8b949e", empty: "#161b22",
    levels: ["#0e4429", "#006d32", "#26a641", "#39d353"],
    head: "#e2c5ff", tail: "#6e40c9", eye: "#0d1117", accent: "#d2a8ff",
  },
  light: {
    bg: "#ffffff", fg: "#1f2328", muted: "#656d76", empty: "#ebedf0",
    levels: ["#9be9a8", "#40c463", "#30a14e", "#216e39"],
    head: "#5a32a3", tail: "#c297ff", eye: "#ffffff", accent: "#8250df",
  },
};
const LEVEL = { FIRST_QUARTILE: 0, SECOND_QUARTILE: 1, THIRD_QUARTILE: 2, FOURTH_QUARTILE: 3 };
const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`;

// Snake geometry and timing.
const P = 14; // cell pitch
const S = 11; // cell size
const LEFT = 34;
const TOP = 24;
const ROWS = 7;
const TICK = 0.065; // seconds per cell
const START_LENGTH = 4;
const ENTRY = 6; // cells walked in from the left before the grid
const RESULTS = 8.5; // seconds of results screen and countdown
const COUNTDOWN = 5;

async function loadCalendar() {
  if (process.env.CALENDAR_JSON) {
    const json = JSON.parse(readFileSync(process.env.CALENDAR_JSON, "utf8"));
    return json.data.user.contributionsCollection.contributionCalendar;
  }
  const query = `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar {
    totalContributions weeks { contributionDays { date contributionCount contributionLevel weekday } } } } } }`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      authorization: `bearer ${process.env.GITHUB_TOKEN}`,
      "content-type": "application/json",
      "user-agent": "profile-snake",
    },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GitHub GraphQL: ${res.status} ${JSON.stringify(json.errors ?? json)}`);
  return json.data.user.contributionsCollection.contributionCalendar;
}

const fmt = (n) => n.toLocaleString("en-US");
const pct = (t, total) => `${Math.min(100, Math.max(0, (t / total) * 100)).toFixed(3)}%`;
const mix = (a, b, f) => {
  const [x, y] = [a, b].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * f).toString(16).padStart(2, "0")).join("")}`;
};
// Blends two hex colors through hue, so green into violet passes cyan and blue instead of gray.
const mixHue = (a, b, f) => {
  const hsl = (h) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, bl), min = Math.min(r, g, bl), l = (max + min) / 2, d = max - min;
    if (d === 0) return [0, 0, l];
    const sat = d / (1 - Math.abs(2 * l - 1));
    const hue = max === r ? ((g - bl) / d) % 6 : max === g ? (bl - r) / d + 2 : (r - g) / d + 4;
    return [(hue * 60 + 360) % 360, sat, l];
  };
  const [[h1, s1, l1], [h2, s2, l2]] = [hsl(a), hsl(b)];
  const [h, sat, l] = [h1 + (h2 - h1) * f, s1 + (s2 - s1) * f, l1 + (l2 - l1) * f];
  const k = (n) => (n + h / 30) % 12;
  const ch = (n) => l - sat * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return `#${[0, 8, 4].map((n) => Math.round(ch(n) * 255).toString(16).padStart(2, "0")).join("")}`;
};
const cellX = (c) => LEFT + c * P;
const cellY = (r) => TOP + r * P;

function stats(weeks) {
  const days = weeks.flatMap((w) => w.contributionDays);
  let streak = 0;
  let longest = 0;
  for (const d of days) {
    streak = d.contributionCount > 0 ? streak + 1 : 0;
    longest = Math.max(longest, streak);
  }
  return {
    active: days.filter((d) => d.contributionCount > 0).length,
    longest,
    best: Math.max(...days.map((d) => d.contributionCount)),
  };
}

// The head walks down the first week, up the next, and so on, then leaves on the right.
function snakePath(weeks, exitLength) {
  const path = [];
  for (let k = ENTRY; k >= 1; k--) path.push({ c: -k, r: 0 });
  weeks.forEach((_, c) => {
    for (let k = 0; k < ROWS; k++) path.push({ c, r: c % 2 === 0 ? k : ROWS - 1 - k });
  });
  const last = path.at(-1);
  for (let k = 1; k <= exitLength; k++) path.push({ c: last.c + k, r: last.r });
  return path;
}

// GitHub's weeks start on Sunday; these start on Monday, with each day's row set.
function mondayWeeks(weeks) {
  const out = [];
  for (const d of weeks.flatMap((w) => w.contributionDays)) {
    const row = (d.weekday + 6) % 7;
    if (!out.length || row === 0) out.push({ contributionDays: [] });
    out.at(-1).contributionDays.push({ ...d, row });
  }
  return out;
}

function snakeSvg(calendar, theme) {
  const t = THEMES[theme];
  const weeks = mondayWeeks(calendar.weeks);
  const days = new Map();
  weeks.forEach((w, c) => w.contributionDays.forEach((d) => days.set(`${c},${d.row}`, d)));

  const active = [...days.values()].filter((d) => d.contributionCount > 0).length;
  const finalLength = START_LENGTH + active;
  const path = snakePath(weeks, finalLength + 3);

  // When the head reaches each active day, it eats it and grows one segment.
  const eaten = [];
  path.forEach((p, j) => {
    const d = days.get(`${p.c},${p.r}`);
    if (d?.contributionCount > 0) eaten.push({ j, c: p.c, r: p.r, d });
  });

  const runTime = (path.length - 1) * TICK;
  const total = runTime + RESULTS;
  const width = LEFT + weeks.length * P + 12;
  const height = TOP + ROWS * P + 30;
  const gridMidX = LEFT + (weeks.length * P) / 2;

  // Heading leaving each point: 0 right, 90 down, -90 up.
  const angle = (j) => {
    const a = path[j];
    const b = path[Math.min(j + 1, path.length - 1)];
    if (b.c > a.c) return 0;
    if (b.r > a.r) return 90;
    if (b.r < a.r) return -90;
    return 0;
  };
  const move = path
    .map((p, j) => {
      const x = cellX(p.c) + S / 2;
      const y = cellY(p.r) + S / 2;
      return `${pct(j * TICK, total)}{transform:translate(${x}px,${y}px) rotate(${angle(j)}deg)}`;
    })
    .join("");

  const css = [`@keyframes mv{${move}100%{transform:translate(${cellX(path.at(-1).c)}px,${cellY(path.at(-1).r)}px)}}`];
  const out = [];

  // Labels, as on GitHub.
  const label = (x, y, text, anchor = "start") =>
    `<text x="${x}" y="${y}" fill="${t.muted}" font-size="10" text-anchor="${anchor}">${text}</text>`;
  let lastMonthCol = -9;
  weeks.forEach((w, c) => {
    const first = w.contributionDays[0];
    const month = new Date(`${first.date}T00:00:00Z`).getUTCMonth();
    const prev = c > 0 ? new Date(`${weeks[c - 1].contributionDays[0].date}T00:00:00Z`).getUTCMonth() : -1;
    if (month !== prev && c - lastMonthCol >= 3 && c < weeks.length - 1) {
      out.push(label(cellX(c), TOP - 8, new Date(Date.UTC(2000, month, 1)).toLocaleString("en-US", { month: "short", timeZone: "UTC" })));
      lastMonthCol = c;
    }
  });
  [[0, "Mon"], [2, "Wed"], [4, "Fri"]].forEach(([r, d]) => out.push(label(LEFT - 6, cellY(r) + 9, d, "end")));

  // The grid, with active days on top so they can be eaten.
  for (const [key, d] of days) {
    const [c, r] = key.split(",").map(Number);
    out.push(`<rect x="${cellX(c)}" y="${cellY(r)}" width="${S}" height="${S}" rx="2.5" fill="${t.empty}"/>`);
  }
  eaten.forEach((e, n) => {
    const at = e.j * TICK;
    css.push(
      `@keyframes e${n}{0%,${pct(at, total)}{opacity:1}${pct(at + 0.12, total)},${pct(total - 0.7, total)}{opacity:0}100%{opacity:1}}`,
    );
    out.push(
      `<rect x="${cellX(e.c)}" y="${cellY(e.r)}" width="${S}" height="${S}" rx="2.5" fill="${t.levels[LEVEL[e.d.contributionLevel] ?? 0]}" style="animation:e${n} ${total}s linear infinite"/>`,
    );
  });

  // Footer: the year's total and the legend.
  const footY = TOP + ROWS * P + 18;
  out.push(label(LEFT, footY, `${fmt(calendar.totalContributions)} contributions in the last year`));
  const legendX = LEFT + weeks.length * P - 5 * P - 30;
  out.push(label(legendX - 5, footY, "Less", "end"));
  [t.empty, ...t.levels].forEach((fill, i) =>
    out.push(`<rect x="${legendX + i * P}" y="${footY - 9}" width="${S}" height="${S}" rx="2.5" fill="${fill}"/>`),
  );
  out.push(label(legendX + 5 * P + 2, footY, "More"));

  // The snake's body is one stroke along the whole route. Its dash is the body:
  // the dash's far end follows the head, and the dash lengthens by one cell
  // during the tick after each active day is eaten, so the tail waits a beat.
  const route = path.map((p) => `${cellX(p.c) + S / 2} ${cellY(p.r) + S / 2}`).join(" L ");
  const lengthAt = (k) => START_LENGTH - 1 + eaten.filter((e) => e.j < k).length;
  const lastTick = path.length - 1;
  const stops = [];
  for (let k = 0; k <= lastTick; k++) {
    const turn = k === 0 || k === lastTick || lengthAt(k + 1) - lengthAt(k) !== lengthAt(k) - lengthAt(k - 1);
    if (!turn) continue;
    const len = lengthAt(k) * P;
    stops.push(`${pct(k * TICK, total)}{stroke-dasharray:${len}px 100000px;stroke-dashoffset:${len - k * P}px}`);
  }
  const endLen = lengthAt(lastTick) * P;
  css.push(`@keyframes body{${stops.join("")}100%{stroke-dasharray:${endLen}px 100000px;stroke-dashoffset:${endLen - lastTick * P}px}}`);
  const body = (stroke, width, extra = "") =>
    `<path d="M ${route}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}style="animation:body ${total}s linear infinite;stroke-dasharray:0 100000px"/>`;
  out.push(body(t.tail, 10));
  out.push(body(t.head, 3.5, `stroke-opacity="0.55" `));
  out.push(
    `<g style="animation:mv ${total}s linear infinite backwards"><rect x="-7.5" y="-6.5" width="15" height="13" rx="5" fill="${t.head}"/>` +
      `<circle cx="2.5" cy="-3.2" r="2" fill="${t.eye}"/><circle cx="2.5" cy="3.2" r="2" fill="${t.eye}"/>` +
      `<circle cx="3.2" cy="-3.2" r="0.8" fill="${t.head}"/><circle cx="3.2" cy="3.2" r="0.8" fill="${t.head}"/></g>`,
  );

  // Results screen, then a countdown to the next run.
  const { longest, best } = stats(weeks);
  const show = (name, from, to) =>
    css.push(
      `@keyframes ${name}{0%,${pct(from, total)}{opacity:0}${pct(from + 0.35, total)},${pct(to - 0.35, total)}{opacity:1}${pct(to, total)},100%{opacity:0}}`,
    );
  show("res", runTime + 0.2, total - 0.4);
  const midY = TOP + (ROWS * P) / 2;
  out.push(
    `<g style="animation:res ${total}s linear infinite;opacity:0">` +
      `<rect x="${LEFT - 2}" y="${TOP - 2}" width="${weeks.length * P + 2}" height="${ROWS * P + 2}" fill="${t.bg}" opacity="0.9"/>` +
      `<text x="${gridMidX}" y="${midY - 12}" fill="${t.fg}" font-size="24" font-weight="700" text-anchor="middle">${fmt(calendar.totalContributions)} contributions eaten</text>` +
      `<text x="${gridMidX}" y="${midY + 10}" fill="${t.muted}" font-size="12" text-anchor="middle">${active} active days · longest streak ${longest} days · best day ${best} · snake length ${finalLength}</text>` +
      `</g>`,
  );
  const countStart = total - 0.4 - COUNTDOWN;
  for (let k = COUNTDOWN; k >= 1; k--) {
    const from = countStart + (COUNTDOWN - k);
    css.push(
      `@keyframes n${k}{0%,${pct(from, total)}{opacity:0}${pct(from + 0.01, total)},${pct(from + 1, total)}{opacity:1}${pct(from + 1.01, total)},100%{opacity:0}}`,
    );
    out.push(
      `<text x="${gridMidX}" y="${midY + 34}" fill="${t.accent}" font-size="12" font-weight="600" text-anchor="middle" style="animation:n${k} ${total}s linear infinite;opacity:0">next run in ${k}</text>`,
    );
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family='${FONT}'>` +
    `<style>${css.join("")}</style>${out.join("")}</svg>\n`
  );
}

// 5x7 letters (I is 3 wide), "#" lit.
const GLYPHS = {
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  I: ["###", ".#.", ".#.", ".#.", ".#.", ".#.", "###"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  " ": ["..", "..", "..", "..", "..", "..", ".."],
};

function titleSvg(theme) {
  const t = THEMES[theme];
  const pitch = 12;
  const size = 10;
  const pad = 1;
  const lit = new Set();
  let col = pad;
  for (const ch of NAME) {
    const g = GLYPHS[ch];
    g.forEach((row, r) => [...row].forEach((v, c) => v === "#" && lit.add(`${col + c},${r + pad}`)));
    col += g[0].length + 1;
  }
  const cols = col - 1 + pad;
  const rows = 7 + pad * 2;
  const cells = [];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const on = lit.has(`${c},${r}`);
      // Lit cells run from the brightest green into the snake's violet; a few unlit cells carry faint activity.
      const roll = rand();
      const glow = mixHue(t.levels[3], t.accent, c / (cols - 1));
      const fill = on ? (roll < 0.15 ? mix(glow, t.empty, 0.35) : glow) : roll < 0.05 ? t.levels[0] : t.empty;
      cells.push(`<rect x="${c * pitch}" y="${r * pitch}" width="${size}" height="${size}" rx="2" fill="${fill}"/>`);
    }
  }
  const w = cols * pitch - (pitch - size);
  const h = rows * pitch - (pitch - size);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Wout Stiens">${cells.join("")}</svg>\n`;
}

const calendar = await loadCalendar();
mkdirSync(OUT, { recursive: true });
for (const theme of Object.keys(THEMES)) {
  writeFileSync(`${OUT}/snake-${theme}.svg`, snakeSvg(calendar, theme));
  writeFileSync(`${OUT}/title-${theme}.svg`, titleSvg(theme));
}
const t3 = process.env.T3CODE_JSON
  ? JSON.parse(readFileSync(process.env.T3CODE_JSON, "utf8"))
  : await t3codeStats(process.env.GITHUB_TOKEN, LOGIN);
for (const theme of Object.keys(THEMES)) {
  writeFileSync(`${OUT}/t3code-title-${theme}.svg`, t3codeTitleSvg(theme));
  writeFileSync(`${OUT}/t3code-${theme}.svg`, t3codeChartsSvg(t3, theme));
}
console.log(`wrote ${OUT}: ${calendar.totalContributions} contributions`);
