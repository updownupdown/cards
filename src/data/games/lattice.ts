import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const lattice: GameDefinition = {
  path: "/lattice",
  title: "Lattice",
  source: {
    title: "Sagrada",
    designer: "Adrian Adamescu and Daryl Andrews",
    year: "2017",
    link: "https://boardgamegeek.com/boardgame/199561/sagrada",
  },
  enabledOnLocalOnly: true,
  tags: [GameTag.Puzzles, GameTag.GridPlacement, GameTag.ScoringPuzzles],
  rating: { complexity: 45, difficulty: 50, luck: 40 },
  background: GAME_BACKGROUNDS.alhambra,
  animation: GameAnimations.Glints,
  gameColorDark: "#2a2340",
  gameColorPale: "#ebe0f7",
  gameColorAccent: "#d9b26a",
  cardBack: CardBackColors.Violet,
  quickStart: [
    "Fill a window of 4 by 5 panes with cards, two offered at a time.",
    "Tap an offered card, then a pane: the first card goes on the edge, every later one touches a placed card.",
    "No card may sit directly beside the same suit or the same rank.",
  ],
  howToPlay: [
    "## Objective",
    "Glaze a window of 4 rows and 5 columns with cards from Ace to 10, scoring for its patterns. A score of 30 or more wins.",

    "## Placing",
    "- Two cards are turned from the stock each turn. Tap one, then a pane to set it there; the other is discarded.",
    "- The **first card** goes in a pane on the window's edge. Every later card must **touch** a placed card, along a side or a corner.",
    "- A card may never sit **directly beside** (above, below, left or right of) a card of the **same suit** or the **same rank**.",
    "- **Pass** discards both offered cards. It is the only way on when neither fits anywhere.",
    "- The game ends when the window is full or the stock and offer are used up. There are exactly enough cards for the window, so every pass leaves a pane empty.",

    "## Scoring",
    "- **+4** for each column of four different suits.",
    "- **+5** for each row of five different ranks.",
    "- **+1** for each card that touches a card of its own suit at a corner.",
    "- A **favour suit** is drawn for each game: every card of that suit in the window scores its rank (Ace 1, 10 ten).",
    "- **−1** for each empty pane at the end.",

    "## Ratings",
    "- 30+: Fine Window",
    "- 40+: Rose Window",
    "- 50+: Cathedral Glass",

    "## Tips",
    "- Keep a card's orthogonal neighbours in mind before you place it: a 7 beside a 7 or a heart beside a heart is never allowed, so each pane you fill shuts out more cards from the panes around it.",
    "- A column of four suits and a row of five ranks pay well, but a single wrong card spoils the whole line.",
    "- The favour suit scores most at high ranks: find room for its 8, 9 and 10.",
  ],
};
