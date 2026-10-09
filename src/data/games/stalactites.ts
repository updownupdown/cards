import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const stalactites: GameDefinition = {
  path: "/stalactites",
  title: "Stalactites",
  tags: [GameTag.FoundationBuilders, GameTag.SequenceBuilding],
  rating: {
    complexity: 20,
    difficulty: 60,
    luck: 40,
  },
  thumbnail: "Stalactites.webp",
  thumbnailCredit: {
    title: "Coves de Mallorca",
    artistName: "Joaquim Mir",
    date: "1903",
    sourceName: "Wikimedia Commons",
    sourceLink: "https://commons.wikimedia.org/wiki/File:Coves_de_Mallorca.jpg",
  },
  background: GAME_BACKGROUNDS.stoneTunnel,
  animation: GameAnimations.CandleMotes,
  gameColorDark: "#1d2329",
  gameColorPale: "#e6e1d6",
  gameColorAccent: "#9cc3d6",
  cardBack: CardBackColors.Navy,
  quickStart: [
    "Choose whether foundations count by ones or twos.",
    "Suits don't matter.",
    "Nothing builds on the columns; two cells hold cards.",
  ],
  howToPlay: [
    "## Goal",
    "Build every foundation to thirteen cards.",
    "## Rules",
    "| Foundations (4) | The first four cards; up by 1 or 2, regardless of suit, wrapping from King to Ace |",
    "| Build | None |",
    "| Move | A column's top card, to a foundation or a cell |",
    "| Empty column | Stays empty |",
    "| Cells (2) | One card each; out to the foundations only |",
    "| Stock | None |",
    "| Cards | 52 |",
    "## Special rules",
    "- Choose whether foundations go up by ones or by twos with the buttons, or play a card one or two above a foundation card and it chooses for you.",
    "## Tips",
    "- Look at the whole deal before choosing ones or twos.",
    "- The cells fill quickly: keep one free for the card that unlocks a column.",
  ],
};
