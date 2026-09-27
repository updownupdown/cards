import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const crazyQuilt: GameDefinition = {
  path: "/crazy-quilt",
  title: "Crazy Quilt",
  aliases: ["Japanese Rug", "Indian Carpet"],
  tags: [GameTag.DoubleDeckers, GameTag.SpatialControl, GameTag.StockAndWaste],
  rating: {
    complexity: 40,
    difficulty: 55,
    luck: 45,
  },
  thumbnail: "CrazyQuilt.webp",
  thumbnailCredit: {
    title: "‘Crazy Quilt’ with Animals",
    artistName: "Florence Elizabeth Marvin",
    date: "1886",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/181720",
  },
  background: GAME_BACKGROUNDS.cozyCabin,
  animation: GameAnimations.Snow,
  gameColorDark: "#2c1d26",
  gameColorPale: "#fbe3ea",
  cardBack: CardBackColors.Rose,
  cardDescription:
    "Unpick a quilt of upright and sideways cards, one free end at a time.",
  quickStart: [
    "Move all 104 cards to the foundations.",
    "Build Aces up, and Kings down, by suit.",
    "Play a quilt card when one of its short ends is uncovered.",
    "A free card with no foundation can be played to the waste pile, up or down in suit.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 104 cards onto the eight foundations.",

    "## Foundations",
    "- Aces build **up** by suit to Kings; Kings build **down** by suit to Aces.",

    "## Rules",
    "- A quilt card is **free** when at least one of its **short ends** is not touching another card.",
    "- Tap a free card to play it to a foundation or, failing that, onto the **waste** if it is one rank above or below the top waste card in the same suit.",
    "- Gaps in the quilt are never refilled.",
    "- Tap the **stock** to turn one card onto the waste. Once it runs out, tap it to turn the waste over **once**, without shuffling.",
  ],
};
