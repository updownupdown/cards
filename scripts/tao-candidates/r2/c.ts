import type { Candidate } from "../types.ts";
import { g, reuse, trigram, ichingLines, type P } from "./lib.ts";

const c: Record<number, Candidate[]> = {
  55: [
    {
      name: "The Young Moon",
      theme: "The newborn moon, a thin bright rim holding the whole disc",
      keyPhrases: ["One who is filled with the Tao"],
      draw: (b) => {
        const outer = b.arc(50, 50, 34, 100, 260, 8, 2.2);
        const inner = b.arc(58, 50, 32, 112, 248, 6, 1.2);
        b.line(outer[0], ...inner, outer[7]);
        b.line(...outer);
        b.pts(b.arcPoints(50, 50, 34, 34, -70, 70, 6), 0.7);
      },
    },
    {
      name: "The Noon Sun",
      theme: "When something reaches its prime it will soon begin to decline",
      keyPhrases: ["it will soon begin to decline."],
      draw: (b) => {
        b.path([[2, 84, 1.2], [98, 84, 1.2]]);
        b.line(...b.arc(50, 84, 42, 180, 270, 5, 1));
        b.pts(b.arcPoints(50, 84, 42, 42, 290, 360, 4), 0.8);
        b.close(b.ring(50, 42, 7, 7, 2.2));
      },
    },
  ],
  56: [
    reuse(14, "The Ensō", { theme: "The Zen circle drawn in one breath: harmonize your inner light", keyPhrases: ["harmonize your inner light,"] }),
    reuse(56, "The Incense Stick"),
  ],
  57: [
    reuse(57, "The Sky Lanterns", { theme: "Lanterns of the festival, let go into the sky: I let go of all my desires" }),
    reuse(57, "The Broken Chain"),
  ],
  58: [
    {
      name: "The Bat",
      theme: "Fu, the bat, whose name sounds like 'good fortune' in Chinese",
      keyPhrases: ["and disaster lurks with good fortune."],
      draw: (b) => {
        b.loop([[46, 44, 1.6], [54, 44, 1.6], [58, 58], [50, 66, 1.8], [42, 58]]);
        b.path([[46, 44], [44, 36, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[54, 44], [56, 36, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path(g([[44, 50], [30, 38, 1.4], [16, 36], [4, 44, 2], [14, 52, 1.2], [20, 62, 1.2], [30, 60, 1.2], [36, 68, 1.2], [44, 60]], 1.4));
        b.path(g([[56, 50], [70, 38, 1.4], [84, 36], [96, 44, 2], [86, 52, 1.2], [80, 62, 1.2], [70, 60, 1.2], [64, 68, 1.2], [56, 60]], 1.4));
      },
    },
    {
      name: "Jupiter",
      theme: "♃, the planet of good fortune",
      keyPhrases: ["and bad things often turn out for good."],
      draw: (b) => {
        b.path([[16, 30, 1.8], [24, 18, 1.4], [36, 16, 1.4], [42, 26, 1.4], [36, 44, 1.4], [22, 62, 1.8]]);
        b.path([[22, 62], [44, 62, 1.2], [64, 62, 1.4], [86, 62, 2]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.path([[64, 14, 2], [64, 38, 1.2], [64, 62], [64, 90, 2]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
      },
    },
  ],
  59: [
    reuse(59, "The Ginseng Root"),
    {
      name: "The Lingzhi Mushroom",
      theme: "The mushroom of immortality: you will be long enduring",
      keyPhrases: ["then you will be long enduring."],
      draw: (b) => {
        b.loop([[14, 50, 1.8], [18, 34], [32, 22, 1.6], [50, 18, 2], [68, 22, 1.6], [82, 34], [86, 50, 1.8], [70, 54], [50, 52], [30, 54]]);
        b.path([[26, 44, 1], [36, 34, 1.2], [50, 30, 1.4], [64, 34, 1.2], [74, 44, 1]]);
        b.path([[48, 53, 1.2], [44, 70, 1.4], [50, 86, 1.4], [46, 96, 1.8]]);
      },
    },
  ],
  60: [
    {
      name: "Pisces",
      theme: "♓, the two fish",
      keyPhrases: ["Governing a large country"],
      draw: (b) => {
        b.line(...b.arc(-4, 50, 40, -50, 50, 6, 1.8));
        b.line(...b.arc(104, 50, 40, 130, 230, 6, 1.8));
        b.path([[26, 50, 1.4], [40, 50, 1.2], [50, 50, 1.6], [60, 50, 1.2], [74, 50, 1.4]]);
      },
    },
    reuse(60, "The Fading Ghost", { theme: "Gui, the ghosts: when the Tao governs, evil loses its power to harm" }),
  ],
  61: [
    {
      name: "Venus",
      theme: "♀, the sign of the feminine, which overcomes by its position",
      keyPhrases: ["The female overcomes the male by the power of her position."],
      draw: (b) => {
        b.close(b.ring(50, 34, 22, 12, 1.8, 90));
        b.path([[50, 56], [50, 74, 1.2], [50, 94, 2]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.path([[32, 76, 1.8], [50, 76, 1.2], [68, 76, 1.8]]);
      },
    },
    {
      name: "The Great and Little Dippers",
      theme: "The large and the small, each keeping its place round the pole",
      keyPhrases: ["If a large country takes the low position,"],
      draw: (b) => {
        b.path([[4, 76, 2.4], [18, 70, 2.2], [30, 70, 2.2], [40, 76, 2], [42, 90, 2.2], [60, 90, 2.4], [60, 76, 2.2], [40, 76]]);
        b.path([[56, 18, 2.8], [66, 24, 1.6], [74, 32, 1.6], [80, 40, 1.8], [92, 38, 1.6], [92, 50, 1.4], [80, 52, 1.6], [80, 40]]);
      },
    },
  ],
  62: [
    {
      name: "The Purple Enclosure",
      theme: "Ziwei, the walled palace of Heaven round the pole star: the tabernacle of creation",
      keyPhrases: ["The Tao is the tabernacle of creation,"],
      draw: (b) => {
        b.line(...b.arc(50, 50, 38, 110, 250, 7, 1.6));
        b.line(...b.arc(50, 50, 38, -70, 70, 7, 1.6));
        b.star(50, 50, 3);
        b.pts([[42, 40, 1.4], [58, 58, 1.4], [44, 60, 1.2]]);
      },
    },
    {
      name: "The Dragon's Pearl",
      theme: "The flaming pearl the dragons chase: a treasure for those who are good",
      keyPhrases: ["Why was the Tao esteemed by the ancient Masters?"],
      draw: (b) => {
        b.close(b.ring(50, 56, 18, 10, 1.8));
        b.star(46, 52, 2.8);
        for (const [a, len] of [[-150, 26], [-110, 32], [-70, 32], [-30, 26]]) {
          const r = (a * Math.PI) / 180;
          const bx = 50 + 18 * Math.cos(r), by = 56 + 18 * Math.sin(r);
          b.line(b.star(bx, by), b.star(bx + len * 0.5 * Math.cos(r + 0.4), by + len * 0.5 * Math.sin(r + 0.4), 1.2), b.star(bx + len * Math.cos(r), by + len * Math.sin(r), 1.6));
        }
      },
    },
  ],
  63: [reuse(63, "The Spark"), reuse(63, "The Ant")],
  64: [
    {
      name: "The Sun Tree",
      theme: "Fusang, the tree at the edge of the world where the suns rest",
      keyPhrases: ["The tallest tree"],
      draw: (b) => {
        const trunk = b.path([[50, 94, 2], [50, 70], [50, 50, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[4, 94, 1.2], [96, 94, 1.2]]);
        for (const [x, y] of [[20, 36], [40, 22], [62, 20], [82, 34]]) {
          b.line(trunk[2], b.star(x, y + 8, 1.2));
          b.close(b.ring(x, y, 5, 5, 1.8));
        }
        b.line(trunk[1], b.star(30, 58, 1.2));
        b.line(trunk[1], b.star(70, 58, 1.2));
      },
    },
    {
      name: "The Great Peng",
      theme: "Zhuangzi's bird that flies ninety thousand li: a journey of a thousand miles",
      keyPhrases: ["A journey of a thousand miles"],
      draw: (b) => {
        const body = b.path([[36, 54, 1.6], [50, 50, 2.4], [64, 46, 1.6], [74, 40, 2]]);
        b.line(body[1], ...b.pts([[38, 34, 1.4], [22, 22, 1.4], [4, 18, 2]]));
        b.line(body[1], ...b.pts([[60, 30, 1.4], [76, 14, 1.4], [94, 6, 2]]));
        b.line(body[0], b.star(24, 60, 1.6), b.star(28, 68, 1.6), body[0]);
        b.path([[6, 82, 1.2], [18, 76, 1.4], [30, 80, 1.2], [40, 76, 1.4], [50, 82, 1.2]]);
        b.path([[58, 90, 1], [72, 84, 1.2], [86, 88, 1], [96, 84, 1.2]]);
      },
    },
  ],
  65: [
    reuse(65, "The Labyrinth"),
    {
      name: "The Weaving Maiden",
      theme: "Vega, the weaver girl at her loom in the sky: remaining aware of the pattern",
      keyPhrases: ["Remaining aware of the pattern is a virtue."],
      draw: (b) => {
        b.path([[40, 20, 3], [50, 34, 1.6], [58, 32, 1.4], [40, 20]]);
        b.loop([[50, 34], [58, 32], [66, 74, 1.8], [56, 78, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[6, 88, 1], [30, 70, 1.2], [60, 46, 1], [96, 22, 1]]);
        b.pts([[20, 40, 1.2], [84, 60, 1], [78, 12, 1]]);
      },
    },
  ],
  66: [
    reuse(66, "The Hundred Streams"),
    {
      name: "Dui, the Lake",
      theme: "The lake trigram ☱, the low water that all streams fill",
      keyPhrases: ["Rivers and seas are rulers"],
      draw: (b) => trigram(b, "011"),
    },
  ],
  67: [reuse(67, "The Triple Gem"), reuse(67, "The Compassionate Warrior")],
  68: [
    reuse(68, "The Tai Chi Master"),
    reuse(68, "The Crane Stance", { name: "White Crane Spreads Its Wings", theme: "The tai chi posture: strength without violence, in harmony with the heavens" }),
  ],
  69: [
    {
      name: "Dun, the Retreat",
      theme: "Hexagram 33, Retreat: better to retreat a foot than advance an inch",
      keyPhrases: ["It is better to retreat a foot"],
      draw: (b) => ichingLines(b, "111100", 16, 13.6),
    },
    reuse(69, "The Teardrop"),
  ],
  70: [
    reuse(70, "The Bamboo Book", { theme: "The bamboo slips the ancients wrote on: my teachings come from the ancients" }),
    reuse(70, "The Geode", { name: "Jade in the Rough", theme: "The sage in rough cloth keeps the jade within: few know it, so it is precious" }),
  ],
  71: [
    reuse(71, "The Serpent and Staff", { name: "The Serpent Bearer", theme: "Ophiuchus, the healer holding the serpent: recognize the illness and seek a cure" }),
    reuse(71, "The Ginkgo Leaf", { theme: "The ginkgo of Chinese medicine: she sees her illnesses and treats them" }),
  ],
  72: [
    reuse(72, "Two Hearts"),
    {
      name: "The Mandarin Ducks",
      theme: "The pair that never parts, each respecting the other",
      keyPhrases: ["by respecting them they will in turn respect you."],
      draw: (b) => {
        for (const [x, d] of [[34, 1], [66, -1]] as const) {
          b.loop([[x - 18 * d, 62, 1.6], [x - 10 * d, 52], [x + 4 * d, 50], [x + 8 * d, 40, 1.4], [x + 14 * d, 36, 1.8], [x + 18 * d, 42, 1.4], [x + 12 * d, 50], [x + 14 * d, 62, 1.6]]);
          b.path([[x + 18 * d, 40], [x + 22 * d, 40, 1.6]].map(([px, py, m]) => [px, py, m ?? 1.4] as P));
          b.star(x + 12 * d, 40, 2.2);
        }
        b.path([[2, 70, 1.2], [26, 68, 1.4], [50, 70, 1.2], [74, 68, 1.4], [98, 70, 1.2]]);
      },
    },
  ],
  73: [reuse(73, "The Web in the Corner"), reuse(73, "The Cast Net")],
  74: [
    reuse(74, "The Great Boots"),
    {
      name: "Wu Gang and the Laurel",
      theme: "The woodcutter on the moon, forever felling a tree that heals itself",
      keyPhrases: ["trying to take the place of a great lumberjack. Trying to fill his shoes will only get them seriously hurt."],
      draw: (b) => {
        b.close(b.ring(50, 50, 42, 14, 1.2));
        b.path([[40, 80, 1.8], [40, 60], [40, 44, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.loop([[40, 44], [24, 40, 1.6], [26, 24, 1.8], [42, 16, 2], [56, 24, 1.8], [56, 40, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.path([[30, 80, 1.2], [62, 80, 1.2]]);
        b.path([[72, 78, 1.4], [62, 60, 1.4], [56, 50, 1.2]]);
        b.loop([[56, 50], [50, 46, 1.6], [54, 40, 1.8], [60, 44, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
      },
    },
  ],
  75: [reuse(75, "The Letting Leaf"), reuse(75, "The Tipped Scale")],
  76: [reuse(76, "The Willow in the Wind", { theme: "The willow, Chinese emblem of yielding: the living are soft" }), reuse(76, "The Fiddlehead Fern")],
  77: [reuse(77, "The Drawn Bow"), reuse(77, "The Moon Bow")],
  78: [reuse(78, "The Sea Arch"), reuse(78, "The Wave on the Cliff")],
  79: [reuse(79, "The Split Tally", { theme: "The Master holds her half of the tally and makes no demands, as in Laozi's own words" }), reuse(79, "The Moon over Both Banks")],
  80: [reuse(80, "The Barking Dog", { theme: "The dog of the Chinese zodiac, barking in the next village" }), reuse(80, "The Two Villages")],
  81: [reuse(81, "The Western Pass"), reuse(81, "The Road into the Sunset")],
};

export default c;
