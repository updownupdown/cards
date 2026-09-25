import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const laBelleLucie: GameDefinition = {
  path: "/la-belle-lucie",
  title: "La Belle Lucie",
  aliases: ["Lovely Lucy", "The Fan"],
  tags: [GameTag.CastlesAndFans, GameTag.SequenceBuilding],
  rating: { complexity: 30, difficulty: 80, luck: 40 },
  thumbnail: "LaBelleLucie.webp",
  background: GAME_BACKGROUNDS.sunsetOldCity,
  animation: GameAnimations.CherryBlossom,
  gameColorDark: "#28352d",
  gameColorPale: "#f5dce4",
  cardBack: CardBackColors.Rose,
  cardDescription:
    "Uncover a compact field of fans, with two reshuffles to loosen the knots.",
  quickStart: [
    "Build foundations up by suit from A to K.",
    "Build fans down by suit, moving one exposed card at a time.",
    "Empty fans stay empty; reshuffle the tableau up to twice.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to four foundations, building up by suit from Ace to King.",
    "## Fans",
    "- Only the exposed bottom card of each fan is playable.",
    "- Build down by suit, one card at a time.",
    "- Empty fans cannot be filled.",
    "- Twice per game, reshuffle all cards still in the fans and redeal them in groups of three.",
  ],
};
