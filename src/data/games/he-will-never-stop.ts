import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";
import { GameCreators } from "../game-creators";

export const heWillNeverStop: GameDefinition = {
  path: "/he-will-never-stop",
  title: "He Will Never Stop",
  tags: [GameTag.ModernMechanics, GameTag.SequenceBuilding],
  rating: {
    complexity: 55,
    difficulty: 70,
    luck: 45,
  },
  thumbnail: "HeWillNeverStop.jpg",
  cardBack: "HeWillNeverStop.jpg",
  background: GAME_BACKGROUNDS.treeRain,
  animation: GameAnimations.Rain,
  gameColorDark: "#1b2224",
  gameColorPale: "#daf1f1",
  cardDescription: "Maintain your precarious lead over an unstoppable pursuer.",
  quickStart: [
    "Reach the end of the stock deck without being caught.",
    "Search a rank or move a safe card. Survive until the 32-card deck is empty.",
  ],
  howToPlay: [
    "## Objective",
    "Reach the end of the stock deck, keeping at least one card (obstacle) between you and your pursuer.",
    "Four adjacent cards of the same rank (building a trap) also win immediately.",

    "## Pursuer",
    "At the start of each turn, the pursuer discards the left-most card.",
    "If that card was at the beginning of a run of three or more consecutive ranks, the pursuer keeps taking cards until fewer than three cards from that run remain.",

    "## Actions",
    "- **Search:**",
    "-- Choose a card in the line, and discard every card of that rank.",
    "-- This allows you to draw the same number of cards onto the right end of the line.",
    "-- Since the pursuer will remove one card, this action always shortens the line by 1 card.",

    "- **(Try To) Escape:**",
    "-- Select a card and shift it to a new position.",
    "-- You cannot move a card already in a run of three or more.",
    "-- If the move creates or extends a run of three or more, draw two cards onto the right end of the line. Otherwise, do not draw any cards.",
    "-- This action may shorten or extend the line, depending on how many cards are drawn.",
  ],
  credits: {
    creators: [GameCreators.ZoeCappallo],
    creationDate: "2025",
  },
};
