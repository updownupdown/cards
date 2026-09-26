import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const freeCell: GameDefinition = {
  path: "/freecell",
  title: "FreeCell",
  aliases: ["Baker's Game"],
  tags: [GameTag.FreeCellFamily, GameTag.SequenceBuilding],
  rating: {
    complexity: 20,
    difficulty: 40,
    luck: 25,
  },
  thumbnail: "FreeCell.webp",
  thumbnailCredit: {
    title: "Composition with Red, Yellow, and Blue",
    artistName: "Piet Mondrian",
    date: "1927",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://clevelandart.org/art/1967.215",
  },
  background: GAME_BACKGROUNDS.cabinInterior,
  animation: GameAnimations.Dust,
  gameColorDark: "#2b231b",
  gameColorPale: "#fff1dd",
  cardBack: CardBackColors.Bronze,
  cardDescription:
    "An open-information classic where nearly every deal can be won with care.",
  quickStart: [
    "Build foundations up by suit, from A to K.",
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

    "## Baker's Game",
    "FreeCell's ancestor, chosen in the settings: columns build down **in the same suit** instead of in alternating colors.",
  ],
};
