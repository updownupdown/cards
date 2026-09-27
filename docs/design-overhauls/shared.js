// Shared by the three design overhaul mockups: fake player progress, the
// screen router, and drawing helpers for cards, constellations and portraits.
// Each design brings its own styles and screens.

(function () {
  const { games, quotes, authors, tao } = window.DATA;

  window.TAG_NAMES = {
    KlondikeFamily: "Klondike Family",
    YukonFamily: "Yukon Family",
    FreeCellFamily: "FreeCell Family",
    SpiderFamily: "Spider Family",
    FortyThievesFamily: "Forty Thieves Family",
    CastlesAndFans: "Castles & Fans",
    FoundationBuilders: "Foundation Builders",
    DoubleDeckers: "Double-Deckers",
    ClearTheBoard: "Clear the Board",
    PairMatching: "Pairs & Sums",
    Puzzles: "Puzzles",
    Sports: "Sports",
    PokerAndCribbage: "Poker & Cribbage",
    CardCombat: "Card Combat",
    DungeonCrawler: "Dungeon Crawler",
    ModernMechanics: "Modern Mechanics",
  };

  // ---- Fake progress: 40 wins spreading out from Klondike ----------------
  const byPath = new Map(games.map((g) => [g.path, g]));
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const won = ["/klondike"];
  while (won.length < 40) {
    const open = new Set();
    won.forEach((p) => byPath.get(p).links.forEach((l) => open.add(l)));
    const next = [...open]
      .filter((p) => !won.includes(p) && byPath.has(p))
      .map((p) => byPath.get(p))
      .sort((a, b) => a.difficulty + rand() * 60 - (b.difficulty + rand() * 60));
    if (!next.length) break;
    won.push(next[0].path);
  }
  const unlocked = new Set(["/klondike", ...won]);
  won.forEach((p) => byPath.get(p).links.forEach((l) => unlocked.add(l)));

  const quoteIds = new Set();
  const taoIds = new Set();
  games.forEach((g, i) => {
    g.won = won.includes(g.path);
    g.unlocked = unlocked.has(g.path);
    g.order = won.indexOf(g.path);
    g.tagName = TAG_NAMES[g.tag] || g.tag;
    g.img = "art/" + g.thumb;
    g.plays = g.won ? 2 + Math.floor(rand() * 14) : g.unlocked && rand() > 0.6 ? 1 + Math.floor(rand() * 3) : 0;
    g.wins = g.won ? 1 + Math.floor(rand() * Math.max(1, g.plays - 1)) : 0;
    g.fav = ["/klondike", "/spider-solitaire", "/freecell", "/golf", "/pyramid"].includes(g.path);
    g.plate = i + 1;
    if (g.won)
      g.rewards.forEach((r) => (r.type === "tao" ? taoIds : quoteIds).add(r.id));
  });
  quotes.forEach((q, i) => {
    q.id = i + 1;
    q.collected = quoteIds.has(q.id);
    q.authorData = authors.find((a) => a.name === q.author);
  });
  tao.forEach((c) => (c.collected = taoIds.has(c.chapter)));
  authors.forEach((a) => {
    a.quotes = quotes.filter((q) => q.author === a.name);
    a.collected = a.quotes.some((q) => q.collected);
  });

  const game = (path) => byPath.get(path);
  const tags = Object.keys(TAG_NAMES).map((tag) => {
    const list = games.filter((g) => g.tag === tag);
    return { tag, name: TAG_NAMES[tag], games: list, won: list.filter((g) => g.won).length };
  });

  window.P = {
    games,
    quotes,
    authors,
    tao,
    tags,
    game,
    won: won.map(game),
    // In progress and recently played, for the "continue" rows.
    current: { game: game("/spider-solitaire"), moves: 42, time: "6:18", progress: 0.46 },
    recent: ["/golf", "/freecell", "/pyramid", "/canfield"].map(game).filter(Boolean),
    daily: game("/elementary-detective") || games[20],
    // The game about to be won in the win demo, and what it gives.
    winning: game("/spider-solitaire"),
    newQuote: quotes.find((q) => q.author === "Marcus Aurelius") || quotes[10],
    newChapter: tao[7],
    counts: {
      won: won.length,
      unlocked: unlocked.size,
      quotes: quoteIds.size,
      chapters: taoIds.size,
      authors: authors.filter((a) => a.collected).length,
    },
  };
})();

// ---- Router ---------------------------------------------------------------
// Each page calls Router.init(screens, root) with one render function per
// screen; a render function returns HTML and may return an `after` hook.
window.Router = {
  init(screens, root, first = "home") {
    this.screens = screens;
    this.root = root;
    this.stack = [];
    document.querySelectorAll("[data-jump]").forEach((b) =>
      b.addEventListener("click", () => this.go(b.dataset.jump, b.dataset.arg, { reset: true })),
    );
    root.addEventListener("click", (e) => {
      const el = e.target.closest("[data-go]");
      if (el) {
        e.preventDefault();
        this.go(el.dataset.go, el.dataset.arg);
      }
      if (e.target.closest("[data-back]")) this.back();
    });
    this.go(first);
  },
  go(name, arg, { reset = false, push = true } = {}) {
    if (reset) this.stack = [];
    if (push && this.current) this.stack.push(this.current);
    this.current = { name, arg };
    const out = this.screens[name](arg);
    const html = typeof out === "string" ? out : out.html;
    this.root.innerHTML = html;
    this.root.dataset.screen = name;
    this.root.scrollTop = 0;
    this.root.querySelectorAll(".scroll").forEach((s) => (s.scrollTop = 0));
    if (out.after) out.after(this.root);
    document.querySelectorAll("[data-jump]").forEach((b) =>
      b.setAttribute("aria-current", b.dataset.jump === name ? "true" : "false"),
    );
  },
  back() {
    const prev = this.stack.pop();
    if (prev) this.go(prev.name, prev.arg, { push: false });
  },
};

// ---- Drawing helpers ------------------------------------------------------
window.Draw = {
  esc: (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]),

  suit: { S: "♠", H: "♥", D: "♦", C: "♣" },
  red: (s) => s === "H" || s === "D",

  /** A card as markup; designs style .card, .card.back, .card .pip etc. */
  card(code, { down = false, cls = "" } = {}) {
    if (down) return `<div class="card back ${cls}"></div>`;
    const rank = code.slice(0, -1);
    const s = code.slice(-1);
    return `<div class="card ${Draw.red(s) ? "red" : "black"} ${cls}" data-r="${rank}">
      <span class="idx"><b>${rank}</b><i>${Draw.suit[s]}</i></span>
      <span class="pip">${Draw.suit[s]}</span>
      <span class="idx flip"><b>${rank}</b><i>${Draw.suit[s]}</i></span>
    </div>`;
  },

  /** A Klondike deal partway through. */
  klondike() {
    return {
      foundations: ["AS", "3H", "", "2C"],
      waste: ["9D", "4S", "QC"],
      stock: 14,
      tableau: [
        { down: 0, up: ["KH", "QS", "JD", "10C"] },
        { down: 1, up: ["8H"] },
        { down: 1, up: ["6C", "5H"] },
        { down: 3, up: ["JS", "10H", "9S", "8D"] },
        { down: 3, up: ["5D"] },
        { down: 5, up: ["QH", "JC"] },
        { down: 5, up: ["7S", "6D"] },
      ],
    };
  },

  /**
   * The Klondike table as markup. Designs size it with --cw (card width),
   * --ch, --gap, --down (face-down fan) and --up (face-up fan).
   */
  board(deal = Draw.klondike()) {
    const slot = (label) => `<div class="slot"><span>${label}</span></div>`;
    const found = deal.foundations
      .map((c, i) => (c ? Draw.card(c) : slot(["♠", "♥", "♦", "♣"][i])))
      .map((h) => `<div class="pile">${h}</div>`)
      .join("");
    const waste = `<div class="pile waste">${deal.waste.map((c, i) => `<div class="fan" style="--w:${i}">${Draw.card(c)}</div>`).join("")}</div>`;
    const stock = `<div class="pile stock">${Draw.card("", { down: true })}<em>${deal.stock}</em></div>`;
    const cols = deal.tableau
      .map(({ down, up }) => {
        let h = "";
        for (let d = 0; d < down; d++) h += `<div class="stack" style="--d:${d};--u:0">${Draw.card("", { down: true })}</div>`;
        up.forEach((c, u) => (h += `<div class="stack" style="--d:${down};--u:${u}">${Draw.card(c, { cls: u === up.length - 1 && c === "8D" ? "hinted" : "" })}</div>`));
        return `<div class="col">${slot("K")}${h}</div>`;
      })
      .join("");
    return `<div class="board"><div class="toprow">${found}<div class="spacer"></div>${waste}${stock}</div><div class="tableau">${cols}</div></div>`;
  },

  /** A Tao constellation as an SVG, drawn on its 100 x 100 grid. */
  constellation(fig, { size = 200, stroke = "currentColor", star = "currentColor", glow = true, lines = true, pad = 8, strokeWidth = 0.5 } = {}) {
    const stars = fig.stars.map((s) => (Array.isArray(s) ? { x: s[0], y: s[1], mag: s[2] } : s));
    const strokes = lines
      ? fig.strokes
          .map((idx) => `<polyline points="${idx.map((i) => `${stars[i].x},${stars[i].y}`).join(" ")}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>`)
          .join("")
      : "";
    const dots = stars
      .map((s) => `${glow ? `<circle cx="${s.x}" cy="${s.y}" r="${s.mag * 1.6}" fill="${star}" opacity=".12"/>` : ""}<circle cx="${s.x}" cy="${s.y}" r="${0.35 + s.mag * 0.42}" fill="${star}"/>`)
      .join("");
    return `<svg viewBox="${-pad} ${-pad} ${100 + pad * 2} ${100 + pad * 2}" width="${size}" height="${size}" aria-hidden="true">${strokes}${dots}</svg>`;
  },

  /** An author's one-line portrait (200 x 240 box). */
  portrait(author, { stroke = "currentColor", width = 1.6, cls = "" } = {}) {
    return `<svg class="portrait ${cls}" viewBox="0 0 200 240" aria-hidden="true"><path d="${author.portrait}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg>`;
  },

  years(a) {
    const y = (n) => (n < 0 ? `${-n} BC` : n);
    const s = a.died == null ? `b. ${y(a.born)}` : `${y(a.born)}–${y(a.died)}`;
    return a.circa ? `c. ${s}` : s;
  },

  roman(n) {
    const m = [[50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    let out = "";
    if (n >= 100) return String(n);
    for (const [v, r] of m) while (n >= v) (out += r), (n -= v);
    return out;
  },

  /** Seeded background stars for sky screens. */
  starfield(n, w, h, seed = 3) {
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let out = "";
    for (let i = 0; i < n; i++)
      out += `<circle cx="${(rand() * w).toFixed(1)}" cy="${(rand() * h).toFixed(1)}" r="${(0.3 + rand() * rand() * 1.4).toFixed(2)}" opacity="${(0.25 + rand() * 0.6).toFixed(2)}"/>`;
    return out;
  },

  /** Line icons (24 x 24, currentColor); stroke width set by CSS. */
  icon(name, size = 20) {
    const p = {
      moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
      home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
      orbit: '<circle cx="12" cy="12" r="2.5"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)"/>',
      frame: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="8.5" r="1.5"/>',
      search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
      back: '<path d="M15 5l-7 7 7 7"/>',
      close: '<path d="M6 6l12 12M18 6L6 18"/>',
      more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
      undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
      hint: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
      restart: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5"/><path d="M4 3v5.5h5.5"/>',
      star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
      stats: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
      gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
      play: '<path d="M7 4l13 8-13 8z"/>',
      shuffle: '<path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3"/>',
      book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
      quote: '<path d="M10 7H6a2 2 0 0 0-2 2v3h5v5H5M20 7h-4a2 2 0 0 0-2 2v3h5v5h-4"/>',
      lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
      right: '<path d="M9 5l7 7-7 7"/>',
      left: '<path d="M15 5l-7 7 7 7"/>',
      stars: '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5zM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
      person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
      grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
      filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
      eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    }[name];
    return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  },

  /** The campaign map projected to a w x h box around Klondike. */
  mapPoints(w, h, scale = 1) {
    const s = Math.min(w, h) * 0.46 * scale;
    return P.games.map((g) => ({ g, x: w / 2 + g.x * s, y: h / 2 + g.y * s }));
  },
};
