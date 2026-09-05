import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameAnimations } from "@/animations";

export const delta21: GameDefinition = {
  path: "/delta-21",
  title: "Delta 21",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 40,
    difficulty: 40,
    luck: 30,
  },
  thumbnail: "Delta21.jpg",
  background: GAME_BACKGROUNDS.river,
  animation: GameAnimations.Birds,
  gameColorDark: "#11343d",
  gameColorMid: "#5996af",
  gameColorPale: "#c3e9ff",
  cardDescription:
    "Balance four river fish populations to exactly 21 and publish your studies.",
  quickStart: [
    "Create columns of 21 and complete research goals along the way.",
    "Use face cards to lower totals. Avoid totals of 25 or more.",
  ],
  howToPlay: [
    "## Objective",
    "Complete river studies by creating fish population columns of **exactly 21 fish**.",
    "**Maximize your score** by completing as many studies as possible, and by earning research breakthroughs.",
    'The **game ends** when the "field station" (deck) is empty, or if any column reaches **25 or more**.',

    "## Card Types",
    "- **Schools of Fish:**",
    "-- Aces through 10, with Aces counting as 1.",
    '-- The card value represents the number of fish in that "school".',
    "- **Fishers:**",
    "-- Jacks, Queens, and Kings",
    "-- Can be added to a school of fish to reduce its population by **up to** 1 (Jack), 2 (Queen), or 3 (King). School population cannot go below 0.",

    "## Gameplay",
    "Each turn, empty your hand by performing one of the following actions:",
    "- **Release Fish:** add a school to the bottom of a column (select a hand card, then tap a column).",
    "- **Catch Fish:** place a fisher on a school with no fisher yet (select a hand card, then tap a school).",
    "- **Transfer Fish:** transfer fish from one column to another, at the cost of one card from your hand. With nothing selected, tap a column's bottom school to lift it, tap another column to aim, then tap a hand card to discard it and move the school. You can't move a column's only school, or a school under a fisher.",
    "\nOnce your hand is empty:",
    "- any column totalling **exactly 21** is set aside as a completed study",
    "- the gap left refills with a new school",
    "- your hand is replenished from the deck and a new turn starts. ",

    "## Research Breakthroughs",
    "- **Species Specialization:**",
    "-- a study using a single suit.",
    "- **Species Diversity:**",
    "-- a study using all four suits.",
    "- **Dense Shoals:**",
    "-- a study containing five or more schools.",
    "- **Population Clusters:**",
    "-- a study with two or more schools of the same rank.",
    "- **Selective Harvesting:**",
    "-- a fisher catching fish of its own suit.",
    "- **Fishing Pressure:**",
    "-- a study containing two or more fisher.",

    "## Scoring",
    "- Score **1 point** per study plus **2 points** per research breakthrough.",
    "- Scientific contribution:",
    "-- **0-8:** little added",
    "-- **9-13:** aids local study",
    "-- **14-17:** advances knowledge",
    "-- **18+:** reshapes the science",
  ],
};
