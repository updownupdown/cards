import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const bristol: GameDefinition = {
  path: "/bristol",
  title: "Bristol",
  enabledOnLocalOnly: true,
  tags: [GameTag.CastlesAndFans, GameTag.TableauBuilding],
  rating: { complexity: 25, difficulty: 60, luck: 40 },
  thumbnail: "Bristol.webp",
  thumbnailCredit: {
    title: "S.E. Vincent’s Rock near Bristol",
    artistName: "Charles Joseph Hullmandel",
    date: "1821",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/13777",
  },
  gameColorDark: "#2a3638",
  gameColorPale: "#e2f1f2",
  cardBack: CardBackColors.Teal,
  quickStart: [
    "Build foundations up from Ace to King, regardless of suit.",
    "Build fans down, regardless of suit, one card at a time.",
    "Tap the stock to deal a card onto each reserve pile.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to the four foundations, each built up from Ace to King **regardless of suit**.",
    "## Deal",
    "- Eight fans of three cards are dealt, with any King moved to the bottom of its fan.",
    "- Three reserve piles start with one card each.",
    "## Rules",
    "- The top card of each fan and each reserve pile is available.",
    "- Build fans **down, regardless of suit**, moving one card at a time.",
    "- An empty fan is never refilled.",
    "- Tap the **stock** to deal three cards, one onto each reserve pile. Cards can't be played onto the reserve piles.",
    "- There is no redeal.",
  ],
};
