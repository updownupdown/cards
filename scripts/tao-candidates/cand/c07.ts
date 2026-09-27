import type { Candidate } from "../types.ts";

type P = [number, number, number];
const g = (points: [number, number, number?][], mag: number): P[] =>
  points.map(([x, y, m]) => [x, y, m ?? mag]);

const c: Record<number, Candidate[]> = {
  61: [
    {
      name: "The Two Bows",
      theme: "Both seek to take the lower position",
      keyPhrases: ["So both seek to take the lower position"],
      draw: (b) => {
        for (const [x, d] of [[26, 1], [74, -1]] as const) {
          b.close(b.ring(x + 17 * d, 52, 5, 5, 1.8));
          const neck = b.star(x + 10 * d, 48, 1.6);
          const hips = b.star(x - 8 * d, 44, 2);
          b.line(neck, hips);
          b.line(hips, b.star(x - 6 * d, 68, 1.4), b.star(x - 6 * d, 90, 1.8));
          b.line(hips, b.star(x - 12 * d, 68, 1.4), b.star(x - 12 * d, 90, 1.8));
          b.line(neck, b.star(x + 10 * d, 64, 1.4));
        }
        b.path([[6, 92, 1.2], [94, 92, 1.2]]);
      },
    },
    {
      name: "The Lake below the Mountains",
      theme: "A large country should take the low place like a great watershed",
      keyPhrases: ["A large country should take the low place like a great watershed,"],
      draw: (b) => {
        b.path([[2, 60, 1.4], [16, 30, 2], [28, 44], [40, 24, 2.2], [52, 46], [66, 20, 2.4], [80, 38], [98, 56, 1.4]]);
        b.path(g([[28, 44], [34, 58, 1.2], [38, 68]], 1.8));
        b.path(g([[80, 38], [72, 58, 1.2], [64, 70]], 1.8));
        b.close(b.ring(50, 80, 30, 10, 1.6, 0, 9));
        b.nebula(b.arcPoints(50, 80, 30, 9, 0, 360, 12));
      },
      nebulaShare: 0.3,
    },
    {
      name: "The Bowing Rice",
      theme: "Both large and small countries benefit greatly from humility",
      keyPhrases: ["Both large and small countries benefit greatly from humility."],
      draw: (b) => {
        const stem = b.path([[30, 96, 1.6], [32, 70], [38, 44], [50, 24], [66, 18, 1.6], [78, 26], [84, 42], [84, 58, 2]]);
        for (const [i, dx] of [[4, 0], [5, 4], [6, 6]] as const) {
          const s = b.starAt(stem[i]);
          b.line(stem[i], b.star(s.x - 8 + dx, s.y + 8, 1.6));
          b.line(stem[i], b.star(s.x + 8 + dx, s.y + 4, 1.6));
        }
        b.path(g([[32, 70], [18, 58, 1.4], [10, 44, 1.6]], 1.6));
      },
    },
    {
      name: "The Big Fish and the Small",
      theme: "Large countries should desire to protect and help the people",
      keyPhrases: ["Large countries should desire to protect and help the people,"],
      draw: (b) => {
        const big = b.loop([[10, 44, 2], [24, 30], [46, 26], [64, 34, 1.6], [64, 54, 1.6], [46, 62], [24, 58]]);
        b.line(big[3], b.star(80, 28, 2), b.star(80, 60, 2), big[4]);
        b.star(20, 40, 2.6);
        const small = b.loop([[36, 78, 1.6], [44, 74], [52, 78, 1.2], [44, 82]]);
        b.line(small[2], b.star(58, 74, 1.2), b.star(58, 82, 1.2), small[2]);
        b.path([[70, 76, 1], [86, 80, 1.2]]);
      },
    },
    {
      name: "The Whale and Calf",
      theme: "The large should protect, the small should serve",
      keyPhrases: ["and small countries should desire to serve others."],
      draw: (b) => {
        b.loop([[8, 44, 1.8], [18, 30], [40, 24, 1.8], [62, 28], [80, 38], [92, 30, 2], [96, 44, 1.6], [86, 48], [72, 56], [46, 60], [22, 58]]);
        b.star(18, 42, 2.4);
        b.path([[20, 22, 1.2], [18, 12, 1.6]]);
        b.loop([[40, 78, 1.6], [48, 72], [62, 74], [70, 70, 1.6], [72, 80, 1.4], [62, 82], [48, 84]]);
        b.path([[2, 92, 1], [30, 90, 1.2], [70, 92, 1.2], [98, 90, 1]]);
      },
    },
  ],
  62: [
    {
      name: "The Tent",
      theme: "The Tao is the tabernacle of creation",
      keyPhrases: ["The Tao is the tabernacle of creation,"],
      draw: (b) => {
        b.path([[50, 4, 1.6], [50, 16, 2.2]]);
        b.path([[6, 86, 1.8], [28, 50], [50, 16], [72, 50], [94, 86, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path(g([[6, 86], [94, 86]], 1.8));
        b.path([[50, 16], [40, 86, 1.4]].map(([x, y, m]) => [x, y, m ?? 2.2] as P));
        b.path([[50, 16], [60, 86, 1.4]].map(([x, y, m]) => [x, y, m ?? 2.2] as P));
        b.star(50, 70, 2.6);
        b.pts([[14, 16, 1.2], [84, 22, 1.4], [76, 8, 1]]);
      },
    },
    {
      name: "The Open Treasure Chest",
      theme: "It is a treasure for those who are good",
      keyPhrases: ["it is a treasure for those who are good,"],
      draw: (b) => {
        b.loop([[16, 52, 1.8], [84, 52, 1.8], [84, 88, 1.8], [16, 88, 1.8]]);
        b.path(g([[16, 52], [22, 30, 1.6], [78, 30, 1.6], [84, 52]], 1.8));
        b.path([[22, 30], [28, 18, 1.4], [72, 18, 1.4], [78, 30]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.pts([[36, 46, 2.4], [50, 42, 2.8], [64, 46, 2.4], [44, 48, 1.6], [58, 48, 1.6]]);
        b.path([[44, 62, 1.2], [56, 62, 1.2], [56, 72, 1.2], [44, 72, 1.2]]);
      },
    },
    {
      name: "The Harbor",
      theme: "A place of refuge for those who are not",
      keyPhrases: ["and a place of refuge for those who are not."],
      draw: (b) => {
        b.path([[2, 30, 1.6], [16, 34], [26, 48], [30, 66, 1.8]]);
        b.path([[98, 30, 1.6], [84, 34], [74, 48], [70, 66, 1.8]]);
        b.path([[40, 56, 1.8], [44, 62], [56, 62], [60, 56, 1.8]]);
        b.path([[50, 56, 1.2], [50, 40, 1.6]]);
        b.loop([[51, 42, 1.2], [60, 52, 1.4], [51, 54, 1.2]]);
        b.path([[2, 80, 1], [16, 76, 1.2], [30, 80, 1], [70, 80, 1], [84, 76, 1.2], [98, 80, 1]]);
        b.star(50, 14, 2.6);
      },
    },
    {
      name: "The Cave Fire",
      theme: "A place of refuge",
      keyPhrases: ["and a place of refuge for those who are not."],
      draw: (b) => {
        b.path([[2, 90, 1.6], [10, 50], [26, 22, 1.8], [50, 12, 2], [74, 22, 1.8], [90, 50], [98, 90, 1.6]]);
        b.path([[20, 90, 1.4], [26, 60], [50, 42, 1.4], [74, 60], [80, 90, 1.4]]);
        b.loop([[42, 86, 1.8], [46, 74, 2], [50, 64, 2.8], [54, 74, 2], [58, 86, 1.8]]);
        b.path([[36, 90, 1.4], [64, 90, 1.4]]);
      },
    },
    {
      name: "The Lamp in the Window",
      theme: "How can those who are not good be abandoned?",
      keyPhrases: ["How can those who are not good be abandoned?"],
      draw: (b) => {
        b.loop([[20, 20, 1.8], [80, 20, 1.8], [80, 80, 1.8], [20, 80, 1.8]]);
        b.path([[50, 20, 1.2], [50, 80, 1.2]]);
        b.path([[20, 50, 1.2], [80, 50, 1.2]]);
        b.star(35, 66, 3);
        b.loop([[31, 72, 1.2], [39, 72, 1.2], [37, 76, 1.2], [33, 76, 1.2]]);
        b.path([[12, 88, 1.4], [88, 88, 1.4]]);
      },
    },
  ],
  63: [
    {
      name: "The Ant",
      theme: "Find that greatness in the small",
      keyPhrases: ["Find that greatness in the small."],
      draw: (b) => {
        b.close(b.ring(24, 44, 8, 6, 1.8));
        b.close(b.ring(44, 48, 7, 6, 1.6));
        b.close(b.ring(70, 52, 14, 8, 1.8, 0, 10));
        b.line(b.star(20, 37, 1.2), b.star(14, 24, 1.6));
        b.line(b.star(28, 37, 1.2), b.star(30, 24, 1.6));
        for (const [x, dx] of [[40, -8], [44, 0], [48, 8]]) {
          b.line(b.star(x, 55, 1.2), b.star(x + dx, 66, 1.2), b.star(x + dx * 1.5, 80, 1.6));
        }
      },
    },
    {
      name: "The Needle and Thread",
      theme: "Take care of difficult problems while they are still easy",
      keyPhrases: ["Take care of difficult problems"],
      draw: (b) => {
        b.path([[82, 8, 1.6], [84, 12, 1.4], [30, 80, 1.4], [22, 92, 2.6], [26, 78, 1.4], [78, 10, 1.4], [82, 8]]);
        b.path([[80, 14, 1], [70, 30, 1.2], [56, 24, 1.2], [44, 34, 1.4], [30, 30, 1.4], [16, 40, 1.6]]);
      },
    },
    {
      name: "The Small Key",
      theme: "Find that greatness in the small",
      keyPhrases: ["Find that greatness in the small."],
      draw: (b) => {
        b.close(b.ring(30, 50, 14, 8, 1.8));
        b.close(b.ring(30, 50, 5, 5, 1.2));
        b.path([[44, 50, 1.4], [60, 50], [76, 50], [90, 50, 1.6]]);
        b.path([[76, 50], [76, 62, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.path([[86, 50], [86, 60, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
      },
    },
    {
      name: "The Spark",
      theme: "Do easy things before they become too hard",
      keyPhrases: ["Do easy things before they become too hard."],
      draw: (b) => {
        b.star(50, 44, 3);
        for (let i = 0; i < 6; i++) {
          const a = ((-90 + i * 60) * Math.PI) / 180;
          b.line(b.star(50 + 6 * Math.cos(a), 44 + 6 * Math.sin(a), 1), b.star(50 + 14 * Math.cos(a), 44 + 14 * Math.sin(a), 1.6));
        }
        b.path([[20, 90, 1.8], [80, 70, 1.4]]);
        b.path([[20, 70, 1.4], [80, 90, 1.8]]);
        b.path([[34, 92, 1.2], [66, 92, 1.2]]);
      },
    },
    {
      name: "The Staked Sapling",
      theme: "Great projects are best started while they are small",
      keyPhrases: ["Great projects are best started while they are small."],
      draw: (b) => {
        b.path([[6, 88, 1.2], [94, 88, 1.2]]);
        b.path([[64, 88, 1.4], [64, 20, 1.8]]);
        b.path([[50, 88, 1.6], [52, 66], [50, 46], [52, 30, 2]]);
        b.path([[52, 66], [64, 64]].map(([x, y]) => [x, y, 1.2] as P));
        b.path([[50, 46], [64, 44]].map(([x, y]) => [x, y, 1.2] as P));
        b.loop(g([[50, 46], [36, 38, 1.6], [30, 44, 1.4]], 1.4));
        b.loop(g([[52, 38, 1.2], [40, 24, 1.6], [34, 30, 1.4]], 1.4));
      },
    },
  ],
  64: [
    {
      name: "The First Footstep",
      theme: "A journey of a thousand miles starts with a single footstep",
      keyPhrases: ["starts with a single footstep."],
      draw: (b) => {
        b.close(b.ring(34, 84, 5, 5, 1.6, -90, 9));
        b.star(34, 72, 2);
        b.path([[48, 96, 1.2], [58, 76], [44, 58], [60, 40], [50, 24], [58, 12, 1.2]].map(([x, y, m]) => [x, y, m ?? 1] as P));
        b.path([[64, 96, 1.2], [74, 76], [60, 58], [74, 40], [62, 24], [62, 12, 1.2]].map(([x, y, m]) => [x, y, m ?? 1] as P));
        b.path([[40, 14, 1.4], [60, 6, 2.2], [84, 14, 1.4]]);
      },
    },
    {
      name: "The Spade",
      theme: "The tallest building starts with one shovel of dirt",
      keyPhrases: ["starts with one shovel of dirt."],
      draw: (b) => {
        b.path([[44, 8, 1.6], [56, 8, 1.6]]);
        b.path([[50, 8], [50, 30], [50, 50, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.loop(g([[50, 50], [62, 52, 1.6], [62, 72], [50, 84, 2.4], [38, 72], [38, 52, 1.6]], 1.4));
        b.path([[6, 92, 1.4], [26, 82, 1.6], [42, 86], [58, 86], [74, 82, 1.6], [94, 92, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
      },
    },
    {
      name: "The Tall Tower",
      theme: "The tallest building starts with one shovel of dirt",
      keyPhrases: ["The tallest building"],
      draw: (b) => {
        b.path([[50, 4, 2.4], [50, 12, 1.4]]);
        b.path([[40, 20, 1.6], [50, 12], [60, 20, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.path([[42, 20, 1.2], [38, 60, 1.4], [34, 92, 1.8]]);
        b.path([[58, 20, 1.2], [62, 60, 1.4], [66, 92, 1.8]]);
        for (const y of [34, 48, 62, 76]) b.path([[40 - (y - 20) * 0.1, y, 1], [60 + (y - 20) * 0.1, y, 1]]);
        b.path([[6, 92, 1.4], [94, 92, 1.4]]);
      },
    },
    {
      name: "The Long Road",
      theme: "A journey of a thousand miles",
      keyPhrases: ["A journey of a thousand miles"],
      draw: (b) => {
        b.path([[2, 44, 1.4], [18, 26, 1.8], [30, 36], [48, 18, 2.2], [64, 32], [78, 22, 1.8], [98, 40, 1.4]]);
        b.path([[20, 96, 1.4], [44, 80], [36, 66], [52, 56], [46, 48, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[44, 96, 1.4], [62, 80], [52, 66], [60, 56], [50, 48, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.close(b.ring(30, 82, 2.5, 4, 1.6));
        b.path([[30, 88, 1.2], [30, 94, 1.4]]);
      },
    },
    {
      name: "The Acorn and the Oak",
      theme: "The tallest tree begins as a tiny sprout",
      keyPhrases: ["begins as a tiny sprout."],
      draw: (b) => {
        b.loop([[34, 30, 1.6], [38, 14, 1.8], [56, 6, 2], [74, 12, 1.8], [82, 28, 1.6], [70, 40], [46, 40]]);
        b.path([[56, 40, 1.2], [56, 90, 2]]);
        b.path(g([[56, 60], [70, 48, 1.4]], 1.2));
        b.path([[4, 90, 1.2], [56, 90], [96, 90, 1.2]].map(([x, y, m]) => [x, y, m ?? 2] as P));
        b.loop([[14, 76, 1.4], [22, 76, 1.4], [24, 82, 1.4], [18, 88, 1.8], [12, 82, 1.4]]);
        b.path([[18, 76], [18, 70, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
      },
    },
  ],
  65: [
    {
      name: "The Fork in the Road",
      theme: "Knowing the two alternatives is a pattern",
      keyPhrases: ["Knowing the two alternatives is a pattern."],
      draw: (b) => {
        b.path([[40, 96, 1.6], [46, 72], [48, 54, 1.8], [30, 36], [14, 14, 1.6]]);
        b.path([[60, 96, 1.6], [54, 72], [52, 54], [70, 36], [86, 14, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.path([[48, 54], [36, 30, 1.2], [24, 12, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.path([[52, 54], [64, 30, 1.2], [76, 12, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.star(18, 6, 2.4);
        b.star(82, 6, 2.4);
      },
    },
    {
      name: "The Labyrinth",
      theme: "Smart people are difficult to guide",
      keyPhrases: ["Smart people are difficult to guide,"],
      draw: (b) => {
        b.path([[50, 50, 2.6], [58, 50], [58, 58], [42, 58], [42, 42], [66, 42], [66, 66], [34, 66], [34, 34], [74, 34], [74, 74], [26, 74], [26, 26], [82, 26], [82, 82], [18, 82], [18, 18, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
      },
    },
    {
      name: "The Fox",
      theme: "Because they think they are too clever",
      keyPhrases: ["because they think they are too clever."],
      draw: (b) => {
        b.loop([[50, 88, 2.2], [36, 70], [24, 54], [20, 36], [16, 12, 1.8], [34, 26], [50, 30], [66, 26], [84, 12, 1.8], [80, 36], [76, 54], [64, 70]]);
        b.pts([[38, 48, 2.4], [62, 48, 2.4]]);
        b.path([[24, 20, 1], [30, 30, 1]]);
        b.path([[76, 20, 1], [70, 30, 1]]);
      },
    },
    {
      name: "The Big Dipper",
      theme: "It leads to harmony with the heavens: the oldest pattern in the sky",
      keyPhrases: ["but leads to harmony with the heavens."],
      draw: (b) => {
        b.path([[8, 30, 2.4], [26, 34, 2.2], [40, 42, 2.2], [54, 52, 2], [58, 72, 2.2], [84, 78, 2.4], [90, 58, 2.2], [54, 52]]);
        b.star(4, 8, 1.6);
        b.pts([[30, 80, 1], [72, 16, 1.2], [20, 60, 1]]);
      },
    },
    {
      name: "The Woven Basket",
      theme: "Remaining aware of the pattern is a virtue",
      keyPhrases: ["Remaining aware of the pattern is a virtue."],
      draw: (b) => {
        b.close(b.ring(50, 30, 36, 10, 1.6, 0, 8));
        b.path([[14, 30], [22, 82, 1.6], [78, 82, 1.6], [86, 30]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        for (const y of [48, 64]) b.path([[14 + (y - 30) * 0.15, y, 1.2], [50, y + 4, 1.2], [86 - (y - 30) * 0.15, y, 1.2]]);
        for (const x of [36, 64]) b.path([[x, 40, 1], [x + (x < 50 ? 2 : -2), 82, 1]]);
      },
    },
  ],
  66: [
    {
      name: "The Hundred Streams",
      theme: "Rivers and seas are rulers of the streams of hundreds of valleys",
      keyPhrases: ["of the streams of hundreds of valleys"],
      draw: (b) => {
        b.close(b.ring(50, 80, 30, 10, 1.8, 0, 12));
        for (const [x, y] of [[4, 24], [20, 10], [42, 4], [62, 6], [82, 12], [96, 28]]) {
          b.path([[x, y, 1.6], [x + (50 - x) * 0.45, y + (68 - y) * 0.5, 1.2]]);
        }
        b.nebula(b.arcPoints(50, 80, 30, 12, 0, 360, 12));
      },
      nebulaShare: 0.3,
    },
    {
      name: "The Conch",
      theme: "Rivers and seas are rulers because of their low position",
      keyPhrases: ["because of the power of their low position."],
      draw: (b) => {
        b.loop([[20, 30, 1.8], [40, 18, 1.6], [62, 14, 1.8], [82, 20, 2], [86, 32], [74, 50], [60, 70], [46, 86, 2.2], [40, 72], [30, 56], [22, 42]]);
        b.path([[40, 18], [44, 30, 1.2], [60, 34, 1.2], [74, 30], [82, 20]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.path([[30, 56, 1.2], [50, 52, 1.2], [70, 50, 1.2]]);
        b.path([[40, 72], [56, 70, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
      },
    },
    {
      name: "The Water Carrier",
      theme: "If you want to be the ruler of people, you must speak to them like you are their servant",
      keyPhrases: ["you must speak to them like you are their servant."],
      draw: (b) => {
        b.close(b.ring(50, 22, 6, 6, 1.8));
        const neck = b.star(50, 30, 1.8);
        const hips = b.star(50, 58, 2);
        b.line(neck, hips);
        b.line(hips, b.star(42, 92, 1.8));
        b.line(hips, b.star(58, 92, 1.8));
        b.path([[6, 36, 1.8], [28, 32], [50, 30], [72, 32], [94, 36, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        for (const x of [10, 90]) {
          b.path([[x - 4, 36], [x - 6, 60, 1.2]].map(([px, py, m]) => [px, py, m ?? 1] as P));
          b.loop([[x - 8, 60, 1.6], [x + 8, 60, 1.6], [x + 6, 76, 1.6], [x - 6, 76, 1.6]]);
          b.line(b.star(x + 4, 36, 1), b.star(x + 6, 60, 1.2));
        }
      },
    },
    {
      name: "The Estuary",
      theme: "Rivers and seas are rulers of the streams",
      keyPhrases: ["Rivers and seas are rulers"],
      draw: (b) => {
        b.path([[44, 4, 1.4], [40, 20], [36, 38], [22, 56], [4, 70, 1.8]]);
        b.path([[56, 4, 1.4], [60, 20], [64, 38], [78, 56], [96, 70, 1.8]]);
        b.path([[2, 80, 1.2], [18, 76, 1.4], [34, 80], [50, 76, 1.4], [66, 80], [82, 76, 1.4], [98, 80, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[10, 92, 1], [30, 88, 1.2], [50, 92, 1], [70, 88, 1.2], [90, 92, 1]]);
      },
    },
    {
      name: "The Seagull",
      theme: "Because she does not like to compete, no one can compete with her",
      keyPhrases: ["Because she does not like to compete,"],
      draw: (b) => {
        const body = b.star(50, 40, 2.2);
        b.line(body, ...b.pts([[38, 28, 1.6], [22, 26], [6, 34, 1.8]]));
        b.line(body, ...b.pts([[62, 28, 1.6], [78, 26], [94, 34, 1.8]]));
        b.line(body, b.star(50, 48, 1.4));
        b.path([[2, 80, 1.2], [16, 72, 1.6], [30, 80, 1.2], [44, 72, 1.6], [58, 80, 1.2], [72, 72, 1.6], [86, 80, 1.2], [98, 74, 1.4]]);
        b.path([[10, 92, 1], [40, 90, 1.2], [70, 92, 1.2], [94, 90, 1]]);
      },
    },
  ],
  67: [
    {
      name: "The Triple Gem",
      theme: "There are three jewels that I cherish",
      keyPhrases: ["There are three jewels that I cherish:"],
      draw: (b) => {
        b.close(b.ring(50, 34, 11, 7, 2));
        b.close(b.ring(36, 58, 11, 7, 2));
        b.close(b.ring(64, 58, 11, 7, 2));
        b.path([[20, 78, 1.4], [50, 84, 1.6], [80, 78, 1.4]]);
        b.path([[42, 20, 1.2], [46, 10, 1.6], [50, 4, 2], [54, 10, 1.6], [58, 20, 1.2]]);
      },
    },
    {
      name: "The Heart Shield",
      theme: "If compassion is your defense you will be secure",
      keyPhrases: ["and if compassion is your defense you will be secure."],
      draw: (b) => {
        b.path([[14, 14, 1.8], [50, 8, 1.6], [86, 14, 1.8], [84, 48], [72, 72], [50, 92, 2.2], [28, 72], [16, 48], [14, 14]]);
        b.loop([[50, 40, 1.6], [58, 32], [66, 34], [68, 44], [50, 64, 2.2], [32, 44], [34, 34], [42, 32]]);
      },
    },
    {
      name: "The Trillium",
      theme: "Compassion, moderation, and humility",
      keyPhrases: ["compassion, moderation, and humility."],
      draw: (b) => {
        const c = b.star(50, 46, 2.8);
        for (let i = 0; i < 3; i++) {
          const a = ((-90 + i * 120) * Math.PI) / 180;
          const w = 0.5;
          b.line(c, b.star(50 + 22 * Math.cos(a - w), 46 + 22 * Math.sin(a - w), 1.6), b.star(50 + 36 * Math.cos(a), 46 + 36 * Math.sin(a), 2), b.star(50 + 22 * Math.cos(a + w), 46 + 22 * Math.sin(a + w), 1.6), c);
        }
        b.path([[50, 46], [52, 96, 1.4]].map(([x, y, m]) => [x, y, m ?? 2.8] as P));
      },
    },
    {
      name: "The Three Lamps",
      theme: "Three jewels to light the way",
      keyPhrases: ["There are three jewels that I cherish:"],
      draw: (b) => {
        for (const x of [22, 50, 78]) {
          b.loop([[x - 10, 60, 1.6], [x + 10, 60, 1.6], [x + 6, 68, 1.4], [x - 6, 68, 1.4]]);
          b.loop([[x, 56, 1.6], [x + 4, 48, 1.8], [x, 38, 2.6], [x - 4, 48, 1.8]]);
        }
        b.path([[6, 76, 1.2], [94, 76, 1.2]]);
      },
    },
    {
      name: "The Compassionate Warrior",
      theme: "The compassionate warrior will be the winner: Orion, with his belt of three",
      keyPhrases: ["The compassionate warrior will be the winner,"],
      draw: (b) => {
        const sh = [b.star(30, 20, 2.6), b.star(70, 22, 2.2)];
        const belt = [b.star(40, 50, 2.2), b.star(50, 48, 2.2), b.star(60, 46, 2.2)];
        const feet = [b.star(32, 86, 2.2), b.star(72, 84, 2.6)];
        b.line(sh[0], belt[0], feet[0]);
        b.line(sh[1], belt[2], feet[1]);
        b.line(...belt);
        b.line(sh[0], b.star(50, 8, 1.6), sh[1]);
        b.path([[50, 56, 1.2], [50, 64, 1.4], [50, 70, 1.2]]);
      },
    },
  ],
  68: [
    {
      name: "The Tai Chi Master",
      theme: "The best warriors do not use violence",
      keyPhrases: ["do not use violence."],
      draw: (b) => {
        b.close(b.ring(46, 16, 6, 6, 1.8));
        const neck = b.star(48, 25, 1.8);
        const hips = b.star(50, 52, 2);
        b.line(neck, hips);
        b.line(neck, b.star(64, 30, 1.4), b.star(78, 24, 1.8));
        b.line(neck, b.star(36, 40, 1.4), b.star(28, 52, 1.8));
        b.line(hips, b.star(36, 70, 1.4), b.star(24, 90, 2));
        b.line(hips, b.star(62, 70, 1.4), b.star(70, 90, 2));
        b.path([[8, 92, 1.2], [92, 92, 1.2]]);
        b.line(...b.arc(50, 52, 42, 200, 300, 5, 1));
      },
    },
    {
      name: "The Quiet Camp",
      theme: "The best generals do not destroy indiscriminately",
      keyPhrases: ["do not destroy indiscriminately."],
      draw: (b) => {
        b.line(...b.arc(76, 20, 10, 110, 250, 4, 1.8), ...b.arc(72, 20, 8, 240, 120, 3, 1.2));
        for (const [x, w, h] of [[26, 16, 26], [58, 12, 20]]) {
          b.path([[x - w, 84, 1.6], [x, 84 - h, 2], [x + w, 84, 1.6]]);
          b.path([[x, 84 - h], [x - 3, 84, 1.2]].map(([px, py, m]) => [px, py, m ?? 2] as P));
        }
        b.path([[2, 84, 1.2], [98, 84, 1.2]]);
        b.pts([[10, 16, 1.2], [36, 10, 1], [50, 30, 1.2]]);
      },
    },
    {
      name: "The Helmet of Flowers",
      theme: "This is called the virtue of non-competition",
      keyPhrases: ["This is called the virtue of non-competition."],
      draw: (b) => {
        b.path([[14, 76, 1.8], [18, 56], [28, 40], [50, 32, 1.8], [72, 40], [82, 56], [86, 76, 1.8]]);
        b.path(g([[14, 76], [50, 80, 1.4], [86, 76]], 1.8));
        b.path([[50, 32], [50, 20, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        for (const [x, y] of [[38, 18], [62, 14], [50, 10]]) b.close(b.ring(x, y, 5, 5, 1.6));
      },
    },
    {
      name: "The Crane Stance",
      theme: "Attaining harmony with the heavens",
      keyPhrases: ["This is called attaining harmony with the heavens."],
      draw: (b) => {
        b.close(b.ring(50, 16, 6, 6, 1.8));
        const neck = b.star(50, 25, 1.8);
        const hips = b.star(50, 54, 2);
        b.line(neck, hips);
        b.line(neck, b.star(34, 22, 1.4), b.star(16, 12, 1.8));
        b.line(neck, b.star(66, 22, 1.4), b.star(84, 12, 1.8));
        b.line(hips, b.star(50, 74, 1.4), b.star(50, 94, 2));
        b.line(hips, b.star(66, 62, 1.4), b.star(56, 72, 1.6));
      },
    },
    {
      name: "The Hedgehog",
      theme: "The best warriors do not use violence: defended, never attacking",
      keyPhrases: ["The best warriors"],
      draw: (b) => {
        const back = b.arc(50, 70, 36, 190, 350, 7, 1.6, 30);
        b.line(...back);
        back.forEach((id) => {
          const s = b.starAt(id);
          b.line(id, b.star(50 + (s.x - 50) * 1.3, 70 + (s.y - 70) * 1.3, 1.8));
        });
        b.path([[14, 70, 1.4], [6, 76, 2], [16, 80, 1.4], [84, 76, 1.4]]);
        b.star(14, 74, 2.2);
      },
    },
  ],
  69: [
    {
      name: "The Crab",
      theme: "It is better to retreat a foot than to advance only an inch",
      keyPhrases: ["It is better to retreat a foot"],
      draw: (b) => {
        b.close(b.ring(50, 58, 20, 10, 1.8, 0, 13));
        for (const [x, d] of [[32, -1], [68, 1]] as const) {
          for (const y of [62, 68]) b.line(b.star(x + d * 2, y, 1), b.star(x + d * 14, y + 10, 1.4));
          b.line(b.star(x + 8 * d, 48, 1.2), b.star(x + 12 * d, 32, 1.4));
          b.loop([[x + 12 * d, 32], [x + 8 * d, 20, 1.8], [x + 18 * d, 22, 1.6]].map(([px, py, m]) => [px, py, m ?? 1.4] as P));
        }
        b.pts([[44, 42, 2], [56, 42, 2]]);
      },
    },
    {
      name: "The Receding Wave",
      theme: "Pushing back without using force",
      keyPhrases: ["pushing back without using force,"],
      draw: (b) => {
        b.path([[2, 40, 1.4], [20, 36, 1.6], [40, 44], [56, 38, 1.8], [72, 44], [98, 40, 1.4]]);
        b.path([[6, 58, 1.2], [26, 52, 1.4], [46, 60], [66, 54, 1.4], [94, 58, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[2, 76, 1.6], [30, 72], [60, 76], [98, 72, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.pts([[30, 88, 1], [60, 90, 1.2], [82, 86, 1]]);
      },
    },
    {
      name: "The Teardrop",
      theme: "Victory will go to the one that enters with the greatest sorrow",
      keyPhrases: ["that enters with the greatest sorrow."],
      draw: (b) => {
        b.loop([[50, 8, 2.2], [58, 26], [68, 44], [72, 62, 1.8], [66, 78], [50, 86, 2], [34, 78], [28, 62, 1.8], [32, 44], [42, 26]]);
        b.path([[40, 56, 1.2], [38, 66, 1.6]]);
      },
    },
    {
      name: "The Backward Steps",
      theme: "Better to retreat a foot than to advance only an inch",
      keyPhrases: ["than to advance only an inch.\""],
      draw: (b) => {
        for (const [x, y, s] of [[70, 20, 0.7], [40, 40, 0.8], [66, 62, 0.9], [34, 84, 1]] as const) {
          b.close(b.ring(x, y, 4 * s, 5, 1.2, 90, 8 * s));
          b.star(x, y + 12 * s, 1.8);
        }
        b.path([[88, 8, 1.4], [80, 18, 1.2]]);
      },
    },
    {
      name: "The Coiled Spring",
      theme: "Being flexible while advancing",
      keyPhrases: ["being flexible while advancing,"],
      draw: (b) => {
        const pts: P[] = [];
        for (let i = 0; i < 22; i++) {
          const t = (i / 21) * Math.PI * 6;
          pts.push([50 + 22 * Math.cos(t), 24 + (i / 21) * 52 + 6 * Math.sin(t), Math.sin(t) > 0 ? 1.8 : 1.2]);
        }
        b.path(pts);
        b.path([[24, 14, 1.8], [76, 14, 1.8]]);
        b.path([[24, 86, 1.8], [76, 86, 1.8]]);
      },
    },
  ],
  70: [
    {
      name: "The Bamboo Book",
      theme: "My teachings come from the ancients",
      keyPhrases: ["My teachings come from the ancients,"],
      draw: (b) => {
        for (const x of [14, 26, 38, 50, 62, 74, 86]) b.path([[x, 18, 1.6], [x, 82, 1.6]]);
        b.path([[8, 34, 1.2], [92, 34, 1.2]]);
        b.path([[8, 66, 1.2], [92, 66, 1.2]]);
      },
    },
    {
      name: "The Geode",
      theme: "Because those who know me are few, my teachings become even more precious",
      keyPhrases: ["my teachings become even more precious."],
      draw: (b) => {
        b.loop([[14, 50, 1.6], [20, 28], [40, 14, 1.8], [62, 16], [82, 28, 1.8], [88, 52], [78, 76], [54, 88, 1.8], [30, 80]]);
        const c = b.star(52, 50, 3);
        for (let i = 0; i < 8; i++) {
          const a = ((i * 45) * Math.PI) / 180;
          b.line(c, b.star(52 + (i % 2 ? 14 : 22) * Math.cos(a), 50 + (i % 2 ? 14 : 22) * Math.sin(a), i % 2 ? 1.4 : 2));
        }
      },
    },
    {
      name: "The Orchid",
      theme: "Those who know me are few: the orchid hidden in the valley",
      keyPhrases: ["Because those who know me are few,"],
      draw: (b) => {
        const c = b.star(58, 36, 2.6);
        b.loop([[58, 36], [52, 20, 1.6], [58, 10, 1.8], [64, 20, 1.6]].map(([x, y, m]) => [x, y, m ?? 2.6] as P));
        b.loop([[58, 36], [44, 30, 1.6], [36, 38, 1.8], [46, 42, 1.4]].map(([x, y, m]) => [x, y, m ?? 2.6] as P));
        b.loop([[58, 36], [72, 30, 1.6], [80, 38, 1.8], [70, 42, 1.4]].map(([x, y, m]) => [x, y, m ?? 2.6] as P));
        b.loop([[58, 36], [52, 48, 1.4], [58, 56, 1.8], [64, 48, 1.4]].map(([x, y, m]) => [x, y, m ?? 2.6] as P));
        b.path([[58, 56], [52, 72, 1.2], [48, 94, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.path([[48, 94], [30, 70, 1.2], [14, 52, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[48, 94], [70, 76, 1.2], [90, 70, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        void c;
      },
    },
    {
      name: "The Brush and Inkstone",
      theme: "My words are easy to understand",
      keyPhrases: ["My words are easy to understand"],
      draw: (b) => {
        b.loop([[10, 70, 1.6], [58, 70, 1.6], [62, 90, 1.6], [6, 90, 1.6]]);
        b.close(b.ring(34, 80, 12, 6, 1.2, 0, 4));
        b.path([[90, 6, 1.6], [80, 22], [70, 38], [64, 48, 1.6]]);
        b.loop(g([[64, 48], [70, 52, 1.4], [62, 64, 2.2], [58, 52, 1.4]], 1.6));
      },
    },
    {
      name: "The Torch",
      theme: "My teachings come from the ancients: a flame handed on",
      keyPhrases: ["My teachings come from the ancients,"],
      draw: (b) => {
        b.loop([[50, 6, 2.4], [58, 18], [60, 30, 1.6], [50, 38, 1.8], [40, 30, 1.6], [42, 18]]);
        b.loop([[40, 40, 1.6], [60, 40, 1.6], [56, 50, 1.4], [44, 50, 1.4]]);
        b.path([[46, 50, 1.2], [48, 94, 1.8]]);
        b.path([[54, 50, 1.2], [52, 94, 1.8]]);
        b.path([[48, 94], [52, 94]].map(([x, y]) => [x, y, 1.8] as P));
      },
    },
  ],
};

export default c;
