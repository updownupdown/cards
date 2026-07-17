import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const lobo: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/lobo",
  tip: {
    default: {
      text: "Capture by match/sum/split/overtake; fold to limit Wolf score.",
    },
  },
  title: "Lobo",
  thumbnail: DEFAULT_GAME_THUMBNAIL,
  cardColorBg: "#2b1220",
  cardColorText: "#f0d9c2",
  background: "felt-dark-red.jpg",
  cardDescription:
    "Empty the Wolf's hand through clever captures — and know when to fold.",
  stats: {
    complexity: 60,
    difficulty: 85,
    luck: 40,
  },
  // tags: [GameTag.ModernMechanics, GameTag.AIGenerated],
  tags: [GameTag.Beta],
  about: [
    "Lobo — The Wolf — is a notoriously hard solitaire game by James Ernest for the Postas deck (ranks 1-10, five suits; here Aces are 1s and suits are ignored).",
    '"The wolf takes small bites": often the smart play is the cheapest way to lose, not a risky win.',
  ],
  byLine: "Game design by James Ernest, 2022",
  howToPlay: [
    "## Objective",
    "Empty the **Wolf's hand** each round. Across rounds, race the Wolf to **100 points**.",
    "## Setup",
    "- Four cards for the Wolf (top), four for you (bottom). Aces count as **1**; suits are ignored.",
    "- The top of the deck — the **Cub** — is always face up.",
    "## Your captures",
    "- **Perfect:** one of your cards removes a Wolf card of the **same rank**. You then draw the Cub into **your** hand.",
    "- **Sum:** two or more of your cards adding up to one Wolf card (e.g. {6H}+{4S} take a 10). You draw the Cub into **your** hand.",
    "- **Split:** one of your cards captures several Wolf cards that add up to it (e.g. a 9 takes {6H}+{3S}). The Cub goes to the **Wolf**.",
    "- **Over:** one of your cards takes a **smaller** Wolf card; the Wolf then draws cards equal to the **difference** (a 6 taking a 4 gives the Wolf 2 cards).",
    "- **Fold:** stop at any time, or when you have no captures left.",
    "## Scoring",
    "- Empty the Wolf's hand to **win the round** and score the total of the cards left in your hand.",
    "- Otherwise the Wolf scores the total of **its** remaining cards. Sometimes folding early keeps that number small.",
    "- First to **100** wins the match.",
    "## Difficulty",
    "- In settings, choose **Hard** (full deck), **Ordinary** (no 10s), or **Easy** (no 9s or 10s).",
  ],
};
