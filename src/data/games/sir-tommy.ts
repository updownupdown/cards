import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const sirTommy: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/sir-tommy",
  title: "Sir Tommy",
  tags: [GameTag.StockAndWaste],
  rating: {
    complexity: 30,
    difficulty: 60,
    luck: 55,
  },
  thumbnail: "SirTommy.jpg",
  background: GAME_BACKGROUNDS.brickStreet,
  cardBack: "DefaultCardBack.png",
  gameColorDark: "#241a33",
  gameColorPale: "#ecdfff",
  cardDescription:
    "The granddaddy of solitaire: sort the deck across four piles into four Ace-to-King stacks.",
  quickStart: [
    "Build foundations up from A to K, regardless of suit.",
    "Place top stock card on any waste pile.",
  ],
  howToPlay: [
    "## Objective",
    "Build **four foundations** up from **Ace to King**, regardless of suit.",

    "## Playing",
    "- Each turned card must be dropped onto **one of the four waste piles** of your choice.",
    "- Whenever a card matches a foundation (an Ace to start, then the next rank up in **any suit**), it is played up **automatically**.",
    "- Only the **top** card of each waste pile is available to climb.",
    "- You may **not** rearrange the waste piles, so plan where each card lands.",
  ],
  about: [
    "Sir Tommy is often called the oldest recorded solitaire, and it still teaches the core lesson: where you set a card down matters.",
    "You can't rearrange a waste pile, so a King dropped onto a low card buries everything beneath it.",
  ],
  credits: {
    creators: [GameCreators.Unknown],
  },
};
