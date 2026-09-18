import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const grandfathersClock: GameDefinition = {
  path: "/grandfathers-clock",
  title: "Grandfather's Clock",
  tags: [GameTag.TableauBuilding, GameTag.SequenceBuilding],
  rating: {
    complexity: 30,
    difficulty: 30,
    luck: 35,
  },
  thumbnail: "GrandfatherClock.webp",
  background: GAME_BACKGROUNDS.bookstore,
  animation: GameAnimations.Dust,
  gameColorDark: "#2a2118",
  gameColorMid: "#8c6a3f",
  gameColorPale: "#f3e2c2",
  cardDescription:
    "Wind twelve foundations around a clock face until every hour shows its number.",
  quickStart: [
    "Build each clock foundation up by suit until it shows its hour.",
    "Build the tableau down regardless of suit; K goes on A.",
    "Any card fills an empty pile. Double-tap to send a card up.",
  ],
  howToPlay: [
    "## Objective",
    "Build every foundation on the clock until its top card matches its hour. Jacks count 11 and Queens 12.",

    "## Rules",
    "- Twelve cards start the clock, from the **10♥** at 1 o'clock round to the **9♣** at 12 o'clock.",
    "- Foundations build **up by suit**, wrapping from King to Ace, and stop at their hour.",
    "- The rest of the deck is dealt into **eight piles of five**.",
    "- Move top cards one at a time. Build the tableau **down regardless of suit**, placing a King on an Ace.",
    "- Any card may fill an empty pile.",
    "- **Double-tap** a card, or drag it, to play it to its foundation.",
  ],
};
