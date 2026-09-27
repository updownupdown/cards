import type { Candidate } from "../types.ts";
import { g, reuse, trigram, ichingLines } from "./lib.ts";

const c: Record<number, Candidate[]> = {
  1: [
    {
      name: "Wuji, the Empty Circle",
      theme: "The nameless: the empty circle drawn before yin and yang divide",
      keyPhrases: ["The nameless is the boundary of Heaven and Earth."],
      draw: (b) => {
        b.close(b.ring(50, 50, 40, 16, 1.8));
        b.close(b.ring(50, 50, 30, 12, 0.9, -75));
      },
    },
    {
      name: "The Black Tortoise",
      theme: "Xuanwu, the dark warrior of the north: xuan is the 'darkness' and 'mystery' of this chapter",
      keyPhrases: ["This source is called darkness."],
      draw: (b) => {
        b.line(...b.arc(48, 64, 32, 180, 360, 9, 1.8, 26));
        b.path([[16, 64, 1.6], [80, 64, 1.6]]);
        b.path([[32, 46, 1.2], [40, 60, 1.2], [56, 60, 1.2], [64, 46, 1.2]]);
        b.loop([[80, 64], [88, 54, 1.6], [96, 58, 2], [90, 68, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[26, 64, 1.2], [22, 78, 1.8]]);
        b.path([[70, 64, 1.2], [74, 78, 1.8]]);
        b.path([[16, 64], [8, 58, 1.4], [12, 44, 1.2], [26, 34, 1.4], [44, 28, 1.2], [60, 24, 1.4], [70, 14, 1.6], [78, 10, 2.2]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[2, 88, 1], [98, 88, 1]]);
      },
    },
  ],
  2: [
    {
      name: "Gemini",
      theme: "The twins: pairs that produce and define each other",
      keyPhrases: ["Being and non-being produce each other."],
      draw: (b) => {
        b.path([[18, 12, 2], [34, 18, 1.4], [50, 19, 1.2], [66, 18, 1.4], [82, 12, 2]]);
        b.path([[18, 88, 2], [34, 82, 1.4], [50, 81, 1.2], [66, 82, 1.4], [82, 88, 2]]);
        b.path([[34, 18], [36, 40, 1.4], [36, 60, 1.4], [34, 82]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[66, 18], [64, 40, 1.4], [64, 60, 1.4], [66, 82]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
      },
    },
    reuse(42, "The Koi Circle", { theme: "Two koi circling as one: being and non-being produce each other", keyPhrases: ["Being and non-being produce each other."] }),
  ],
  3: [
    {
      name: "Taurus",
      theme: "The bull of earth and possessions",
      keyPhrases: ["If you overvalue possessions,"],
      draw: (b) => {
        b.close(b.ring(50, 64, 22, 12, 1.8));
        b.line(...b.arc(50, 10, 32, 15, 165, 9, 1.6));
        b.starAt(b.star(50 + 32 * Math.cos((15 * Math.PI) / 180), 10 + 32 * Math.sin((15 * Math.PI) / 180))).mag = 2.4;
      },
    },
    {
      name: "The Pig",
      theme: "Filling their bellies: the contented pig of the Chinese zodiac",
      keyPhrases: ["filling their bellies,"],
      draw: (b) => {
        b.loop([[20, 44, 1.6], [34, 32], [56, 30, 1.8], [74, 36], [82, 46], [80, 62], [64, 70], [40, 70], [22, 64], [16, 54]]);
        b.close(b.ring(86, 52, 5, 5, 1.6, 0, 6));
        b.pts([[89, 51, 1.2]]);
        b.loop([[70, 34], [74, 22, 1.8], [80, 36, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.star(76, 44, 2.4);
        for (const [x, dx] of [[30, -1], [40, 1], [62, -1], [72, 1]]) b.path([[x, x === 40 ? 70 : 69, 1], [x + dx, 84, 1.8]]);
        b.path([[16, 54], [8, 50, 1.2], [10, 42, 1.4], [16, 44, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
      },
    },
  ],
  4: [
    {
      name: "Kan, the Abyss",
      theme: "The water trigram ☵, 'the abysmal': infinitely deep",
      keyPhrases: ["Infinitely deep, it is the source of all things."],
      draw: (b) => trigram(b, "010"),
    },
    reuse(4, "The Gourd", { name: "The Immortal's Gourd", theme: "The Taoist immortal's gourd that never empties and never fills" }),
  ],
  5: [
    reuse(5, "The Straw Dog", { name: "The Dog", theme: "The straw dog of the rites, and the dog of the Chinese zodiac" }),
    {
      name: "Libra",
      theme: "The scales: Heaven and Earth are impartial",
      keyPhrases: ["The Master doesn't take sides;"],
      draw: (b) => {
        b.path([[10, 80, 2], [30, 80, 1.2], [50, 80, 1.4], [70, 80, 1.2], [90, 80, 2]]);
        const bump = b.arc(50, 60, 16, 180, 360, 7, 1.6);
        b.line(b.star(10, 60, 2), b.star(24, 60, 1.2), bump[0]);
        b.line(...bump);
        b.line(bump[6], b.star(76, 60, 1.2), b.star(90, 60, 2));
      },
    },
  ],
  6: [
    {
      name: "The Auspicious Cloud",
      theme: "Xiangyun, the curling cloud of Chinese art: like a vapor, barely seen",
      keyPhrases: ["It is like a vapor,"],
      draw: (b) => {
        const sp = (cx: number, cy: number, r: number, dir: number, start: number): [number, number, number][] =>
          Array.from({ length: 7 }, (_, i) => {
            const a = ((start + dir * i * 55) * Math.PI) / 180;
            const rr = r * (1 - i * 0.12);
            return [cx + rr * Math.cos(a), cy + rr * Math.sin(a), i === 6 ? 2.2 : 1.4];
          });
        b.path(sp(30, 48, 18, 1, 90));
        b.path(sp(66, 40, 22, -1, 90));
        b.path([[30, 66, 1.2], [48, 66, 1.4], [66, 62, 1.2]]);
        b.path([[6, 74, 1.2], [20, 70, 1.4], [30, 66]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        b.path([[66, 62], [84, 66, 1.4], [96, 78, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
      },
    },
    {
      name: "Cancer",
      theme: "The moon's own sign, the sign of the mother",
      keyPhrases: ["It is called the Great Mother"],
      draw: (b) => {
        b.close(b.ring(30, 40, 10, 7, 1.8));
        b.path([[30, 30], [46, 22, 1.4], [64, 20, 1.4], [82, 26, 2]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
        b.close(b.ring(70, 60, 10, 7, 1.8, 90));
        b.path([[70, 70], [54, 78, 1.4], [36, 80, 1.4], [18, 74, 2]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
      },
    },
  ],
  7: [
    {
      name: "The Sun",
      theme: "☉, which shines for everyone and keeps nothing for itself",
      keyPhrases: ["thus they are present for all beings."],
      draw: (b) => {
        b.close(b.ring(50, 50, 22, 12, 1.8));
        b.star(50, 50, 3);
        for (let i = 0; i < 8; i++) {
          const a = ((i * 45) * Math.PI) / 180;
          b.line(b.star(50 + 30 * Math.cos(a), 50 + 30 * Math.sin(a), 1), b.star(50 + 42 * Math.cos(a), 50 + 42 * Math.sin(a), 1.6));
        }
      },
    },
    reuse(15, "The Alert Deer", { name: "The Deer of Long Life", theme: "Lu, the deer that stands for long life in Chinese art", keyPhrases: ["and the earth is long enduring."] }),
  ],
  8: [
    {
      name: "Aquarius",
      theme: "The water bearer's waves",
      keyPhrases: ["The supreme good is like water,"],
      draw: (b) => {
        for (const y of [38, 64]) b.path([[8, y, 2], [22, y - 12, 1.4], [36, y, 1.4], [50, y - 12, 1.8], [64, y, 1.4], [78, y - 12, 1.4], [92, y, 2]]);
      },
    },
    {
      name: "The Heavenly River",
      theme: "The Milky Way, the river of the sky, gathering every small star",
      keyPhrases: ["It gathers in unpopular places."],
      draw: (b) => {
        b.path([[2, 76, 1.4], [22, 66, 1.4], [40, 54, 1.6], [58, 44, 1.4], [78, 32, 1.4], [98, 22, 1.4]]);
        b.path([[2, 92, 1.2], [24, 82, 1.2], [44, 70, 1.4], [62, 60, 1.2], [80, 50, 1.2], [98, 40, 1.2]]);
        b.nebula([[2, 76], [40, 54], [98, 22], [98, 40], [44, 70], [2, 92]]);
        b.pts([[30, 30, 2.6], [70, 76, 2.6], [20, 22, 1.2], [84, 84, 1.2]]);
      },
      nebulaShare: 0.35,
    },
  ],
  9: [
    {
      name: "The Full Moon Wanes",
      theme: "When the moon is full, it begins to wane",
      keyPhrases: ["than one that is filled to the brim."],
      draw: (b) => {
        b.close(b.ring(32, 40, 18, 10, 2));
        const outer = b.arc(72, 64, 16, 110, 250, 5, 1.8);
        const inner = b.arc(78, 64, 14, 125, 235, 4, 1);
        b.line(outer[0], ...inner, outer[4]);
        b.line(...outer);
        b.pts([[56, 30, 1], [86, 26, 1.2]]);
      },
    },
    reuse(9, "The Knife"),
  ],
  10: [
    {
      name: "The Moon Rabbit",
      theme: "The jade rabbit on the moon, pounding the elixir of life",
      keyPhrases: ["Giving birth and nourishing,"],
      draw: (b) => {
        b.close(b.ring(50, 50, 42, 14, 1.4));
        b.loop([[34, 70, 1.6], [30, 58], [36, 48], [46, 46, 1.6], [50, 56], [48, 70, 1.6]]);
        b.close(b.ring(46, 38, 6, 5, 1.6));
        b.path([[44, 32, 1.2], [38, 18, 1.8]]);
        b.path([[48, 32, 1.2], [48, 16, 1.8]]);
        b.loop([[58, 64, 1.4], [70, 64, 1.4], [68, 74, 1.4], [60, 74, 1.4]]);
        b.path([[52, 52, 1.2], [66, 50, 1.6]]);
      },
    },
    reuse(10, "The Lotus"),
  ],
  11: [
    {
      name: "The Zodiac Wheel",
      theme: "Twelve houses round an empty centre",
      keyPhrases: ["but it is the center hole", "that allows the wheel to function."],
      draw: (b) => {
        const outer = b.ring(50, 50, 42, 12, 2, -75);
        const inner = b.ring(50, 50, 24, 12, 1.2, -75);
        b.close(outer);
        b.close(inner);
        outer.forEach((id, i) => b.line(id, inner[i]));
      },
    },
    reuse(3, "The Square-Holed Coin", { theme: "The old coin: its empty centre is what threads it", keyPhrases: ["but the emptiness is what we use."] }),
  ],
  12: [
    {
      name: "The Five Elements",
      theme: "Wu Xing: wood, fire, earth, metal and water in their two cycles",
      keyPhrases: ["Five colors blind the eye."],
      draw: (b) => {
        const ring = b.ring(50, 52, 38, 15, 1.1);
        b.close(ring);
        const nodes = [0, 3, 6, 9, 12].map((i) => ring[i]);
        nodes.forEach((id) => (b.starAt(id).mag = 2.8));
        b.line(nodes[0], nodes[2], nodes[4], nodes[1], nodes[3], nodes[0]);
      },
    },
    {
      name: "The Monkey",
      theme: "The restless 'monkey mind': too much activity deranges the mind",
      keyPhrases: ["Too much activity deranges the mind."],
      draw: (b) => {
        b.close(b.ring(44, 22, 9, 8, 1.6));
        b.pts([[40, 22, 2], [48, 22, 2]]);
        b.close(b.ring(29, 22, 4, 4, 1.4, 45));
        b.close(b.ring(59, 22, 4, 4, 1.4, 45));
        b.loop([[40, 34, 1.4], [50, 34, 1.4], [58, 50], [56, 70, 1.6], [36, 70, 1.6], [32, 50]]);
        b.path([[40, 38], [28, 50, 1.2], [26, 62, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[56, 44, 1.2], [70, 36, 1.4], [76, 26, 1.8]]);
        b.path([[56, 70], [70, 80, 1.4], [84, 76, 1.4], [88, 64, 1.4], [82, 56, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[40, 70], [36, 86, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
      },
    },
  ],
  13: [
    {
      name: "The Scorpion",
      theme: "The creature that can sting itself: the reason I have an enemy is my 'self'",
      keyPhrases: ["The reason I have an enemy is because I have \"self\"."],
      draw: (b) => {
        b.loop([[36, 60, 1.6], [46, 52], [58, 54, 1.6], [62, 62], [56, 72], [42, 72]]);
        b.path([[58, 58], [70, 56, 1.2], [80, 48, 1.4], [84, 36, 1.4], [80, 24, 1.6], [70, 20, 1.8], [64, 26, 2.6]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[38, 58], [26, 50, 1.2], [18, 40, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.loop([[18, 40], [10, 32, 1.6], [16, 28, 1.2], [24, 34, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
        b.path([[38, 66], [24, 70, 1.2], [14, 64, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.2] as [number, number, number]));
        for (const x of [44, 52]) b.path([[x, 72, 1], [x - 4, 84, 1.4]]);
      },
    },
    {
      name: "The Earth",
      theme: "⊕: love the whole world as if it were your self",
      keyPhrases: ["Love the whole world as if it were your self;"],
      draw: (b) => {
        b.close(b.ring(50, 50, 38, 16, 1.8));
        b.path([[12, 50, 1.8], [31, 50, 1.2], [50, 50, 2.2], [69, 50, 1.2], [88, 50, 1.8]]);
        b.path([[50, 12, 1.8], [50, 31, 1.2], [50, 50], [50, 69, 1.2], [50, 88, 1.8]].map(([x, y, m]) => [x, y, m ?? 2.2] as [number, number, number]));
      },
    },
  ],
  14: [
    {
      name: "The Three Stars",
      theme: "Shen, the three stars of the hunter's belt: three treated as one",
      keyPhrases: ["so we treat them as The One."],
      draw: (b) => {
        b.path([[36, 58, 2.6], [50, 50, 2.6], [64, 42, 2.6]]);
        b.path([[22, 14, 2], [40, 26, 1], [36, 58]].map(([x, y, m]) => [x, y, m ?? 2.6] as [number, number, number]));
        b.path([[80, 16, 1.6], [66, 30, 1], [64, 42]].map(([x, y, m]) => [x, y, m ?? 2.6] as [number, number, number]));
        b.path([[36, 58], [30, 72, 1], [24, 88, 1.8]].map(([x, y, m]) => [x, y, m ?? 2.6] as [number, number, number]));
        b.path([[64, 42], [70, 70, 1], [78, 86, 2.2]].map(([x, y, m]) => [x, y, m ?? 2.6] as [number, number, number]));
        b.pts([[52, 62, 1.2], [53, 68, 1], [54, 74, 1.2]]);
      },
    },
    reuse(14, "The Infinity Loop"),
  ],
  15: [
    {
      name: "Capricorn",
      theme: "The sign of midwinter",
      keyPhrases: ["The Sages of old were profound"],
      draw: (b) => {
        b.path([[12, 22, 2], [20, 50, 1.4], [28, 76, 1.8], [36, 50, 1.4], [44, 24, 1.6], [52, 46, 1.4], [58, 66, 1.4], [62, 80, 1.8]]);
        b.close(b.ring(73, 72, 10, 7, 1.6, 150));
        b.path([[66, 80], [58, 92, 1.4], [48, 94, 2]].map(([x, y, m]) => [x, y, m ?? 1.6] as [number, number, number]));
      },
    },
    {
      name: "The Pine in the Snow",
      theme: "The pine that stays green through winter: who can be still",
      keyPhrases: ["Who can be still"],
      draw: (b) => {
        b.path([[50, 6, 2.4], [36, 30, 1.6], [44, 30, 1.2], [28, 54, 1.6], [40, 54, 1.2], [20, 80, 1.8], [80, 80, 1.8], [60, 54, 1.2], [72, 54, 1.6], [56, 30, 1.2], [64, 30, 1.6], [50, 6]]);
        b.path([[47, 80, 1.2], [47, 92, 1.4]]);
        b.path([[53, 80, 1.2], [53, 92, 1.4]]);
        b.pts([[12, 20, 1.4], [86, 14, 1.2], [18, 50, 1], [88, 44, 1.4], [8, 72, 1.2], [92, 72, 1]]);
      },
    },
  ],
  16: [
    {
      name: "Fu, the Return",
      theme: "Hexagram 24: one yang line returning at the bottom",
      keyPhrases: ["Returning to the source is tranquility"],
      draw: (b) => ichingLines(b, "000001", 16, 13.6),
    },
    reuse(16, "The Moon's Return"),
  ],
  17: [
    {
      name: "The Pole Star",
      theme: "It stays still while the whole sky turns round it",
      keyPhrases: ["The best leaders are those the people hardly know exist."],
      draw: (b) => {
        b.path([[26, 22, 3], [38, 30, 1.6], [48, 40, 1.6], [58, 52, 1.8], [60, 70, 1.8], [82, 72, 2.2], [80, 54, 1.8], [58, 52]]);
        b.pts([[10, 60, 1], [64, 12, 1], [90, 36, 1.2], [20, 86, 1]]);
      },
    },
    {
      name: "The Cowherd Star",
      theme: "Altair, the cowherd, with his two flanking stars across the Heavenly River",
      keyPhrases: ["When she has accomplished her task,"],
      draw: (b) => {
        b.path([[20, 62, 1.6], [30, 56, 2.8], [40, 50, 1.6]]);
        b.path([[6, 36, 1.2], [30, 24, 1.2], [56, 14, 1.2]]);
        b.path([[40, 92, 1.2], [66, 78, 1.2], [96, 62, 1.2]]);
        b.nebula([[6, 36], [56, 14], [96, 62], [40, 92]]);
        b.loop([[76, 28, 2.8], [84, 34, 1.4], [82, 44, 1.2], [74, 40, 1.2]]);
      },
      nebulaShare: 0.3,
    },
  ],
  18: [
    reuse(65, "The Fox", { name: "The Fox Spirit", theme: "Huli jing, the fox that takes a false shape: hypocrisy close behind", keyPhrases: ["hypocrisy is close behind."] }),
    reuse(18, "Two Masks"),
  ],
  19: [
    {
      name: "Heaven Round, Earth Square",
      theme: "The old Chinese picture of the world, with us at its centre",
      keyPhrases: ["to keep us at the center of the circle, so we must also:"],
      draw: (b) => {
        b.close(b.ring(50, 50, 42, 16, 1.6));
        b.loop([[30, 30, 1.8], [70, 30, 1.8], [70, 70, 1.8], [30, 70, 1.8]]);
        b.star(50, 50, 3);
      },
    },
    {
      name: "The Goat",
      theme: "The gentle goat of the Chinese zodiac: embrace simplicity",
      keyPhrases: ["Embrace simplicity."],
      draw: (b) => {
        b.loop([[40, 36, 1.4], [60, 36, 1.4], [58, 56], [54, 70], [50, 76, 1.8], [46, 70], [42, 56]]);
        b.path([[40, 36], [30, 26, 1.4], [18, 28, 1.6], [16, 40, 1.4], [24, 46, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.path([[60, 36], [70, 26, 1.4], [82, 28, 1.6], [84, 40, 1.4], [76, 46, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.pts([[44, 46, 2.2], [56, 46, 2.2]]);
        b.path([[50, 76], [48, 86, 1.2], [50, 94, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.8] as [number, number, number]));
      },
    },
  ],
  20: [
    reuse(21, "The Butterfly", { name: "The Butterfly Dream", theme: "Zhuangzi dreamt he was a butterfly, and woke not knowing which he was", keyPhrases: ["I am like a fool, my mind is in chaos."] }),
    {
      name: "The Empty Boat",
      theme: "Zhuangzi's empty boat, drifting with no one aboard",
      keyPhrases: ["I drift on the waves on the ocean,"],
      draw: (b) => {
        b.path([[18, 56, 2], [28, 68], [50, 72, 1.6], [72, 68], [84, 54, 2]]);
        b.path([[18, 56], [84, 54]].map(([x, y]) => [x, y, 2] as [number, number, number]));
        b.path([[2, 80, 1.2], [16, 76, 1.4], [30, 80, 1.2], [44, 84, 1.4], [58, 80, 1.2], [72, 76, 1.4], [86, 80, 1.2], [98, 84, 1.2]]);
        b.close(b.ring(76, 22, 8, 7, 1.8));
        b.pts([[20, 20, 1.2], [44, 12, 1]]);
      },
    },
  ],
  21: [
    {
      name: "The Cicada",
      theme: "Secluded in the dark earth for years, then reborn: the Chinese emblem of renewal",
      keyPhrases: ["Secluded and dark, yet there is a vitality within it."],
      draw: (b) => {
        b.close(b.ring(50, 22, 8, 6, 1.6));
        b.pts([[46, 20, 2.2], [54, 20, 2.2]]);
        b.loop([[42, 30, 1.4], [58, 30, 1.4], [60, 56], [54, 80], [50, 86, 1.8], [46, 80], [40, 56]]);
        b.loop([[44, 32], [22, 44, 1.4], [16, 70, 1.6], [26, 90, 1.8], [40, 70]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
        b.loop([[56, 32], [78, 44, 1.4], [84, 70, 1.6], [74, 90, 1.8], [60, 70]].map(([x, y, m]) => [x, y, m ?? 1.4] as [number, number, number]));
      },
    },
    reuse(4, "The Ancient Tortoise", { name: "The Luo River Tortoise", theme: "The tortoise whose shell carried the Luo Shu, the first magic square: within it we find order", keyPhrases: ["Within it we can find order."] }),
  ],
  22: [
    reuse(50, "The Coiled Snake", { name: "The Snake", theme: "The snake that sheds its old skin to become new", keyPhrases: ["If you want to become new,"] }),
    reuse(19, "The Bamboo", { theme: "Bamboo bends and does not break, and is hollow inside", keyPhrases: ["If you want to become straight,"] }),
  ],
  23: [
    {
      name: "Zhen, the Thunder",
      theme: "The thunder trigram ☳: nature speaks briefly, and then is still",
      keyPhrases: ["Nature uses few words:"],
      draw: (b) => trigram(b, "001"),
    },
    reuse(23, "The Lightning Bolt"),
  ],
  24: [
    {
      name: "The Frog in the Well",
      theme: "Zhuangzi's frog, boasting of its well to the turtle of the sea",
      keyPhrases: ["can't know how wrong they are."],
      draw: (b) => {
        b.close(b.ring(50, 66, 34, 12, 1.6, 0, 10));
        b.path([[16, 66, 1.2], [18, 92, 1.8], [82, 92, 1.8], [84, 66, 1.2]]);
        b.path([[28, 62, 1.4], [34, 54, 1.2], [42, 54, 1.2], [50, 56, 1.2], [58, 54, 1.2], [66, 54, 1.2], [72, 62, 1.4]]);
        b.close(b.ring(38, 46, 6, 5, 1.4, 90));
        b.close(b.ring(62, 46, 6, 5, 1.4, 90));
        b.pts([[38, 45, 2.4], [62, 45, 2.4]]);
        b.pts([[30, 14, 1.2], [70, 20, 1.4], [50, 8, 1]]);
      },
    },
    {
      name: "Aries",
      theme: "The charging ram: those who rush ahead don't get very far",
      keyPhrases: ["Those who rush ahead"],
      draw: (b) => {
        b.path([[50, 90, 1.8], [50, 66, 1.2], [50, 44, 1.6]]);
        b.path(g([[50, 44], [44, 28, 1.4], [34, 18], [22, 18], [14, 28, 1.6], [16, 40, 2.2]], 1.4));
        b.path(g([[50, 44], [56, 28, 1.4], [66, 18], [78, 18], [86, 28, 1.6], [84, 40, 2.2]], 1.4));
      },
    },
  ],
  25: [
    {
      name: "The Four Images",
      theme: "The Great Ultimate and the four quarters: Tao, Heaven, Earth and Humanity",
      keyPhrases: ["Within the universe, these are the four great things."],
      draw: (b) => {
        b.close(b.ring(50, 50, 30, 14, 1.4));
        b.line(...b.arc(50, 35, 15, 270, 450, 4, 1.2));
        b.line(...b.arc(50, 65, 15, 270, 90, 4, 1.2));
        b.pts([[50, 35, 2.2], [50, 65, 1.2]]);
        for (const [x, y] of [[50, 6], [94, 50], [50, 94], [6, 50]]) b.star(x, y, 2.6);
      },
    },
    reuse(1, "The Cosmic Egg", { name: "The Egg of Pangu", theme: "Before the universe: the egg from which Pangu split Heaven from Earth", keyPhrases: ["Before the universe was born"] }),
  ],
  26: [
    {
      name: "Gen, Keeping Still",
      theme: "The mountain trigram ☶: stillness is the standard of activity",
      keyPhrases: ["Stillness is the standard of activity."],
      draw: (b) => trigram(b, "100"),
    },
    {
      name: "Saturn",
      theme: "♄, the heaviest and slowest of the old planets",
      keyPhrases: ["Heaviness is the basis of lightness."],
      draw: (b) => {
        b.path([[36, 8, 2], [36, 30, 1.2], [36, 56, 1.6]]);
        b.path([[20, 22, 1.8], [36, 22, 1.2], [52, 22, 1.8]]);
        b.path(g([[36, 50], [48, 40, 1.4], [62, 42], [68, 54, 1.6], [62, 68], [54, 80], [60, 92, 2.2]], 1.4));
      },
    },
  ],
  27: [
    reuse(27, "The Crane in Flight", { theme: "The crane, messenger of the immortals, leaves no tracks in the sky" }),
    {
      name: "Mercury",
      theme: "☿, planet of travellers, speakers and bookkeepers",
      keyPhrases: ["and a skillful speaker is well rehearsed."],
      draw: (b) => {
        b.line(...b.arc(50, 10, 16, 20, 160, 5, 1.6));
        b.close(b.ring(50, 40, 14, 9, 1.8, 90));
        b.path([[50, 54, 1.4], [50, 72, 1.2], [50, 92, 2]]);
        b.path([[36, 76, 1.6], [50, 76, 1.2], [64, 76, 1.6]]);
      },
    },
  ],
};

export default c;
