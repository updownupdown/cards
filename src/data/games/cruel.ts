import { GameDefinition, GameTag } from "../games-data";
import { CardBackColors } from "../card-backs";

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
  gameColorDark: "#2c1919",
  gameColorPale: "#f7e0da",
  cardBack: CardBackColors.Burgundy,
  quickStart: [
    "Build foundations up by suit from the Aces.",
    "Move top cards down by suit; spaces stay empty.",
    "After any move, tap the redeal pile to re-form the piles in fours.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards onto the four foundations, built up by suit from Ace to King.",

    "## Rules",
    "- Only the top card of a pile can move, onto a foundation or onto a pile **one rank higher in the same suit**.",
    "- Empty piles are **never** refilled.",
    "- Tap the **redeal** pile to gather the piles in order, without shuffling, and deal them out again in fours.",
    "- You may redeal as often as you like, but only after making a move since the last redeal.",
  ],
};
