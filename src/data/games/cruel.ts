import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const cruel: GameDefinition = {
  path: "/cruel",
  title: "Cruel",
  tags: [GameTag.CastlesAndFans, GameTag.TableauBuilding],
  rating: {
    complexity: 25,
    difficulty: 50,
    luck: 20,
  },
  thumbnail: "Cruel.webp",
  thumbnailCredit: {
    title: "Dulle Griet (Mad Meg)",
    artistName: "Pieter Brueghel the Elder",
    date: "circa 1562",
    sourceName: "Wikimedia Commons",
    sourceLink:
      "https://commons.wikimedia.org/wiki/File:Pieter_Bruegel_the_Elder_-_Dulle_Griet_(Mad_Meg)_-_WGA03400.jpg",
  },
  background: GAME_BACKGROUNDS.darkAlley,
  animation: GameAnimations.Embers,
  gameColorDark: "#2c1919",
  gameColorPale: "#f7e0da",
  gameColorAccent: "#f0a860",
  cardBack: CardBackColors.Burgundy,
  quickStart: [
    "Build down by suit.",
    "Move one card at a time.",
    "Redeal to gather the piles into fours again.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit; the Aces start there |",
    "| Build | Down, same suit |",
    "| Move | One card at a time |",
    "| Empty pile | Stays empty |",
    "| Stock | None |",
    "| Redeals | Unlimited, after a move |",
    "| Cards | 52 |",
    "## Special rules",
    "- A redeal gathers the piles in order, without shuffling, and deals them out again in fours.",
  ],
};
