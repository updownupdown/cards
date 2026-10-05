import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const missMilligan: GameDefinition = {
  path: "/miss-milligan",
  title: "Miss Milligan",
  aliases: ["Giant"],
  tags: [
    GameTag.DoubleDeckers,
    GameTag.TableauBuilding,
    GameTag.SequenceBuilding,
  ],
  rating: { complexity: 40, difficulty: 70, luck: 45 },
  thumbnail: "MissMilligan.webp",
  thumbnailCredit: {
    title: "Portrait of Dora Wheeler",
    artistName: "William Merritt Chase",
    date: "1882–83",
    sourceName: "Cleveland Museum of Art",
    sourceLink: "https://www.clevelandart.org/art/1921.1239",
  },
  background: GAME_BACKGROUNDS.oldRoom,
  animation: GameAnimations.Dust,
  gameColorDark: "#3a2a33",
  gameColorPale: "#f6e6ee",
  gameColorAccent: "#d897ae",
  cardBack: CardBackColors.Rose,
  quickStart: [
    "Build eight foundations up by suit, from A to K.",
    "Build columns down in alternating colors; you can move runs.",
    "Tap the stock to deal one card onto every column.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to the eight foundations, each built up by suit from Ace to King.",
    "## Rules",
    "- Build columns **down in alternating colors**. A correctly built run can be moved as a unit.",
    "- Only a **King** (or a run headed by a King) may fill an empty column.",
    "- Tap the **stock** to deal one card onto every column, empty or not.",
    "## Variants",
    "- **Miss Milligan**: Once the stock is empty, you may set one card or run aside in the **pocket**.",
    "- **Giant**: Any card or run may fill an empty column, but there is no pocket.",
  ],
};
