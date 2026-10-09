import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const terrace: GameDefinition = {
  path: "/terrace",
  title: "Terrace",
  aliases: [
    "Queen of Italy",
    "General's Patience",
    "Blondes and Brunettes",
    "Falling Star",
  ],
  tags: [GameTag.DoubleDeckers, GameTag.StockAndWaste, GameTag.TableauBuilding],
  rating: { complexity: 45, difficulty: 60, luck: 40 },
  thumbnail: "Terrace.webp",
  thumbnailCredit: {
    title: "Red Terrace",
    artistName: "Milan Milovanović",
    date: "1920",
    sourceName: "Artvee",
    sourceLink: "https://artvee.com/dl/red-terrace/",
  },
  background: GAME_BACKGROUNDS.greece,
  animation: GameAnimations.Leaves,
  gameColorDark: "#2c3440",
  gameColorPale: "#e6eef8",
  gameColorAccent: "#e2b08d",
  cardBack: CardBackColors.Ocean,
  quickStart: [
    "Pick the base rank for every foundation.",
    "Build down in alternating colors.",
    "Terrace cards only go to the foundations.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Up from the base rank in alternating colors, wrapping from King to Ace |",
    "| Build | Down, alternating colors, wrapping from Ace to King |",
    "| Move | One card at a time |",
    "| Empty column | Must be filled, from the waste or the stock |",
    "| Terrace (11) | Top card, to the foundations only |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
    "| Cards | 104 (two decks) |",
    "## Special rules",
    "- Four cards are dealt first: tap one to start the first foundation and set the base rank.",
    "## Variants",
    "- **General's Patience**: a thirteen-card terrace, and foundations build up by suit.",
    "- **Blondes and Brunettes**: a ten-card terrace, and the first card dealt sets the base rank.",
    "- **Falling Star**: like Blondes and Brunettes, with an eleven-card terrace and eight columns.",
  ],
};
