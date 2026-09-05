import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const freeCell: GameDefinition = {
  path: "/freecell",
  title: "FreeCell",
  aliases: ["FreeCell"],
  tags: [GameTag.TableauBuilding],
  rating: {
    complexity: 20,
    difficulty: 40,
    luck: 30,
  },
  thumbnail: "FreeCell.jpg",
  background: GAME_BACKGROUNDS.cabinInterior,
  animation: GameAnimations.Dust,
  gameColorDark: "#2b231b",
  gameColorMid: "#af8a5a",
  gameColorPale: "#fff1dd",
  cardDescription:
    "An open-information classic where nearly every deal can be won with care.",
  quickStart: [
    "Build foundations up by suit, from A to K",
    "Build tableau columns down in rank, in alternating colors.",
    "Use free cells to hold one card at a time.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to the four **foundations**, each built up by suit from Ace to King.",

    "## Rules",
    "- Build tableau columns **down in rank, alternating color**.",
    "- Move one card at a time; each **free cell** holds a single card.",
    "- You can move one card at a time. You may move groups of cards together, but only if you have enough free cells and empty columns to have been able to make the equivalent move one card at a time.",
    "- Any card may be placed onto an empty column.",
  ],
};
