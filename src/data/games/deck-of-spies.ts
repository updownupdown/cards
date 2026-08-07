import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameDefinition, GameTag } from "../games-data";

export const deckOfSpies: GameDefinition = {
  path: "/deck-of-spies",
  title: "Deck of Spies",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 55,
    difficulty: 65,
    luck: 45,
  },
  background: GAME_BACKGROUNDS.darkAlley,
  animation: GameAnimations.Dust,
  thumbnail: "DeckOfSpies.jpg",
  cardBack: "DeckOfSpies.jpg",
  gameColorDark: "#182326",
  gameColorPale: "#dce8df",
  cardDescription:
    "Counter, recruit, and retire cards to capture a majority of the Key Spies.",
  quickStart: [
    "Select cards totaling the visible spy's value, then Counter or Recruit. Afterward, optionally Retire a matching set before refilling to five cards.",
  ],
  howToPlay: [
    "## Objective",
    "Finish with **more than half** of all Key Spies — the Jacks, Queens, and Kings — in your hand, Draw Deck, and Draw Discard.",
    "## Setup",
    "The Spy Deck is built in tiers: **5–7** on top, then **8–10**, then **J–K**. Your Draw Deck begins with the Aces through 4s, and you draw five cards.",
    "## Counter",
    "Discard a minimal combination totaling at least the visible spy's value. You may overpay only when removing any one selected card would leave the total below the target. The spy goes face down to the Spy Discard.",
    "## Recruit",
    "Discard cards totaling at least the spy's value, all matching its suit. A matching-suit **Ace** is a Double Agent that converts every other played card to its suit for the turn. The recruited spy and played cards enter your Draw Discard.",
    "## Retire",
    "After Countering or Recruiting, you may permanently remove **2–4 cards of one rank** from your hand to the Removed Deck.",
    "## Assassinate",
    "Instead of matching the spy, move an **Ace** from your hand, Draw Deck, or Draw Discard to the Removed Deck. Discard the target spy and your remaining hand. If the Ace came from the Draw Deck, shuffle it. With no Ace remaining, you lose immediately.",
    "## End of turn",
    "Keep unplayed cards and refill to five. Whenever the Draw Deck empties, shuffle the Draw Discard to form a new face-down deck.",
    "## Winning",
    "After the final spy, count Jacks, Queens, and Kings across your personal deck. You win when that count exceeds the Key Spies in the Spy Discard.",
  ],
  about: [
    "Deck of Spies is a compact deck-building game of calculated overpayment, suit planning, and carefully timed Double Agents.",
  ],
  credits: {
    creators: [GameCreators.JamesNewman],
    creationDate: "2021",
  },
};
