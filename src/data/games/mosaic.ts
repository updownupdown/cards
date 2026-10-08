import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const mosaic: GameDefinition = {
  path: "/mosaic",
  title: "Mosaic",
  aliases: ["Nonogram", "Picross"],
  thumbnailCredit: {
    title: "Prayer Niche (Mihrab), tile mosaic",
    artistName: "Unknown, Isfahan, Iran",
    date: "16th century or later",
    sourceName: "The Cleveland Museum of Art",
    sourceLink: "https://clevelandart.org/art/1962.23",
  },
  tags: [GameTag.Puzzles, GameTag.GridPlacement],
  rating: {
    complexity: 20,
    difficulty: 50,
    luck: 10,
  },
  thumbnail: "Mosaic.webp",
  background: GAME_BACKGROUNDS.alhambra,
  animation: GameAnimations.Dust,
  gameColorDark: "#3a2a26",
  gameColorPale: "#f5e4d6",
  gameColorAccent: "#f0a27a",
  cardBack: CardBackColors.Terracotta,
  quickStart: [
    "Twenty-five cards lie face down. The clues give the runs of red cards in each row and column, in order.",
    "Tap a card to turn it up. Find every red card; a black card turned up is a slip, and three slips lose.",
    "Every deal has exactly one answer, so it can always be worked out.",
  ],
  howToPlay: [
    "## Objective",
    "Turn up every red card in the square with fewer than three slips.",

    "## Clues",
    "- Beside each row, and above each column, the clues give the lengths of the runs of red cards in it, in order. **2 1** means two reds together, then at least one black, then one red. **0** means no reds at all.",
    "- A card turned up stays up, so every red found is a clue of its own, and so is every slip.",

    "## Slips",
    "Turning up a black card is a slip. Three slips end the game. Every deal is chosen to have exactly one answer, so with care it can always be worked out without a single slip; your score is the slips you had to spare.",
  ],
};
