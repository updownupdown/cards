import { GameDefinition, GameTag } from "../games-data";
import { CardBackColors } from "../card-backs";

export const cabinSiege: GameDefinition = {
  path: "/cabin-siege",
  title: "Cabin Siege",
  tags: [GameTag.CardCombat, GameTag.SpatialControl],
  rating: {
    complexity: 55,
    difficulty: 60,
    luck: 50,
  },
  thumbnail: "CabinSiege.webp",
  thumbnailCredit: {
    title: "The Cabin",
    artistName: "Francis Scott King",
    date: "ca. 1880–1910",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/908836",
  },
  gameColorDark: "#201207",
  gameColorPale: "#e9f1d9",
  cardBack: CardBackColors.Slate,
  quickStart: [
    "Kill zombies by placing cards in adjacent, valid spots.",
    "The other two cards in that line must add to at least 10 and match suit (Ks) or color (Qs).",
    "As are worth 1; Jokers can be placed anywhere and are worth 0.",
  ],
  howToPlay: [
    "## Objective",
    "Kill all zombies before running out of cards.",

    "## Turn Order",
    "- **Reveal**: Reveal any zombies, if any remain.",
    "- **Play**: Place the top card from the deck on a valid cabin pile.",
    "- **Kill**: If possible, kill a zombie adjacent to the last played card.",

    "## Card Placement",
    "A drawn card can be placed on top of an existing pile if that card is either:",
    "- of equal value,",
    "- of the same color **and** greater value, or",
    "- of opposite color **and** lesser value.",

    "## Killing Zombies",
    "Whether you can kill a zombie depends on its rank, the played card, and **the two support cards that are in the same line as the zombie and the last played card**.",
    "A zombie can be killed if:",
    "- It is adjacent to the last played card",
    "- Both support cards add up to at least 10 (Aces are worth 1, Jokers 0)",
    "- For Kings, both support cards must match the King's suit",
    "- For Queens, both support cards must match the Queen's color",
    "- There are no restrictions to kill Jacks",
  ],
};
