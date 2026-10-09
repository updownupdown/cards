import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const seahavenTowers: GameDefinition = {
  path: "/seahaven-towers",
  title: "Seahaven Towers",
  aliases: ["Sea Towers"],
  tags: [GameTag.FreeCellFamily, GameTag.SequenceBuilding],
  rating: { complexity: 25, difficulty: 45, luck: 15 },
  thumbnail: "SeahavenTowers.webp",
  thumbnailCredit: {
    title: "Molo z widokiem na dwie latarnie",
    artistName: "Tadeusz Makowski",
    date: "1932",
    sourceName: "Artvee",
    sourceLink: "https://artvee.com/dl/molo-z-widokiem-na-dwie-latarnie/",
  },
  background: GAME_BACKGROUNDS.shipwreck,
  animation: GameAnimations.Mist,
  // animation: GameAnimations.Clouds,
  gameColorDark: "#173946",
  gameColorPale: "#dceff0",
  gameColorAccent: "#e28da9",
  cardBack: CardBackColors.Teal,
  quickStart: [
    "Build down by suit.",
    "Each free cell holds one card.",
    "Only a King fills an empty column.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, same suit |",
    "| Move | One card, or a run if free spaces allow |",
    "| Empty column | King only |",
    "| Stock | None |",
    "| Cards | 52 |",
  ],
};
