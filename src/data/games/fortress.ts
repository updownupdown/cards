import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const fortress: GameDefinition = {
  path: "/fortress",
  title: "Fortress",
  tags: [GameTag.SequenceBuilding],
  rating: { complexity: 40, difficulty: 70, luck: 25 },
  thumbnail: "Fortress.webp",
  background: GAME_BACKGROUNDS.fortress,
  animation: GameAnimations.Clouds,
  gameColorDark: "#302a24",
  gameColorPale: "#ead9b8",
  cardBack: CardBackColors.Walnut,
  cardDescription:
    "Maneuver ten open lanes up or down by suit to free every foundation.",
  quickStart: [
    "Build foundations up by suit from Ace to King.",
    "Build lanes one rank up or down in the same suit.",
    "Move one card at a time; any card fills an empty lane.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to four foundations, building up by suit from Ace to King.",
    "## Lanes",
    "- Only the exposed card of each lane is playable.",
    "- Build one rank up or down in the same suit.",
    "- Move one card at a time.",
    "- Any card may fill an empty lane.",
  ],
};
