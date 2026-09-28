// Three alternates per icon, drawn on a 24 grid. Each string is SVG content
// placed inside <svg viewBox="0 0 24 24"> with a family class:
//   A "Fine line"  - stroke 1.3, airy, engraved details
//   B "Duotone"    - stroke 1.6 outline over a 22% tone fill (class="t")
//   C "Solid"      - filled glyphs (class="f"), cutouts drawn with class="k"
// Shared helpers keep rotations and suits consistent.

const rot = (deg, inner) => `<g transform="rotate(${deg} 12 12)">${inner}</g>`;

// Suits on a 24 grid.
const HEART =
  "M12 20.5C7 16.6 3.5 13.4 3.5 9.3 3.5 6.6 5.6 4.5 8.2 4.5c1.6 0 3 .8 3.8 2.1.8-1.3 2.2-2.1 3.8-2.1 2.6 0 4.7 2.1 4.7 4.8 0 4.1-3.5 7.3-8.5 11.2z";
const HEART_B =
  "M12 20C6.2 15.8 4 12.6 4 9.6 4 7 6 5 8.4 5c1.5 0 2.8.7 3.6 2 .8-1.3 2.1-2 3.6-2C18 5 20 7 20 9.6c0 3-2.2 6.2-8 10.4z";
const HEART_C =
  "M12 21 4.3 12.2C2.6 10.2 2.9 7 5 5.4c2.1-1.6 5-1.1 6.4 1l.6.9.6-.9c1.4-2.1 4.3-2.6 6.4-1 2.1 1.6 2.4 4.8.7 6.8z";
const DIAMOND = "M12 2.8 19 12l-7 9.2L5 12z";
const DIAMOND_B =
  "M12 3.5c1.8 3.2 4 5.9 6.5 8.5-2.5 2.6-4.7 5.3-6.5 8.5-1.8-3.2-4-5.9-6.5-8.5 2.5-2.6 4.7-5.3 6.5-8.5z";
const SPADE =
  "M12 3C9.3 6.7 4.5 9.2 4.5 13.3c0 2.5 2 4.3 4.4 4.1 1.4-.1 2.4-.9 3.1-2 .7 1.1 1.7 1.9 3.1 2 2.4.2 4.4-1.6 4.4-4.1C19.5 9.2 14.7 6.7 12 3z";
const SPADE_STEM = "M12 15.5c0 2.6-.9 4.3-2.6 5.5h5.2c-1.7-1.2-2.6-2.9-2.6-5.5";
const CLUB =
  "M12 3.5a3.6 3.6 0 0 0-3.2 5.3A3.6 3.6 0 1 0 10.6 15c.4-.1.8-.4 1.1-.6-.1 2.8-1 4.7-2.6 6.1h5.8c-1.6-1.4-2.5-3.3-2.6-6.1.3.2.7.5 1.1.6a3.6 3.6 0 1 0 1.8-6.2A3.6 3.6 0 0 0 12 3.5z";

// A gear outline: 8 teeth between radii r and R, centred on (12, 12).
function gear(r, R, teeth = 8) {
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const w = (Math.PI / teeth) * 0.55;
    for (const [ang, rad] of [
      [a - w * 1.25, r],
      [a - w * 0.7, R],
      [a + w * 0.7, R],
      [a + w * 1.25, r],
    ])
      pts.push(
        `${(12 + Math.cos(ang) * rad).toFixed(2)} ${(12 + Math.sin(ang) * rad).toFixed(2)}`,
      );
  }
  return `M${pts.join("L")}Z`;
}

const arrowA = `<path d="M20 12H4.5M10.5 6 4.5 12l6 6"/>`;
const arrowB = `<circle class="t" cx="12" cy="12" r="9"/><path d="M16.5 12h-9M11 8l-4 4 4 4"/>`;
const arrowC = `<path class="f" d="M11 4.5 3.5 12l7.5 7.5v-4.8h9.5V9.3H11z"/>`;

const chevA = `<path d="M15 4.5 7.5 12l7.5 7.5"/>`;
const chevB = `<circle class="t" cx="12" cy="12" r="9"/><path d="M13.5 8 9.5 12l4 4"/>`;
const chevC = `<path d="M15.5 5 8.5 12l7 7" stroke-width="3"/>`;

module.exports = {
  Ace: [
    `<path d="M6.5 20 12 4l5.5 16M8.6 14h6.8M4.8 20h3.6M15.6 20h3.6"/>`,
    `<rect class="t" x="4.5" y="2.5" width="15" height="19" rx="2.2"/><path d="M9 17l3-9 3 9M10 14.2h4"/>`,
    `<rect class="f" x="4.5" y="2.5" width="15" height="19" rx="2.2"/><path class="k" d="M9 17l3-9 3 9M10 14.2h4" stroke-width="1.8"/>`,
  ],
  ArrowBack: [arrowA, arrowB, arrowC],
  ArrowForward: [rot(180, arrowA), rot(180, arrowB), rot(180, arrowC)],
  ArrowUp: [rot(90, arrowA), rot(90, arrowB), rot(90, arrowC)],
  ArrowDown: [rot(-90, arrowA), rot(-90, arrowB), rot(-90, arrowC)],
  Cancel: [
    `<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6M15 9l-6 6"/>`,
    `<circle class="t" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>`,
    `<circle class="f" cx="12" cy="12" r="9.5"/><path class="k" d="M9 9l6 6M15 9l-6 6" stroke-width="2"/>`,
  ],
  CardColumn: [
    `<rect x="7" y="3" width="10" height="6" rx="1.2"/><rect x="7" y="7.5" width="10" height="6" rx="1.2"/><rect x="7" y="12" width="10" height="9" rx="1.2"/>`,
    `<rect class="t" x="6.5" y="12" width="11" height="9" rx="1.5"/><path d="M6.5 5.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5M6.5 9a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 17.5 9"/><rect x="6.5" y="11" width="11" height="10" rx="1.5"/>`,
    `<rect class="f" x="6.5" y="3" width="11" height="4" rx="1.2"/><rect class="f" x="6.5" y="8.5" width="11" height="4" rx="1.2"/><rect class="f" x="6.5" y="14" width="11" height="7" rx="1.2"/>`,
  ],
  CardRow: [
    `<rect x="2.5" y="7" width="6" height="10" rx="1.2"/><rect x="9" y="7" width="6" height="10" rx="1.2"/><rect x="15.5" y="7" width="6" height="10" rx="1.2"/>`,
    `<rect class="t" x="2.5" y="6.5" width="6" height="11" rx="1.4"/><rect class="t" x="9" y="6.5" width="6" height="11" rx="1.4"/><rect class="t" x="15.5" y="6.5" width="6" height="11" rx="1.4"/><rect x="2.5" y="6.5" width="6" height="11" rx="1.4"/><rect x="9" y="6.5" width="6" height="11" rx="1.4"/><rect x="15.5" y="6.5" width="6" height="11" rx="1.4"/>`,
    `<rect class="f" x="2" y="6.5" width="6" height="11" rx="1.3"/><rect class="f" x="9" y="6.5" width="6" height="11" rx="1.3"/><rect class="f" x="16" y="6.5" width="6" height="11" rx="1.3"/>`,
  ],
  Chart: [
    `<path d="M4 20.5h16M6.5 20.5v-6M12 20.5V5M17.5 20.5v-9.5"/><circle cx="12" cy="5" r=".6" class="f"/>`,
    `<rect class="t" x="4" y="13" width="4" height="7.5" rx="1"/><rect class="t" x="10" y="4" width="4" height="16.5" rx="1"/><rect class="t" x="16" y="9" width="4" height="11.5" rx="1"/><rect x="4" y="13" width="4" height="7.5" rx="1"/><rect x="10" y="4" width="4" height="16.5" rx="1"/><rect x="16" y="9" width="4" height="11.5" rx="1"/>`,
    `<rect class="f" x="3.5" y="12.5" width="4.5" height="8.5" rx="1.2"/><rect class="f" x="9.75" y="3.5" width="4.5" height="17.5" rx="1.2"/><rect class="f" x="16" y="8.5" width="4.5" height="12.5" rx="1.2"/>`,
  ],
  CheckBoxOff: [
    `<rect x="4.5" y="4.5" width="15" height="15" rx="2.5"/>`,
    `<rect class="t" x="4" y="4" width="16" height="16" rx="3.5"/><rect x="4" y="4" width="16" height="16" rx="3.5"/>`,
    `<rect x="4.5" y="4.5" width="15" height="15" rx="3" stroke-width="2.4"/>`,
  ],
  CheckBoxOn: [
    `<rect x="4.5" y="4.5" width="15" height="15" rx="2.5"/><path d="M8.5 12.3l2.4 2.4 4.8-5.2"/>`,
    `<rect class="t" x="4" y="4" width="16" height="16" rx="3.5"/><rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M8.3 12.2l2.6 2.6 5-5.4"/>`,
    `<rect class="f" x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path class="k" d="M8.2 12.2l2.7 2.7 5-5.4" stroke-width="2.2"/>`,
  ],
  CheckCircle: [
    `<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.8-5.2"/>`,
    `<circle class="t" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M8.3 12.2l2.6 2.6 5-5.4"/>`,
    `<circle class="f" cx="12" cy="12" r="9.5"/><path class="k" d="M8.2 12.2l2.7 2.7 5-5.4" stroke-width="2.2"/>`,
  ],
  ChevronLeft: [chevA, chevB, chevC],
  ChevronRight: [rot(180, chevA), rot(180, chevB), rot(180, chevC)],
  ExpandLess: [rot(90, chevA), rot(90, chevB), rot(90, chevC)],
  ExpandMore: [rot(-90, chevA), rot(-90, chevB), rot(-90, chevC)],
  Close: [
    `<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>`,
    `<rect class="t" x="3" y="3" width="18" height="18" rx="5"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/>`,
    `<path d="M6 6l12 12M18 6 6 18" stroke-width="3"/>`,
  ],
  Clubs: [
    `<path d="${CLUB}"/>`,
    `<path class="t" d="${CLUB}"/><path d="${CLUB}"/>`,
    `<circle class="f" cx="12" cy="7.2" r="4.1"/><circle class="f" cx="7.4" cy="12.6" r="4.1"/><circle class="f" cx="16.6" cy="12.6" r="4.1"/><path class="f" d="M12 10.5c.2 5-1.2 8.3-3.4 10.5h6.8c-2.2-2.2-3.6-5.5-3.4-10.5z"/>`,
  ],
  Diamonds: [
    `<path d="${DIAMOND}"/>`,
    `<path class="t" d="${DIAMOND_B}"/><path d="${DIAMOND_B}"/>`,
    `<path class="f" d="${DIAMOND_B}"/>`,
  ],
  Hearts: [
    `<path d="${HEART}"/>`,
    `<path class="t" d="${HEART_B}"/><path d="${HEART_B}"/>`,
    `<path class="f" d="${HEART_C}"/>`,
  ],
  Heart: [
    `<path d="${HEART}"/><path d="M7.5 9.2a2.2 2.2 0 0 1 2-2"/>`,
    `<path class="t" d="${HEART_B}"/><path d="${HEART_B}"/>`,
    `<path class="f" d="${HEART_B}"/>`,
  ],
  Spades: [
    `<path d="${SPADE}"/><path d="${SPADE_STEM}"/>`,
    `<path class="t" d="${SPADE}"/><path d="${SPADE}"/><path d="${SPADE_STEM}"/>`,
    `<path class="f" d="${SPADE}"/><path class="f" d="M12 14c0 3-1 5.3-3 7h6c-2-1.7-3-4-3-7z"/>`,
  ],
  Door: [
    `<path d="M5.5 21V10.5a6.5 6.5 0 0 1 13 0V21M3.5 21h17M12 4v17M5.5 10.5h13"/><circle cx="10.2" cy="15" r=".7" class="f"/>`,
    `<path class="t" d="M6 21v-10a6 6 0 0 1 12 0v10z"/><path d="M6 21v-10a6 6 0 0 1 12 0v10M4 21h16"/><path d="M12 15v2.5"/><circle cx="12" cy="13.3" r="1.3"/>`,
    `<path class="f" d="M5 21.5V11a7 7 0 0 1 14 0v10.5z"/><circle class="kf" cx="12" cy="13" r="1.5"/><path class="k" d="M12 14v3.5" stroke-width="1.8"/>`,
  ],
  Dragon: [
    `<path d="M5 20.5c1-3 3-4.5 5.5-5M10.5 15.5 7 12.5l4-.5-1-4.5 3.5 2.5L15 5l1 4.5 3.5-1-1.5 4 2 2.5-4 .5c-.5 3-2.5 5-6 5"/><path d="M15 5 13.5 3M16 9.5l2.5-3"/><circle class="f" cx="15" cy="12" r=".7"/>`,
    `<path class="t" d="M10.5 15.5 7 12.5l4-.5-1-4.5 3.5 2.5L15 5l1 4.5 3.5-1-1.5 4 2 2.5-4 .5c-.5 3-2.5 5-6 5z"/><path d="M10.5 15.5 7 12.5l4-.5-1-4.5 3.5 2.5L15 5l1 4.5 3.5-1-1.5 4 2 2.5-4 .5c-.5 3-2.5 5-6 5zM5 20.5c1-3 3-4.5 5.5-5"/><circle class="f" cx="15" cy="12" r=".8"/>`,
    `<path class="f" d="M10.2 16.2 6 12.4l4.6-.6-1.2-5.3 4.1 2.9L15 4l1.3 5.2 4-1.1-1.7 4.6 2.3 2.8-4.5.6c-.6 3.3-2.9 5.6-6.8 5.6-.9 0-1.8-.1-2.6-.4l-1.9 2.2L3.7 20.4l2.6-1.9c1-1.2 2.3-2 3.9-2.3z"/><circle class="kf" cx="15" cy="12.2" r="1"/>`,
  ],
  Easy: [
    `<path d="M12 3.5 5 6v5.5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z"/><path d="M9 12.3l2.2 2.2 4-4.3"/>`,
    `<path class="t" d="M12 3 4.5 5.8v5.7c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V5.8z"/><path d="M12 3 4.5 5.8v5.7c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V5.8z"/><path d="M8.8 12.2l2.4 2.4 4.1-4.4"/>`,
    `<path class="f" d="M12 2.5 4 5.5v6c0 4.9 3.4 8.5 8 10 4.6-1.5 8-5.1 8-10v-6z"/><path class="k" d="M8.6 12.2l2.5 2.5 4.3-4.6" stroke-width="2"/>`,
  ],
  EqualOutline: [
    `<circle cx="12" cy="12" r="8.5"/><path d="M8.5 10h7M8.5 14h7"/>`,
    `<circle class="t" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M8.2 10h7.6M8.2 14h7.6"/>`,
    `<circle class="f" cx="12" cy="12" r="9.5"/><path class="k" d="M8 10h8M8 14h8" stroke-width="2"/>`,
  ],
  Equip: [
    `<path d="M5 19l8.5-8.5M13.5 10.5l2-5 3.5 3.5-5 2M7 14.5l2.5 2.5M3.8 20.2l2-2"/>`,
    `<path class="t" d="M12 3.5 5.5 6v5c0 4 2.7 7 6.5 8.5 3.8-1.5 6.5-4.5 6.5-8.5V6z"/><path d="M12 3.5 5.5 6v5c0 4 2.7 7 6.5 8.5 3.8-1.5 6.5-4.5 6.5-8.5V6z"/><path d="M12 7.5v8.5M9 10.5h6"/>`,
    `<path class="f" d="M18.8 3.5 21 5.7l-3.5 6-2.2-2.2-7.8 7.8.9 2.3-1.6 1.6-1.9-1.9-2.2 2.2L1.9 20l2.2-2.2-1.9-1.9 1.6-1.6 2.3.9 7.8-7.8-2.2-2.2z"/>`,
  ],
  FastForward: [
    `<path d="M4 6.5 11 12l-7 5.5zM12.5 6.5l7 5.5-7 5.5z"/>`,
    `<path class="t" d="M3.5 6 11 12l-7.5 6zM12 6l7.5 6-7.5 6z"/><path d="M3.5 6 11 12l-7.5 6zM12 6l7.5 6-7.5 6z"/>`,
    `<path class="f" d="M3 5.5 11.2 12 3 18.5zM11.5 5.5l8.2 6.5-8.2 6.5z"/><path d="M21 5.5v13" stroke-width="2.4"/>`,
  ],
  Fist: [
    `<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V10M10 9.5V5.5a1.5 1.5 0 0 1 3 0V10M13 9.5V6a1.5 1.5 0 0 1 3 0v5M16 10.5a1.5 1.5 0 0 1 3 0v3c0 3.9-2.9 6.5-6.5 6.5S7 18 7 14.5v-2l-1.8-1.3a1.4 1.4 0 0 1 1.8-2.1"/><path d="M9 20.5v1.5M15 20.5v1.5"/>`,
    `<path class="t" d="M6 10.5h13v3.5c0 4-2.9 6.5-6.5 6.5S6 18 6 14z"/><path d="M6 14.5v-4a1.5 1.5 0 0 1 3 0M9 10.5V7a1.5 1.5 0 0 1 3 0v3.5M12 10.5V6.5a1.5 1.5 0 0 1 3 0v4M15 10.5V8a1.5 1.5 0 0 1 3 0v6c0 3.6-2.6 6.5-6 6.5-3.1 0-6-2.3-6-6"/><path d="M9.5 14.5h4"/>`,
    `<path class="f" d="M6 9.5a2 2 0 0 1 2-2 2 2 0 0 1 2-2.5 2 2 0 0 1 2.2 1.1A2 2 0 0 1 15.5 7.5a2 2 0 0 1 3.5 1.3V14c0 4.3-3.1 7-7 7s-7-2.7-7-6.5V11a2 2 0 0 1 1-1.5z"/><path class="k" d="M8 9.8v2.5M10.5 8v4M13 8v4M15.5 9v3.5M8.5 15h5" stroke-width="1.4"/>`,
  ],
  FreeCell: [
    `<rect x="6" y="3.5" width="12" height="17" rx="2" stroke-dasharray="2.2 2"/>`,
    `<rect class="t" x="5.5" y="3" width="13" height="18" rx="2.5"/><rect x="5.5" y="3" width="13" height="18" rx="2.5"/><path d="M9.5 12h5M12 9.5v5"/>`,
    `<rect x="5.5" y="3" width="13" height="18" rx="2.5" stroke-width="2.4"/><rect class="f" x="9" y="7" width="6" height="10" rx="1.2"/>`,
  ],
  Gallery: [
    `<rect x="3.5" y="4.5" width="17" height="15" rx="1"/><rect x="6" y="7" width="12" height="10" rx=".5"/><path d="M6 15l3.5-3.5 3 3 2-2L18 16"/>`,
    `<rect class="t" x="3" y="4" width="18" height="16" rx="2.5"/><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3.5 16.5 9 11l5 5 2-2 4.5 4.5"/><circle cx="16" cy="8.5" r="1.6"/>`,
    `<path class="f" fill-rule="evenodd" d="M5 3.5h14A2.5 2.5 0 0 1 21.5 6v12a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 18V6A2.5 2.5 0 0 1 5 3.5zm11 3.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM4.5 17.2l4.5-4.7 4.5 4.6 2.3-2.3 3.7 3.7V6.5z"/>`,
  ],
  Games: [
    `<rect x="5" y="5" width="10" height="14" rx="1.5" transform="rotate(-12 10 12)"/><rect x="9.5" y="5.5" width="10" height="14" rx="1.5" transform="rotate(8 14.5 12.5)"/><path d="M15 10.5c-.9 1.1-2.2 1.8-2.2 3a1 1 0 0 0 2 .3 1 1 0 0 0 2-.3c0-1.2-1.3-1.9-1.8-3z"/>`,
    `<rect class="t" x="4" y="4.5" width="11" height="15" rx="2" transform="rotate(-10 9.5 12)"/><rect x="4" y="4.5" width="11" height="15" rx="2" transform="rotate(-10 9.5 12)"/><rect x="9.5" y="4.5" width="11" height="15" rx="2"/><path class="f" d="M15 8.8c-1 1.4-2.6 2.3-2.6 3.8a1.3 1.3 0 0 0 2.4.6c-.1 1-.4 1.6-1 2.1h2.4c-.6-.5-.9-1.1-1-2.1a1.3 1.3 0 0 0 2.4-.6c0-1.5-1.6-2.4-2.6-3.8z"/>`,
    `<rect class="f" x="4" y="4.5" width="11" height="15" rx="2" transform="rotate(-10 9.5 12)" opacity=".45"/><rect class="f" x="9.5" y="4.5" width="11" height="15" rx="2"/><path class="kf" d="M15 8.5c-1.1 1.5-2.8 2.4-2.8 4a1.4 1.4 0 0 0 2.5.7c-.1 1.1-.4 1.7-1.1 2.3h2.8c-.7-.6-1-1.2-1.1-2.3a1.4 1.4 0 0 0 2.5-.7c0-1.6-1.7-2.5-2.8-4z"/>`,
  ],
  GrappleHook: [
    `<path d="M12 3v11M12 14c0 3-2.5 5-5 5-2 0-3-1.2-3.2-2.8M12 14c0 3 2.5 5 5 5 2 0 3-1.2 3.2-2.8M3.2 16.2 4.5 18M20.8 16.2 19.5 18"/><circle cx="12" cy="3.5" r="1.5"/>`,
    `<circle class="t" cx="12" cy="14" r="6.5"/><path d="M12 2.5v12M5.5 14a6.5 6.5 0 0 0 13 0M5.5 14l-1.8-1.8M18.5 14l1.8-1.8M12 20.5V22"/>`,
    `<path d="M12 2.5v12" stroke-width="2.2"/><path d="M4.5 13.5c0 4 3.4 7 7.5 7s7.5-3 7.5-7" stroke-width="2.4"/><path class="f" d="M2.5 11.5 6.5 12 4 15zM21.5 11.5 17.5 12l2.5 3z"/>`,
  ],
  HelpOutline: [
    `<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"/><circle class="f" cx="12" cy="16.8" r=".8"/>`,
    `<circle class="t" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.5 2.4c-.6.3-1 .8-1 1.5v.7"/><circle class="f" cx="12" cy="16.8" r=".9"/>`,
    `<circle class="f" cx="12" cy="12" r="9.5"/><path class="k" d="M9.5 9.4a2.6 2.6 0 1 1 3.5 2.4c-.6.3-1 .8-1 1.5v.7" stroke-width="2"/><circle class="kf" cx="12" cy="17" r="1.2"/>`,
  ],
  Herbs: [
    `<path d="M12 21V9M12 13c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6zM12 11c0-3.2 2.3-5.5 5.5-5.5 0 3.2-2.3 5.5-5.5 5.5zM12 17c2.8 0 5-2 5-4.8-2.8 0-5 2-5 4.8z"/>`,
    `<path class="t" d="M12 13c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6zM12 11c0-3.2 2.3-5.5 5.5-5.5 0 3.2-2.3 5.5-5.5 5.5z"/><path d="M12 21V8M12 13c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6zM12 11c0-3.2 2.3-5.5 5.5-5.5 0 3.2-2.3 5.5-5.5 5.5zM12 17c2.8 0 5-2 5-4.8"/>`,
    `<path class="f" d="M11 21.5V13.9C7.3 13.5 5 10.7 5 6.5c3.8 0 6.4 2.3 6.9 5.8.3-3.8 2.8-6.3 6.6-6.3 0 3.8-2.5 6.4-6.2 6.6v2.8c.8-2.3 2.8-3.6 5.2-3.6 0 3-2.1 5.1-5.2 5.4v4.3z"/>`,
  ],
  HerbsBowl: [
    `<path d="M3.5 12h17a8.5 8.5 0 0 1-17 0zM9 20.5h6M16 3.5l-5 7M18.5 5.5l-4.5 5"/>`,
    `<path class="t" d="M3.5 12h17a8.5 8.5 0 0 1-17 0z"/><path d="M3.5 12h17a8.5 8.5 0 0 1-17 0zM9 20.5h6M17 3l-6 8.5"/><path d="M8.5 12c0-2 1.2-3.5 3-4"/>`,
    `<path class="f" d="M2.5 11.5h19a9.5 8.5 0 0 1-19 0z"/><path d="M17.5 2.5 11 11" stroke-width="2.4"/><path class="f" d="M8.5 21h7v1.5h-7z"/>`,
  ],
  Home: [
    `<path d="M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5"/>`,
    `<path class="t" d="M4.5 10.5 12 4.5l7.5 6V20h-15z"/><path d="M4.5 10.5 12 4.5l7.5 6V20h-15zM10 20v-5.5h4V20"/>`,
    `<path class="f" d="M12 3.2 21 10.5v10a1 1 0 0 1-1 1h-5v-6.5H9v6.5H4a1 1 0 0 1-1-1v-10z"/>`,
  ],
  Info: [
    `<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle class="f" cx="12" cy="8" r=".8"/>`,
    `<circle class="t" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M10.5 16.5h3"/><circle class="f" cx="12" cy="7.8" r=".9"/>`,
    `<circle class="f" cx="12" cy="12" r="9.5"/><path class="k" d="M12 11v5.5" stroke-width="2.2"/><circle class="kf" cx="12" cy="7.8" r="1.3"/>`,
  ],
  Instructions: [
    `<path d="M5 4.5h10.5l3.5 3.5v11.5H5zM15.5 4.5V8H19M8 11.5h8M8 14.5h8M8 17.5h5"/>`,
    `<path class="t" d="M4 5.5c2.7-1 5.3-1 8 .5 2.7-1.5 5.3-1.5 8-.5v13c-2.7-1-5.3-1-8 .5-2.7-1.5-5.3-1.5-8-.5z"/><path d="M4 5.5c2.7-1 5.3-1 8 .5 2.7-1.5 5.3-1.5 8-.5v13c-2.7-1-5.3-1-8 .5-2.7-1.5-5.3-1.5-8-.5zM12 6v13"/>`,
    `<path class="f" d="M6 2.5h9l4.5 4.5v13a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5z"/><path class="k" d="M8 11h8M8 14h8M8 17h5" stroke-width="1.6"/>`,
  ],
  Joker: [
    `<path d="M6 13c-.5-4 .5-7 3-9 .5 2.5 1.8 4 3 5 1.2-1 2.5-2.5 3-5 2.5 2 3.5 5 3 9M3.5 10.5C5 10 6 11 6 13M20.5 10.5C19 10 18 11 18 13M6 13h12M8 13a4 4 0 0 0 8 0M10 16h.01M14 16h.01"/><circle cx="3.2" cy="10.3" r=".9"/><circle cx="20.8" cy="10.3" r=".9"/><circle cx="9" cy="3.6" r=".8"/><circle cx="15" cy="3.6" r=".8"/>`,
    `<path class="t" d="M6 13c-.5-4 .5-7 3-9 .5 2.5 1.8 4 3 5 1.2-1 2.5-2.5 3-5 2.5 2 3.5 5 3 9z"/><path d="M6 13c-.5-4 .5-7 3-9 .5 2.5 1.8 4 3 5 1.2-1 2.5-2.5 3-5 2.5 2 3.5 5 3 9zM3.5 10.5C5 10 6 11 6 13M20.5 10.5C19 10 18 11 18 13M7.5 13a4.5 4.5 0 0 0 9 0"/><circle cx="3.2" cy="10.3" r="1"/><circle cx="20.8" cy="10.3" r="1"/>`,
    `<path class="f" d="M5.5 13.5c-.6-4.4.6-7.6 3.4-9.9.6 2.6 1.8 4.3 3.1 5.4 1.3-1.1 2.5-2.8 3.1-5.4 2.8 2.3 4 5.5 3.4 9.9z"/><path class="f" d="M7.2 14.5h9.6a4.8 4.8 0 0 1-9.6 0z"/><circle class="f" cx="3" cy="10.5" r="1.5"/><circle class="f" cx="21" cy="10.5" r="1.5"/><path d="M4.2 11.2c1 .4 1.4 1.2 1.4 2.3M19.8 11.2c-1 .4-1.4 1.2-1.4 2.3" stroke-width="1.4"/>`,
  ],
  King: [
    `<path d="M7 4.5v15M17 4.5 9 12.5l8 7M5 4.5h4M15 4.5h4M5 19.5h4M15 19.5h4"/>`,
    `<path class="t" d="M4 8.5 7.5 11 12 5l4.5 6L20 8.5 18.5 18h-13z"/><path d="M4 8.5 7.5 11 12 5l4.5 6L20 8.5 18.5 18h-13zM5.5 20.5h13"/>`,
    `<path class="f" d="M3 7.5 7.5 11 12 4l4.5 7L21 7.5 19 18.5H5z"/><rect class="f" x="5" y="19.5" width="14" height="2" rx=".6"/>`,
  ],
  Lock: [
    `<rect x="5.5" y="10.5" width="13" height="10" rx="1.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/><path d="M12 14.5v2"/>`,
    `<rect class="t" x="5" y="10" width="14" height="11" rx="2.5"/><rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/><circle cx="12" cy="15.5" r="1.3"/>`,
    `<path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke-width="2.2"/><rect class="f" x="4.5" y="9.5" width="15" height="12" rx="2.5"/><circle class="kf" cx="12" cy="15.5" r="1.8"/>`,
  ],
  Menu: [
    `<path d="M4.5 7h15M4.5 12h15M4.5 17h15"/>`,
    `<path d="M4 7h16M4 12h11M4 17h16"/><circle class="t" cx="18.5" cy="12" r="2"/>`,
    `<path d="M4 6.5h16M4 12h16M4 17.5h16" stroke-width="2.6"/>`,
  ],
  MilkyWay: [
    `<ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(-25 12 12)"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="5" stroke-dasharray="1 2.2"/>`,
    `<ellipse class="t" cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)"/><circle class="f" cx="12" cy="12" r="2.3"/><path d="M19 4.5v.01M5 19.5v.01" stroke-width="2.6"/>`,
    `<path class="f" d="M12 7.5c1.3 0 2.5.5 3.3 1.4 2.5-1.1 4.6-1.4 5.4-.3 1.1 1.6-1.6 5.1-6.1 7.8-4.5 2.7-8.8 3.7-9.9 2.1-.7-1-.1-2.7 1.5-4.5A4.5 4.5 0 0 1 12 7.5z"/><path class="f" d="M18.5 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>`,
  ],
  More: [
    `<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>`,
    `<rect class="t" x="2.5" y="7" width="19" height="10" rx="5"/><circle class="f" cx="7.5" cy="12" r="1.3"/><circle class="f" cx="12" cy="12" r="1.3"/><circle class="f" cx="16.5" cy="12" r="1.3"/>`,
    `<circle class="f" cx="5.5" cy="12" r="2.2"/><circle class="f" cx="12" cy="12" r="2.2"/><circle class="f" cx="18.5" cy="12" r="2.2"/>`,
  ],
  Offer: [
    `<path d="M12 3l2.2 2.1 3-.3.6 3 2.7 1.4-1.3 2.8 1.3 2.8-2.7 1.4-.6 3-3-.3L12 21l-2.2-2.1-3 .3-.6-3-2.7-1.4L4.8 12 3.5 9.2l2.7-1.4.6-3 3 .3z"/><path d="M9.5 14.5l5-5"/><circle cx="9.8" cy="9.8" r=".6" class="f"/><circle cx="14.2" cy="14.2" r=".6" class="f"/>`,
    `<path class="t" d="M3.5 12V4.5a1 1 0 0 1 1-1H12l8.5 8.5-8.5 8.5z"/><path d="M3.5 12V4.5a1 1 0 0 1 1-1H12l8.5 8.5-8.5 8.5z"/><circle cx="8" cy="8" r="1.4"/>`,
    `<path class="f" d="M12 2l2.5 2.3 3.4-.4.7 3.3 3 1.6-1.4 3.2 1.4 3.2-3 1.6-.7 3.3-3.4-.4L12 22l-2.5-2.3-3.4.4-.7-3.3-3-1.6L3.8 12 2.4 8.8l3-1.6.7-3.3 3.4.4z"/><path class="k" d="M9.3 14.7l5.4-5.4" stroke-width="1.8"/><circle class="kf" cx="9.6" cy="9.6" r="1"/><circle class="kf" cx="14.4" cy="14.4" r="1"/>`,
  ],
  Play: [
    `<path d="M7.5 4.5v15L19.5 12z"/>`,
    `<circle class="t" cx="12" cy="12" r="9.5"/><path d="M10 8v8l6.2-4z"/>`,
    `<path class="f" d="M7 3.8a1 1 0 0 1 1.5-.9l11.5 8.2a1 1 0 0 1 0 1.8L8.5 21.1A1 1 0 0 1 7 20.2z"/>`,
  ],
  PlayHand: [
    `<rect x="4" y="6" width="8" height="12" rx="1.2" transform="rotate(-15 8 12)"/><rect x="8" y="4.5" width="8" height="12" rx="1.2"/><rect x="12" y="6" width="8" height="12" rx="1.2" transform="rotate(15 16 12)"/>`,
    `<path class="t" d="M4 20a8 8 0 0 1 16 0z"/><rect x="4" y="6" width="8" height="12" rx="1.4" transform="rotate(-15 8 12)"/><rect x="8" y="4" width="8" height="12" rx="1.4"/><rect x="12" y="6" width="8" height="12" rx="1.4" transform="rotate(15 16 12)"/>`,
    `<rect class="f" x="4" y="6" width="8" height="12" rx="1.3" transform="rotate(-15 8 12)" opacity=".5"/><rect class="f" x="12" y="6" width="8" height="12" rx="1.3" transform="rotate(15 16 12)" opacity=".5"/><rect class="f" x="8" y="4" width="8" height="12" rx="1.3"/>`,
  ],
  PlusOutline: [
    `<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>`,
    `<circle class="t" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M12 7.8v8.4M7.8 12h8.4"/>`,
    `<circle class="f" cx="12" cy="12" r="9.5"/><path class="k" d="M12 7.5v9M7.5 12h9" stroke-width="2.2"/>`,
  ],
  Potion: [
    `<path d="M10 3.5h4M10.5 3.5v5L5.5 17a2.5 2.5 0 0 0 2.2 3.5h8.6a2.5 2.5 0 0 0 2.2-3.5l-5-8.5v-5M7.5 14h9"/>`,
    `<path class="t" d="M6.8 14.5h10.4L18.5 17a2.5 2.5 0 0 1-2.2 3.5H7.7A2.5 2.5 0 0 1 5.5 17z"/><path d="M9.5 3h5M10.5 3v5.5L5.5 17a2.5 2.5 0 0 0 2.2 3.5h8.6a2.5 2.5 0 0 0 2.2-3.5l-5-8.5V3"/><circle cx="11" cy="17" r=".6" class="f"/><circle cx="14" cy="16.2" r=".9"/>`,
    `<path class="f" d="M9 2.5h6v2h-1v4l5.3 8.6a3 3 0 0 1-2.6 4.4H7.3a3 3 0 0 1-2.6-4.4L10 8.5v-4H9z"/><circle class="kf" cx="10.5" cy="16.5" r="1.1"/><circle class="kf" cx="14" cy="14.5" r=".8"/>`,
  ],
  Quote: [
    `<path d="M5 17c2.8-1 4-3.3 4-6.5V7H5v4h4M14.5 17c2.8-1 4-3.3 4-6.5V7h-4v4h4"/>`,
    `<path class="t" d="M4.5 6.5h5v5c0 3.2-1.4 5.4-4.3 6.5l-.7-1.4c1.7-.8 2.5-2.1 2.6-4H4.5zM14 6.5h5v5c0 3.2-1.4 5.4-4.3 6.5l-.7-1.4c1.7-.8 2.5-2.1 2.6-4H14z"/><path d="M4.5 6.5h5v5c0 3.2-1.4 5.4-4.3 6.5l-.7-1.4c1.7-.8 2.5-2.1 2.6-4H4.5zM14 6.5h5v5c0 3.2-1.4 5.4-4.3 6.5l-.7-1.4c1.7-.8 2.5-2.1 2.6-4H14z"/>`,
    `<path class="f" d="M7 6a3.5 3.5 0 0 1 3.5 3.8c-.2 4-2.4 6.9-5.8 8.2l-.8-1.5c1.8-1 2.8-2.3 3.1-4A3.5 3.5 0 0 1 7 6zM16.5 6A3.5 3.5 0 0 1 20 9.8c-.2 4-2.4 6.9-5.8 8.2l-.8-1.5c1.8-1 2.8-2.3 3.1-4A3.5 3.5 0 0 1 16.5 6z"/>`,
  ],
  Recent: [
    `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`,
    `<path class="t" d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5"/><path d="M3.5 12A8.5 8.5 0 1 0 6 6L3.5 8.5M3.5 4.5v4h4M12 7.5V12l3 2.2"/>`,
    `<circle class="f" cx="12" cy="12" r="9.5"/><path class="k" d="M12 7v5.2l3.5 2.3" stroke-width="2.2"/>`,
  ],
  Reset: [
    `<path d="M5 12a7 7 0 1 0 2-5M5 4.5V9h4.5"/>`,
    `<circle class="t" cx="12" cy="12" r="9"/><path d="M7 12a5 5 0 1 0 1.5-3.6M8.2 6v2.8H11"/>`,
    `<path d="M5 12a7 7 0 1 0 2-5" stroke-width="2.6"/><path class="f" d="M3.5 3.5 10 10H3.5z"/>`,
  ],
  Undo: [
    `<path d="M9 5 4.5 9.5 9 14M4.5 9.5h9a5.5 5.5 0 0 1 0 11H9"/>`,
    `<rect class="t" x="3" y="3" width="18" height="18" rx="5"/><path d="M10 7.5 6.5 11l3.5 3.5M6.5 11h7a3.5 3.5 0 0 1 0 7H11"/>`,
    `<path class="f" d="M10 3.5 3.5 9.5l6.5 6V12h4a3.5 3.5 0 0 1 0 7H10v2.5h4a6 6 0 0 0 0-12h-4z"/>`,
  ],
  RotateDevice: [
    `<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2M20.5 9a8.5 8.5 0 0 0-3.5-5M19 3.5l1.5 5.5-5-1"/>`,
    `<rect class="t" x="3" y="9" width="18" height="10" rx="2"/><rect x="3" y="9" width="18" height="10" rx="2"/><path d="M7 5.5A8 8 0 0 1 17 5M15 2.5 17.3 5 14.5 6.5"/>`,
    `<rect class="f" x="3" y="8.5" width="18" height="11" rx="2.2"/><circle class="kf" cx="18.5" cy="14" r=".9"/><path d="M6.5 5.5a8 8 0 0 1 11 0" stroke-width="2"/><path class="f" d="M19 2.5v5h-5z"/>`,
  ],
  Royal: [
    `<circle cx="12" cy="11" r="3.3"/><path d="M5.5 21c.5-3.5 3.3-5.5 6.5-5.5s6 2 6.5 5.5M8.8 7.3 8.4 3.8l1.8 1.5L12 3l1.8 2.3 1.8-1.5-.4 3.5"/>`,
    `<path class="t" d="M5.5 21c.5-3.5 3.3-5.5 6.5-5.5s6 2 6.5 5.5z"/><circle cx="12" cy="11" r="3.5"/><path d="M5.5 21c.5-3.5 3.3-5.5 6.5-5.5s6 2 6.5 5.5zM8.5 7.5 8 3.5l2 1.7L12 2.8l2 2.4 2-1.7-.5 4z"/>`,
    `<circle class="f" cx="12" cy="11.3" r="3.6"/><path class="f" d="M4.8 21.5c.6-4 3.6-6.2 7.2-6.2s6.6 2.2 7.2 6.2zM8.2 7.2l-.6-4.4 2.3 1.9L12 2l2.1 2.7 2.3-1.9-.6 4.4z"/>`,
  ],
  Search: [
    `<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5M8 8.5a3 3 0 0 1 2.5-1.5"/>`,
    `<circle class="t" cx="10.5" cy="10.5" r="6.5"/><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>`,
    `<circle cx="10.5" cy="10.5" r="6" stroke-width="2.6"/><path d="M15.3 15.3 20.5 20.5" stroke-width="3.2"/>`,
  ],
  Sequence: [
    `<path d="M4 7l5 5-5 5M10 7l5 5-5 5M16 7l5 5-5 5"/>`,
    `<path class="t" d="M3 6h4l5 6-5 6H3l5-6zM11 6h4l5 6-5 6h-4l5-6z"/><path d="M3 6h4l5 6-5 6H3l5-6zM11 6h4l5 6-5 6h-4l5-6z"/>`,
    `<path class="f" d="M2.5 5.5h4l5.5 6.5-5.5 6.5h-4L8 12zM10.5 5.5h4l5.5 6.5-5.5 6.5h-4L16 12z"/>`,
  ],
  Settings: [
    `<path d="${gear(7, 9.2)}"/><circle cx="12" cy="12" r="3"/>`,
    `<path class="t" d="${gear(7.2, 9.5)}"/><path d="${gear(7.2, 9.5)}"/><circle cx="12" cy="12" r="3"/>`,
    `<path class="f" d="${gear(7.4, 10)}"/><circle class="kf" cx="12" cy="12" r="3.2"/>`,
  ],
  Shield: [
    `<path d="M12 3.5 5 6v5.5c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6z"/><path d="M12 3.5v17M5.5 11h13"/>`,
    `<path class="t" d="M12 3v18c-4.3-1.5-7.5-4.9-7.5-9.5V5.8z"/><path d="M12 3 4.5 5.8v5.7c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V5.8z"/>`,
    `<path class="f" d="M12 2.5 4 5.5v6c0 4.9 3.4 8.5 8 10 4.6-1.5 8-5.1 8-10v-6z"/><path class="k" d="M12 6.5v11M8 10.5h8" stroke-width="1.6"/>`,
  ],
  Shuffle: [
    `<path d="M3.5 7h3.5c5 0 5 10 10 10h3.5M3.5 17H7c1.6 0 2.7-1 3.5-2.3M13.5 9.3C14.3 8 15.4 7 17 7h3.5M18 4.5 20.5 7 18 9.5M18 14.5l2.5 2.5-2.5 2.5"/>`,
    `<rect class="t" x="3" y="3" width="18" height="18" rx="5"/><path d="M6.5 8.5h1.5c4 0 4 7 8 7h1.5M6.5 15.5H8c1.3 0 2.1-.7 2.8-1.6M13.2 10.1c.7-.9 1.5-1.6 2.8-1.6h1.5M16 6.8l1.7 1.7-1.7 1.7M16 13.8l1.7 1.7-1.7 1.7"/>`,
    `<path d="M3 7h4c5 0 5 10 10 10h1.5M3 17h4c1.6 0 2.7-1 3.5-2.3M13.5 9.3C14.3 8 15.4 7 17 7h1.5" stroke-width="2.4"/><path class="f" d="M18 3.5 22 7l-4 3.5zM18 13.5l4 3.5-4 3.5z"/>`,
  ],
  Skull: [
    `<path d="M12 3.5c-4.4 0-7.5 3.2-7.5 7.3 0 2.4 1.1 4.2 3 5.3v3.4h9v-3.4c1.9-1.1 3-2.9 3-5.3 0-4.1-3.1-7.3-7.5-7.3zM10 19.5v-2M14 19.5v-2"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M12 13.5l-.8 1.6h1.6z"/>`,
    `<path class="t" d="M12 3.5c-4.4 0-7.5 3.2-7.5 7.3 0 2.4 1.1 4.2 3 5.3v3.4h9v-3.4c1.9-1.1 3-2.9 3-5.3 0-4.1-3.1-7.3-7.5-7.3z"/><path d="M12 3.5c-4.4 0-7.5 3.2-7.5 7.3 0 2.4 1.1 4.2 3 5.3v3.4h9v-3.4c1.9-1.1 3-2.9 3-5.3 0-4.1-3.1-7.3-7.5-7.3z"/><circle class="f" cx="9" cy="11.2" r="1.7"/><circle class="f" cx="15" cy="11.2" r="1.7"/>`,
    `<path class="f" d="M12 2.5c-4.9 0-8.5 3.6-8.5 8.2 0 2.6 1.2 4.6 3.2 5.9V20a1.5 1.5 0 0 0 1.5 1.5h7.6a1.5 1.5 0 0 0 1.5-1.5v-3.4c2-1.3 3.2-3.3 3.2-5.9 0-4.6-3.6-8.2-8.5-8.2z"/><circle class="kf" cx="8.8" cy="11" r="2"/><circle class="kf" cx="15.2" cy="11" r="2"/><path class="kf" d="M12 13.6l-1.1 2h2.2z"/><path class="k" d="M10.2 21.5v-2.5M13.8 21.5v-2.5" stroke-width="1.2"/>`,
  ],
  SmokeBomb: [
    `<circle cx="10" cy="14.5" r="6"/><path d="M13.5 9.5 15 8M15 8c.5-2 2-3 3.8-2.6M18 3.5c1.2.2 2 1 2.2 2.2"/>`,
    `<circle class="t" cx="10" cy="14.5" r="6.5"/><circle cx="10" cy="14.5" r="6.5"/><path d="M14.5 9.8l1.8-1.8M16.3 8c.6-2.2 2.4-3.3 4.2-2.8M7 13a3 3 0 0 1 3-3"/>`,
    `<circle class="f" cx="10" cy="14.5" r="7"/><rect class="f" x="13.8" y="6.8" width="3.4" height="3.4" rx=".6" transform="rotate(45 15.5 8.5)"/><path d="M16.8 6.2c.9-2.1 2.6-2.9 4.2-2.3" stroke-width="1.6"/><circle class="kf" cx="7.8" cy="12.3" r="1.2"/>`,
  ],
  Star: [
    `<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.8l-5.3 2.8 1.1-5.8-4.3-4.1 5.9-.8z"/>`,
    `<path class="t" d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>`,
    `<path class="f" d="M12 2.2c.4 0 .7.2.9.6l2.5 5.2 5.6.8c.9.1 1.2 1.2.6 1.8l-4.1 4 1 5.6c.1.9-.8 1.5-1.6 1.1L12 18.6l-5 2.7c-.8.4-1.7-.3-1.6-1.1l1-5.6-4.1-4c-.6-.6-.3-1.7.6-1.8l5.6-.8 2.5-5.2c.3-.4.6-.6 1-.6z"/>`,
  ],
  StarOutline: [
    `<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.8l-5.3 2.8 1.1-5.8-4.3-4.1 5.9-.8z"/>`,
    `<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>`,
    `<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" stroke-width="2.2"/>`,
  ],
  Sword: [
    `<path d="M19.5 4.5 10 14M19.5 4.5h-3.5M19.5 4.5V8M7.5 11.5l5 5M8 16l-3.5 3.5"/><circle cx="4" cy="20" r=".8"/>`,
    `<path class="t" d="M20 4v3.5L10.5 17 7 13.5 16.5 4z"/><path d="M20 4v3.5L10.5 17 7 13.5 16.5 4zM5.5 12l6.5 6.5M8.5 15.5 4.5 19.5"/>`,
    `<path class="f" d="M20.5 3.5v4L11 17l-4-4 9.5-9.5z"/><path d="M5 11.5l7.5 7.5M8.7 15.3 4 20" stroke-width="2.4"/>`,
  ],
  Tao: [
    `<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a4.25 4.25 0 0 1 0 8.5 4.25 4.25 0 0 0 0 8.5"/><circle cx="12" cy="7.75" r=".8"/><circle cx="12" cy="16.25" r=".8" class="f"/>`,
    `<path class="t" d="M12 3a4.5 4.5 0 0 1 0 9 4.5 4.5 0 0 0 0 9 9 9 0 0 1 0-18z"/><circle cx="12" cy="12" r="9"/><path d="M12 3a4.5 4.5 0 0 1 0 9 4.5 4.5 0 0 0 0 9"/><circle class="f" cx="12" cy="7.5" r="1"/><circle cx="12" cy="16.5" r="1"/>`,
    `<path class="f" fill-rule="evenodd" d="M12 2.5a9.5 9.5 0 1 1 0 19 4.75 4.75 0 0 0 0-9.5 4.75 4.75 0 0 1 0-9.5zm0 3.9a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7z"/><circle cx="12" cy="12" r="9.5" stroke-width="1.4"/><circle class="f" cx="12" cy="16.75" r="1.35"/>`,
  ],
  Trophy: [
    `<path d="M7.5 4.5h9v5a4.5 4.5 0 0 1-9 0zM7.5 6.5H4.5c0 2.5 1.2 4 3.3 4.3M16.5 6.5h3c0 2.5-1.2 4-3.3 4.3M12 14v4M8.5 20.5h7"/>`,
    `<path class="t" d="M7 4h10v5.5a5 5 0 0 1-10 0z"/><path d="M7 4h10v5.5a5 5 0 0 1-10 0zM7 6H4c0 3 1.5 4.5 3.5 4.8M17 6h3c0 3-1.5 4.5-3.5 4.8M12 14.5v3.5M8 20.5h8M9.5 18h5"/>`,
    `<path class="f" d="M6.5 3h11v2.2h3.3v1c0 3.3-1.7 5.3-4.3 5.8a5.5 5.5 0 0 1-3.5 3v2.5h2.5v2.2h1.8V21h-10.6v-1.3h1.8v-2.2H11V15a5.5 5.5 0 0 1-3.5-3c-2.6-.5-4.3-2.5-4.3-5.8v-1h3.3z"/>`,
  ],
};
