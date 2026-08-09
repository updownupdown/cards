import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const empire: GameDefinition = {
  path: "/empire",
  title: "Empire",
  tags: [
    GameTag.EasyToLearn,
    GameTag.ModernMechanics,
    GameTag.CardCombat,
    GameTag.SpatialControl,
  ],
  rating: {
    complexity: 35,
    difficulty: 65,
    luck: 45,
  },
  background: GAME_BACKGROUNDS.nightSky,
  animation: GameAnimations.Stars,
  thumbnail: "Empire.jpg",
  cardBack: "Empire.jpg",
  gameColorDark: "#1d2231",
  gameColorPale: "#dbe9eb",
  cardDescription:
    "Conquer cards of matching rank or suit, until one empire remains.",
  quickStart: [
    "Conquer adjacent cards of the same suit or rank.",
    "Reserve cards can (and must) be played to empty spaces.",
  ],
  howToPlay: [
    "## Objective",
    "**Win** by reducing all eighteen cards to a single card on the board.",
    "**Lose** when no conquest is possible and no reserve can be drawn and placed, or when a single non-matching card exists.",

    "## Conquering",
    "- Select any card, then select an adjacent card of the same rank or suit to conquer it.",
    "- Cards may conquer horizontally, vertically, or diagonally.",
    "- A card may also conquer a more distant card in the same row or column when every space between them is empty.",
    "- The conquering card moves into the conquered card's space, leaving its old space empty.",

    "## Reserve",
    "- Once an empty space exists, you may turn over the top reserve card.",
    "- You must place that card in any empty space before making another conquest.",
    "- All three reserve cards must enter play before you can win.",
  ],
  about: [
    "Empire is a compact spatial solitaire game that rewards preserving useful suits and ranks while opening lines across the board.",
  ],
  credits: {
    creators: [GameCreators.JimOwen],
  },
};
