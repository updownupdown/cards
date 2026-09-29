import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const ouroboros: GameDefinition = {
  path: "/ouroboros",
  title: "Ouroboros",
  tags: [
    GameTag.DungeonCrawler,
    GameTag.ScoringPuzzles,
    GameTag.SpatialControl,
  ],
  rating: {
    complexity: 55,
    difficulty: 40,
    luck: 40,
  },
  thumbnail: "Ouroboros.webp",
  thumbnailCredit: {
    title: "Alchemical Serpent (Ouroboros)",
    artistName: "Unknown medieval illuminator",
    date: "1478",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Serpiente_alquimica.jpg",
  },
  background: GAME_BACKGROUNDS.stoneTunnel,
  animation: GameAnimations.ManaDust,
  gameColorDark: "#1d120e",
  gameColorPale: "#dfd4bd",
  gameColorAccent: "#bf8de2",
  cardBack: CardBackColors.Burgundy,
  quickStart: [
    "Collect all Aces and exit through the Joker to win.",
    "Lose by landing on face up face cards.",
    "Use number cards to mark paths and explore.",
  ],
  howToPlay: [
    "## Objective",
    "- Loot all four jewels (Aces) and escape alive by stepping through the exit (Joker).",
    "- Landing on traps (face cards), while they are face up, means instant death.",
    "- Collect trinkets (number cards) for extra points.",

    "## Rules",
    "- You will progress through the dungeon by looping through the deck of cards, exploring a certain number of spaces ahead of you each time.",
    "- Landing on a **face down card is always safe** and will not trigger any actions, regardless of the card rank.",
    "- Landing on a **face up card will trigger its effect**, if any.",

    "## Card Types",
    "- **Jewels (Aces)**:",
    "-- You need to collect all four, by landing on them face up, to win the game.",
    "-- Landing on a face down Ace will not collect it.",
    "- **Traps (J, Q, K)**",
    "-- If you land on one face up, you die instantly.",
    "-- Landing on one face down, or revealing one through the **Look Around** action, will **not** trigger the trap.",
    "- **Trinkets (1, 2, 3... 10)**",
    "-- If you land on one face up, you collect it for extra points.",
    "-- Landing on one face down, or revealing one through the **Look Around** action, will **not** collect the trinket.",
    "-- Use number cards to advance through the loop, counting from the top of the deck, by the value of that card.",
    "- **Exit (Joker)**",
    "-- You must land on it, face up, after collecting all the jewels, to escape the dungeon and win.",
    "-- Landing on the Joker face down will not trigger any actions.",
    "- Card suits have no meaning or effect.",

    "## Actions",
    "- **Look Around:** Turn the top two cards of the deck; this may only be performed if the top card is face down.",
    "- **Explore**: Choose one of the two top cards, if it is face up and a number card. Move forward through the loop by the value of that card.",
    "- **Mark a Path**: You can mark up to three paths by moving one of the top two cards to an empty path slot, if that card is face up, and a number card.",
    "- **Return to Path**: You can select a marked path and move it to the top of the deck.",
    "## Tips",
    "- **Mark paths whenever you can!** If the two top cards are not number cards, and you do not have any marked path, **you will lose instantly**. Having more marked paths also gives you more options to move by specific amounts to effectively avoid traps.",
    "- You can use the **Mark a Path** and **Return to Path** actions multiple times in a row without exploring. This allows you to manipulate the top card order to control how far to explore, and which card you will land on.",
  ],
};
