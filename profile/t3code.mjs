// An animated T3 Code scene for the profile README: a thread started at the
// desk, handed from Claude to Codex, approved from the phone, and shipped as a
// pull request (the real #32947). The footer carries the repo's live numbers.
//
//   t3codeSvg({ stars, contributors, release })  ->  SVG text

const D = 18; // seconds per loop
const W = 840;
const H = 482;
const C = {
  bg: "#000000", panel: "#0a0a0a", raised: "#161616", border: "#262626",
  fg: "#ededed", muted: "#8a8a8a", faint: "#5c5c5c",
  violet: "#a78bfa", green: "#3fb950", red: "#f85149", amber: "#d29922",
};
const SANS = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const p = (t) => `${((Math.min(Math.max(t, 0), D) / D) * 100).toFixed(3)}%`;

export function t3codeSvg({ stars, contributors, release }) {
  const css = [];
  let n = 0;
  const anim = (frames, timing = "linear") => {
    const name = `k${n++}`;
    css.push(`@keyframes ${name}{${frames}}`);
    return `animation:${name} ${D}s ${timing} infinite`;
  };
  // Visible from `from` to `to` seconds into the loop, with short fades.
  const show = (from, to = D - 0.5, fade = 0.25) => {
    const start = from <= 0 ? `0%,${p(to)}{opacity:1}` : `0%,${p(from)}{opacity:0}${p(from + fade)},${p(to)}{opacity:1}`;
    return `opacity:0;${anim(`${start}${p(to + fade)},100%{opacity:0}`)}`;
  };
  const text = (x, y, s, { size = 12.5, fill = C.fg, weight = 400, font = SANS, anchor = "start", style = "" } = {}) =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" font-family='${font}' text-anchor="${anchor}"${style ? ` style="${style}"` : ""}>${s}</text>`;
  const rect = (x, y, w, h, fill, { rx = 0, stroke, style = "" } = {}) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ""}${style ? ` style="${style}"` : ""}/>`;
  const g = (style, body) => `<g style="${style}">${body}</g>`;

  const out = [];
  out.push(rect(0, 0, W, H, C.bg, { rx: 16 }));

  // Desktop window.
  out.push(rect(10.5, 10.5, 600, 400, C.bg, { rx: 12, stroke: C.border }));
  [28, 46, 64].forEach((x) => out.push(`<circle cx="${x}" cy="28" r="5" fill="#2e2e2e"/>`));
  out.push(text(310, 32, "T3 Code", { size: 12, fill: C.muted, anchor: "middle" }));
  out.push(`<line x1="11" y1="46.5" x2="610" y2="46.5" stroke="${C.border}"/>`);
  out.push(`<line x1="170.5" y1="47" x2="170.5" y2="410" stroke="${C.border}"/>`);

  // Sidebar: four threads, each with a status dot that changes as the story runs.
  out.push(text(24, 70, "t3code", { size: 11.5, fill: C.muted, weight: 600 }));
  out.push(rect(16, 80, 148, 24, C.raised, { rx: 6 }));
  const threads = [
    ["Faster sidebar", [[2.7, 8.0, C.amber], [8.0, 9.6, C.violet], [9.6, 13.6, C.amber], [13.6, D - 0.5, C.green]]],
    ["Fix GIF paste", [[0, 11.5, C.amber], [11.5, D - 0.5, C.green]]],
    ["Theme library", [[0, D - 0.5, C.green]]],
    ["Windows updater", [[0, 5, C.green], [5, 15.8, C.amber], [15.8, D - 0.5, C.green]]],
  ];
  threads.forEach(([title, states], i) => {
    const y = 96 + i * 26;
    out.push(text(26, y, title, { size: 12, fill: i === 0 ? C.fg : C.muted }));
    out.push(`<circle cx="150" cy="${y - 4}" r="3.5" fill="#2e2e2e"/>`);
    for (const [from, to, fill] of states) {
      out.push(`<circle cx="150" cy="${y - 4}" r="3.5" fill="${fill}" style="${show(from, to, 0.15)}"/>`);
    }
  });

  // Thread header, with the agent switching from Claude to Codex.
  out.push(text(186, 64, "Faster sidebar", { size: 13, weight: 600 }));
  out.push(text(596, 64, "Claude Opus 5.5", { size: 11.5, fill: C.muted, anchor: "end", style: show(0, 6.4) }));
  out.push(text(596, 64, "Codex", { size: 11.5, fill: C.violet, anchor: "end", style: show(6.4) }));
  out.push(`<line x1="171" y1="76.5" x2="610" y2="76.5" stroke="${C.border}"/>`);

  // The feed, scrolled up as it grows.
  const feed = [];
  let y = 90;
  const scrolls = [];
  const item = (at, height, body) => {
    feed.push(g(show(at), body(y)));
    scrolls.push([at, Math.max(0, y + height - 334)]);
    y += height;
  };
  const tool = (verb, rest) => (top) =>
    text(188, top + 12, `<tspan fill="${C.faint}">●</tspan>  <tspan fill="${C.fg}">${verb}</tspan>  ${rest}`, { size: 11, fill: C.muted, font: MONO });
  const ask = "the sidebar feels slow, can you find out why?";
  item(2.7, 40, (top) => rect(592 - ask.length * 6.4 - 24, top, ask.length * 6.4 + 24, 28, C.raised, { rx: 10 }) + text(580, top + 18.5, ask, { anchor: "end" }));
  item(3.3, 20, (top) => text(188, top + 12, "Claude Opus 5.5", { size: 11, fill: C.muted, weight: 600 }));
  item(3.8, 18, tool("Searched", `"branch label" in apps/web`));
  item(4.4, 20, tool("Read", "apps/server/src/vcs/VcsStatusBroadcaster.ts"));
  item(5.2, 24, (top) => text(188, top + 14, "Every branch label asks git for the full working-tree status."));
  item(6.2, 26, (top) => text(188, top + 15, "↳ Claude handed the fix to Codex", { fill: C.violet }));
  item(6.9, 20, (top) => text(188, top + 12, "Codex", { size: 11, fill: C.muted, weight: 600 }));
  item(7.4, 22, (top) =>
    text(188, top + 12, `<tspan fill="${C.faint}">●</tspan>  <tspan fill="${C.fg}">Edited</tspan>  19 files  <tspan fill="${C.green}">+751</tspan> <tspan fill="${C.red}">−49</tspan>`, { size: 11, fill: C.muted, font: MONO }),
  );
  item(8.0, 64, (top) =>
    rect(186, top, 408, 54, C.panel, { rx: 10, stroke: C.border }) +
    text(200, top + 20, "Codex wants to run", { size: 11, fill: C.muted }) +
    text(200, top + 40, "pnpm exec vp run check:changed", { size: 12, font: MONO }) +
    g(show(8.0, 9.6, 0.15),
      rect(462, top + 16, 60, 24, C.fg, { rx: 6 }) + text(492, top + 32, "Approve", { size: 11.5, fill: C.bg, weight: 600, anchor: "middle" }) +
      text(552, top + 32, "Deny", { size: 11.5, fill: C.muted, anchor: "middle" })) +
    g(show(9.6), text(580, top + 32, "✓ Approved on iPhone", { size: 11.5, fill: C.green, anchor: "end" })),
  );
  item(10.2, 22, (top) =>
    text(188, top + 12, `<tspan fill="${C.faint}">●</tspan>  <tspan fill="${C.fg}">Ran</tspan>  check:changed  <tspan fill="${C.green}">116 tests passed</tspan>`, { size: 11, fill: C.muted, font: MONO }),
  );
  item(10.9, 30, (top) => text(188, top + 14, "Branch labels now ask for the branch alone. Ready to ship."));
  item(12.0, 38, (top) =>
    ["Commit", "Push", "Open PR"].map((label, i) => {
      const x = 188 + i * 78;
      return rect(x, top, 70, 26, C.panel, { rx: 6, stroke: C.border }) +
        rect(x, top, 70, 26, C.fg, { rx: 6, style: show(12.2 + i * 0.45, D - 0.5, 0.12) }) +
        text(x + 35, top + 17, label, { size: 11.5, fill: C.fg, anchor: "middle" }) +
        text(x + 35, top + 17, label, { size: 11.5, fill: C.bg, weight: 600, anchor: "middle", style: show(12.2 + i * 0.45, D - 0.5, 0.12) });
    }).join(""),
  );
  item(13.6, 56, (top) =>
    rect(186, top, 408, 48, C.panel, { rx: 10, stroke: C.border }) +
    text(200, top + 20, "#32947 · pingdotgg/t3code", { size: 11, fill: C.muted, font: MONO }) +
    text(200, top + 38, "perf(sidebar): avoid full git status for branch labels", { size: 12.5 }) +
    text(580, top + 20, "Open", { size: 11.5, fill: C.green, weight: 600, anchor: "end", style: show(13.6, 15.0, 0.12) }) +
    text(580, top + 20, "Merged", { size: 11.5, fill: C.violet, weight: 600, anchor: "end", style: show(15.0) }),
  );
  const lastScroll = scrolls.at(-1)[1];
  const scrollFrames = scrolls.map(([at, s], i) => {
    const prev = i === 0 ? 0 : scrolls[i - 1][1];
    return `${p(at)}{transform:translateY(${-prev}px)}${p(at + 0.3)}{transform:translateY(${-s}px)}`;
  });
  out.push(`<clipPath id="feed"><rect x="171" y="77" width="439" height="259"/></clipPath>`);
  out.push(`<g clip-path="url(#feed)"><g style="${anim(`0%{transform:translateY(0)}${scrollFrames.join("")}100%{transform:translateY(${-lastScroll}px)}`, "ease-out")}">${feed.join("")}</g></g>`);

  // Composer: the question is typed, sent, and the placeholder returns.
  out.push(rect(182, 344, 416, 54, C.panel, { rx: 12, stroke: C.border }));
  out.push(text(196, 366, "Ask anything, @ to add files", { size: 12, fill: C.faint, style: `${show(0, 0.45, 0.1)}` }));
  out.push(text(196, 366, "Ask anything, @ to add files", { size: 12, fill: C.faint, style: show(2.7) }));
  const typed = ask.length * 6.5;
  out.push(`<clipPath id="composer"><rect x="183" y="345" width="414" height="52" rx="11"/></clipPath>`);
  out.push(`<g clip-path="url(#composer)">`);
  out.push(g(show(0.45, 2.6, 0.1),
    text(196, 366, ask) +
    `<g style="${anim(`0%,${p(0.5)}{transform:translateX(0)}${p(2.3)},100%{transform:translateX(${typed.toFixed(0)}px)}`, `steps(${ask.length}, end)`)}">` +
      rect(195, 352, 400, 20, C.panel) + rect(195, 354, 1.5, 15, C.fg) + `</g>`));
  out.push(`</g>`);
  out.push(text(196, 388, "Claude Opus 5.5 · Full access", { size: 10.5, fill: C.faint, style: show(0, 6.4) }));
  out.push(text(196, 388, "Codex · Full access", { size: 10.5, fill: C.faint, style: show(6.4) }));
  out.push(`<circle cx="580" cy="381" r="10" fill="${C.fg}"/>`);
  out.push(text(580, 385.5, "↑", { size: 12, fill: C.bg, weight: 700, anchor: "middle" }));

  // Phone: the same thread, where the approval lands.
  const px = 636;
  out.push(rect(px + 0.5, 20.5, 194, 392, C.bg, { rx: 30, stroke: "#3a3a3a" }));
  out.push(rect(px + 72, 30, 50, 15, "#1c1c1c", { rx: 7.5 }));
  out.push(text(px + 26, 42, "9:41", { size: 10.5, weight: 600 }));
  out.push(text(px + 16, 74, "Faster sidebar", { size: 12.5, weight: 600 }));
  out.push(text(px + 16, 90, "t3code · Claude Opus 5.5", { size: 10, fill: C.muted, style: show(0, 6.4) }));
  out.push(text(px + 16, 90, "t3code · Codex", { size: 10, fill: C.violet, style: show(6.4) }));
  out.push(`<line x1="${px + 1}" y1="100.5" x2="${px + 194}" y2="100.5" stroke="${C.border}"/>`);
  out.push(g(show(2.8),
    rect(px + 38, 112, 144, 40, C.raised, { rx: 10 }) +
    text(px + 172, 128, "the sidebar feels slow,", { size: 10.5, anchor: "end" }) +
    text(px + 172, 143, "can you find out why?", { size: 10.5, anchor: "end" })));
  out.push(g(show(5.3),
    text(px + 16, 174, "Every branch label asks git", { size: 10.5 }) +
    text(px + 16, 189, "for the full working-tree status.", { size: 10.5 })));
  out.push(g(show(6.3), text(px + 16, 212, "↳ handed to Codex", { size: 10.5, fill: C.violet })));
  out.push(g(show(11.0),
    text(px + 16, 236, "Branch labels now ask for the", { size: 10.5 }) +
    text(px + 16, 251, "branch alone. Ready to ship.", { size: 10.5 })));

  // The approval sheet slides up, is tapped, and leaves.
  const sheet =
    rect(px + 6, 262, 182, 142, "#111111", { rx: 18, stroke: C.border }) +
    rect(px + 80, 270, 34, 4, "#3a3a3a", { rx: 2 }) +
    text(px + 18, 294, "Codex wants to run", { size: 10.5, fill: C.muted }) +
    text(px + 18, 312, "pnpm exec vp run", { size: 10.5, font: MONO }) +
    text(px + 18, 327, "check:changed", { size: 10.5, font: MONO }) +
    rect(px + 16, 340, 162, 30, C.fg, { rx: 9 }) +
    text(px + 97, 359.5, "Approve", { size: 12, fill: C.bg, weight: 600, anchor: "middle" }) +
    rect(px + 16, 340, 162, 30, C.green, { rx: 9, style: show(9.5, D - 0.5, 0.1) }) +
    text(px + 97, 359.5, "✓ Approved", { size: 12, fill: C.bg, weight: 600, anchor: "middle", style: show(9.5, D - 0.5, 0.1) }) +
    text(px + 97, 390, "Deny", { size: 11, fill: C.muted, anchor: "middle" });
  out.push(`<clipPath id="phone"><rect x="${px + 1}" y="21" width="193" height="391" rx="29"/></clipPath>`);
  out.push(`<g clip-path="url(#phone)"><g style="${anim(`0%,${p(8.0)}{transform:translateY(160px)}${p(8.4)},${p(10.1)}{transform:translateY(0)}${p(10.5)},100%{transform:translateY(160px)}`, "ease-out")}">${sheet}</g></g>`);
  // The tap.
  out.push(`<circle cx="${px + 110}" cy="355" r="13" fill="#ffffff" fill-opacity="0.35" stroke="#ffffff" stroke-width="2" style="opacity:0;${anim(`0%,${p(8.9)}{opacity:0}${p(9.05)}{opacity:1}${p(9.45)}{opacity:1}${p(9.6)},100%{opacity:0}`)}"/>`);
  // Merged banner.
  out.push(g(`${show(15.1)}`,
    rect(px + 10, 52, 174, 40, "#151515", { rx: 12, stroke: C.border }) +
    text(px + 22, 69, "T3 Code", { size: 10, fill: C.muted, weight: 600 }) +
    text(px + 22, 84, "#32947 merged", { size: 11, fill: C.violet, weight: 600 })));

  // Footer: the agents (the active one lights up) and the repo's numbers.
  const agents = ["Claude Code", "Codex", "Cursor", "OpenCode", "Grok Build", "Antigravity", "Kiro", "Pi", "Muse Code", "fx"];
  const lit = { "Claude Code": [3.3, 6.4], Codex: [6.4, D - 0.5] };
  const spans = agents.map((a) => {
    const window = lit[a];
    const style = window
      ? ` style="${anim(`0%,${p(window[0])}{fill:${C.muted}}${p(window[0] + 0.2)},${p(window[1])}{fill:${C.fg}}${p(window[1] + 0.2)},100%{fill:${C.muted}}`)}"`
      : "";
    return `<tspan${style}>${a}</tspan>`;
  });
  out.push(text(W / 2, 442, `Works with ${spans.join(", ")} and any ACP agent`, { size: 12, fill: C.muted, anchor: "middle" }));
  const fmt = (v) => v.toLocaleString("en-US");
  out.push(text(W / 2, 464, esc(`★ ${fmt(stars)} stars  ·  ${fmt(contributors)} contributors  ·  ${release}  ·  MIT  ·  desktop, web, iOS and Android`), { size: 11.5, fill: C.faint, anchor: "middle" }));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="T3 Code: a thread handed from Claude to Codex, approved from a phone, shipped as a pull request"><style>${css.join("")}</style>${out.join("")}</svg>\n`;
}

// Live numbers for the footer, from GitHub's REST API.
export async function t3codeStats(token) {
  const get = (path) =>
    fetch(`https://api.github.com/${path}`, {
      headers: { authorization: `bearer ${token}`, "user-agent": "profile-t3code", accept: "application/vnd.github+json" },
    });
  const [repo, release, contributors] = await Promise.all([
    get("repos/pingdotgg/t3code").then((r) => r.json()),
    get("repos/pingdotgg/t3code/releases/latest").then((r) => r.json()),
    get("repos/pingdotgg/t3code/contributors?per_page=1"),
  ]);
  const last = contributors.headers.get("link")?.match(/[?&]page=(\d+)>; rel="last"/);
  return {
    stars: repo.stargazers_count,
    release: release.tag_name,
    contributors: last ? Number(last[1]) : (await contributors.json()).length,
  };
}
