import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const laBelleLucie: GameDefinition = {
  path: "/la-belle-lucie",
  title: "La Belle Lucie",
  aliases: ["Lovely Lucy", "The Fan", "Trefoil", "Shamrocks"],
  tags: [GameTag.CastlesAndFans, GameTag.SequenceBuilding],
  rating: { complexity: 25, difficulty: 75, luck: 45 },
  thumbnail: "LaBelleLucie.webp",
  thumbnailCredit: {
    title: "The Artist’s Niece, Marianne Lavergne, Known as ‘La Liseuse’",
    artistName: "Jean-Etienne Liotard",
    date: "1746",
    sourceName: "Rijksmuseum",
    sourceLink:
      "https://www.rijksmuseum.nl/en/collection/object/The-Artists-Niece-Marianne-Lavergne-Known-as-La-Liseuse--4f8b0612bb4049770fadcb8d29bac8f9",
  },
  background: GAME_BACKGROUNDS.sunsetOldCity,
  animation: GameAnimations.CherryBlossom,
  gameColorDark: "#28352d",
  gameColorPale: "#f5dce4",
  gameColorAccent: "#d897ae",
  cardBack: CardBackColors.Rose,
  quickStart: [
    "Build down by suit, one card at a time.",
    "Empty fans stay empty.",
    "Redeal the fans up to twice.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, same suit |",
    "| Move | One card at a time |",
    "| Empty fan | Stays empty |",
    "| Stock | None |",
    "| Redeals | 2 |",
    "| Cards | 52 |",
    "## Special rules",
    "- A redeal shuffles the cards left in the fans and deals them out in threes.",
    "## Variants",
    "- **Trefoil**: the Aces start on the foundations.",
    "- **Shamrocks**: build up or down regardless of suit, no fan may hold more than three cards, and there are no redeals.",
  ],
};
