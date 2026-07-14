import { GameDefinition, DEFAULT_GAME_THUMBNAIL, GameTag } from "../games-data";

export const optritaLines: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/optrita-lines",
  tutorial: {
    default: {
      text: "Challenge a line; first suit match wins by rank, else trump.",
    },
  },
  title: "Optrita Lines",
  thumbnail: DEFAULT_GAME_THUMBNAIL,
  cardColorBg: "#1b2233",
  cardColorText: "#dce6ff",
  background: "felt-grey.jpg",
  cardDescription:
    "A one-player trick-taking duel against a 6x6 grid that fights only by hiding its cards.",
  stats: {
    complexity: 70,
    difficulty: 60,
    luck: 50,
  },
  // tags: [GameTag.ModernMechanics, GameTag.AIGenerated],
  tags: [GameTag.Beta],
  briefRules: [
    "Play a card and challenge a full row or column from one end.",
    "Cards flip until one matches your suit — the higher rank wins that trick (Aces high).",
    "No suit match? The grid's lowest trump beats you; with no trump either, you capture any card and win.",
    "First to 21 tricks wins the game.",
  ],
  about: [
    "Optrita Lines is a solitaire trick-taker: you attack lines of a face-down grid, revealing one card at a time.",
    "More information helps, but every reveal also closes off lines you can no longer challenge.",
  ],
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
