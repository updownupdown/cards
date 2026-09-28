// Card face generator for the studio page. Everything is drawn on a
// 250 x 350 card. Exposes window.CardStudio.

(function () {
  // ---- Suits, on a 24 grid -------------------------------------------------
  const P = {
    heart:
      "M12 21C7 16.9 3.5 13.6 3.5 9.4 3.5 6.6 5.6 4.5 8.3 4.5c1.6 0 2.9.8 3.7 2.1.8-1.3 2.1-2.1 3.7-2.1 2.7 0 4.8 2.1 4.8 4.9 0 4.2-3.5 7.5-8.5 11.6z",
    diamond: "M12 2.5 19 12l-7 9.5L5 12z",
    spade:
      "M12 2.5C9.3 6.4 4.3 9 4.3 13.4c0 2.6 2.1 4.5 4.6 4.3 1.4-.1 2.4-.9 3.1-2 .7 1.1 1.7 1.9 3.1 2 2.5.2 4.6-1.7 4.6-4.3C19.7 9 14.7 6.4 12 2.5z",
    spadeStem: "M12 14.5c0 3.2-.9 5.3-2.9 7h5.8c-2-1.7-2.9-3.8-2.9-7z",
    club: "M12 2.8a3.9 3.9 0 0 0-3.4 5.8 3.9 3.9 0 1 0 2 6.6c.3-.2.6-.4.9-.7-.1 3.1-1 5.1-2.7 6.7h6.4c-1.7-1.6-2.6-3.6-2.7-6.7.3.3.6.5.9.7a3.9 3.9 0 1 0 2-6.6A3.9 3.9 0 0 0 12 2.8z",
  };

  const circle = (cx, cy, r) =>
    `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;

  // Each set: a function (suit, color, stock) returning SVG in a 24 box.
  const SUIT_SETS = {
    classic: (s, c) => {
      const d = {
        S: P.spade + P.spadeStem,
        H: P.heart,
        D: P.diamond,
        C: P.club,
      }[s];
      return `<path d="${d}" fill="${c}"/>`;
    },
    engraved: (s, c, stock) => {
      const d = { S: P.spade, H: P.heart, D: P.diamond, C: P.club }[s];
      const inner = `<path d="${d}" fill="none" stroke="${stock}" stroke-width=".7" transform="translate(12 12) scale(.62) translate(-12 -12)" opacity=".85"/>`;
      return `<path d="${d}" fill="${c}"/>${s === "S" ? `<path d="${P.spadeStem}" fill="${c}"/>` : ""}${inner}`;
    },
    geometric: (s, c) => {
      const shapes = {
        H: circle(8.2, 9, 4.6) + circle(15.8, 9, 4.6) + "M3.8 10.8h16.4L12 21z",
        D: "M12 2.5 21.5 12 12 21.5 2.5 12z",
        C:
          circle(12, 7, 4.1) +
          circle(7, 13.2, 4.1) +
          circle(17, 13.2, 4.1) +
          "M12 10.5 8.3 21.5h7.4z",
        S:
          circle(8.2, 13.5, 4.6) +
          circle(15.8, 13.5, 4.6) +
          "M3.8 11.7h16.4L12 2z" +
          "M12 12.5 8.5 21.8h7z",
      };
      return `<path d="${shapes[s]}" fill="${c}"/>`;
    },
    deco: (s, c, stock) => {
      const shapes = {
        H: "M12 21.5 2.8 11.2 3.4 6.9 6.8 3.8H9.6L12 6.3l2.4-2.5h2.8l3.4 3.1.6 4.3z",
        D: "M12 1.5 18.2 12 12 22.5 5.8 12z",
        S: "M12 1.8 21 11.3 20.2 15.4 16.8 17.4 13.2 15.9 14.8 21.8H9.2L10.8 15.9 7.2 17.4 3.8 15.4 3 11.3z",
        C: "M12 2.5l3.3 2v3.8L12 10.2 8.7 8.3V4.5zM7.3 10.2l3.2 1.9v3.8l-3.2 1.9-3.3-1.9v-3.8zM16.7 10.2l3.3 1.9v3.8l-3.3 1.9-3.2-1.9v-3.8zM12 11.8l2.6 9.7H9.4z",
      };
      const line = {
        H: "M12 20.5V7",
        D: "M12 3.5v17",
        S: "M12 3.5v12",
        C: "M12 4v5",
      }[s];
      return `<path d="${shapes[s]}" fill="${c}"/><path d="${line}" stroke="${stock}" stroke-width=".6" opacity=".7"/>`;
    },
    stars: (s, c) => {
      const d = {
        S: P.spade + P.spadeStem,
        H: P.heart,
        D: P.diamond,
        C: P.club,
      }[s];
      const dots = {
        S: [
          [12, 2.8],
          [4.6, 13.4],
          [19.4, 13.4],
          [12, 21.2],
        ],
        H: [
          [12, 20.6],
          [4, 9.2],
          [20, 9.2],
          [12, 6.8],
        ],
        D: [
          [12, 2.9],
          [18.6, 12],
          [12, 21.1],
          [5.4, 12],
        ],
        C: [
          [12, 3.2],
          [3.6, 12.4],
          [20.4, 12.4],
          [12, 21.2],
        ],
      }[s];
      return (
        `<path d="${d}" fill="${c}" fill-opacity=".14" stroke="${c}" stroke-width=".9" stroke-linejoin="round"/>` +
        dots
          .map(
            ([x, y]) =>
              `<circle cx="${x}" cy="${y}" r="1.6" fill="${c}" opacity=".25"/><circle cx="${x}" cy="${y}" r=".8" fill="${c}"/>`,
          )
          .join("")
      );
    },
    woodcut: (s, c, stock) => {
      const d = {
        S: P.spade + P.spadeStem,
        H: P.heart,
        D: P.diamond,
        C: P.club,
      }[s];
      const cut = {
        S: "M9 13.2c-.8-1.8.2-3.8 2.2-5.4",
        H: "M7.3 7.3c-1.2.5-1.9 1.6-1.9 2.9",
        D: "M9.5 9.2 8 12",
        C: "M9.5 5.8c.3-.9 1-1.4 1.8-1.6",
      }[s];
      return `<path d="${d}" fill="${c}" stroke="${c}" stroke-width=".8" stroke-linejoin="round"/><path d="${cut}" fill="none" stroke="${stock}" stroke-width="1.1" stroke-linecap="round"/>`;
    },
  };

  // ---- Designs --------------------------------------------------------------
  const DESIGNS = [
    {
      id: "C1",
      name: "Nocturne Classic",
      note: "The deck players expect, redrawn cleanly: EB Garamond indices, traditional suits, and double-ended fine-line courts.",
      font: "'EB Garamond', Georgia, serif",
      weight: 600,
      italic: false,
      suits: "classic",
      court: "line",
      mirror: true,
      stock: "#fbf8f1",
      black: "#1d1f27",
      red: "#c2263b",
      gold: "#b98a3e",
      frame: true,
    },
    {
      id: "C2",
      name: "Folio Engraved",
      note: "Cormorant italic numerals and inlaid suits, with courts drawn in hatched lines like a copperplate engraving.",
      font: "'Cormorant Garamond', Georgia, serif",
      weight: 700,
      italic: true,
      suits: "engraved",
      court: "engraved",
      mirror: true,
      stock: "#f6efe2",
      black: "#2a2420",
      red: "#b3372a",
      gold: "#a8823c",
      frame: true,
    },
    {
      id: "C3",
      name: "Prism Modern",
      note: "Outfit bold indices, suits built from circles and triangles, and colour-block Bauhaus courts. Very legible small.",
      font: "'Outfit', system-ui, sans-serif",
      weight: 700,
      italic: false,
      suits: "geometric",
      court: "block",
      mirror: false,
      stock: "#f7f7f5",
      black: "#15161b",
      red: "#e0392f",
      gold: "#f2b33d",
      frame: false,
    },
    {
      id: "C4",
      name: "Gilded Deco",
      note: "Poiret One numerals, faceted suits and symmetrical courts set against a sunburst, in black and gold.",
      font: "'Poiret One', 'Futura', sans-serif",
      weight: 400,
      italic: false,
      suits: "deco",
      court: "deco",
      mirror: true,
      stock: "#f8f3e6",
      black: "#191715",
      red: "#a82a3a",
      gold: "#b8913f",
      frame: true,
    },
    {
      id: "C5",
      name: "Night Chart",
      note: "Dark stock with pale ink: suits and courts drawn as constellations. The deck that belongs on the Odyssey map.",
      font: "'Jost', system-ui, sans-serif",
      weight: 400,
      italic: false,
      suits: "stars",
      court: "stars",
      mirror: false,
      stock: "#141726",
      black: "#e6e8f4",
      red: "#ff8f8f",
      gold: "#ffcf87",
      frame: false,
      dark: true,
    },
    {
      id: "C6",
      name: "Woodcut Tarot",
      note: "IM Fell small caps and chunky carved suits; courts as bold black woodcut silhouettes with cut-away detail.",
      font: "'IM Fell English SC', Georgia, serif",
      weight: 400,
      italic: false,
      suits: "woodcut",
      court: "woodcut",
      mirror: false,
      stock: "#f3ead6",
      black: "#1a1511",
      red: "#b2291e",
      gold: "#c89b3c",
      frame: true,
    },
    {
      id: "C7",
      name: "Four-Colour Index",
      note: "DM Mono indices and a four-colour deck (green clubs, blue diamonds) for fast reading in tight layouts. Courts are monograms.",
      font: "'DM Mono', ui-monospace, monospace",
      weight: 500,
      italic: false,
      suits: "classic",
      court: "mono",
      mirror: false,
      fourColour: true,
      stock: "#fafafa",
      black: "#17181c",
      red: "#d3263a",
      blue: "#1f6fd1",
      green: "#1c9a52",
      gold: "#c9962f",
      frame: false,
    },
  ];

  const colourOf = (d, s) =>
    d.fourColour
      ? { S: d.black, H: d.red, D: d.blue, C: d.green }[s]
      : s === "H" || s === "D"
        ? d.red
        : d.black;

  const suit = (d, s, x, y, size, flip = false) => {
    const scale = size / 24;
    const t =
      `translate(${x - size / 2} ${y - size / 2}) scale(${scale})` +
      (flip ? " rotate(180 12 12)" : "");
    return `<g transform="${t}">${SUIT_SETS[d.suits](s, colourOf(d, s), d.stock)}</g>`;
  };

  const rankText = (d, rank, x, y, size, colour, anchor = "middle") =>
    `<text x="${x}" y="${y}" font-family="${d.font}" font-weight="${d.weight}" ${d.italic ? 'font-style="italic"' : ""} font-size="${size}" fill="${colour}" text-anchor="${anchor}" dominant-baseline="alphabetic">${rank}</text>`;

  // Standard pip positions in a unit box; the third value turns a pip over.
  const PIPS = {
    2: [
      [0.5, 0],
      [0.5, 1, 1],
    ],
    3: [
      [0.5, 0],
      [0.5, 0.5],
      [0.5, 1, 1],
    ],
    4: [
      [0, 0],
      [1, 0],
      [0, 1, 1],
      [1, 1, 1],
    ],
    5: [
      [0, 0],
      [1, 0],
      [0.5, 0.5],
      [0, 1, 1],
      [1, 1, 1],
    ],
    6: [
      [0, 0],
      [1, 0],
      [0, 0.5],
      [1, 0.5],
      [0, 1, 1],
      [1, 1, 1],
    ],
    7: [
      [0, 0],
      [1, 0],
      [0.5, 0.25],
      [0, 0.5],
      [1, 0.5],
      [0, 1, 1],
      [1, 1, 1],
    ],
    8: [
      [0, 0],
      [1, 0],
      [0.5, 0.25],
      [0, 0.5],
      [1, 0.5],
      [0.5, 0.75, 1],
      [0, 1, 1],
      [1, 1, 1],
    ],
    9: [
      [0, 0],
      [1, 0],
      [0, 1 / 3],
      [1, 1 / 3],
      [0.5, 0.5],
      [0, 2 / 3, 1],
      [1, 2 / 3, 1],
      [0, 1, 1],
      [1, 1, 1],
    ],
    10: [
      [0, 0],
      [1, 0],
      [0.5, 1 / 6],
      [0, 1 / 3],
      [1, 1 / 3],
      [0, 2 / 3, 1],
      [1, 2 / 3, 1],
      [0.5, 5 / 6, 1],
      [0, 1, 1],
      [1, 1, 1],
    ],
  };

  const pips = (d, s, n, box, size) =>
    PIPS[n]
      .map(([u, v, f]) =>
        suit(d, s, box.x + u * box.w, box.y + v * box.h, size, !!f),
      )
      .join("");

  // ---- Courts ----------------------------------------------------------------
  // A half figure on a 100 x 72 grid, bust cut at the bottom edge.
  const FIG = {
    shoulders: "M6 72C9 54 26 45 50 45S91 54 94 72Z",
    neck: "M36 49 50 66 64 49",
    head: [50, 29, 11.5],
    K: {
      hat: "M37 20 38.5 6 44.5 12.5 50 3.5 55.5 12.5 61.5 6 63 20Z",
      face: "M41 33Q50 49 59 33",
      prop: "M84 8 77 71",
      propEnd: [84, 7, 3.2],
    },
    Q: {
      hat: "M38.5 20Q50 7 61.5 20",
      face: "M38 23Q31 45 28 64M62 23Q69 45 72 64",
      prop: "M17 28c-3-6 3-9 5-4 2-5 8-2 5 4-3 5-7 4-10 0zM22 30v40",
      propEnd: null,
    },
    J: {
      hat: "M37.5 21Q50 10 62.5 21L63.5 24H36.5Z",
      face: "M61 17Q75 1 87 7Q74 9 63 20",
      prop: "M16 6 21 71M11 12l10-5 3 8",
      propEnd: null,
    },
  };
  // Where the constellation court puts its stars.
  const FIG_STARS = {
    K: [
      [37, 20],
      [38.5, 6],
      [50, 3.5],
      [61.5, 6],
      [63, 20],
      [6, 72],
      [94, 72],
      [50, 66],
      [84, 7],
      [77, 71],
    ],
    Q: [
      [38.5, 20],
      [50, 13.5],
      [61.5, 20],
      [28, 64],
      [72, 64],
      [6, 72],
      [94, 72],
      [50, 66],
      [22, 26],
    ],
    J: [
      [37.5, 21],
      [62.5, 21],
      [50, 15.5],
      [87, 7],
      [6, 72],
      [94, 72],
      [50, 66],
      [16, 6],
      [21, 71],
    ],
  };

  function halfFigure(d, rank, s) {
    const c = colourOf(d, s);
    const f = FIG[rank];
    const [hx, hy, hr] = FIG.head;
    const ink = d.black;
    const emblem = `<g transform="translate(43 56) scale(.58)">${SUIT_SETS[d.suits === "stars" ? "classic" : d.suits](s, d.court === "woodcut" ? d.stock : c, d.stock)}</g>`;
    switch (d.court) {
      case "line":
      case "engraved": {
        const hatch =
          d.court === "engraved"
            ? Array.from(
                { length: 12 },
                (_, i) =>
                  `<path d="M${12 + i * 7} 72 ${22 + i * 7} 50" stroke="${ink}" stroke-width=".45" opacity=".55"/>`,
              ).join("")
            : "";
        return (
          `<defs><clipPath id="sh-${d.id}-${rank}"><path d="${FIG.shoulders}"/></clipPath></defs>` +
          `<path d="${FIG.shoulders}" fill="${c}" fill-opacity=".14" stroke="${ink}" stroke-width="1.1"/>` +
          `<g clip-path="url(#sh-${d.id}-${rank})">${hatch}</g>` +
          `<path d="${FIG.neck}" fill="none" stroke="${ink}" stroke-width="1.1"/>` +
          `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${d.stock}" stroke="${ink}" stroke-width="1.1"/>` +
          `<path d="${f.hat}" fill="${d.gold}" fill-opacity=".55" stroke="${ink}" stroke-width="1.1" stroke-linejoin="round"/>` +
          `<path d="${f.face}" fill="none" stroke="${ink}" stroke-width="1"/>` +
          `<path d="${f.prop}" fill="none" stroke="${ink}" stroke-width="1.1" stroke-linecap="round"/>` +
          (f.propEnd
            ? `<circle cx="${f.propEnd[0]}" cy="${f.propEnd[1]}" r="${f.propEnd[2]}" fill="${d.gold}" stroke="${ink}" stroke-width="1"/>`
            : "") +
          emblem
        );
      }
      case "deco": {
        const rays = Array.from({ length: 13 }, (_, i) => {
          const a = Math.PI + (i / 12) * Math.PI;
          return `<path d="M50 72 ${50 + Math.cos(a) * 60} ${72 + Math.sin(a) * 60}" stroke="${d.gold}" stroke-width="${i % 2 ? 0.5 : 1.2}"/>`;
        }).join("");
        return (
          rays +
          `<path d="${FIG.shoulders}" fill="${ink}"/>` +
          `<path d="${FIG.neck}" fill="none" stroke="${d.gold}" stroke-width="1.6"/>` +
          `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${d.stock}" stroke="${d.gold}" stroke-width="1.6"/>` +
          `<path d="${f.hat}" fill="${d.gold}"/>` +
          `<path d="${f.face}" fill="none" stroke="${ink}" stroke-width="1.2"/>` +
          `<path d="${f.prop}" fill="none" stroke="${d.gold}" stroke-width="1.6" stroke-linecap="round"/>` +
          `<g transform="translate(43 56) scale(.58)">${SUIT_SETS.deco(s, d.gold, d.stock)}</g>`
        );
      }
      case "block": {
        return (
          `<rect x="0" y="0" width="100" height="72" fill="${d.gold}" opacity=".22"/>` +
          `<path d="M6 72C9 54 26 45 50 45V72Z" fill="${c}"/><path d="M50 45c24 0 41 9 44 27H50Z" fill="${ink}"/>` +
          `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${d.gold}"/>` +
          `<path d="M${hx} ${hy - hr}a${hr} ${hr} 0 0 1 0 ${hr * 2}z" fill="${ink}" opacity=".18"/>` +
          `<path d="${f.hat}" fill="${ink}"/>` +
          (f.propEnd
            ? `<circle cx="${f.propEnd[0]}" cy="${f.propEnd[1]}" r="${f.propEnd[2] + 1}" fill="${c}"/>`
            : "") +
          `<path d="${f.prop}" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>` +
          `<g transform="translate(43 56) scale(.58)">${SUIT_SETS.geometric(s, d.stock, d.stock)}</g>`
        );
      }
      case "stars": {
        const lines = `<g fill="none" stroke="${d.gold}" stroke-opacity=".5" stroke-width=".7" stroke-linejoin="round"><path d="${FIG.shoulders}"/><path d="${FIG.neck}"/><circle cx="${hx}" cy="${hy}" r="${hr}"/><path d="${f.hat}"/><path d="${f.face}"/><path d="${f.prop}"/></g>`;
        return (
          lines +
          FIG_STARS[rank]
            .map(
              ([x, y], i) =>
                `<circle cx="${x}" cy="${y}" r="${i % 3 ? 2 : 3.2}" fill="${d.gold}" opacity=".2"/><circle cx="${x}" cy="${y}" r="${i % 3 ? 0.9 : 1.4}" fill="${i % 4 ? d.black : d.gold}"/>`,
            )
            .join("")
        );
      }
      case "woodcut": {
        return (
          `<path d="${FIG.shoulders}" fill="${ink}"/>` +
          `<path d="M22 72c2-10 8-17 16-20M78 72c-2-10-8-17-16-20" stroke="${d.stock}" stroke-width="1.6" fill="none"/>` +
          `<circle cx="${hx}" cy="${hy}" r="${hr + 1}" fill="${ink}"/>` +
          `<path d="M44 27h3M53 27h3M46 35q4 3 8 0" stroke="${d.stock}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
          `<path d="${f.hat}" fill="${c}" stroke="${ink}" stroke-width="1.5"/>` +
          `<path d="${f.prop}" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>` +
          (f.propEnd
            ? `<circle cx="${f.propEnd[0]}" cy="${f.propEnd[1]}" r="${f.propEnd[2] + 0.8}" fill="${c}" stroke="${ink}" stroke-width="1.5"/>`
            : "") +
          emblem
        );
      }
    }
    return "";
  }

  function courtArt(d, rank, s, box) {
    if (d.court === "mono") {
      const c = colourOf(d, s);
      const emblem = { K: FIG.K.hat, Q: FIG.Q.hat, J: FIG.J.hat }[rank];
      return (
        `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="10" fill="${c}" fill-opacity=".07" stroke="${c}" stroke-opacity=".35"/>` +
        `<g transform="translate(${box.x + box.w / 2 - 50} ${box.y + box.h * 0.04})"><path d="${emblem}" fill="${d.gold}" stroke="${d.gold}" stroke-width="2" stroke-linejoin="round"/></g>` +
        rankText(
          d,
          rank,
          box.x + box.w / 2,
          box.y + box.h * 0.72,
          box.h * 0.48,
          c,
        ) +
        suit(d, s, box.x + box.w / 2, box.y + box.h * 0.86, box.h * 0.12)
      );
    }
    const half = box.h / 2;
    const clipId = `cc-${d.id}-${rank}-${s}-${Math.round(box.w)}`;
    const clip = `<defs><clipPath id="${clipId}"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="4"/></clipPath></defs>`;
    const backdrop =
      d.court === "block"
        ? `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="4" fill="${d.gold}" opacity=".22"/>`
        : "";
    if (!d.mirror) {
      // One large bust, standing on the lower edge of the box.
      const s2 = (box.h * 0.66) / 72;
      const w2 = 100 * s2;
      return (
        clip +
        backdrop +
        `<g clip-path="url(#${clipId})"><g transform="translate(${box.x + (box.w - w2) / 2} ${box.y + box.h - 72 * s2}) scale(${s2})">${halfFigure(d, rank, s)}</g></g>`
      );
    }
    // Double-ended: a bust in each half, the lower one turned over, filling
    // its half (the shoulders run off the sides, as on real court cards).
    const scale = (half * 0.97) / 72;
    const w = 100 * scale;
    const x = box.x + (box.w - w) / 2;
    const top = `<g transform="translate(${x} ${box.y + half - 72 * scale}) scale(${scale})">${halfFigure(d, rank, s)}</g>`;
    const cx = box.x + box.w / 2;
    const cy = box.y + half;
    return (
      clip +
      `<g clip-path="url(#${clipId})">${top}<g transform="rotate(180 ${cx} ${cy})">${top}</g></g>` +
      `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="4" fill="none" stroke="${d.black}" stroke-width="1"/>` +
      `<path d="M${box.x} ${cy}H${box.x + box.w}" stroke="${d.black}" stroke-width=".8"/>`
    );
  }

  function jokerArt(d, box) {
    const c = d.red;
    const s = Math.min(box.w / 100, box.h / 120);
    const x = box.x + (box.w - 100 * s) / 2;
    const y = box.y + (box.h - 120 * s) / 2;
    const ink = d.black;
    let fig;
    if (d.court === "mono") {
      return (
        `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="10" fill="${d.gold}" fill-opacity=".1" stroke="${d.gold}" stroke-opacity=".5"/>` +
        `<text x="${box.x + box.w / 2}" y="${box.y + box.h * 0.55}" font-family="${d.font}" font-size="${box.w * 0.2}" fill="${ink}" text-anchor="middle" letter-spacing="4">JOKER</text>` +
        `<text x="${box.x + box.w / 2}" y="${box.y + box.h * 0.78}" font-size="${box.w * 0.22}" fill="${d.gold}" text-anchor="middle">★</text>`
      );
    }
    const hat =
      "M22 58C18 36 26 20 38 12 40 26 45 34 50 40 55 34 60 26 62 12 74 20 82 36 78 58Z";
    const face = [50, 66, 15];
    const collar =
      "M18 96 30 82 40 94 50 82 60 94 70 82 82 96 72 106 60 98 50 108 40 98 28 106Z";
    const bells = [
      [22, 58],
      [78, 58],
      [38, 12],
      [62, 12],
    ];
    if (d.court === "stars") {
      fig =
        `<g fill="none" stroke="${d.gold}" stroke-opacity=".55" stroke-width=".8" stroke-linejoin="round"><path d="${hat}"/><circle cx="${face[0]}" cy="${face[1]}" r="${face[2]}"/><path d="${collar}"/></g>` +
        [...bells, [50, 40], [18, 96], [82, 96], [50, 108]]
          .map(
            ([bx, by], i) =>
              `<circle cx="${bx}" cy="${by}" r="3" fill="${d.gold}" opacity=".22"/><circle cx="${bx}" cy="${by}" r="${i < 4 ? 1.6 : 1}" fill="${i < 4 ? d.gold : d.black}"/>`,
          )
          .join("");
    } else {
      const fillHat =
        d.court === "block"
          ? c
          : d.court === "woodcut" || d.court === "deco"
            ? ink
            : c;
      const strokeW = d.court === "block" ? 0 : 1.2;
      fig =
        (d.court === "deco"
          ? Array.from({ length: 16 }, (_, i) => {
              const a = (i / 16) * Math.PI * 2;
              return `<path d="M50 66 ${50 + Math.cos(a) * 58} ${66 + Math.sin(a) * 58}" stroke="${d.gold}" stroke-width="${i % 2 ? 0.5 : 1.1}"/>`;
            }).join("")
          : "") +
        `<path d="${hat}" fill="${fillHat}" ${strokeW ? `stroke="${ink}" stroke-width="${strokeW}"` : ""}/>` +
        (d.court === "block"
          ? `<path d="M50 40 62 12 78 58H50Z" fill="${d.gold}"/>`
          : "") +
        `<path d="M50 40V58" stroke="${d.court === "woodcut" || d.court === "deco" ? d.gold : ink}" stroke-width="1.2"/>` +
        `<circle cx="${face[0]}" cy="${face[1]}" r="${face[2]}" fill="${d.stock}" ${strokeW ? `stroke="${ink}" stroke-width="${strokeW}"` : ""}/>` +
        `<path d="M42 70q8 7 16 0M44 62h3M53 62h3" fill="none" stroke="${ink}" stroke-width="1.4" stroke-linecap="round"/>` +
        `<path d="${collar}" fill="${d.court === "block" ? ink : d.gold}" fill-opacity="${d.court === "line" || d.court === "engraved" ? 0.6 : 1}" ${strokeW ? `stroke="${ink}" stroke-width="${strokeW}"` : ""}/>` +
        bells
          .map(
            ([bx, by]) =>
              `<circle cx="${bx}" cy="${by}" r="4" fill="${d.gold}" ${strokeW ? `stroke="${ink}" stroke-width="1"` : ""}/>`,
          )
          .join("");
    }
    return `<g transform="translate(${x} ${y}) scale(${s})">${fig}</g>`;
  }

  function aceArt(d, s, cx, cy, size) {
    const c = colourOf(d, s);
    let deco = "";
    if (d.court === "line" || d.court === "engraved") {
      deco = `<circle cx="${cx}" cy="${cy}" r="${size * 0.78}" fill="none" stroke="${d.gold}" stroke-width="1"/><circle cx="${cx}" cy="${cy}" r="${size * 0.84}" fill="none" stroke="${d.gold}" stroke-width=".5"/>`;
    } else if (d.court === "deco") {
      deco = Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const r1 = size * 0.62,
          r2 = size * (i % 2 ? 0.8 : 0.95);
        return `<path d="M${cx + Math.cos(a) * r1} ${cy + Math.sin(a) * r1}L${cx + Math.cos(a) * r2} ${cy + Math.sin(a) * r2}" stroke="${d.gold}" stroke-width="${i % 2 ? 0.8 : 1.6}"/>`;
      }).join("");
    } else if (d.court === "stars") {
      deco =
        Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          const r = size * 0.85;
          return `<circle cx="${cx + Math.cos(a) * r}" cy="${cy + Math.sin(a) * r}" r="${i % 4 ? 0.9 : 1.8}" fill="${d.gold}"/>`;
        }).join("") +
        `<circle cx="${cx}" cy="${cy}" r="${size * 0.85}" fill="none" stroke="${d.gold}" stroke-opacity=".3" stroke-width=".6"/>`;
    } else if (d.court === "block") {
      deco = `<circle cx="${cx}" cy="${cy}" r="${size * 0.7}" fill="${d.gold}" opacity=".3"/>`;
    } else if (d.court === "woodcut") {
      deco = Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return `<path d="M${cx + Math.cos(a) * size * 0.66} ${cy + Math.sin(a) * size * 0.66}L${cx + Math.cos(a + 0.13) * size * 0.9} ${cy + Math.sin(a + 0.13) * size * 0.9}L${cx + Math.cos(a - 0.13) * size * 0.9} ${cy + Math.sin(a - 0.13) * size * 0.9}Z" fill="${d.black}"/>`;
      }).join("");
    }
    return deco + suit(d, s, cx, cy, size * (d.court === "mono" ? 0.9 : 1.1));
    // (c is used by suit via colourOf)
  }

  // ---- Faces ----------------------------------------------------------------
  const RANK_LABEL = { 1: "A", 11: "J", 12: "Q", 13: "K" };

  /** A card face. rank: 1..13 or "joker"; layout: regular | tableau | small. */
  function face(d, rank, s, layout = "regular") {
    const W = 250,
      H = 350;
    const joker = rank === "joker";
    const label = joker ? "★" : RANK_LABEL[rank] || String(rank);
    const c = joker ? d.red : colourOf(d, s);
    const border = d.dark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.12)";
    let body = "";
    let index = "";
    if (layout === "regular") {
      const idx = (flip) =>
        `<g ${flip ? `transform="rotate(180 ${W / 2} ${H / 2})"` : ""}>` +
        (joker
          ? `<text x="24" y="44" font-family="${d.font}" font-size="18" fill="${c}" text-anchor="middle" writing-mode="tb" letter-spacing="1">JOKER</text>`
          : rankText(d, label, 26, 50, 38, c) + suit(d, s, 26, 70, 20)) +
        `</g>`;
      index = idx(false) + idx(true);
      const box = { x: 62, y: 62, w: 126, h: 226 };
      if (joker) body = jokerArt(d, { x: 54, y: 64, w: 142, h: 222 });
      else if (rank === 1) body = aceArt(d, s, W / 2, H / 2, 86);
      else if (rank > 10)
        body = courtArt(d, label, s, { x: 58, y: 58, w: 134, h: 234 });
      else
        body = pips(
          d,
          s,
          rank,
          { x: box.x + 8, y: box.y + 10, w: box.w - 16, h: box.h - 20 },
          34,
        );
    } else if (layout === "tableau") {
      index = joker
        ? `<text x="20" y="52" font-family="${d.font}" font-size="34" fill="${c}" letter-spacing="2">JOKER</text>`
        : rankText(d, label, 20, 60, 56, c, "start") +
          suit(d, s, 20 + (label.length > 1 ? 78 : 50) + 18, 42, 36);
      const box = { x: 58, y: 108, w: 134, h: 222 };
      if (joker) body = jokerArt(d, { x: 60, y: 110, w: 130, h: 220 });
      else if (rank === 1) body = aceArt(d, s, W / 2, 222, 70);
      else if (rank > 10)
        body = courtArt(d, label, s, { x: 64, y: 104, w: 122, h: 226 });
      else
        body = pips(
          d,
          s,
          rank,
          { x: box.x + 8, y: box.y + 8, w: box.w - 16, h: box.h - 16 },
          28,
        );
    } else {
      index = joker
        ? `<text x="18" y="92" font-family="${d.font}" font-size="52" fill="${c}">★</text>`
        : rankText(d, label, 18, 104, label.length > 1 ? 96 : 118, c, "start") +
          suit(d, s, 58, 162, 80);
      const box = { x: 126, y: 198, w: 104, h: 134 };
      if (joker) body = jokerArt(d, { x: 110, y: 178, w: 124, h: 156 });
      else if (rank === 1) body = aceArt(d, s, 190, 280, 40);
      else if (rank > 10)
        body = courtArt(d, label, s, { x: 128, y: 190, w: 104, h: 144 });
      else body = pips(d, s, Math.min(rank, 10), box, 18);
    }
    const frame =
      d.frame && layout === "regular" && rank !== 1
        ? `<rect x="50" y="50" width="150" height="250" rx="6" fill="none" stroke="${d.gold}" stroke-opacity=".0"/>`
        : "";
    return (
      `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${joker ? "Joker" : label + " of " + { S: "spades", H: "hearts", D: "diamonds", C: "clubs" }[s]}">` +
      `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="16" fill="${d.stock}" stroke="${border}" stroke-width="2"/>` +
      frame +
      body +
      index +
      `</svg>`
    );
  }

  /** A single suit, for the downloadable set. */
  function suitGlyph(d, s, size = 64) {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${SUIT_SETS[d.suits](s, colourOf(d, s), d.stock)}</svg>`;
  }

  /** A rank alone, as text in the design's face. */
  function rankGlyph(d, label, colour) {
    return `<svg viewBox="0 0 60 72" xmlns="http://www.w3.org/2000/svg">${rankText(d, label, 30, 56, label.length > 1 ? 42 : 58, colour)}</svg>`;
  }

  window.CardStudio = { DESIGNS, face, suitGlyph, rankGlyph, colourOf };
})();
