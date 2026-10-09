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
    "Build the cross down on any suit.",
    "Nothing goes on an Ace.",
    "Any card fills an empty space.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, regardless of suit; nothing on an Ace |",
    "| Move | One card at a time |",
    "| Empty space | Any card |",
    "| Stock | Draw 1 |",
    "| Redeals | None, or 1 on Easy |",
    "| Cards | 52 |",
    "## Special rules",
    "- One Ace is taken from the stock to start the first foundation; the other Aces start the rest as they turn up.",
  ],
};
