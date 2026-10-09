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
  gameColorAccent: "#dfb291",
  cardBack: CardBackColors.Copper,
  quickStart: [
    "Build down in alternating colors.",
    "Move any face-up card with every card on it, in order or not.",
    "Only a King fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, alternating colors |",
    "| Move | Any face-up card, with every card on it |",
    "| Empty column | King only |",
    "| Stock | None |",
    "| Cards | 52 |",
    "## Variants",
    "- **Russian Solitaire**: build down in the same suit.",
    "- **Alaska**: build up or down in the same suit.",
    "- **Moosehide**: build down on any suit but the card's own.",
  ],
};
