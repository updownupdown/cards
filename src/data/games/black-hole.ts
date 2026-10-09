import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const blackHole: GameDefinition = {
  path: "/black-hole",
  title: "Black Hole",
  source: {
    title: "Black Hole",
    designer: "David Parlett",
    year: "1979",
    link: "https://boardgamegeek.com/boardgamedesigner/166/david-parlett",
  },
  aliases: ["Singularity", "All in a Row"],
  tags: [GameTag.FoundationBuilders, GameTag.SequenceBuilding],
  rating: {
    complexity: 15,
    difficulty: 60,
    luck: 15,
  },
  thumbnail: "BlackHole.webp",
  thumbnailCredit: {
    title: "Ascent of the Blessed",
    artistName: "Hieronymus Bosch",
    date: "ca. 1500–04",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Hieronymus_Bosch_013.jpg",
  },
  background: GAME_BACKGROUNDS.nightSky,
  animation: GameAnimations.Stars,
  gameColorDark: "#150e25",
  gameColorPale: "#d4cbff",
  gameColorAccent: "#e2cd8d",
  cardBack: CardBackColors.Violet,
  quickStart: [
    "Play a card one rank above or below the black hole's card.",
    "Ace and King meet.",
  ],
  howToPlay: [
    "## Goal",
    "Pull every card into the black hole.",
    "## Rules",
    "| Playable | The top card of each fan |",
    "| Remove | Into the black hole, one rank above or below its card |",
    "| Values | Ace and King meet |",
    "| Stock | None |",
    "## Special rules",
    "- The Ace of Spades starts in the black hole.",
    "## Variants",
    "- **All in a Row**: thirteen columns of four, and the black hole starts empty, taking any card first.",
    "## Tips",
    "- There is no stock and no reshuffle, so plan your moves in order and as far in advance as possible.",
    "- Avoid dead ends, or getting to the end game with cards that are not adjacent in rank.",
  ],
};
