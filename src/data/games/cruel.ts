import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const cruel: GameDefinition = {
  path: "/cruel",
  title: "Cruel",
  tags: [GameTag.TableauBuilding],
  rating: {
    complexity: 30,
    difficulty: 55,
    luck: 35,
  },
  thumbnail: "Cruel.webp",
  background: GAME_BACKGROUNDS.darkAlley,
  animation: GameAnimations.Embers,
  gameColorDark: "#2c1919",
  gameColorMid: "#8f3d3d",
  gameColorPale: "#f7e0da",
  cardDescription:
    "Twelve open piles, no stock, and a redeal that reshapes everything you built.",
  quickStart: [
    "Build foundations up by suit from the Aces.",
    "Move top cards down by suit; spaces stay empty.",
    "After any move, tap the redeal pile to re-form the piles in fours.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards onto the four foundations, built up by suit from Ace to King.",

    "## Rules",
    "- Only the top card of a pile can move, onto a foundation or onto a pile **one rank higher in the same suit**.",
    "- Empty piles are **never** refilled.",
    "- Tap the **redeal** pile to gather the piles in order, without shuffling, and deal them out again in fours.",
    "- You may redeal as often as you like, but only after making a move since the last redeal.",
  ],
};
