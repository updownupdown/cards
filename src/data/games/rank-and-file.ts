import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const rankAndFile: GameDefinition = {
  path: "/rank-and-file",
  title: "Rank and File",
  aliases: ["Dress Parade", "Number Ten"],
  tags: [
    GameTag.FortyThievesFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 30, difficulty: 55, luck: 40 },
  thumbnail: "RankAndFile.webp",
  thumbnailCredit: {
    title:
      "The Triumph of Julius Caesar: Soldiers Marching with Trophies of War",
    artistName: "Andrea Andreani",
    date: "1593–99",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://www.clevelandart.org/art/1930.583.4",
  },
  background: GAME_BACKGROUNDS.city,
  animation: GameAnimations.Clouds,
  gameColorDark: "#26343b",
  gameColorPale: "#dfe2d4",
  gameColorAccent: "#97d8b2",
  cardBack: CardBackColors.Forest,
  quickStart: [
    "Build down in alternating colors.",
    "Move ordered runs together.",
    "Any card or run fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (8) | Ace to King, by suit |",
    "| Build | Down, alternating colors |",
    "| Move | One card, or an ordered run |",
    "| Empty column | Any card or run |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
    "| Cards | 104 (two decks) |",
    "## Variants",
    "- **Number Ten**: two cards face down in each column instead of three.",
  ],
};
