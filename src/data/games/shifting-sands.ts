import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const shiftingSands: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/shifting-sands",
  title: "Shifting Sands",
  tags: [GameTag.TableauBuilding, GameTag.ModernMechanics],
  rating: {
    complexity: 45,
    difficulty: 60,
    luck: 55,
  },
  background: GAME_BACKGROUNDS.sahara,
  animation: GameAnimations.Sand,
  gameColorDark: "#385d68",
  gameColorPale: "#f4d99b",
  cardDescription:
    "Gather sand, build outward without changing direction, and make a castle strong enough to survive high tide.",
  quickStart: [
    "Draw 1–7 cards, optionally reverse them, then play across adjacent columns in one direction.",
  ],
  howToPlay: [
    "## Objective",
    "Finish with **more face-up castle cards** than cards claimed by the tide.",
    "## Gather Sand",
    "- Draw between **1 and 7 cards** without changing their order.",
    "- Before playing your first card, you may **reverse the whole hand** once or reverse it back.",
    "## Improve Your Castle",
    "- Play the first card onto any **non-empty column**. If the castle is empty, start anywhere.",
    "- Each later card goes in the column immediately left or right of the previous play.",
    "- Once your second card establishes a direction, continue in that direction for the whole turn.",
    "- You may play through collapsed and empty columns, and may create a new column at either edge.",
    "## Standing and Collapsing",
    "- A column stays standing when its new card is **higher-ranked** than the face-up card beneath it or has the **same suit**.",
    "- Otherwise, every card in that column turns face down and the column collapses.",
    "- Playing a normal card to a collapsed or empty column makes it stand again.",
    "- A Joker copies the highest-ranked card in its column. A Joker played as the first face-up card immediately collapses.",
    "## High Tide",
    "- After emptying your hand, discard cards from the deck equal to **half the number of standing columns, rounded up**.",
    "- If the deck cannot pay the full tide, the remainder comes from face-up cards in the castle.",
    "- When the deck is empty, high tide ends the game. You win only if the castle has more face-up cards than the discard pile.",
  ],
};
