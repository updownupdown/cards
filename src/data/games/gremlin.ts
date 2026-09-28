import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const gremlin: GameDefinition = {
  path: "/gremlin",
  title: "Gremlin",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 40,
    difficulty: 65,
    luck: 40,
  },
  thumbnail: "Gremlin.webp",
  thumbnailCredit: {
    title: "Forest Landscape in the Moonlight",
    artistName: "Georg Eduard Otto Saal",
    date: "1861",
    sourceName: "Rijksmuseum",
    sourceLink:
      "https://www.rijksmuseum.nl/en/collection/object/Forest-Landscape-in-the-Moonlight--f20a4913dbb122bad9efa767afb90d7f",
  },
  background: GAME_BACKGROUNDS.treeRain,
  animation: GameAnimations.Firefly,
  gameColorDark: "#1c423f",
  gameColorPale: "#e7f5ce",
  cardBack: CardBackColors.Moss,
  quickStart: [
    "Draw to 5, then play/discard/hold.",
    "Lose if a card can't be placed and all 12 columns are used.",
  ],
  howToPlay: [
    "## Objective",
    "Build columns of cards in decreasing, suit-matched sequences while managing the helper's plays.",
    "You win by building columns efficiently; the fewer columns used, the better.",

    "## Your Turn",
    "At the beginning of your turn, your hand is refilled. For each card, you may:",
    "- hold on to it,",
    "- discard it, or",
    "- play it to a column, if it is of the same suit and its top card is higher in value.",

    "## Gremlin's Turn",
    "After your turn, the helper plays the next card from the deck. You choose which column it goes to.",
    "If the helper's card cannot be placed on any column and you already have 12 columns, you lose immediately.",

    "## Scoring",
    "Your score is the number of columns you have built when the deck runs out:",
    "- 12: Novice",
    "- 11: Normal",
    "- 10: Advanced",
    "- 9: Legendary",
    "- 8: Epic",

    "## Difficulty",
    "You can choose between a hand size of 5 (Easy) or 4 (Hard) in the settings. A smaller hand lets the helper play more often.",
  ],
};
