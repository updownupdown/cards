import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const parallels: GameDefinition = {
  path: "/parallels",
  title: "Parallels",
  tags: [GameTag.DoubleDeckers, GameTag.SpatialControl, GameTag.StockAndWaste],
  rating: {
    complexity: 35,
    difficulty: 45,
    luck: 55,
  },
  thumbnail: "Parallels.webp",
  thumbnailCredit: {
    title:
      "Sudden Shower over Shin-Ōhashi Bridge and Atake, from One Hundred Famous Views of Edo",
    artistName: "Utagawa Hiroshige",
    date: "1857",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://www.clevelandart.org/art/1921.318",
  },
  background: GAME_BACKGROUNDS.stoneWall,
  animation: GameAnimations.Rain,
  gameColorDark: "#1a1f24",
  gameColorPale: "#e3eaf0",
  gameColorAccent: "#97b4d8",
  cardBack: CardBackColors.Slate,
  quickStart: [
    "Build Aces up and Kings down, by suit.",
    "From three rows on, a card needs an empty space above or below.",
    "The stock fills gaps, or adds a row.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Four Ace to King and four King to Ace, by suit |",
    "| Playable | With one or two rows, every card; from three rows, cards with an empty space above or below |",
    "| Build | None |",
    "| Stock | Fills every gap, or adds a row of 10 |",
    "| Redeals | None |",
    "| Cards | 104 (two decks) |",
  ],
};
