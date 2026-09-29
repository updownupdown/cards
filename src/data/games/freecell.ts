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
    complexity: 25,
    difficulty: 30,
    luck: 5,
  },
  thumbnail: "FreeCell.webp",
  thumbnailCredit: {
    title:
      "The room of Cornelis de Witt in prison The Gevangenpoort, The Hague, 1844",
    artistName: "Jacobus Ludovicus Cornet",
    date: "1844",
    sourceName: "Rijksmuseum",
    sourceLink:
      "https://www.rijksmuseum.nl/en/collection/object/The-room-of-Cornelis-de-Witt-in-prison-The-Gevangenpoort-The-Hague-1844--2ee2ca395f6f78ff00f09456efbd73a5",
  },
  background: GAME_BACKGROUNDS.cabinInterior,
  animation: GameAnimations.Dust,
  gameColorDark: "#2b231b",
  gameColorPale: "#fff1dd",
  cardBack: CardBackColors.Bronze,
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
