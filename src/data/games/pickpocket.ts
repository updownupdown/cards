import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const pickpocket: GameDefinition = {
  path: "/pickpocket",
  title: "Pickpocket",
  enabledOnLocalOnly: true,
  tags: [GameTag.Puzzles, GameTag.ScoringPuzzles],
  rating: {
    complexity: 30,
    difficulty: 45,
    luck: 50,
  },
  thumbnail: "Pickpocket.webp",
  thumbnailCredit: {
    title: "Dandy Pickpockets Diving",
    artistName: "Isaac Robert Cruikshank",
    date: "1818",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/89782",
  },
  background: GAME_BACKGROUNDS.castleIndoors,
  animation: GameAnimations.CandleMotes,
  gameColorDark: "#2b1b22",
  gameColorPale: "#f2dcc4",
  cardBack: CardBackColors.Burgundy,
  cardDescription:
    "Work the royal ball for coins, reading each row and column to tell where the court cards stand.",
  quickStart: [
    "Flip cards: Aces, Twos and Threes multiply your purse.",
    "Each row and column shows its coin total and how many court cards it hides.",
    "Flip a court card and the round's purse is lost. Walk away to keep it.",
  ],
  howToPlay: [
    "## Objective",
    "Steal **750 coins** or more over five rounds.",

    "## Rounds",
    "- Each round deals 25 face-down cards: Aces, Twos, Threes and court cards (Jacks, Queens and Kings).",
    "- Beside each row and below each column is its **coin total** (Aces 1, Twos 2, Threes 3) and its **number of court cards**.",
    "- Every round hides more court cards than the last.",

    "## Flipping",
    "- Tap a card to flip it. Your purse starts at the first card's value, and each card after that multiplies it: a Two doubles it, a Three triples it.",
    "- Flip every Two and Three for a clean sweep, and keep the purse.",
    "- Flip a court card and you are caught: the round's purse is lost.",
    "- You can walk away at any time and keep what's in your purse.",

    "## Ratings",
    "- 750+: Light Fingers",
    "- 850+: Cutpurse",
    "- 950+: Prince of Thieves",
  ],
};
