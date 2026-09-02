import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const castleSiege: GameDefinition = {
  path: "/castle-siege",
  title: "Castle Siege",
  aliases: ["Base of Spades"],
  tags: [GameTag.ModernMechanics, GameTag.ScoringPuzzles],
  rating: {
    complexity: 45,
    difficulty: 65,
    luck: 35,
  },
  background: GAME_BACKGROUNDS.castle,
  gameColorDark: "#24231f",
  gameColorPale: "#e7d9a8",
  cardDescription:
    "Rally nine kingdoms, maneuver their champions, and break three castle defenses.",
  quickStart: [
    "Move one champion using the active command's distance for that suit.",
    "Rally every kingdom by matching the champion beneath it to its suit.",
    "Each rally launches an assault. Destroy three defenses before the command deck runs out.",
  ],
  howToPlay: [
    "## Objective",
    "Destroy any three defenses for a **basic victory**. Their ranks must total at least 12 for an **advanced victory**.",
    "You lose if no command remains before three defenses are destroyed.",

    "## Commands",
    "- Select a champion, then move it exactly the active command's distance to the left or right. Jumped champions shift in the opposite direction and keep their order.",
    "- The six commands assign distances 1, 2, and 3 to Hearts, Clubs, and Diamonds in every possible arrangement.",
    "- When the draw pile empties, shuffle the discards, remove one command unseen, and draw the next command.",

    "## Morale Boosts",
    "- Each destroyed defense unlocks the optional boost shown for its rank: defenses 2/3 modify Aces by -1/+1, 4/5 modify Threes by -1/+1, and 6/7 modify Fives by -1/+1.",
    "- Choose at most one unlocked boost for a move. A modified move of 0 spaces is legal.",

    "## Assaults",
    "- A kingdom is rallied when its suit matches the champion below it. Rallying all nine kingdoms immediately launches an assault.",
    "- A champion is battle-ready when its value plus its kingdom's value equals 7.",
    "- Count battle-ready champions and destroy the defense with that rank. The attack fails if that defense is already destroyed or the count is outside 2-7.",
    "- After every assault, shuffle and redeal all champions.",
  ],
};