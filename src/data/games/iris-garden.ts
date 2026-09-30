import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const irisGarden: GameDefinition = {
  path: "/iris-garden",
  title: "Iris Garden",
  enabledOnLocalOnly: true,
  tags: [GameTag.PairMatching, GameTag.SpatialControl],
  rating: {
    complexity: 15,
    difficulty: 25,
    luck: 30,
  },
  thumbnail: "IrisGarden.webp",
  thumbnailCredit: {
    title: "Horikiri Iris Garden, from One Hundred Famous Views of Edo",
    artistName: "Utagawa Hiroshige",
    date: "1857",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Utagawa_Hiroshige_I,_published_by_Uoya_Eikichi_-_Horikiri_Iris_Garden_(Horikiri_no_hanash%C5%8Dbu),_from_the_series_One_Hundred_Famous_Views_of_Edo_(Meish..._-_Google_Art_Project.jpg",
  },
  background: GAME_BACKGROUNDS.cherryBlossoms,
  animation: GameAnimations.Pollen,
  gameColorDark: "#1b2433",
  gameColorPale: "#e8ecf6",
  gameColorAccent: "#b8a4e6",
  cardBack: CardBackColors.Mauve,
  quickStart: [
    "Tap two cards of the same rank to take them.",
    "They must be joined by a path through empty spaces with at most two turns.",
    "Clear the whole garden to win.",
  ],
  howToPlay: [
    "## Objective",
    "Clear all **48 cards** (Ace to Queen) from the garden in pairs.",

    "## Pairs",
    "- Two cards of the **same rank** make a pair, whatever their suits.",
    "- A pair can be taken when a path joins them through **empty spaces**, made of at most three straight lines, so with **no more than two turns**. The path stays inside the garden.",
    "- Cards side by side, or with only empty spaces between them in a line, can always be taken.",
    "- Tap one card, then its partner. The path is drawn as they go.",

    "## End",
    "- Every garden can be cleared.",
    "- You lose if no pair can be taken. Undo lets you try another way.",

    "## Tips",
    "- Each rank has four cards: think about which two to pair first.",
    "- Clearing cards near the middle opens paths for the rest.",
  ],
};
