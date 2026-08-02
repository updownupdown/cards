import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const foursquare: GameDefinition = {
  path: "/foursquare",
  title: "Foursquare",
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  rating: {
    complexity: 30,
    difficulty: 50,
    luck: 40,
  },
  thumbnail: "Foursquare.jpg",
  background: GAME_BACKGROUNDS.city,
  cardBack: "Foursquare.png",
  gameColorDark: "#1a1e2b",
  gameColorPale: "#fff5ca",
  cardDescription:
    "A tile-laying game where each move can disrupt the precarious grid.",
  quickStart: ["Place drawn card; row/column high or low flips that line."],
  howToPlay: [
    "Each turn, place the top card from the draw deck on a pile within the grid. You can start a new pile (as long as it's adjacent to an existing pile), or place a card on top of an existing pile (piles can have at most 4 cards).",
    "After a card is placed, if that card is the highest or lowest of its row or column, the cards in that row or column are flipped (face up or down). The value of face down cards are not used to determined which cards must be flipped. Aces are worth 1.",
    "At any given time, you must not have more than 4 piles whose top cards are face down.",
    "Win by having all 16 piles end up with a face up top card.",
  ],
  about: [
    "As the major of Flavortown, you are responsible for the placement of new restaurants across the grid. New restaurants (cards) that are the lowest or highest quality (rank) within their row or column will cause other restaurants to go out of business, or open up to challenge the newcomer.",
    "To win, you must manage to have 16 open restaurants (face up) within the 4x4 grid.",
    "This game is adapted from Wil Su's Isaludo collection.",
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
  },
};
