(function () {
  const { DESIGNS, face, suitGlyph, rankGlyph, colourOf } = window.CardStudio;
  const { BACKS, render: renderBack } = window.BackStudio;
  const $ = (selector) => document.querySelector(selector);
  const el = (tag, attrs = {}, html = "") => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      node.setAttribute(key, value === true ? "" : value);
    }
    if (html) node.innerHTML = html;
    return node;
  };

  // ---- Picks, kept in this browser ------------------------------------------
  const STORE = "solitarius-studio-picks-v1";
  let picks = {
    theme: "nocturne",
    logo: null,
    icons: {},
    suits: null,
    ranks: null,
    courts: null,
    back: null,
    layout: "regular",
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved)
      picks = { ...picks, ...saved, icons: { ...(saved.icons || {}) } };
  } catch (error) {
    /* storage unavailable: start fresh */
  }
  const save = () => {
    try {
      localStorage.setItem(STORE, JSON.stringify(picks));
    } catch (error) {
      /* storage unavailable */
    }
    updateTray();
  };

  // ---- Theme ------------------------------------------------------------------
  const theme = () =>
    THEMES.find((entry) => entry.id === picks.theme) || THEMES[0];
  const withTheme = (svg) => {
    const t = theme().colors;
    return svg
      .replace(/var\(--a\)/g, t.accent)
      .replace(/var\(--a2\)/g, t.accent2)
      .replace(/var\(--ink\)/g, t.ink)
      .replace(/var\(--night\)/g, t.night);
  };
  function applyTheme() {
    const t = theme().colors;
    const root = document.documentElement.style;
    root.setProperty("--night", t.night);
    root.setProperty("--surface", t.surface);
    root.setProperty("--raise", t.raise);
    root.setProperty("--ink", t.ink);
    root.setProperty("--dim", t.dim);
    root.setProperty("--faint", t.faint);
    root.setProperty("--accent", t.accent);
    root.setProperty("--accent-ink", t.accentInk);
    root.setProperty("--accent2", t.accent2);
    root.setProperty("--sky", t.sky);
    document
      .querySelectorAll(".theme-chip")
      .forEach((chip) =>
        chip.setAttribute(
          "aria-pressed",
          String(chip.dataset.id === picks.theme),
        ),
      );
    renderBrand();
    renderLogos();
    renderBacks();
  }
  function renderThemes() {
    const box = $("#themes");
    THEMES.forEach((entry) => {
      const chip = el(
        "button",
        {
          class: "theme-chip",
          "data-id": entry.id,
          "aria-pressed": "false",
          type: "button",
        },
        `<i style="background:linear-gradient(135deg,${entry.colors.accent} 50%,${entry.colors.accent2} 50%)"></i>${entry.name}`,
      );
      chip.addEventListener("click", () => {
        picks.theme = entry.id;
        save();
        applyTheme();
      });
      box.append(chip);
    });
  }

  // ---- Logo -------------------------------------------------------------------
  const logoSvg = (logo, cls = "") =>
    `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true">${withTheme(logo.svg)}</svg>`;
  function renderBrand() {
    const logo = LOGOS.find((entry) => entry.id === picks.logo);
    $("#brand").innerHTML =
      `${logo ? logoSvg(logo) : `<svg viewBox="0 0 32 32">${withTheme(CURRENT_MARK)}</svg>`}<span>Solitarius</span>`;
  }
  function renderLogos() {
    const box = $("#logos");
    box.innerHTML = "";
    const groups = [...new Set(LOGOS.map((logo) => logo.group))];
    for (const group of groups) {
      const wrap = el(
        "div",
        { class: "grid", style: "gap:12px" },
        `<div class="caps">${group}</div>`,
      );
      const grid = el("div", {
        class: "grid logo-grid",
        role: "radiogroup",
        "aria-label": group,
      });
      for (const logo of LOGOS.filter((entry) => entry.group === group)) {
        const tile = el(
          "button",
          {
            class: "pick",
            type: "button",
            role: "radio",
            "aria-checked": String(picks.logo === logo.id),
          },
          `<div class="logo-stage">${logoSvg(logo, "big")}<div class="logo-side"><div class="app-icon">${logoSvg(logo)}</div><div class="wordmark">${logoSvg(logo)}Solitarius</div></div></div>` +
            `<div><span class="tag">${logo.id}</span><h3>${logo.name}</h3></div><p>${logo.note}</p>`,
        );
        tile.addEventListener("click", () => {
          picks.logo = picks.logo === logo.id ? null : logo.id;
          save();
          renderBrand();
          renderLogos();
        });
        grid.append(tile);
      }
      wrap.append(grid);
      box.append(wrap);
    }
  }

  // ---- Icons ------------------------------------------------------------------
  const currentIcon = (name) => {
    const icon = ICONS[name];
    const inner = icon.inner
      .replace(/="black"/g, '="currentColor"')
      .replace(/="#000000"/g, '="currentColor"');
    return `<svg viewBox="${icon.vb}" fill="currentColor" aria-hidden="true">${inner}</svg>`;
  };
  const altIcon = (name, family) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${family === 0 ? 1.3 : 1.6}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_ALTS[name][family]}</svg>`;
  function renderIcons() {
    const box = $("#icon-groups");
    box.innerHTML = "";
    for (const [group, names] of Object.entries(ICON_GROUPS)) {
      const section = el(
        "div",
        { class: "icon-group" },
        `<div class="caps">${group} · ${names.length}</div>`,
      );
      const rows = el("div", { class: "icon-rows" });
      for (const name of names) {
        const row = el(
          "div",
          { class: "icon-row", role: "radiogroup", "aria-label": name },
          `<span class="nm">${name.replace(/([a-z])([A-Z])/g, "$1 $2")}</span>`,
        );
        const choice = picks.icons[name] ?? "cur";
        const options = [
          ["cur", "NOW", currentIcon(name)],
          ...[0, 1, 2].map((family) => [
            String(family),
            "ABC"[family],
            altIcon(name, family),
          ]),
        ];
        for (const [value, label, svg] of options) {
          const button = el(
            "button",
            {
              class: "ic",
              type: "button",
              role: "radio",
              "aria-checked": String(choice === value),
              "aria-label": `${name} ${label}`,
            },
            `${svg}<small>${label}</small>`,
          );
          button.addEventListener("click", () => {
            picks.icons[name] = value;
            save();
            row
              .querySelectorAll(".ic")
              .forEach((other) =>
                other.setAttribute("aria-checked", String(other === button)),
              );
          });
          row.append(button);
        }
        rows.append(row);
      }
      section.append(rows);
      box.append(section);
    }
  }
  document.querySelectorAll("[data-all]").forEach((button) =>
    button.addEventListener("click", () => {
      Object.values(ICON_GROUPS)
        .flat()
        .forEach((name) => (picks.icons[name] = button.dataset.all));
      save();
      renderIcons();
    }),
  );

  // ---- Cards --------------------------------------------------------------------
  const HAND = [
    [1, "S"],
    [7, "H"],
    [10, "D"],
    [11, "C"],
    [12, "H"],
    [13, "S"],
    ["joker", "S"],
  ];
  const LAYOUTS = [
    ["regular", "Regular"],
    ["tableau", "Tableau"],
    ["small", "Small"],
  ];
  const byId = (id) => DESIGNS.find((design) => design.id === id) || DESIGNS[0];
  const mixed = () => {
    const courts = byId(picks.courts || "C1");
    const suits = byId(picks.suits || courts.id);
    const ranks = byId(picks.ranks || courts.id);
    return {
      ...courts,
      suits: suits.suits,
      fourColour: suits.fourColour,
      blue: suits.blue || courts.red,
      green: suits.green || courts.black,
      font: ranks.font,
      weight: ranks.weight,
      italic: ranks.italic,
      id: "MIX",
    };
  };
  function renderMix() {
    for (const [key, select] of [
      ["suits", "#mix-suits"],
      ["ranks", "#mix-ranks"],
      ["courts", "#mix-courts"],
    ]) {
      const node = $(select);
      node.innerHTML = DESIGNS.map(
        (design) =>
          `<option value="${design.id}" ${(picks[key] || "C1") === design.id ? "selected" : ""}>${design.id} · ${design.name}</option>`,
      ).join("");
    }
    $("#mix-fan").innerHTML = HAND.map(([rank, suit]) =>
      face(mixed(), rank, suit, picks.layout),
    ).join("");
    $("#layouts").innerHTML = "";
    for (const [id, label] of LAYOUTS) {
      const button = el(
        "button",
        { type: "button", "aria-pressed": String(picks.layout === id) },
        label,
      );
      button.addEventListener("click", () => {
        picks.layout = id;
        save();
        renderMix();
        renderDesigns();
      });
      $("#layouts").append(button);
    }
  }
  ["suits", "ranks", "courts"].forEach((key) =>
    $(`#mix-${key}`).addEventListener("change", (event) => {
      picks[key] = event.target.value;
      save();
      renderMix();
      renderDesigns();
    }),
  );

  const RANKS = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
  ];
  function renderDesigns() {
    const box = $("#designs");
    box.innerHTML = "";
    for (const design of DESIGNS) {
      const block = el("article", { class: "design" });
      const head = el(
        "div",
        { class: "design-head" },
        `<span class="tag">${design.id}</span><h3>${design.name}</h3>`,
      );
      const set = el("div", {
        class: "pickset",
        role: "group",
        "aria-label": `Use ${design.name}`,
      });
      for (const [key, label] of [
        ["suits", "Suits"],
        ["ranks", "Numerals"],
        ["courts", "Courts"],
      ]) {
        const button = el(
          "button",
          { type: "button", "aria-pressed": String(picks[key] === design.id) },
          label,
        );
        button.addEventListener("click", () => {
          picks[key] = picks[key] === design.id ? null : design.id;
          save();
          renderMix();
          renderDesigns();
        });
        set.append(button);
      }
      head.append(set);
      block.append(head, el("p", { class: "dim" }, design.note));
      block.append(
        el(
          "div",
          { class: "fan" },
          HAND.map(([rank, suit]) =>
            face(design, rank, suit, picks.layout),
          ).join(""),
        ),
      );
      const glyphs = el(
        "div",
        { class: "glyphs" },
        `<span class="caps" style="margin-right:4px">Copy SVG</span>`,
      );
      for (const suit of ["S", "H", "D", "C"]) {
        const svg = suitGlyph(design, suit);
        const tile = el(
          "button",
          {
            class: "glyph",
            type: "button",
            title: "Copy as SVG",
            "aria-label": `Copy ${suit} as SVG`,
            style: `background:${design.stock}`,
          },
          svg,
        );
        tile.addEventListener("click", () => copy(svg, "Suit copied as SVG"));
        glyphs.append(tile);
      }
      for (const rank of RANKS) {
        const svg = rankGlyph(design, rank, design.black);
        const tile = el(
          "button",
          {
            class: "glyph",
            type: "button",
            title: "Copy as SVG",
            "aria-label": `Copy ${rank} as SVG`,
            style: `background:${design.stock}`,
          },
          svg,
        );
        tile.addEventListener("click", () =>
          copy(svg, "Numeral copied as SVG"),
        );
        glyphs.append(tile);
      }
      block.append(glyphs);
      box.append(block);
    }
  }

  // ---- Backs --------------------------------------------------------------------
  function renderBacks() {
    const box = $("#back-grid");
    box.innerHTML = "";
    const t = theme().colors;
    for (const back of BACKS) {
      const art = back.art
        ? `<div class="back-pair"><div class="back">${renderBack(back, t, THUMBS.Klondike, ORNAMENT)}</div><div class="back">${renderBack(back, t, THUMBS.NightVigil, ORNAMENT)}</div></div>`
        : `<div class="back">${renderBack(back, t, null, ORNAMENT)}</div>`;
      const tile = el(
        "button",
        {
          class: "pick",
          type: "button",
          role: "radio",
          "aria-checked": String(picks.back === back.id),
        },
        `${art}<div><span class="tag">${back.id}</span><h3>${back.name}</h3></div><p>${back.note}</p>`,
      );
      tile.addEventListener("click", () => {
        picks.back = picks.back === back.id ? null : back.id;
        save();
        renderBacks();
      });
      box.append(tile);
    }
  }

  // ---- Notes ------------------------------------------------------------------------
  function renderSizes() {
    const max = Math.max(...SIZE_USE.map((size) => size.games));
    $("#size-meters").innerHTML = SIZE_USE.map(
      (size) =>
        `<div class="meter"><span>${size.name} <span class="dim">· ${size.kb} KB</span></span><span class="track"><i style="width:${(size.games / max) * 100}%"></i></span><b style="font-variant-numeric:tabular-nums">${size.games} ${size.games === 1 ? "game" : "games"}</b></div>`,
    ).join("");
  }

  // ---- Tray ------------------------------------------------------------------------
  function picksText() {
    const iconPicks = Object.values(ICON_GROUPS)
      .flat()
      .map((name) => [name, picks.icons[name] ?? "cur"]);
    const families = {
      cur: "current",
      0: "A fine line",
      1: "B duotone",
      2: "C solid",
    };
    const counts = {};
    iconPicks.forEach(
      ([, value]) => (counts[value] = (counts[value] || 0) + 1),
    );
    const common = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const exceptions = iconPicks
      .filter(([, value]) => value !== common)
      .map(
        ([name, value]) =>
          `${name}=${value === "cur" ? "current" : "ABC"[value]}`,
      );
    const logo = LOGOS.find((entry) => entry.id === picks.logo);
    const back = BACKS.find((entry) => entry.id === picks.back);
    const name = (id) => (id ? `${id} ${byId(id).name}` : "not picked");
    return [
      `Theme previewed: ${theme().name}`,
      `Logo: ${logo ? `${logo.id} ${logo.name}` : "not picked"}`,
      `Icons: ${families[common]} for all${exceptions.length ? `, except ${exceptions.join(", ")}` : ""}`,
      `Card suits: ${name(picks.suits)}`,
      `Card numerals: ${name(picks.ranks)}`,
      `Card courts: ${name(picks.courts)}`,
      `Card back: ${back ? `${back.id} ${back.name}` : "not picked"}`,
    ].join("\n");
  }
  function updateTray() {
    const iconCount = Object.values(picks.icons).filter(
      (value) => value !== undefined,
    ).length;
    const done = [
      picks.logo,
      picks.suits,
      picks.ranks,
      picks.courts,
      picks.back,
    ].filter(Boolean).length;
    $("#tray-sum").innerHTML =
      `<b>${done} of 5</b> picks made · <b>${iconCount}</b> icons chosen`;
    $("#picks-text").value = picksText();
  }
  $("#show-picks").addEventListener("click", () => {
    const box = $("#picks-box");
    box.hidden = !box.hidden;
    $("#show-picks").textContent = box.hidden ? "Show list" : "Hide list";
  });
  $("#copy-picks").addEventListener("click", () =>
    copy(picksText(), "Picks copied"),
  );

  let toastTimer;
  function toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (node.hidden = true), 1600);
  }
  function copy(text, message) {
    const fallback = () => {
      $("#picks-box").hidden = false;
      const area = $("#picks-text");
      area.value = text;
      area.focus();
      area.select();
      toast("Selected: press copy");
    };
    try {
      navigator.clipboard.writeText(text).then(() => toast(message), fallback);
    } catch (error) {
      fallback();
    }
  }

  renderThemes();
  renderIcons();
  renderMix();
  renderDesigns();
  renderSizes();
  applyTheme();
  updateTray();
})();
