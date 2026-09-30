import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const stalactites: GameDefinition = {
  path: "/stalactites",
  title: "Stalactites",
  enabledOnLocalOnly: true,
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
  animation: GameAnimations.Mist,
  gameColorDark: "#1d2329",
  gameColorPale: "#e6e1d6",
  gameColorAccent: "#9cc3d6",
  cardBack: CardBackColors.Navy,
  quickStart: [
    "Foundations build up regardless of suit, wrapping from King to Ace.",
    "Choose whether they build by ones or by twos, or let your first foundation play decide.",
    "Top cards go only to the foundations, or to the two cells.",
  ],
  howToPlay: [
    "## Objective",
    "Build all four **foundations** to thirteen cards each.",

    "## Deal",
    "- The first four cards start the four foundations.",
    "- The other 48 cards are dealt into eight columns of six.",

    "## Foundations",
    "- The foundations build either **by ones** (7, 8, 9…) or **by twos** (7, 9, J…), the same for all four. Choose with the buttons, or play a card one or two above a foundation card and it chooses for you.",
    "- Foundations build up **regardless of suit**, wrapping from King to Ace, until each holds thirteen cards.",

    "## Moves",
    "- Move the top card of a column to a foundation or to one of the **two cells**.",
    "- A card in a cell can only go to a foundation.",
    "- Cards are never built on the columns, and an empty column stays empty.",
    "- Tap a card to send it to a foundation, or to a cell if it doesn't fit, or drag it where you want it. Until the step is chosen, a card that could go either way has to be dragged.",

    "## Tips",
    "- Look at the whole deal before choosing ones or twos.",
    "- The cells fill quickly: keep one free for the card that unlocks a column.",
  ],
};
