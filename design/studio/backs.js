// Card backs for the studio page, drawn in the chosen app theme's colours.
// Exposes window.BackStudio.

(function () {
  const W = 250,
    H = 350,
    CX = 125,
    CY = 175;
  const SPADE =
    "M16 3C12.2 8 4.5 11.4 4.5 17c0 3.6 3.2 5.9 6.6 5.5 2.1-.2 3.7-1.6 4.9-3.5 1.2 1.9 2.8 3.3 4.9 3.5 3.4.4 6.6-1.9 6.6-5.5C27.5 11.4 19.8 8 16 3Z";
  const STEM = "M16 19c0 4-1.1 7.1-4 9.5h8c-2.9-2.4-4-5.5-4-9.5";
  const spade = (x, y, size, fill) =>
    `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${size / 32})"><path d="${SPADE}" fill="${fill}"/><path d="${STEM}" fill="${fill}"/></g>`;
  const frame = (t, inset = 12, opacity = 0.8) =>
    `<rect x="${inset}" y="${inset}" width="${W - inset * 2}" height="${H - inset * 2}" rx="${16 - inset / 3}" fill="none" stroke="${t.accent}" stroke-opacity="${opacity}" stroke-width="1.5"/>` +
    `<rect x="${inset + 5}" y="${inset + 5}" width="${W - inset * 2 - 10}" height="${H - inset * 2 - 10}" rx="${12 - inset / 3}" fill="none" stroke="${t.accent}" stroke-opacity="${opacity * 0.5}" stroke-width=".7"/>`;
  const card = (bg, inner, id) =>
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="clip-${id}"><rect width="${W}" height="${H}" rx="16"/></clipPath></defs><g clip-path="url(#clip-${id})"><rect width="${W}" height="${H}" fill="${bg}"/>${inner}</g></svg>`;

  function rand(seed) {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  }

  const BACKS = [
    {
      id: "B1",
      name: "Uranometria",
      note: "The Odyssey map's rings and spokes around a small spade: the same chart, on every card.",
      svg: (t) => {
        const rings = [30, 58, 86, 114, 142]
          .map(
            (r, i) =>
              `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="${t.accent}" stroke-opacity="${i % 2 ? 0.45 : 0.25}" stroke-width=".8"/>`,
          )
          .join("");
        const spokes = Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return `<path d="M${CX + Math.cos(a) * 30} ${CY + Math.sin(a) * 30}L${CX + Math.cos(a) * 220} ${CY + Math.sin(a) * 220}" stroke="${t.accent}" stroke-opacity=".22" stroke-width=".7"/>`;
        }).join("");
        return card(
          t.night,
          spokes + rings + spade(CX, CY, 34, t.accent) + frame(t),
          "B1",
        );
      },
    },
    {
      id: "B2",
      name: "Constellation lattice",
      note: "A woven grid of stars joined on the diagonal, like a net cast across the sky.",
      svg: (t) => {
        let lines = "",
          stars = "";
        const step = 25;
        for (let x = 0; x <= W + step; x += step)
          for (let y = 0; y <= H + step; y += step) {
            const odd = ((x + y) / step) % 2;
            if (!odd) {
              lines += `<path d="M${x} ${y}l${step} ${step}M${x} ${y}l${-step} ${step}" stroke="${t.accent}" stroke-opacity=".22" stroke-width=".6"/>`;
              stars += `<circle cx="${x}" cy="${y}" r="3.2" fill="${t.accent}" opacity=".12"/><circle cx="${x}" cy="${y}" r="1.2" fill="${(x / step) % 3 ? t.accent : t.accent2}"/>`;
            }
          }
        return card(t.surface, lines + stars + frame(t, 12, 0.9), "B2");
      },
    },
    {
      id: "B3",
      name: "The current ornament",
      note: "Today's engraved ornament, unchanged, printed in the theme's accent on its night instead of one ink per game.",
      html: true,
    },
    {
      id: "B4",
      name: "Guilloché",
      note: "Fine interlaced rosettes, as on a banknote. Hard to draw by hand; easy to generate at any size.",
      svg: (t) => {
        let paths = "";
        for (let k = 0; k < 16; k++) {
          const pts = [];
          for (let i = 0; i <= 240; i++) {
            const a = (i / 240) * Math.PI * 2;
            const r =
              70 +
              26 * Math.sin(a * 9 + k * 0.39) +
              10 * Math.sin(a * 3 - k * 0.2);
            pts.push(
              `${(CX + Math.cos(a) * r).toFixed(1)} ${(CY + Math.sin(a) * r * 1.35).toFixed(1)}`,
            );
          }
          paths += `<path d="M${pts.join("L")}Z" fill="none" stroke="${k % 2 ? t.accent : t.accent2}" stroke-opacity=".5" stroke-width=".5"/>`;
        }
        return card(
          t.night,
          paths + spade(CX, CY, 26, t.accent) + frame(t),
          "B4",
        );
      },
    },
    {
      id: "B5",
      name: "Sunburst",
      note: "Deco rays from the centre in both accents, inside a stepped double frame.",
      svg: (t) => {
        const rays = Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2;
          return `<path d="M${CX} ${CY}L${CX + Math.cos(a - 0.03) * 260} ${CY + Math.sin(a - 0.03) * 260}L${CX + Math.cos(a + 0.03) * 260} ${CY + Math.sin(a + 0.03) * 260}Z" fill="${i % 2 ? t.accent : t.accent2}" opacity="${i % 2 ? 0.28 : 0.14}"/>`;
        }).join("");
        const medal = `<circle cx="${CX}" cy="${CY}" r="34" fill="${t.night}" stroke="${t.accent}" stroke-width="1.5"/><circle cx="${CX}" cy="${CY}" r="28" fill="none" stroke="${t.accent}" stroke-opacity=".5"/>`;
        return card(
          t.raise,
          rays + medal + spade(CX, CY, 30, t.accent) + frame(t, 10, 1),
          "B5",
        );
      },
    },
    {
      id: "B6",
      name: "Argyle",
      note: "A diamond lattice in the two accents over the surface colour. Quiet, and reads well small.",
      svg: (t) => {
        let d = "";
        const w = 36,
          h = 50;
        for (let y = -h; y < H + h; y += h)
          for (let x = -w; x < W + w; x += w) {
            const odd = Math.round((x + (y / h) * w) / w) % 2;
            d += `<path d="M${x + w / 2} ${y}L${x + w} ${y + h / 2}L${x + w / 2} ${y + h}L${x} ${y + h / 2}Z" fill="${odd ? t.accent : t.accent2}" opacity="${odd ? 0.16 : 0.08}"/>`;
          }
        const lines = Array.from(
          { length: 20 },
          (_, i) =>
            `<path d="M${-200 + i * 36} 0l${H * (w / h) * 0.5 * 2} ${H}" stroke="${t.accent}" stroke-opacity=".25" stroke-width=".6" stroke-dasharray="3 3"/>`,
        ).join("");
        return card(t.surface, d + lines + frame(t, 12, 0.9), "B6");
      },
    },
    {
      id: "B7",
      name: "Accent medallion",
      note: "A solid accent back, like a classic coloured deck, with a night medallion and the spade. The boldest at a glance.",
      svg: (t) => {
        const medal = `<ellipse cx="${CX}" cy="${CY}" rx="58" ry="78" fill="${t.night}"/><ellipse cx="${CX}" cy="${CY}" rx="50" ry="70" fill="none" stroke="${t.accent}" stroke-width="1.2"/>`;
        const border = `<rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="10" fill="none" stroke="${t.night}" stroke-width="2"/><rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="7" fill="none" stroke="${t.night}" stroke-opacity=".5" stroke-width="1"/>`;
        return card(
          t.accent,
          border + medal + spade(CX, CY, 46, t.accent),
          "B7",
        );
      },
    },
    {
      id: "B8",
      name: "Crescent night",
      note: "A starfield with a crescent moon and a thin frame: the app's home sky, on the back of every card.",
      svg: (t) => {
        const r = rand(7);
        let stars = "";
        for (let i = 0; i < 90; i++) {
          const x = r() * W,
            y = r() * H,
            s = r();
          stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.4 + s * 1.1).toFixed(2)}" fill="${s > 0.85 ? t.accent : t.ink}" opacity="${(0.3 + s * 0.6).toFixed(2)}"/>`;
        }
        const moon = `<path d="M${CX + 8} ${CY - 44}a46 46 0 1 0 38 70 38 38 0 1 1-38-70z" fill="${t.accent}"/>`;
        return card(
          t.night,
          `<rect width="${W}" height="${H}" fill="${t.sky}" opacity=".7"/>` +
            stars +
            moon +
            frame(t, 12, 0.6),
          "B8",
        );
      },
    },
    {
      id: "B9",
      name: "Game art, framed",
      note: "Each game's own artwork, cropped to the card, inside a frame in the accent with the spade at the centre.",
      art: "framed",
    },
    {
      id: "B10",
      name: "Game art, toned",
      note: "The artwork toned to the theme (night shadows, accent highlights) under a fine frame, so every game's back still matches the app.",
      art: "toned",
    },
  ];

  /** HTML for one back. `thumb` is a data URL of the game art to use. */
  function render(back, t, thumb, ornament) {
    if (back.svg) return back.svg(t);
    const overlay = (inner) =>
      `<svg class="over" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
    if (back.html) {
      return `<div class="back-html" style="background:${t.night}"><div class="mask" style="background:${t.accent};-webkit-mask-image:url(${ornament});mask-image:url(${ornament})"></div></div>`;
    }
    if (back.art === "framed") {
      return (
        `<div class="back-html"><img src="${thumb}" alt=""/>` +
        overlay(
          `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${t.night}" stroke-width="28"/>${frame(t, 12, 1)}<circle cx="${CX}" cy="${CY}" r="26" fill="${t.night}" fill-opacity=".85" stroke="${t.accent}"/>${spade(CX, CY, 28, t.accent)}`,
        ) +
        `</div>`
      );
    }
    return (
      `<div class="back-html"><img src="${thumb}" alt="" style="filter:grayscale(1) contrast(1.15) brightness(.9)"/><div class="tone" style="background:linear-gradient(${t.night},${t.accent})"></div>` +
      overlay(`${frame(t, 12, 0.9)}${spade(CX, 300, 18, t.accent)}`) +
      `</div>`
    );
  }

  window.BackStudio = { BACKS, render };
})();
