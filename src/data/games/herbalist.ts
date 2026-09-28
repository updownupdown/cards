import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const herbalist: GameDefinition = {
  path: "/herbalist",
  title: "Herbalist",
  tags: [GameTag.Puzzles, GameTag.SpatialControl],
  rating: {
    complexity: 65,
    difficulty: 75,
    luck: 25,
  },
  thumbnail: "Herbalist.webp",
  thumbnailCredit: {
    title:
      "Folio from an Arabic translation of the Materia Medica of Dioscorides",
    artistName: "Abdallah ibn al-Fadl",
    date: "1224",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://www.clevelandart.org/art/1977.91",
  },
  background: GAME_BACKGROUNDS.forest,
  animation: GameAnimations.Firefly,
  gameColorDark: "#1b3a1f",
  gameColorPale: "#edffba",
  cardBack: CardBackColors.Olive,
  cardDescription:
    "Distribute herbs across your stables to heal all the resident creatures.",
  quickStart: [
    "Select a stack of herbs, and distribute them to the adjacent locations, one at a time.",
    "Heal Js, Qs, and Ks in order, using herb stacks of the same value (11, 12, and 13).",
  ],
  howToPlay: [
    "## Objective",
    "**Win** by healing all eight sick creatures before running out of cards. Your score is the number of herbs left on the board.",

    "## Distribute Herbs",
    "- Select a herb stack to pick up all its cards.",
    "- Choose the order in which to drop the carried herbs.",
    "- Assign them one at a time, starting with the location next to the one you picked the herbs from, eventually looping back to the top.",

    "## Heal Order",
    "- All Jacks must heal before Queens, and all Queens before Kings.",
    "- A creature heals when the herbs at its location total exactly its rank value, **and** include at least one herb of its suit.",

    "## Eating",
    "- A healthy creature immediately eats every herb of its suit from its own stack.",
    "- Eaten herbs cannot be redistributed.",

    "## Open Stables",
    'The optional expansion (enabled from the settings) adds a healthy creature, the "Noble", and a Jester:',
    "- The Noble is located in the Stables, the middle location. The Noble eats herbs dropped in its location if they match its own suit.",
    "- The Jester eats the herb dropped into the stables if it is the last dropped herb, regardless of suit.",
  ],
};
