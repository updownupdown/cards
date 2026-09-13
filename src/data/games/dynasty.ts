import { GameAnimations } from "@/animations/types";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const dynasty: GameDefinition = {
  path: "/dynasty",
  title: "Dynasty",
  thumbnail: "Dynasty.webp",
  background: GAME_BACKGROUNDS.castleIndoors,
  animation: GameAnimations.Dust,
  tags: [GameTag.CardCombat, GameTag.SpatialControl],
  rating: { complexity: 65, difficulty: 70, luck: 35 },
  gameColorDark: "#262f35",
  gameColorMid: "#389c88",
  gameColorPale: "#b5f4e1",
  cardDescription:
    "Bring down all twelve royals by placing cards on a 3x3 grid.",
  quickStart: [
    "Draw and place number cards on equal or lower grid cards.",
    "A placement fires through the two cards opposite an adjacent royal.",
    "Aces extract stacks; Jokers reassign top cards.",
  ],
  howToPlay: [
    "## Objective",
    "Defeat all twelve Jacks, Queens, and Kings around the grid before running out of draw cards.",

    "## Attacks",
    "- A newly placed card fires toward each royal opposite it. Only the two intervening grid cards deal damage.",
    "-- **Jacks** have no attack restrictions",
    "-- **Queens** can only be damaged with **matching-colour** attackers",
    "-- **Kings** can only be damaged with **matching-suit** attackers",

    "## Ploys",
    "- **Extract**: Spend an Ace to return a grid stack to the bottom of the deck.",
    "- **Reassign**: Spend a Joker to move one top grid card to another legal stack.",

    "## Scoring",
    "Your score is the number of unspent ploys.",
  ],
};
