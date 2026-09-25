import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const royalRest: GameDefinition = {
  path: "/royal-rest",
  title: "Royal Rest",
  thumbnail: "RoyalRest.webp",
  background: GAME_BACKGROUNDS.cabinInterior,
  animation: GameAnimations.Dust,
  tags: [GameTag.PairMatching, GameTag.SequenceBuilding],
  rating: {
    complexity: 30,
    difficulty: 45,
    luck: 55,
  },
  gameColorDark: "#332518",
  gameColorPale: "#def7ff",
  cardBack: CardBackColors.Ocean,
  cardDescription:
    "Collapse matching rank cards into pillows, and tuck in all the Jacks to bed.",
  quickStart: [
    "Create four stacks of pillow-Jack-pillow.",
    "Create pillows by stacking four matching ranks together.",
    "Jacks can be placed on pillows, empty columns, or columns without another unseparated Jack.",
    "Any number card, stack or pillow can be put onto a Jack.",
  ],
  howToPlay: [
    "## Objective",
    "Tuck in all the Jacks by collapsing the entire board to **four separate stacks of pillow-Jack-pillow** (Jacks with a pillow below and above them).",
    "Create pillows by stacking all four cards of the same rank together.",

    "## Number Cards",
    "- Can be moved from the top of the columns onto other cards of the same rank.",
    "- Can be moved to empty columns when they become available.",
    "- Cards of the same rank form a stack that can be moved together.",

    "## Pillows",
    "- A stack of four cards of the same rank becomes a pillow.",
    "- A pillow can only be moved onto a Jack or an empty column.",
    "- Multiple pillows do not stack on each other.",
    "- You cannot place number cards and their stacks on pillows.",

    "## Jacks",
    "- Can be placed on pillows or in any column without another unseparated Jack.",
    "- Any number card, stack, or pillow can be placed on a Jack.",
    "- You cannot take Jacks into your hand (their initial top location) once placed.",
  ],
};
