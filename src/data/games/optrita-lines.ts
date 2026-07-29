import { GameDefinition, GameTag } from "../games-data";

export const optritaLines: GameDefinition = {
  path: "/optrita-lines",
  tip: {
    default:
      "Pick a card and line; first suit match wins by rank, otherwise trump suit wins.",
  },
  title: "Optrita: Lines",
  thumbnail: "OptritaLines.jpg",
  cardColorBg: "#1b2233",
  cardColorText: "#dce6ff",
  background: "felt-grey.jpg",
  cardDescription:
    "A one-player trick-taking duel against a 6x6 grid that fights only by hiding its cards.",
  rating: {
    complexity: 40,
    difficulty: 50,
    luck: 30,
  },
  tags: [GameTag.ModernMechanics],
  about: [
    "Optrita: Lines is a solitaire trick-taker: you attack lines of a face-down grid, revealing one card at a time.",
    "More information helps, but every reveal also closes off lines you can no longer challenge.",
  ],
  byLine: "Game design by Stephen Tudor, 2023",
  authorName: "Stephen Tudor",
  howToPlay: [
    "## Objective",
    "Win **21 tricks** before the grid does.",
    "## Setup",
    "- A **6x6 grid** is dealt face down, except the bottom-left to top-right diagonal, which starts face up.",
    "- Each round you're dealt **7 cards**; pick **one as trump** (it only helps the grid), leaving **6** for six tricks.",
    "## Each trick",
    "- Select a hand card and **challenge a line** (a full row or column) from one of its ends using the arrows.",
    "- Cards flip inward one at a time until one **matches your suit**; that card is removed.",
    "- **Higher rank wins** (Aces high): win and it's your trick, lose and it's the grid's.",
    "- **No matching suit?** The line's **lowest trump** card beats you (trump always wins).",
    "- **No matching suit and no trump?** You capture **any** card in the line and win the trick.",
    "- A challenged line and the crossing line both lose a card, so you can't challenge them again this round.",
    "## Winning",
    "- Each trick is one point. **First to 21** wins.",
    "- **Hard mode** (Settings) lowers the grid's target, giving it the edge.",
  ],
};
