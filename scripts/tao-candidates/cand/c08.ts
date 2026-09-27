import type { Candidate } from "../types.ts";

type P = [number, number, number];
const g = (points: [number, number, number?][], mag: number): P[] =>
  points.map(([x, y, m]) => [x, y, m ?? mag]);

const c: Record<number, Candidate[]> = {
  71: [
    {
      name: "The Mortar and Pestle",
      theme: "Only by recognizing that you have an illness can you move to seek a cure",
      keyPhrases: ["can you move to seek a cure."],
      draw: (b) => {
        b.path([[14, 46, 1.8], [18, 64], [30, 78], [50, 84, 2], [70, 78], [82, 64], [86, 46, 1.8]]);
        b.path(g([[14, 46], [50, 50, 1.4], [86, 46]], 1.8));
        b.path([[34, 88, 1.6], [66, 88, 1.6]]);
        b.path([[56, 48, 1.4], [66, 30], [74, 14], [80, 6, 2]]);
        b.path([[62, 50, 1.2], [72, 32], [80, 16], [86, 8, 2]]);
        b.path(g([[80, 6], [86, 8]], 2));
      },
    },
    {
      name: "The Ginkgo Leaf",
      theme: "The Master sees her illnesses and treats them",
      keyPhrases: ["she sees her illnesses and treats them,"],
      draw: (b) => {
        const stem = b.star(50, 70, 2);
        b.path([[50, 70], [52, 84, 1.4], [56, 96, 1.6]].map(([x, y, m]) => [x, y, m ?? 2] as P));
        const fan = b.arc(50, 70, 44, 205, 335, 9, 1.8);
        b.line(stem, ...fan, stem);
        b.line(fan[4], b.star(50, 38, 1.2));
        b.line(b.star(50, 38), stem);
        b.line(fan[2], b.star(40, 50, 1), stem);
        b.line(fan[6], b.star(60, 50, 1), stem);
      },
    },
    {
      name: "The Serpent and Staff",
      theme: "Thinking you know is a disease",
      keyPhrases: ["Thinking you know is a disease."],
      draw: (b) => {
        b.path([[50, 6, 2], [50, 50, 1.2], [50, 94, 1.8]]);
        const pts: P[] = [];
        for (let i = 0; i < 11; i++) {
          const t = i / 10;
          pts.push([50 + 14 * Math.sin(t * Math.PI * 3), 82 - t * 60, 1.6]);
        }
        b.path(pts);
        b.loop([[50, 22], [58, 16, 1.8], [66, 20, 2], [58, 24, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
      },
    },
    {
      name: "The Medicine Gourd",
      theme: "Knowing you don't know is wholeness",
      keyPhrases: ["Knowing you don't know is wholeness."],
      draw: (b) => {
        const top = b.arc(46, 34, 11, 130, 410, 7, 1.8);
        const bottom = b.arc(46, 68, 20, -60, 240, 10, 2);
        b.line(...top);
        b.line(...bottom);
        b.line(top[6], bottom[0]);
        b.line(top[0], bottom[9]);
        b.path([[46, 23, 1.4], [46, 14, 1.8]]);
        b.path([[40, 48, 1.2], [70, 50, 1.2], [80, 62, 1.4], [76, 76, 1.8]]);
        b.pts([[46, 68, 2.4]]);
      },
    },
    {
      name: "The Healing Spring",
      theme: "Thus is able to remain whole",
      keyPhrases: ["and thus is able to remain whole."],
      draw: (b) => {
        b.loop([[10, 70, 1.6], [24, 60, 1.4], [50, 56, 1.6], [76, 60, 1.4], [90, 70, 1.6], [76, 82, 1.4], [50, 86, 1.6], [24, 82, 1.4]]);
        for (const x of [30, 50, 70]) b.path([[x, 50, 1.2], [x - 4, 40, 1.4], [x + 2, 30, 1.6], [x - 2, 20, 1.4]]);
        b.loop([[4, 66, 1.4], [8, 56, 1.8], [16, 58, 1.6]]);
        b.loop([[96, 66, 1.4], [92, 56, 1.8], [84, 58, 1.6]]);
      },
    },
  ],
  72: [
    {
      name: "Two Hearts",
      theme: "She loves herself but also loves others",
      keyPhrases: ["She loves herself but also loves others."],
      draw: (b) => {
        b.loop([[32, 40, 1.6], [38, 30], [48, 30], [52, 40], [48, 52], [32, 68, 2.2], [16, 52], [12, 40], [16, 30], [26, 30]]);
        b.loop([[68, 40, 1.6], [74, 30], [84, 30], [88, 40], [84, 52], [68, 68, 2.2], [52, 52], [48, 40], [52, 30], [62, 30]].map(([x, y, m]) => [x, y + 8, m ?? 1.8] as P));
      },
    },
    {
      name: "The Moth and the Flame",
      theme: "When people become overly bold, then disaster will soon arrive",
      keyPhrases: ["When people become overly bold,"],
      draw: (b) => {
        b.loop([[70, 46, 2.4], [74, 56, 1.6], [70, 64, 1.8], [66, 56, 1.6]]);
        b.path([[70, 64], [70, 70, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.loop([[62, 70, 1.6], [78, 70, 1.6], [78, 94, 1.8], [62, 94, 1.8]]);
        const body = b.path([[30, 30, 1.6], [34, 38, 1.4]]);
        b.loop([[30, 30], [16, 18, 1.6], [12, 30, 1.4], [26, 36, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.loop([[34, 30, 1.2], [46, 16, 1.6], [50, 28, 1.4], [36, 36, 1.2]]);
        void body;
      },
    },
    {
      name: "The Joined Palms",
      theme: "By respecting them they will in turn respect you",
      keyPhrases: ["by respecting them they will in turn respect you."],
      draw: (b) => {
        b.path([[50, 8, 2.2], [42, 16], [38, 30], [36, 50], [34, 66, 1.6], [28, 80], [24, 94, 1.6]]);
        b.path([[50, 8], [58, 16], [62, 30], [64, 50], [66, 66, 1.6], [72, 80], [76, 94, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.path(g([[50, 8], [50, 30], [50, 50, 1.4], [50, 64, 1.4]], 1.4));
      },
    },
    {
      name: "The Bee and the Blossom",
      theme: "Do not meddle with people's livelihood",
      keyPhrases: ["Do not meddle with people's livelihood;"],
      draw: (b) => {
        for (let i = 0; i < 5; i++) {
          const a = ((-90 + i * 72) * Math.PI) / 180;
          b.close(b.ring(36 + 14 * Math.cos(a), 58 + 14 * Math.sin(a), 7, 5, 1.6, -90 + i * 72));
        }
        b.star(36, 58, 2.6);
        b.path([[36, 80, 1.2], [38, 96, 1.4]]);
        b.close(b.ring(76, 24, 6, 4, 1.6, -90, 4));
        b.loop([[76, 20], [66, 10, 1.6], [72, 8, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.loop([[76, 20], [86, 10, 1.6], [82, 6, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
      },
    },
    {
      name: "The Village Well",
      theme: "Do not meddle with people's livelihood",
      keyPhrases: ["Do not meddle with people's livelihood;"],
      draw: (b) => {
        b.path([[20, 30, 1.8], [50, 12, 2.2], [80, 30, 1.8]]);
        b.path([[28, 26, 1.2], [28, 60, 1.4]]);
        b.path([[72, 26, 1.2], [72, 60, 1.4]]);
        b.path([[28, 36, 1.2], [72, 36, 1.2]]);
        b.path([[50, 36], [50, 48, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.loop([[45, 48, 1.6], [55, 48, 1.6], [53, 56, 1.6], [47, 56, 1.6]]);
        b.close(b.ring(50, 64, 30, 10, 1.6, 0, 7));
        b.path([[20, 64, 1.2], [22, 88, 1.8], [78, 88, 1.8], [80, 64, 1.2]]);
      },
    },
  ],
  73: [
    {
      name: "The Cast Net",
      theme: "The nets of Heaven are wide, but nothing escapes its grasp",
      keyPhrases: ["but nothing escapes its grasp."],
      draw: (b) => {
        const top = b.star(50, 8, 2.4);
        const rim = b.arc(50, 70, 42, 160, 380, 9, 1.8, 22);
        rim.forEach((id) => b.line(top, id));
        b.line(...rim);
        b.pts(b.arcPoints(50, 70, 24, 12, 170, 370, 6), 1);
        b.star(50, 64, 2.2);
      },
    },
    {
      name: "The Web in the Corner",
      theme: "The nets of Heaven are wide",
      keyPhrases: ["The nets of Heaven are wide,"],
      draw: (b) => {
        const corner = b.star(6, 6, 2);
        const spokes = [[94, 6], [90, 44], [70, 76], [40, 92], [6, 94]].map(([x, y]) => b.star(x, y, 1.6));
        spokes.forEach((id) => b.line(corner, id));
        for (const r of [0.35, 0.65]) {
          b.line(...[[94, 6], [90, 44], [70, 76], [40, 92], [6, 94]].map(([x, y]) => b.star(6 + (x - 6) * r, 6 + (y - 6) * r, 1.2)));
        }
        b.line(...spokes);
      },
    },
    {
      name: "The Celestial Sphere",
      theme: "Who can understand the workings of Heaven?",
      keyPhrases: ["Who can understand the workings of Heaven?"],
      draw: (b) => {
        b.close(b.ring(50, 50, 40, 16, 1.8));
        b.path([[10, 50, 1.2], [30, 56, 1.2], [50, 58, 1.4], [70, 56, 1.2], [90, 50, 1.2]]);
        b.path([[18, 28, 1], [50, 34, 1.2], [82, 28, 1]]);
        b.path([[18, 72, 1], [50, 80, 1.2], [82, 72, 1]]);
        b.line(...b.arc(50, 50, 18, -90, 90, 5, 1.2, 40));
        b.pts([[62, 40, 2.6], [36, 64, 2.2]]);
      },
    },
    {
      name: "The Net over the Mountains",
      theme: "The nets of Heaven are wide",
      keyPhrases: ["The nets of Heaven are wide,"],
      draw: (b) => {
        const top = [8, 29, 50, 71, 92].map((x) => b.star(x, 12 + Math.abs(x - 50) * 0.12, 1.6));
        b.line(...top);
        const mid = [18, 40, 60, 82].map((x) => b.star(x, 34, 1.2));
        top.forEach((id, i) => {
          if (mid[i - 1] !== undefined) b.line(id, mid[i - 1]);
          if (mid[i] !== undefined) b.line(id, mid[i]);
        });
        b.path([[2, 92, 1.4], [22, 62, 1.8], [36, 72], [56, 46, 2.2], [72, 66], [82, 58, 1.8], [98, 84, 1.4]]);
      },
    },
    {
      name: "The Drying Net",
      theme: "Nothing escapes its grasp",
      keyPhrases: ["but nothing escapes its grasp."],
      draw: (b) => {
        b.path([[12, 94, 1.6], [12, 10, 2]]);
        b.path([[88, 94, 1.6], [88, 10, 2]]);
        const rows = [16, 36, 56];
        for (const y of rows) b.path([[12, y], [30, y + 6, 1.2], [50, y + 8, 1.2], [70, y + 6, 1.2], [88, y]].map(([x, py, m]) => [x, py, m ?? 1.4] as P));
        for (const x of [30, 50, 70]) b.line(b.star(x, 22), b.star(x, 42), b.star(x, 62));
        b.loop([[40, 76, 1.8], [50, 70, 1.4], [60, 76, 1.4], [50, 82, 1.4]]);
        b.line(b.star(60, 76), b.star(66, 70, 1.2), b.star(66, 82, 1.2), b.star(60, 76));
      },
    },
  ],
  74: [
    {
      name: "The Felled Tree",
      theme: "Trying to take the place of a great lumberjack",
      keyPhrases: ["trying to take the place of a great lumberjack. Trying to fill his shoes will only get them seriously hurt."],
      draw: (b) => {
        b.path([[14, 92, 1.6], [16, 76, 1.8], [30, 74, 1.8], [32, 92, 1.6]]);
        b.path(g([[16, 76], [24, 80, 1.2], [30, 74]], 1.8));
        b.path([[36, 82, 1.8], [60, 70], [84, 56, 1.6]]);
        b.path([[38, 90, 1.6], [62, 78], [86, 64, 1.6]]);
        b.path(g([[84, 56], [94, 50, 1.4]], 1.6));
        b.path(g([[60, 70], [66, 58, 1.4]], 1.6));
        b.path([[4, 94, 1.2], [96, 94, 1.2]]);
      },
    },
    {
      name: "The Great Boots",
      theme: "Trying to fill his shoes will only get them seriously hurt",
      keyPhrases: ["trying to take the place of a great lumberjack. Trying to fill his shoes will only get them seriously hurt."],
      draw: (b) => {
        for (const x of [12, 54]) {
          b.path([[x + 6, 14, 1.8], [x + 22, 14, 1.8], [x + 22, 62], [x + 34, 72], [x + 34, 86, 1.8], [x + 2, 86, 1.8], [x + 4, 60], [x + 6, 14]]);
          b.path([[x + 5, 34, 1.2], [x + 22, 34, 1.2]]);
        }
        b.path([[40, 96, 1.2], [44, 92, 1.4], [48, 96, 1.2]]);
      },
    },
    {
      name: "The Axe in the Stump",
      theme: "The work of a great lumberjack",
      keyPhrases: ["trying to take the place of a great lumberjack. Trying to fill his shoes will only get them seriously hurt."],
      draw: (b) => {
        b.close(b.ring(48, 60, 32, 10, 1.6, 0, 8));
        b.path([[16, 60, 1.4], [18, 90, 1.8], [78, 90, 1.8], [80, 60, 1.4]]);
        b.path([[48, 58, 1.4], [62, 38], [74, 20], [82, 8, 1.8]]);
        b.loop([[44, 52, 1.8], [54, 50], [58, 62, 2], [46, 66]]);
      },
    },
    {
      name: "The Pine Forest",
      theme: "The great lumberjack's forest",
      keyPhrases: ["If you aren't afraid of dying,"],
      draw: (b) => {
        for (const [x, h, w] of [[18, 50, 11], [48, 70, 15], [80, 56, 12]]) {
          b.path([[x - w, 88, 1.6], [x - w * 0.4, 88 - h * 0.45, 1.2], [x - w * 0.7, 88 - h * 0.45, 1.2], [x, 88 - h, 2.2], [x + w * 0.7, 88 - h * 0.45, 1.2], [x + w * 0.4, 88 - h * 0.45, 1.2], [x + w, 88, 1.6]]);
        }
        b.path([[2, 92, 1.2], [98, 92, 1.2]]);
      },
    },
    {
      name: "The Crosscut Saw",
      theme: "Those who harm others are like inexperienced boys",
      keyPhrases: ["are like inexperienced boys"],
      draw: (b) => {
        b.path([[14, 50, 1.6], [86, 50, 1.6]]);
        b.path(g([[14, 50], [22, 58, 1.2], [30, 50], [38, 58, 1.2], [46, 50], [54, 58, 1.2], [62, 50], [70, 58, 1.2], [78, 50], [86, 50]], 1.6));
        b.path([[6, 34, 1.8], [14, 50]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[6, 34], [6, 62, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.path([[94, 34, 1.8], [86, 50]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[94, 34], [94, 62, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
      },
    },
  ],
  75: [
    {
      name: "Falling Blossoms",
      theme: "Only those who do not cling to their life can save it",
      keyPhrases: ["Only those who do not cling to their life can save it."],
      draw: (b) => {
        b.path([[2, 14, 1.6], [24, 20, 1.4], [46, 18, 1.4], [70, 26, 1.4], [96, 22, 1.2]]);
        b.path(g([[46, 18], [52, 30, 1.2]], 1.4));
        b.close(b.ring(24, 28, 5, 5, 1.8));
        b.close(b.ring(52, 35, 5, 5, 1.8, -90));
        for (const [x, y] of [[62, 54], [40, 66], [74, 80], [30, 90]]) b.loop([[x, y - 3, 1.6], [x + 3, y, 1.2], [x, y + 3, 1.2], [x - 3, y, 1.2]]);
      },
    },
    {
      name: "The Letting Leaf",
      theme: "Only those who do not cling to their life can save it",
      keyPhrases: ["Only those who do not cling to their life can save it."],
      draw: (b) => {
        b.path([[2, 16, 1.4], [30, 22, 1.4], [60, 18, 1.6], [96, 26, 1.2]]);
        b.path([[60, 18], [64, 30, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.loop([[40, 60, 2], [52, 52], [66, 56], [72, 70, 2.2], [60, 74], [46, 70]]);
        b.path([[40, 60], [56, 64, 1.2], [72, 70]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[40, 60], [32, 58, 1.4]].map(([x, y, m]) => [x, y, m ?? 2] as P));
        b.pts([[62, 38, 1], [58, 44, 0.8]]);
        b.path([[10, 94, 1], [50, 92, 1.2], [90, 94, 1]]);
      },
    },
    {
      name: "The Heavy Burden",
      theme: "When people go hungry, the government's taxes are too high",
      keyPhrases: ["the government's taxes are too high."],
      draw: (b) => {
        b.close(b.ring(58, 36, 5, 5, 1.8));
        const neck = b.star(52, 42, 1.6);
        const hips = b.star(40, 62, 2);
        b.line(neck, hips);
        b.line(hips, b.star(48, 78, 1.4), b.star(52, 94, 1.8));
        b.line(hips, b.star(32, 78, 1.4), b.star(24, 94, 1.8));
        b.line(neck, b.star(60, 54, 1.4), b.star(66, 64, 1.4));
        b.loop([[20, 20, 1.6], [42, 12, 1.8], [52, 28, 1.4], [44, 44, 1.4], [24, 50, 1.6], [12, 36, 1.4]]);
        b.path([[2, 96, 1], [98, 96, 1]]);
      },
    },
    {
      name: "The Empty Bowl",
      theme: "When people go hungry",
      keyPhrases: ["When people go hungry,"],
      draw: (b) => {
        b.close(b.ring(50, 50, 32, 10, 1.6, 0, 8));
        b.line(b.star(18, 50, 1), ...b.pts([[22, 66], [34, 78], [50, 82, 1.8], [66, 78], [78, 66]]), b.star(82, 50, 1));
        b.path([[38, 90, 1.4], [62, 90, 1.4]]);
        b.path([[20, 20, 1.4], [70, 40, 1.2]]);
        b.path([[80, 20, 1.4], [30, 40, 1.2]]);
      },
    },
    {
      name: "The Tipped Scale",
      theme: "Wealthy people have too much, which causes others to starve",
      keyPhrases: ["which causes others to starve."],
      draw: (b) => {
        const pivot = b.star(50, 20, 2);
        const beamL = b.star(14, 36, 1.8), beamR = b.star(86, 6, 1.8);
        b.line(beamL, pivot, beamR);
        b.line(pivot, b.star(50, 90, 1.6));
        b.path([[36, 92, 1.6], [64, 92, 1.6]]);
        b.path([[4, 62, 1.4], [14, 36], [24, 62, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.path(g([[4, 62], [14, 66, 1.4], [24, 62]], 1.4));
        b.pts([[10, 58, 2.2], [18, 58, 2.2], [14, 53, 2.2]]);
        b.path([[76, 32, 1.4], [86, 6], [96, 32, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.path(g([[76, 32], [86, 36, 1.4], [96, 32]], 1.4));
      },
    },
  ],
  76: [
    {
      name: "The Willow in the Wind",
      theme: "The living are soft and yielding",
      keyPhrases: ["The living are soft and yielding;"],
      draw: (b) => {
        b.path([[24, 96, 2], [26, 76], [30, 56], [36, 40, 1.8]]);
        const crown = b.arc(40, 42, 20, 200, 330, 5, 1.6);
        b.line(b.star(36, 40), crown[1]);
        b.line(...crown);
        crown.forEach((id) => {
          const s = b.starAt(id);
          b.line(id, b.star(s.x + 12, s.y + 18, 1.2), b.star(s.x + 26, s.y + 30, 1.6));
        });
        b.path([[2, 20, 1], [14, 18, 1.2]]);
        b.path([[4, 34, 1], [16, 32, 1.2]]);
      },
    },
    {
      name: "The Cattails",
      theme: "Living plants are flexible and tender",
      keyPhrases: ["Living plants are flexible and tender;"],
      draw: (b) => {
        for (const [x, lean, h] of [[30, -6, 60], [50, 4, 72], [70, 10, 56]]) {
          b.path([[x, 92, 1.2], [x + lean * 0.5, 92 - h * 0.5, 1.2], [x + lean, 92 - h + 14, 1.4]]);
          b.path([[x + lean, 92 - h + 14], [x + lean * 1.1, 92 - h, 2], [x + lean * 1.15, 92 - h - 6, 1.2]].map(([px, py, m]) => [px, py, m ?? 1.4] as P));
        }
        b.path([[40, 92], [30, 72, 1.2], [22, 60, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[6, 92, 1.2], [94, 92, 1.2]]);
      },
    },
    {
      name: "The Fiddlehead Fern",
      theme: "The soft and yielding will overcome",
      keyPhrases: ["The soft and yielding will overcome."],
      draw: (b) => {
        const spiral: P[] = [];
        for (let i = 0; i < 12; i++) {
          const a = ((i * 55 + 180) * Math.PI) / 180;
          const r = 24 - i * 1.9;
          spiral.push([50 + r * Math.cos(a), 34 + r * Math.sin(a), i === 11 ? 2.6 : 1.4 + i * 0.05]);
        }
        const ids = b.pts(spiral);
        b.line(...ids);
        b.path([[26, 34], [30, 58, 1.2], [36, 78, 1.4], [38, 96, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
      },
    },
    {
      name: "The Snapped Branch",
      theme: "The rigid and stiff will be broken",
      keyPhrases: ["The rigid and stiff will be broken."],
      draw: (b) => {
        b.path([[6, 70, 1.6], [26, 60], [44, 52, 1.8]]);
        b.path(g([[26, 60], [20, 46, 1.4]], 1.4));
        b.path([[52, 50, 1.8], [66, 60], [84, 76, 1.6]]);
        b.path(g([[66, 60], [78, 56, 1.4]], 1.4));
        b.pts([[46, 46, 1.2], [50, 44, 1], [48, 56, 1]]);
        b.path([[2, 92, 1], [98, 92, 1]]);
      },
    },
    {
      name: "The Grass and the Fallen Oak",
      theme: "Those who are stiff and rigid are the disciples of death",
      keyPhrases: ["Those who are stiff and rigid"],
      draw: (b) => {
        b.path([[40, 90, 1.8], [54, 84], [72, 78], [90, 72, 1.6]]);
        b.path(g([[72, 78], [80, 66, 1.4], [92, 60, 1.6]], 1.4));
        b.path(g([[54, 84], [60, 72, 1.4]], 1.4));
        for (const [x, lean] of [[8, 8], [16, 10], [24, 6], [32, 9]]) b.path([[x, 92, 1.2], [x + lean * 0.5, 74, 1.2], [x + lean, 60, 1.6]]);
        b.path([[2, 92, 1], [98, 92, 1]]);
      },
    },
  ],
  77: [
    {
      name: "The Drawn Bow",
      theme: "The Tao of Heaven works in the world like the drawing of a bow",
      keyPhrases: ["The Tao of Heaven works in the world", "like the drawing of a bow."],
      draw: (b) => {
        const bow = b.arc(62, 50, 44, 125, 235, 9, 1.8);
        b.line(...bow);
        const nock = b.star(12, 50, 2);
        b.line(bow[0], nock, bow[8]);
        b.path([[12, 50], [50, 50], [94, 50, 2.8]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[86, 44, 1.4], [94, 50], [86, 56, 1.4]].map(([x, y, m]) => [x, y, m ?? 2.8] as P));
        b.path([[12, 50], [6, 44, 1.2]].map(([x, y, m]) => [x, y, m ?? 2] as P));
        b.path([[12, 50], [6, 56, 1.2]].map(([x, y, m]) => [x, y, m ?? 2] as P));
      },
    },
    {
      name: "From Full to Empty",
      theme: "The excess is taken from, and the deficient is given to",
      keyPhrases: ["and the deficient is given to."],
      draw: (b) => {
        b.loop([[14, 14, 1.8], [40, 22, 1.8], [48, 36, 1.6], [38, 50, 1.6], [20, 46, 1.6], [8, 30, 1.6]]);
        b.line(b.star(40, 22), b.star(54, 24, 2));
        b.pts([[56, 34, 1.4], [58, 46, 1.4], [60, 58, 1.6]]);
        b.path([[40, 70, 1.8], [46, 86], [60, 92, 1.8], [74, 86], [80, 70, 1.8]]);
        b.path(g([[40, 70], [80, 70]], 1.8));
      },
    },
    {
      name: "The Moon Bow",
      theme: "The top is bent downward; the bottom is bent up",
      keyPhrases: ["The top is bent downward;"],
      draw: (b) => {
        const outer = b.arc(56, 50, 38, 115, 245, 8, 2);
        const inner = b.arc(70, 50, 34, 125, 235, 6, 1.2);
        b.line(outer[0], ...inner, outer[7]);
        b.line(...outer);
        b.line(outer[0], b.star(40, 50, 1.2), outer[7]);
        b.path([[40, 50], [70, 50, 1.2], [94, 50, 2.6]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
      },
    },
    {
      name: "The Rain on the Dry Land",
      theme: "The Tao works to use the excess, and gives to that which is depleted",
      keyPhrases: ["and gives to that which is depleted."],
      draw: (b) => {
        b.path([[2, 88, 1.2], [16, 84, 1.4], [30, 88, 1.2]]);
        b.path([[2, 94, 1], [30, 94, 1]]);
        b.loop([[40, 30, 1.6], [38, 20], [48, 12, 1.8], [62, 12], [68, 20, 1.8], [80, 22], [84, 30, 1.6]]);
        for (const [x, y] of [[50, 42], [62, 46], [74, 42], [56, 58], [70, 60]]) b.path([[x + 1, y - 4, 1], [x, y, 1.4]]);
        b.path([[44, 90, 1.4], [58, 76, 1.4], [72, 86, 1.4], [86, 74, 1.4], [98, 90, 1.2]]);
      },
    },
    {
      name: "The Two Vessels",
      theme: "Who is able to give to the needy from their excess?",
      keyPhrases: ["Who is able to give to the needy from their excess?"],
      draw: (b) => {
        b.path([[10, 20, 1.6], [12, 80, 1.6], [34, 80, 1.6], [36, 20, 1.6]]);
        b.path([[64, 44, 1.6], [66, 80, 1.6], [88, 80, 1.6], [90, 44, 1.6]]);
        b.path([[34, 70, 1.2], [66, 70, 1.2]]);
        b.path([[12, 52, 1.8], [34, 52, 1.8]]);
        b.path([[66, 52, 1.8], [88, 52, 1.8]]);
        b.path([[40, 30, 1.2], [50, 24, 1.4], [60, 32, 1.2], [58, 38, 1.4]]);
      },
    },
  ],
  78: [
    {
      name: "The Wave on the Cliff",
      theme: "Nothing is better than water for overcoming the hard and rigid",
      keyPhrases: ["for overcoming the hard and rigid,"],
      draw: (b) => {
        b.path([[98, 20, 1.6], [80, 22, 1.8], [72, 40], [76, 58], [70, 76], [74, 96, 1.6]]);
        b.path([[2, 80, 1.4], [18, 72], [34, 60], [46, 44, 1.8], [58, 36, 2], [66, 44], [62, 52, 1.6], [56, 48, 1.4]]);
        b.path([[2, 92, 1.2], [30, 88, 1.4], [60, 90, 1.2]]);
        b.pts([[64, 26, 1.6], [58, 20, 1.2], [70, 16, 1]]);
      },
    },
    {
      name: "The Sea Arch",
      theme: "Water is the softest and most yielding substance",
      keyPhrases: ["Water is the softest and most yielding substance."],
      draw: (b) => {
        b.path([[14, 84, 1.8], [18, 50], [26, 30], [44, 22, 2], [64, 24], [80, 34], [86, 58], [88, 84, 1.8]]);
        b.path([[34, 84, 1.4], [38, 64], [50, 54, 1.6], [62, 64], [66, 84, 1.4]]);
        b.path([[2, 84, 1.2], [14, 84], [34, 84], [66, 84], [88, 84], [98, 84, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.path([[8, 94, 1], [30, 91, 1.2], [50, 94, 1], [70, 91, 1.2], [92, 94, 1]]);
      },
    },
    {
      name: "The Broom",
      theme: "He who is willing to tackle the most unpleasant tasks is the best ruler",
      keyPhrases: ["He who is willing to tackle the most unpleasant tasks,"],
      draw: (b) => {
        b.path([[70, 4, 1.8], [62, 24], [54, 44], [48, 58, 1.4]]);
        b.loop([[42, 56, 1.6], [56, 62, 1.6], [48, 94, 2], [36, 94, 1.8], [24, 90, 1.8]]);
        b.path([[44, 66, 1.2], [36, 92]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.pts([[70, 92, 1], [80, 88, 1.2], [88, 94, 1]]);
      },
    },
    {
      name: "The Mountain in the Lake",
      theme: "True sayings seem contradictory",
      keyPhrases: ["True sayings seem contradictory."],
      draw: (b) => {
        b.path([[10, 50, 1.4], [30, 26, 1.8], [40, 34], [54, 10, 2.6], [70, 34], [90, 50, 1.4]]);
        b.path([[2, 50, 1.2], [98, 50, 1.2]]);
        b.path([[10, 50], [30, 74, 1.2], [40, 66, 1], [54, 90, 1.8], [70, 66, 1], [90, 50]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
      },
    },
    {
      name: "The Lowest Servant",
      theme: "Only he who is the lowest servant of the kingdom is worthy to become its ruler",
      keyPhrases: ["is worthy to become its ruler."],
      draw: (b) => {
        b.path([[34, 28, 1.6], [36, 16, 2], [44, 22], [50, 12, 2.4], [56, 22], [64, 16, 2], [66, 28, 1.6]]);
        b.path(g([[34, 28], [66, 28]], 1.6));
        b.close(b.ring(42, 58, 5, 5, 1.8));
        const neck = b.star(48, 64, 1.6);
        const hips = b.star(64, 60, 2);
        b.line(neck, hips);
        b.line(hips, b.star(66, 78, 1.4), b.star(60, 92, 1.8));
        b.line(hips, b.star(74, 76, 1.4), b.star(78, 92, 1.8));
        b.line(neck, b.star(46, 78, 1.4));
        b.path([[4, 94, 1], [96, 94, 1]]);
      },
    },
  ],
  79: [
    {
      name: "The Tangled Thread",
      theme: "Difficulties remain, even after solving a problem",
      keyPhrases: ["Difficulties remain, even after solving a problem."],
      draw: (b) => {
        b.close(b.ring(46, 50, 30, 12, 1.8));
        b.path([[22, 34, 1], [46, 42, 1.2], [70, 34, 1]]);
        b.path([[18, 56, 1], [46, 64, 1.2], [74, 56, 1]]);
        b.path([[34, 24, 1], [30, 50, 1.2], [36, 76, 1]]);
        b.path([[58, 24, 1], [62, 50, 1.2], [56, 76, 1]]);
        b.path([[74, 60], [84, 72, 1.2], [80, 84, 1.4], [92, 94, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
      },
    },
    {
      name: "The Moon over Both Banks",
      theme: "The Tao does not choose sides",
      keyPhrases: ["The Tao does not choose sides,"],
      draw: (b) => {
        b.close(b.ring(50, 18, 10, 8, 2.2));
        b.path([[2, 60, 1.4], [30, 60, 1.6], [36, 96, 1.4]]);
        b.path([[98, 60, 1.4], [70, 60, 1.6], [64, 96, 1.4]]);
        for (const x of [14, 86]) {
          b.loop([[x - 8, 50, 1.4], [x, 42, 1.8], [x + 8, 50, 1.4]]);
          b.path([[x - 6, 50, 1], [x - 6, 60, 1.6]]);
        }
        b.pts([[50, 70, 1.6], [50, 82, 1.2]]);
      },
    },
    {
      name: "The Shade Tree",
      theme: "The good person receives from the Tao",
      keyPhrases: ["the good person receives from the Tao"],
      draw: (b) => {
        b.loop([[14, 40, 1.6], [18, 22, 1.8], [40, 10, 2], [64, 12, 1.8], [84, 24, 1.6], [86, 40], [60, 48], [36, 48]]);
        b.path([[50, 48, 1.4], [50, 90, 2]]);
        b.path([[4, 90, 1.2], [50, 90], [96, 90, 1.2]].map(([x, y, m]) => [x, y, m ?? 2] as P));
        b.close(b.ring(30, 70, 4, 4, 1.6));
        b.path([[30, 74, 1.4], [34, 84, 1.6], [24, 88, 1.4]]);
      },
    },
    {
      name: "The Split Tally",
      theme: "The Master does what she knows is right, and makes no demands of others",
      keyPhrases: ["and makes no demands of others."],
      draw: (b) => {
        b.path([[10, 16, 1.8], [40, 16, 1.6], [40, 30], [46, 30], [46, 46], [40, 46], [40, 62], [46, 62], [46, 84, 1.6], [10, 84, 1.8], [10, 16]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[90, 16, 1.8], [56, 16, 1.6], [56, 30], [62, 30], [62, 46], [56, 46], [56, 62], [62, 62], [62, 84, 1.6], [90, 84, 1.8], [90, 16]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
      },
    },
    {
      name: "The Lantern at the Crossroads",
      theme: "The Tao does not choose sides: one light for every road",
      keyPhrases: ["The Tao does not choose sides,"],
      draw: (b) => {
        b.path([[4, 94, 1.4], [50, 66, 1.2], [96, 94, 1.4]]);
        b.path([[20, 58, 1.2], [50, 66], [80, 58, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[50, 66], [50, 30, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[50, 30], [62, 24, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.loop([[58, 26, 1.4], [66, 26, 1.4], [68, 38, 1.4], [56, 38, 1.4]]);
        b.star(62, 32, 3);
      },
    },
  ],
  80: [
    {
      name: "The Two Villages",
      theme: "The next country is close enough that they can hear their roosters crowing",
      keyPhrases: ["Although the next country is close enough"],
      draw: (b) => {
        b.path([[2, 80, 1.2], [30, 62, 1.4], [50, 44, 1.8], [70, 62, 1.4], [98, 80, 1.2]]);
        for (const [x, y] of [[16, 76], [84, 76]]) {
          b.loop([[x - 8, y, 1.4], [x, y - 10, 1.8], [x + 8, y, 1.4]]);
          b.path([[x - 6, y, 1], [x - 6, y + 12, 1.4], [x + 6, y + 12, 1.4], [x + 6, y, 1]]);
          b.path([[x + 4, y - 10, 1], [x + 6, y - 20, 1.2], [x + 2, y - 28, 1.4]]);
        }
      },
    },
    {
      name: "The Spinning Wheel",
      theme: "Let them make their own clothes",
      keyPhrases: ["let them make their own clothes,"],
      draw: (b) => {
        const rim = b.ring(38, 44, 26, 10, 1.8);
        b.close(rim);
        const hub = b.star(38, 44, 2);
        for (const i of [0, 2, 4, 6, 8]) b.line(hub, rim[i]);
        b.path([[38, 44], [30, 90, 1.6]].map(([x, y, m]) => [x, y, m ?? 2] as P));
        b.path([[38, 44], [70, 86, 1.6]].map(([x, y, m]) => [x, y, m ?? 2] as P));
        b.path([[18, 90, 1.4], [90, 90, 1.4]]);
        b.path([[64, 44, 1.2], [84, 40, 1.4], [86, 60, 1.6]]);
      },
    },
    {
      name: "The Barking Dog",
      theme: "They can hear their roosters crowing and dogs barking",
      keyPhrases: ["that they can hear their roosters crowing and dogs barking,"],
      draw: (b) => {
        b.loop([[70, 30, 1.6], [66, 20, 1.8], [72, 16], [82, 22, 1.8], [90, 24, 1.6], [84, 32], [76, 36]]);
        b.path([[76, 36], [70, 50], [40, 50], [24, 44, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.path([[24, 44], [16, 30, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[70, 50], [68, 64], [40, 64], [28, 58], [24, 44]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        for (const [x, dx] of [[32, -4], [42, 2], [58, 0], [66, 4]]) b.path([[x, 64, 1], [x + dx, 86, 1.8]]);
        b.path([[94, 14, 1], [98, 8, 1.2]]);
        b.path([[96, 22, 1], [99, 20, 1.2]]);
      },
    },
    {
      name: "The Cottage and Garden",
      theme: "Let them be content with their own homes",
      keyPhrases: ["let them be content with their own homes,"],
      draw: (b) => {
        b.loop([[12, 44, 1.8], [36, 22, 2.2], [60, 44, 1.8]]);
        b.path([[16, 44, 1.2], [16, 80, 1.6], [56, 80, 1.6], [56, 44, 1.2]]);
        b.loop([[30, 80, 1.2], [30, 62, 1.4], [42, 62, 1.4], [42, 80, 1.2]]);
        b.path([[56, 72, 1.2], [96, 72, 1.2]]);
        for (const x of [64, 74, 84, 94]) b.path([[x, 66, 1.4], [x, 80, 1.2]]);
        b.close(b.ring(80, 20, 7, 7, 2));
      },
    },
    {
      name: "The Weathervane Rooster",
      theme: "They can hear their roosters crowing",
      keyPhrases: ["that they can hear their roosters crowing and dogs barking,"],
      draw: (b) => {
        b.loop([[40, 30, 1.6], [44, 18, 1.6], [50, 12, 2], [56, 16], [54, 26], [66, 30], [76, 22, 1.8], [80, 36, 1.6], [66, 44], [46, 44]]);
        b.path([[50, 12], [48, 6, 1.4]].map(([x, y, m]) => [x, y, m ?? 2] as P));
        b.path([[56, 44, 1.2], [56, 94, 1.6]]);
        b.path([[36, 64, 1.6], [76, 64, 1.6]]);
        b.pts([[30, 64, 1.2], [82, 64, 1.2], [56, 56, 1.6]]);
      },
    },
  ],
  81: [
    {
      name: "The Candle Lighting a Candle",
      theme: "The more she gives to others, the more she has for herself",
      keyPhrases: ["The more she gives to others,"],
      draw: (b) => {
        for (const [x, top, tilt] of [[34, 40, 0], [66, 50, 0]] as const) {
          b.loop([[x - 8, top, 1.6], [x + 8, top, 1.6], [x + 8, 92, 1.6], [x - 8, 92, 1.6]]);
          b.loop([[x + tilt, top - 4, 1.4], [x + 4, top - 12, 1.8], [x, top - 22, 2.6], [x - 4, top - 12, 1.8]]);
        }
        b.path([[18, 92, 1.2], [82, 92, 1.2]]);
      },
    },
    {
      name: "The Western Pass",
      theme: "The finale: Lao Tzu's parting through the western gate",
      keyPhrases: ["The Tao of Heaven nourishes by not forcing."],
      draw: (b) => {
        for (const x of [16, 84]) {
          b.path([[x - 12, 30, 1.8], [x, 20, 2], [x + 12, 30, 1.8]]);
          b.path([[x - 9, 30, 1.2], [x - 9, 80, 1.6], [x + 9, 80, 1.6], [x + 9, 30, 1.2]]);
        }
        b.path([[25, 42, 1.4], [75, 42, 1.4]]);
        b.path([[40, 94, 1.2], [46, 80, 1.2], [50, 64, 1.6]]);
        b.path([[60, 94, 1.2], [54, 80, 1.2], [50, 64]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.star(50, 56, 2.8);
        b.path([[2, 80, 1], [7, 80, 1.6]]);
        b.path([[93, 80, 1.6], [98, 80, 1]]);
      },
    },
    {
      name: "The Ox",
      theme: "The finale: the ox that carried the sage away",
      keyPhrases: ["The Tao of the Wise person acts by not competing."],
      draw: (b) => {
        b.loop([[36, 30, 1.6], [64, 30, 1.6], [70, 50], [64, 74], [56, 86, 1.8], [44, 86, 1.8], [36, 74], [30, 50]]);
        b.path([[36, 30], [22, 26], [10, 14, 2.2]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[64, 30], [78, 26], [90, 14, 2.2]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[30, 40, 1.2], [18, 44, 1.4]]);
        b.path([[70, 40, 1.2], [82, 44, 1.4]]);
        b.pts([[42, 50, 2.2], [58, 50, 2.2], [46, 78, 1.4], [54, 78, 1.4]]);
      },
    },
    {
      name: "The Road into the Sunset",
      theme: "The finale: the Master goes west, desiring no possessions",
      keyPhrases: ["The Master desires no possessions."],
      draw: (b) => {
        b.line(...b.arc(50, 50, 18, 180, 360, 7, 2));
        b.path([[2, 50, 1.4], [32, 50], [68, 50], [98, 50, 1.4]].map(([x, y, m]) => [x, y, m ?? 2] as P));
        b.path([[10, 96, 1.6], [34, 74, 1.4], [46, 58, 1.2], [50, 52, 1]]);
        b.path([[90, 96, 1.6], [66, 74, 1.4], [54, 58, 1.2], [50, 52]].map(([x, y, m]) => [x, y, m ?? 1] as P));
        b.close(b.ring(44, 70, 2, 4, 1.4));
        b.path([[44, 72, 1.2], [44, 78, 1.4]]);
      },
    },
    {
      name: "The Book Left Behind",
      theme: "The finale: true words do not sound beautiful",
      keyPhrases: ["True words do not sound beautiful;"],
      draw: (b) => {
        b.path([[10, 20, 2], [10, 80, 2]]);
        b.path([[90, 20, 2], [90, 80, 2]]);
        b.path([[10, 24, 1.4], [90, 24, 1.4]]);
        b.path([[10, 76, 1.4], [90, 76, 1.4]]);
        for (const x of [26, 42, 58, 74]) b.path([[x, 32, 1.2], [x, 50, 1], [x, 68, 1.2]]);
        b.pts([[10, 12, 1.4], [10, 88, 1.4], [90, 12, 1.4], [90, 88, 1.4]]);
      },
    },
  ],
};

export default c;
