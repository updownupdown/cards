import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const royalCotillion: GameDefinition = {
  path: "/royal-cotillion",
  title: "Royal Cotillion",
  tags: [
    GameTag.DoubleDeckers,
    GameTag.SequenceBuilding,
    GameTag.StockAndWaste,
  ],
  rating: {
    complexity: 40,
    difficulty: 50,
    luck: 70,
  },
  thumbnail: "RoyalCotillion.webp",
  thumbnailCredit: {
    title: "Charles II dancing at a Ball at Court",
    artistName: "Hieronymus Janssens",
    date: "1660",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Hieronymus_Janssens_(Antwerp_1624_-_Antwerp_1693)_-_Charles_II_dancing_at_a_Ball_at_Court_-_RCIN_400525_-_Royal_Collection.jpg",
  },
  background: GAME_BACKGROUNDS.alhambra,
  animation: GameAnimations.ManaDust,
  gameColorDark: "#211a36",
  gameColorPale: "#f1e6ff",
  gameColorAccent: "#eac86e",
  cardBack: CardBackColors.Violet,
  quickStart: [
    "Foundations build by suit in steps of two.",
    "On the left only bottom cards play; on the right, every card.",
    "Gaps on the right refill from the waste.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Four from Ace and four from 2, up by suit in steps of two, wrapping from King to Ace |",
    "| Playable | Left: each column's bottom card. Right: every card |",
    "| Build | None |",
    "| Empty space | Left: stays empty. Right: refills from the waste, then the stock |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
    "| Cards | 104 (two decks) |",
  ],
};
