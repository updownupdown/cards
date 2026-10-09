import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const grandfathersClock: GameDefinition = {
  path: "/grandfathers-clock",
  title: "Grandfather's Clock",
  tags: [
    GameTag.FoundationBuilders,
    GameTag.SequenceBuilding,
    GameTag.TableauBuilding,
  ],
  rating: {
    complexity: 25,
    difficulty: 25,
    luck: 25,
  },
  thumbnail: "GrandfatherClock.webp",
  thumbnailCredit: {
    title: "Pendulum Clock Crowned with a Bust",
    artistName: "anonymous",
    date: "in or after 1706",
    sourceName: "Rijksmuseum",
    sourceLink:
      "https://www.rijksmuseum.nl/en/collection/object/Pendule-bekroond-met-buste--95917566038e68f1ebff75e459c0feff",
  },
  background: GAME_BACKGROUNDS.bookstore,
  animation: GameAnimations.Dust,
  gameColorDark: "#2a2118",
  gameColorPale: "#f3e2c2",
  gameColorAccent: "#e2bf78",
  cardBack: CardBackColors.Bronze,
  quickStart: [
    "Build each clock pile up by suit to its hour.",
    "Build down on any suit; a King goes on an Ace.",
    "Any card fills an empty pile.",
  ],
  howToPlay: [
    "## Goal",
    "Build every clock foundation until it shows its hour.",
    "## Rules",
    "| Foundations (12) | Up by suit, wrapping from King to Ace, each stopping at its hour |",
    "| Build | Down, regardless of suit; a King goes on an Ace |",
    "| Move | One card at a time |",
    "| Empty pile | Any card |",
    "| Stock | None |",
    "| Cards | 52 |",
    "## Special rules",
    "- The clock's foundations start from set cards, and each is done when its top card shows its hour: an Ace at 1 o'clock, a Jack at 11 and a Queen at 12.",
  ],
};
