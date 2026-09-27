import type { Candidate } from "../types.ts";

const c: Record<number, Candidate[]> = {
  11: [
    {
      name: "The Potter's Wheel",
      theme: "We mold clay into a pot: a pot turning on the wheel",
      keyPhrases: ["We mold clay into a pot,"],
      draw: (b) => {
        const left = b.pts([[40, 14, 2], [36, 22], [26, 36], [24, 50, 1.8], [32, 60], [40, 63, 1.6]]);
        const right = b.pts([[60, 14, 2], [64, 22], [74, 36], [76, 50, 1.8], [68, 60], [60, 63, 1.6]]);
        b.line(...left);
        b.line(...right);
        b.line(left[0], right[0]);
        b.line(left[5], right[5]);
        b.close(b.ring(50, 74, 36, 10, 1.6, 0, 7));
        b.path([[50, 81, 1.2], [50, 94, 1.8]]);
        b.path([[30, 94, 1.4], [70, 94, 1.4]]);
      },
    },
    {
      name: "The Clay Pot",
      theme: "It is the emptiness inside that makes the vessel useful",
      keyPhrases: ["that makes the vessel useful."],
      draw: (b) => {
        b.close(b.ring(50, 16, 16, 8, 1.8, 0, 4));
        const l = b.pts([[36, 20], [30, 34], [18, 50, 1.8], [22, 70], [34, 84], [50, 88, 2]]);
        const r = b.pts([[64, 20], [70, 34], [82, 50, 1.8], [78, 70], [66, 84]]);
        b.line(...l, ...r.slice().reverse());
        b.path([[20, 46, 1], [50, 52, 1.2], [80, 46, 1]]);
        b.nebula([[36, 22], [64, 22], [80, 50], [66, 82], [34, 82], [20, 50]]);
      },
      nebulaShare: 0.15,
    },
    {
      name: "The House",
      theme: "It is the emptiness inside that makes it livable: a house of door and windows",
      keyPhrases: ["that makes it livable."],
      draw: (b) => {
        b.loop([[50, 8, 2.4], [90, 40, 2], [10, 40, 2]]);
        const [wl, wr] = b.pts([[18, 40, 1.2], [82, 40, 1.2]]);
        b.line(wl, b.star(18, 90, 1.8), b.star(82, 90, 1.8), wr);
        b.loop([[42, 90, 1.4], [42, 64, 1.4], [58, 64, 1.4], [58, 90, 1.4]]);
        b.loop([[26, 50, 1.2], [36, 50, 1.2], [36, 60, 1.2], [26, 60, 1.2]]);
        b.loop([[64, 50, 1.2], [74, 50, 1.2], [74, 60, 1.2], [64, 60, 1.2]]);
      },
    },
    {
      name: "The Pavilion",
      theme: "We fashion wood for a house: an open pavilion, all emptiness inside",
      keyPhrases: ["We fashion wood for a house,"],
      draw: (b) => {
        b.path([[4, 26, 2.2], [14, 34, 1.6], [30, 30], [50, 14, 2.4], [70, 30], [86, 34, 1.6], [96, 26, 2.2]]);
        const beam = b.path([[16, 42, 1.6], [84, 42, 1.6]]);
        b.line(b.star(14, 34, 1.2), beam[0]);
        b.line(b.star(86, 34, 1.2), beam[1]);
        for (const x of [22, 78]) b.line(b.star(x, 42, 1.4), b.star(x, 84, 1.8));
        b.path([[8, 84, 1.6], [22, 84], [78, 84], [92, 84, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[4, 92, 1.4], [96, 92, 1.4]]);
      },
    },
    {
      name: "The Cart",
      theme: "Thirty spokes joined together in a wheel: an ox cart",
      keyPhrases: ["Thirty spokes are joined together in a wheel,"],
      draw: (b) => {
        const rim = b.ring(40, 62, 22, 10, 1.8);
        b.close(rim);
        const hub = b.star(40, 62, 1.4);
        for (const i of [0, 2, 4, 6, 8]) b.line(hub, rim[i]);
        b.loop([[8, 22, 1.8], [72, 22, 1.8], [72, 36, 1.4], [8, 36, 1.4]]);
        b.path([[72, 30, 1.4], [96, 24, 2]]);
        b.path([[2, 90, 1], [98, 90, 1]]);
      },
    },
  ],
  12: [
    {
      name: "The Plum Blossom",
      theme: "Five colors blind the eye: a five-petalled flower",
      keyPhrases: ["Five colors blind the eye."],
      draw: (b) => {
        for (let i = 0; i < 5; i++) {
          const a = ((-90 + i * 72) * Math.PI) / 180;
          b.close(b.ring(50 + 22 * Math.cos(a), 46 + 22 * Math.sin(a), 13, 6, 1.6, (-90 + i * 72)));
        }
        b.star(50, 46, 3);
        b.path([[62, 80, 1.2], [70, 88, 1.4], [82, 96, 1.6]]);
      },
    },
    {
      name: "The Closed Eye",
      theme: "Five colors blind the eye: an eye shut to the show",
      keyPhrases: ["Five colors blind the eye."],
      draw: (b) => {
        const lid = b.path([[8, 44, 2], [22, 56], [38, 62], [50, 63, 2.2], [62, 62], [78, 56], [92, 44, 2]]);
        b.line(lid[0], ...b.pts([[26, 38], [50, 34, 1.6], [74, 38]]), lid[6]);
        for (const [i, dx] of [[1, -4], [2, -2], [3, 0], [4, 2], [5, 4]] as const) {
          const s = b.starAt(lid[i]);
          b.line(lid[i], b.star(s.x + dx, s.y + 12, 1.4));
        }
      },
    },
    {
      name: "The Chime Bells",
      theme: "Five notes deafen the ear: a rack of bronze bells",
      keyPhrases: ["Five notes deafen the ear."],
      draw: (b) => {
        const beam = b.path([[4, 16, 2], [96, 16, 2]]);
        b.line(beam[0], b.star(8, 92, 1.6));
        b.line(beam[1], b.star(92, 92, 1.6));
        for (const [x, h] of [[26, 30], [50, 38], [74, 30]]) {
          const top = b.star(x, 16, 1.2);
          const bell = b.loop([[x - 5, 24, 1.4], [x + 5, 24, 1.4], [x + 9, 24 + h, 1.8], [x - 9, 24 + h, 1.8]]);
          b.line(top, bell[0]);
          b.star(x, 28 + h, 1.2);
        }
      },
    },
    {
      name: "The Rainbow",
      theme: "Five colors blind the eye: five bands of color",
      keyPhrases: ["Five colors blind the eye."],
      draw: (b) => {
        b.line(...b.arc(50, 82, 44, 180, 360, 9, 2));
        b.line(...b.arc(50, 82, 32, 180, 360, 7, 1.6));
        b.line(...b.arc(50, 82, 20, 180, 360, 5, 1.2));
        b.path([[2, 90, 1.2], [20, 86, 1.4], [36, 92, 1.2]]);
        b.path([[64, 92, 1.2], [80, 86, 1.4], [98, 90, 1.2]]);
      },
    },
    {
      name: "The Heart",
      theme: "The Master acts on what she feels and not what she sees",
      keyPhrases: ["The Master acts on what she feels and not what she sees."],
      draw: (b) => {
        b.loop([[50, 32, 2], [58, 20], [70, 14, 1.8], [82, 18], [90, 30], [88, 46], [76, 62], [62, 76], [50, 88, 2.6], [38, 76], [24, 62], [12, 46], [10, 30], [18, 18], [30, 14, 1.8], [42, 20]]);
        b.star(50, 50, 2.4);
      },
    },
  ],
  13: [
    {
      name: "The Tightrope Walker",
      theme: "Success is as dangerous as failure",
      keyPhrases: ["Success is as dangerous as failure,"],
      draw: (b) => {
        b.close(b.ring(50, 18, 5, 5, 1.8));
        const neck = b.star(50, 27, 1.8);
        const hips = b.star(50, 52, 2);
        b.line(neck, hips);
        b.line(hips, b.star(44, 64, 1.4), b.star(48, 76, 1.8));
        b.line(hips, b.star(58, 64, 1.4), b.star(54, 76, 1.8));
        const pole = b.path([[4, 44, 2.2], [26, 36, 1.4], [50, 34, 1.2], [74, 36, 1.4], [96, 44, 2.2]]);
        b.line(neck, pole[1]);
        b.line(neck, pole[3]);
        b.path([[2, 70, 1.6], [50, 77, 1], [98, 70, 1.6]]);
      },
    },
    {
      name: "The Ouroboros",
      theme: "We are often our own worst enemy: the serpent eating its tail",
      keyPhrases: ["and we are often our own worst enemy."],
      draw: (b) => {
        const body = b.arc(50, 50, 36, -60, 250, 14, 1.8);
        b.line(...body);
        b.line(...b.arc(50, 50, 28, -60, 250, 12, 1.2));
        const head = b.loop([[64, 16, 2], [74, 14, 1.6], [80, 22, 2.2], [74, 30, 1.6], [66, 28, 1.6]]);
        void head;
        b.star(73, 21, 2.6);
      },
    },
    {
      name: "The Globe",
      theme: "Love the whole world as if it were your self",
      keyPhrases: ["Love the whole world as if it were your self;"],
      draw: (b) => {
        b.close(b.ring(50, 50, 40, 16, 2));
        b.path([[10, 50, 1.2], [30, 50, 1.2], [50, 50, 2.2], [70, 50, 1.2], [90, 50, 1.2]]);
        b.line(...b.arc(50, 50, 16, -90, 90, 5, 1.2, 40));
        b.line(...b.arc(50, 50, 16, 90, 270, 5, 1.2, 40).slice(1, 4));
        b.path([[18, 30, 1], [82, 30, 1]]);
        b.path([[18, 70, 1], [82, 70, 1]]);
      },
    },
    {
      name: "The Crown",
      theme: "Receiving favor and losing it both cause alarm",
      keyPhrases: ["Receiving favor and losing it both cause alarm."],
      draw: (b) => {
        const base = b.path([[18, 78, 2], [50, 82, 1.6], [82, 78, 2]]);
        b.line(base[0], ...b.pts([[14, 34, 2.2], [32, 54], [50, 22, 2.8], [68, 54], [86, 34, 2.2]]), base[2]);
        b.path([[20, 68, 1.2], [50, 72, 1.4], [80, 68, 1.2]]);
        b.pts([[50, 62, 2], [34, 66, 1.2], [66, 66, 1.2]]);
      },
    },
    {
      name: "The Pendulum",
      theme: "Success is as dangerous as failure: the swing between",
      keyPhrases: ["What does it mean that success is as dangerous as failure?"],
      draw: (b) => {
        b.path([[30, 6, 1.4], [50, 6, 2.2], [70, 6, 1.4]]);
        b.path([[50, 6], [62, 32, 1], [72, 54, 1.2]].map(([x, y, m]) => [x, y, m ?? 2.2] as [number, number, number]));
        b.close(b.ring(76, 62, 7, 6, 2));
        b.line(...b.arc(50, 6, 70, 60, 125, 7, 1.2));
        b.pts([[16, 50, 1], [10, 42, 0.8]]);
      },
    },
  ],
  14: [
    {
      name: "The Infinity Loop",
      theme: "Follow it and there will be no end",
      keyPhrases: ["follow it and there will be no end."],
      draw: (b) => {
        const pts: [number, number, number][] = [];
        for (let i = 0; i < 16; i++) {
          const t = (i / 16) * Math.PI * 2;
          const d = 1 + Math.sin(t) ** 2;
          pts.push([50 + (42 * Math.cos(t)) / d, 50 + (42 * Math.sin(t) * Math.cos(t)) / d, i % 4 === 0 ? 2.2 : 1.6]);
        }
        b.close(b.pts(pts));
      },
    },
    {
      name: "Three Rings as One",
      theme: "These three cannot be further described, so we treat them as The One",
      keyPhrases: ["so we treat them as The One."],
      draw: (b) => {
        b.close(b.ring(50, 34, 20, 9, 1.8));
        b.close(b.ring(36, 58, 20, 9, 1.8, -30));
        b.close(b.ring(64, 58, 20, 9, 1.8, 30));
        b.star(50, 50, 2.8);
      },
    },
    {
      name: "The Ensō",
      theme: "Formless forms: a circle drawn in one breath, without beginning or end",
      keyPhrases: ["Formless forms, and imageless images,"],
      draw: (b) => {
        const pts: [number, number, number][] = [];
        for (let i = 0; i < 16; i++) {
          const a = ((110 + i * 20) * Math.PI) / 180;
          const r = 38 - i * 0.3;
          pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a), 2.4 - i * 0.08]);
        }
        b.path(pts);
      },
    },
    {
      name: "The New Moon",
      theme: "Look for it, and it can't be seen",
      keyPhrases: ["Look for it, and it can't be seen."],
      draw: (b) => {
        b.line(...b.arc(50, 50, 34, 110, 250, 6, 2.2));
        b.line(...b.arc(44, 50, 32, 118, 242, 5, 1.2));
        b.pts(b.arcPoints(50, 50, 34, 34, -80, 80, 7), 0.7);
        b.pts([[88, 16, 1.6], [92, 76, 1.2], [10, 12, 1]]);
      },
    },
    {
      name: "The Endless Road",
      theme: "Approach it and you will not see a beginning",
      keyPhrases: ["Approach it and you will not see a beginning;"],
      draw: (b) => {
        b.path([[4, 96, 2], [24, 76, 1.6], [38, 62, 1.4], [46, 54, 1.2], [50, 50, 2.4]]);
        b.path([[96, 96, 2], [76, 76, 1.6], [62, 62, 1.4], [54, 54, 1.2], [50, 50, 2.4]]);
        b.path([[2, 50, 1.2], [24, 50, 1.4], [50, 50], [76, 50, 1.4], [98, 50, 1.2]].map(([x, y, m]) => [x, y, m ?? 2.4] as [number, number, number]));
        b.pts([[50, 92, 1.6], [50, 72, 1.2], [50, 60, 1]]);
      },
    },
  ],
  15: [
    {
      name: "The Snowflake",
      theme: "Careful as someone crossing a frozen stream in winter",
      keyPhrases: ["as someone crossing a frozen stream in winter."],
      draw: (b) => {
        const center = b.star(50, 50, 2.4);
        for (let i = 0; i < 6; i++) {
          const a = ((-90 + i * 60) * Math.PI) / 180;
          const at = (r: number, da = 0): [number, number] => [50 + r * Math.cos(a + da), 50 + r * Math.sin(a + da)];
          const [mid, tip] = b.pts([at(24), at(42)], 1.4);
          b.starAt(tip).mag = 2;
          b.line(center, mid, tip);
          b.line(b.star(...at(34, 0.32), 1.2), mid, b.star(...at(34, -0.32), 1.2));
        }
      },
    },
    {
      name: "The Melting Icicles",
      theme: "Fluid as melting ice",
      keyPhrases: ["Fluid as melting ice."],
      draw: (b) => {
        const eave = b.pts([[4, 16, 1.6], [20, 16], [36, 16], [52, 16], [68, 16], [84, 16], [96, 16, 1.6]]);
        b.line(...eave);
        for (const [i, len] of [[1, 44], [2, 64], [3, 36], [4, 56], [5, 30]]) {
          const top = b.starAt(eave[i]);
          b.line(b.star(top.x - 5, 16, 1), b.star(top.x, 16 + len, 1.8), b.star(top.x + 5, 16, 1));
          b.star(top.x, 16 + len + 12, 1.4);
        }
      },
    },
    {
      name: "The Alert Deer",
      theme: "Alert as if surrounded on all sides by the enemy",
      keyPhrases: ["Alert as if surrounded on all sides by the enemy."],
      draw: (b) => {
        const head = b.loop([[70, 22, 1.8], [76, 20], [84, 28, 2], [76, 30]]);
        b.line(head[0], ...b.pts([[64, 12, 1.4], [60, 4, 1.8]]));
        b.line(b.star(64, 12, 1), b.star(56, 10, 1.4));
        b.line(head[1], ...b.pts([[78, 10, 1.4], [74, 2, 1.8]]));
        b.line(b.star(78, 10, 1), b.star(86, 6, 1.4));
        const back = b.path([[70, 22], [66, 42], [40, 44], [22, 42, 1.8], [18, 38, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        const belly = b.path([[24, 56, 1.4], [44, 58, 1.4], [62, 56, 1.4], [74, 32, 1.4]]);
        b.line(back[3], belly[0]);
        for (const [x, dx] of [[26, -2], [34, 2], [52, -2], [60, 2]]) b.line(b.star(x, 57, 1), b.star(x + dx, 90, 1.8));
      },
    },
    {
      name: "The Still Heron",
      theme: "Who can be still until their mud settles?",
      keyPhrases: ["Who can be still"],
      draw: (b) => {
        const head = b.loop([[56, 12, 1.8], [62, 10, 1.6], [62, 16, 1.6]]);
        b.line(head[1], b.star(80, 14, 2.2));
        b.line(head[2], ...b.pts([[54, 24, 1.4], [58, 34, 1.4]]));
        const body = b.loop([[58, 34], [66, 40, 1.6], [66, 52, 1.6], [52, 62, 1.8], [36, 66, 2], [44, 54, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.line(body[2], b.star(56, 78, 1.2), b.star(56, 92, 1.8));
        b.path([[20, 84, 1.2], [36, 82, 1.4], [50, 84], [70, 82, 1.4], [86, 84, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
      },
    },
    {
      name: "The Uncarved Log",
      theme: "Whole as an uncarved block of wood",
      keyPhrases: ["Whole as an uncarved block of wood."],
      draw: (b) => {
        b.close(b.ring(24, 56, 14, 10, 2, -90, 20));
        b.close(b.ring(24, 56, 6, 6, 1.2, -90, 9));
        b.star(24, 56, 2);
        b.path([[24, 36, 1.8], [52, 32], [78, 36, 1.8]]);
        b.path([[24, 76, 1.8], [52, 80], [78, 76, 1.8]]);
        b.line(...b.arc(78, 56, 14, -90, 90, 5, 1.4, 20));
        b.path([[46, 46, 1], [62, 48, 1.2]]);
        b.path([[40, 62, 1], [58, 64, 1.2]]);
      },
    },
  ],
  16: [
    {
      name: "The Moon's Return",
      theme: "Returning to the source is tranquility: the moon waxing and waning",
      keyPhrases: ["Returning to the source is tranquility"],
      draw: (b) => {
        b.close(b.ring(50, 34, 11, 8, 2));
        b.line(...b.arc(76, 50, 9, -90, 90, 4, 1.8));
        b.line(b.star(76, 41, 1.2), b.star(76, 59, 1.2));
        b.line(...b.arc(24, 50, 9, 90, 270, 4, 1.8));
        b.line(b.star(24, 41, 1.2), b.star(24, 59, 1.2));
        b.line(...b.arc(50, 50, 40, 200, 340, 7, 0.8));
      },
    },
    {
      name: "The Circle of Return",
      theme: "All creatures return to the point where they began",
      keyPhrases: ["return to the point where they began."],
      draw: (b) => {
        const circle = b.arc(50, 50, 34, -60, 250, 13, 1.8);
        b.line(...circle);
        const tip = circle[circle.length - 1];
        const t = b.starAt(tip);
        b.line(b.star(t.x - 10, t.y - 4, 1.6), tip, b.star(t.x + 2, t.y + 11, 1.6));
        b.star(50, 50, 3);
        b.starAt(circle[0]).mag = 2.4;
      },
    },
    {
      name: "The Leaf and the Root",
      theme: "Contemplate their return to the source: a leaf falling to its roots",
      keyPhrases: ["but contemplate their return to the source."],
      draw: (b) => {
        const trunk = b.path([[40, 70, 1.8], [40, 50], [36, 30], [40, 10, 1.6]]);
        b.path([[40, 50], [56, 36, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[38, 34], [24, 22, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[4, 70, 1.2], [40, 70], [96, 70, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.path([[40, 70], [28, 82, 1.4], [18, 94, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.path([[40, 70], [42, 86, 1.4], [38, 96, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.path([[40, 70], [54, 82, 1.4], [66, 90, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.loop([[74, 40, 2], [82, 46, 1.4], [80, 56, 1.8], [72, 50, 1.4]]);
        b.pts([[70, 58, 1], [62, 64, 1]]);
        void trunk;
      },
    },
    {
      name: "The Returning Salmon",
      theme: "All creatures return to the point where they began: a salmon leaping upstream",
      keyPhrases: ["All creatures in the universe"],
      draw: (b) => {
        const body = b.loop([[70, 24, 2.2], [62, 20], [46, 22], [34, 30], [28, 38, 1.6], [36, 38], [50, 36], [62, 32]]);
        b.line(body[4], b.star(18, 36, 1.8), b.star(22, 46, 1.8), body[4]);
        b.star(64, 25, 2.4);
        b.line(body[2], b.star(44, 14, 1.4));
        b.path([[2, 60, 1.2], [16, 52, 1.4], [30, 58], [44, 66, 1.4], [60, 60], [72, 54, 1.6], [86, 50], [98, 44, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[4, 78, 1], [20, 72, 1.2], [36, 78], [52, 84, 1.2], [70, 78], [96, 70, 1]].map(([x, y, m]) => [x, y, m ?? 1] as [number, number, number]));
      },
    },
    {
      name: "The Deep Roots",
      theme: "Not knowing the constant is the source of evil deeds because we have no roots",
      keyPhrases: ["because we have no roots."],
      draw: (b) => {
        const base = b.star(50, 46, 2);
        b.path([[50, 46], [50, 30, 1.4], [50, 16, 2.2]].map(([x, y, m]) => [x, y, m ?? 2] as [number, number, number]));
        b.loop([[50, 30], [36, 20, 1.6], [30, 28, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.loop([[50, 24, 1.2], [64, 14, 1.6], [70, 22, 1.4]]);
        b.path([[6, 46, 1.2], [94, 46, 1.2]]);
        b.line(base, ...b.pts([[40, 60, 1.4], [30, 76, 1.4], [22, 92, 1.8]]));
        b.line(base, ...b.pts([[52, 64, 1.4], [48, 80, 1.4], [52, 96, 1.8]]));
        b.line(base, ...b.pts([[62, 58, 1.4], [74, 72, 1.4], [82, 88, 1.8]]));
        b.line(b.star(30, 76, 1), b.star(16, 74, 1.2));
        b.line(b.star(74, 72, 1), b.star(88, 68, 1.2));
      },
    },
  ],
  17: [
    {
      name: "Geese in Formation",
      theme: "\"We did it, all by ourselves!\": a flock that flies with no one in charge",
      keyPhrases: ["we did it, all by ourselves!\""],
      draw: (b) => {
        for (const [x, y] of [[50, 22], [38, 36], [26, 50], [14, 64], [62, 36], [74, 50], [86, 64]]) {
          const body = b.star(x, y, 2);
          b.line(b.star(x - 8, y - 4, 1.4), body, b.star(x + 8, y - 4, 1.4));
        }
      },
    },
    {
      name: "The Sun behind the Cloud",
      theme: "The best leaders are those the people hardly know exist",
      keyPhrases: ["The best leaders are those the people hardly know exist."],
      draw: (b) => {
        b.line(...b.arc(58, 56, 20, 180, 360, 7, 1.8));
        for (let i = 0; i < 5; i++) {
          const a = ((200 + i * 35) * Math.PI) / 180;
          b.line(b.star(58 + 26 * Math.cos(a), 56 + 26 * Math.sin(a), 1.2), b.star(58 + 36 * Math.cos(a), 56 + 36 * Math.sin(a), 1.6));
        }
        b.loop([[14, 84, 1.6], [8, 72], [16, 62], [28, 62, 1.8], [38, 52, 2], [52, 54], [60, 62, 1.8], [78, 62], [88, 74, 1.6], [76, 86], [44, 86]]);
      },
    },
    {
      name: "The Helm",
      theme: "Steering unseen: the ship's wheel",
      keyPhrases: ["The best leaders value their words, and use them sparingly."],
      draw: (b) => {
        const rim = b.ring(50, 50, 26, 8, 1.8, -90);
        b.close(rim);
        const hub = b.ring(50, 50, 6, 8, 1.2, -90);
        b.close(hub);
        rim.forEach((id, i) => {
          const s = b.starAt(id);
          b.line(hub[i], id, b.star(50 + (s.x - 50) * 1.6, 50 + (s.y - 50) * 1.6, 2));
        });
      },
    },
    {
      name: "The Hidden Roots",
      theme: "Hardly known to exist: the roots that hold the tree",
      keyPhrases: ["The best leaders are those the people hardly know exist."],
      draw: (b) => {
        b.close(b.ring(50, 24, 20, 10, 1.6, 90, 16));
        const base = b.star(50, 58, 1.8);
        b.line(b.star(50, 40, 1.2), base);
        b.path([[4, 58, 1.2], [96, 58, 1.2]]);
        b.line(base, ...b.pts([[36, 70, 2], [22, 78, 1.6], [10, 90, 2]]));
        b.line(base, ...b.pts([[50, 78, 2], [46, 94, 2.2]]));
        b.line(base, ...b.pts([[64, 70, 2], [78, 78, 1.6], [90, 92, 2]]));
      },
    },
    {
      name: "The Beehive",
      theme: "The people say: we did it all by ourselves",
      keyPhrases: ["the people say, \"Amazing:"],
      draw: (b) => {
        const l = b.pts([[50, 12, 2.2], [36, 16], [26, 28], [22, 44], [20, 62], [22, 80, 1.8]]);
        const r = b.pts([[64, 16], [74, 28], [78, 44], [80, 62], [78, 80, 1.8]]);
        b.line(...l.slice().reverse(), ...r);
        b.line(l[5], r[4]);
        for (const i of [2, 3, 4]) b.line(l[i], r[i - 1]);
        b.loop([[44, 80, 1.2], [44, 70, 1.4], [56, 70, 1.4], [56, 80, 1.2]]);
        for (const [x, y] of [[86, 20], [92, 36], [8, 30]]) b.path([[x - 3, y - 2, 1], [x + 3, y + 2, 1.6]]);
      },
    },
  ],
  18: [
    {
      name: "The Banner",
      theme: "When the country falls into chaos, politicians talk about patriotism",
      keyPhrases: ["politicians talk about 'patriotism'."],
      draw: (b) => {
        b.path([[22, 94, 1.8], [22, 50], [22, 10, 2.4]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.line(b.star(22, 14, 1.4), ...b.pts([[40, 10, 1.6], [58, 18, 1.6], [76, 12, 1.8], [90, 14, 2]]), b.star(88, 36, 2), ...b.pts([[72, 40, 1.6], [54, 44, 1.6], [38, 38, 1.6]]), b.star(22, 42, 1.4));
        b.path([[10, 94, 1.4], [34, 94, 1.4]]);
      },
    },
    {
      name: "The Puppet",
      theme: "When intellectualism arises, hypocrisy is close behind",
      keyPhrases: ["hypocrisy is close behind."],
      draw: (b) => {
        const bar = b.path([[30, 6, 1.8], [70, 6, 1.8]]);
        b.path([[50, 2, 1.2], [50, 12, 1.4]]);
        b.close(b.ring(50, 30, 6, 6, 1.8));
        const neck = b.star(50, 38, 1.6);
        const hips = b.star(50, 62, 1.8);
        b.line(neck, hips);
        const hl = b.star(30, 48, 1.8), hr = b.star(70, 48, 1.8);
        b.line(hl, neck, hr);
        const fl = b.star(40, 90, 1.8), fr = b.star(62, 86, 1.8);
        b.line(hips, fl);
        b.line(hips, fr);
        b.line(bar[0], hl);
        b.line(bar[1], hr);
        b.line(b.star(50, 12), b.star(50, 24, 1));
      },
    },
    {
      name: "The Cracked Vase",
      theme: "When the great Tao is abandoned",
      keyPhrases: ["When the great Tao is abandoned,"],
      draw: (b) => {
        const l = b.pts([[42, 8, 1.8], [40, 20], [28, 34], [24, 52, 1.8], [30, 72], [40, 88, 1.8]]);
        const r = b.pts([[58, 8, 1.8], [60, 20], [72, 34], [76, 52, 1.8], [70, 72], [60, 88, 1.8]]);
        b.line(...l);
        b.line(...r);
        b.line(l[0], r[0]);
        b.line(l[5], r[5]);
        b.path([[60, 20], [52, 32, 1.4], [58, 44, 1.4], [46, 56, 1.6], [52, 66, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.pts([[80, 90, 1.4], [86, 84, 1.2]]);
      },
    },
    {
      name: "The Divided House",
      theme: "When there is strife in the family unit",
      keyPhrases: ["When there is strife in the family unit,"],
      draw: (b) => {
        b.path([[8, 44, 1.8], [44, 14, 2.2], [48, 18, 1.4]]);
        b.path([[52, 22, 1.4], [56, 14, 2.2], [92, 44, 1.8]]);
        b.path([[16, 42, 1.2], [16, 88, 1.6], [46, 88, 1.6]]);
        b.path([[84, 42, 1.2], [84, 88, 1.6], [54, 88, 1.6]]);
        b.path([[48, 18], [52, 22], [46, 40, 1.2], [54, 56, 1.2], [46, 72, 1.2], [50, 88, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.loop([[24, 56, 1.2], [34, 56, 1.2], [34, 66, 1.2], [24, 66, 1.2]]);
        b.loop([[66, 56, 1.2], [76, 56, 1.2], [76, 66, 1.2], [66, 66, 1.2]]);
      },
    },
    {
      name: "Two Masks",
      theme: "Charity and righteousness appear: a smiling face over a frowning one",
      keyPhrases: ["charity and righteousness appear."],
      draw: (b) => {
        b.close(b.ring(34, 36, 20, 9, 1.8, -90, 24));
        b.pts([[27, 30, 1.8], [41, 30, 1.8]]);
        b.path([[25, 44, 1.4], [34, 50, 1.8], [43, 44, 1.4]]);
        b.close(b.ring(68, 62, 20, 9, 1.6, -90, 24));
        b.pts([[61, 57, 1.6], [75, 57, 1.6]]);
        b.path([[59, 76, 1.4], [68, 70, 1.6], [77, 76, 1.4]]);
      },
    },
  ],
  19: [
    {
      name: "The Bamboo",
      theme: "Embrace simplicity",
      keyPhrases: ["Embrace simplicity."],
      draw: (b) => {
        const stalk = b.pts([[44, 96, 1.8], [45, 78, 1.8], [46, 60, 1.8], [47, 42, 1.8], [48, 24, 1.8], [49, 8, 1.6]]);
        b.line(...stalk);
        b.path([[46, 60], [62, 52, 1.2], [82, 54, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.path([[62, 52], [76, 42, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[48, 24], [30, 18, 1.2], [14, 22, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.path([[30, 18], [20, 8, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        for (const s of stalk.slice(1, 5)) {
          const p = b.starAt(s);
          b.line(b.star(p.x - 5, p.y, 1), b.star(p.x + 5, p.y, 1));
        }
      },
    },
    {
      name: "The Compass",
      theme: "To keep us at the center of the circle",
      keyPhrases: ["to keep us at the center of the circle, so we must also:"],
      draw: (b) => {
        const hinge = b.star(54, 6, 2.2);
        const pin = b.star(40, 56, 2.8);
        const pen = b.star(74, 56, 2);
        b.line(pin, hinge, pen);
        b.path([[50, 2, 1.2], [58, 2, 1.2]]);
        b.line(...b.arc(40, 56, 34, 10, 200, 10, 1.4));
      },
    },
    {
      name: "The Single Flower",
      theme: "Desire little: one stem in a plain vase",
      keyPhrases: ["Desire little."],
      draw: (b) => {
        b.loop([[40, 58, 1.6], [60, 58, 1.6], [66, 74], [60, 92, 1.8], [40, 92, 1.8], [34, 74]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[50, 58, 1.2], [52, 40, 1.2], [58, 24, 1.4]]);
        b.close(b.ring(60, 16, 7, 5, 1.8));
        b.star(60, 16, 2.4);
        b.loop([[52, 42, 1], [40, 34, 1.4], [46, 44, 1.2]]);
      },
    },
    {
      name: "The Mandala",
      theme: "The center of the circle: a still point ringed by petals",
      keyPhrases: ["to keep us at the center of the circle, so we must also:"],
      draw: (b) => {
        b.star(50, 50, 3);
        b.close(b.ring(50, 50, 12, 6, 1.4));
        const inner = b.ring(50, 50, 26, 8, 1.6, -90);
        const outer = b.ring(50, 50, 40, 8, 2, -67.5);
        for (let i = 0; i < 8; i++) b.line(inner[i], outer[i], inner[(i + 1) % 8]);
      },
    },
    {
      name: "The Begging Bowl",
      theme: "Put others first, desire little: a monk's bowl",
      keyPhrases: ["Put others first."],
      draw: (b) => {
        b.close(b.ring(50, 38, 34, 12, 1.6, 0, 7));
        b.line(b.star(16, 40, 1), ...b.pts([[20, 58], [32, 72], [50, 78, 2], [68, 72], [80, 58]]), b.star(84, 40, 1));
        b.path([[36, 88, 1.6], [64, 88, 1.6]]);
        b.path([[42, 78, 1], [36, 88]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[58, 78, 1], [64, 88]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.star(50, 38, 2.4);
      },
    },
  ],
  20: [
    {
      name: "The Festival Lanterns",
      theme: "Other people are joyous, as though they were at a spring festival",
      keyPhrases: ["as though they were at a spring festival."],
      draw: (b) => {
        const rope = b.path([[2, 12, 1.4], [26, 22, 1.2], [50, 26, 1.2], [74, 22, 1.2], [98, 12, 1.4]]);
        for (const [i, len] of [[1, 12], [2, 22], [3, 8]]) {
          const top = b.starAt(rope[i]);
          const y = top.y + len;
          const l = b.loop([[top.x, y, 1.6], [top.x + 9, y + 8, 1.6], [top.x + 9, y + 18, 1.6], [top.x, y + 26, 1.6], [top.x - 9, y + 18, 1.6], [top.x - 9, y + 8, 1.6]]);
          b.line(rope[i], l[0]);
          b.star(top.x, y + 32, 1.2);
        }
      },
    },
    {
      name: "The Drifting Leaf",
      theme: "I am lost and drift about with no place to go",
      keyPhrases: ["I am lost and drift about with no place to go."],
      draw: (b) => {
        const leaf = b.loop([[20, 50, 2], [34, 38], [52, 34], [70, 40, 2.2], [52, 52], [34, 54]]);
        b.path([[20, 50], [46, 44, 1.2], [70, 40]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.line(leaf[0], b.star(10, 54, 1.6));
        b.path([[2, 66, 1.2], [16, 60, 1.4], [30, 66], [44, 72, 1.4], [58, 66], [72, 60, 1.4], [86, 66], [98, 70, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[10, 84, 1], [30, 80, 1.2], [50, 84, 1], [70, 80, 1.2], [90, 84, 1]]);
      },
    },
    {
      name: "The Infant",
      theme: "Like an infant before it has learned to smile",
      keyPhrases: ["like an infant before it has learned to smile."],
      draw: (b) => {
        b.close(b.ring(30, 40, 12, 8, 1.8));
        b.pts([[26, 38, 1.2], [34, 38, 1.2]]);
        b.loop([[40, 30, 1.6], [66, 30], [86, 42, 2], [90, 52], [80, 62], [60, 62], [40, 52]]);
        b.path([[48, 32, 1.2], [56, 60, 1.2]]);
        b.path([[62, 30, 1.2], [70, 62, 1.2]]);
      },
    },
    {
      name: "The Dark Moon",
      theme: "Ordinary people are bright; I alone am dark",
      keyPhrases: ["I alone am dark."],
      draw: (b) => {
        b.close(b.ring(50, 50, 18, 10, 1));
        for (const [x, y, m] of [[14, 14, 2.8], [84, 20, 2.6], [22, 80, 2.6], [86, 78, 2.8], [50, 10, 2.2], [8, 50, 2.2], [92, 50, 2.4], [50, 92, 2.2]]) b.star(x, y, m);
      },
    },
    {
      name: "The Feather in the Wind",
      theme: "Blown at the mercy of the wind",
      keyPhrases: ["blown at the mercy of the wind."],
      draw: (b) => {
        const shaft = b.path([[24, 80, 1.8], [40, 62], [56, 44], [74, 24, 2.2]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.line(shaft[0], ...b.pts([[34, 60], [46, 40], [62, 22]]), shaft[3]);
        b.line(shaft[1], ...b.pts([[50, 70], [66, 54], [80, 36]]), shaft[3]);
        b.path([[2, 30, 1], [14, 24, 1.2], [26, 28, 1.4], [30, 38, 1.2], [24, 42, 1]]);
        b.path([[64, 86, 1], [78, 80, 1.2], [92, 84, 1.4]]);
      },
    },
  ],
};

export default c;
