import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const calculation: GameDefinition = {
  path: "/calculation",
  title: "Calculation",
  tags: [
    GameTag.FoundationBuilders,
    GameTag.SequenceBuilding,
    GameTag.StockAndWaste,
  ],
  rating: {
    complexity: 45,
    difficulty: 65,
    luck: 30,
  },
  thumbnail: "Calculation.webp",
  thumbnailCredit: {
    title: "Portrait of Luca Pacioli",
    artistName: "Jacopo de' Barbari",
    date: "between 1495 and 1500",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Jacopo_de'_Barbari_(attributed_to)_Portrait_of_Luca_Pacioli_(1445_1517)_with_a_student_(Guidobaldo_da_Montefeltro)_(2).jpg",
  },
  background: GAME_BACKGROUNDS.geometricCeiling,
  animation: GameAnimations.Dust,
  gameColorDark: "#12122b",
  gameColorPale: "#eccfff",
  gameColorAccent: "#e2bf8d",
  cardBack: CardBackColors.Violet,
  quickStart: [
    "Foundations count by ones, twos, threes and fours.",
    "Suits don't matter.",
    "Waste cards only go to the foundations.",
  ],
  howToPlay: [
    "## Goal",
    "Build every foundation up to a King.",
    "## Rules",
    "| Foundations (4) | Start A, 2, 3, 4; build up in steps of 1, 2, 3, 4, regardless of suit, wrapping from King to Ace |",
    "| Waste piles (4) | Any card; only the top card plays, to a foundation |",
    "| Stock | Draw 1, onto a foundation or a waste pile |",
    "| Redeals | None |",
    "| Cards | 52 |",
    "## Special rules",
    "- Foundation 1: A, 2, 3, 4 … K.",
    "- Foundation 2: 2, 4, 6, 8, 10, Q, A, 3 … K.",
    "- Foundation 3: 3, 6, 9, Q, 2, 5 … K.",
    "- Foundation 4: 4, 8, Q, 3, 7 … K.",
  ],
};
