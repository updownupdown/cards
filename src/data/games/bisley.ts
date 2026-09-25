import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const bisley: GameDefinition = {
  path: "/bisley",
  title: "Bisley",
  tags: [GameTag.CastlesAndFans, GameTag.SequenceBuilding],
  rating: { complexity: 45, difficulty: 55, luck: 25 },
  thumbnail: "Bisley.webp",
  background: GAME_BACKGROUNDS.london,
  animation: GameAnimations.Rain,
  gameColorDark: "#30343a",
  gameColorPale: "#e8e1d3",
  cardBack: CardBackColors.Slate,
  cardDescription:
    "Build each suit from both ends while thirteen open columns tighten around you.",
  quickStart: [
    "Build Ace foundations up and King foundations down by suit.",
    "Build tableau one rank up or down in the same suit.",
    "Move one exposed card at a time; empty columns stay closed.",
  ],
  howToPlay: [
    "## Objective",
    "Move every card to eight foundations: four building up from Aces and four building down from Kings.",

    "## Rules",
    "- Aces begin on their ascending foundations.",
    "- Build tableau one rank up or down in the same suit.",
    "- Only the exposed bottom card of each column is playable.",
    "- Move one card at a time.",
    "- Empty columns cannot be filled.",
  ],
};
