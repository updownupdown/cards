import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const optritaLines: GameDefinition = {
  path: "/optrita-lines",
  title: "Optrita: Lines",
  tags: [GameTag.ModernMechanics, GameTag.SpatialControl],
  rating: {
    complexity: 40,
    difficulty: 50,
    luck: 30,
  },
  thumbnail: "OptritaLines.jpg",
  cardBack: "OptritaLines.jpg",
  background: GAME_BACKGROUNDS.club,
  animation: GameAnimations.Firefly,
  gameColorDark: "#1b2233",
  gameColorPale: "#ffffe2",
  cardDescription:
    "A one-player trick-taking duel against a grid that fights only by hiding its cards.",
  quickStart: [
    "Pick a trump suit before the round starts.",
    "Pick a card and a line: the first matching suit wins based on rank, otherwise the trump suit wins.",
    "Win 21 tricks before the grid does.",
  ],
  howToPlay: [
    "## Objective",
    "Win **21 tricks** before the grid does.",

    "## Turn Order",
    "- Choose a trump suit from your hand.",
    "- Select a hand card.",
    "- Select a row or column and direction, using the arrows. You cannot challenge lines that have gaps in them.",

    "## Tricks",
    "Cards are flipped face up, one at a time from the selected direction, until one matches the selected card suit.",
    "If your card is higher than the grid's, you win the trick; otherwise, the grid does.",
    "- **Higher rank wins**; Aces are high.",
    "- **No matching suit?** The line's **lowest trump** card beats you.",
    "- **No matching suit and no trump?** You win the trick. Select a card to remove from the line.",

    "## Hard Mode",
    "Change the difficulty from the settings to lower the grid's target, giving it a higher chance to win.",
  ],
  about: [
    "Optrita: Lines is a solitaire trick-taker: you attack lines of a face-down grid, revealing one card at a time.",
    "More information helps, but every reveal also closes off lines you can no longer challenge.",
  ],
  credits: {
    creators: [GameCreators.StephenTudor],
    creationDate: "2023",
  },
};
