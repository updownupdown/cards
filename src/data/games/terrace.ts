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
  enabledOnLocalOnly: true,
  tags: [GameTag.DoubleDeckers, GameTag.StockAndWaste, GameTag.TableauBuilding],
  rating: { complexity: 45, difficulty: 60, luck: 40 },
  thumbnail: "Terrace.webp",
  thumbnailCredit: {
    title: "Two Sisters (On the Terrace)",
    artistName: "Pierre-Auguste Renoir",
    date: "1881",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/14655",
  },
  background: GAME_BACKGROUNDS.greece,
  animation: GameAnimations.Leaves,
  gameColorDark: "#2c3440",
  gameColorPale: "#e6eef8",
  cardBack: CardBackColors.Ocean,
  cardDescription:
    "Choose the foundation rank, then clear a long terrace of cards before the stock runs out.",
  quickStart: [
    "Tap one of the four highlighted cards to choose the foundation rank.",
    "Foundations build up in alternating colors, wrapping from King to Ace.",
    "The terrace's exposed card can only go to a foundation.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 104 cards to the eight foundations.",
    "## Starting",
    "- Four cards are dealt to the tableau. Tap one to start the first foundation: its rank is the **base rank** of every foundation.",
    "- The other columns are then dealt, one card each.",
    "## Foundations",
    "- Each foundation starts with a card of the base rank.",
    "- Build up in **alternating colors**, wrapping from King to Ace, until each foundation holds 13 cards.",
    "## Rules",
    "- Only the exposed card of the **terrace** (the reserve) is available, and it can only go to a foundation.",
    "- Build columns **down in alternating colors**, wrapping from Ace to King. Move one card at a time.",
    "- An empty column must be filled from the waste, or by tapping the stock, which then deals straight into it.",
    "- Turn the stock one card at a time. There is no redeal.",
    "## Variants",
    "- **General's Patience**: a thirteen-card terrace, and foundations build up by suit.",
    "- **Blondes and Brunettes**: a ten-card terrace, and the first card dealt sets the base rank.",
    "- **Falling Star**: like Blondes and Brunettes, with an eleven-card terrace and eight columns.",
  ],
};
