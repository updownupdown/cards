import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const somnus: GameDefinition = {
  path: "/somnus",
  title: "Somnus",
  aliases: ["Alice's Nightmares"],
  tags: [GameTag.CardCombat],
  rating: {
    complexity: 75,
    difficulty: 70,
    luck: 45,
  },
  thumbnail: "Somnus.webp",
  thumbnailCredit: {
    title: "The Nightmare",
    artistName: "Henry Fuseli",
    date: "1781",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:John_Henry_Fuseli_-_The_NightmareFXD.jpg",
  },
  background: GAME_BACKGROUNDS.painting,
  animation: GameAnimations.Dust,
  gameColorDark: "#1b1f25",
  gameColorPale: "#efd8f0",
  gameColorAccent: "#d897d4",
  cardBack: CardBackColors.Plum,
  quickStart: [
    "Select Guardians from your hand, select a Dream card, then assign them.",
    "Meet a Guardian's value to recruit it; exceed a Nightmare's value to eliminate it.",
    "Resolve the board before ending each turn. Keep Alice's life above 0.",
  ],
  howToPlay: [
    "## Objective",
    "Eliminate every Nightmare before Alice's life falls from **40** to 0.",
    "Build your personal deck by molding stronger red-suit Guardians from the board.",

    "## Your Turn",
    "1. Draw to four cards, or draw three if your hand is empty.",
    "2. Assign any number of hand cards to Dream cards, then resolve from right to left.",
    "3. Surviving Dream cards move one slot right. The rightmost card leaves play and new cards enter from the left.",

    "## Guardians and Nightmares",
    "- **Mold a Guardian:** assigned value must meet or exceed the red card's value. The molded card enters your discard pile.",
    "- **Fight a Nightmare:** assigned value must exceed the black card's value to eliminate it. Otherwise, Alice loses the difference in life.",
    "- At most two non-Ace Guardians may be assigned to a Nightmare. An Ace may be added as a third card.",
    "- Unopposed Nightmares deal their full value as damage.",

    "## Special Cards",
    "- A Guardian Ace contributes 0 and doubles its associated cards. While a Nightmare Ace is present, that doubling instead cancels the Nightmare's halving effect.",
    "- Guardian Aces can only be molded with a special Guardian. Nightmare Aces can only be eliminated with a special Guardian.",
    "- Eliminating a Jack, Queen, or King Nightmare restores 3 life, up to 40.",
    "- Red and black Jokers copy the value of the top card in their matching removed pile.",

    "## Special Actions",
    "- **Deep Breath:** if you assigned no cards this turn, discard one hand card before resolving.",
    "- **Exile:** once per turn, discard one hand card and lose 5 life to send a selected Nightmare to the Dream discard.",
    "- **REM Sleep:** once per game at 10 life or less, reshuffle both active decks and redeal the board and hand.",

    "## Endgame",
    "When the Dream deck empties, you win if no non-Ace Nightmares remain. You lose if every non-Ace special Guardian has been removed.",
  ],
};
