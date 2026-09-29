import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const blackberryPie: GameDefinition = {
  path: "/blackberry-pie",
  title: "Blackberry Pie",
  tags: [GameTag.ModernMechanics, GameTag.SequenceBuilding],
  rating: {
    complexity: 40,
    difficulty: 60,
    luck: 50,
  },
  background: GAME_BACKGROUNDS.forestGrasses,
  animation: GameAnimations.Leaves,
  thumbnail: "BlackberryPie.webp",
  thumbnailCredit: {
    title: 'Gathering Berries (from "Harper\'s Weekly," Vol. XVIII)',
    artistName: "Winslow Homer",
    date: "July 11, 1874",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/348612",
  },
  gameColorDark: "#2a1c33",
  gameColorPale: "#f7e4ff",
  gameColorAccent: "#d897c6",
  cardBack: CardBackColors.Mauve,
  quickStart: [
    "Choose a hand or retainer card, then place it under an available berry.",
    "After the first play, place beside the previous column unless you played a joker.",
    "Collect every berry card to win.",
  ],
  howToPlay: [
    "## Objective",
    "**Collect all ten club berry cards** by completing a suitable set beneath each one.",
    "",
    "## Your Turn",
    "- Your hand refills to three cards from the stock whenever possible.",
    "- Choose a card from your hand or either retainer, then choose a berry column.",
    "- After the first card, play immediately left or right of the previous column.",
    "- A joker lets your next card go under any uncollected berry, including the same column.",
    "",
    "## Collecting Berries",
    "A set is any three non-joker cards beneath a berry that includes its rank and is either:",
    "- A run of three consecutive ranks.",
    "- Three cards of the same suit.",
    "- Three picture cards (Jacks, Queens, or Kings).",
    "Extra cards may remain beneath a collected berry.",
    "",
    "## Scoring",
    "Score the pip values of your collected berries, **5 bonus points** for collecting all ten, and **1 point** for every card left in hand.",
  ],
};
