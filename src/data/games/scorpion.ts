import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const scorpion: GameDefinition = {
  path: "/scorpion",
  title: "Scorpion",
  tags: [GameTag.TableauBuilding],
  rating: {
    complexity: 0,
    difficulty: 0,
    luck: 0,
  },
  thumbnail: "Scorpion.jpg",
  background: GAME_BACKGROUNDS.sahara,
  gameColorDark: "#33262A",
  gameColorPale: "#FFE4E8",
  cardDescription:
    "Untangle face-up columns into four same-suit runs from King to Ace.",
  quickStart: ["Build down in suit; move any face-up stack; kings fill empty."],
  howToPlay: [
    "## Objective",
    "Build **four complete same-suit sequences**, each running from King down to Ace.",
    "## Setup",
    "- Deal **7 columns of 7 cards**.",
    "- In the first four columns the top three cards are face down; the rest of the layout is face up.",
    "- The last 3 cards form the **stock**.",
    "## Playing",
    "- Build columns **down in rank and the same suit** (for example a {6S} onto a {7S}).",
    "- You may pick up **any face-up card** and move it together with **every card on top of it**, even if those cards are not in sequence.",
    "- A face-down card is turned face up once it becomes the exposed (last) card of its column.",
    "- Only a **King** (with any cards on it) may move to an **empty column**.",
    "## Stock",
    "When no useful move remains, deal the three stock cards, one onto each of the first three columns.",
    "## Winning",
    "You win once all four King-to-Ace same-suit sequences are assembled.",
  ],
  about: [
    "Scorpion is a tense, tangle-heavy cousin of Spider played with a single deck.",
    "Because you can drag buried cards along with their cover, freeing a key card is a puzzle in itself.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
    creationDate: "First documented in the 1940s",
  },
};
