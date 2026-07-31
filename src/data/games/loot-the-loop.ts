import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const lootTheLoop: GameDefinition = {
  path: "/loot-the-loop",
  title: "Loot the Loop",
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  rating: {
    complexity: 45,
    difficulty: 40,
    luck: 40,
  },
  thumbnail: "LootTheLoop.jpg",
  background: GAME_BACKGROUNDS.dungeon,
  cardBack: "LootTheLoop.png",
  cardColorBg: "#1d120e",
  cardColorText: "#dfd4bd",
  cardDescription:
    "Capture scoring loop cards while preserving momentum and avoiding disruptive breaks.",
  quickStart: [
    "Collect all Aces and exit through the Joker to win. Avoid face up face cards, and use number cards to explore.",
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
    "- **Ace cards are jewels**: you need to collect all four, by landing on them face up, to win the game. Landing on an Ace face down will not collect it.",
    "- **The single Joker card is the exit**: you must land on it, face up, after collecting all the jewels, to escape the dungeon and win. Landing on the Joker face down will not trigger any actions.",
    "- **Face cards are traps**: if you land on one face up, you die instantly. Landing on one face down, or revealing one through the **Look Around** action, will **not** trigger the trap.",
    "- **Number cards are trinkets and allow you to explore**: if you land on one face up, you collect it for extra points. Landing on one face down, or revealing one through the **Look Around** action, will **not** collect the trinket. Use number cards to advance through the loop, counting from the top of the deck, by the value of that card.",
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
  about: [
    'This game is part of the Isaludo collection of games, by Wil Su. Explore and loot the "Template of the Sun", a loop-shaped dungeon filled with trinkets and traps.',
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
  },
};
