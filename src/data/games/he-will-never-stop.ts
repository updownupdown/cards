import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";

export const heWillNeverStop: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/he-will-never-stop",
  title: "He Will Never Stop",
  tags: [GameTag.ModernMechanics, GameTag.SequenceBuilding],
  rating: {
    complexity: 55,
    difficulty: 70,
    luck: 45,
  },
  thumbnail: "HeWillNeverStop.jpg",
  background: GAME_BACKGROUNDS.treeRain,
  gameColorDark: "#1b2224",
  gameColorPale: "#daf1f1",
  cardDescription:
    "Keep a fragile line of cards between the final girl and an unstoppable pursuer.",
  quickStart: [
    "Search a rank or move a safe card. Survive until the 32-card deck is empty.",
  ],
  howToPlay: [
    "## Objective",
    "Keep at least one card in the line until the deck is empty. Four adjacent cards of one rank also win immediately.",
    "## Pursuit",
    "At the start of each turn, he discards the left-most card. If that card begins a run of three or more consecutive ranks, he keeps taking cards until fewer than three from that run remain.",
    "## Search",
    "Choose a rank in the line. Discard every card of that rank, then draw the same number of cards onto the right end of the line.",
    "## Try To Escape",
    "Move one card to a new position. You cannot move a card already in a run of three or more. If the move creates or extends a run of three or more, draw two cards onto the right end of the line.",
  ],
};
