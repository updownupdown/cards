import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const calculation: GameDefinition = {
  path: "/calculation",
  title: "Calculation",
  tags: [
    GameTag.FoundationBuilders,
    GameTag.SequenceBuilding,
    GameTag.StockAndWaste,
  ],
  rating: {
    complexity: 45,
    difficulty: 65,
    luck: 30,
  },
  thumbnail: "Calculation.webp",
  thumbnailCredit: {
    title: "Portrait of Luca Pacioli",
    artistName: "Jacopo de' Barbari",
    date: "between 1495 and 1500",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Jacopo_de'_Barbari_(attributed_to)_Portrait_of_Luca_Pacioli_(1445_1517)_with_a_student_(Guidobaldo_da_Montefeltro)_(2).jpg",
  },
  background: GAME_BACKGROUNDS.geometricCeiling,
  animation: GameAnimations.Dust,
  gameColorDark: "#12122b",
  gameColorPale: "#eccfff",
  cardBack: CardBackColors.Violet,
  quickStart: [
    "Build four foundations in steps of 1, 2, 3, and 4, up to K.",
    "Waste piles can be used to store cards in any order.",
  ],
  howToPlay: [
    "## Objective",
    "**Win** by building all four **foundations** up to Kings.",

    "## Foundations",
    "Each foundation builds **upward by a fixed increment** (+1, +2, +3, or +4), wrapping past the King (to Ace, then 2, etc.).",
    "- **Foundation 1**: A, 2, 3, 4 … K",
    "- **Foundation 2**: 2, 4, 6, 8, 10, Q, A, 3 … K",
    "- **Foundation 3**: 3, 6, 9, Q, 2, 5 … K",
    "- **Foundation 4**: 4, 8, Q, 3, 7 … K",

    "## Gameplay",
    "- Play the top card of the stock pile or any of the waste piles onto any foundation if it follows the foundation's increment.",
    "- You can play a Draw card to one of the 4 waste piles.",
    "- You cannot move cards between waste piles.",
  ],
};
