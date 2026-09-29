import { GameAnimations } from "@/animations";
import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";

export const scorpion: GameDefinition = {
  path: "/scorpion",
  title: "Scorpion",
  tags: [GameTag.SpiderFamily, GameTag.SequenceBuilding],
  rating: {
    complexity: 40,
    difficulty: 75,
    luck: 40,
  },
  thumbnail: "Scorpion.webp",
  thumbnailCredit: {
    title: "Scorpion",
    artistName: "Pierre Roche",
    date: "1897",
    sourceName: "Artvee",
    sourceLink: "https://artvee.com/dl/scorpion-2/",
  },
  background: GAME_BACKGROUNDS.sahara,
  animation: GameAnimations.Sand,
  gameColorDark: "#352b21",
  gameColorPale: "#fff3e4",
  gameColorAccent: "#eb9c72",
  cardBack: CardBackColors.Terracotta,
  quickStart: [
    "Build the four foundations, by suit, from K to A.",
    "Move any face-up stack, even if out of sequence.",
    "Only Kings may fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Build **four complete same-suit sequences**, each running from King down to Ace.",

    "## Rules",
    "- Build columns **down in rank and in the same suit**.",
    "- You may pick up **any face-up card** and move it together with **every card on top of it**, even if those cards are not in sequence.",
    "- Only a **King** (with any cards on it) may move to an **empty column**.",
    "- Assembled sequences are removed from the tableau and placed in the foundations.",

    "## Stock",
    "When no useful move remains, deal the three stock cards, one onto each of the first three columns.",

    "## Wasp",
    "In the Wasp variant, any card (with the cards on it) may move to an empty column.",
  ],
};
