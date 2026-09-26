import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const sirTommy: GameDefinition = {
  path: "/sir-tommy",
  title: "Sir Tommy",
  aliases: ["Old Patience", "Puss in the Corner"],
  tags: [GameTag.FoundationBuilders, GameTag.StockAndWaste],
  rating: {
    complexity: 30,
    difficulty: 60,
    luck: 55,
  },
  thumbnail: "SirTommy.webp",
  thumbnailCredit: {
    title: "Sir Thomas More",
    artistName: "Hans Holbein the Younger",
    date: "1527",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Hans_Holbein,_the_Younger_-_Sir_Thomas_More_-_Google_Art_Project.jpg",
  },
  background: GAME_BACKGROUNDS.london,
  animation: GameAnimations.Rain,
  gameColorDark: "#1a2c33",
  gameColorPale: "#fdf7d9",
  cardBack: CardBackColors.Teal,
  cardDescription:
    "The granddaddy of solitaire: sort the deck across four piles into four Ace-to-King stacks.",
  quickStart: [
    "Build foundations up from A to K, regardless of suit.",
    "Cards in the waste piles cannot be moved.",
    "Tap a waste pile to place the stock card there.",
    "Double-tap the stock card or a waste pile's top card to play it to a foundation.",
  ],
  howToPlay: [
    "## Objective",
    "Build four foundations, up from Ace to King, **regardless of suit**.",
    "**Suits can be ignored in this game.**",

    "## Rules",
    "- Each flipped card from the stock must be dropped onto one of the four waste piles.",
    "- You may **not** rearrange the waste piles.",
    "- Only the **top** card of each waste pile can be moved to foundations.",
    "- Tap a waste pile to place the stock card there.",
    "- **Double-tap** the stock card or a waste pile's top card to play it to a foundation.",
    "- There is no redeal.",

    "## Puss in the Corner",
    "In this variant, the Aces start on the foundations, which build up **by color** (either suit of the same color), and the waste piles can be gathered for one redeal.",
  ],
};
