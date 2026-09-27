import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";
import { GameAnimations } from "@/animations";

export const seahavenTowers: GameDefinition = {
  path: "/seahaven-towers",
  title: "Seahaven Towers",
  aliases: ["Sea Towers"],
  tags: [GameTag.FreeCellFamily, GameTag.SequenceBuilding],
  rating: { complexity: 35, difficulty: 50, luck: 25 },
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
  cardBack: CardBackColors.Teal,
  cardDescription:
    "Ten open columns and four compact towers reward careful same-suit planning.",
  quickStart: [
    "Build foundations up by suit from Ace to King.",
    "Build tableau down in the same suit.",
    "Use four cells; only Kings may fill empty columns.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to four foundations, building up by suit from Ace to King.",

    "## Rules",
    "- Ten columns begin with five face-up cards each.",
    "- Two of the four free cells begin occupied; each cell holds one card.",
    "- Build tableau down in the same suit.",
    "- You can move one card at a time. You may move groups of cards together, but only if you have enough free cells and empty columns to have been able to make the equivalent move one card at a time.",
    "- Only a King or King-led run may fill an empty column.",
  ],
};
