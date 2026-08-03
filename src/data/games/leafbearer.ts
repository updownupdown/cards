import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";

export const leafbearer: GameDefinition = {
  enabledOnLocalOnly: true,
  path: "/leafbearer",
  title: "Leafbearer",
  tags: [GameTag.ModernMechanics, GameTag.SpatialControl],
  rating: {
    complexity: 75,
    difficulty: 75,
    luck: 25,
  },
  background: GAME_BACKGROUNDS.forest,
  gameColorDark: "#1c3327",
  gameColorPale: "#e5f0c7",
  cardDescription:
    "Sow herbs across the realm to heal creatures in order before the forest runs dry.",
  quickStart: [
    "Pick up one herb stack, then distribute its cards to the right in any order.",
  ],
  howToPlay: [
    "## Objective",
    "Heal all eight sick creatures. Your score is the number of herbs left on the board.",
    "## Sow Herbs",
    "Choose any herb stack. Drop its cards one at a time into the next locations, wrapping from the ninth location back to the first. You decide the order of cards in your hand.",
    "## Heal In Order",
    "Jacks must all heal before Queens, then Kings. A creature heals when its local herbs exactly match its rank value and include its suit.",
    "## Eating",
    "Healthy creatures immediately eat every herb of their suit from their own stack.",
    "## Open Stables",
    "The optional expansion reveals a healthy Noble in the Stables and adds a Jester. The Noble eats matching herbs; the Jester eats the final herb dropped into the Stables.",
  ],
};
