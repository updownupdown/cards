import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const baroness: GameDefinition = {
  path: "/baroness",
  title: "Baroness",
  tags: [GameTag.PairMatching],
  rating: {
    complexity: 15,
    difficulty: 50,
    luck: 60,
  },
  thumbnail: "Baroness.webp",
  thumbnailCredit: {
    title: "Portrait of the Baroness of Bernus",
    artistName: "Philipp Veit",
    date: "1838",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Portrait_of_the_Baroness_of_Bernus_(SM_1798).png",
  },
  background: GAME_BACKGROUNDS.cozyRoom2,
  animation: GameAnimations.Dust,
  gameColorDark: "#3a1620",
  gameColorPale: "#f3d6dd",
  gameColorAccent: "#e2bf8d",
  cardBack: CardBackColors.Rose,
  quickStart: [
    "Remove pairs that total 13.",
    "Kings go out alone.",
    "Deal when stuck.",
  ],
  howToPlay: [
    "## Goal",
    "Discard all 52 cards.",
    "## Rules",
    "| Playable | The top card of each pile |",
    "| Remove | Pairs that total 13, or a King alone |",
    "| Values | Ace 1, Jack 11, Queen 12 |",
    "| Empty pile | Any top card on Easy; stays empty on Difficult |",
    "| Stock | Deals one card to every pile |",
    "| Redeals | None |",
  ],
};
