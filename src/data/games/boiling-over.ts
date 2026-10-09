import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const boilingOver: GameDefinition = {
  path: "/boiling-over",
  title: "Boiling Over",
  source: {
    title: "The Quacks of Quedlinburg",
    designer: "Wolfgang Warsch",
    year: "2018",
    link: "https://boardgamegeek.com/boardgame/244521/the-quacks-of-quedlinburg",
  },
  tags: [GameTag.ModernMechanics, GameTag.ScoringPuzzles],
  rating: {
    complexity: 50,
    difficulty: 40,
    luck: 55,
  },
  thumbnail: "BoilingOver.webp",
  thumbnailCredit: {
    title: "Herttel the Brewer, from the Mendel Housebook",
    artistName: "Unknown artist",
    date: "c. 1425",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Herttel_Pyrprew,_Mendel_Band_I_(1425),_Seite_20v.jpg",
  },
  background: GAME_BACKGROUNDS.sunsetOldCity,
  animation: GameAnimations.Embers,
  gameColorDark: "#272d30",
  gameColorPale: "#e3fff7",
  gameColorAccent: "#4ca8c4",
  cardBack: CardBackColors.Plum,
  quickStart: [
    "Tap your deck to add its top card to the cauldron.",
    "Stop before the black A, 2 and 3 duds add up to more than 7.",
    "Spend your coins on better cards for your deck: each suit does something different.",
  ],
  howToPlay: [
    "## Objective",
    "Score **250 points** or more over **9 rounds** of brewing.",

    "## Your deck",
    "- You start with 11 cards: six **duds** (the black A, 2 and 3) and five ingredients (2♥ 3♥ 4♥ 2♦ 3♦).",
    "- At the start of each round, all your cards are shuffled into your deck.",

    "## Brewing",
    "- Tap your deck to add its top card to the cauldron.",
    "- Each ingredient adds its value to the potion's **strength** (Aces are 1, Jacks 11, Queens 12 and Kings 13).",
    "- If the duds in the cauldron add up to **more than 7**, the potion boils over.",
    "- The bust risk shows the chance that the next card boils the potion over.",

    "## Suits",
    "- **♥ Hearts:** no effect, and the cheapest.",
    "- **♦ Diamonds:** count double towards coins.",
    "- **♣ Clubs:** each one in the cauldron lets it hold 1 more dud.",
    "- **♠ Spades:** the next card of your deck is turned face up. If it's a dud, it goes to the bottom of your deck.",

    "## Stopping",
    "- Stop at any time to score the potion's strength in points. You also get half of it (rounded up) in coins, with diamonds counting double.",
    "- If the potion boils over, choose either the points or the coins.",

    "## Market",
    "- Spend your coins on up to **2 cards of different suits**. They join your deck.",
    "- A card costs its value: hearts +0, diamonds +1, spades +2 and clubs +3.",
    "- Coins you don't spend are lost.",

    "## Ratings",
    "- 250+: Village Healer",
    "- 350+: Court Alchemist",
    "- 450+: Miracle Worker",

    "## Tips",
    "- Diamonds pay off early, while there are markets left to spend their coins in. Near the end, hearts are the most points for your coins.",
    "- Clubs and spades let you brew longer before boiling over: buy them if your potions keep spilling.",
  ],
};
