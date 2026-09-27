import type { Candidate } from "../types.ts";
import { g, reuse, trigram, ichingLines, type P } from "./lib.ts";

const c: Record<number, Candidate[]> = {
  28: [
    {
      name: "The Taijitu",
      theme: "Know the white, yet keep to the black: yin and yang in one circle",
      keyPhrases: ["Know the white,"],
      draw: (b) => {
        b.close(b.ring(50, 50, 40, 16, 1.8));
        b.line(b.star(50, 10), ...b.arc(50, 30, 20, 270, 450, 5, 1.2).slice(1), ...b.arc(50, 70, 20, 270, 90, 5, 1.2).slice(1));
        b.star(50, 30, 2.8);
        b.close(b.ring(50, 70, 4, 4, 1.2));
        b.nebula([...b.arcPoints(50, 50, 40, 40, 90, 270, 8), ...b.arcPoints(50, 30, 20, 20, 270, 450, 5), ...b.arcPoints(50, 70, 20, 20, 270, 90, 5)]);
      },
      nebulaShare: 0.3,
    },
    reuse(28, "The Half Moon"),
  ],
  29: [
    reuse(29, "The Ding Cauldron"),
    {
      name: "The Peng and the Quail",
      theme: "Zhuangzi's giant Peng bird and the little quail: some are big and strong, others small",
      keyPhrases: ["Some are naturally big and strong,"],
      draw: (b) => {
        const body = b.path([[40, 40, 1.6], [52, 38, 2.2], [66, 34, 1.6], [74, 30, 2]]);
        b.line(body[1], ...b.pts([[40, 26], [24, 16, 1.6], [6, 14, 2]]));
        b.line(body[1], ...b.pts([[60, 24], [72, 12, 1.6], [86, 6, 2]]));
        b.line(body[0], b.star(28, 44, 1.6), b.star(32, 52, 1.6), body[0]);
        const q = b.star(70, 78, 1.8);
        b.line(b.star(62, 74, 1.2), q, b.star(78, 74, 1.2));
        b.path([[4, 92, 1], [40, 90, 1.2], [96, 92, 1]]);
      },
    },
  ],
  30: [
    {
      name: "Mars",
      theme: "♂, the planet of war",
      keyPhrases: ["don't use weapons to enforce their will."],
      draw: (b) => {
        const ring = b.ring(40, 60, 24, 12, 1.8, -45);
        b.close(ring);
        b.line(ring[0], b.star(70, 30, 1.2), b.star(86, 14, 2.4));
        b.line(b.star(64, 14, 1.6), b.star(86, 14), b.star(86, 36, 1.6));
      },
    },
    reuse(50, "The Tiger's Face", { name: "The White Tiger", theme: "Baihu, guardian of the west, autumn and war", keyPhrases: ["After armies take to war,"] }),
  ],
  31: [
    {
      name: "Scorpio",
      theme: "♏, the sign of death and endings",
      keyPhrases: ["The right side is reserved for mourning at a funeral."],
      draw: (b) => {
        b.path([[8, 30, 1.8], [8, 56], [8, 80, 1.6]]);
        b.path(g([[8, 38], [18, 28, 1.4], [28, 38], [28, 80, 1.6]], 1.2));
        b.path(g([[28, 38], [38, 28, 1.4], [48, 38], [48, 72], [56, 84], [70, 86], [86, 78, 2.4]], 1.2));
        b.line(b.star(76, 70, 1.4), b.star(86, 78), b.star(80, 90, 1.4));
      },
    },
    reuse(31, "The Weeping Willow", { theme: "The willow, Chinese emblem of parting and mourning" }),
  ],
  32: [
    {
      name: "The Vase of Sweet Dew",
      theme: "Guanyin's vase and willow sprig, sprinkling sweet dew on the world",
      keyPhrases: ["like sweet rain falling on paradise."],
      draw: (b) => {
        b.path([[44, 40, 1.4], [44, 50], [34, 62], [32, 76, 1.6], [40, 88], [50, 90, 1.8], [60, 88], [68, 76, 1.6], [66, 62], [56, 50], [56, 40, 1.4]]);
        b.path(g([[44, 40], [56, 40]], 1.4));
        b.path([[50, 40, 1.2], [56, 26, 1.4], [66, 16, 1.6], [80, 12, 2]]);
        b.path(g([[56, 26], [44, 16, 1.4], [38, 6, 1.6]], 1.4));
        b.pts([[84, 24, 1.4], [88, 36, 1.2], [80, 44, 1], [26, 20, 1.2]]);
      },
    },
    {
      name: "Neptune",
      theme: "♆, the trident of the sea to which every river runs",
      keyPhrases: ["flow through valleys to the sea."],
      draw: (b) => {
        b.path([[22, 16, 2.2], [22, 38], [30, 52], [50, 58, 1.4], [70, 52], [78, 38], [78, 16, 2.2]]);
        b.path([[50, 12, 2.4], [50, 36], [50, 58], [50, 92, 1.8]]);
        b.path([[36, 76, 1.6], [50, 76, 1.2], [64, 76, 1.6]]);
      },
    },
  ],
  33: [
    {
      name: "Sagittarius",
      theme: "♐, the arrow that flies to its mark",
      keyPhrases: ["Those who persist will reach their goal."],
      draw: (b) => {
        b.path([[14, 88, 1.8], [34, 68, 1.2], [56, 46, 1.2], [84, 16, 2.6]]);
        b.path([[58, 16, 1.6], [72, 16, 1.2], [84, 16]].map(([x, y, m]) => [x, y, m ?? 2.6] as P));
        b.path([[84, 16], [84, 30, 1.2], [84, 42, 1.6]].map(([x, y, m]) => [x, y, m ?? 2.6] as P));
        b.path([[26, 46, 1.6], [42, 60, 1.2], [58, 76, 1.6]]);
      },
    },
    {
      name: "The Carp at the Dragon Gate",
      theme: "The carp that keeps leaping until it clears the gate and becomes a dragon",
      keyPhrases: ["Those who keep their course have a strong will."],
      draw: (b) => {
        b.path([[6, 26, 1.8], [20, 22], [80, 22], [94, 26, 1.8]]);
        b.path([[18, 22, 1.2], [18, 92, 1.8]]);
        b.path([[82, 22, 1.2], [82, 92, 1.8]]);
        const fish = b.loop([[34, 58, 2.2], [42, 48], [54, 44], [62, 48, 1.6], [56, 56], [44, 60]]);
        b.line(fish[3], b.star(70, 38, 1.6), b.star(72, 50, 1.6), fish[3]);
        b.star(38, 54, 2);
        b.path([[2, 84, 1.2], [18, 80], [34, 86, 1.2], [50, 80, 1.4], [66, 86, 1.2], [82, 80], [98, 84, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
      },
    },
  ],
  34: [
    {
      name: "The Dragon",
      theme: "The Chinese dragon, winding through sky and water in every direction",
      keyPhrases: ["The great Tao flows unobstructed in every direction."],
      draw: (b) => {
        b.loop([[18, 20, 1.6], [28, 14, 1.6], [34, 22, 2], [26, 28, 1.4]]);
        b.path([[18, 20, 1.6], [10, 12, 1.8]]);
        b.path([[28, 14, 1.6], [26, 4, 1.8]]);
        b.star(26, 20, 2.6);
        const spine = b.path([[34, 22], [46, 30], [58, 26], [72, 32], [78, 46], [66, 56], [50, 58], [38, 66], [36, 80], [48, 90], [66, 88], [82, 80, 1.6], [94, 84, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        for (const i of [2, 5, 8, 10]) {
          const s = b.starAt(spine[i]);
          b.line(spine[i], b.star(s.x + (i % 2 ? -6 : 6), s.y + 9, 1.2));
        }
      },
    },
    {
      name: "The Canopy of Heaven",
      theme: "The old Chinese sky: a canopy spread over the earth, sheltering every world",
      keyPhrases: ["It nourishes infinite worlds,"],
      draw: (b) => {
        const dome = b.arc(50, 60, 44, 180, 360, 11, 1.6);
        b.line(...dome);
        b.path([[50, 16], [50, 60, 1.2], [50, 88, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[10, 88, 1.4], [50, 88], [90, 88, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.pts([[30, 38, 2.2], [70, 34, 2], [40, 50, 1.6], [62, 48, 2.4], [22, 54, 1.2], [80, 54, 1.4]]);
      },
    },
  ],
  35: [
    {
      name: "The Guqin",
      theme: "The seven-string zither of the sages: where there is music",
      keyPhrases: ["Where there is music and good food,"],
      draw: (b) => {
        b.loop([[8, 66, 1.8], [12, 58], [88, 30, 1.8], [94, 36], [92, 42], [14, 72]]);
        for (const dy of [-4, 0, 4]) b.path([[16, 64 + dy, 1], [88, 36 + dy, 1]]);
        b.pts([[40, 58, 1.8], [56, 52, 1.8], [72, 46, 1.8]]);
      },
    },
    {
      name: "The Treasure Bowl",
      theme: "Ju bao pen, the bowl that is never emptied however much is taken",
      keyPhrases: ["Yet if they put it to use, it would never be exhausted."],
      draw: (b) => {
        b.path([[12, 54, 1.8], [18, 72], [34, 84], [50, 86, 1.8], [66, 84], [82, 72], [88, 54, 1.8]]);
        b.path(g([[12, 54], [88, 54]], 1.8));
        b.path([[26, 54, 1.2], [30, 44], [40, 46, 1.6], [46, 36], [54, 36, 1.6], [60, 46], [70, 44], [74, 54, 1.2]]);
        for (const a of [-120, -90, -60]) {
          const r = (a * Math.PI) / 180;
          b.line(b.star(50 + 30 * Math.cos(r), 40 + 30 * Math.sin(r), 1), b.star(50 + 38 * Math.cos(r), 40 + 38 * Math.sin(r), 1.6));
        }
      },
    },
  ],
  36: [
    reuse(36, "The Folding Fan"),
    {
      name: "The Hidden Dragon",
      theme: "The I Ching's hidden dragon under the water: do not act yet",
      keyPhrases: ["it is best to keep weapons out of sight."],
      draw: (b) => {
        b.path([[2, 60, 1.2], [16, 60, 1.4], [30, 60, 1.2], [46, 60, 1.4], [62, 60, 1.2], [78, 60, 1.4], [98, 60, 1.2]]);
        b.line(...b.arc(23, 60, 12, 180, 360, 5, 1.6));
        b.line(...b.arc(54, 60, 14, 180, 360, 5, 1.8));
        b.line(...b.arc(89, 60, 7, 180, 360, 4, 1.4));
        b.loop([[2, 48, 1.4], [8, 40, 1.6], [14, 44, 2]]);
        b.path([[2, 76, 1], [30, 72, 1.2], [60, 76, 1], [98, 72, 1]]);
        b.pts([[40, 84, 1.8], [44, 86, 1]]);
      },
    },
  ],
  37: [
    {
      name: "Tai, Peace",
      theme: "Hexagram 11: earth above heaven, the sign of peace",
      keyPhrases: ["the world would naturally settle into peace."],
      draw: (b) => ichingLines(b, "000111", 16, 13.6),
    },
    reuse(37, "The Sleeping Cat"),
  ],
  38: [
    reuse(38, "The Pomegranate", { theme: "The pomegranate, Chinese emblem of abundance: the fruit, not the husk" }),
    {
      name: "Virgo",
      theme: "♍, the maiden of the harvest who carries the ripe grain",
      keyPhrases: ["She dwells in the Tao,"],
      draw: (b) => {
        b.path([[8, 28, 1.8], [8, 54], [8, 80, 1.6]]);
        b.path(g([[8, 36], [18, 26, 1.4], [28, 36], [28, 80, 1.6]], 1.2));
        b.path(g([[28, 36], [38, 26, 1.4], [48, 36], [48, 70], [58, 84], [72, 84], [78, 70], [68, 60], [56, 66], [52, 92, 2]], 1.2));
      },
    },
  ],
  39: [
    {
      name: "The Jade Disc",
      theme: "The bi, the jade disc offered to Heaven: Heaven attained unity and became pure",
      keyPhrases: ["Heaven attained unity and became pure."],
      draw: (b) => {
        b.close(b.ring(50, 50, 40, 16, 1.8));
        b.close(b.ring(50, 50, 14, 8, 1.6));
        b.pts(b.arcPoints(50, 50, 27, 27, 0, 330, 12), 1);
      },
    },
    {
      name: "The Pleiades",
      theme: "Mao, the seven sisters, a cluster that shines as one",
      keyPhrases: ["This is the power of unity."],
      draw: (b) => {
        b.path([[26, 40, 2.4], [40, 32, 2.6], [56, 36, 2.2], [52, 52, 2.8], [36, 56, 2.2], [26, 40]]);
        b.path([[56, 36], [72, 28, 2], [80, 40, 1.8]].map(([x, y, m]) => [x, y, m ?? 2.2] as P));
        b.pts([[46, 44, 1.2], [64, 50, 1.2], [30, 70, 1], [70, 66, 1], [18, 22, 1]]);
      },
    },
  ],
  40: [reuse(40, "The Comet"), reuse(40, "The Snail")],
  41: [
    {
      name: "The Temple Bell",
      theme: "The great bronze bell: the greatest sounds cannot be heard",
      keyPhrases: ["the greatest sounds cannot be heard,"],
      draw: (b) => {
        b.close(b.ring(50, 12, 5, 5, 1.6));
        b.path([[36, 20, 1.6], [50, 17, 1.2], [64, 20, 1.6]]);
        b.path([[36, 20], [32, 44], [28, 66], [22, 80, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[64, 20], [68, 44], [72, 66], [78, 80, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[22, 80], [50, 84, 1.4], [78, 80]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.path([[31, 50, 1], [69, 50, 1]]);
        b.pts([[42, 34, 1.4], [58, 34, 1.4], [50, 66, 2]]);
        b.path([[84, 60, 1.4], [96, 60, 1.4]]);
      },
    },
    reuse(41, "The Formless Cloud", { name: "The Nebula", theme: "The greatest image has no form: a cloud of stars" }),
  ],
  42: [
    {
      name: "The Triple Swirl",
      theme: "Three turning commas in one circle: the Two gave birth to Three",
      keyPhrases: ["The Two gave birth to Three."],
      draw: (b) => {
        b.close(b.ring(50, 50, 42, 15, 1.1));
        for (let k = 0; k < 3; k++) {
          const pts: P[] = [];
          for (let i = 0; i < 6; i++) {
            const a = ((k * 120 - 90 + i * 32) * Math.PI) / 180;
            const r = 4 + i * 6.4;
            pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a), i === 5 ? 2.4 : 1.4]);
          }
          b.path(pts);
        }
      },
    },
    reuse(42, "One, Two, Three", { keyPhrases: ["The Tao gave birth to One."] }),
  ],
  43: [
    {
      name: "Xun, the Wind",
      theme: "The wind trigram ☴, 'the penetrating': it enters where there is no space",
      keyPhrases: ["can enter where there is no space."],
      draw: (b) => trigram(b, "110"),
    },
    reuse(43, "The Dripping Stone"),
  ],
  44: [
    {
      name: "The Old Man Star",
      theme: "Canopus, the star of long life, seen low over the southern hills",
      keyPhrases: ["and bring you a long, happy life."],
      draw: (b) => {
        b.path([[2, 80, 1.4], [18, 66, 1.6], [30, 72], [48, 58, 1.8], [64, 70], [78, 62, 1.6], [98, 76, 1.4]]);
        b.star(50, 44, 3);
        b.close(b.ring(50, 44, 8, 6, 1));
        b.pts([[20, 20, 1.2], [36, 12, 1], [70, 16, 1.4], [86, 30, 1]]);
      },
    },
    {
      name: "The Sundial",
      theme: "The tilted Chinese sundial: knowing when to stop",
      keyPhrases: ["and knowing when to stop will keep you from danger"],
      draw: (b) => {
        b.close(b.ring(50, 44, 30, 12, 1.6, 0, 14));
        b.path([[28, 70, 1.8], [50, 44, 2.2], [72, 18, 1.4]]);
        b.path([[40, 58], [36, 90, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[60, 58], [64, 90, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[26, 90, 1.4], [74, 90, 1.4]]);
      },
    },
  ],
  45: [
    reuse(45, "Fire and Ice", { name: "Fire and Water", theme: "Li and Kan, fire and water: movement overcomes the cold, stillness the heat" }),
    {
      name: "The Full Moon",
      theme: "That which is pure and still",
      keyPhrases: ["That which is pure and still is the universal ideal."],
      draw: (b) => {
        b.close(b.ring(50, 50, 32, 14, 2));
        b.pts([[40, 40, 1.2], [58, 38, 1], [46, 58, 1.2], [62, 60, 1]]);
      },
    },
  ],
  46: [
    {
      name: "The Heavenly Horse",
      theme: "The great square of Pegasus, the horse running free across the sky",
      keyPhrases: ["horses run free to fertilize the fields."],
      draw: (b) => {
        b.loop([[36, 40, 2.4], [70, 38, 2.4], [72, 70, 2.2], [38, 72, 2.2]]);
        b.path([[36, 40], [22, 30, 1.6], [12, 34, 1.8], [4, 26, 1.4]].map(([x, y, m]) => [x, y, m ?? 2.4] as P));
        b.path([[70, 38], [84, 26, 1.4], [94, 14, 1.8]].map(([x, y, m]) => [x, y, m ?? 2.4] as P));
        b.path([[70, 38], [86, 44, 1.2], [96, 56, 1.6]].map(([x, y, m]) => [x, y, m ?? 2.4] as P));
      },
    },
    reuse(65, "The Big Dipper", { name: "The Plough", theme: "The Big Dipper, the plough of the sky: horses fertilize the fields", keyPhrases: ["When the world follows the Tao,"] }),
  ],
  47: [
    {
      name: "The Armillary Sphere",
      theme: "The astronomer's rings, showing the whole sky without going outside",
      keyPhrases: ["you can know the whole world."],
      draw: (b) => {
        b.close(b.ring(50, 42, 30, 12, 1.8));
        b.close(b.ring(50, 42, 30, 10, 1.1, 0, 9));
        b.path([[22, 30, 1.2], [50, 44, 1], [78, 54, 1.2]]);
        b.path([[40, 8, 1.6], [50, 42, 2.2], [60, 76, 1.6]]);
        b.path([[36, 92, 1.6], [50, 80, 1.4], [64, 92, 1.6]]);
      },
    },
    {
      name: "The Oracle Shell",
      theme: "The cracked tortoise shell of Shang divination: seeing without looking",
      keyPhrases: ["sees clearly without looking,"],
      draw: (b) => {
        b.loop([[30, 14, 1.6], [70, 14, 1.6], [80, 36], [78, 64], [66, 86, 1.6], [34, 86, 1.6], [22, 64], [20, 36]]);
        b.path([[50, 20, 1.2], [50, 50, 1.4], [50, 80, 1.2]]);
        b.path([[50, 40], [66, 32, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.path([[50, 62, 1.4], [34, 54, 1.8]]);
      },
    },
  ],
  48: [
    reuse(36, "The Setting Sun", { theme: "Less and less remains until you arrive at non-action", keyPhrases: ["Less and less remains until you arrive at non-action."] }),
    {
      name: "Sun, the Decrease",
      theme: "Hexagram 41, Decrease: the one who unlearns something every day",
      keyPhrases: ["One who seeks the Tao unlearns something new every day."],
      draw: (b) => ichingLines(b, "100011", 16, 13.6),
    },
  ],
  49: [
    reuse(49, "The Moon in Every Pond", { theme: "One moon, reflected alike in ten thousand waters" }),
    {
      name: "Kun, the Receptive",
      theme: "The earth trigram ☷, the mother who takes in all her children",
      keyPhrases: ["She understands the mind of the people."],
      draw: (b) => trigram(b, "000"),
    },
  ],
  50: [
    {
      name: "The Rhinoceros",
      theme: "The rhinoceros finds no place to gore them",
      keyPhrases: ["walk safely among the wild animals."],
      draw: (b) => {
        b.loop([[26, 44, 1.6], [40, 36], [62, 34, 1.8], [80, 40], [88, 52, 1.6], [84, 64], [66, 66], [40, 66], [26, 62]]);
        b.path([[26, 44], [16, 42], [8, 50, 1.6], [12, 58], [26, 62]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.path([[12, 44, 1.2], [8, 30, 2.4]]);
        b.path([[18, 42], [18, 34, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.path([[30, 38, 1.2], [32, 30, 1.4]]);
        b.star(22, 48, 2);
        for (const [x, dx] of [[34, 0], [44, 1], [70, 0], [80, 1]]) b.path([[x, 66], [x + dx, 86, 1.8]].map(([px, py, m]) => [px, py, m ?? 1] as P));
      },
    },
    {
      name: "Leo",
      theme: "The lion of the sky, fearless among the wild animals",
      keyPhrases: ["I have heard that those who celebrate life"],
      draw: (b) => {
        b.path([[30, 16, 1.8], [22, 22, 1.6], [22, 32, 1.8], [30, 38, 1.6], [36, 50, 2.8]]);
        b.path([[36, 50], [60, 44, 2.2], [88, 62, 2.4], [62, 66, 2], [36, 50]].map(([x, y, m]) => [x, y, m ?? 2.8] as P));
        b.path([[36, 50], [40, 72, 1.6]].map(([x, y, m]) => [x, y, m ?? 2.8] as P));
        b.path([[88, 62], [94, 76, 1.4]].map(([x, y, m]) => [x, y, m ?? 2.4] as P));
        b.pts([[50, 30, 1], [74, 84, 1]]);
      },
    },
  ],
  51: [
    reuse(51, "The Hatching Chick"),
    {
      name: "The Silkworm's Cocoon",
      theme: "Sheltered in its cocoon on the mulberry leaf until it is complete",
      keyPhrases: ["helps them to grow and shelters them."],
      draw: (b) => {
        b.loop([[10, 70, 1.8], [30, 52], [56, 44], [82, 46, 1.8], [70, 66], [44, 78]]);
        b.path([[10, 70, 1.8], [46, 60, 1.2], [82, 46]]);
        b.loop([[36, 40, 1.8], [44, 30], [58, 26], [68, 30, 1.8], [62, 40], [48, 44]]);
        b.path([[44, 30, 1], [48, 44, 1]]);
        b.path([[58, 26], [62, 40]].map(([x, y]) => [x, y, 1.6] as P));
      },
    },
  ],
  52: [
    {
      name: "The Moon and Her Children",
      theme: "Once we have found the Mother, we know what her children should be",
      keyPhrases: ["we begin to know what Her children should be."],
      draw: (b) => {
        const outer = b.arc(42, 46, 26, 110, 250, 7, 2);
        const inner = b.arc(52, 46, 22, 125, 235, 5, 1.2);
        b.line(outer[0], ...inner, outer[6]);
        b.line(...outer);
        b.pts([[70, 30, 2], [78, 50, 1.6], [66, 66, 1.8], [84, 72, 1.2], [86, 28, 1.2], [60, 84, 1]]);
      },
    },
    {
      name: "Li, the Light",
      theme: "The fire trigram ☲, clarity and inner light",
      keyPhrases: ["To use your inner light for understanding"],
      draw: (b) => trigram(b, "101"),
    },
  ],
  53: [
    {
      name: "The Gold Ingot",
      theme: "The boat-shaped yuanbao: to waste all of your money buying possessions",
      keyPhrases: ["and to waste all of your money buying possessions"],
      draw: (b) => {
        b.path([[6, 44, 2], [18, 52], [30, 70], [50, 76, 1.8], [70, 70], [82, 52], [94, 44, 2]]);
        b.path([[6, 44], [22, 58, 1.2], [78, 58, 1.2], [94, 44]].map(([x, y, m]) => [x, y, m ?? 2] as P));
        b.line(...b.arc(50, 58, 20, 180, 360, 7, 1.8));
        b.star(50, 46, 2.6);
      },
    },
    {
      name: "The Rat",
      theme: "The granary rat: the granaries will soon become empty",
      keyPhrases: ["and the granaries will soon become empty"],
      draw: (b) => {
        b.loop([[20, 56, 2], [34, 44], [54, 40, 1.6], [70, 46], [76, 60, 1.6], [60, 66], [36, 64]]);
        b.close(b.ring(34, 38, 5, 5, 1.4));
        b.star(28, 52, 2.2);
        b.path([[76, 60], [86, 70, 1.2], [90, 82, 1.2], [84, 92, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[36, 64, 1], [34, 74, 1.4]]);
        b.path([[60, 66], [62, 74, 1.4]].map(([x, y, m]) => [x, y, m ?? 1] as P));
        b.path([[20, 56], [12, 54, 1.2]].map(([x, y, m]) => [x, y, m ?? 2] as P));
      },
    },
  ],
  54: [
    reuse(54, "The Rings of Virtue"),
    {
      name: "The Chinese Knot",
      theme: "That which is well latched can not slip away",
      keyPhrases: ["That which is well latched"],
      draw: (b) => {
        b.loop([[50, 18, 1.8], [80, 46, 1.8], [50, 74, 1.8], [20, 46, 1.8]]);
        b.path([[35, 32, 1.2], [65, 60, 1.2]]);
        b.path([[65, 32, 1.2], [35, 60, 1.2]]);
        b.close(b.ring(50, 10, 6, 5, 1.4, 90));
        b.path([[50, 74], [50, 82, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        for (const x of [44, 50, 56]) b.path([[50, 82], [x, 96, 1.2]].map(([px, py, m]) => [px, py, m ?? 1.4] as P));
      },
    },
  ],
};

export default c;
