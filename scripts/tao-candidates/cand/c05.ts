import type { Candidate } from "../types.ts";

type P = [number, number, number];
const m = (points: [number, number, number?][], mag: number): P[] =>
  points.map(([x, y, g]) => [x, y, g ?? mag]);
void m;

const c: Record<number, Candidate[]> = {
  41: [
    {
      name: "The Square without Corners",
      theme: "The true square seems to have no corners",
      keyPhrases: ["the true square seems to have no corners,"],
      draw: (b) => {
        const pts: [number, number][] = [];
        for (let i = 0; i < 16; i++) {
          const t = (i / 16) * Math.PI * 2;
          const cs = Math.cos(t), sn = Math.sin(t);
          const k = 38 / Math.pow(Math.abs(cs) ** 4 + Math.abs(sn) ** 4, 0.25);
          pts.push([50 + k * cs, 50 + k * sn]);
        }
        b.close(b.pts(pts, 1.8));
        b.star(50, 50, 2.6);
      },
    },
    {
      name: "The Unfinished Vase",
      theme: "The best vessels take the most time to finish",
      keyPhrases: ["the best vessels take the most time to finish,"],
      draw: (b) => {
        b.path([[40, 8, 2], [38, 20], [24, 34], [18, 54, 1.8], [24, 74], [36, 88], [50, 92, 2]]);
        b.path([[40, 8], [60, 8, 1.4]].map(([x, y, g]) => [x, y, g ?? 2] as P));
        b.pts([[62, 20], [76, 34], [82, 54], [76, 74], [64, 88]], 1);
      },
    },
    {
      name: "The Laughing Fool",
      theme: "When a foolish person hears of the Tao, he laughs out loud",
      keyPhrases: ["he laughs out loud at the very idea."],
      draw: (b) => {
        b.close(b.ring(50, 50, 40, 16, 1.6));
        b.line(...b.arc(34, 42, 8, 200, 340, 4, 1.8));
        b.line(...b.arc(66, 42, 8, 200, 340, 4, 1.8));
        const mouth = b.arc(50, 58, 20, 0, 180, 7, 1.6);
        b.line(...mouth);
        b.line(mouth[0], mouth[6]);
        b.pts([[92, 12, 1.2], [8, 14, 1]]);
      },
    },
    {
      name: "The Formless Cloud",
      theme: "The greatest image has no form",
      keyPhrases: ["and the greatest image has no form."],
      draw: (b) => {
        b.pts([[30, 30, 2.4], [48, 22, 1.6], [66, 30, 2], [74, 48, 1.4], [62, 66, 2.2], [40, 70, 1.6], [24, 56, 1.4], [44, 44, 2.8], [56, 50, 1.2], [36, 50, 1], [52, 36, 1.2], [80, 22, 1], [18, 76, 1]]);
        b.path([[30, 30], [44, 44], [62, 66]].map(([x, y]) => [x, y, 2] as P));
        b.nebula([[20, 40], [36, 20], [60, 16], [80, 30], [82, 56], [66, 76], [40, 80], [18, 64]]);
      },
      nebulaShare: 0.45,
    },
    {
      name: "The Owl",
      theme: "The brightness of the Tao seems like darkness",
      keyPhrases: ["The brightness of the Tao seems like darkness,"],
      draw: (b) => {
        b.loop([[50, 30, 1.4], [62, 20, 1.6], [70, 10, 2], [74, 30], [76, 52], [70, 74], [50, 86, 1.8], [30, 74], [24, 52], [26, 30], [30, 10, 2], [38, 20, 1.6]]);
        b.close(b.ring(40, 36, 7, 6, 1.2));
        b.close(b.ring(60, 36, 7, 6, 1.2));
        b.pts([[40, 36, 2.8], [60, 36, 2.8]]);
        b.loop([[48, 46, 1.4], [52, 46, 1.4], [50, 52, 1.6]]);
        b.path([[10, 88, 1.2], [36, 86], [64, 86], [90, 88, 1.2]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
      },
    },
  ],
  42: [
    {
      name: "One, Two, Three",
      theme: "The One gave birth to Two, the Two gave birth to Three",
      keyPhrases: ["The Two gave birth to Three."],
      draw: (b) => {
        const one = b.star(50, 90, 3);
        const two = [b.star(34, 66, 2.4), b.star(66, 66, 2.4)];
        two.forEach((id) => b.line(one, id));
        const three = [b.star(20, 42, 2), b.star(50, 42, 2), b.star(80, 42, 2)];
        b.line(two[0], three[0]);
        b.line(two[0], three[1]);
        b.line(two[1], three[1]);
        b.line(two[1], three[2]);
        for (const [i, xs] of [[0, [8, 20, 30]], [1, [40, 50, 60]], [2, [70, 80, 92]]] as const) {
          for (const x of xs) b.line(three[i], b.star(x, 14 + Math.abs(x - 50) * 0.1, 1.2));
        }
      },
    },
    {
      name: "The Bagua",
      theme: "All things carry Yin yet embrace Yang: the eight trigrams round the centre",
      keyPhrases: ["All things carry Yin"],
      draw: (b) => {
        b.close(b.ring(50, 50, 42, 8, 1.6, -67.5));
        const inner = b.ring(50, 50, 14, 8, 1.2, -90);
        b.close(inner);
        b.line(...b.arc(50, 43, 7, 90, 270, 3, 1));
        b.line(...b.arc(50, 57, 7, -90, 90, 3, 1));
        b.pts([[50, 43, 2.2], [50, 57, 1.2]]);
        for (let i = 0; i < 8; i++) {
          const a = ((-90 + i * 45) * Math.PI) / 180;
          b.line(b.star(50 + 22 * Math.cos(a), 50 + 22 * Math.sin(a), 1), b.star(50 + 30 * Math.cos(a), 50 + 30 * Math.sin(a), 1.8));
        }
      },
    },
    {
      name: "The Sunny and Shady Slopes",
      theme: "All things carry Yin yet embrace Yang: the hill's shaded and sunlit sides",
      keyPhrases: ["yet embrace Yang."],
      draw: (b) => {
        b.path([[4, 88, 1.4], [26, 58, 1.6], [50, 24, 2.6], [74, 58, 1.6], [96, 88, 1.4]]);
        b.path([[4, 88], [96, 88]].map(([x, y]) => [x, y, 1.4] as P));
        b.close(b.ring(82, 18, 7, 8, 1.8));
        b.nebula([[50, 26], [26, 58], [6, 87], [50, 87]]);
      },
      nebulaShare: 0.35,
    },
    {
      name: "The Mingled Breaths",
      theme: "They blend their life breaths in order to produce harmony",
      keyPhrases: ["They blend their life breaths"],
      draw: (b) => {
        for (const [cx, cy, dir, start] of [[40, 50, 1, 0], [60, 50, 1, 180]] as const) {
          const pts: P[] = [];
          for (let i = 0; i < 10; i++) {
            const a = ((start + dir * i * 40) * Math.PI) / 180;
            const r = 4 + i * 3.2;
            pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), i === 0 ? 2.6 : 1.4]);
          }
          b.path(pts);
        }
      },
    },
    {
      name: "The Koi Circle",
      theme: "All things carry Yin yet embrace Yang: two koi circling as one",
      keyPhrases: ["in order to produce harmony."],
      draw: (b) => {
        b.close(b.ring(50, 50, 44, 12, 1.2));
        b.path([[50, 16, 2.2], [66, 24], [72, 40], [64, 56], [50, 62, 1.4]]);
        b.path([[50, 16], [40, 26], [44, 40], [50, 50, 1.4]].map(([x, y, g]) => [x, y, g ?? 1.8] as P));
        b.path([[50, 84, 2.2], [34, 76], [28, 60], [36, 44], [50, 38, 1.4]]);
        b.path([[50, 84], [60, 74], [56, 60], [50, 50]].map(([x, y, g]) => [x, y, g ?? 1.8] as P));
        b.pts([[54, 24, 2.6], [46, 76, 2.6]]);
      },
    },
  ],
  43: [
    {
      name: "The Canyon",
      theme: "That which offers no resistance overcomes the hardest substances",
      keyPhrases: ["overcomes the hardest substances."],
      draw: (b) => {
        b.path([[2, 20, 1.6], [24, 22], [30, 40], [34, 58], [38, 80, 1.4]]);
        b.path([[98, 20, 1.6], [76, 22], [70, 40], [66, 58], [62, 80, 1.4]]);
        b.path([[24, 22], [2, 44, 1.2]].map(([x, y, g]) => [x, y, g ?? 1.8] as P));
        b.path([[76, 22], [98, 44, 1.2]].map(([x, y, g]) => [x, y, g ?? 1.8] as P));
        b.path([[38, 80], [44, 86, 1.8], [56, 86, 1.8], [62, 80]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.path([[46, 90, 1.2], [54, 94, 1.4], [62, 90, 1.2]]);
      },
    },
    {
      name: "The Dripping Stone",
      theme: "The soft overcomes the hard: water hollowing a stone drop by drop",
      keyPhrases: ["That which offers no resistance,"],
      draw: (b) => {
        b.path([[20, 6, 1.4], [50, 10, 1.6], [80, 6, 1.4]]);
        b.pts([[50, 18, 2], [50, 30, 1.6], [50, 42, 1.2]]);
        b.path([[8, 90, 1.8], [12, 66, 1.6], [30, 58], [42, 60, 1.4], [46, 66, 1.4], [54, 66, 1.4], [58, 60, 1.4], [70, 58], [88, 66, 1.6], [92, 90, 1.8]]);
        b.path([[8, 90], [92, 90]].map(([x, y]) => [x, y, 1.8] as P));
      },
    },
    {
      name: "Pointing at the Moon",
      theme: "The teaching without words",
      keyPhrases: ["the teaching without words,"],
      draw: (b) => {
        b.close(b.ring(78, 18, 10, 9, 1.8));
        b.close(b.ring(22, 42, 6, 6, 1.6));
        const neck = b.star(24, 52, 1.8);
        const hips = b.star(26, 78, 2);
        b.line(neck, hips);
        b.line(hips, b.star(20, 94, 1.8));
        b.line(hips, b.star(34, 94, 1.8));
        b.line(neck, b.star(38, 46, 1.4), b.star(52, 38, 2));
        b.line(neck, b.star(34, 64, 1.2));
      },
    },
    {
      name: "The Light through the Crack",
      theme: "That which offers no resistance can enter where there is no space",
      keyPhrases: ["can enter where there is no space."],
      draw: (b) => {
        b.loop([[18, 6, 1.6], [48, 6, 1.4], [48, 60, 1.4], [18, 60, 1.6]]);
        b.loop([[54, 6, 1.4], [84, 6, 1.6], [84, 60, 1.6], [54, 60, 1.4]]);
        b.path([[2, 60, 1.2], [18, 60], [84, 60], [98, 60, 1.2]].map(([x, y, g]) => [x, y, g ?? 1.6] as P));
        const gap = b.star(51, 60, 2.6);
        b.line(gap, b.star(30, 96, 1.6));
        b.line(gap, b.star(72, 96, 1.6));
        b.pts([[51, 20, 2], [51, 40, 1.6], [51, 78, 1.2], [44, 88, 1], [60, 86, 1]]);
      },
    },
    {
      name: "The Mist in the Mountains",
      theme: "That which offers no resistance can enter where there is no space",
      keyPhrases: ["That which offers no resistance"],
      draw: (b) => {
        b.path([[2, 50, 1.4], [18, 28, 2], [30, 40], [46, 18, 2.4], [62, 38], [74, 26, 2], [98, 50, 1.4]]);
        b.path([[2, 76, 1.2], [22, 58, 1.6], [40, 70], [58, 54, 1.8], [78, 68], [98, 60, 1.2]]);
        b.nebula([[2, 58], [30, 50], [60, 48], [98, 54], [98, 66], [60, 64], [30, 66], [2, 70]]);
        b.path([[2, 92, 1], [30, 88, 1.2], [70, 90, 1.2], [98, 88, 1]]);
      },
      nebulaShare: 0.3,
    },
  ],
  44: [
    {
      name: "The Cliff's Edge",
      theme: "Knowing when to stop will keep you from danger",
      keyPhrases: ["and knowing when to stop will keep you from danger"],
      draw: (b) => {
        b.path([[2, 60, 1.4], [30, 60, 1.6], [56, 60, 2], [58, 76, 1.4], [62, 96, 1.4]]);
        b.close(b.ring(40, 24, 5, 5, 1.8));
        const neck = b.star(40, 32, 1.6);
        const hips = b.star(40, 46, 1.8);
        b.line(neck, hips);
        b.line(hips, b.star(36, 60, 1.6));
        b.line(hips, b.star(46, 60, 1.6));
        b.line(neck, b.star(52, 32, 1.6));
        b.path([[72, 88, 1], [86, 84, 1.2], [98, 88, 1]]);
      },
    },
    {
      name: "The Standing Crane",
      theme: "And bring you a long, happy life",
      keyPhrases: ["and bring you a long, happy life."],
      draw: (b) => {
        b.loop([[56, 10, 2.2], [62, 12], [58, 16]]);
        b.line(b.star(62, 12), b.star(74, 18, 1.6));
        b.path([[58, 16], [52, 28], [56, 40, 1.4]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.loop([[56, 40], [66, 46], [64, 58, 1.6], [46, 66, 1.8], [30, 70, 2], [40, 54]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.path([[54, 62, 1.2], [54, 78], [54, 94, 1.8]].map(([x, y, g]) => [x, y, g ?? 1.2] as P));
        b.path([[54, 78], [46, 72, 1.4]].map(([x, y, g]) => [x, y, g ?? 1.2] as P));
      },
    },
    {
      name: "The Heart and the Gold",
      theme: "Which is more valuable, your possessions or your person?",
      keyPhrases: ["Which is more valuable, your possessions or your person?"],
      draw: (b) => {
        const beamL = b.star(14, 30, 2), beamR = b.star(86, 18, 2);
        const pivot = b.star(50, 24, 1.8);
        b.line(beamL, pivot, beamR);
        b.line(pivot, b.star(50, 90, 1.6));
        b.path([[36, 92, 1.6], [64, 92, 1.6]]);
        b.path([[4, 56, 1.4], [14, 30], [24, 56, 1.4]].map(([x, y, g]) => [x, y, g ?? 2] as P));
        b.path([[4, 56], [14, 60, 1.4], [24, 56]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.path([[76, 44, 1.4], [86, 18], [96, 44, 1.4]].map(([x, y, g]) => [x, y, g ?? 2] as P));
        b.path([[76, 44], [86, 48, 1.4], [96, 44]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.loop([[14, 52, 2.2], [10, 46, 1.4], [14, 44, 1.2], [18, 46, 1.4]]);
        b.pts([[82, 40, 1.8], [90, 40, 1.8], [86, 36, 1.8]]);
      },
    },
    {
      name: "The Single Sheaf",
      theme: "Knowing when you have enough avoids dishonor",
      keyPhrases: ["Knowing when you have enough avoids dishonor,"],
      draw: (b) => {
        const tie = b.path([[40, 54, 1.8], [60, 54, 1.8]]);
        void tie;
        for (const [tx, bx] of [[24, 34], [36, 42], [50, 50], [64, 58], [76, 66]]) {
          b.path([[tx, 14 + Math.abs(tx - 50) * 0.3, 1.8], [50 + (tx - 50) * 0.2, 54, 1], [bx, 92, 1.4]]);
        }
      },
    },
    {
      name: "The Resting Pavilion",
      theme: "Knowing when to stop will keep you from danger: a pavilion for rest on the way up",
      keyPhrases: ["and knowing when to stop will keep you from danger"],
      draw: (b) => {
        b.path([[2, 92, 1.4], [30, 60, 1.6], [48, 38], [66, 12, 2.4], [84, 40], [98, 56, 1.4]]);
        b.path([[26, 46, 1.8], [36, 38, 2], [46, 46, 1.8]]);
        b.path([[30, 46, 1.2], [30, 58, 1.4]]);
        b.path([[42, 46, 1.2], [42, 58, 1.4]]);
        b.path([[10, 94, 1], [20, 84, 1], [34, 72, 1], [40, 60, 1], [56, 36, 1], [62, 22, 1]]);
      },
    },
  ],
  45: [
    {
      name: "The Chipped Tea Bowl",
      theme: "The greatest accomplishments seem imperfect",
      keyPhrases: ["The greatest accomplishments seem imperfect,"],
      draw: (b) => {
        b.path([[14, 36, 1.8], [30, 34], [42, 38], [48, 34, 1.2], [56, 38], [72, 35], [86, 38, 1.8]]);
        b.path([[14, 36], [18, 56], [28, 72], [46, 80, 1.8], [66, 78], [80, 64], [86, 38]].map(([x, y, g]) => [x, y, g ?? 1.6] as P));
        b.path([[36, 88, 1.6], [62, 88, 1.6]]);
        b.path([[34, 44, 1], [44, 56, 1.2], [40, 66, 1]]);
      },
    },
    {
      name: "Fire and Ice",
      theme: "Movement overcomes the cold, and stillness overcomes the heat",
      keyPhrases: ["Movement overcomes the cold,"],
      draw: (b) => {
        b.loop([[28, 20, 2.4], [36, 36], [40, 52, 1.6], [34, 66], [26, 70, 1.8], [16, 64], [14, 50], [20, 42], [22, 52], [26, 36]]);
        const c = b.star(70, 50, 2);
        for (let i = 0; i < 6; i++) {
          const a = ((-90 + i * 60) * Math.PI) / 180;
          const mid = b.star(70 + 11 * Math.cos(a), 50 + 11 * Math.sin(a), 1.2);
          b.line(c, mid, b.star(70 + 22 * Math.cos(a), 50 + 22 * Math.sin(a), 1.8));
        }
      },
    },
    {
      name: "The Twisted Pine",
      theme: "The greatest straightness seems crooked",
      keyPhrases: ["The greatest straightness seems crooked."],
      draw: (b) => {
        b.path([[46, 94, 2], [54, 80], [42, 66], [56, 50], [46, 36], [52, 22, 1.8]].map(([x, y, g]) => [x, y, g ?? 1.6] as P));
        b.path([[20, 22, 1.4], [36, 14, 1.8], [52, 10, 2.2], [68, 14, 1.8], [84, 22, 1.4]]);
        b.path([[52, 22], [36, 14]].map(([x, y, g]) => [x, y, g ?? 1.8] as P));
        b.path([[52, 22], [68, 14]].map(([x, y, g]) => [x, y, g ?? 1.8] as P));
        b.path([[56, 50], [74, 44, 1.4], [88, 46, 1.6]].map(([x, y, g]) => [x, y, g ?? 1.6] as P));
        b.path([[42, 66], [24, 62, 1.4], [12, 66, 1.6]].map(([x, y, g]) => [x, y, g ?? 1.6] as P));
        b.path([[30, 94, 1.2], [70, 94, 1.2]]);
      },
    },
    {
      name: "The Moon in the Well",
      theme: "That which is pure and still is the universal ideal",
      keyPhrases: ["That which is pure and still is the universal ideal."],
      draw: (b) => {
        b.close(b.ring(50, 50, 40, 14, 1.8));
        b.close(b.ring(50, 50, 32, 12, 1.2, -75));
        b.close(b.ring(50, 50, 9, 7, 2.2));
      },
    },
    {
      name: "The Brush",
      theme: "The most valued skill seems like clumsiness",
      keyPhrases: ["The most valued skill seems like clumsiness."],
      draw: (b) => {
        b.path([[78, 6, 1.6], [70, 20], [62, 34], [56, 44, 1.6]]);
        b.loop([[56, 44], [62, 48, 1.4], [54, 62, 2.2], [50, 48, 1.4]].map(([x, y, g]) => [x, y, g ?? 1.6] as P));
        b.path([[10, 84, 2.2], [24, 76], [38, 80, 1.6], [52, 72], [66, 78, 1.4], [80, 70, 1.2], [90, 72, 1]]);
      },
    },
  ],
  46: [
    {
      name: "The Horse's Head",
      theme: "Horses run free to fertilize the fields",
      keyPhrases: ["horses run free to fertilize the fields."],
      draw: (b) => {
        b.path([[30, 94, 1.6], [34, 70], [40, 50], [44, 34], [48, 22, 1.6], [52, 10, 2], [58, 20, 1.6], [70, 30], [84, 46], [88, 56, 2], [80, 60], [66, 52], [60, 60], [62, 80], [66, 94, 1.6]]);
        b.path([[52, 10], [46, 6, 1.6], [48, 22]].map(([x, y, g]) => [x, y, g ?? 1.6] as P));
        b.star(64, 32, 2.4);
        b.path([[44, 30, 1.2], [36, 38, 1.4], [40, 46, 1.2], [32, 54, 1.4], [36, 62, 1.2]]);
      },
    },
    {
      name: "The Horseshoe",
      theme: "Whoever knows contentment will be at peace forever",
      keyPhrases: ["Whoever knows contentment will be at peace forever."],
      draw: (b) => {
        const outer = b.arc(50, 50, 38, 130, 410, 12, 1.8);
        b.line(...outer);
        const inner = b.arc(50, 50, 24, 130, 410, 8, 1.2);
        b.line(...inner);
        b.line(outer[0], inner[0]);
        b.line(outer[11], inner[7]);
        b.pts(b.arcPoints(50, 50, 31, 31, 160, 380, 6), 2);
      },
    },
    {
      name: "The Straw Hat",
      theme: "When the world follows the Tao: the farmer at peace in the fields",
      keyPhrases: ["When the world follows the Tao,"],
      draw: (b) => {
        b.path([[4, 62, 1.8], [26, 46], [50, 20, 2.6], [74, 46], [96, 62, 1.8]]);
        b.path([[4, 62], [30, 66, 1.2], [50, 68, 1.4], [70, 66, 1.2], [96, 62]].map(([x, y, g]) => [x, y, g ?? 1.8] as P));
        b.path([[36, 50, 1.2], [50, 52, 1.2], [64, 50, 1.2]]);
        b.path([[40, 68, 1], [44, 84, 1.4]]);
        b.path([[60, 68, 1], [56, 84, 1.4]]);
      },
    },
    {
      name: "The Furrowed Field",
      theme: "Horses run free to fertilize the fields",
      keyPhrases: ["horses run free to fertilize the fields."],
      draw: (b) => {
        b.path([[2, 44, 1.2], [98, 44, 1.2]]);
        for (const x of [2, 26, 50, 74, 98]) b.path([[50 + (x - 50) * 0.2, 44], [x, 96, 1.6]].map(([px, py, g]) => [px, py, g ?? 1] as P));
        b.close(b.ring(50, 28, 10, 8, 2));
        b.path([[14, 18, 1.2], [26, 14, 1.6], [34, 18, 1.2]]);
      },
    },
    {
      name: "The Open Gate",
      theme: "Horses run free",
      keyPhrases: ["horses run free to fertilize the fields."],
      draw: (b) => {
        b.path([[2, 52, 1.2], [16, 52, 1.2], [34, 52, 1.6]]);
        b.path([[2, 72, 1.2], [16, 72, 1.2], [34, 72, 1.6]]);
        b.path([[16, 44, 1.4], [16, 88, 1.4]]);
        b.path([[34, 40, 2], [34, 88, 1.8]]);
        b.path([[66, 40, 2], [66, 88, 1.8]]);
        b.path([[66, 52, 1.6], [84, 52, 1.2], [98, 52, 1.2]]);
        b.path([[66, 72, 1.6], [84, 72, 1.2], [98, 72, 1.2]]);
        b.path([[84, 44, 1.4], [84, 88, 1.4]]);
        b.loop([[34, 48, 1.4], [48, 36, 1.8], [48, 66, 1.8], [34, 78, 1.4]]);
        b.path([[2, 92, 1], [98, 92, 1]]);
      },
    },
  ],
  47: [
    {
      name: "The Closed Door",
      theme: "Without opening your door, you can know the whole world",
      keyPhrases: ["Without opening your door,"],
      draw: (b) => {
        b.loop([[26, 8, 1.8], [74, 8, 1.8], [74, 92, 1.8], [26, 92, 1.8]]);
        b.loop([[32, 16, 1.2], [68, 16, 1.2], [68, 46, 1.2], [32, 46, 1.2]]);
        b.loop([[32, 54, 1.2], [68, 54, 1.2], [68, 84, 1.2], [32, 84, 1.2]]);
        b.close(b.ring(62, 50, 3, 4, 1.8));
        b.path([[6, 92, 1.2], [94, 92, 1.2]]);
      },
    },
    {
      name: "The Round Window",
      theme: "Without looking out your window, you can understand the way",
      keyPhrases: ["Without looking out your window,"],
      draw: (b) => {
        b.close(b.ring(50, 50, 40, 12, 1.8));
        b.path([[10, 50, 1.2], [90, 50, 1.2]]);
        b.path([[50, 10, 1.2], [50, 90, 1.2]]);
        b.path([[22, 22, 1], [36, 36, 1]]);
        b.path([[78, 78, 1], [64, 64, 1]]);
        b.path([[78, 22, 1], [64, 36, 1]]);
        b.path([[22, 78, 1], [36, 64, 1]]);
        b.close(b.ring(50, 50, 10, 6, 1.4));
      },
    },
    {
      name: "The Hermit's Hut",
      theme: "The Master understands without leaving",
      keyPhrases: ["The Master understands without leaving,"],
      draw: (b) => {
        b.path([[2, 70, 1.4], [22, 36, 2], [36, 48], [60, 12, 2.6], [80, 40], [98, 60, 1.4]]);
        const roof = b.path([[40, 74, 1.6], [52, 64, 2], [64, 74, 1.6]]);
        void roof;
        b.path([[43, 74, 1.2], [43, 88, 1.4], [61, 88, 1.4], [61, 74, 1.2]]);
        b.star(52, 80, 2.4);
        b.path([[2, 92, 1], [98, 92, 1]]);
      },
    },
    {
      name: "The Globe on Its Stand",
      theme: "You can know the whole world",
      keyPhrases: ["you can know the whole world."],
      draw: (b) => {
        b.close(b.ring(50, 40, 28, 12, 1.8));
        b.path([[22, 40, 1.2], [50, 44, 1.4], [78, 40, 1.2]]);
        b.line(...b.arc(50, 40, 12, -90, 90, 5, 1.2, 28));
        b.line(...b.arc(50, 40, 34, 60, 220, 7, 1));
        b.path([[50, 68], [50, 86, 1.4]].map(([x, y, g]) => [x, y, g ?? 1] as P));
        b.path([[34, 92, 1.6], [50, 86], [66, 92, 1.6]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
      },
    },
    {
      name: "The Open Book",
      theme: "The more knowledge you seek, the less you will understand",
      keyPhrases: ["The more knowledge you seek,"],
      draw: (b) => {
        b.path([[6, 30, 1.8], [26, 24], [50, 34, 2], [74, 24], [94, 30, 1.8]]);
        b.path([[6, 30], [6, 78, 1.8], [26, 72], [50, 82, 2], [74, 72], [94, 78, 1.8], [94, 30]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.path([[50, 34], [50, 82]].map(([x, y]) => [x, y, 2] as P));
        for (const y of [40, 50, 60]) {
          b.path([[14, y, 1], [40, y + 4, 1]]);
          b.path([[60, y + 4, 1], [86, y, 1]]);
        }
      },
    },
  ],
  48: [
    {
      name: "The Waning Moon",
      theme: "Less and less remains until you arrive at non-action",
      keyPhrases: ["Less and less remains until you arrive at non-action."],
      draw: (b) => {
        b.close(b.ring(18, 36, 12, 8, 2));
        b.line(...b.arc(48, 50, 11, 90, 270, 4, 1.8));
        b.line(b.star(48, 39, 1.2), b.star(48, 61, 1.2));
        b.line(...b.arc(74, 64, 9, 110, 250, 4, 1.4), ...b.arc(70, 64, 8, 240, 120, 3, 1));
        b.close(b.ring(92, 80, 5, 5, 0.8));
      },
    },
    {
      name: "The Bonsai",
      theme: "One who seeks the Tao unlearns something new every day",
      keyPhrases: ["One who seeks the Tao unlearns something new every day."],
      draw: (b) => {
        b.loop([[20, 76, 1.6], [80, 76, 1.6], [72, 92, 1.6], [28, 92, 1.6]]);
        b.path([[48, 76, 1.8], [44, 64], [54, 52], [46, 40], [52, 30, 1.6]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.loop([[54, 52], [70, 44, 1.6], [86, 46, 1.8], [80, 54, 1.4], [66, 56, 1.4]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.loop([[46, 40], [30, 36, 1.6], [16, 40, 1.8], [22, 48, 1.4], [36, 48, 1.4]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.loop([[52, 30], [42, 20, 1.6], [52, 12, 2], [64, 18, 1.6], [62, 28, 1.4]].map(([x, y, g]) => [x, y, g ?? 1.6] as P));
      },
    },
    {
      name: "The Dandelion's Last Seeds",
      theme: "Less and less remains",
      keyPhrases: ["Less and less remains until you arrive at non-action."],
      draw: (b) => {
        const head = b.star(34, 44, 2.4);
        b.path([[34, 44], [36, 70, 1.2], [38, 96, 1.6]].map(([x, y, g]) => [x, y, g ?? 2.4] as P));
        for (const a of [-120, -60, -20]) {
          const r = (a * Math.PI) / 180;
          b.line(head, b.star(34 + 16 * Math.cos(r), 44 + 16 * Math.sin(r), 1.6));
        }
        for (const [x, y] of [[62, 32], [76, 22], [88, 12], [70, 46]]) b.line(b.star(x - 4, y + 4, 1), b.star(x, y, 1.8));
      },
    },
    {
      name: "The Stream round the Stone",
      theme: "Mastery of the world is achieved by letting things take their natural course",
      keyPhrases: ["by letting things take their natural course."],
      draw: (b) => {
        b.loop([[40, 50, 2], [46, 40, 2.2], [58, 40, 2], [62, 52, 1.8], [52, 58, 1.8]]);
        b.path([[2, 34, 1.2], [20, 36], [34, 32], [50, 30], [66, 32], [80, 38], [98, 36, 1.2]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.path([[2, 64, 1.2], [20, 62], [34, 66], [50, 68], [66, 66], [80, 60], [98, 62, 1.2]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.path([[6, 50, 1], [24, 50, 1.2]]);
        b.path([[76, 50, 1.2], [94, 50, 1]]);
      },
    },
    {
      name: "The Fading Cloud",
      theme: "Less and less remains",
      keyPhrases: ["Less and less remains until you arrive at non-action."],
      draw: (b) => {
        b.loop([[10, 50, 1.8], [8, 38], [18, 30, 2], [30, 32], [36, 22, 2], [50, 24], [54, 36], [48, 50, 1.6]]);
        b.path([[58, 42, 1.4], [64, 34, 1.6], [72, 36, 1.4], [74, 44, 1.2]]);
        b.path([[80, 30, 1.2], [86, 26, 1.2], [90, 32, 1]]);
        b.pts([[94, 22, 0.8], [66, 58, 1], [82, 50, 0.8]]);
        b.nebula([[8, 40], [18, 30], [36, 22], [54, 30], [48, 50], [10, 50]]);
      },
      nebulaShare: 0.25,
    },
  ],
  49: [
    {
      name: "The Mother Bird",
      theme: "She treats them all as her children",
      keyPhrases: ["They look to her in anticipation. Yet she treats them all as her children."],
      draw: (b) => {
        b.path([[12, 70, 1.6], [24, 84], [50, 90, 1.8], [76, 84], [88, 70, 1.6]]);
        b.path([[12, 70], [88, 70]].map(([x, y]) => [x, y, 1.6] as P));
        for (const x of [32, 50, 68]) b.line(b.star(x - 4, 70, 1), b.star(x, 58, 1.8), b.star(x + 4, 70, 1));
        const bird = b.loop([[62, 30, 1.6], [70, 20, 1.8], [80, 18, 2], [86, 24, 1.6], [84, 34], [74, 40]]);
        b.line(bird[3], b.star(92, 28, 1.4));
        b.line(bird[5], b.star(60, 44, 1.4));
        b.star(78, 23, 2.2);
      },
    },
    {
      name: "The Rain on All",
      theme: "To those who are good and those who aren't, she is good alike",
      keyPhrases: ["To those who aren't good she also treats as good."],
      draw: (b) => {
        b.loop([[20, 28, 1.6], [16, 18, 1.4], [26, 10, 1.8], [40, 10], [48, 4, 2], [62, 6], [70, 12, 1.8], [82, 14], [86, 24, 1.6], [76, 30], [50, 32]]);
        for (const [x, y] of [[26, 40], [42, 44], [58, 40], [74, 44]]) b.path([[x + 1, y - 4, 1], [x, y, 1.4]]);
        b.path([[26, 92, 1.6], [26, 72, 1.4]]);
        b.close(b.ring(26, 64, 8, 6, 1.6));
        b.path([[72, 92, 1.6], [76, 78, 1.4], [70, 66, 1.4], [78, 58, 1.8]]);
        b.path([[6, 92, 1.2], [94, 92, 1.2]]);
      },
    },
    {
      name: "The Moon in Every Pond",
      theme: "The Master has no mind of her own: one moon, reflected in every water",
      keyPhrases: ["The Master has no mind of her own."],
      draw: (b) => {
        b.close(b.ring(50, 20, 10, 8, 2));
        for (const [x, y, r] of [[18, 66, 14], [52, 80, 12], [82, 62, 12]]) {
          b.close(b.ring(x, y, r, 6, 1.2, 0, r * 0.4));
          b.star(x, y, 1.8);
        }
      },
    },
    {
      name: "The Swan and Cygnets",
      theme: "She treats them all as her children",
      keyPhrases: ["They look to her in anticipation. Yet she treats them all as her children."],
      draw: (b) => {
        b.loop([[36, 16, 1.8], [44, 12, 1.6], [48, 18, 1.4], [40, 22], [38, 40], [50, 50], [72, 44, 1.6], [90, 34, 1.8], [84, 56], [64, 66], [40, 66], [26, 56], [30, 40], [34, 22]]);
        b.line(b.star(36, 16), b.star(28, 18, 1.4));
        for (const x of [10, 22]) b.loop([[x, 76, 1.2], [x + 2, 70, 1.6], [x + 6, 76, 1.2], [x + 4, 80, 1.2]]);
        b.path([[2, 84, 1], [30, 82, 1.2], [60, 72, 1.2], [98, 70, 1]]);
      },
    },
    {
      name: "The Sun on Straight and Crooked",
      theme: "She trusts people who are trustworthy, and those who aren't",
      keyPhrases: ["She also trusts people who aren't trustworthy."],
      draw: (b) => {
        b.close(b.ring(50, 18, 9, 8, 2));
        for (const a of [150, 120, 60, 30]) {
          const r = (a * Math.PI) / 180;
          b.line(b.star(50 + 14 * Math.cos(r), 18 + 14 * Math.sin(r), 1), b.star(50 + 22 * Math.cos(r), 18 + 22 * Math.sin(r), 1.4));
        }
        b.path([[24, 92, 1.6], [24, 64], [24, 48, 1.8]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.path([[14, 60, 1.4], [24, 48], [34, 60, 1.4]].map(([x, y, g]) => [x, y, g ?? 1.8] as P));
        b.path([[76, 92, 1.6], [70, 78], [80, 66], [72, 54, 1.8]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.path([[84, 52, 1.4], [72, 54]].map(([x, y, g]) => [x, y, g ?? 1.8] as P));
        b.path([[4, 92, 1.2], [96, 92, 1.2]]);
      },
    },
  ],
  50: [
    {
      name: "The Tiger's Face",
      theme: "Those who celebrate life walk safely among the wild animals",
      keyPhrases: ["walk safely among the wild animals."],
      draw: (b) => {
        b.loop([[50, 20, 1.6], [66, 22], [78, 30, 1.6], [84, 46], [80, 64], [66, 78], [50, 84, 1.8], [34, 78], [20, 64], [16, 46], [22, 30, 1.6], [34, 22]]);
        b.loop([[22, 30], [18, 14, 1.8], [32, 20, 1.2]].map(([x, y, g]) => [x, y, g ?? 1.6] as P));
        b.loop([[78, 30], [82, 14, 1.8], [68, 20, 1.2]].map(([x, y, g]) => [x, y, g ?? 1.6] as P));
        b.pts([[38, 44, 2.6], [62, 44, 2.6]]);
        b.loop([[44, 58, 1.4], [56, 58, 1.4], [50, 64, 1.8]]);
        b.path([[50, 64], [42, 72, 1.2]].map(([x, y, g]) => [x, y, g ?? 1.8] as P));
        b.path([[50, 64], [58, 72, 1.2]].map(([x, y, g]) => [x, y, g ?? 1.8] as P));
        b.path([[50, 20], [50, 32, 1.2]].map(([x, y, g]) => [x, y, g ?? 1.6] as P));
      },
    },
    {
      name: "The Sun's Arc",
      theme: "Those who leave the womb at birth and those who enter their source at death",
      keyPhrases: ["Those who leave the womb at birth"],
      draw: (b) => {
        b.path([[2, 76, 1.2], [98, 76, 1.2]]);
        b.line(...b.arc(50, 76, 40, 180, 360, 9, 1));
        b.line(...b.arc(10, 76, 6, 180, 360, 4, 1.8));
        b.line(...b.arc(90, 76, 6, 180, 360, 4, 1.8));
        b.close(b.ring(50, 36, 7, 8, 2.2));
      },
    },
    {
      name: "The Dancer",
      theme: "Three out of ten celebrate life",
      keyPhrases: ["of these; three out of ten celebrate life,"],
      draw: (b) => {
        b.close(b.ring(46, 16, 6, 6, 1.8));
        const neck = b.star(48, 25, 1.8);
        const hips = b.star(52, 52, 2);
        b.line(neck, hips);
        b.line(neck, b.star(34, 20, 1.4), b.star(24, 8, 1.8));
        b.line(neck, b.star(64, 30, 1.4), b.star(80, 26, 1.8));
        b.line(hips, b.star(46, 72, 1.4), b.star(42, 92, 2));
        b.line(hips, b.star(68, 64, 1.4), b.star(86, 72, 1.8));
        b.line(...b.arc(52, 60, 16, 110, 250, 4, 1));
      },
    },
    {
      name: "The Coiled Snake",
      theme: "The animals find no place to attack them",
      keyPhrases: ["The animals find no place to attack them"],
      draw: (b) => {
        b.close(b.ring(50, 78, 30, 10, 1.6, 0, 10));
        b.close(b.ring(50, 64, 20, 8, 1.6, 0, 8));
        b.path([[50, 56, 1.4], [56, 44], [50, 32], [56, 22, 1.8]]);
        b.loop([[56, 22], [64, 16, 1.8], [70, 22, 1.6], [62, 28, 1.4]].map(([x, y, g]) => [x, y, g ?? 1.8] as P));
        b.path([[70, 22], [80, 20, 1.2], [84, 16, 1], [84, 24, 1]].map(([x, y, g]) => [x, y, g ?? 1.6] as P));
      },
    },
    {
      name: "The Elephant",
      theme: "Walking safely among the wild animals",
      keyPhrases: ["walk safely among the wild animals."],
      draw: (b) => {
        b.loop([[26, 40, 1.6], [40, 30], [62, 28, 1.8], [80, 36], [86, 50, 1.6], [82, 64], [70, 64], [60, 60], [40, 60], [30, 64], [22, 62]]);
        b.path([[26, 40], [16, 46], [12, 62], [14, 78, 1.8], [20, 74]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.path([[20, 74], [22, 62]].map(([x, y, g]) => [x, y, g ?? 1.4] as P));
        b.loop([[32, 40, 1.2], [44, 38, 1.4], [42, 54, 1.4], [34, 52, 1.2]]);
        b.star(28, 46, 2.2);
        for (const [x1, x2] of [[30, 30], [40, 40], [70, 70], [82, 80]]) b.path([[x1, x1 === 40 ? 60 : 64], [x2, 86, 1.8]].map(([x, y, g]) => [x, y, g ?? 1] as P));
        b.path([[86, 50], [92, 62, 1.2]].map(([x, y, g]) => [x, y, g ?? 1.6] as P));
      },
    },
  ],
};

export default c;
