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
  rating: { complexity: 25, difficulty: 55, luck: 55 },
  thumbnail: "FourSeasons.webp",
  thumbnailCredit: {
    title: "The Four Seasons",
    artistName: "Giuseppe Arcimboldo",
    date: "1573",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:%D0%92%D1%80%D0%B5%D0%BC%D0%B5%D0%BD%D0%B0_%D0%B3%D0%BE%D0%B4%D0%B0._%D0%94%D0%B6%D1%83%D0%B7%D0%B5%D0%BF%D0%BF%D0%B5_%D0%90%D1%80%D1%87%D0%B8%D0%BC%D0%B1%D0%BE%D0%BB%D1%8C%D0%B4%D0%BE.jpg",
  },
  background: GAME_BACKGROUNDS.cherryBlossoms,
  animation: GameAnimations.CherryBlossom,
  gameColorDark: "#33402c",
  gameColorPale: "#eef6e4",
  cardBack: CardBackColors.Moss,
  cardDescription:
    "Five cards in a cross and four corners: build the seasons round from the first corner card.",
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
