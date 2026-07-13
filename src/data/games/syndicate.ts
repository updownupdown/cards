import { GameDefinition, GameTag } from "../games-data";

export const syndicate: GameDefinition = {
  path: "/syndicate",
  tutorial: {
    default: {
      text: "Build and convert stacks to promote members.",
      tip: "Respect the rank restrictions and use timing windows for high-value conversions.",
    },
  },
  title: "Syndicate",
  thumbnail: "Syndicate.jpg",
  background: "concrete.jpg",
  cardColorBg: "#252220",
  cardColorText: "#b2eee1",
  cardDescription:
    "Stategically promote members and candidates to the top of the syndicate hierarchy.",
  stats: {
    complexity: 70,
    difficulty: 70,
    luck: 30,
  },
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  byLine: "Game design by Wil Su",
  briefRules: [
    "Build and convert stacks under syndicate rank restrictions.",
    "Use timing windows to secure high-value conversions.",
    "Game ends when objective is met or no legal move remains.",
  ],
};
