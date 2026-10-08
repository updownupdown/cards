import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const gambit: GameDefinition = {
  path: "/gambit",
  title: "Gambit",
  thumbnailCredit: {
    title: "The Chess Players",
    artistName: "Liberale da Verona",
    date: "ca. 1475",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/436884",
  },
  tags: [GameTag.TricksAndMelds, GameTag.Puzzles],
  rating: {
    complexity: 35,
    difficulty: 55,
    luck: 10,
  },
  thumbnail: "Gambit.webp",
  background: GAME_BACKGROUNDS.castleIndoors,
  animation: GameAnimations.CandleMotes,
  gameColorDark: "#1e2436",
  gameColorPale: "#f1e3c4",
  gameColorAccent: "#e0a84f",
  cardBack: CardBackColors.Navy,
  quickStart: [
    "Both hands are face up. In each deal, take as many tricks as its contract asks.",
    "Follow the suit led if you can. The highest trump takes the trick, or else the highest card of the suit led.",
    "Your rival leads its highest card that isn't a trump, and answers with its lowest card that wins, or else its lowest card.",
  ],
  howToPlay: [
    "## Objective",
    "Make the contract in all three deals: **6**, **8** and then **10** cards each. A contract is the most tricks its deal allows, so every deal can be made.",

    "## Tricks",
    "- You lead the first trick. Whoever takes a trick leads the next one.",
    "- Follow the suit led if you can. If you can't, play any card.",
    "- The highest trump takes the trick. Without a trump, the highest card of the suit led takes it. Aces are high.",
    "- The card turned up beside the stock sets the trump suit.",

    "## Your Rival",
    "The rival's cards are face up, and it always plays the same way:",
    "- **Leading:** its highest card that isn't a trump. It leads a trump only when it has nothing else.",
    "- **Answering:** its lowest card that takes the trick. If none can, its lowest card.",
    "- Between cards of the same rank, ♣ is lowest, then ♦, ♥ and ♠.",

    "## Losing",
    "The game is lost as soon as a contract can no longer be made. Undo lets you try another line of play.",
  ],
};
