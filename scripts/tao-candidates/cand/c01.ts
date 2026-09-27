import type { Candidate } from "../types.ts";

const c: Record<number, Candidate[]> = {
  1: [
    {
      name: "The Eclipse",
      theme: "Darkness born from darkness: a black sun ringed by its corona",
      keyPhrases: ["Darkness born from darkness."],
      draw: (b) => {
        b.close(b.ring(50, 50, 22, 12, 2));
        const inner = b.ring(50, 50, 27, 8, 1.2, -90);
        const outer = b.ring(50, 50, 27, 8, 1, -90).map((_, i) => {
          const a = ((-90 + i * 45) * Math.PI) / 180;
          const r = i % 2 === 0 ? 44 : 36;
          return b.star(50 + r * Math.cos(a), 50 + r * Math.sin(a), i % 2 === 0 ? 2.2 : 1.6);
        });
        inner.forEach((id, i) => b.line(id, outer[i]));
      },
    },
    {
      name: "The Keyhole",
      theme: "Freed from desire, you can see the hidden mystery",
      keyPhrases: ["Freed from desire, you can see the hidden mystery."],
      draw: (b) => {
        const top = b.arc(50, 36, 15, 118, 422, 9, 2);
        b.line(...top);
        const [bl, br] = b.pts([[38, 80, 2.2], [62, 80, 2.2]]);
        b.line(top[top.length - 1], br, bl, top[0]);
        b.loop([[26, 8, 1.4], [74, 8, 1.4], [80, 14, 1.2], [80, 88, 1.2], [74, 94, 1.4], [26, 94, 1.4], [20, 88, 1.2], [20, 14, 1.2]]);
        b.star(50, 36, 2.8);
      },
    },
    {
      name: "The Open Door",
      theme: "A door swung open onto the dark source",
      keyPhrases: ["This source is called darkness."],
      draw: (b) => {
        const frame = b.path([[36, 92, 1.8], [36, 12, 2.2], [76, 12, 2.2], [76, 92, 1.8]]);
        b.line(frame[0], ...b.pts([[20, 97, 1.6], [20, 17, 1.8]]), frame[1]);
        b.star(24, 56, 2.4);
        b.path([[4, 92, 1.2], [36, 92], [76, 92], [96, 92, 1.2]]);
        b.pts([[52, 40, 1], [62, 58, 1], [55, 72, 1]]);
        b.nebula([[37, 13], [75, 13], [75, 91], [37, 91]]);
      },
      nebulaShare: 0.3,
    },
    {
      name: "The Moon Gate",
      theme: "The nameless is the boundary: a round gate in a garden wall",
      keyPhrases: ["The nameless is the boundary of Heaven and Earth."],
      draw: (b) => {
        const roof = b.path([[2, 22, 2.2], [12, 28, 1.6], [50, 28, 1.6], [88, 28, 1.6], [98, 22, 2.2]]);
        const [wl, wr] = b.pts([[10, 92, 1.8], [90, 92, 1.8]]);
        b.line(roof[1], wl);
        b.line(roof[3], wr);
        b.path([[2, 92, 1.2], [10, 92], [90, 92], [98, 92, 1.2]]);
        b.close(b.ring(50, 60, 24, 12, 2, 90));
      },
    },
    {
      name: "The Cosmic Egg",
      theme: "The named is the mother of creation: the first egg, cracking",
      keyPhrases: ["The named is the mother of creation."],
      draw: (b) => {
        const shell = b.pts([
          [50, 8, 2.2], [64, 14], [74, 30], [78, 50, 1.8], [74, 70], [63, 85], [50, 90, 2],
          [37, 85], [26, 70], [22, 50, 1.8], [26, 30], [36, 14],
        ]);
        b.close(shell);
        b.line(shell[9], ...b.pts([[32, 44, 1.4], [40, 52, 1.6], [48, 42, 1.6], [56, 52, 1.6], [64, 42, 1.6], [70, 50, 1.4]]), shell[3]);
        b.star(50, 68, 2.8);
      },
    },
  ],
  2: [
    {
      name: "Mountain and Reflection",
      theme: "High and low oppose each other: a peak mirrored in a lake",
      keyPhrases: ["High and low oppose each other."],
      draw: (b) => {
        b.path([[4, 50, 1.4], [20, 34, 1.8], [30, 40], [50, 10, 2.8], [64, 30], [72, 24, 2], [96, 50, 1.4]]);
        b.path([[2, 50, 1.2], [98, 50, 1.2]]);
        b.path([[4, 50, 1.4], [20, 66, 1.2], [30, 60, 1], [50, 90, 1.8], [64, 70, 1], [72, 76, 1.2], [96, 50, 1.4]]);
        b.nebula([[4, 51], [96, 51], [72, 76], [50, 90], [20, 66]]);
      },
      nebulaShare: 0.2,
    },
    {
      name: "Two Fish",
      theme: "Fore and aft follow each other: two fish circling",
      keyPhrases: ["Fore and aft follow each other."],
      draw: (b) => {
        for (const [cx, cy, flip] of [[50, 30, 1], [50, 70, -1]] as const) {
          const d = flip;
          const body = b.pts([
            [cx - 26 * d, cy, 2.2], [cx - 14 * d, cy - 9 * d], [cx + 4 * d, cy - 9 * d], [cx + 16 * d, cy - 3 * d],
            [cx + 16 * d, cy + 3 * d], [cx + 4 * d, cy + 9 * d], [cx - 14 * d, cy + 9 * d],
          ]);
          b.close(body);
          b.line(body[3], b.star(cx + 30 * d, cy - 10 * d, 1.8), b.star(cx + 30 * d, cy + 10 * d, 1.8), body[4]);
          b.star(cx - 18 * d, cy - 2 * d, 2.4);
        }
        b.path([[20, 40, 1], [14, 50, 1.2], [20, 60, 1]]);
        b.path([[80, 40, 1], [86, 50, 1.2], [80, 60, 1]]);
      },
    },
    {
      name: "The Great Wave",
      theme: "Crest and trough, fore and aft: a curling wave",
      keyPhrases: ["High and low oppose each other."],
      draw: (b) => {
        b.path([[2, 90, 1.4], [14, 84], [24, 70], [28, 52], [36, 34], [50, 22, 1.8], [66, 18, 2.2], [80, 22], [88, 32, 2], [86, 44], [78, 48], [70, 44], [70, 36, 1.6], [76, 34, 1.4]]);
        b.path([[24, 70], [38, 60], [48, 50], [58, 40, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[14, 84], [36, 88], [60, 86], [80, 80], [98, 76, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.pts([[92, 18, 1.2], [96, 28, 1], [84, 12, 1]]);
        b.nebula([[24, 70], [28, 52], [36, 34], [50, 22], [66, 18], [80, 22], [88, 32], [78, 48], [70, 36], [58, 40], [38, 60]]);
      },
    },
    {
      name: "The Seesaw",
      theme: "High and low define each other: a plank balanced on its stone",
      keyPhrases: ["High and low oppose each other."],
      draw: (b) => {
        const plank = b.path([[8, 30, 2], [30, 42], [50, 52, 2.2], [70, 62], [92, 74, 2]]);
        b.line(plank[2], ...b.pts([[38, 86, 1.6], [62, 86, 1.6]]), plank[2]);
        b.path([[4, 86, 1.2], [38, 86], [62, 86], [96, 86, 1.2]]);
        b.close(b.ring(14, 18, 6, 6, 1.6));
        b.close(b.ring(84, 60, 7, 6, 1.6));
      },
    },
    {
      name: "The Departing Geese",
      theme: "Things leave and she lets them go: geese flying off",
      keyPhrases: ["things leave and she lets them go."],
      draw: (b) => {
        for (const [x, y, k] of [[30, 66, 1.3], [60, 40, 1], [82, 22, 0.7]] as const) {
          const body = b.star(x, y, 2.4 * k);
          b.line(body, b.star(x - 10 * k, y - 8 * k, 1.6 * k), b.star(x - 20 * k, y - 4 * k, 1.8 * k));
          b.line(body, b.star(x + 10 * k, y - 8 * k, 1.6 * k), b.star(x + 20 * k, y - 4 * k, 1.8 * k));
          b.line(body, b.star(x + 3 * k, y + 5 * k, 1.2 * k));
        }
        b.path([[4, 94, 1.2], [20, 86, 1.6], [34, 92, 1.2], [48, 96, 1]]);
      },
    },
  ],
  3: [
    {
      name: "The Rice Bowl",
      theme: "Filling their bellies: a heaped bowl and chopsticks",
      keyPhrases: ["filling their bellies,"],
      draw: (b) => {
        const rim = b.path([[14, 50, 2], [26, 50], [50, 50], [74, 50], [86, 50, 2]]);
        b.line(rim[0], ...b.pts([[20, 66], [34, 78], [50, 81, 1.8], [66, 78], [80, 66]]), rim[4]);
        b.path([[40, 88, 1.6], [60, 88, 1.6]]);
        b.line(rim[1], ...b.pts([[34, 40, 1.4], [50, 36, 1.6], [66, 40, 1.4]]), rim[3]);
        b.path([[58, 42, 1.2], [88, 10, 2]]);
        b.path([[64, 44, 1.2], [94, 16, 2]]);
      },
    },
    {
      name: "The Pearl in the Shell",
      theme: "Do not display your treasures: an oyster keeping its pearl",
      keyPhrases: ["Do not display your treasures"],
      draw: (b) => {
        const hinge = b.star(50, 80, 2);
        const lower = b.pts([[14, 56, 1.8], [22, 66], [34, 76], [66, 76], [78, 66], [86, 56, 1.8]]);
        b.line(lower[0], lower[1], lower[2], hinge, lower[3], lower[4], lower[5]);
        const upper = b.pts([[18, 44], [30, 28], [50, 20, 2], [70, 28], [82, 44]]);
        b.line(lower[0], ...upper, lower[5]);
        for (const i of [1, 2, 3]) b.line(upper[i], hinge);
        b.star(50, 60, 3);
      },
    },
    {
      name: "The Square-Holed Coin",
      theme: "If you overvalue possessions: an old coin",
      keyPhrases: ["If you overvalue possessions,"],
      draw: (b) => {
        b.close(b.ring(50, 50, 38, 16, 1.8));
        b.loop([[40, 40, 2], [60, 40, 2], [60, 60, 2], [40, 60, 2]]);
        b.pts([[50, 22, 1.2], [78, 50, 1.2], [50, 78, 1.2], [22, 50, 1.2]]);
      },
    },
    {
      name: "The Padlock",
      theme: "People will begin to steal: a lock on the storehouse",
      keyPhrases: ["people will begin to steal."],
      draw: (b) => {
        const shackle = b.arc(50, 34, 16, 180, 360, 7, 1.8);
        b.line(...shackle);
        const body = b.loop([[24, 44, 2], [76, 44, 2], [76, 90, 2], [24, 90, 2]]);
        b.line(shackle[0], body[0]);
        b.line(shackle[6], body[1]);
        b.close(b.ring(50, 60, 5, 5, 1.4));
        b.path([[50, 66, 1.4], [50, 76, 1.6]]);
      },
    },
    {
      name: "The Simple Hut",
      theme: "Preferring simplicity: a thatched hut",
      keyPhrases: ["Preferring simplicity and freedom from desires,"],
      draw: (b) => {
        const roof = b.loop([[50, 14, 2.4], [90, 50, 2], [10, 50, 2]]);
        const [wl, wr] = b.pts([[18, 88, 1.6], [82, 88, 1.6]]);
        b.line(b.star(18, 50, 1.2), wl, wr, b.star(82, 50, 1.2));
        b.loop([[42, 88, 1.4], [42, 64, 1.4], [58, 64, 1.4], [58, 88, 1.4]]);
        b.path([[64, 26, 1.2], [64, 12, 1.6], [72, 12, 1.6], [72, 33, 1.2]]);
        b.pts([[80, 6, 1], [86, 2, 1]]);
        void roof;
      },
    },
  ],
  4: [
    {
      name: "The Empty Jar",
      theme: "The Tao is like an empty container",
      keyPhrases: ["The Tao is like an empty container:"],
      draw: (b) => {
        const left = b.pts([[38, 10, 2], [40, 20], [26, 32], [18, 52, 1.8], [22, 72], [36, 88], [44, 92, 1.8]]);
        const right = b.pts([[62, 10, 2], [60, 20], [74, 32], [82, 52, 1.8], [78, 72], [64, 88], [56, 92, 1.8]]);
        b.line(...left);
        b.line(...right);
        b.line(left[0], right[0]);
        b.line(left[6], right[6]);
        b.line(left[1], right[1]);
        b.path([[26, 32], [74, 32]].map(([x, y]) => [x, y, 0.8] as [number, number, number]));
      },
    },
    {
      name: "The Gourd",
      theme: "The immortals' gourd: can never be emptied and can never be filled",
      keyPhrases: ["it can never be emptied and can never be filled."],
      draw: (b) => {
        const top = b.arc(50, 32, 13, 130, 410, 8, 1.8);
        const bottom = b.arc(50, 68, 22, -60, 240, 11, 2);
        b.line(...top);
        b.line(...bottom);
        b.line(top[7], bottom[0]);
        b.line(top[0], bottom[10]);
        b.path([[50, 19, 1.4], [50, 8, 2.2]]);
        b.path([[50, 12, 1], [60, 6, 1.4], [66, 12, 1.6]]);
      },
    },
    {
      name: "The Spiral Galaxy",
      theme: "Unites all of creation with dust",
      keyPhrases: ["shades the lighted, and unites all of creation with dust."],
      draw: (b) => {
        for (const offset of [0, 180]) {
          const points: [number, number, number][] = [];
          for (let i = 0; i < 9; i++) {
            const a = ((offset + i * 38) * Math.PI) / 180;
            const r = 6 + i * 5;
            points.push([50 + r * Math.cos(a), 50 + r * Math.sin(a) * 0.8, 2.2 - i * 0.12]);
          }
          b.path(points);
        }
        b.star(50, 50, 3);
        b.nebula([[38, 42], [58, 38], [64, 52], [44, 60]]);
      },
      nebulaShare: 0.3,
    },
    {
      name: "The Endless Tunnel",
      theme: "Infinitely deep: rings receding into the dark",
      keyPhrases: ["Infinitely deep, it is the source of all things."],
      draw: (b) => {
        b.close(b.ring(50, 50, 42, 10, 2.2));
        b.close(b.ring(52, 48, 26, 8, 1.6));
        b.close(b.ring(53, 47, 14, 6, 1.2));
        b.close(b.ring(54, 46, 6, 4, 1));
        b.star(54, 46, 2.6);
      },
    },
    {
      name: "The Ancient Tortoise",
      theme: "Older than the concept of God",
      keyPhrases: ["It is older than the concept of God."],
      draw: (b) => {
        b.close(b.ring(50, 52, 26, 12, 1.8, -90, 30));
        b.loop([[40, 42, 1.4], [60, 42, 1.4], [66, 56, 1.4], [50, 66, 1.4], [34, 56, 1.4]]);
        const head = b.loop([[46, 20, 1.6], [50, 12, 2.2], [54, 20, 1.6]]);
        void head;
        for (const [x1, y1, x2, y2] of [[28, 34, 20, 26], [72, 34, 80, 26], [30, 72, 22, 82], [70, 72, 78, 82]]) {
          b.path([[x1, y1, 1.2], [x2, y2, 1.8]]);
        }
        b.path([[50, 82, 1.2], [50, 90, 1.6]]);
      },
    },
  ],
  5: [
    {
      name: "The Straw Dog",
      theme: "They treat all of creation as straw dogs",
      keyPhrases: ["they treat all of creation as straw dogs."],
      draw: (b) => {
        const back = b.path([[70, 34, 1.6], [48, 36], [28, 36, 1.6]]);
        b.line(back[2], ...b.pts([[16, 26, 1.4], [10, 16, 1.8]]));
        const head = b.loop([[70, 34], [74, 22, 1.6], [80, 14, 2], [84, 22, 1.6], [92, 28, 2], [86, 36, 1.4]]);
        void head;
        b.line(back[0], b.star(72, 54, 1.4), b.star(48, 56, 1.4), b.star(28, 54, 1.4), back[2]);
        for (const [x, y] of [[32, 55], [44, 56], [60, 56], [70, 55]]) b.line(b.star(x, y + 1, 1), b.star(x + (x < 50 ? -3 : 3), 84, 1.8));
        b.path([[6, 90, 1], [94, 90, 1]]);
      },
    },
    {
      name: "The Pleated Bellows",
      theme: "Empty, yet has not lost its power",
      keyPhrases: ["is like a bellows;"],
      draw: (b) => {
        const top = b.pts([[10, 20, 2], [22, 30], [34, 22], [46, 30], [58, 22], [70, 30, 1.8]]);
        const bot = b.pts([[10, 80, 2], [22, 70], [34, 78], [46, 70], [58, 78], [70, 70, 1.8]]);
        b.line(...top);
        b.line(...bot);
        for (let i = 1; i < 5; i++) b.line(top[i], bot[i]);
        b.line(top[0], bot[0]);
        const nozzle = b.star(94, 50, 2.8);
        b.line(top[5], nozzle, bot[5]);
        b.pts([[4, 50, 1.2], [18, 50, 1]]);
      },
    },
    {
      name: "The Swelling Sail",
      theme: "The space between Heaven and Earth: an empty sail full of wind",
      keyPhrases: ["it is empty, yet has not lost its power."],
      draw: (b) => {
        const mast = b.path([[44, 8, 2.2], [44, 30], [44, 52], [44, 72, 1.6]]);
        b.line(mast[0], ...b.pts([[58, 16], [68, 30], [72, 46, 1.8], [66, 62]]), b.star(44, 66, 1.4));
        b.path([[14, 72, 1.8], [26, 84], [68, 84], [84, 72, 1.8]]);
        b.path([[14, 72], [84, 72]].map(([x, y]) => [x, y, 1] as [number, number, number]));
        b.path([[4, 92, 1], [20, 90, 1.2], [36, 93, 1]]);
        b.path([[62, 93, 1], [78, 90, 1.2], [96, 92, 1]]);
        b.path([[6, 30, 1], [20, 28, 1.4]]);
        b.path([[10, 44, 1], [26, 42, 1.4]]);
        void mast;
      },
    },
    {
      name: "The Flame",
      theme: "The more it is used, the more it produces",
      keyPhrases: ["The more it is used, the more it produces;"],
      draw: (b) => {
        b.loop([[50, 6, 2.6], [58, 22], [68, 34], [72, 50, 1.8], [68, 66], [58, 76], [50, 78, 2], [42, 76], [32, 66], [28, 50, 1.8], [34, 36], [40, 28], [44, 40], [48, 24]]);
        b.loop([[50, 44, 1.6], [56, 56], [54, 66], [50, 68, 2.2], [46, 66], [44, 56]]);
        b.path([[22, 90, 1.6], [50, 84, 1.8], [78, 90, 1.6]]);
        b.path([[30, 94, 1.2], [70, 84, 1.2]]);
      },
    },
    {
      name: "The Empty Drum",
      theme: "Empty, yet the more it is struck, the more it sounds",
      keyPhrases: ["the more you talk of it, the less you comprehend."],
      draw: (b) => {
        b.close(b.ring(50, 42, 30, 10, 1.8, -90, 10));
        const [lb, rb] = b.pts([[20, 82, 1.8], [80, 82, 1.8]]);
        b.line(b.star(20, 42, 1), lb);
        b.line(b.star(80, 42, 1), rb);
        b.line(lb, ...b.pts([[35, 90], [50, 92, 1.6], [65, 90]]), rb);
        b.path([[14, 6, 1.6], [42, 36, 1.2]]);
        b.path([[86, 6, 1.6], [58, 36, 1.2]]);
      },
    },
  ],
  6: [
    {
      name: "The Incense Burner",
      theme: "Like a vapor, barely seen but always present",
      keyPhrases: ["It is like a vapor,"],
      draw: (b) => {
        const rim = b.path([[26, 58, 2], [74, 58, 2]]);
        b.line(rim[0], ...b.pts([[30, 72], [40, 80, 1.6], [60, 80, 1.6], [70, 72]]), rim[1]);
        b.path([[40, 80], [34, 94, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[60, 80, 1.2], [66, 94, 1.8]]);
        b.path([[22, 54, 1.4], [26, 58]].map(([x, y]) => [x, y, 1.4] as [number, number, number]));
        b.path([[50, 54, 1.4], [44, 44, 1.4], [52, 34, 1.6], [46, 22, 1.8], [54, 12, 2.2], [48, 4, 1.4]]);
        b.path([[56, 48, 1.2], [62, 38, 1.4], [58, 28, 1.6]]);
        b.nebula([[42, 50], [40, 28], [50, 4], [60, 14], [62, 40], [56, 52]]);
      },
      nebulaShare: 0.25,
    },
    {
      name: "The Steaming Cup",
      theme: "Barely seen but always present: steam over tea",
      keyPhrases: ["barely seen but always present."],
      draw: (b) => {
        const rim = b.path([[22, 50, 2], [70, 50, 2]]);
        b.line(rim[0], ...b.pts([[24, 66], [32, 78], [46, 82, 1.8], [60, 78], [68, 66]]), rim[1]);
        b.loop([[69, 56, 1.2], [80, 56, 1.4], [80, 68, 1.4], [68, 68, 1.2]]);
        b.path([[14, 88, 1.6], [46, 92, 1.4], [80, 88, 1.6]]);
        b.path([[36, 44, 1.2], [32, 34, 1.4], [38, 24, 1.8], [34, 12, 1.4]]);
        b.path([[52, 44, 1.2], [48, 32, 1.4], [54, 20, 2], [50, 6, 1.4]]);
      },
    },
    {
      name: "The Dandelion",
      theme: "Seeds drifting like vapor, spirit carried everywhere",
      keyPhrases: ["It is like a vapor,"],
      draw: (b) => {
        const head = b.star(40, 38, 2.6);
        b.path([[40, 38], [42, 60], [44, 80], [46, 96, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.ring(40, 38, 16, 10, 1.4, -90).forEach((id) => b.line(head, id));
        b.path([[62, 30, 1.2], [68, 24, 1.8]]);
        b.path([[74, 42, 1.2], [80, 36, 1.8]]);
        b.path([[80, 16, 1.2], [86, 10, 1.8]]);
      },
    },
    {
      name: "The Drifting Cloud",
      theme: "Barely seen but always present: a cloud over the valley",
      keyPhrases: ["barely seen but always present."],
      draw: (b) => {
        b.loop([[18, 50, 1.8], [14, 40], [22, 30], [32, 30], [38, 20, 2], [52, 16, 2.2], [62, 24], [74, 22], [84, 32, 2], [82, 44], [70, 50], [48, 52]]);
        b.path([[2, 92, 1.4], [22, 70, 2], [40, 88, 1.4], [50, 94, 1.2], [60, 86, 1.4], [78, 66, 2], [98, 90, 1.4]]);
        b.nebula([[14, 40], [22, 30], [52, 16], [84, 32], [82, 44], [48, 52], [18, 50]]);
      },
      nebulaShare: 0.3,
    },
    {
      name: "The Moon in the Valley",
      theme: "The spirit of emptiness is immortal: a moon held in the valley's hollow",
      keyPhrases: ["The spirit of emptiness is immortal."],
      draw: (b) => {
        b.path([[2, 60, 1.4], [14, 30, 1.8], [22, 16, 2.4], [32, 38], [44, 74], [50, 84, 2], [56, 74], [68, 38], [78, 14, 2.4], [86, 28, 1.8], [98, 56, 1.4]]);
        b.close(b.ring(50, 42, 11, 9, 1.8));
        b.path([[26, 50, 1], [34, 54, 1.2]]);
        b.path([[66, 58, 1.2], [74, 54, 1]]);
        b.nebula([[32, 60], [40, 48], [60, 48], [68, 60], [56, 76], [44, 76]]);
      },
      nebulaShare: 0.2,
    },
  ],
  7: [
    {
      name: "The Pole Star",
      theme: "The Tao of Heaven is eternal: the sky wheeling round its still point",
      keyPhrases: ["The Tao of Heaven is eternal,"],
      draw: (b) => {
        b.star(50, 50, 3);
        b.line(...b.arc(50, 50, 14, 200, 320, 4, 1.6));
        b.line(...b.arc(50, 50, 26, 20, 150, 5, 1.6));
        b.line(...b.arc(50, 50, 38, 170, 300, 6, 1.8));
        b.line(...b.arc(50, 50, 46, -20, 110, 6, 2));
        b.line(...b.arc(50, 50, 32, 240, 330, 4, 1.4));
      },
    },
    {
      name: "The Candle",
      theme: "They do not live for themselves: light given by burning",
      keyPhrases: ["They do not live for themselves;"],
      draw: (b) => {
        b.loop([[50, 10, 2.6], [56, 22, 1.6], [50, 32, 1.8], [44, 22, 1.6]]);
        const [tl, tr] = b.pts([[38, 40, 1.8], [62, 40, 1.8]]);
        b.line(tl, b.star(46, 42, 1.4), b.star(50, 38, 1.2), tr);
        b.line(tr, b.star(62, 54, 1.4), b.star(64, 60, 1.2));
        const [bl, br] = b.pts([[38, 84, 1.8], [62, 84, 1.8]]);
        b.line(tl, bl);
        b.line(tr, br);
        b.path([[22, 84, 1.6], [38, 84], [62, 84], [78, 84, 1.6]]);
        b.path([[26, 90, 1.2], [74, 90, 1.2]]);
      },
    },
    {
      name: "The Moon Bridge",
      theme: "Present for all beings: a bridge whose arch and reflection make a full circle",
      keyPhrases: ["thus they are present for all beings."],
      draw: (b) => {
        const deck = b.arc(50, 64, 44, 196, 344, 8, 1.8);
        b.line(...deck);
        const arch = b.arc(50, 64, 28, 180, 360, 7, 1.8);
        b.line(...arch);
        b.line(deck[0], arch[0]);
        b.line(deck[7], arch[6]);
        b.path([[2, 64, 1.2], [22, 64], [78, 64], [98, 64, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.pts(b.arcPoints(50, 64, 28, 28, 20, 160, 5), 1);
      },
    },
    {
      name: "The Old Pine",
      theme: "The earth is long enduring: a pine clinging to its cliff",
      keyPhrases: ["and the earth is long enduring."],
      draw: (b) => {
        const trunk = b.path([[40, 92, 2], [44, 74], [38, 58], [46, 44], [58, 34, 1.8]]);
        b.path([[38, 58], [22, 52], [8, 54, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[2, 50, 1.2], [8, 46, 1.4], [18, 44, 1.6], [28, 48, 1.4]]);
        b.path([[42, 30, 1.4], [56, 24, 1.8], [72, 26, 1.6], [84, 32, 1.4]]);
        b.path([[58, 34], [76, 42, 1.4], [92, 42, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[70, 40, 1.2], [80, 36, 1.4], [94, 38, 1.2]]);
        b.path([[20, 96, 1.4], [30, 90, 1.4], [40, 92], [56, 94, 1.2], [70, 98, 1]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        void trunk;
      },
    },
    {
      name: "Mountain under the Stars",
      theme: "Heaven eternal, earth enduring: a peak beneath the night sky",
      keyPhrases: ["The Tao of Heaven is eternal,"],
      draw: (b) => {
        b.path([[2, 90, 1.4], [24, 60, 1.8], [34, 66], [54, 32, 2.6], [66, 48], [74, 42, 2], [98, 90, 1.4]]);
        b.path([[46, 46, 1.2], [54, 42, 1.2], [60, 46, 1.2]]);
        b.path([[14, 16, 2.2], [26, 12, 1.6], [38, 18, 1.8], [44, 10, 1.6]]);
        b.pts([[72, 12, 2.4], [86, 22, 1.4], [62, 22, 1]]);
      },
    },
  ],
  8: [
    {
      name: "The Waterfall",
      theme: "It gathers in unpopular places: water falling to the pool below",
      keyPhrases: ["It gathers in unpopular places."],
      draw: (b) => {
        b.path([[4, 20, 1.4], [30, 20, 1.8], [36, 26, 2]]);
        b.path([[96, 20, 1.4], [70, 20, 1.8], [64, 26, 2]]);
        b.path([[36, 26], [34, 50], [30, 70, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[64, 26], [66, 50], [70, 70, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[44, 30, 1.2], [44, 60, 1.4]]);
        b.path([[52, 30, 1.2], [53, 62, 1.4]]);
        b.path([[58, 34, 1.2], [58, 56, 1.4]]);
        const pool = b.ring(50, 82, 34, 8, 1.6, 0, 9);
        b.close(pool);
        b.nebula(b.arcPoints(50, 82, 34, 9, 0, 360, 12));
      },
      nebulaShare: 0.3,
    },
    {
      name: "The Water Drop",
      theme: "The supreme good is like water",
      keyPhrases: ["The supreme good is like water,"],
      draw: (b) => {
        b.loop([[50, 6, 2.6], [58, 22], [68, 38], [74, 54], [70, 70], [60, 80], [50, 83, 2], [40, 80], [30, 70], [26, 54], [32, 38], [42, 22]]);
        b.path([[38, 50, 1.4], [36, 60, 1.6], [40, 68, 1.2]]);
        b.path([[14, 94, 1.2], [50, 96, 1.4], [86, 94, 1.2]]);
      },
    },
    {
      name: "The Winding River",
      theme: "Without trying to compete: a river finding the low way through the hills",
      keyPhrases: ["without trying to compete with it."],
      draw: (b) => {
        b.path([[2, 38, 1.4], [18, 20, 2], [32, 34], [46, 18, 2.2], [62, 30], [78, 14, 2], [98, 32, 1.4]]);
        b.path([[48, 34, 1.6], [62, 42], [60, 54], [40, 60], [34, 72], [52, 82], [74, 90, 1.8]]);
        b.path([[54, 34, 1.4], [70, 42], [68, 56], [48, 62], [44, 72], [60, 80], [82, 86, 1.8]]);
      },
    },
    {
      name: "The House by the Lake",
      theme: "The location makes the dwelling good",
      keyPhrases: ["The location makes the dwelling good."],
      draw: (b) => {
        const roof = b.path([[18, 36, 1.8], [36, 20, 2.4], [54, 36, 1.8]]);
        b.line(b.star(22, 36, 1.2), b.star(22, 58, 1.6), b.star(50, 58, 1.6), b.star(50, 36, 1.2));
        b.loop([[32, 58, 1.2], [32, 46, 1.2], [40, 46, 1.2], [40, 58, 1.2]]);
        b.path([[4, 58, 1.2], [96, 58, 1.2]]);
        b.path([[58, 70, 1.4], [72, 66, 1.6], [86, 70, 1.4]]);
        b.path([[10, 80, 1.2], [30, 76, 1.4], [50, 80, 1.2], [70, 76, 1.4], [90, 80, 1.2]]);
        b.star(78, 18, 2.6);
        void roof;
      },
    },
    {
      name: "The Pouring Jar",
      theme: "Which benefits all of creation: water poured on a sprout",
      keyPhrases: ["which benefits all of creation"],
      draw: (b) => {
        const jar = b.loop([[20, 10, 1.8], [44, 22, 1.8], [50, 36, 1.6], [40, 50, 1.6], [22, 46, 1.6], [12, 30, 1.6]]);
        b.line(jar[1], b.star(58, 22, 2));
        b.path([[60, 30, 1.2], [62, 42, 1.4], [64, 54, 1.4], [66, 64, 1.6]]);
        b.path([[66, 90, 1.6], [66, 76, 1.4], [56, 70, 1.6]]);
        b.path([[66, 76], [78, 68, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[40, 90, 1.2], [66, 90], [92, 90, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
      },
    },
  ],
  9: [
    {
      name: "The Empty Teacup",
      theme: "Easier to carry an empty cup",
      keyPhrases: ["It is easier to carry an empty cup"],
      draw: (b) => {
        b.close(b.ring(50, 40, 30, 12, 1.8, 0, 8));
        const [l, r] = [b.star(20, 42, 1), b.star(80, 42, 1)];
        b.line(l, ...b.pts([[26, 62], [38, 74], [50, 77, 1.8], [62, 74], [74, 62]]), r);
        b.path([[8, 80, 1.6], [26, 86], [74, 86], [92, 80, 1.6]]);
      },
    },
    {
      name: "The Knife",
      theme: "The sharper the knife, the easier it is to dull",
      keyPhrases: ["The sharper the knife"],
      draw: (b) => {
        b.loop([[92, 8, 2.8], [80, 30, 1.6], [64, 50, 1.6], [52, 60, 1.8], [46, 54, 1.8], [62, 34, 1.6], [78, 18, 1.6]]);
        b.path([[40, 50, 1.6], [58, 66, 1.6]]);
        const grip = b.loop([[46, 58, 1.2], [20, 86, 1.6], [14, 80, 1.6], [40, 52, 1.2]]);
        void grip;
        b.star(10, 90, 2);
      },
    },
    {
      name: "The Money Pouch",
      theme: "The more wealth you possess, the harder it is to protect",
      keyPhrases: ["the harder it is to protect."],
      draw: (b) => {
        const neck = b.path([[42, 32, 1.8], [58, 32, 1.8]]);
        b.path([[34, 18, 1.6], [42, 32]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.path([[66, 18, 1.6], [58, 32]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.line(neck[0], ...b.pts([[30, 46], [20, 64], [22, 80], [36, 90], [50, 92, 2], [64, 90], [78, 80], [80, 64], [70, 46]]), neck[1]);
        b.close(b.ring(50, 66, 8, 6, 1.4));
        b.star(50, 66, 2.4);
      },
    },
    {
      name: "The Traveler",
      theme: "When you have accomplished your goal, simply walk away",
      keyPhrases: ["simply walk away."],
      draw: (b) => {
        b.close(b.ring(46, 16, 5, 5, 1.8));
        const neck = b.star(46, 25, 1.8);
        const hips = b.star(44, 54, 2);
        b.line(neck, hips);
        b.line(hips, b.star(54, 72, 1.6), b.star(58, 90, 2));
        b.line(hips, b.star(38, 72, 1.6), b.star(30, 88, 2));
        b.line(neck, b.star(56, 38, 1.4), b.star(64, 42, 1.4));
        b.path([[66, 12, 1.4], [64, 42], [62, 92, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.line(neck, b.star(34, 30, 1.2), b.star(24, 25, 1.6));
        b.close(b.ring(18, 18, 5, 5, 1.4));
        b.path([[4, 94, 1], [96, 94, 1]]);
      },
    },
    {
      name: "The Stairway to Heaven",
      theme: "This is the pathway to Heaven",
      keyPhrases: ["This is the pathway to Heaven."],
      draw: (b) => {
        b.path([[8, 94, 1.6], [8, 80], [24, 80], [24, 66], [40, 66], [40, 52], [56, 52], [56, 38], [72, 38], [72, 24, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[8, 94], [72, 94, 1.4], [72, 24]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.star(86, 10, 3);
        b.pts([[64, 8, 1.2], [94, 30, 1.2]]);
      },
    },
  ],
  10: [
    {
      name: "The Lotus",
      theme: "Nurture the darkness of your soul until you become whole",
      keyPhrases: ["Nurture the darkness of your soul"],
      draw: (b) => {
        const base = b.star(50, 74, 2);
        b.line(base, ...b.pts([[40, 50], [50, 22, 2.6], [60, 50]]), base);
        b.line(base, ...b.pts([[28, 58], [26, 36, 2]]), b.star(40, 50, 1.4));
        b.line(base, ...b.pts([[72, 58], [74, 36, 2]]), b.star(60, 50, 1.4));
        b.line(base, ...b.pts([[18, 72, 1.8], [12, 58, 1.8]]));
        b.line(base, ...b.pts([[82, 72, 1.8], [88, 58, 1.8]]));
        b.path([[8, 86, 1.2], [30, 82, 1.4], [50, 86], [70, 82, 1.4], [92, 86, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
      },
    },
    {
      name: "The Meditator",
      theme: "Can you focus your life-breath: a figure sitting still",
      keyPhrases: ["Can you focus your life-breath until you become"],
      draw: (b) => {
        b.close(b.ring(50, 18, 7, 6, 1.8));
        const neck = b.star(50, 28, 1.8);
        b.line(neck, ...b.pts([[36, 36, 1.4], [30, 52, 1.4], [42, 66, 1.4]]), b.star(50, 64, 2.2));
        b.line(neck, ...b.pts([[64, 36, 1.4], [70, 52, 1.4], [58, 66, 1.4]]), b.star(50, 64));
        b.path([[14, 80, 1.8], [30, 70], [50, 74, 1.6], [70, 70], [86, 80, 1.8]]);
        b.path([[14, 80], [50, 86, 1.4], [86, 80]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.pts([[50, 4, 1.2], [36, 8, 1], [64, 8, 1]]);
      },
    },
    {
      name: "The Sprout",
      theme: "To grow, yet not to control",
      keyPhrases: ["To grow, yet not to control:"],
      draw: (b) => {
        const stem = b.path([[50, 80, 1.8], [50, 64], [52, 48, 1.6], [50, 34, 2.4]]);
        b.loop([[52, 48], [66, 36, 1.6], [84, 34, 2], [74, 48, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.loop([[50, 58, 1.4], [34, 46, 1.6], [16, 46, 2], [28, 60, 1.6]]);
        b.path([[6, 80, 1.2], [26, 78, 1.4], [50, 80], [74, 78, 1.4], [94, 80, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[50, 80], [42, 90, 1.2], [36, 96, 1]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[50, 80], [58, 92, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        void stem;
      },
    },
    {
      name: "The Kite",
      theme: "Lead them without forcing your will: a kite on a slack string",
      keyPhrases: ["without forcing your will on them?"],
      draw: (b) => {
        const kite = b.loop([[70, 6, 2.2], [88, 24, 1.8], [70, 46, 2], [52, 24, 1.8]]);
        b.line(kite[0], kite[2]);
        b.line(kite[1], kite[3]);
        b.path([[70, 46], [64, 54, 1.2], [70, 60, 1.4], [62, 66, 1.2], [68, 72, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[70, 46], [52, 58, 1], [34, 72, 1], [20, 86, 1.2]].map(([x, y, m]) => [x, y, m ?? 1] as [number, number, number]));
        b.close(b.ring(14, 70, 4, 5, 1.6));
        b.path([[16, 76, 1.2], [18, 90, 1.6]]);
      },
    },
    {
      name: "The Moon in the Pond",
      theme: "While you cleanse your inner vision: the moon on still water",
      keyPhrases: ["While you cleanse your inner vision"],
      draw: (b) => {
        b.close(b.ring(50, 24, 12, 9, 2));
        b.path([[4, 56, 1.2], [96, 56, 1.2]]);
        b.close(b.ring(50, 76, 12, 9, 1.2, -90, 5));
        b.path([[30, 68, 1], [38, 68, 1.2]]);
        b.path([[62, 84, 1.2], [70, 84, 1]]);
        b.path([[10, 92, 1], [30, 94, 1.2], [70, 94, 1.2], [90, 92, 1]]);
      },
    },
  ],
};

export default c;
