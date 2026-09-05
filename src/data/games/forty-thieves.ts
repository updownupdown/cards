import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const fortyThieves: GameDefinition = {
  path: "/forty-thieves",
  title: "Forty Thieves",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: {
    complexity: 0,
    difficulty: 0,
    luck: 0,
  },
  thumbnail: "FortyThieves.jpg",
  background: GAME_BACKGROUNDS.field,
  animation: GameAnimations.Birds,
  gameColorDark: "#2E2D34",
  gameColorMid: "#705aaf",
  gameColorPale: "#EFE8FF",
  cardDescription: "A demanding two-deck foundation building patience.",
  quickStart: [
    "Build all 8 foundations up by suit from A to K.",
    "Build tableau columns down by suit, moving one card at a time.",
    "Turn cards from the stock to the waste one at a time; no redeal.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 104 cards to the eight foundations, each built up by suit from Ace to King.",

    "## Rules",
    "- Send cards to the foundations up by suit from Ace to King.",
    "- Build tableau columns **down in rank and in the same suit**.",
    "- Move only one card at a time between columns.",
    "- Any single card may be placed onto an empty column.",
    "- Turn cards from the stock one at a time to the waste pile. The top waste card is playable.",
    "-- Easy mode has infinite redeal.",
    "-- Hard mode has no redeal.",
  ],
};
