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
  gameColorDark: "#253b36",
  gameColorPale: "#edf7e8",
  cardBack: CardBackColors.Ocean,
  quickStart: [
    "Build foundations up by suit from A to K.",
    "Build tableau columns down by rank, regardless of suit.",
    "Move one card at a time; empty columns cannot be used.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to the four foundations, building up by suit, from Ace to King.",

    "## Rules",
    "- Foundations build **up by suit** from Ace to King.",
    "- Tableau columns build **down by rank**, regardless of suit.",
    "- Move only one exposed bottom card at a time.",
    "- Empty columns close immediately and cannot be refilled.",
    "- Tap a column to select its bottom card, then tap a valid destination column.",
    "- Double-tap an exposed card to send it to its foundation when possible.",
  ],
};
