import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const goFish: GameDefinition = {
  path: "/go-fish",
  title: "Go Fish",
  thumbnailCredit: {
    title: "Boy Fishing",
    artistName: "Eastman Johnson",
    date: "1860s",
    sourceName: "The Cleveland Museum of Art",
    sourceLink: "https://clevelandart.org/art/1915.683",
  },
  enabledOnLocalOnly: true,
  tags: [GameTag.TricksAndMelds, GameTag.PairMatching],
  rating: {
    complexity: 15,
    difficulty: 30,
    luck: 70,
  },
  thumbnail: "GoFish.webp",
  background: GAME_BACKGROUNDS.waterLogs,
  animation: GameAnimations.Mist,
  gameColorDark: "#1d3a44",
  gameColorPale: "#d8f0f4",
  gameColorAccent: "#6fd3dc",
  cardBack: CardBackColors.Teal,
  quickStart: [
    "Tap a card to ask the rival for its rank. If it has any, they're yours, and you ask again.",
    "If it has none, go fish: draw from the pond. Four of a rank is a book.",
    "The rival remembers what you ask for. Make seven books to win.",
  ],
  howToPlay: [
    "## Objective",
    "Make more books than the rival: seven of the thirteen.",

    "## Asking",
    "- You and the rival hold seven cards each. On your turn, tap a card to ask for its rank. The rival hands over every card of that rank it holds, and you ask again.",
    "- If it has none, you go fishing: you draw a card from the pond. If it's the rank you asked for, you ask again; if not, the turn passes.",
    "- Four of a rank is a book, laid down as soon as you have it. An empty hand draws a card from the pond before asking.",

    "## Your Rival",
    "The rival's cards are face down, but it always plays the same way: it asks for a rank it holds that you've asked for, since you must still hold it. Otherwise it asks for the rank it holds most of, the lowest of equals.",

    "## Strategy",
    "Remember what the rival asks for: it holds those ranks, until you take them. And every rank you ask for tells the rival what you hold.",
  ],
};
