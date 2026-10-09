import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const missMilligan: GameDefinition = {
  path: "/miss-milligan",
  title: "Miss Milligan",
  aliases: ["Giant"],
  tags: [
    GameTag.DoubleDeckers,
    GameTag.TableauBuilding,
    GameTag.SequenceBuilding,
  ],
  rating: { complexity: 40, difficulty: 70, luck: 45 },
  thumbnail: "MissMilligan.webp",
  thumbnailCredit: {
    title: "Portrait of Dora Wheeler",
    artistName: "William Merritt Chase",
    date: "1882–83",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://www.clevelandart.org/art/1921.1239",
  },
  background: GAME_BACKGROUNDS.oldRoom,
  animation: GameAnimations.Dust,
  gameColorDark: "#3a2a33",
  gameColorPale: "#f6e6ee",
  gameColorAccent: "#d897ae",
  cardBack: CardBackColors.Rose,
  quickStart: [
    "Build down in alternating colors.",
    "Move ordered runs together.",
    "The stock deals one card onto every column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Ace to King, by suit |",
    "| Build | Down, alternating colors |",
    "| Move | One card, or an ordered run |",
    "| Empty column | King, or a run headed by one |",
    "| Pocket | One card or run at a time, once the stock is empty |",
    "| Stock | Deals one card to every column |",
    "| Cards | 104 (two decks) |",
    "## Variants",
    "- **Giant**: any card or run fills an empty column, and there is no pocket.",
  ],
};
