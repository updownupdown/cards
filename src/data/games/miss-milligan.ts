import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const missMilligan: GameDefinition = {
  path: "/miss-milligan",
  title: "Miss Milligan",
  aliases: ["Giant"],
  enabledOnLocalOnly: true,
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
  gameColorDark: "#3a2a33",
  gameColorPale: "#f6e6ee",
  cardBack: CardBackColors.Rose,
  quickStart: [
    "Build eight foundations up by suit, from A to K.",
    "Build columns down in alternating colors; move built runs.",
    "Tap the stock to deal one card onto every column.",
  ],
  howToPlay: [
    "## Objective",
    "Move both decks to the eight foundations, each built up by suit from Ace to King.",
    "## Rules",
    "- The game starts with one card in each of eight columns.",
    "- Build columns **down in alternating colors**. A correctly built run moves as a unit.",
    "- Only a **King** (or a run headed by a King) may fill an empty column.",
    "- Tap the **stock** to deal one card onto every column, empty or not.",
    "## Waiving",
    "- Once the stock is empty, you may set one card or run aside in the **pocket**.",
    "- The pocket holds one card or run at a time. Play it back to a column or foundation before using the pocket again.",
    "## Giant",
    "In the Giant variant, any card or run may fill an empty column, but there is no pocket.",
  ],
};
