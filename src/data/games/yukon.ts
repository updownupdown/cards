import { GameAnimations } from "@/animations/types";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const yukon: GameDefinition = {
  path: "/yukon",
  title: "Yukon",
  aliases: ["Russian Solitaire", "Alaska", "Moosehide"],
  tags: [
    GameTag.YukonFamily,
    GameTag.TableauBuilding,
    GameTag.SequenceBuilding,
  ],
  rating: { complexity: 30, difficulty: 60, luck: 35 },
  thumbnail: "Yukon.webp",
  thumbnailCredit: {
    title: "Mountains near Resurrection Bay, Alaska",
    artistName: "Prescott Jones",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Mountains_near_Resurrection_Bay,_Alaska_SAAM-1972.29_1.jpg",
  },
  background: GAME_BACKGROUNDS.yukon,
  animation: GameAnimations.Clouds,
  gameColorDark: "#20303a",
  gameColorPale: "#e6f1f7",
  cardBack: CardBackColors.Copper,
  quickStart: [
    "Build foundations up by suit, A to K.",
    "Build columns down by alternating colors.",
    "Move any face-up stack.",
    "Only Kings can fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Build the four foundations up by suit, from Ace to King.",

    "## Rules",
    "- Move any face-up card or **stack** of cards, **building down by rank, in alternating colors**.",
    "- The carried cards do **not** need to be in sequence.",
    "- Empty columns can only be filled with Kings.",
    "- Double-tap or drag single cards to the foundations.",

    "## Variants",
    "Choose how columns build in the game settings:",
    "- **Yukon**: down in alternating colors.",
    "- **Russian Solitaire**: down in the same suit.",
    "- **Alaska**: up or down in the same suit.",
    "- **Moosehide**: down on any suit but its own.",
  ],
};
