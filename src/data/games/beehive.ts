import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const beehive: GameDefinition = {
  path: "/beehive",
  title: "Beehive",
  tags: [GameTag.PairMatching],
  rating: {
    complexity: 20,
    difficulty: 25,
    luck: 50,
  },
  thumbnail: "Beehive.webp",
  thumbnailCredit: {
    title: "Flowers and Bees",
    artistName: "Unknown Chinese artist",
    date: "18th century",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/51410",
  },
  background: GAME_BACKGROUNDS.flowerGarden,
  animation: GameAnimations.Bees,
  gameColorDark: "#1e2b16",
  gameColorPale: "#f4f9d3",
  cardBack: CardBackColors.Honey,
  cardDescription:
    "Clear four-card sets from six same-rank tableau slots using the beehive, waste, and stock.",
  quickStart: [
    "Match cards by rank and clear every four-card set.",
    "Tap a beehive or waste card to place it automatically.",
    "Flip three stock cards when you need new options.",
  ],
  howToPlay: [
    "## Objective",
    "Clear all 52 cards by making four-card sets of the same rank.",

    "## Rules",
    "- Each of the six tableau slots can only hold one rank at a time.",
    "- Gather all four cards of the same rank to form a set and clear it from the tableau.",
    "- Fill empty tableau slots with cards from the beehive or waste.",
    "- Tap a card to move it automatically onto a matching stack.",
  ],
};
