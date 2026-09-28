import { GameDefinition, GameTag } from "../games-data";
import { CardBackColors } from "../card-backs";

export const fortyThieves: GameDefinition = {
  path: "/forty-thieves",
  title: "Forty Thieves",
  aliases: ["Napoleon at St Helena", "Josephine", "Lucas", "Busy Aces"],
  tags: [GameTag.FortyThievesFamily, GameTag.StockAndWaste],
  rating: {
    complexity: 35,
    difficulty: 85,
    luck: 45,
  },
  thumbnail: "FortyThieves.webp",
  thumbnailCredit: {
    title: "Second Scene of Thieves",
    artistName: "Gror",
    date: "ca. 1805",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/394910",
  },
  gameColorDark: "#2E2D34",
  gameColorPale: "#EFE8FF",
  cardBack: CardBackColors.Violet,
  quickStart: [
    "Build all 8 foundations up by suit from A to K.",
    "Build tableau columns down by suit, moving one card at a time.",
    "Turn cards from the stock to the waste one at a time, with no redeal.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 104 cards to the eight foundations, each built up by suit from Ace to King.",

    "## Rules",
    "- Send cards to the foundations up by suit from Ace to King.",
    "- Build tableau columns **down in rank and in the same suit**.",
    "- Move only one card at a time between columns.",
    "- Any single card may be placed onto an empty column.",
    "- Turn cards from the stock one at a time to the waste pile. The top waste card is playable.",
    "- There is no redeal, unless you allow unlimited redeals in the settings.",

    "## Variants",
    "- **Josephine**: same-suit runs move together.",
    "- **Lucas**: thirteen columns of three, with the Aces starting on the foundations.",
    "- **Busy Aces**: twelve columns of two, the bottom card face down.",
  ],
};
