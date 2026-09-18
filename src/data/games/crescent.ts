import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const crescent: GameDefinition = {
  path: "/crescent",
  title: "Crescent",
  aliases: ["La Demi-Lune"],
  tags: [GameTag.SequenceBuilding],
  rating: { complexity: 45, difficulty: 55, luck: 40 },
  thumbnail: "Crescent.webp",
  background: GAME_BACKGROUNDS.nightSky,
  animation: GameAnimations.Stars,
  gameColorDark: "#182334",
  gameColorMid: "#173b64",
  gameColorPale: "#e5dfca",
  cardDescription:
    "Turn sixteen moonlit piles toward foundations growing from both Aces and Kings.",
  quickStart: [
    "Build Ace foundations up and King foundations down by suit.",
    "Build tableau one rank up or down in suit, wrapping Ace and King.",
    "Move one exposed card; rotate each pile up to three times.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to eight foundations: four build up from Aces and four build down from Kings.",

    "## Rules",
    "- Only the exposed card of each of the sixteen piles is playable.",
    '- Build tableau one rank up or down in the same suit; Ace and King are adjacent and "wrap around".',
    "- Move one card at a time.",
    "- Empty tableau piles cannot be filled.",
    "- Non-base cards may transfer between foundations.",
    '- Three times per game, you can "restack" to move the bottom card of every pile to its top.',
  ],
};
