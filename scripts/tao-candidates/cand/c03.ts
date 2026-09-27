import type { Candidate } from "../types.ts";

const c: Record<number, Candidate[]> = {
  21: [
    {
      name: "The Butterfly",
      theme: "Intangible and evasive, yet it has a manifestation",
      keyPhrases: ["Intangible and evasive, yet it has a manifestation."],
      draw: (b) => {
        const body = b.path([[50, 24, 2], [50, 40, 1.6], [50, 56, 1.6], [50, 72, 1.8]]);
        b.line(body[0], b.star(42, 10, 1.6));
        b.line(body[0], b.star(58, 10, 1.6));
        b.line(body[1], ...b.pts([[36, 18], [16, 14, 2], [8, 28], [16, 44], [36, 48]]), body[2]);
        b.line(body[1], ...b.pts([[64, 18], [84, 14, 2], [92, 28], [84, 44], [64, 48]]), body[2]);
        b.line(body[2], ...b.pts([[32, 58], [22, 72, 1.8], [30, 84], [44, 78]]), body[3]);
        b.line(body[2], ...b.pts([[68, 58], [78, 72, 1.8], [70, 84], [56, 78]]), body[3]);
      },
    },
    {
      name: "The Chrysalis",
      theme: "Secluded and dark, yet there is a vitality within it",
      keyPhrases: ["Secluded and dark, yet there is a vitality within it."],
      draw: (b) => {
        b.path([[6, 14, 1.4], [30, 18, 1.6], [56, 16, 1.6], [80, 22, 1.4], [96, 20, 1.2]]);
        b.path([[80, 22], [90, 32, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.line(b.star(50, 17, 1.2), b.star(50, 26, 1.4));
        b.loop([[50, 26, 1.4], [58, 34], [62, 50, 1.6], [60, 66], [54, 80], [50, 88, 2], [46, 80], [40, 66], [38, 50, 1.6], [42, 34]]);
        b.path([[40, 46, 1], [60, 44, 1]]);
        b.path([[40, 60, 1], [60, 58, 1]]);
        b.star(50, 54, 2.8);
      },
    },
    {
      name: "The Acorn",
      theme: "Secluded and dark, yet there is a vitality within it",
      keyPhrases: ["Its vitality is very genuine."],
      draw: (b) => {
        const cap = b.loop([[20, 40, 2], [26, 26], [40, 18], [50, 16, 1.8], [60, 18], [74, 26], [80, 40, 2]]);
        b.line(cap[3], b.star(52, 6, 1.8));
        const nut = b.pts([[24, 44], [26, 60], [34, 76], [50, 90, 2.4], [66, 76], [74, 60], [76, 44]]);
        b.line(cap[0], ...nut, cap[6]);
        b.path([[30, 34, 1], [50, 30, 1.2], [70, 34, 1]]);
      },
    },
    {
      name: "The Honeycomb",
      theme: "Within it we can find order",
      keyPhrases: ["Within it we can find order."],
      draw: (b) => {
        const r = 13;
        const w = r * Math.sqrt(3);
        for (const [cx, cy] of [[50, 50], [50 - w, 50], [50 + w, 50], [50 - w / 2, 50 - r * 1.5], [50 + w / 2, 50 - r * 1.5], [50 - w / 2, 50 + r * 1.5], [50 + w / 2, 50 + r * 1.5]]) {
          b.close(b.ring(cx, cy, r, 6, cx === 50 && cy === 50 ? 2 : 1.4, -90));
        }
      },
    },
    {
      name: "The Nautilus",
      theme: "Within it we can find order: the chambered spiral",
      keyPhrases: ["Within it we can find order."],
      draw: (b) => {
        const spiral: [number, number, number][] = [];
        for (let i = 0; i < 17; i++) {
          const a = (i * 45 * Math.PI) / 180;
          const r = 3 * Math.pow(1.17, i);
          spiral.push([48 + r * Math.cos(a), 50 + r * Math.sin(a), i === 0 ? 2.6 : 1.2 + i * 0.05]);
        }
        const ids = b.pts(spiral);
        b.line(...ids);
        for (let i = 8; i < 17; i++) b.line(ids[i], ids[i - 8]);
      },
    },
  ],
  22: [
    {
      name: "The Mended Bowl",
      theme: "If you want to become whole, first let yourself become broken",
      keyPhrases: ["If you want to become whole,"],
      draw: (b) => {
        const rim = b.path([[10, 34, 2], [30, 34, 1.4], [48, 34, 1.4], [70, 34, 1.4], [90, 34, 2]]);
        b.line(rim[0], ...b.pts([[14, 54], [26, 70], [40, 78], [60, 78], [74, 70], [86, 54]]), rim[4]);
        b.path([[36, 88, 1.6], [64, 88, 1.6]]);
        b.path([[30, 34], [36, 46, 2], [30, 58, 2], [40, 78]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[70, 34], [62, 48, 2], [68, 60, 2], [60, 78]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
      },
    },
    {
      name: "The Stump and the Shoot",
      theme: "If you want to become new, first let yourself become old",
      keyPhrases: ["If you want to become new,"],
      draw: (b) => {
        b.close(b.ring(46, 50, 26, 10, 1.8, 0, 8));
        b.close(b.ring(46, 50, 12, 6, 1.2, 0, 3.5));
        const [l, r] = [b.star(20, 50, 1), b.star(72, 50, 1)];
        b.line(l, b.star(18, 84, 1.8), b.star(8, 92, 1.4));
        b.line(r, b.star(74, 84, 1.8), b.star(86, 92, 1.4));
        b.path([[18, 84], [46, 88, 1.4], [74, 84]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.path([[66, 48, 1.4], [70, 34, 1.6], [76, 20, 2.4]]);
        b.loop([[70, 34], [82, 28, 1.6], [86, 16, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
      },
    },
    {
      name: "The Lighthouse",
      theme: "She becomes a shining example",
      keyPhrases: ["she becomes a shining example."],
      draw: (b) => {
        const lamp = b.loop([[44, 16, 1.6], [56, 16, 1.6], [56, 26, 1.6], [44, 26, 1.6]]);
        b.line(b.star(42, 16, 1), b.star(50, 8, 1.8), b.star(58, 16, 1));
        const base = b.path([[36, 90, 1.8], [64, 90, 1.8]]);
        b.line(lamp[3], ...b.pts([[42, 48, 1.2], [36, 90]]));
        b.line(lamp[2], ...b.pts([[58, 48, 1.2], [64, 90]]));
        void base;
        b.star(50, 21, 3);
        b.path([[40, 18, 1], [16, 10, 1.4]]);
        b.path([[40, 24, 1], [16, 32, 1.4]]);
        b.path([[60, 18, 1], [84, 10, 1.4]]);
        b.path([[60, 24, 1], [84, 32, 1.4]]);
        b.path([[4, 94, 1.2], [20, 90, 1.4], [36, 90]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.path([[64, 90], [80, 92, 1.4], [96, 88, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
      },
    },
    {
      name: "The Switchback Path",
      theme: "If you want to become straight, first let yourself become twisted",
      keyPhrases: ["If you want to become straight,"],
      draw: (b) => {
        b.path([[2, 92, 1.4], [50, 8, 2.6], [98, 92, 1.4]]);
        b.path([[30, 90, 1.4], [62, 80], [34, 66], [58, 54], [40, 42], [54, 30], [48, 20, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
      },
    },
    {
      name: "The Lantern",
      theme: "Because she isn't self centered, people can see the light in her",
      keyPhrases: ["people can see the light in her."],
      draw: (b) => {
        b.path([[50, 2, 1.2], [50, 14, 1.6]]);
        const top = b.path([[38, 20, 1.6], [62, 20, 1.6]]);
        b.line(b.star(50, 14), top[0]);
        b.line(b.star(50, 14), top[1]);
        const l = b.pts([[28, 34], [22, 52, 1.6], [28, 70]]);
        const r = b.pts([[72, 34], [78, 52, 1.6], [72, 70]]);
        const bot = b.path([[38, 82, 1.6], [62, 82, 1.6]]);
        b.line(top[0], ...l, bot[0]);
        b.line(top[1], ...r, bot[1]);
        b.path([[22, 52], [78, 52]].map(([x, y]) => [x, y, 1.6] as [number, number, number]));
        b.star(50, 52, 3);
        b.path([[46, 82, 1], [44, 94, 1.4]]);
        b.path([[54, 82, 1], [56, 94, 1.4]]);
      },
    },
  ],
  23: [
    {
      name: "The Umbrella in the Rain",
      theme: "When it rains hard, it lasts but a little while",
      keyPhrases: ["when it rains hard, it lasts but a little while;"],
      draw: (b) => {
        const canopy = b.arc(50, 50, 38, 180, 360, 9, 1.8);
        b.line(...canopy);
        b.line(canopy[0], ...b.pts([[21, 48, 1.2], [31, 50], [40, 48, 1.2], [50, 50], [60, 48, 1.2], [69, 50], [79, 48, 1.2]]), canopy[8]);
        b.path([[50, 12], [50, 50], [50, 80, 1.4], [44, 86, 1.6], [38, 82, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        for (const [x, y] of [[8, 60], [18, 74], [88, 62], [80, 78], [26, 88], [72, 92]]) b.path([[x + 2, y - 5, 1], [x, y, 1.4]]);
      },
    },
    {
      name: "The Tree in the Gale",
      theme: "When the gale blows, it will not last long",
      keyPhrases: ["when the gale blows, it will not last long;"],
      draw: (b) => {
        const trunk = b.path([[30, 94, 2], [34, 74], [44, 56], [58, 42, 1.6]]);
        b.loop([[44, 56], [30, 44, 1.6], [34, 28, 1.8], [52, 20, 2], [72, 22, 1.8], [90, 30, 2], [82, 42, 1.6], [66, 46, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[14, 94, 1.2], [30, 94], [50, 94, 1.2]].map(([x, y, m]) => [x, y, m ?? 2] as [number, number, number]));
        b.path([[2, 50, 1], [16, 48, 1.4]]);
        b.path([[4, 64, 1], [22, 62, 1.4]]);
        b.path([[62, 64, 1], [82, 62, 1.4], [94, 68, 1]]);
        void trunk;
      },
    },
    {
      name: "The Lightning Bolt",
      theme: "Nature does much in a little time",
      keyPhrases: ["when nature does much in a little time?"],
      draw: (b) => {
        b.loop([[58, 4, 2.2], [30, 50, 1.8], [48, 50, 1.6], [36, 96, 2.8], [74, 38, 1.8], [54, 38, 1.6], [70, 4, 1.8]]);
        b.pts([[16, 20, 1], [84, 64, 1.2], [88, 16, 1]]);
      },
    },
    {
      name: "The Whirlwind",
      theme: "When the gale blows, it will not last long",
      keyPhrases: ["when the gale blows, it will not last long;"],
      draw: (b) => {
        b.close(b.ring(50, 12, 40, 10, 1.8, 0, 7));
        b.close(b.ring(52, 34, 26, 8, 1.6, 0, 5));
        b.close(b.ring(54, 54, 14, 6, 1.4, 0, 3.5));
        b.path([[54, 58, 1.2], [50, 70, 1.2], [46, 80, 1.4], [48, 90, 1.8]]);
        b.pts([[26, 92, 1], [70, 88, 1.2], [80, 94, 1]]);
      },
    },
    {
      name: "The Open Arms",
      theme: "If you open yourself to the Tao, the Tao will eagerly welcome you",
      keyPhrases: ["the Tao will eagerly welcome you."],
      draw: (b) => {
        b.close(b.ring(50, 22, 7, 6, 1.8));
        const neck = b.star(50, 33, 2);
        const hips = b.star(50, 60, 2);
        b.line(neck, hips);
        b.line(neck, ...b.pts([[34, 28, 1.4], [18, 16, 1.8]]));
        b.line(neck, ...b.pts([[66, 28, 1.4], [82, 16, 1.8]]));
        b.line(hips, ...b.pts([[42, 76, 1.4], [38, 92, 1.8]]));
        b.line(hips, ...b.pts([[58, 76, 1.4], [62, 92, 1.8]]));
        b.star(50, 6, 2.4);
      },
    },
  ],
  24: [
    {
      name: "The Peacock",
      theme: "Those who boast of their accomplishments",
      keyPhrases: ["Those who boast of their accomplishments"],
      draw: (b) => {
        const body = b.loop([[50, 56, 1.8], [56, 66], [52, 80, 1.6], [46, 80, 1.6], [44, 66]]);
        b.line(body[0], ...b.pts([[50, 46, 1.4], [52, 38, 1.8], [56, 40, 1.4]]));
        b.path([[52, 38], [50, 32, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        const fan = b.arc(50, 70, 40, 190, 350, 9, 2.2);
        b.line(...fan);
        for (const id of fan) b.line(body[0], id);
        b.path([[46, 80], [42, 92, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[52, 80], [56, 92, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
      },
    },
    {
      name: "The Running Hare",
      theme: "Those who rush ahead don't get very far",
      keyPhrases: ["Those who rush ahead"],
      draw: (b) => {
        const body = b.loop([[70, 40, 1.6], [56, 36], [36, 40], [22, 52, 1.6], [34, 60], [54, 58], [66, 50]]);
        const head = b.loop([[70, 40], [80, 32, 1.6], [90, 36, 2], [82, 46, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.line(head[1], b.star(72, 14, 1.8), b.star(76, 30, 1));
        b.line(head[1], b.star(82, 12, 1.8));
        b.line(body[5], b.star(64, 68, 1.4), b.star(82, 72, 1.8));
        b.line(body[4], b.star(18, 70, 1.4), b.star(4, 70, 1.8));
        b.star(18, 48, 2);
        b.path([[6, 90, 1], [94, 90, 1]]);
      },
    },
    {
      name: "The Firework",
      theme: "Those who try to outshine others dim their own light",
      keyPhrases: ["Those who try to outshine others"],
      draw: (b) => {
        const c = b.star(50, 36, 2.8);
        for (let i = 0; i < 10; i++) {
          const a = ((-90 + i * 36) * Math.PI) / 180;
          const mid = b.star(50 + 14 * Math.cos(a), 36 + 14 * Math.sin(a), 1.2);
          b.line(c, mid, b.star(50 + 28 * Math.cos(a), 36 + 28 * Math.sin(a), 1.8));
        }
        b.path([[50, 66, 1], [52, 80, 1.2], [50, 94, 1.4]]);
      },
    },
    {
      name: "The Leaning Tower",
      theme: "Those who stand on tiptoes do not stand firmly",
      keyPhrases: ["do not stand firmly."],
      draw: (b) => {
        const l = b.pts([[34, 92, 1.8], [40, 70], [46, 48], [52, 26], [56, 10, 2]]);
        const r = b.pts([[54, 92, 1.8], [60, 70], [66, 48], [72, 26], [76, 10, 2]]);
        b.line(...l);
        b.line(...r);
        for (let i = 0; i < 5; i++) b.line(l[i], r[i]);
        b.path([[10, 92, 1.2], [90, 92, 1.2]]);
      },
    },
    {
      name: "The Spinning Top",
      theme: "Standing on one point, it cannot stand firmly",
      keyPhrases: ["Those who stand on tiptoes"],
      draw: (b) => {
        b.path([[50, 6, 1.6], [50, 22, 1.6]]);
        const rim = b.path([[18, 40, 2], [34, 30], [50, 26, 1.6], [66, 30], [82, 40, 2]]);
        b.line(rim[0], ...b.pts([[30, 52], [50, 56, 1.6], [70, 52]]), rim[4]);
        b.line(rim[0], b.star(50, 88, 2.6), rim[4]);
        b.line(...b.arc(50, 76, 20, 110, 150, 3, 1));
        b.line(...b.arc(50, 76, 20, 30, 70, 3, 1));
      },
    },
  ],
  25: [
    {
      name: "The First Light",
      theme: "Before the universe was born, there was something in the chaos",
      keyPhrases: ["Before the universe was born"],
      draw: (b) => {
        const c = b.star(50, 50, 3);
        for (let i = 0; i < 12; i++) {
          const a = ((-90 + i * 30) * Math.PI) / 180;
          const long = i % 2 === 0;
          const r1 = long ? 16 : 12;
          const r2 = long ? 44 : 28;
          b.line(c, b.star(50 + r1 * Math.cos(a), 50 + r1 * Math.sin(a), 1), b.star(50 + r2 * Math.cos(a), 50 + r2 * Math.sin(a), long ? 2 : 1.4));
        }
      },
    },
    {
      name: "The Lone Tree",
      theme: "It stands alone and empty, solitary and unchanging",
      keyPhrases: ["It stands alone and empty,"],
      draw: (b) => {
        b.path([[2, 84, 1.2], [24, 74, 1.4], [50, 68, 1.6], [76, 74, 1.4], [98, 84, 1.2]]);
        const t = b.path([[50, 68], [50, 50, 1.4], [50, 38, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.line(t[1], b.star(38, 40, 1.2));
        b.line(t[1], b.star(62, 42, 1.2));
        b.loop([[50, 12, 2.2], [66, 16], [76, 28], [72, 40], [58, 44], [42, 44], [28, 40], [24, 28], [34, 16]]);
        b.star(84, 10, 1.6);
      },
    },
    {
      name: "The Mother Nebula",
      theme: "It may be regarded as the Mother of the universe",
      keyPhrases: ["It may be regarded as the Mother of the universe."],
      draw: (b) => {
        b.loop([[20, 40, 1.4], [30, 22, 1.6], [52, 14, 1.8], [72, 20, 1.6], [86, 38, 1.8], [82, 60, 1.6], [66, 76, 1.8], [44, 84, 1.6], [24, 72, 1.6], [14, 56, 1.4]]);
        b.loop([[44, 44, 2.6], [56, 40, 2.2], [60, 52, 2.4], [48, 58, 2]]);
        b.pts([[36, 34, 1.2], [70, 32, 1.2], [34, 64, 1.2], [68, 64, 1.2], [52, 72, 1]]);
        b.nebula([[20, 40], [30, 22], [52, 14], [72, 20], [86, 38], [82, 60], [66, 76], [44, 84], [24, 72], [14, 56]]);
      },
      nebulaShare: 0.35,
    },
    {
      name: "Under the Milky Way",
      theme: "Tao, Heaven, Earth, Humanity: one small figure under the great sky",
      keyPhrases: ["Within the universe, these are the four great things."],
      draw: (b) => {
        b.path([[2, 60, 1.6], [20, 44, 1.8], [40, 34, 2], [60, 22, 2.2], [80, 14, 2], [98, 8, 1.6]]);
        b.path([[6, 70, 1], [26, 54, 1.2], [46, 44, 1.2], [66, 32, 1.2], [90, 22, 1]]);
        b.nebula([[2, 60], [20, 44], [40, 34], [60, 22], [80, 14], [98, 8], [98, 20], [66, 34], [26, 56], [4, 72]]);
        b.path([[2, 88, 1.2], [50, 86, 1.2], [98, 88, 1.2]]);
        b.close(b.ring(62, 70, 3, 4, 1.4));
        b.line(b.star(62, 73, 1.4), b.star(62, 82, 1.4), b.star(59, 87, 1.4));
        b.line(b.star(62, 82), b.star(65, 87, 1.4));
      },
      nebulaShare: 0.3,
    },
    {
      name: "The Compass Rose",
      theme: "Great means it is everywhere: four points for the four great things",
      keyPhrases: ["Because it is Great means it is everywhere."],
      draw: (b) => {
        const c = b.star(50, 50, 2.4);
        const tips = b.ring(50, 50, 44, 4, 2.4, -90);
        const waist = b.ring(50, 50, 9, 4, 1.2, -45);
        for (let i = 0; i < 4; i++) b.line(waist[(i + 3) % 4], tips[i], waist[i]);
        const minor = b.ring(50, 50, 24, 4, 1.4, -45);
        minor.forEach((id) => b.line(c, id));
        b.close(b.ring(50, 50, 32, 12, 1));
      },
    },
  ],
  26: [
    {
      name: "The Anchor",
      theme: "Heaviness is the basis of lightness",
      keyPhrases: ["Heaviness is the basis of lightness."],
      draw: (b) => {
        b.close(b.ring(50, 12, 6, 6, 1.6));
        const shank = b.path([[50, 18, 1.4], [50, 40], [50, 62], [50, 86, 2.2]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[34, 30, 1.8], [50, 30, 1.2], [66, 30, 1.8]]);
        b.line(shank[3], ...b.pts([[34, 82], [22, 72], [16, 62, 2]]));
        b.line(shank[3], ...b.pts([[66, 82], [78, 72], [84, 62, 2]]));
        b.path([[10, 66, 1.4], [16, 62]].map(([x, y, m]) => [x, y, m ?? 2] as [number, number, number]));
        b.path([[90, 66, 1.4], [84, 62]].map(([x, y, m]) => [x, y, m ?? 2] as [number, number, number]));
      },
    },
    {
      name: "The Mountain and the Cloud",
      theme: "Heaviness is the basis of lightness; stillness is the standard of activity",
      keyPhrases: ["Stillness is the standard of activity."],
      draw: (b) => {
        b.path([[2, 92, 1.6], [26, 52, 2], [38, 60], [58, 26, 2.6], [76, 54], [86, 48, 1.8], [98, 64, 1.4]]);
        b.path([[50, 38, 1.2], [58, 34, 1.2], [66, 40, 1.2]]);
        b.loop([[10, 24, 1.4], [14, 16, 1.6], [24, 14, 1.8], [30, 8, 1.8], [42, 10, 1.6], [46, 18, 1.4], [36, 24, 1.2]]);
      },
    },
    {
      name: "The Pagoda",
      theme: "Heaviness is the basis of lightness: broad below, light above",
      keyPhrases: ["Heaviness is the basis of lightness."],
      draw: (b) => {
        b.path([[50, 2, 1.8], [50, 14, 1.4]]);
        for (const [y, w] of [[18, 12], [40, 20], [64, 30]]) {
          b.path([[50 - w - 6, y + 4, 1.8], [50 - w, y + 8, 1.4], [50, y, 1.4], [50 + w, y + 8, 1.4], [50 + w + 6, y + 4, 1.8]]);
        }
        b.path([[36, 26, 1.2], [36, 40, 1.2]]);
        b.path([[64, 26, 1.2], [64, 40, 1.2]]);
        b.path([[32, 48, 1.2], [32, 64, 1.2]]);
        b.path([[68, 48, 1.2], [68, 64, 1.2]]);
        b.path([[24, 72, 1.2], [24, 94, 1.6], [76, 94, 1.6], [76, 72, 1.2]]);
      },
    },
    {
      name: "The Chariot",
      theme: "The lord of a thousand chariots",
      keyPhrases: ["Why should the lord of a thousand chariots"],
      draw: (b) => {
        const rim = b.ring(40, 70, 20, 10, 1.8);
        b.close(rim);
        const hub = b.star(40, 70, 1.6);
        for (const i of [1, 3, 5, 7, 9]) b.line(hub, rim[i]);
        b.path([[12, 36, 1.8], [18, 46, 1.4], [62, 46, 1.4], [68, 36, 1.8]]);
        b.path([[62, 46], [96, 54, 2]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[16, 16, 1.6], [40, 8, 2], [64, 16, 1.6]]);
        b.path([[40, 8], [40, 46]].map(([x, y]) => [x, y, 1.2] as [number, number, number]));
      },
    },
    {
      name: "The Stone Lantern",
      theme: "Heaviness is the basis of lightness: a stone lantern holding its flame",
      keyPhrases: ["Heaviness is the basis of lightness."],
      draw: (b) => {
        b.path([[50, 4, 2], [50, 10, 1.2]]);
        b.path([[20, 28, 1.8], [34, 18, 1.4], [50, 10, 1.2], [66, 18, 1.4], [80, 28, 1.8]]);
        b.loop([[34, 30, 1.4], [66, 30, 1.4], [66, 48, 1.4], [34, 48, 1.4]]);
        b.star(50, 39, 3);
        b.path([[28, 52, 1.4], [72, 52, 1.4]]);
        b.path([[42, 52, 1.2], [44, 80, 1.4]]);
        b.path([[58, 52, 1.2], [56, 80, 1.4]]);
        b.loop([[26, 80, 1.8], [74, 80, 1.8], [80, 92, 1.8], [20, 92, 1.8]]);
      },
    },
  ],
  27: [
    {
      name: "The Crane in Flight",
      theme: "A good traveler leaves no tracks",
      keyPhrases: ["A good traveler leaves no tracks,"],
      draw: (b) => {
        const body = b.path([[14, 60, 1.6], [30, 54, 1.4], [46, 50, 2], [62, 50, 1.6], [76, 46, 1.4], [88, 40, 1.8]]);
        b.line(body[5], b.star(96, 42, 1.6));
        b.line(body[2], ...b.pts([[40, 32], [30, 16], [18, 6, 2]]));
        b.line(body[3], ...b.pts([[62, 32], [70, 14], [80, 4, 2]]));
        b.line(body[2], ...b.pts([[40, 66], [26, 80], [14, 88, 1.8]]));
        b.line(body[3], ...b.pts([[62, 68], [72, 82], [80, 92, 1.8]]));
        b.line(body[0], b.star(4, 66, 1.4));
        b.star(89, 38, 2.2);
      },
    },
    {
      name: "The Door Without a Lock",
      theme: "A well made door is easy to open and needs no locks",
      keyPhrases: ["and a well made door is easy to open and needs no locks."],
      draw: (b) => {
        const arch = b.arc(50, 34, 26, 180, 360, 7, 1.8);
        b.line(b.star(24, 92, 1.8), ...arch, b.star(76, 92, 1.8));
        b.path([[50, 8, 1.4], [50, 92, 1.4]]);
        b.pts([[44, 56, 2], [56, 56, 2]]);
        b.path([[6, 92, 1.2], [94, 92, 1.2]]);
      },
    },
    {
      name: "The Abacus",
      theme: "A good bookkeeper has an excellent memory",
      keyPhrases: ["A good bookkeeper has an excellent memory,"],
      draw: (b) => {
        b.loop([[10, 14, 2], [90, 14, 2], [90, 86, 2], [10, 86, 2]]);
        b.path([[10, 36, 1.2], [90, 36, 1.2]]);
        for (const [x, top, beads] of [[26, 24, [60, 70, 78]], [42, 30, [48, 70, 78]], [58, 24, [54, 62, 78]], [74, 30, [48, 56, 64]]] as const) {
          b.path([[x, 14], [x, 86]].map(([px, py]) => [px, py, 1] as [number, number, number]));
          b.star(x, top, 1.8);
          for (const y of beads) b.star(x, y, 1.6);
        }
      },
    },
    {
      name: "Teacher and Student",
      theme: "What is a good person but a bad person's teacher?",
      keyPhrases: ["What is a good person but a bad person's teacher?"],
      draw: (b) => {
        b.close(b.ring(34, 24, 6, 6, 1.8));
        const neck = b.star(34, 33, 1.8);
        const hips = b.star(34, 62, 2);
        b.line(neck, hips);
        b.line(hips, b.star(28, 92, 1.8));
        b.line(hips, b.star(40, 92, 1.8));
        b.line(neck, b.star(48, 24, 1.4), b.star(60, 12, 1.6));
        b.star(72, 6, 2.8);
        b.close(b.ring(64, 48, 5, 5, 1.6));
        const n2 = b.star(64, 56, 1.6);
        const h2 = b.star(64, 74, 1.8);
        b.line(n2, h2);
        b.line(h2, b.star(60, 92, 1.6));
        b.line(h2, b.star(68, 92, 1.6));
        b.line(neck, b.star(50, 50, 1.2), n2);
        b.path([[4, 94, 1], [96, 94, 1]]);
      },
    },
    {
      name: "The Oil Lamp",
      theme: "This is called embracing the light",
      keyPhrases: ["This is called embracing the light."],
      draw: (b) => {
        b.loop([[16, 56, 1.6], [28, 48], [50, 46, 1.4], [66, 50], [88, 42, 2], [76, 60], [56, 70], [34, 70]]);
        b.loop([[10, 50, 1.2], [4, 58, 1.4], [10, 66, 1.2], [16, 60, 1.2]]);
        b.path([[42, 70, 1.2], [38, 80, 1.6], [62, 80, 1.6], [58, 68, 1.2]]);
        b.loop([[88, 36, 1.8], [92, 26, 2], [88, 16, 2.8], [84, 26, 2]]);
        b.path([[44, 46, 1.2], [44, 40, 1.6], [52, 40, 1.6], [52, 46, 1.2]]);
      },
    },
  ],
  28: [
    {
      name: "The Go Board",
      theme: "Know the white, yet keep to the black",
      keyPhrases: ["Know the white,"],
      draw: (b) => {
        const g = (i: number) => 14 + i * 24;
        for (let i = 0; i < 4; i++) {
          b.path([[g(i), 14, 1.2], [g(i), 86, 1.2]]);
          b.path([[14, g(i), 1.2], [86, g(i), 1.2]]);
        }
        for (const [i, j] of [[1, 1], [2, 2], [1, 2]]) b.star(g(i), g(j), 3);
        for (const [i, j] of [[2, 1], [3, 2]]) b.close(b.ring(g(i), g(j), 5, 5, 1.4));
      },
    },
    {
      name: "The Ladle",
      theme: "The block of wood is carved into utensils",
      keyPhrases: ["The block of wood is carved into utensils"],
      draw: (b) => {
        b.close(b.ring(30, 68, 20, 10, 1.8, 0, 14));
        b.line(b.star(10, 68, 1), ...b.pts([[16, 80], [30, 86, 2], [44, 80]]), b.star(50, 68, 1));
        b.path([[46, 62, 1.6], [62, 48], [78, 32], [90, 16, 2.2]]);
        b.path([[48, 66, 1.2], [64, 52], [80, 36], [94, 20, 2]]);
        b.line(b.star(90, 16), b.star(94, 20));
      },
    },
    {
      name: "The Chisel and the Block",
      theme: "By carving void into the wood",
      keyPhrases: ["by carving void into the wood."],
      draw: (b) => {
        b.loop([[10, 56, 1.8], [60, 56, 1.8], [60, 90, 1.8], [10, 90, 1.8]]);
        b.loop([[10, 56], [26, 42, 1.6], [76, 42, 1.6], [60, 56]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.line(b.star(76, 42), b.star(76, 76, 1.6), b.star(60, 90));
        b.loop([[58, 36, 2.2], [64, 32, 1.4], [80, 14, 1.4], [74, 10, 1.4]]);
        b.loop([[76, 12, 1.2], [84, 4, 1.6], [90, 10, 1.6], [82, 18, 1.2]]);
      },
    },
    {
      name: "The Half Moon",
      theme: "Know the white, yet keep to the black",
      keyPhrases: ["yet keep to the black:"],
      draw: (b) => {
        const lit = b.arc(50, 50, 38, -90, 90, 8, 2.2);
        b.line(...lit);
        b.line(lit[0], ...b.pts([[50, 30, 1.4], [50, 50, 1.4], [50, 70, 1.4]]), lit[7]);
        b.pts(b.arcPoints(50, 50, 38, 38, 110, 250, 6), 0.8);
        b.nebula(b.arcPoints(50, 50, 38, 38, -90, 90, 10));
      },
      nebulaShare: 0.3,
    },
    {
      name: "The Watershed",
      theme: "Become a watershed to the world",
      keyPhrases: ["and become a watershed to the world."],
      draw: (b) => {
        const peak = b.star(50, 14, 2.6);
        b.line(b.star(4, 70, 1.4), b.star(28, 40, 1.6), peak, b.star(72, 40, 1.6), b.star(96, 70, 1.4));
        b.line(peak, ...b.pts([[44, 30, 1.2], [36, 46, 1.2], [26, 62, 1.4], [18, 80, 1.6]]));
        b.line(peak, ...b.pts([[56, 30, 1.2], [64, 46, 1.2], [74, 62, 1.4], [82, 80, 1.6]]));
        b.close(b.ring(18, 88, 10, 6, 1.4, 0, 5));
        b.close(b.ring(82, 88, 10, 6, 1.4, 0, 5));
      },
    },
  ],
  29: [
    {
      name: "The Ding Cauldron",
      theme: "The world is a sacred vessel: the three-legged bronze of the ancients",
      keyPhrases: ["The world is sacred vessel"],
      draw: (b) => {
        const rim = b.path([[16, 34, 2], [32, 34, 1.4], [68, 34, 1.4], [84, 34, 2]]);
        b.line(rim[0], ...b.pts([[18, 50], [26, 62], [40, 68], [60, 68], [74, 62], [82, 50]]), rim[3]);
        b.loop([[26, 34, 1.2], [26, 18, 1.6], [38, 18, 1.6], [38, 34, 1.2]]);
        b.loop([[62, 34, 1.2], [62, 18, 1.6], [74, 18, 1.6], [74, 34, 1.2]]);
        b.path([[28, 64, 1.2], [22, 92, 2]]);
        b.path([[50, 68, 1.2], [50, 94, 2]]);
        b.path([[72, 64, 1.2], [78, 92, 2]]);
      },
    },
    {
      name: "The Cupped Hands",
      theme: "It may slip through your fingers and disappear",
      keyPhrases: ["It may slip through your fingers and disappear."],
      draw: (b) => {
        b.path([[6, 30, 1.8], [12, 48], [24, 62], [40, 68, 1.6], [50, 66, 1.4], [60, 68, 1.6], [76, 62], [88, 48], [94, 30, 1.8]]);
        b.path([[12, 30, 1.2], [20, 26, 1.4], [28, 32, 1.2], [36, 28, 1.4], [44, 34, 1.2]]);
        b.path([[56, 34, 1.2], [64, 28, 1.4], [72, 32, 1.2], [80, 26, 1.4], [88, 30, 1.2]]);
        b.pts([[50, 74, 1.8], [49, 82, 1.4], [51, 90, 1.2], [50, 97, 1]]);
      },
    },
    {
      name: "The Duck and Ducklings",
      theme: "Some are meant to lead, and others are meant to follow",
      keyPhrases: ["Some are meant to lead,"],
      draw: (b) => {
        const duck = b.loop([[80, 42, 1.6], [74, 34, 1.6], [80, 26, 2], [90, 28, 1.6], [86, 36, 1.2], [88, 50, 1.4], [74, 60, 1.6], [54, 58, 1.6], [50, 46, 2], [64, 50]]);
        b.line(duck[3], b.star(96, 30, 1.4));
        for (const x of [36, 22, 8]) {
          b.loop([[x, 56, 1.2], [x + 3, 52, 1.6], [x + 6, 56, 1.2], [x + 4, 62, 1.2], [x - 2, 62, 1.2]]);
        }
        b.path([[2, 70, 1], [30, 68, 1.2], [60, 70, 1.2], [98, 68, 1]]);
      },
    },
    {
      name: "The Big Fish and the Small",
      theme: "Some are naturally big and strong, and others will always be small",
      keyPhrases: ["Some are naturally big and strong,"],
      draw: (b) => {
        const big = b.loop([[12, 50, 2], [26, 34], [48, 30], [64, 38, 1.6], [64, 62, 1.6], [48, 70], [26, 66]]);
        b.line(big[3], b.star(80, 32, 2), b.star(80, 68, 2), big[4]);
        b.star(22, 46, 2.6);
        b.line(big[2], b.star(40, 20, 1.4), b.star(54, 26, 1.2));
        const small = b.loop([[80, 84, 1.6], [86, 80], [92, 84, 1.2], [86, 88]]);
        b.line(small[2], b.star(98, 80, 1.2), b.star(98, 88, 1.2), small[2]);
      },
    },
    {
      name: "The Lidded Vase",
      theme: "The world is a sacred vessel and it can not be controlled",
      keyPhrases: ["and it can not be controlled."],
      draw: (b) => {
        b.close(b.ring(50, 8, 4, 4, 1.8));
        b.path([[36, 18, 1.6], [42, 12, 1.2], [58, 12, 1.2], [64, 18, 1.6]]);
        const l = b.pts([[36, 18], [38, 26], [24, 40], [20, 58, 1.8], [28, 78], [38, 90, 1.8]]);
        const r = b.pts([[64, 18], [62, 26], [76, 40], [80, 58, 1.8], [72, 78], [62, 90, 1.8]]);
        b.line(...l);
        b.line(...r);
        b.line(l[0], r[0]);
        b.line(l[5], r[5]);
        b.path([[24, 46, 1], [50, 52, 1.4], [76, 46, 1]]);
      },
    },
  ],
  30: [
    {
      name: "The Thorned Rose",
      theme: "Where armies march, thorns and briars bloom and grow",
      keyPhrases: ["thorns and briars bloom and grow."],
      draw: (b) => {
        b.close(b.ring(50, 22, 12, 8, 2));
        b.star(50, 22, 2.6);
        const stem = b.path([[50, 34, 1.4], [52, 50], [48, 66], [50, 84], [48, 96, 1.6]]);
        for (const [i, dir] of [[1, 1], [2, -1], [3, 1]] as const) {
          const s = b.starAt(stem[i]);
          b.line(stem[i], b.star(s.x + dir * 8, s.y - 4, 1.4));
        }
        b.loop([[52, 58, 1.2], [66, 50, 1.4], [78, 54, 1.6], [66, 62, 1.4]]);
      },
    },
    {
      name: "The Thistle",
      theme: "Thorns and briars bloom and grow",
      keyPhrases: ["thorns and briars bloom and grow."],
      draw: (b) => {
        const top = [[36, 12], [44, 8], [50, 6], [56, 8], [64, 12]] as const;
        const head = b.loop([[34, 30, 1.6], [40, 20], [60, 20], [66, 30, 1.6], [58, 44], [42, 44]]);
        top.forEach(([x, y], i) => b.line(head[i < 2 ? 1 : 2], b.star(x, y, 1.8)));
        b.line(head[0], b.star(24, 26, 1.4));
        b.line(head[3], b.star(76, 26, 1.4));
        const stem = b.path([[50, 44, 1.4], [50, 64, 1.2], [50, 94, 1.6]]);
        b.path([[50, 64], [30, 58, 1.4], [18, 64, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[50, 74, 1.2], [70, 68, 1.4], [82, 74, 1.8]]);
        void stem;
      },
    },
    {
      name: "The Sword in the Ground",
      theme: "When the battle is over, arrogance is the new enemy",
      keyPhrases: ["When the battle is over,"],
      draw: (b) => {
        b.close(b.ring(50, 8, 4, 4, 1.8));
        const grip = b.path([[50, 12, 1.2], [50, 24, 1.4]]);
        b.path([[30, 26, 2], [50, 24], [70, 26, 2]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.loop([[46, 28, 1.4], [54, 28, 1.4], [54, 70], [50, 78, 1.2], [46, 70]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[4, 78, 1.2], [28, 78, 1.4], [72, 78, 1.4], [96, 78, 1.2]]);
        b.path([[30, 78], [26, 66, 1.4], [20, 60, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[26, 66], [32, 58, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        void grip;
      },
    },
    {
      name: "The Barren Tree",
      theme: "After armies take to war, bad years must always follow",
      keyPhrases: ["bad years must always follow."],
      draw: (b) => {
        const t = b.path([[50, 94, 2], [50, 70], [48, 52], [50, 36, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.line(t[2], ...b.pts([[34, 40, 1.4], [22, 26, 1.8]]));
        b.line(b.star(34, 40), b.star(20, 44, 1.4));
        b.line(t[2], ...b.pts([[66, 42, 1.4], [80, 30, 1.8]]));
        b.line(b.star(66, 42), b.star(82, 48, 1.4));
        b.line(t[3], ...b.pts([[42, 22, 1.4], [40, 10, 1.6]]));
        b.line(t[3], ...b.pts([[58, 22, 1.4], [62, 8, 1.6]]));
        b.path([[10, 94, 1.2], [30, 92, 1.2], [70, 92, 1.2], [90, 94, 1.2]]);
      },
    },
    {
      name: "The Gong",
      theme: "The skillful commander strikes a decisive blow then stops",
      keyPhrases: ["strikes a decisive blow then stops."],
      draw: (b) => {
        const beam = b.path([[8, 10, 2], [92, 10, 2]]);
        b.line(beam[0], b.star(14, 94, 1.8));
        b.line(beam[1], b.star(86, 94, 1.8));
        b.close(b.ring(50, 52, 24, 12, 1.8));
        b.star(50, 52, 2.6);
        b.line(b.star(38, 10, 1.2), b.star(44, 29, 1.2));
        b.line(b.star(62, 10, 1.2), b.star(56, 29, 1.2));
      },
    },
  ],
};

export default c;
