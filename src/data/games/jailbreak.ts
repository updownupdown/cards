import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const jailbreak: GameDefinition = {
  path: "/jailbreak",
  title: "Jailbreak",
  aliases: ["Joker Escape"],
  tags: [GameTag.PairMatching, GameTag.EasyToLearn],
  rating: {
    complexity: 25,
    difficulty: 40,
    luck: 50,
  },
  thumbnail: "Jailbreak.webp",
  background: GAME_BACKGROUNDS.stoneWall,
  animation: GameAnimations.Spiders,
  gameColorDark: "#17211d",
  gameColorPale: "#d9eee3",
  cardBack: CardBackColors.Pine,
  cardDescription:
    "Match equal red and black totals to break the Joker through a wall.",
  quickStart: [
    "Expose one of the side walls to allow the Joker to escape.",
    "Clear cards by selecting exposed red and black cards with equal totals.",
    "When stuck, press the draw deck to add a card on the Joker.",
  ],
  howToPlay: [
    "## Objective",
    "Allow the Joker to escape by clearing one of the four **walls** around the Joker, while leaving no cards on the Joker.",

    "## Playing",
    "- Select any exposed red and black cards whose values make equal totals. The matched cards clear automatically.",
    "- Aces count as 1, Jacks as 11, Queens as 12, and Kings as 13.",
    "- Cleared jail piles reveal their next card. Clearing a corner does not free the Joker.",
    "- Tap the Draw deck to place its top card on the Joker. At most three cards may be stacked there, and only the top one is available.",
    "- The Joker cannot escape until every card stacked on it has been cleared.",

    "## Difficulty",
    "Fewer corner cards increase difficulty by restricting available options.",
    "Easy difficulty places 4 cards in each corner, Normal places 2, and Hard leaves the corners empty.",
  ],
};
