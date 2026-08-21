import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const trickKlondike: GameDefinition = {
  path: "/trick-klondike",
  title: "Trick Klondike",
  tags: [GameTag.TableauBuilding, GameTag.StockAndWaste],
  rating: {
    complexity: 50,
    difficulty: 65,
    luck: 40,
  },
  background: GAME_BACKGROUNDS.yukon,
  animation: GameAnimations.Clouds,
  gameColorDark: "#243c35",
  gameColorPale: "#edf7eb",
  cardDescription:
    "Clear a Klondike tableau by taking tricks with a six-card hand.",
  quickStart: [
    "Play only the front card of your six-card hand.",
    "Beat a same-suit tableau card with a higher rank; Aces beat Kings.",
    "Or build down in alternating colors and draw a replacement.",
    "Select three hand cards to discard and draw three replacements.",
  ],
  howToPlay: [
    "## Objective",
    "Clear all seven tableau columns. Your final score starts at 12.",

    "## Your hand",
    "- Your hand is a six-card queue. Only its **front** card may be played.",
    "- Cards won in tricks go to the **back** of the hand.",
    "- A card played to build a tableau column is replaced by the next stock card.",
    "- Select any three cards to discard them and draw three replacements. Use Reset to return the selection to the front card.",

    "## Stock and score",
    "- When the stock runs out, the discard pile is shuffled into a new stock. Each reshuffle costs 1 point.",
    "- Two jokers are available each game. Using one costs 2 points and sends the joker face down to the back of its pile.",
    "- Final score: **12 - 2 per joker used - 1 per stock reshuffle**.",

    "## Take tricks",
    "- Beat a tableau card by playing a **higher card of the same suit**.",
    "- Aces are low except that an **Ace beats a King**.",
    "- The beaten tableau card joins the back of your hand; your played card is discarded.",

    "## Build columns",
    "- Instead of taking a trick, build **down by alternating color**, as in Klondike.",
    "- Only Kings may be placed on empty columns.",
    "- Tableau cards turn face up when uncovered.",
  ],
};
