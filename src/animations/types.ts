export const GameAnimations = {
  FallingSnow: "fallingSnow",
  FallingLeaves: "fallingLeaves",
  SandStorm: "sandStorm",
  FallingEmbers: "fallingEmbers",
  FlyingBirds: "flyingBirds",
  PassingClouds: "passingClouds",
  ShimmeringStars: "shimmeringStars",
} as const;

export type GameAnimation =
  (typeof GameAnimations)[keyof typeof GameAnimations];
