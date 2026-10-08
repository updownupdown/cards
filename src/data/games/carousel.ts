import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const carousel: GameDefinition = {
  path: "/carousel",
  title: "Carousel",
  aliases: ["Rummy", "Manipulation Rummy"],
  thumbnailCredit: {
    title: "Chevaux de bois",
    artistName: "Ferdinand du Puigaudeau",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Chevaux_de_bois_(du_Puigaudeau).jpg",
  },
  tags: [GameTag.TricksAndMelds, GameTag.SpatialControl],
  rating: {
    complexity: 40,
    difficulty: 45,
    luck: 40,
  },
  thumbnail: "Carousel.webp",
  background: GAME_BACKGROUNDS.cherryBlossoms,
  animation: GameAnimations.Glitter,
  gameColorDark: "#3a1832",
  gameColorPale: "#ffdbe8",
  gameColorAccent: "#7fd8c6",
  cardBack: CardBackColors.Rose,
  quickStart: [
    "Meld every card in your hand onto the table.",
    "Select cards from your hand or a meld, then tap another meld or an empty place to move them there.",
    "Rearrange the table as you like, but every meld must be whole before you take a card from the carousel.",
  ],
  howToPlay: [
    "## Objective",
    "Empty your hand by melding every card onto the table. You lose if your hand ever holds **12 cards**.",
    "Your score is the number of cards still in the stock and carousel when you go out.",

    "## Melds",
    "- **Set:** three or four cards of the same rank, all of different suits: {7S} {7H} {7D}",
    "- **Run:** three or more cards of one suit in sequence: {9C} {10C} {JC} {QC}",
    "- An Ace is low or high, but not both: {AH} {2H} {3H} and {QH} {KH} {AH} are runs, {KH} {AH} {2H} isn't.",

    "## Moving Cards",
    "- Tap cards to select them, from your hand and from one meld.",
    "- Tap a card of another meld to move the selection there, or an empty place to start a new meld.",
    "- Melds can be split, merged and rebuilt in any way. Cards on the table never go back to your hand.",
    "- A meld that isn't whole is tinted red. Undo takes back any move made since your last card.",

    "## The Carousel",
    "- When you're stuck, tap one of the three carousel cards to take it into your hand. The stock fills its place.",
    "- You can only take a card while every meld on the table is whole. A card taken can't be undone.",
    "- Three melds start on the table. When the carousel runs out, play on until you go out, or press **End Game**.",
  ],
};
