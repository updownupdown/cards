// AUTO-GENERATED FILE. DO NOT EDIT.
// Run: npm run starfield:generate

/**
 * The starfield's bright stars, drawn one by one (Starfield.tsx): where each
 * sits in its layer's tile (0 to 1 across and down), its radius in dp, its
 * brightness and colour.
 */
export type SkyStar = {
  x: number;
  y: number;
  r: number;
  a: number;
  colour: string;
};

export const SKY_STARS = {
  twinkleA: [
    {
      x: 0.0597,
      y: 0.8514,
      r: 0.71,
      a: 0.847,
      colour: "#f8f7ff",
    },
    {
      x: 0.0218,
      y: 0.4971,
      r: 0.717,
      a: 0.883,
      colour: "#cad7ff",
    },
    {
      x: 0.6142,
      y: 0.4524,
      r: 0.712,
      a: 0.868,
      colour: "#f8f7ff",
    },
    {
      x: 0.2785,
      y: 0.0451,
      r: 1.062,
      a: 0.974,
      colour: "#fff4ea",
    },
    {
      x: 0.3351,
      y: 0.0414,
      r: 0.771,
      a: 0.891,
      colour: "#fff4ea",
    },
    {
      x: 0.4951,
      y: 0.5931,
      r: 0.706,
      a: 0.859,
      colour: "#f8f7ff",
    },
  ],
  twinkleB: [
    {
      x: 0.5313,
      y: 0.4107,
      r: 1.112,
      a: 0.955,
      colour: "#f8f7ff",
    },
    {
      x: 0.5734,
      y: 0.2459,
      r: 0.812,
      a: 0.837,
      colour: "#ffcc8f",
    },
    {
      x: 0.8402,
      y: 0.0807,
      r: 0.896,
      a: 0.889,
      colour: "#aabfff",
    },
    {
      x: 0.7843,
      y: 0.7005,
      r: 0.94,
      a: 0.912,
      colour: "#aabfff",
    },
  ],
  bright: [
    {
      x: 0.8445,
      y: 0.1044,
      r: 0.995,
      a: 0.86,
      colour: "#f8f7ff",
    },
    {
      x: 0.1209,
      y: 0.8034,
      r: 1.072,
      a: 0.881,
      colour: "#f8f7ff",
    },
    {
      x: 0.5227,
      y: 0.2364,
      r: 0.951,
      a: 0.86,
      colour: "#f8f7ff",
    },
    {
      x: 0.8292,
      y: 0.61,
      r: 0.95,
      a: 0.87,
      colour: "#aabfff",
    },
    {
      x: 0.8443,
      y: 0.5356,
      r: 1.237,
      a: 0.944,
      colour: "#cad7ff",
    },
    {
      x: 0.9295,
      y: 0.9376,
      r: 1.315,
      a: 0.988,
      colour: "#f8f7ff",
    },
    {
      x: 0.1235,
      y: 0.9406,
      r: 1.253,
      a: 0.913,
      colour: "#f8f7ff",
    },
  ],
  hero: [
    {
      x: 0.9453,
      y: 0.7171,
      r: 1.606,
      a: 0.938,
      colour: "#aabfff",
    },
    {
      x: 0.8775,
      y: 0.8048,
      r: 1.412,
      a: 0.927,
      colour: "#aabfff",
    },
  ],
} satisfies Record<string, SkyStar[]>;
