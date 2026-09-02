import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameDefinition, GameTag } from "../games-data";

export const kongTower: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/kong-tower",
  title: "Kong Tower",
  tags: [GameTag.ModernMechanics, GameTag.SpatialControl],
  rating: { complexity: 65, difficulty: 65, luck: 45 },
  background: GAME_BACKGROUNDS.city,
  animation: GameAnimations.Clouds,
  gameColorDark: "#20262b",
  gameColorPale: "#f3dca7",
  cardDescription:
    "Guide Kong up a hidden tower while rearranging its floors and surviving plane attacks.",
  quickStart: [
    "Use up to three actions to move Kong, peek, swap cards, or lock a row.",
    "Build one strictly ascending adjacent path through all ten tower cards.",
    "Reach the top before three plane attacks hit Kong.",
  ],
  howToPlay: [
    "## Objective",
    "Guide Kong to the top level with all ten tower cards forming a strictly ascending adjacent path. Three plane hits lose the game.",
    "## Turn Order",
    "- Use up to three actions, repeating actions if desired.",
    "- End the turn to draw plane cards equal to Kong's current level.",
    "- New available tower cards are dealt after each attack.",
    "## Actions",
    "- **Move**: Move Kong to any orthogonally or diagonally adjacent card.",
    "- **Swap**: Exchange Kong's card with an adjacent unlocked tower card without moving Kong.",
    "- **Available card**: Tap either face-up available card to exchange it with Kong's card.",
    "- **Peek**: Reveal both cards in the row below Kong until the next action.",
    "- **Lock**: Permanently reveal the next row, locking rows from bottom to top.",
    "## Tower",
    "Ranks must increase without repeats along the adjacent path. They need not be consecutive, and the black Joker is wild.",
    "## Plane Attacks",
    "A plane card matching Kong's rank scores a hit; the red Joker always hits. The attack stops after the first hit.",
    "You may swat a hit by permanently removing two cards from the tower draw deck. Otherwise, take the hit. Three hits lose.",
    "## Winning",
    "On the top level, you may continue using your actions. Choose **Finish Climb** when the tower is ready; an invalid path loses the game.",
  ],
};
