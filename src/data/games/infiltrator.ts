import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const infiltrator: GameDefinition = {
  path: "/infiltrator",
  title: "Infiltrator",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 55,
    difficulty: 65,
    luck: 45,
  },
  background: GAME_BACKGROUNDS.darkAlley,
  animation: GameAnimations.Dust,
  thumbnail: "Infiltrator.webp",
  thumbnailCredit: {
    title: "Satan Starts from the Touch of Ithuriel's Spear",
    artistName: "Henry Fuseli",
    date: "1776",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://www.clevelandart.org/art/1954.365",
  },
  gameColorDark: "#182326",
  gameColorPale: "#dce8df",
  gameColorAccent: "#eab96d",
  cardBack: CardBackColors.Forest,
  quickStart: [
    "Win by recruiting more than half of the Key Spies (J, Q, K).",
    "Build your deck by recruiting spies of increasing value.",
    "Recruit by matching suit and rank (Aces are wild).",
    "Counter or assassinate when necessary.",
  ],
  howToPlay: [
    "## Objective",
    "**Win** by having recruited **more than half** of all Key Spies (Jacks, Queens, and Kings) by the time the Spy Deck is depleted.",

    "## Decks and Gameplay",
    "- The Spy Deck is built in tiers: **5-7** on top, then **8-10**, then **J-K**.",
    "- Your stock begins with the Aces through 4s.",
    "- Your discard pile is shuffled back into your stock frequently. Build your deck by recruiting high-value spies and retiring low-value pairs of spies.",
    "- The **Supporting Spies** only help towards acquiring Key Spies.",
    "- The **Key Spies** are the only cards that count toward your final score.",

    "## Actions",
    "- **Counter**:",
    "-- Discard any number of cards totaling the spy's value **or more**. You may overpay only when removing any one selected card would leave the total below the target.",

    "- **Recruit**:",
    "-- Discard cards totaling at least the spy's value, all matching its suit. A matching-suit **Ace** is a Double Agent that converts every other played card to its suit for the turn.",

    "- **Retire**:",
    "-- After Countering or Recruiting, you may permanently remove a set of matching-rank cards from your hand.",
    "-- You generally want to remove low-value cards as you progress through the game, to increase the average strength of your deck.",

    "- **Assassinate**:",
    "-- When stuck, you can sacrifice an **Ace** from your hand, stock, or discard pile to assassinate a spy. You lose if you have no Aces left.",
  ],
};
