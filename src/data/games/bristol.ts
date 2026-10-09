import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const bristol: GameDefinition = {
  path: "/bristol",
  title: "Bristol",
  tags: [GameTag.CastlesAndFans, GameTag.TableauBuilding],
  rating: { complexity: 25, difficulty: 60, luck: 40 },
  thumbnail: "Bristol.webp",
  thumbnailCredit: {
    title: "S.E. Vincent’s Rock near Bristol",
    artistName: "Charles Joseph Hullmandel",
    date: "1821",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/13777",
  },
  background: GAME_BACKGROUNDS.shipwreck,
  animation: GameAnimations.Mist,
  gameColorDark: "#2a3638",
  gameColorPale: "#e2f1f2",
  gameColorAccent: "#efae84",
  cardBack: CardBackColors.Teal,
  quickStart: [
    "Foundations ignore suit.",
    "Build down on any suit, one card at a time.",
    "The stock deals onto the three reserve piles.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, regardless of suit |",
    "| Build | Down, regardless of suit |",
    "| Move | One card at a time |",
    "| Empty fan | Stays empty |",
    "| Reserve (3) | Top cards are playable; nothing is played onto them |",
    "| Stock | Deals one card onto each reserve pile |",
    "| Redeals | None |",
    "| Cards | 52 |",
    "## Special rules",
    "- Kings go to the bottom of their fan in the deal.",
    "- The three reserve piles start with one card each.",
  ],
};
