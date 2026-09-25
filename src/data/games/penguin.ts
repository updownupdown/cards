import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const penguin: GameDefinition = {
  path: "/penguin",
  title: "Penguin",
  aliases: ["Penguin"],
  tags: [GameTag.FreeCellFamily, GameTag.SequenceBuilding],
  rating: {
    complexity: 45,
    difficulty: 60,
    luck: 25,
  },
  thumbnail: "Penguin.webp",
  background: GAME_BACKGROUNDS.antarctica,
  animation: GameAnimations.Snow,
  gameColorDark: "#111b27",
  gameColorPale: "#ff944d",
  cardBack: CardBackColors.Terracotta,
  cardDescription:
    "A FreeCell-like game building suit runs from a random beak rank.",
  quickStart: [
    "From the beak rank, build foundations up by suit and tableau down in suit.",
  ],
  howToPlay: [
    "## Objective",
    'Build all four foundations up by suit, from the "beak rank" until each holds 13 cards.',

    "## Foundations",
    "- The first foundation starts with the **beak card**, selected at random each time.",
    "- Build up foundations **by suit** from the beak rank, wrapping past the King back to the Ace.",

    "## Tableau",
    "- Build tableau columns down **by suit**, wrapping from Ace to King.",
    "- Each **free cell** holds one card.",
    "- You can move one card at a time. You may move groups of cards together, but only if you have enough free cells and empty columns to have been able to make the equivalent move one card at a time.",
    "- An **empty column** may only be filled by a card ranked **one below the beak** (or a sequence headed by it).",
  ],
};
