import type { Candidate } from "../types.ts";

type P = [number, number, number];
const g = (points: [number, number, number?][], mag: number): P[] =>
  points.map(([x, y, m]) => [x, y, m ?? mag]);

const c: Record<number, Candidate[]> = {
  51: [
    {
      name: "The Seedling in Hands",
      theme: "It cares for them, nurtures them, and helps them to grow",
      keyPhrases: ["helps them to grow and shelters them."],
      draw: (b) => {
        b.path([[6, 50, 1.8], [12, 66], [26, 78], [42, 82, 1.6], [50, 80, 1.4], [58, 82, 1.6], [74, 78], [88, 66], [94, 50, 1.8]]);
        b.path([[14, 54, 1.2], [26, 62, 1.2], [40, 66, 1.4], [50, 64, 1.4], [60, 66, 1.4], [74, 62, 1.2], [86, 54, 1.2]]);
        b.path(g([[50, 64], [50, 46, 1.4], [50, 30, 1.8]], 1.4));
        b.loop(g([[50, 46], [36, 36, 1.6], [26, 38, 1.8], [36, 46, 1.2]], 1.4));
        b.loop(g([[50, 38, 1.2], [62, 26, 1.6], [74, 26, 1.8], [64, 36, 1.2]], 1.4));
      },
    },
    {
      name: "The Nest in the Branches",
      theme: "Gives them a place of refuge and peace",
      keyPhrases: ["gives them a place of refuge and peace,"],
      draw: (b) => {
        b.path([[2, 70, 1.4], [30, 62, 1.6], [60, 56, 1.6], [98, 44, 1.4]]);
        b.path(g([[60, 56], [76, 70, 1.4], [90, 76, 1.6]], 1.6));
        b.path(g([[30, 62], [22, 50, 1.4], [16, 40, 1.6]], 1.6));
        b.path([[30, 42, 1.8], [36, 52], [50, 56, 1.6], [64, 52], [70, 42, 1.8]]);
        b.path(g([[30, 42], [70, 42]], 1.8));
        b.pts([[42, 38, 2.2], [50, 36, 2.4], [58, 38, 2.2]]);
      },
    },
    {
      name: "The Hatching Chick",
      theme: "The Tao gives birth to all of creation",
      keyPhrases: ["The Tao gives birth to all of creation."],
      draw: (b) => {
        b.path([[22, 56, 1.6], [20, 70], [28, 84], [50, 92, 2], [72, 84], [80, 70], [78, 56, 1.6]]);
        b.path(g([[22, 56], [30, 50, 1.4], [38, 58, 1.4], [46, 50, 1.4], [54, 58, 1.4], [62, 50, 1.4], [70, 58, 1.4], [78, 56]], 1.6));
        b.close(b.ring(50, 36, 12, 8, 1.6));
        b.star(46, 33, 2.4);
        b.loop([[36, 34, 1.4], [30, 36, 1.6], [36, 38, 1.4]]);
        b.pts([[20, 30, 1], [80, 26, 1.2]]);
      },
    },
    {
      name: "Sun and Rain on the Sprout",
      theme: "The Tao gives them birth, and its virtue cultivates them",
      keyPhrases: ["So the Tao gives them birth,"],
      draw: (b) => {
        b.close(b.ring(22, 20, 8, 7, 2));
        b.loop([[58, 22, 1.4], [56, 14], [64, 8, 1.6], [76, 8], [82, 14, 1.6], [90, 18], [88, 24, 1.4]]);
        for (const x of [64, 74, 84]) b.path([[x + 1, 30, 1], [x, 36, 1.2]]);
        b.path([[6, 90, 1.2], [50, 90, 1.4], [94, 90, 1.2]]);
        b.path(g([[50, 90], [50, 72, 1.4], [50, 58, 1.8]], 1.4));
        b.loop(g([[50, 72], [38, 62, 1.6], [30, 64, 1.4]], 1.4));
        b.loop(g([[50, 66, 1.2], [62, 56, 1.6], [70, 58, 1.4]], 1.4));
      },
    },
    {
      name: "The Tree Rings",
      theme: "Their environment then shapes them into completion",
      keyPhrases: ["Their environment then shapes them into completion."],
      draw: (b) => {
        b.close(b.ring(50, 50, 42, 14, 1.8, -90, 40));
        b.close(b.ring(52, 49, 28, 10, 1.2, -80, 26));
        b.close(b.ring(53, 48, 15, 7, 1.2, -70, 14));
        b.star(54, 48, 2.6);
        b.path([[86, 30, 1], [70, 42, 1.2]]);
      },
    },
  ],
  52: [
    {
      name: "The Mother Tree",
      theme: "Once we have found the Mother, we begin to know what Her children should be",
      keyPhrases: ["we begin to know what Her children should be."],
      draw: (b) => {
        b.loop([[30, 20, 1.6], [42, 8, 2], [58, 8, 1.8], [70, 20, 1.6], [66, 34], [50, 38], [34, 34]]);
        b.path([[50, 38, 1.2], [50, 84, 2]]);
        b.path([[4, 84, 1.2], [50, 84], [96, 84, 1.2]].map(([x, y, m]) => [x, y, m ?? 2] as P));
        for (const [x, h] of [[16, 18], [80, 20], [92, 12]]) {
          b.path([[x, 84], [x, 84 - h, 1.2]].map(([px, py, m]) => [px, py, m ?? 1.2] as P));
          b.close(b.ring(x, 84 - h - 5, 5, 4, 1.6));
        }
      },
    },
    {
      name: "The Magnifying Glass",
      theme: "To understand the small is called clarity",
      keyPhrases: ["To understand the small is called clarity."],
      draw: (b) => {
        const lens = b.ring(40, 40, 28, 12, 1.8, 45);
        b.close(lens);
        b.line(lens[0], ...b.pts([[72, 72, 1.6], [84, 84, 1.6], [94, 94, 2.2]]));
        b.star(40, 40, 3);
        b.pts([[34, 34, 1.2], [46, 36, 1], [38, 48, 1]]);
      },
    },
    {
      name: "The Firefly",
      theme: "Use your inner light for understanding",
      keyPhrases: ["To use your inner light for understanding"],
      draw: (b) => {
        b.close(b.ring(60, 40, 5, 5, 1.4));
        b.close(b.ring(46, 50, 10, 6, 1.4, 30, 6));
        b.loop([[52, 42, 1.2], [44, 24, 1.6], [34, 30, 1.4]]);
        b.loop([[58, 46, 1.2], [66, 28, 1.6], [76, 34, 1.4]]);
        b.star(30, 60, 3);
        b.close(b.ring(30, 60, 9, 6, 0.9));
        b.path([[63, 36, 1], [70, 26, 1.2]]);
      },
    },
    {
      name: "The Bowing Bamboo",
      theme: "Knowing how to yield is called strength",
      keyPhrases: ["Knowing how to yield is called strength."],
      draw: (b) => {
        const stalk = b.path([[22, 96, 1.8], [24, 78, 1.6], [30, 60, 1.6], [40, 44, 1.6], [54, 32, 1.6], [70, 26, 1.6], [86, 26, 1.8]]);
        for (const i of [1, 2, 3, 4, 5]) {
          const s = b.starAt(stalk[i]);
          b.line(stalk[i], b.star(s.x + 8, s.y + 10, 1.4));
        }
        b.path([[4, 30, 1], [16, 28, 1.2]]);
        b.path([[2, 44, 1], [14, 42, 1.2]]);
      },
    },
    {
      name: "The Glowing Heart",
      theme: "To use your inner light for understanding",
      keyPhrases: ["To use your inner light for understanding"],
      draw: (b) => {
        b.loop([[50, 38, 1.6], [58, 30], [68, 28, 1.6], [76, 34], [76, 46], [68, 58], [50, 72, 2], [32, 58], [24, 46], [24, 34], [32, 28, 1.6], [42, 30]]);
        b.star(50, 48, 3);
        for (const a of [0, 60, 120, 180, 240, 300]) {
          const r = ((a - 90) * Math.PI) / 180;
          b.line(b.star(50 + 36 * Math.cos(r), 50 + 36 * Math.sin(r), 1.2), b.star(50 + 44 * Math.cos(r), 50 + 44 * Math.sin(r), 1.6));
        }
      },
    },
  ],
  53: [
    {
      name: "The Empty Granary",
      theme: "The granaries will soon become empty",
      keyPhrases: ["and the granaries will soon become empty"],
      draw: (b) => {
        b.path([[20, 40, 1.8], [36, 26], [50, 12, 2.4], [64, 26], [80, 40, 1.8]]);
        b.path(g([[20, 40], [80, 40]], 1.8));
        b.path([[26, 40, 1.2], [26, 84, 1.6], [74, 84, 1.6], [74, 40, 1.2]]);
        b.loop([[44, 84, 1.2], [44, 62, 1.4], [56, 62, 1.4], [56, 84, 1.2]]);
        b.path([[26, 92, 1.2], [26, 84]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[74, 92, 1.2], [74, 84]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
      },
    },
    {
      name: "The Silk Robe",
      theme: "To wear fancy clothes and ornaments",
      keyPhrases: ["To wear fancy clothes and ornaments,"],
      draw: (b) => {
        b.loop([[40, 10, 1.6], [50, 22, 1.8], [60, 10, 1.6], [78, 16], [96, 40, 1.8], [84, 46], [72, 34], [72, 90, 1.8], [28, 90, 1.8], [28, 34], [16, 46], [4, 40, 1.8], [22, 16]]);
        b.path(g([[50, 22], [44, 90]], 1.2));
        b.path([[28, 52, 1.4], [72, 52, 1.4]]);
      },
    },
    {
      name: "The Necklace",
      theme: "To wear fancy clothes and ornaments",
      keyPhrases: ["To wear fancy clothes and ornaments,"],
      draw: (b) => {
        const beads = b.arc(50, 24, 36, 10, 170, 11, 1.8, 44);
        b.line(...beads);
        b.loop([[50, 70, 1.6], [58, 78, 1.6], [50, 92, 2.8], [42, 78, 1.6]]);
        b.line(beads[5], b.star(50, 70));
      },
    },
    {
      name: "The Scarecrow",
      theme: "The land will become neglected and full of weeds",
      keyPhrases: ["the land will become neglected and full of weeds,"],
      draw: (b) => {
        b.path([[36, 16, 1.4], [50, 8, 2], [64, 16, 1.4]]);
        b.close(b.ring(50, 22, 6, 6, 1.6));
        b.path([[50, 28, 1.4], [50, 60], [50, 94, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[14, 38, 1.8], [30, 36], [50, 36, 1.4], [70, 36], [86, 38, 1.8]]);
        b.loop([[40, 36], [60, 36], [62, 62, 1.4], [38, 62, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        for (const [x, y] of [[10, 94], [22, 90], [78, 92], [90, 88]]) b.path([[x, 96, 1], [x + 2, y - 8, 1.4]]);
      },
    },
    {
      name: "The Sickle",
      theme: "There is no one out working the fields",
      keyPhrases: ["because there is no one out working the fields."],
      draw: (b) => {
        const outer = b.arc(50, 44, 32, 190, 400, 9, 1.8);
        const inner = b.arc(56, 50, 24, 205, 385, 7, 1.2);
        b.line(...outer);
        b.line(outer[0], ...inner);
        b.line(outer[8], inner[6], ...b.pts([[70, 74, 1.6], [62, 88, 1.6], [56, 98, 2]]));
      },
    },
  ],
  54: [
    {
      name: "The Great Wall",
      theme: "That which is well built will never be torn down",
      keyPhrases: ["That which is well built"],
      draw: (b) => {
        b.path([[2, 80, 1.4], [14, 70], [28, 56], [40, 60], [54, 44], [68, 40], [82, 26], [98, 30, 1.4]]);
        b.path([[2, 88, 1.2], [14, 78], [28, 64], [40, 68], [54, 52], [68, 48], [82, 34], [98, 38, 1.2]]);
        for (const [x, y] of [[28, 56], [68, 40]]) b.loop([[x - 5, y, 1.4], [x - 5, y - 12, 1.8], [x + 5, y - 12, 1.8], [x + 5, y, 1.4]]);
        b.pts([[10, 64, 1], [46, 46, 1], [90, 20, 1]]);
      },
    },
    {
      name: "The Rings of Virtue",
      theme: "Cultivated in the person, the family, the community, the country and the world",
      keyPhrases: ["If this idea is cultivated in the world,"],
      draw: (b) => {
        b.star(50, 50, 3);
        b.close(b.ring(50, 50, 10, 5, 1.6));
        b.close(b.ring(50, 50, 20, 7, 1.4));
        b.close(b.ring(50, 50, 31, 9, 1.2));
        b.close(b.ring(50, 50, 43, 12, 1));
      },
    },
    {
      name: "The Family Tree",
      theme: "Honored from generation to generation",
      keyPhrases: ["will be honored from generation to generation."],
      draw: (b) => {
        const root = b.star(50, 90, 2.8);
        const l1 = [b.star(30, 66, 2.2), b.star(70, 66, 2.2)];
        l1.forEach((id) => b.line(root, id));
        const l2 = [[16, 42], [38, 40], [62, 40], [84, 42]].map(([x, y]) => b.star(x, y, 1.8));
        b.line(l1[0], l2[0]);
        b.line(l1[0], l2[1]);
        b.line(l1[1], l2[2]);
        b.line(l1[1], l2[3]);
        [[8, 16], [22, 14], [34, 14], [44, 16], [56, 16], [66, 14], [78, 14], [92, 16]].forEach(([x, y], i) => b.line(l2[Math.floor(i / 2)], b.star(x, y, 1.4)));
      },
    },
    {
      name: "The Brick Wall",
      theme: "Those who do things well",
      keyPhrases: ["Those who do things well"],
      draw: (b) => {
        const rows = [20, 40, 60, 80];
        for (const y of rows) b.path([[6, y, 1.2], [94, y, 1.2]]);
        b.path([[6, 20, 1.6], [6, 80, 1.6]]);
        b.path([[94, 20, 1.6], [94, 80, 1.6]]);
        rows.slice(0, 3).forEach((y, r) => {
          const xs = r % 2 === 0 ? [36, 64] : [22, 50, 78];
          for (const x of xs) b.line(b.star(x, y, 1.4), b.star(x, y + 20, 1.4));
        });
      },
    },
    {
      name: "The Watchtower",
      theme: "That which is well built will never be torn down",
      keyPhrases: ["will never be torn down."],
      draw: (b) => {
        b.path([[20, 22, 1.8], [30, 22], [30, 14, 1.4], [40, 14], [40, 22], [60, 22], [60, 14], [70, 14, 1.4], [70, 22], [80, 22, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[24, 22, 1.2], [26, 92, 1.8]]);
        b.path([[76, 22, 1.2], [74, 92, 1.8]]);
        b.loop([[44, 34, 1.2], [56, 34, 1.2], [56, 46, 1.2], [44, 46, 1.2]]);
        b.path([[42, 92, 1.4], [42, 72], [50, 64, 1.6], [58, 72], [58, 92, 1.4]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.path([[6, 92, 1.2], [94, 92, 1.2]]);
      },
    },
  ],
  55: [
    {
      name: "The Cradle",
      theme: "One who is filled with the Tao is like a newborn child",
      keyPhrases: ["is like a newborn child."],
      draw: (b) => {
        b.path([[10, 80, 1.8], [30, 90], [50, 92, 1.6], [70, 90], [90, 80, 1.8]]);
        b.loop([[20, 44, 1.6], [80, 44, 1.6], [80, 76], [20, 76]]);
        b.path([[20, 44], [22, 30, 1.4], [30, 20, 1.8], [40, 22, 1.4], [42, 44]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.close(b.ring(52, 38, 6, 6, 1.8));
        b.pts([[74, 12, 1.4], [86, 20, 1.2]]);
      },
    },
    {
      name: "The Eagle",
      theme: "The infant is protected from the birds of prey",
      keyPhrases: ["the stinging insects, wild beasts, and birds of prey."],
      draw: (b) => {
        const body = b.path([[50, 18, 2.2], [50, 34, 1.6], [50, 60, 1.6]]);
        b.loop([[46, 14, 1.4], [54, 14, 1.4], [50, 18]].map(([x, y, m]) => [x, y, m ?? 2.2] as P));
        b.line(body[1], ...b.pts([[36, 30], [20, 24], [4, 30, 2], [16, 38], [30, 44]]), body[2]);
        b.line(body[1], ...b.pts([[64, 30], [80, 24], [96, 30, 2], [84, 38], [70, 44]]), body[2]);
        b.line(body[2], ...b.pts([[42, 76, 1.6], [58, 76, 1.6]]), body[2]);
      },
    },
    {
      name: "The Bee",
      theme: "The infant is protected from the stinging insects",
      keyPhrases: ["the stinging insects, wild beasts, and birds of prey."],
      draw: (b) => {
        b.close(b.ring(50, 58, 16, 10, 1.6, -90, 24));
        b.path([[35, 56, 1.2], [65, 56, 1.2]]);
        b.path([[36, 68, 1.2], [64, 68, 1.2]]);
        b.path([[50, 82], [50, 92, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.close(b.ring(50, 24, 7, 6, 1.6));
        b.loop([[44, 44, 1.2], [26, 28, 1.6], [16, 38, 1.6], [30, 46, 1.2]]);
        b.loop([[56, 44, 1.2], [74, 28, 1.6], [84, 38, 1.6], [70, 46, 1.2]]);
        b.path([[46, 22, 1.2], [40, 10, 1.8]]);
        b.path([[54, 22, 1.2], [60, 10, 1.8]]);
      },
    },
    {
      name: "The Wilting Flower",
      theme: "When something reaches its prime it will soon begin to decline",
      keyPhrases: ["The master understands that when something reaches its prime"],
      draw: (b) => {
        b.path([[40, 94, 1.6], [42, 70], [48, 46], [60, 30], [74, 30, 1.6], [80, 40, 1.4]]);
        b.close(b.ring(82, 52, 10, 6, 1.8, -90));
        b.star(82, 52, 2.4);
        b.loop([[44, 62, 1.2], [30, 52, 1.6], [24, 58, 1.4]]);
        b.pts([[74, 76, 1.2], [86, 84, 1]]);
      },
    },
    {
      name: "The Rattle Drum",
      theme: "It can cry all day and never become hoarse",
      keyPhrases: ["It can cry all day and never become hoarse."],
      draw: (b) => {
        b.close(b.ring(50, 34, 20, 10, 1.8));
        b.path([[30, 34], [18, 38, 1.2], [10, 46, 2]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.path([[70, 34], [82, 38, 1.2], [90, 46, 2]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.path([[50, 54], [50, 74, 1.4], [50, 94, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.close(b.ring(50, 34, 8, 6, 1));
      },
    },
  ],
  56: [
    {
      name: "The Incense Stick",
      theme: "Stop talking, meditate in silence",
      keyPhrases: ["meditate in silence,"],
      draw: (b) => {
        b.path([[32, 86, 1.8], [36, 94], [64, 94], [68, 86, 1.8]]);
        b.path(g([[32, 86], [68, 86]], 1.8));
        b.path([[50, 86, 1.2], [50, 50, 1.2], [50, 44, 2.6]]);
        b.path([[50, 40, 1.4], [46, 32, 1.4], [52, 24, 1.6], [48, 16, 1.4], [54, 8, 1.2]]);
        b.nebula([[44, 42], [42, 20], [50, 4], [58, 12], [56, 34]]);
      },
      nebulaShare: 0.2,
    },
    {
      name: "The Singing Bowl",
      theme: "Harmonize your inner light",
      keyPhrases: ["harmonize your inner light,"],
      draw: (b) => {
        b.close(b.ring(50, 50, 30, 10, 1.8, 0, 7));
        b.line(b.star(20, 50, 1.8), ...b.pts([[24, 66], [36, 78], [50, 81, 1.8], [64, 78], [76, 66]]), b.star(80, 50, 1.8));
        b.path([[36, 88, 1.4], [64, 88, 1.4]]);
        b.path([[70, 30, 1.2], [90, 10, 1.8]]);
        b.line(...b.arc(50, 50, 42, 200, 250, 3, 1));
        b.line(...b.arc(50, 50, 42, 290, 340, 3, 1));
      },
    },
    {
      name: "The Moon behind the Cloud",
      theme: "This is called the dark and mysterious identity",
      keyPhrases: ["Doing this is called the dark and mysterious identity."],
      draw: (b) => {
        b.line(...b.arc(56, 40, 22, 150, 390, 8, 1.8));
        b.loop([[10, 70, 1.6], [8, 58], [18, 50, 1.6], [30, 52], [38, 44, 1.8], [52, 46], [60, 54, 1.6], [78, 54], [88, 64, 1.6], [80, 74], [40, 74]]);
        b.nebula([[8, 58], [18, 50], [38, 44], [60, 54], [88, 64], [80, 74], [10, 72]]);
      },
      nebulaShare: 0.25,
    },
    {
      name: "The River Stones",
      theme: "Blunt your sharpness",
      keyPhrases: ["blunt your sharpness,"],
      draw: (b) => {
        b.loop([[20, 78, 1.6], [32, 64], [52, 60, 1.8], [72, 64], [82, 78, 1.6], [66, 88], [36, 88]]);
        b.loop([[30, 56, 1.4], [38, 44], [54, 42, 1.6], [68, 48], [70, 56, 1.4]]);
        b.loop([[40, 38, 1.4], [46, 28], [56, 28, 1.6], [62, 36, 1.4]]);
        b.path([[2, 92, 1], [98, 92, 1]]);
        b.star(50, 16, 2.4);
      },
    },
    {
      name: "The Sage under the Tree",
      theme: "Those who know do not talk",
      keyPhrases: ["Those who know do not talk."],
      draw: (b) => {
        b.path([[72, 94, 2], [72, 60], [68, 40, 1.6]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.loop([[40, 30, 1.6], [48, 14, 1.8], [70, 6, 2], [90, 14, 1.8], [96, 30, 1.6], [80, 40], [58, 40]]);
        b.close(b.ring(40, 58, 5, 5, 1.8));
        const neck = b.star(40, 66, 1.6);
        b.line(neck, b.star(30, 82, 1.4), b.star(50, 82, 1.4), neck);
        b.path([[24, 88, 1.6], [56, 88, 1.6]]);
        b.path([[2, 94, 1], [98, 94, 1]]);
      },
    },
  ],
  57: [
    {
      name: "The Sky Lanterns",
      theme: "I let go of all my desires",
      keyPhrases: ["I let go of all my desires,"],
      draw: (b) => {
        for (const [x, y, s] of [[30, 60, 1], [62, 36, 0.8], [80, 12, 0.6]] as const) {
          b.loop([[x - 8 * s, y - 12 * s, 1.6], [x + 8 * s, y - 12 * s, 1.6], [x + 6 * s, y + 10 * s, 1.4], [x - 6 * s, y + 10 * s, 1.4]]);
          b.star(x, y + 4 * s, 2.6 * s + 0.4);
        }
        b.path([[2, 92, 1.2], [30, 88, 1.4], [60, 92, 1.2], [98, 88, 1.2]]);
      },
    },
    {
      name: "The Broken Chain",
      theme: "The more prohibitions you make, the poorer people will be",
      keyPhrases: ["The more prohibitions you make,"],
      draw: (b) => {
        b.close(b.ring(14, 70, 10, 6, 1.6, 0, 6));
        b.close(b.ring(30, 62, 10, 6, 1.6, 30, 6));
        b.line(...b.arc(44, 56, 10, 150, 330, 5, 1.6, 6));
        b.line(...b.arc(60, 42, 10, 330, 510, 5, 1.6, 6));
        b.close(b.ring(72, 36, 10, 6, 1.6, 30, 6));
        b.close(b.ring(88, 28, 10, 6, 1.6, 0, 6));
      },
    },
    {
      name: "The Resting Farmer",
      theme: "I do nothing, and people become good by themselves",
      keyPhrases: ["I do nothing,"],
      draw: (b) => {
        b.loop([[40, 30, 1.6], [48, 14, 1.8], [66, 8, 2], [84, 14, 1.8], [92, 30, 1.6], [76, 38], [56, 38]]);
        b.path([[66, 38, 1.2], [66, 82, 1.8]]);
        b.close(b.ring(20, 72, 5, 5, 1.8));
        b.path([[26, 76, 1.4], [44, 78, 1.8], [52, 68, 1.4], [60, 78, 1.6]]);
        b.path([[26, 76], [34, 70, 1.2], [26, 66, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.path([[10, 66, 1.4], [20, 62, 1.8], [30, 66, 1.4]]);
        b.path([[2, 82, 1.2], [98, 82, 1.2]]);
      },
    },
    {
      name: "The Wildflowers",
      theme: "People take care of their own problems",
      keyPhrases: ["and people take care of their own problems."],
      draw: (b) => {
        for (const [x, h, r] of [[14, 30, 5], [34, 46, 6], [56, 36, 5], [78, 52, 6], [92, 24, 4]]) {
          b.path([[x, 92, 1.2], [x + 2, 92 - h, 1.2]]);
          b.close(b.ring(x + 2, 92 - h - r, r, 5, 1.6));
        }
        b.path([[2, 92, 1], [98, 92, 1]]);
      },
    },
    {
      name: "The Harvest Moon",
      theme: "I do not meddle in their personal lives, and the people become prosperous",
      keyPhrases: ["and the people become prosperous."],
      draw: (b) => {
        b.close(b.ring(74, 22, 12, 9, 2.2));
        for (const [x, w] of [[20, 12], [48, 10]]) {
          b.loop([[x - w, 70, 1.4], [x, 58, 1.8], [x + w, 70, 1.4]]);
          b.path([[x - w + 2, 70, 1.2], [x - w + 2, 86, 1.4], [x + w - 2, 86, 1.4], [x + w - 2, 70, 1.2]]);
          b.star(x, 78, 2.2);
        }
        for (const x of [70, 80, 90]) b.path([[x - 4, 86, 1.2], [x, 70, 1.6], [x + 4, 86, 1.2]]);
        b.path([[2, 92, 1], [98, 92, 1]]);
      },
    },
  ],
  58: [
    {
      name: "The Rainbow after the Storm",
      theme: "Good fortune has its roots in disaster",
      keyPhrases: ["Good fortune has its roots in disaster,"],
      draw: (b) => {
        b.loop([[10, 36, 1.6], [8, 26], [18, 18, 1.8], [30, 18], [36, 10, 2], [50, 10], [56, 18, 1.8], [66, 20], [70, 30, 1.6], [56, 36], [30, 36]]);
        for (const x of [20, 34, 48]) b.path([[x + 2, 44, 1], [x, 52, 1.2]]);
        b.line(...b.arc(64, 94, 32, 200, 340, 7, 1.8));
        b.line(...b.arc(64, 94, 22, 200, 340, 5, 1.4));
      },
    },
    {
      name: "Dawn over the Dark Hills",
      theme: "Bad things often turn out for good",
      keyPhrases: ["and bad things often turn out for good."],
      draw: (b) => {
        b.line(...b.arc(50, 60, 16, 180, 360, 6, 2.2));
        for (let i = 0; i < 7; i++) {
          const a = ((190 + i * 26.7) * Math.PI) / 180;
          b.line(b.star(50 + 22 * Math.cos(a), 60 + 22 * Math.sin(a), 1.2), b.star(50 + 32 * Math.cos(a), 60 + 32 * Math.sin(a), 1.6));
        }
        b.path([[2, 70, 1.4], [14, 56, 1.8], [34, 60], [50, 60], [66, 62], [80, 50, 1.8], [98, 66, 1.4]]);
        b.nebula([[2, 72], [20, 56], [34, 62], [66, 64], [80, 52], [98, 68], [98, 96], [2, 96]]);
      },
      nebulaShare: 0.2,
    },
    {
      name: "The Moon's Halo",
      theme: "Radiant, and easy on the eye",
      keyPhrases: ["Radiant, and easy on the eye."],
      draw: (b) => {
        b.close(b.ring(50, 50, 14, 9, 2.4));
        b.close(b.ring(50, 50, 30, 14, 1.2));
        b.pts(b.arcPoints(50, 50, 42, 42, -60, 240, 8), 0.9);
      },
    },
    {
      name: "The Pearl",
      theme: "Good fortune has its roots in disaster: the grit that becomes a pearl",
      keyPhrases: ["and disaster lurks with good fortune."],
      draw: (b) => {
        const hinge = b.star(50, 88, 2);
        b.path([[14, 64, 1.8], [22, 76], [36, 86], [50, 88], [64, 86], [78, 76], [86, 64, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[14, 64], [30, 60, 1.4], [50, 62, 1.4], [70, 60, 1.4], [86, 64]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.path([[86, 64], [88, 44], [76, 24], [60, 16, 1.8]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.path([[86, 64], [68, 50, 1.2], [60, 16]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.star(46, 50, 3);
        void hinge;
      },
    },
    {
      name: "Plum Blossoms in the Snow",
      theme: "Good fortune has its roots in disaster: flowers on the winter branch",
      keyPhrases: ["Good fortune has its roots in disaster,"],
      draw: (b) => {
        b.path([[4, 90, 1.6], [24, 72], [40, 64, 1.4], [58, 46], [76, 36], [94, 30, 1.4]]);
        b.path(g([[40, 64], [46, 46], [42, 28, 1.4]], 1.4));
        b.path(g([[58, 46], [70, 56, 1.2]], 1.4));
        for (const [x, y] of [[42, 22], [80, 28], [72, 62], [24, 66]]) b.close(b.ring(x, y, 5, 5, 1.8));
        b.pts([[14, 20, 1], [60, 14, 1.2], [90, 60, 1], [30, 40, 1]]);
      },
    },
  ],
  59: [
    {
      name: "The Root and Trunk",
      theme: "The deep root and the firm trunk",
      keyPhrases: ["This is spoken of as the deep root and the firm trunk,"],
      draw: (b) => {
        b.loop([[20, 30, 1.6], [26, 14, 1.8], [50, 6, 2.2], [74, 14, 1.8], [80, 30, 1.6], [62, 36], [38, 36]]);
        b.path([[44, 36, 1.2], [44, 62, 1.8]]);
        b.path([[56, 36, 1.2], [56, 62, 1.8]]);
        b.path([[4, 62, 1.2], [96, 62, 1.2]]);
        b.path(g([[44, 62], [30, 74, 1.4], [16, 90, 1.8]], 1.8));
        b.path(g([[50, 62, 1.2], [48, 80, 1.4], [52, 96, 2]], 1.2));
        b.path(g([[56, 62], [70, 74, 1.4], [84, 90, 1.8]], 1.8));
      },
    },
    {
      name: "The Ginseng Root",
      theme: "The Way to a long life and great spiritual vision",
      keyPhrases: ["the Way to a long life and great spiritual vision."],
      draw: (b) => {
        b.path([[44, 4, 1.6], [48, 14, 1.4], [50, 22, 1.8]]);
        b.path([[56, 4, 1.6], [52, 14, 1.4]]);
        b.loop([[44, 22, 1.4], [56, 22, 1.4], [60, 40], [58, 58, 1.6], [42, 58, 1.6], [40, 40]]);
        b.path(g([[42, 58], [34, 74, 1.4], [28, 94, 1.8]], 1.6));
        b.path(g([[58, 58], [66, 74, 1.4], [72, 94, 1.8]], 1.6));
        b.path(g([[40, 40], [26, 48, 1.2], [18, 60, 1.6]], 1.4));
        b.path(g([[60, 40], [74, 48, 1.2], [82, 60, 1.6]], 1.4));
      },
    },
    {
      name: "The Crane on the Pine",
      theme: "You will be long enduring",
      keyPhrases: ["then you will be long enduring."],
      draw: (b) => {
        b.path([[10, 94, 1.8], [22, 76], [34, 66, 1.4], [56, 60], [78, 62, 1.4], [94, 58, 1.6]]);
        b.path([[40, 56, 1.2], [58, 50, 1.6], [76, 52, 1.2], [90, 48, 1.4]]);
        b.path([[56, 60, 1.2], [58, 50]].map(([x, y, m]) => [x, y, m ?? 1.6] as P));
        b.loop([[56, 44, 1.6], [66, 42, 1.4], [70, 34, 1.4], [62, 30, 1.8], [52, 36, 2]]);
        b.path([[66, 42], [64, 50, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.4] as P));
        b.path([[62, 30], [64, 18, 1.4], [70, 10, 2]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        b.line(b.star(70, 10), b.star(80, 12, 1.4));
        b.star(88, 24, 2.4);
      },
    },
    {
      name: "The Evergreen",
      theme: "When there is an abundance of virtue, there is nothing that can not be done",
      keyPhrases: ["When there is an abundance of virtue,"],
      draw: (b) => {
        b.path([[50, 6, 2.4], [36, 30, 1.6], [44, 30, 1.2], [28, 54, 1.6], [40, 54, 1.2], [20, 80, 1.8], [80, 80, 1.8], [60, 54, 1.2], [72, 54, 1.6], [56, 30, 1.2], [64, 30, 1.6], [50, 6]]);
        b.path([[46, 80, 1.2], [46, 94, 1.6], [54, 94, 1.6], [54, 80, 1.2]]);
        b.pts([[46, 44, 1.8], [56, 64, 1.8], [38, 68, 1.8]]);
      },
    },
    {
      name: "The Sunrise",
      theme: "Those who follow the Tao early will have an abundance of virtue",
      keyPhrases: ["Those who follow the Tao early"],
      draw: (b) => {
        b.line(...b.arc(50, 66, 20, 180, 360, 7, 2.2));
        b.path([[2, 66, 1.4], [30, 66], [70, 66], [98, 66, 1.4]].map(([x, y, m]) => [x, y, m ?? 2.2] as P));
        for (let i = 0; i < 7; i++) {
          const a = ((180 + 15 + i * 25) * Math.PI) / 180;
          b.line(b.star(50 + 26 * Math.cos(a), 66 + 26 * Math.sin(a), 1), b.star(50 + 42 * Math.cos(a), 66 + 42 * Math.sin(a), 1.6));
        }
        b.path([[20, 80, 1.2], [80, 80, 1.2]]);
      },
    },
  ],
  60: [
    {
      name: "The Wok",
      theme: "Governing a large country is like frying small fish",
      keyPhrases: ["is like frying small fish."],
      draw: (b) => {
        b.path([[12, 50, 1.8], [20, 66], [36, 76], [56, 76], [72, 66], [80, 50, 1.8]]);
        b.path(g([[12, 50], [80, 50]], 1.8));
        b.path([[80, 50], [96, 42, 2]].map(([x, y, m]) => [x, y, m ?? 1.8] as P));
        for (const [x, y] of [[32, 42], [54, 38]]) {
          b.loop([[x - 8, y, 1.6], [x, y - 3, 1.2], [x + 6, y, 1.2], [x, y + 3, 1.2]]);
          b.line(b.star(x + 6, y), b.star(x + 11, y - 3, 1.2), b.star(x + 11, y + 3, 1.2), b.star(x + 6, y));
        }
        b.path([[30, 90, 1.4], [46, 84, 1.8], [62, 90, 1.4]]);
      },
    },
    {
      name: "The School of Small Fish",
      theme: "Too much poking spoils the meat: leave the small fish be",
      keyPhrases: ["Too much poking spoils the meat."],
      draw: (b) => {
        for (const [x, y, s] of [[26, 24, 1], [62, 34, 1.1], [30, 58, 1.1], [70, 70, 1], [44, 86, 0.8]] as const) {
          b.loop([[x - 10 * s, y, 1.8], [x, y - 5 * s, 1.2], [x + 8 * s, y, 1.2], [x, y + 5 * s, 1.2]]);
          b.line(b.star(x + 8 * s, y), b.star(x + 15 * s, y - 5 * s, 1.2), b.star(x + 15 * s, y + 5 * s, 1.2), b.star(x + 8 * s, y));
        }
      },
    },
    {
      name: "The Fish and the Chopsticks",
      theme: "Too much poking spoils the meat",
      keyPhrases: ["Too much poking spoils the meat."],
      draw: (b) => {
        b.close(b.ring(46, 64, 38, 12, 1.4, 0, 18));
        const fish = b.loop([[20, 64, 2], [34, 56], [52, 56], [62, 64, 1.4], [52, 72], [34, 72]]);
        b.line(fish[3], b.star(74, 56, 1.6), b.star(74, 72, 1.6), fish[3]);
        b.star(27, 62, 2.4);
        b.path([[58, 46, 1.2], [94, 6, 1.8]]);
        b.path([[68, 50, 1.2], [98, 14, 1.8]]);
      },
    },
    {
      name: "The Fading Ghost",
      theme: "Evil will lose its power to harm the people",
      keyPhrases: ["then evil will lose its power to harm the people."],
      draw: (b) => {
        b.path([[26, 86, 1.6], [24, 60], [26, 38], [36, 22], [50, 16, 2], [64, 22], [74, 38], [76, 60], [74, 86, 1.6]]);
        b.path([[26, 86], [34, 78], [42, 86], [50, 78], [58, 86], [66, 78], [74, 86]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.pts([[42, 40, 2.4], [58, 40, 2.4]]);
        b.close(b.ring(50, 54, 4, 4, 1.2));
      },
    },
    {
      name: "The Kitchen Stove",
      theme: "Govern gently: a small fire under the pot",
      keyPhrases: ["Governing a large country"],
      draw: (b) => {
        b.loop([[14, 50, 1.6], [86, 50, 1.6], [86, 92, 1.6], [14, 92, 1.6]]);
        b.path([[36, 92, 1.2], [36, 76], [50, 68, 1.4], [64, 76], [64, 92, 1.2]].map(([x, y, m]) => [x, y, m ?? 1.2] as P));
        b.loop([[44, 88, 1.8], [50, 76, 2.4], [56, 88, 1.8]]);
        b.path([[26, 50, 1.4], [30, 34, 1.6], [70, 34, 1.6], [74, 50, 1.4]]);
        b.path([[20, 34, 1.2], [80, 34, 1.2]]);
        b.path([[44, 26, 1], [48, 16, 1.2], [44, 6, 1.4]]);
      },
    },
  ],
};

export default c;
