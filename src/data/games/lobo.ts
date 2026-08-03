import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const lobo: GameDefinition = {
  path: "/lobo",
  title: "Lobo",
  tags: [GameTag.ModernMechanics, GameTag.CardCombat],
  rating: {
    complexity: 60,
    difficulty: 85,
    luck: 40,
  },
  thumbnail: "Lobo.jpg",
  background: GAME_BACKGROUNDS.forest,
  animation: GameAnimations.Leaves,
  gameColorDark: "#311a20",
  gameColorPale: "#f7e2ca",
  cardDescription:
    "Empty the Wolf's hand through clever captures... and know when to fold.",
  quickStart: [
    "Capture the Wolf's cards by using match/sum/split/overtake actions.",
  ],
  howToPlay: [
    "## Objective",
    "Empty the **Wolf's hand** each round, and race the Wolf to **100 points**.",
    "## Gameplay",
    "Win a round by capturing all the Wolf's cards, using one of the actions below. The Wolf does not take turns. When no actions are available, or when it is strategically smart, you may **fold** to end the round.",
    "- **Perfect:** one of your cards is of the **same rank** as a Wolf card. Draws the next card into **your** hand.",
    "- **Sum:** two or more of your cards add up to one Wolf card (e.g. a 6 and 4 may capture a 10). Draws the next card into **your** hand.",
    "- **Split:** several Wolf cards add up to one of yours (e.g. a 9 may capture a 6 and 3). The next card goes to the **Wolf**.",
    "- **Over:** one of your cards takes a Wolf card of a **smaller rank**. The Wolf draws a number of cards equal to the **difference** (a 6 taking a 4 gives the Wolf 2 cards).",
    "- **Fold:** you may fold at any time, or when you have no captures left. This ends the round.",
    "## Scoring",
    "- If you empty the Wolf's hand, you **win the round** and score the total of the cards left in your hand.",
    "- Otherwise, the Wolf scores the total of **its** remaining cards.",
    "- The first to **100** points wins the game.",
    "## Tips",
    "- Pay attention to the next card in the deck, and who it may go to depending on the capture action you take.",
    "- Sometimes folding early is the right move, as it keeps the Wolf's score small.",
    "- You may change the difficulty settings to help you learn the game. Fewer high rank cards make the Wolf easier to beat.",
  ],
  about: [
    "Lobo — The Wolf — is a notoriously hard solitaire game by James Ernest for the Postas deck (ranks 1-10, five suits; here Aces are 1s and suits are ignored).",
    '"The wolf takes small bites": often the smart play is the cheapest way to lose, not a risky win.',
  ],
  credits: {
    creators: [GameCreators.JamesErnest],
    creationDate: "2022",
  },
};
