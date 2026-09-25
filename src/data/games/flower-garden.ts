import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const flowerGarden: GameDefinition = {
  path: "/flower-garden",
  title: "Flower Garden",
  aliases: ["The Bouquet", "The Garden"],
  tags: [GameTag.CastlesAndFans, GameTag.SequenceBuilding],
  rating: { complexity: 30, difficulty: 65, luck: 35 },
  thumbnail: "FlowerGarden.webp",
  background: GAME_BACKGROUNDS.flowerGarden,
  animation: GameAnimations.Pollen,
  gameColorDark: "#24402f",
  gameColorPale: "#f2e4c2",
  cardBack: CardBackColors.Olive,
  cardDescription:
    "Cultivate six flower beds with every card in the sixteen-card bouquet available.",
  quickStart: [
    "Build foundations up by suit from Ace to King.",
    "Build flower beds down by rank, regardless of suit.",
    "Every bouquet card is available; any card fills an empty bed.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to four foundations, building up by suit from Ace to King.",
    "## Garden",
    "- Only the exposed bottom card of each of the six flower beds is playable.",
    "- Build beds down by rank, regardless of suit, moving one card at a time.",
    "- Any card may fill an empty flower bed.",
    "- All sixteen cards in the bouquet are exposed and available at all times.",
  ],
};
