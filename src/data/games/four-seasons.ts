import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const fourSeasons: GameDefinition = {
  path: "/four-seasons",
  title: "Four Seasons",
  aliases: ["Corner Card", "Vanishing Cross"],
  enabledOnLocalOnly: true,
  tags: [GameTag.FoundationBuilders, GameTag.StockAndWaste],
  rating: { complexity: 25, difficulty: 65, luck: 55 },
  thumbnail: "FourSeasons.webp",
  thumbnailCredit: {
    title: "The Seasons",
    artistName: "Alphonse Mucha",
    date: "1896",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Alfons_Mucha_-_The_Seasons,_1896.jpg",
  },
  background: GAME_BACKGROUNDS.cherryBlossoms,
  animation: GameAnimations.CherryBlossom,
  gameColorDark: "#33402c",
  gameColorPale: "#eef6e4",
  gameColorAccent: "#e69db5",
  cardBack: CardBackColors.Moss,
  quickStart: [
    "The corner card sets the rank every foundation starts from.",
    "Foundations build up by suit, wrapping from King to Ace.",
    "Build the cross down in any suit, one card at a time.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to the four corner foundations.",
    "## Foundations",
    "- The first corner card sets the **base rank**. The other three foundations start with the other cards of that rank.",
    "- Build each foundation **up by suit**, wrapping from King to Ace, until it holds 13 cards.",
    "## The Cross",
    "- Build the five piles of the cross **down, regardless of suit**. Ranks wrap round, so a King may go on an Ace, unless Aces are the base rank.",
    "- Only the top card of each pile is available, and cards move one at a time.",
    "- Any available card may fill an empty space in the cross.",
    "## Stock",
    "Turn the stock one card at a time onto the waste. There is no redeal.",
  ],
};
