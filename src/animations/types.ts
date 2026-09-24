export const GameAnimations = {
  Snow: "Snow",
  Leaves: "Leaves",
  Sand: "Sand",
  Embers: "Embers",
  Birds: "Birds",
  Clouds: "Clouds",
  Stars: "Stars",
  Firefly: "Firefly",
  Rain: "Rain",
  CherryBlossom: "CherryBlossom",
  ManaDust: "ManaDust",
  Pollen: "Pollen",
  Dust: "Dust",
  Bees: "Bees",
  Spiders: "Spiders",
  Mist: "Mist",
  Glitter: "Glitter",
  Glints: "Glints",
  Lightning: "Lightning",
  CandleMotes: "CandleMotes",
} as const;

export type GameAnimation =
  (typeof GameAnimations)[keyof typeof GameAnimations];
