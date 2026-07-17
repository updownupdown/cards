import { GameDefinition, GameTag } from "../games-data";

export const riverboat: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/riverboat",
  tip: {
    default: {
      text: "Place dealt card; each row and column is a poker hand.",
    },
  },
  title: "Riverboat",
  thumbnail: "DefaultThumbnail.jpg",
  cardBack: "DefaultCardBack.png",
  background: "felt-dark-green.jpg",
  cardColorBg: "#10352a",
  cardColorText: "#f2d98a",
  cardDescription:
    "Deal 25 cards into a 5x5 table where every row and column pays as a poker hand.",
  stats: {
    complexity: 60,
    difficulty: 65,
    luck: 35,
  },
  tags: [GameTag.Beta],
  about: [
    "Riverboat is a game of nerve at the poker table: 25 cards, one hand at a time, no takebacks.",
    "Luck deals the cards, but the pot is won by the player who plans two hands at once and never wastes a seat.",
  ],
  byLine: "Game design by James Carmichael, 2026",
  howToPlay: [
    "## Objective",
    "Fill the **5x5 table** so the ten poker hands (5 rows + 5 columns) total at least **par** points.",
    "## Dealing",
    "- One card is dealt at a time; place it into any **empty seat**.",
    "- The **Next** cards show what's coming so you can plan ahead.",
    "- Cards can't be moved once placed, and the deal never stops until the table is full.",
    "## Scoring",
    "- Each **row** and each **column** is scored as its best five-card poker hand.",
    "- Every card belongs to one row **and** one column, so a single seat can build two hands.",
    "## Payouts (per line)",
    "- Royal Flush **100**, Straight Flush **75**, Four of a Kind **50**, Full House **25**.",
    "- Flush **20**, Straight **15**, Three of a Kind **10**, Two Pair **5**, One Pair **2**.",
    "## Winning",
    "- When all 25 seats are filled, you **win** if the pot meets or beats par; otherwise the house takes it.",
  ],
};
