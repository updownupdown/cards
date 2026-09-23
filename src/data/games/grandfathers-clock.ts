import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const grandfathersClock: GameDefinition = {
  path: "/grandfathers-clock",
  title: "Grandfather's Clock",
  tags: [GameTag.SequenceBuilding, GameTag.TableauBuilding],
  rating: {
    complexity: 30,
    difficulty: 30,
    luck: 35,
  },
  thumbnail: "GrandfatherClock.webp",
  background: GAME_BACKGROUNDS.bookstore,
  animation: GameAnimations.Dust,
  gameColorDark: "#2a2118",
  gameColorPale: "#f3e2c2",
  cardBack: CardBackColors.Bronze,
  cardDescription:
    "Wind twelve foundations around a clock face until every hour shows its number.",
  quickStart: [
    "Build each clock foundation up by suit until it shows its hour.",
    "Build the tableau down regardless of suit; K goes on A.",
    "Any card fills an empty pile. Double-tap to send a card up.",
  ],
  howToPlay: [
    "## Objective",
    "Build every foundation on the clock until its top card matches its hour, e.g.:",
    "- the pile at 1 o'clock is an Ace,",
    "- the pile at 2 o'clock is a 2,",
    "- the pile at 11 o'clock is a Jack,",
    "- the pile at 12 o'clock is a Queen.",
    "- etc.",

    "## Rules",
    "- Foundations build **up by suit**, wrapping from King to Ace, and stop at their hour.",
    "- Move top cards one at a time. Build the tableau **down, regardless of suit**.",
    "- Any card may fill an empty pile.",
    "- **Double-tap** a card, or drag it, to play it to its foundation.",
  ],
};
