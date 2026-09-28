import { GameDefinition, GameTag } from "../games-data";
import { CardBackColors } from "../card-backs";

export const charlatan: GameDefinition = {
  path: "/charlatan",
  title: "Charlatan",
  enabledOnLocalOnly: true,
  tags: [GameTag.ModernMechanics, GameTag.ScoringPuzzles],
  rating: {
    complexity: 50,
    difficulty: 40,
    luck: 55,
  },
  thumbnail: "Charlatan.webp",
  thumbnailCredit: {
    title: "Quae Genus with a Quack Doctor",
    artistName: "Thomas Rowlandson",
    date: "October 1, 1821",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/789257",
  },
  gameColorDark: "#2a1d2b",
  gameColorPale: "#f0e1ec",
  cardBack: CardBackColors.Plum,
  quickStart: [
    "Tap your deck to add its top card to the cauldron.",
    "Stop before the black A, 2 and 3 duds add up to more than 7.",
    "Spend your coins on better cards for your deck, then brew again.",
  ],
  howToPlay: [
    "## Objective",
    "Score **150 points** or more over **9 rounds** of brewing.",

    "## Your deck",
    "- You start with 11 cards: six **duds** (the black A, 2 and 3) and five ingredients (2♥ 3♥ 4♥ 2♦ 3♦).",
    "- At the start of each round, all your cards are shuffled into your deck.",

    "## Brewing",
    "- Tap your deck to add its top card to the cauldron.",
    "- Each ingredient adds its value to the potion's **strength** (Aces are 1, Jacks 11, Queens 12 and Kings 13).",
    "- If the duds in the cauldron add up to **more than 7**, the potion boils over.",
    "- The bust risk shows the chance that the next card boils the potion over.",

    "## Effects",
    "- **♥ Hearts:** no effect.",
    "- **♦ Diamonds:** if you stop with a diamond as the last card, it counts twice.",
    "- **♣ Clubs:** if the card before it is a dud, the dud goes back into your deck.",
    "- **♠ Spades:** the next card of your deck is turned face up.",

    "## Stopping",
    "- Stop at any time to score the potion's strength in points, and get half of it (rounded up) in coins.",
    "- If the potion boils over, choose either the points or the coins.",

    "## Market",
    "- Spend your coins on up to **2 cards of different suits**. They join your deck.",
    "- A heart costs its value. Diamonds, clubs and spades cost 1 more.",
    "- Coins you don't spend are lost.",

    "## Ratings",
    "- 150+: Village Healer",
    "- 200+: Court Alchemist",
    "- 250+: Miracle Worker",
  ],
};
