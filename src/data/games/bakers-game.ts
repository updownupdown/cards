import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const bakersGame: GameDefinition = {
  path: "/bakers-game",
  title: "Baker's Game",
  aliases: ["Baker's Game"],
  tags: [GameTag.SequenceBuilding],
  rating: {
    complexity: 25,
    difficulty: 55,
    luck: 25,
  },
  background: GAME_BACKGROUNDS.cozyRoom4,
  animation: GameAnimations.Dust,
  thumbnail: "BakersGame.webp",
  gameColorDark: "#1b2a24",
  gameColorPale: "#dcefe4",
  cardBack: CardBackColors.Ocean,
  cardDescription:
    "FreeCell's tougher ancestor: build the tableau down in suit, not colour.",
  quickStart: [
    "Build foundations up by suit (A to K).",
    "Build tableau columns down by suit.",
    "Use 4 free cells to move cards.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to the four **foundations**, each built up by suit from Ace to King.",

    "## Rules",
    "- Build the foundations up by suit, from Ace to King.",
    "-- Double-tap a card to send it to a valid foundation.",
    "- Build tableau columns **down in rank, and in the same suit** (for example a {9S} on a {10S}).",
    "- Any card may be move to an empty column.",
    "- Move one card at a time; each **free cell** holds a single card.",
    "-- You can move a stacked sequence of cards, as long as you have enough free cells and empty columns.",
  ],
};
