import { GameDefinition, GameTag } from "../games-data";

export const streetsAndAlleys: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/streets-and-alleys",
  tip: {
    default: {
      text: "Expose Aces first; columns down any suit; foundations up suit.",
    },
  },
  title: "Streets and Alleys",
  thumbnail: "DefaultThumbnail.jpg",
  cardBack: "DefaultCardBack.png",
  background: "concrete.jpg",
  cardColorBg: "#2a2a2e",
  cardColorText: "#e6e6ea",
  cardDescription:
    "Beleaguered Castle with the Aces buried — free them and build every suit home.",
  stats: {
    complexity: 45,
    difficulty: 65,
    luck: 30,
  },
  // tags: [GameTag.ClassicSolitaire, GameTag.AIGenerated],
  tags: [GameTag.Beta],
  about: [
    "Streets and Alleys is the tougher cousin of Beleaguered Castle: nothing is placed for you.",
    "Everything is face up, so a win is a pure test of move order and patience.",
  ],
  howToPlay: [
    "## Objective",
    "Build all four **foundations** up by suit from **Ace to King**.",
    "## Setup",
    "- All 52 cards are dealt into **8 columns** (four of 7 cards, four of 6), all face up.",
    "- The **foundations begin empty** — the Aces are somewhere in the tableau.",
    "## Playing",
    "- Tap an **exposed** card (the outer end of a column), then tap a destination.",
    "- Build columns **down by rank**, regardless of suit, moving one card at a time.",
    "- Start each foundation with an **Ace**, then build **up by suit**.",
    "- An **empty column** may be filled with any single card.",
    "## Winning",
    "Complete all four foundations to win. If no legal move remains, the game is lost.",
  ],
};
