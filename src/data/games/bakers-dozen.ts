import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const bakersDozen: GameDefinition = {
  path: "/bakers-dozen",
  title: "Baker's Dozen",
  aliases: ["Baker's Dozen"],
  tags: [GameTag.TableauBuilding, GameTag.EasyToLearn],
  rating: {
    complexity: 25,
    difficulty: 70,
    luck: 65,
  },
  thumbnail: "BakersDozen.jpg",
  background: GAME_BACKGROUNDS.london,
  gameColorDark: "#253b36",
  gameColorMid: "#134b70",
  gameColorPale: "#edf7e8",
  cardDescription: "Clear thirteen compact columns into four suit foundations.",
  quickStart: [
    "Build foundations up by suit from Ace to King.",
    "Build tableau columns down by rank, regardless of suit.",
    "Move one card at a time; empty columns cannot be used.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to the four foundations.",

    "## Rules",
    "- Foundations build **up by suit** from Ace to King.",
    "- Tableau columns build **down by rank**, regardless of suit.",
    "- Move only one exposed bottom card at a time.",
    "- Empty columns close immediately and cannot be refilled.",
    "- Tap a column to select its bottom card, then tap a valid destination column.",
    "- Double-tap an exposed card to send it to its foundation when possible.",
  ],
};
