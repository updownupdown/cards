import { GameDefinition, GameTag } from "../games-data";

export const deadCenter: GameDefinition = {
  path: "/dead-center",
  tip: {
    reveal: "Reveal one face-down zombie if available.",
    play: "Draw, then place by value/color rule on a legal pile.",
    kill: "Kill adjacent zombie if support cards in its line sum to 10.",
  },
  title: "Dead Center",
  thumbnail: "DeadCenter.jpg",
  cardBack: "DeadCenter.png",
  background: "wood-table.jpg",
  cardColorBg: "#201207",
  cardColorText: "#e9f1d9",
  cardDescription:
    "Defend your cabin against a siege of zombies, using supporting cards strategically.",
  rating: {
    complexity: 70,
    difficulty: 50,
    luck: 20,
  },
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  byLine: "Game design by Wil Su, 2021",
  authorName: "Wil Su",
  about: [
    "Your 3x3 cabin is surrounded by zombies! Plan ahead: your ability to attack depends on surrounding cards!",
    "This game is adapted from Wil Su's Isaludo collection.",
  ],
  howToPlay: [
    "You must eliminate all zombies before running out of cards to win.",
    "During each turn, you may reveal a zombie if able, draw and play a card on a valid pile, and kill an adjacent zombie if you can.",
    "A drawn cards can be placed on top of an existing pile if that card is either: of equal value, of the same color and greater value, or of opposite color and less value, than a pile's top card.",
    "You may only kill a zombie adjacent to the last card placed, in addition to meeting the requirements for that zombie's rank. Those requirements depend on the two support cards that are in the same line as the zombie and the last played card. In addition, both support cards must add up to 10 (Jokers and Aces are worth 1).",
    "To kill a King, both support cards must match the King's suit.",
    "To kill a Queen, both support cards must match the Queen's suit.",
    "There are no restrictions to kill Jacks.",
  ],
};
