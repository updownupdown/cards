import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const penguin: GameDefinition = {
  path: "/penguin",
  title: "Penguin",
  source: {
    title: "Penguin",
    designer: "David Parlett",
    year: "1979",
    link: "https://boardgamegeek.com/boardgamedesigner/166/david-parlett",
  },
  aliases: ["Penguin"],
  tags: [GameTag.FreeCellFamily, GameTag.SequenceBuilding],
  rating: {
    complexity: 40,
    difficulty: 45,
    luck: 10,
  },
  thumbnail: "Penguin.webp",
  thumbnailCredit: {
    title:
      "Rockhopper and Little Penguins, from A History of the Birds of New Zealand",
    artistName: "John Gerrard Keulemans",
    date: "1873",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:History_of_the_birds_of_NZ_1st_ed_p344.jpg",
  },
  background: GAME_BACKGROUNDS.antarctica,
  animation: GameAnimations.Snow,
  gameColorDark: "#111b27",
  gameColorPale: "#ff944d",
  gameColorAccent: "#8fd3f4",
  cardBack: CardBackColors.Terracotta,
  quickStart: [
    "Foundations start at the beak card's rank.",
    "Build down by suit.",
    "Only the rank below the beak fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Up by suit from the beak's rank, wrapping from King to Ace |",
    "| Build | Down, same suit, wrapping from Ace to King |",
    "| Move | One card, or a run if free spaces allow |",
    "| Empty column | The rank below the beak |",
    "| Stock | None |",
    "| Cards | 52 |",
    "## Special rules",
    "- The first card dealt, the **beak**, starts a foundation and sets every foundation's first rank.",
  ],
};
