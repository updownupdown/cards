import { GameAnimations } from "@/animations";
import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";

export const royalMarriage: GameDefinition = {
  path: "/royal-marriage",
  title: "Royal Marriage",
  tags: [GameTag.ClearTheBoard, GameTag.PairMatching],
  rating: {
    complexity: 25,
    difficulty: 85,
    luck: 35,
  },
  thumbnail: "RoyalMarriage.webp",
  thumbnailCredit: {
    title: "The Wedding by Proxy of Marie de' Medici to King Henry IV",
    artistName: "Peter Paul Rubens",
    date: "1622–25",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Peter_Paul_Rubens_-_The_Wedding_by_Proxy_of_Marie_de%27_Medici_to_King_Henry_IV.jpg",
  },
  background: GAME_BACKGROUNDS.fallLeaves,
  animation: GameAnimations.Leaves,
  gameColorDark: "#351219",
  gameColorPale: "#fffccf",
  gameColorAccent: "#e2b08d",
  cardBack: CardBackColors.Terracotta,
  quickStart: [
    "Discard cards between two that match in rank or suit.",
    "Bring the Queen and King of Hearts together.",
  ],
  howToPlay: [
    "## Goal",
    "Discard every card but the Queen and King of Hearts, ending side by side.",
    "## Rules",
    "| Playable | Every card in the line |",
    "| Remove | One or two cards between two that match in rank or suit; a longer run only if it's all one suit |",
    "| Stock | None; every card is dealt in a line |",
    "## Special rules",
    "- Select the card or cards to remove, then press **Discard**.",
    "- The Queen of Hearts starts the line, the King of Hearts ends it, and neither ever leaves.",
  ],
};
