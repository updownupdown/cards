import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const empire: GameDefinition = {
  path: "/empire",
  title: "Empire",
  tags: [GameTag.EasyToLearn, GameTag.ModernMechanics],
  rating: {
    complexity: 35,
    difficulty: 65,
    luck: 45,
  },
  background: GAME_BACKGROUNDS.nightSky,
  animation: GameAnimations.Stars,
  thumbnail: "Empire.jpg",
  cardBack: "DefaultCardBack.png",
  gameColorDark: "#1d2231",
  gameColorPale: "#dbe9eb",
  cardDescription:
    "Conquer matching cards across an open field until one empire remains.",
  quickStart: [
    "Conquer adjacent cards of the same suit or rank.",
    "Reserve cards can (and must) be played to empty spaces.",
  ],
  howToPlay: [
    "## Objective",
    "Reduce all eighteen cards to a single card on the board.",
    "## Setup",
    "- Fifteen cards are dealt face up in three rows of five.",
    "- Three more cards form a face-down reserve. The other cards are not used.",
    "## Conquering",
    "- Select any card, then select a card of the same rank or suit to conquer it.",
    "- Cards may conquer horizontally, vertically, or diagonally adjacent cards.",
    "- A card may also conquer a more distant card in the same row or column when every space between them is empty.",
    "- The conquering card moves into the conquered card's space, leaving its old space empty.",
    "## Reserve",
    "- Once an empty space exists, you may turn over the top reserve card.",
    "- Before making another conquest, place that card in any empty space from the original layout.",
    "- All three reserve cards must enter play before you can win.",
    "## Winning",
    "Conquer until only one card remains. You lose when no conquest is possible and no reserve can be drawn and placed.",
  ],
  about: [
    "Empire is a compact spatial solitaire game that rewards preserving useful suits and ranks while opening lines across the board.",
  ],
  credits: {
    creators: [GameCreators.JimOwen],
  },
};
