import { GameDefinition, GameTag } from "../games-data";

export const gridcannonSoloSuite: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/gridcannon-solosuite",
  title: "Gridcannon: SoloSuite",
  aliases: ["Gridcannon"],
  thumbnail: "Gridcannon.jpg",
  tags: [GameTag.ModernMechanics, GameTag.CardCombat, GameTag.SpatialControl],
  rating: { complexity: 65, difficulty: 70, luck: 35 },
  gameColorDark: "#283526",
  gameColorPale: "#f4e7b5",
  cardDescription:
    "Aim through a 3x3 card grid to bring down all twelve royals.",
  quickStart: [
    "Draw and place number cards on equal or lower grid cards.",
    "A placement fires through the two cards opposite an adjacent royal.",
    "Aces extract stacks; Jokers reassign top cards.",
  ],
  howToPlay: [
    "## Objective",
    "Defeat all twelve Jacks, Queens, and Kings around the grid.",
    "## Attacks",
    "- A newly placed card fires toward each royal opposite it. Only the two intervening grid cards deal damage.",
    "- Jacks accept any suits, Queens count matching-colour attackers, and Kings count matching-suit attackers.",
    "## Ploys",
    "- Spend an Ace to return one whole grid stack beneath the deck.",
    "- Spend a Joker to move one top grid card to another legal stack.",
    "- Your score is the number of unspent ploys.",
  ],
};
