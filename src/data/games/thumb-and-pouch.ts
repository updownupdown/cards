import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const thumbAndPouch: GameDefinition = {
  path: "/thumb-and-pouch",
  title: "Thumb and Pouch",
  tags: [
    GameTag.KlondikeFamily,
    GameTag.TableauBuilding,
    GameTag.StockAndWaste,
  ],
  rating: { complexity: 25, difficulty: 35, luck: 45 },
  background: GAME_BACKGROUNDS.cozyCabin,
  animation: GameAnimations.Dust,
  gameColorDark: "#3b3028",
  gameColorPale: "#ead9b8",
  gameColorAccent: "#e99a7c",
  cardBack: CardBackColors.Terracotta,
  thumbnail: "ThumbAndPouch.webp",
  thumbnailCredit: {
    title: "Mail Pouch",
    artistName: "Stella Mosher",
    date: "c. 1942",
    sourceName: "Artvee",
    sourceLink: "https://artvee.com/dl/mail-pouch/",
  },
  quickStart: [
    "Build down on any suit but the card's own.",
    "Move ordered runs together.",
    "Any card fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, any other suit |",
    "| Move | One card, or an ordered run |",
    "| Empty column | Any card or run |",
    "| Stock | Draw 1 |",
    "| Redeals | None |",
    "| Cards | 52 |",
  ],
};
