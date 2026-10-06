import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const littleWindmill: GameDefinition = {
  path: "/little-windmill",
  title: "Little Windmill",
  aliases: ["Four Seasons", "Corner Card", "Vanishing Cross"],
  tags: [GameTag.FoundationBuilders, GameTag.StockAndWaste],
  rating: { complexity: 25, difficulty: 65, luck: 55 },
  thumbnail: "LittleWindmill.webp",
  thumbnailCredit: {
    title: "A Windmill on a Polder Waterway, Known as ‘In the Month of July’",
    artistName: "Paul Joseph Constantin Gabriël",
    date: "about 1889",
    sourceName: "Rijksmuseum",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Een_molen_aan_een_poldervaart,_bekend_als_%E2%80%98In_de_maand_juli%E2%80%99_Rijksmuseum_SK-A-1505.jpeg",
  },
  background: GAME_BACKGROUNDS.cherryBlossoms,
  animation: GameAnimations.CherryBlossom,
  gameColorDark: "#33402c",
  gameColorPale: "#eef6e4",
  gameColorAccent: "#e69db5",
  cardBack: CardBackColors.Moss,
  quickStart: [
    "An Ace starts the first corner foundation; the other Aces start the rest.",
    "Foundations build up by suit, from Ace to King.",
    "Build the cross down in any suit, one card at a time.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to the four corner foundations.",
    "## Foundations",
    "- An **Ace** is taken out of the stock to start the first foundation. The other three start with the other Aces as they turn up.",
    "- Build each foundation **up by suit**, from Ace to King.",
    "## The Cross",
    "- Build the five piles of the cross **down, regardless of suit**. Nothing goes on an Ace.",
    "- Only the top card of each pile is available, and cards move one at a time.",
    "- Any available card may fill an empty space in the cross.",
    "## Stock",
    "- Turn the stock one card at a time onto the waste.",
    "- On Normal there is no redeal. On Easy, the waste may be turned over once to go through the stock again.",
  ],
};
