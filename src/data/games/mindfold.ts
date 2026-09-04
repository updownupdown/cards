import { GameDefinition, GameTag } from "../games-data";

export const mindfold: GameDefinition = {
  // Galdor's Grip
  enabledOnLocalOnly: true,
  path: "/mindfold",
  title: "Mindfold",
  tags: [
    GameTag.ModernMechanics,
    GameTag.ScoringPuzzles,
    GameTag.SequenceBuilding,
  ],
  rating: { complexity: 45, difficulty: 65, luck: 20 },
  gameColorDark: "#243039",
  gameColorPale: "#dce9dc",
  cardDescription:
    "Manipulate a packet in hand and align five scoring memories.",
  quickStart: [
    "Only the first three cards score.",
    "Claim three matching suits or values totalling 15.",
    "Make five claims within 30 moves.",
  ],
  howToPlay: [
    "## Objective",
    "Claim five groups within thirty moves.",
    "## Actions",
    "- **Cycle** moves the first card to the back.",
    "- **Invert** flips the first card; a face-down card is worth 10 minus its rank.",
    "- **Reverse** reverses the first three cards.",
    "- **Claim** removes the first three when they share a suit or total exactly 15.",
  ],
};
