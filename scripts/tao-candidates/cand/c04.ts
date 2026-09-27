import type { Candidate } from "../types.ts";

const c: Record<number, Candidate[]> = {
  31: [
    {
      name: "The Weeping Willow",
      theme: "The death of many should be greeted with great sorrow",
      keyPhrases: ["The death of many should be greeted with great sorrow,"],
      draw: (b) => {
        const crown = b.arc(50, 44, 38, 190, 350, 7, 1.8, 30);
        b.line(...crown);
        b.path([[50, 94, 2], [48, 64, 1.6], [50, 14]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        crown.forEach((id, i) => {
          const s = b.starAt(id);
          const len = i === 0 || i === 6 ? 30 : 40;
          b.line(id, b.star(s.x + (s.x - 50) * 0.08, s.y + len * 0.55, 1.2), b.star(s.x + (s.x - 50) * 0.14, s.y + len, 1.6));
        });
        b.path([[10, 94, 1.2], [50, 94], [90, 94, 1.2]].map(([x, y, m]) => [x, y, m ?? 2] as [number, number, number]));
      },
    },
    {
      name: "The Dove",
      theme: "If peace is her true objective, how can she rejoice in the victory of war?",
      keyPhrases: ["If peace is her true objective"],
      draw: (b) => {
        const body = b.loop([[76, 30, 1.8], [84, 26, 1.6], [90, 30, 1.4], [84, 36], [70, 48], [50, 56], [30, 62, 1.6], [14, 70, 2], [22, 58], [44, 48], [62, 38]]);
        b.line(body[2], b.star(96, 32, 1.4));
        b.star(83, 29, 2.2);
        b.line(body[9], ...b.pts([[40, 30], [34, 14, 1.8], [52, 20], [60, 36]]), body[10]);
        b.path([[92, 34, 1.2], [94, 44, 1.4], [90, 52, 1.2]]);
        b.pts([[98, 44, 1.2], [88, 44, 1.2]]);
      },
    },
    {
      name: "The Floating Lanterns",
      theme: "The victory celebration should honor those who have died",
      keyPhrases: ["and the victory celebration should honor those who have died."],
      draw: (b) => {
        for (const [x, y, s] of [[22, 64, 1], [52, 54, 0.8], [78, 64, 1]] as const) {
          b.loop([[x - 8 * s, y, 1.6], [x + 8 * s, y, 1.6], [x + 8 * s, y + 16 * s, 1.4], [x - 8 * s, y + 16 * s, 1.4]]);
          b.star(x, y + 8 * s, 2.6);
          b.pts([[x, y - 10 * s, 1.2]]);
        }
        b.path([[2, 84, 1.2], [18, 82, 1.4], [34, 86, 1.2], [50, 82, 1.4], [66, 86, 1.2], [82, 82, 1.4], [98, 86, 1.2]]);
        b.pts([[22, 94, 1], [78, 94, 1]]);
      },
    },
    {
      name: "The Crossed Swords",
      theme: "Weapons are the bearers of bad news; all people should detest them",
      keyPhrases: ["Weapons are the bearers of bad news;"],
      draw: (b) => {
        b.path([[14, 14, 2.4], [30, 30], [50, 50], [70, 70, 1.4]]);
        b.path([[86, 14, 2.4], [70, 30], [50, 50], [30, 70, 1.4]]);
        b.path([[62, 78, 1.6], [78, 62, 1.6]]);
        b.path([[22, 62, 1.6], [38, 78, 1.6]]);
        b.path([[70, 70], [84, 84, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[30, 70], [16, 84, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
      },
    },
    {
      name: "The Broken Arrow",
      theme: "Weapons are meant for destruction, and thus are avoided by the wise",
      keyPhrases: ["and thus are avoided by the wise."],
      draw: (b) => {
        b.path([[10, 72, 1.6], [26, 62, 1.4], [42, 52, 1.8]]);
        b.path([[10, 72], [4, 64, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[16, 68, 1.2], [10, 60, 1.4]]);
        b.path([[10, 72], [8, 82, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[16, 68], [14, 78, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[50, 44, 1.8], [64, 36, 1.4], [78, 28, 1.6]]);
        b.loop([[78, 28], [76, 18, 1.6], [96, 16, 2.6], [88, 34, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.pts([[44, 42, 1], [48, 54, 1]]);
      },
    },
  ],
  32: [
    {
      name: "The Sweet Rain",
      theme: "Like sweet rain falling on paradise",
      keyPhrases: ["like sweet rain falling on paradise."],
      draw: (b) => {
        b.loop([[20, 34, 1.6], [16, 24], [26, 14, 1.8], [40, 14], [48, 6, 2], [62, 8], [70, 16, 1.8], [82, 18], [86, 28, 1.6], [76, 34], [50, 36]]);
        for (const [x, y] of [[30, 48], [50, 52], [70, 48], [40, 62], [60, 62]]) b.path([[x + 1, y - 4, 1], [x, y, 1.4]]);
        for (const x of [24, 50, 76]) {
          b.path([[x, 94, 1.4], [x, 84, 1.2]]);
          b.close(b.ring(x, 78, 4, 4, 1.8));
        }
      },
    },
    {
      name: "The Drop and the Sea",
      theme: "All things end in the Tao",
      keyPhrases: ["All things end in the Tao"],
      draw: (b) => {
        b.loop([[50, 8, 2.2], [56, 18], [58, 26, 1.6], [50, 32, 1.8], [42, 26, 1.6], [44, 18]]);
        b.close(b.ring(50, 70, 10, 6, 1.6, 0, 3));
        b.close(b.ring(50, 70, 26, 10, 1.4, 0, 7));
        b.path([[2, 70, 1.2], [14, 70, 1.2]]);
        b.path([[86, 70, 1.2], [98, 70, 1.2]]);
        b.path([[8, 88, 1], [30, 90, 1.2], [50, 88, 1], [70, 90, 1.2], [92, 88, 1]]);
      },
    },
    {
      name: "The Winding River",
      theme: "Small streams and the largest rivers flow through valleys to the sea",
      keyPhrases: ["flow through valleys to the sea."],
      draw: (b) => {
        b.path([[40, 4, 1.4], [34, 16], [46, 28], [30, 40], [48, 52], [34, 64], [52, 78, 1.8]]);
        b.path([[72, 8, 1.2], [60, 20], [66, 34], [48, 52]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[10, 28, 1.2], [20, 38], [30, 40]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[2, 84, 1.6], [26, 80, 1.4], [52, 78], [76, 80, 1.4], [98, 84, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.path([[14, 94, 1.2], [36, 90, 1.4], [64, 90, 1.4], [86, 94, 1.2]]);
      },
    },
    {
      name: "The Tributaries",
      theme: "Small streams and the largest rivers, all gathering into one",
      keyPhrases: ["just as the small streams and the largest rivers"],
      draw: (b) => {
        const mouth = b.star(50, 92, 2.8);
        const trunk = b.star(50, 64, 2);
        b.line(mouth, trunk);
        const l = b.star(32, 44, 1.6), r = b.star(66, 40, 1.6);
        b.line(trunk, l);
        b.line(trunk, r);
        b.line(l, b.star(16, 30, 1.4), b.star(8, 12, 1.2));
        b.line(l, b.star(36, 22, 1.4), b.star(30, 6, 1.2));
        b.line(r, b.star(58, 20, 1.4), b.star(62, 4, 1.2));
        b.line(r, b.star(82, 26, 1.4), b.star(94, 10, 1.2));
        b.line(b.star(16, 30), b.star(4, 34, 1));
        b.line(b.star(82, 26), b.star(96, 32, 1));
      },
    },
    {
      name: "The Written Heart",
      theme: "The law would be written on their hearts",
      keyPhrases: ["because the law would be written on their hearts."],
      draw: (b) => {
        b.loop([[50, 30, 1.8], [60, 18], [74, 14, 1.8], [88, 22], [90, 38], [80, 56], [64, 72], [50, 86, 2.4], [36, 72], [20, 56], [10, 38], [12, 22], [26, 14, 1.8], [40, 18]]);
        b.path([[30, 38, 1.2], [50, 40, 1.4], [70, 38, 1.2]]);
        b.path([[34, 50, 1.2], [50, 52, 1.4], [66, 50, 1.2]]);
        b.path([[42, 62, 1.2], [58, 62, 1.2]]);
      },
    },
  ],
  33: [
    {
      name: "The Hand Mirror",
      theme: "Those who know themselves are truly wise",
      keyPhrases: ["those who know themselves are truly wise."],
      draw: (b) => {
        const glass = b.ring(44, 38, 26, 12, 1.8, 45);
        b.close(glass);
        b.close(b.ring(44, 38, 18, 8, 1.2, 45));
        b.line(glass[0], ...b.pts([[74, 68, 1.4], [86, 80, 1.4], [94, 88, 2]]));
        b.path([[36, 28, 1.4], [30, 38, 1.8]]);
      },
    },
    {
      name: "The Arrow in the Target",
      theme: "Those who persist will reach their goal",
      keyPhrases: ["Those who persist will reach their goal."],
      draw: (b) => {
        b.close(b.ring(60, 50, 34, 12, 1.8));
        b.close(b.ring(60, 50, 20, 8, 1.4));
        b.star(60, 50, 3);
        b.path([[60, 50], [36, 36, 1.2], [8, 20, 1.6]].map(([x, y, m]) => [x, y, m ?? 3] as [number, number, number]));
        b.path([[2, 22, 1.4], [8, 20], [6, 12, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
      },
    },
    {
      name: "The Compass Needle",
      theme: "Those who keep their course have a strong will",
      keyPhrases: ["Those who keep their course have a strong will."],
      draw: (b) => {
        b.close(b.ring(50, 50, 40, 16, 1.6));
        b.loop([[50, 14, 2.8], [56, 50, 1.4], [50, 86, 2], [44, 50, 1.4]]);
        b.star(50, 50, 1.8);
        b.pts([[50, 4, 1.2], [96, 50, 1], [4, 50, 1], [50, 96, 1]]);
      },
    },
    {
      name: "The Ship and the Star",
      theme: "Keep your course, guided by the one fixed star",
      keyPhrases: ["Those who keep their course have a strong will."],
      draw: (b) => {
        b.star(80, 10, 3);
        b.path([[44, 22, 2], [44, 44], [44, 70, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.loop([[46, 24, 1.2], [70, 64, 1.6], [46, 64, 1.2]]);
        b.loop([[42, 30, 1.2], [42, 64, 1.2], [22, 64, 1.6]]);
        b.path([[12, 70, 1.8], [22, 82], [70, 82], [82, 70, 1.8]]);
        b.path([[2, 90, 1], [24, 88, 1.2], [50, 92, 1], [76, 88, 1.2], [98, 90, 1]]);
      },
    },
    {
      name: "The Tortoise",
      theme: "Those who persist will reach their goal",
      keyPhrases: ["Those who persist will reach their goal."],
      draw: (b) => {
        b.line(...b.arc(48, 62, 30, 180, 360, 9, 1.8, 26));
        b.path([[18, 62, 1.6], [78, 62, 1.6]]);
        b.path([[30, 44, 1.2], [38, 58, 1.2], [58, 58, 1.2], [66, 44, 1.2]]);
        b.path([[48, 36, 1.2], [48, 58, 1.2]]);
        b.loop([[78, 62, 1.4], [88, 52, 1.6], [96, 56, 2], [90, 64, 1.4]]);
        b.path([[26, 62, 1.2], [22, 74, 1.8]]);
        b.path([[66, 62, 1.2], [70, 74, 1.8]]);
        b.path([[18, 62], [10, 66, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[4, 78, 1], [96, 78, 1]]);
      },
    },
  ],
  34: [
    {
      name: "The Fountain",
      theme: "The great Tao flows unobstructed in every direction",
      keyPhrases: ["The great Tao flows unobstructed in every direction."],
      draw: (b) => {
        const top = b.star(50, 12, 2.6);
        b.line(top, ...b.pts([[34, 16, 1.4], [22, 30, 1.4], [16, 48, 1.6]]));
        b.line(top, ...b.pts([[66, 16, 1.4], [78, 30, 1.4], [84, 48, 1.6]]));
        b.line(top, ...b.pts([[42, 24, 1.2], [36, 38, 1.2], [34, 52, 1.4]]));
        b.line(top, ...b.pts([[58, 24, 1.2], [64, 38, 1.2], [66, 52, 1.4]]));
        b.path([[50, 12], [50, 70, 1.4]].map(([x, y, m]) => [x, y, m ?? 2.6] as [number, number, number]));
        b.close(b.ring(50, 72, 38, 10, 1.6, 0, 8));
        b.line(b.star(12, 72, 1), b.star(16, 88, 1.6), b.star(84, 88, 1.6), b.star(88, 72, 1));
      },
    },
    {
      name: "The Sun and Its Worlds",
      theme: "It nourishes infinite worlds",
      keyPhrases: ["It nourishes infinite worlds,"],
      draw: (b) => {
        b.star(50, 50, 3);
        b.close(b.ring(50, 50, 16, 8, 1, 0, 8));
        b.close(b.ring(50, 50, 30, 12, 1, 0, 15));
        b.close(b.ring(50, 50, 46, 14, 1, 0, 23));
        b.star(66, 50, 2);
        b.star(29, 61, 2.2);
        b.star(82, 40, 2.4);
      },
    },
    {
      name: "The Sheltering Tree",
      theme: "All of creation seeks it for refuge",
      keyPhrases: ["All of creation seeks it for refuge"],
      draw: (b) => {
        b.loop([[10, 44, 1.6], [14, 28], [30, 16, 1.8], [50, 10, 2], [70, 16, 1.8], [86, 28], [90, 44, 1.6], [70, 50], [50, 52], [30, 50]]);
        b.path([[44, 52, 1.4], [44, 92, 1.8]]);
        b.path([[56, 52, 1.4], [56, 92, 1.8]]);
        b.path([[10, 92, 1.2], [90, 92, 1.2]]);
        for (const [x, y] of [[30, 34], [52, 28], [70, 36]]) b.line(b.star(x - 3, y, 1.2), b.star(x, y - 2, 2), b.star(x + 3, y, 1.2));
        b.line(b.star(24, 88, 1.2), b.star(28, 84, 1.6));
        b.line(b.star(72, 88, 1.2), b.star(76, 84, 1.6));
      },
    },
    {
      name: "The Spider's Web",
      theme: "Flowing in every direction, holding the smallest creature",
      keyPhrases: ["and it does not deny even the smallest of creation."],
      draw: (b) => {
        const c = b.star(50, 50, 2.2);
        const spokes = b.ring(50, 50, 44, 8, 1.6, -90);
        spokes.forEach((id) => b.line(c, id));
        const mid = b.ring(50, 50, 28, 8, 1.2, -90);
        b.close(mid);
        b.close(b.ring(50, 50, 14, 8, 1, -90));
        void mid;
      },
    },
    {
      name: "The Hen and Chicks",
      theme: "It nourishes, yet it doesn't seek to master the smallest creature",
      keyPhrases: ["yet it doesn't seek to master the smallest creature."],
      draw: (b) => {
        const hen = b.loop([[70, 30, 1.6], [66, 22, 1.6], [72, 14, 2], [80, 18, 1.6], [78, 30], [84, 44], [78, 60], [60, 68], [36, 66], [22, 54], [16, 38, 1.8], [30, 44], [50, 42]]);
        b.line(hen[3], b.star(88, 20, 1.4));
        b.line(hen[1], b.star(68, 10, 1.4));
        b.path([[56, 68, 1.2], [56, 80, 1.6]]);
        b.path([[44, 68, 1.2], [44, 80, 1.6]]);
        for (const x of [14, 26, 84]) b.close(b.ring(x, 80, 4, 5, 1.4));
        b.path([[2, 88, 1], [98, 88, 1]]);
      },
    },
  ],
  35: [
    {
      name: "The Teapot",
      theme: "Where there is music and good food, people will stop to enjoy it",
      keyPhrases: ["Where there is music and good food,"],
      draw: (b) => {
        b.close(b.ring(46, 20, 4, 4, 1.8));
        b.path([[30, 30, 1.6], [46, 24, 1.2], [62, 30, 1.6]]);
        b.loop([[30, 32, 1.6], [62, 32, 1.6], [72, 46], [70, 64], [60, 74], [32, 74], [22, 64], [20, 46]]);
        b.path([[72, 46], [84, 40], [92, 28, 2]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[70, 58], [82, 48]].map(([x, y]) => [x, y, 1.2] as [number, number, number]));
        b.path([[21, 42, 1.2], [8, 46, 1.4], [10, 62, 1.4], [22, 64]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[20, 86, 1.2], [80, 86, 1.2]]);
      },
    },
    {
      name: "The Footprints",
      theme: "She will draw the world to her steps",
      keyPhrases: ["will draw the world to her steps."],
      draw: (b) => {
        for (const [x, y, s] of [[34, 86, 1], [58, 70, 0.9], [38, 52, 0.8], [58, 36, 0.7], [42, 22, 0.6], [56, 10, 0.5]] as const) {
          b.close(b.ring(x, y, 4 * s, 5, 1.2, -90, 8 * s));
          b.star(x, y - 12 * s, 1.6);
        }
      },
    },
    {
      name: "The Wind Chime",
      theme: "When listened for, there is nothing for them to hear",
      keyPhrases: ["When listen for, there is nothing for them to hear."],
      draw: (b) => {
        b.path([[50, 2, 1.4], [50, 12, 1.6]]);
        const bar = b.path([[20, 16, 1.8], [50, 12], [80, 16, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        void bar;
        for (const [x, top, len] of [[26, 16, 36], [40, 14, 50], [60, 14, 44], [74, 16, 30]]) {
          b.path([[x, top + 6, 1.2], [x, top + 6 + len, 1.8]]);
        }
        b.path([[50, 12], [50, 60, 1], [50, 80, 2]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
      },
    },
    {
      name: "The Lantern and the Moths",
      theme: "She will draw the world to her steps",
      keyPhrases: ["will draw the world to her steps."],
      draw: (b) => {
        b.path([[50, 4, 1.2], [50, 22, 1.4]]);
        b.loop([[40, 26, 1.6], [60, 26, 1.6], [64, 46], [60, 66, 1.6], [40, 66, 1.6], [36, 46]]);
        b.star(50, 46, 3);
        for (const [x, y] of [[18, 30], [84, 38], [24, 70], [78, 76]]) {
          const body = b.star(x, y, 1.6);
          b.line(b.star(x - 5, y - 4, 1.2), body, b.star(x + 5, y - 4, 1.2));
        }
      },
    },
    {
      name: "The Water Wheel",
      theme: "If they put it to use, it would never be exhausted",
      keyPhrases: ["Yet if they put it to use, it would never be exhausted."],
      draw: (b) => {
        const rim = b.ring(50, 46, 30, 10, 1.8);
        b.close(rim);
        const hub = b.star(50, 46, 2);
        for (const id of rim) {
          const s = b.starAt(id);
          b.line(hub, id, b.star(50 + (s.x - 50) * 1.2, 46 + (s.y - 46) * 1.2, 1.2));
        }
        b.path([[2, 88, 1.2], [26, 84, 1.4], [50, 88, 1.2], [74, 84, 1.4], [98, 88, 1.2]]);
      },
    },
  ],
  36: [
    {
      name: "The Koi under the Lily Pads",
      theme: "Just as fish remain hidden in deep waters",
      keyPhrases: ["Just as fish remain hidden in deep waters,"],
      draw: (b) => {
        b.line(...b.arc(26, 22, 16, 30, 330, 7, 1.6, 8), b.star(26, 22, 1.2));
        b.line(...b.arc(72, 30, 14, 210, 510, 7, 1.6, 7), b.star(72, 30, 1.2));
        const koi = b.loop([[20, 70, 2.2], [34, 62], [52, 62], [66, 68, 1.6], [52, 76], [34, 76]]);
        b.line(koi[3], b.star(80, 60, 1.8), b.star(78, 70, 1.4), b.star(80, 80, 1.8), koi[3]);
        b.star(28, 68, 2);
        b.line(koi[1], b.star(40, 54, 1.2));
      },
    },
    {
      name: "The Folding Fan",
      theme: "If you want something to return, you must first allow it to spread out",
      keyPhrases: ["you must first allow it to spread out."],
      draw: (b) => {
        const pivot = b.star(50, 86, 2.4);
        const outer = b.arc(50, 86, 44, 200, 340, 8, 1.8);
        b.line(...outer);
        const inner = b.arc(50, 86, 18, 200, 340, 8, 1);
        b.line(...inner);
        outer.forEach((id, i) => b.line(pivot, inner[i], id));
      },
    },
    {
      name: "The Falling Blossom",
      theme: "If you want something to be removed, you must first allow it to flourish",
      keyPhrases: ["you must first allow it to flourish."],
      draw: (b) => {
        for (let i = 0; i < 5; i++) {
          const a = ((-90 + i * 72) * Math.PI) / 180;
          b.close(b.ring(40 + 16 * Math.cos(a), 36 + 16 * Math.sin(a), 7, 5, 1.6, -90 + i * 72));
        }
        b.star(40, 36, 2.8);
        b.loop([[70, 66, 1.6], [76, 62, 1.2], [80, 68, 1.6], [74, 72, 1.2]]);
        b.loop([[84, 86, 1.4], [90, 84, 1.2], [90, 92, 1.4]]);
        b.pts([[62, 82, 1]]);
      },
    },
    {
      name: "The Gift",
      theme: "If you want to possess something, you must first give it away",
      keyPhrases: ["you must first give it away."],
      draw: (b) => {
        b.loop([[18, 44, 1.8], [82, 44, 1.8], [82, 56, 1.4], [18, 56, 1.4]]);
        b.loop([[22, 56, 1.4], [78, 56, 1.4], [78, 92, 1.8], [22, 92, 1.8]]);
        b.path([[50, 44, 1.2], [50, 92, 1.2]]);
        b.loop([[50, 44, 2.4], [36, 28, 1.6], [28, 34, 1.4], [36, 42, 1.2]]);
        b.loop([[50, 44], [64, 28, 1.6], [72, 34, 1.4], [64, 42, 1.2]].map(([x, y, m]) => [x, y, m ?? 2.4] as [number, number, number]));
      },
    },
    {
      name: "The Setting Sun",
      theme: "If you want something to weaken, you must first allow it to become strong",
      keyPhrases: ["you must first allow it to become strong."],
      draw: (b) => {
        b.line(...b.arc(50, 64, 24, 180, 360, 7, 2));
        b.path([[2, 64, 1.4], [26, 64], [74, 64], [98, 64, 1.4]].map(([x, y, m]) => [x, y, m ?? 2] as [number, number, number]));
        for (let i = 0; i < 5; i++) {
          const a = ((200 + i * 35) * Math.PI) / 180;
          b.line(b.star(50 + 30 * Math.cos(a), 64 + 30 * Math.sin(a), 1.2), b.star(50 + 40 * Math.cos(a), 64 + 40 * Math.sin(a), 1.6));
        }
        b.path([[30, 74, 1.2], [70, 74, 1.2]]);
        b.path([[38, 82, 1], [62, 82, 1]]);
        b.path([[46, 90, 0.8], [54, 90, 0.8]]);
      },
    },
  ],
  37: [
    {
      name: "The Sleeping Cat",
      theme: "The world would naturally settle into peace",
      keyPhrases: ["the world would naturally settle into peace."],
      draw: (b) => {
        const back = b.arc(56, 72, 34, 180, 360, 8, 1.6, 30);
        b.line(...back);
        b.close(b.ring(28, 62, 11, 7, 1.6, 90));
        b.line(b.star(20, 55, 1.2), b.star(18, 44, 2), b.star(27, 51, 1.2));
        b.line(b.star(31, 51, 1.2), b.star(38, 44, 2), b.star(37, 56, 1.2));
        b.path([[90, 72], [86, 84, 1.4], [66, 88, 1.4], [44, 84, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[70, 20, 1.2], [76, 20, 1.2], [70, 26, 1.2], [76, 26, 1.4]]);
        b.path([[82, 8, 1.2], [88, 8, 1.2], [82, 14, 1.2], [88, 14, 1.4]]);
      },
    },
    {
      name: "The Sprout through the Stone",
      theme: "The Tao never acts with force, yet there is nothing that it can not do",
      keyPhrases: ["yet there is nothing that it can not do."],
      draw: (b) => {
        b.loop([[10, 88, 1.8], [16, 66, 1.6], [34, 56, 1.6], [46, 58, 1.4], [54, 58, 1.4], [70, 54, 1.6], [86, 64, 1.6], [92, 88, 1.8]]);
        b.path([[46, 58], [52, 70, 1], [48, 80, 1], [52, 88, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[50, 58, 1.4], [50, 40, 1.6], [52, 26, 2.2]]);
        b.loop([[50, 40], [36, 32, 1.6], [28, 36, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.loop([[52, 34, 1.2], [64, 22, 1.6], [72, 26, 1.4]]);
      },
    },
    {
      name: "The Zen Garden",
      theme: "The world would naturally settle into peace: a stone in raked sand",
      keyPhrases: ["the world would naturally settle into peace."],
      draw: (b) => {
        b.loop([[40, 50, 2], [46, 42, 2.2], [56, 44, 2], [60, 52, 1.8], [50, 56, 1.8]]);
        b.close(b.ring(50, 50, 20, 10, 1.2, 0, 14));
        b.close(b.ring(50, 50, 32, 14, 1, 0, 22));
        b.path([[2, 86, 1], [30, 86, 1.2], [70, 86, 1.2], [98, 86, 1]]);
        b.path([[2, 14, 1], [30, 14, 1.2], [70, 14, 1.2], [98, 14, 1]]);
      },
    },
    {
      name: "The Moored Boat",
      theme: "The world would naturally settle into peace: a boat at rest under the moon",
      keyPhrases: ["the world would naturally settle into peace."],
      draw: (b) => {
        b.close(b.ring(76, 18, 8, 7, 1.8));
        b.path([[20, 60, 1.8], [30, 70], [62, 70], [72, 60, 1.8]]);
        b.path([[20, 60], [72, 60]].map(([x, y]) => [x, y, 1.8] as [number, number, number]));
        b.path([[46, 60, 1.2], [46, 38, 1.6]]);
        b.path([[20, 60], [10, 66, 1.2], [6, 80, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.path([[2, 80, 1], [30, 80, 1.2], [60, 80, 1.2], [98, 80, 1]]);
        b.close(b.ring(76, 90, 5, 5, 1, 0, 2));
      },
    },
    {
      name: "The Pinwheel",
      theme: "The Tao never acts with force: turned by the wind alone",
      keyPhrases: ["The Tao never acts with force,"],
      draw: (b) => {
        const c = b.star(50, 38, 2.4);
        for (let i = 0; i < 4; i++) {
          const a = ((-90 + i * 90) * Math.PI) / 180;
          const tip = b.star(50 + 28 * Math.cos(a), 38 + 28 * Math.sin(a), 1.8);
          const side = b.star(50 + 26 * Math.cos(a + 0.8), 38 + 26 * Math.sin(a + 0.8), 1.4);
          b.line(c, tip, side, c);
        }
        b.path([[50, 38], [50, 66, 1.2], [50, 94, 1.6]].map(([x, y, m]) => [x, y, m ?? 2.4] as [number, number, number]));
        b.path([[6, 20, 1], [18, 16, 1.2]]);
        b.path([[4, 32, 1], [16, 28, 1.2]]);
      },
    },
  ],
  38: [
    {
      name: "The Peach",
      theme: "The master abides in the fruit and not in the husk",
      keyPhrases: ["The master abides in the fruit and not in the husk."],
      draw: (b) => {
        b.loop([[50, 30, 1.8], [62, 26], [76, 32], [84, 48], [80, 66], [66, 80], [50, 88, 2.2], [34, 80], [20, 66], [16, 48], [24, 32], [38, 26]]);
        b.path([[50, 30], [48, 50, 1.2], [50, 70, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.path([[50, 30], [52, 18, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.loop([[52, 18], [64, 8, 1.6], [80, 8, 2], [68, 18, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
      },
    },
    {
      name: "The Ear of Grain",
      theme: "The law is the husk of faith: grain and chaff",
      keyPhrases: ["The law is the husk of faith,"],
      draw: (b) => {
        const stem = b.path([[30, 96, 1.4], [36, 70], [48, 44], [62, 28], [78, 22], [90, 26, 1.8]]);
        for (const [x, y] of [[48, 44], [56, 35], [66, 26], [76, 22]]) {
          b.line(b.star(x - 6, y - 6, 1.6), b.star(x, y));
          b.line(b.star(x + 4, y + 8, 1.6), b.star(x, y));
        }
        b.path([[36, 70], [22, 58, 1.4], [16, 44, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        void stem;
      },
    },
    {
      name: "The Grapes",
      theme: "She dwells in the Tao, in the fruit itself",
      keyPhrases: ["The master abides in the fruit and not in the husk."],
      draw: (b) => {
        for (const [x, y] of [[43, 47], [57, 47], [50, 60], [43, 73], [57, 73]]) b.star(x, y, 2.4);
        b.loop([[36, 34, 2.2], [50, 34, 2.2], [64, 34, 2.2], [64, 60, 2.2], [57, 73], [50, 86, 2.2], [43, 73], [36, 60, 2.2]].map(([x, y, m]) => [x, y, m ?? 2.4] as [number, number, number]));
        b.path([[50, 34], [50, 20, 1.4], [56, 8, 1.6]].map(([x, y, m]) => [x, y, m ?? 2.2] as [number, number, number]));
        b.loop([[50, 20], [66, 12, 1.4], [80, 18, 1.8], [68, 26, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
      },
    },
    {
      name: "The Pomegranate",
      theme: "The fruit, not the husk: seeds within the rind",
      keyPhrases: ["The master abides in the fruit and not in the husk."],
      draw: (b) => {
        b.close(b.ring(50, 56, 34, 14, 1.6, -90));
        b.path([[42, 22, 1.4], [40, 12, 1.8], [46, 16, 1.4], [50, 8, 2], [54, 16, 1.4], [60, 12, 1.8], [58, 22, 1.4]]);
        for (const [x, y] of [[40, 48], [54, 44], [64, 56], [46, 62], [58, 70], [36, 66], [50, 54]]) b.star(x, y, 2.2);
      },
    },
    {
      name: "The Pea Pod",
      theme: "The husk opened, the fruit within",
      keyPhrases: ["She dwells in the Tao,"],
      draw: (b) => {
        b.path([[8, 70, 1.8], [24, 54], [44, 44], [66, 38], [86, 26, 1.8]]);
        b.path([[8, 70], [30, 70], [52, 62], [72, 50], [86, 26]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        for (const [x, y] of [[26, 62], [42, 55], [58, 48], [72, 40]]) b.close(b.ring(x, y, 4, 5, 2));
        b.path([[86, 26], [92, 14, 1.4], [98, 10, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
      },
    },
  ],
  39: [
    {
      name: "The Gem and the Stone",
      theme: "Do not shine like the precious gem, but be as dull as a common stone",
      keyPhrases: ["but be as dull as a common stone."],
      draw: (b) => {
        const top = b.path([[12, 26, 1.8], [20, 16, 1.6], [36, 16, 1.6], [44, 26, 1.8]]);
        b.line(top[0], top[3]);
        b.line(top[0], b.star(28, 48, 2.8), top[3]);
        b.line(top[1], b.star(24, 26, 1.2), b.star(28, 48));
        b.line(top[2], b.star(32, 26, 1.2), b.star(28, 48));
        b.loop([[52, 76, 1.4], [58, 62, 1.4], [72, 56, 1.4], [86, 60, 1.4], [94, 74, 1.4], [86, 86, 1.4], [64, 88, 1.4]]);
      },
    },
    {
      name: "The Stepped Pyramid",
      theme: "The high takes the low as their foundation",
      keyPhrases: ["and the high takes the low as their foundation."],
      draw: (b) => {
        b.path([[6, 92, 1.8], [6, 76], [18, 76], [18, 60], [30, 60], [30, 44], [42, 44], [42, 28], [58, 28], [58, 44], [70, 44], [70, 60], [82, 60], [82, 76], [94, 76], [94, 92, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[6, 92], [94, 92]].map(([x, y]) => [x, y, 1.8] as [number, number, number]));
        b.star(50, 16, 2.8);
      },
    },
    {
      name: "The Bundle of Arrows",
      theme: "This is the power of unity",
      keyPhrases: ["This is the power of unity."],
      draw: (b) => {
        for (const [x1, x2] of [[30, 70], [42, 58], [50, 50], [58, 42], [70, 30]]) {
          b.path([[x1, 6, 1.8], [50 + (x1 - 50) * 0.3, 50, 1], [x2, 94, 1.4]]);
        }
        b.loop([[40, 44, 1.6], [60, 44, 1.6], [60, 56, 1.6], [40, 56, 1.6]]);
      },
    },
    {
      name: "The Rice Terraces",
      theme: "The valleys attained unity that they might be full",
      keyPhrases: ["The valleys attained unity that they might be full."],
      draw: (b) => {
        b.path([[4, 90, 1.4], [28, 82, 1.2], [50, 80, 1.6], [72, 82, 1.2], [96, 90, 1.4]]);
        b.path([[12, 74, 1.4], [32, 68, 1.2], [50, 66, 1.6], [68, 68, 1.2], [88, 74, 1.4]]);
        b.path([[20, 58, 1.4], [36, 53, 1.2], [50, 52, 1.6], [64, 53, 1.2], [80, 58, 1.4]]);
        b.path([[28, 42, 1.4], [40, 38, 1.2], [50, 37, 1.6], [60, 38, 1.2], [72, 42, 1.4]]);
        b.path([[36, 28, 1.4], [50, 22, 2], [64, 28, 1.4]]);
        b.star(84, 12, 2.8);
      },
    },
    {
      name: "The Stone Arch",
      theme: "The great view the small as their source",
      keyPhrases: ["The great view the small as their source,"],
      draw: (b) => {
        const outer = b.arc(50, 70, 40, 180, 360, 9, 1.8);
        const inner = b.arc(50, 70, 24, 180, 360, 9, 1.2);
        b.line(...outer);
        b.line(...inner);
        outer.forEach((id, i) => b.line(id, inner[i]));
        b.starAt(outer[4]).mag = 2.6;
        b.path([[10, 70], [10, 94, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.path([[90, 70], [90, 94, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
      },
    },
  ],
  40: [
    {
      name: "The Boomerang",
      theme: "All movement returns to the Tao",
      keyPhrases: ["All movement returns to the Tao."],
      draw: (b) => {
        b.loop([[20, 30, 2], [40, 24], [62, 32, 2.2], [48, 36], [32, 42], [28, 60], [30, 76, 2], [20, 66], [14, 48]]);
        b.line(...b.arc(50, 52, 38, -20, 200, 9, 1, 30));
      },
    },
    {
      name: "The Snail",
      theme: "Weakness is how the Tao works",
      keyPhrases: ["Weakness is how the Tao works."],
      draw: (b) => {
        const spiral: [number, number, number][] = [];
        for (let i = 0; i < 12; i++) {
          const a = ((i * 50 + 90) * Math.PI) / 180;
          const r = 26 - i * 2;
          spiral.push([46 + r * Math.cos(a), 46 + r * Math.sin(a), i === 11 ? 2.4 : 1.6]);
        }
        b.path(spiral);
        b.path([[12, 72, 1.6], [46, 72, 1.4], [76, 72, 1.6], [86, 62, 1.8], [84, 46, 2]]);
        b.path([[84, 46], [80, 34, 1.8]].map(([x, y, m]) => [x, y, m ?? 2] as [number, number, number]));
        b.path([[84, 46], [92, 36, 1.8]].map(([x, y, m]) => [x, y, m ?? 2] as [number, number, number]));
        b.path([[4, 80, 1], [96, 80, 1]]);
      },
    },
    {
      name: "The Water Cycle",
      theme: "All movement returns: sea to cloud to rain to sea",
      keyPhrases: ["All movement returns to the Tao."],
      draw: (b) => {
        b.loop([[36, 28, 1.6], [34, 18], [44, 10, 1.8], [56, 8], [64, 16, 1.8], [72, 18], [74, 28, 1.6]]);
        for (const x of [60, 68]) b.path([[x, 34, 1], [x - 2, 44, 1.2]]);
        b.path([[70, 50, 1], [68, 60, 1.2]]);
        b.path([[2, 84, 1.2], [18, 80, 1.4], [34, 84, 1.2], [50, 80, 1.4], [66, 84, 1.2], [82, 80, 1.4], [98, 84, 1.2]]);
        b.path([[26, 74, 1], [22, 60, 1.2], [26, 46, 1.4], [32, 36, 1.8]]);
        b.path([[80, 70, 1.4], [86, 60, 1.2], [84, 44, 1], [78, 32, 1.4]]);
      },
    },
    {
      name: "The Comet",
      theme: "All movement returns: the comet coming back on its long path",
      keyPhrases: ["All movement returns to the Tao."],
      draw: (b) => {
        b.star(30, 50, 3);
        b.close(b.ring(52, 50, 42, 14, 1, 180, 22));
        const head = b.star(84, 34, 2.6);
        b.line(head, b.star(92, 22, 1.4));
        b.line(head, b.star(96, 30, 1.2));
        b.line(head, b.star(88, 16, 1));
      },
    },
    {
      name: "The Moon and the Tide",
      theme: "All movement returns: the sea drawn out and back by the moon",
      keyPhrases: ["All movement returns to the Tao."],
      draw: (b) => {
        b.close(b.ring(50, 22, 12, 9, 2));
        b.path([[2, 60, 1.4], [16, 52, 1.6], [30, 58, 1.2], [44, 52, 1.6], [58, 58, 1.2], [72, 52, 1.6], [86, 58, 1.2], [98, 52, 1.4]]);
        b.path([[8, 74, 1], [24, 68, 1.2], [40, 74, 1], [56, 68, 1.2], [72, 74, 1], [92, 68, 1.2]]);
        b.path([[2, 94, 1.4], [30, 88, 1.6], [60, 86, 1.6], [98, 92, 1.4]]);
      },
    },
  ],
};

export default c;
