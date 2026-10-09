import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const bakersDozen: GameDefinition = {
  path: "/bakers-dozen",
  title: "Baker's Dozen",
  aliases: ["Baker's Dozen"],
  tags: [GameTag.CastlesAndFans, GameTag.SequenceBuilding],
  rating: {
    complexity: 20,
    difficulty: 45,
    luck: 15,
  },
  thumbnail: "BakersDozen.webp",
  thumbnailCredit: {
    title: "The Baker",
    artistName: "Job Berckheyde",
    date: "ca. 1681",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:The_Baker,_circa_1681,_by_Job_Adriaensz_Berckheyde_(1630-1693)_-_IMG_7331.JPG",
  },
  background: GAME_BACKGROUNDS.cozyRoom3,
  animation: GameAnimations.Dust,
  gameColorDark: "#253b36",
  gameColorPale: "#edf7e8",
  gameColorAccent: "#e2bf8d",
  cardBack: CardBackColors.Ocean,
  quickStart: [
    "Build down on any suit.",
    "Move one card at a time.",
    "Empty columns stay empty.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, regardless of suit |",
    "| Move | One card at a time |",
    "| Empty column | Stays empty |",
    "| Stock | None |",
    "| Cards | 52 |",
    "## Special rules",
    "- Kings go to the bottom of their column in the deal.",
  ],
};
