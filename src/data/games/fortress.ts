import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const fortress: GameDefinition = {
  path: "/fortress",
  title: "Fortress",
  tags: [GameTag.CastlesAndFans, GameTag.SequenceBuilding],
  rating: { complexity: 30, difficulty: 70, luck: 25 },
  thumbnail: "Fortress.webp",
  thumbnailCredit: {
    title: "Landscape with Rock and Fortress",
    artistName: "Micco Spadaro",
    date: "ca. 1645",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/8097",
  },
  gameColorDark: "#302a24",
  gameColorPale: "#ead9b8",
  cardBack: CardBackColors.Walnut,
  quickStart: [
    "Build foundations up by suit from Ace to King.",
    "Build lanes one rank up or down in the same suit.",
    "Move one card at a time; any card fills an empty lane.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards to four foundations, building up by suit from Ace to King.",
    "## Lanes",
    "- Only the exposed card of each lane is playable.",
    "- Build one rank up or down in the same suit.",
    "- Move one card at a time.",
    "- Any card may fill an empty lane.",
  ],
};
