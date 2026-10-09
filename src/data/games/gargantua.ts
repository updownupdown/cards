import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const gargantua: GameDefinition = {
  path: "/gargantua",
  title: "Gargantua",
  aliases: ["Double Klondike", "Harp"],
  tags: [
    GameTag.KlondikeFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 25, difficulty: 50, luck: 40 },
  thumbnail: "Gargantua.webp",
  thumbnailCredit: {
    title: "Mountain Range",
    artistName: "James M. Hart",
    date: "1850–55",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/11007",
  },
  background: GAME_BACKGROUNDS.frozenMountain,
  animation: GameAnimations.Clouds,
  gameColorDark: "#24323a",
  gameColorPale: "#dce5df",
  gameColorAccent: "#e28d8d",
  cardBack: CardBackColors.Teal,
  quickStart: [
    "Build down in alternating colors.",
    "Move ordered runs together.",
    "Only a King fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Ace to King, by suit |",
    "| Build | Down, alternating colors |",
    "| Move | One card, or an ordered run |",
    "| Empty column | King only |",
    "| Stock | Draw 1 |",
    "| Redeals | 1 |",
    "| Cards | 104 (two decks) |",
    "## Variants",
    "- **Harp**: 3 redeals.",
  ],
};
