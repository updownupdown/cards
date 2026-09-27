import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const kingAlbert: GameDefinition = {
  path: "/king-albert",
  title: "King Albert",
  aliases: ["Raglan"],
  tags: [GameTag.KlondikeFamily, GameTag.TableauBuilding],
  rating: { complexity: 35, difficulty: 70, luck: 20 },
  thumbnail: "KingAlbert.webp",
  thumbnailCredit: {
    title: "Albert, King of the Belgians, in Military Uniform",
    artistName: "Speaight Ltd.",
    date: "1914 - 1918",
    sourceName: "Rijksmuseum",
    sourceLink:
      "https://www.rijksmuseum.nl/en/collection/object/Portret-van-Albert-koning-van-Belgie-in-militaire-kleding-tijdens-de-Eerste-Wereldoorlog--7eae4c93311a2a9e06436b5e79fc685d",
  },
  background: GAME_BACKGROUNDS.aridHill,
  animation: GameAnimations.Leaves,
  gameColorDark: "#2f3d35",
  gameColorPale: "#e9e7d3",
  cardBack: CardBackColors.Pine,
  cardDescription:
    "Every card is dealt face up: nine columns, a small reserve, and one card moved at a time.",
  quickStart: [
    "Move every card to the four foundations by suit, from A to K.",
    "Build down in alternating colors, one card at a time.",
    "Reserve cards can be played, but nothing goes back to the reserve.",
  ],
  howToPlay: [
    "## Objective",
    "Move every card to the four foundations by suit, from Ace to King.",
    "## Deal",
    "- Nine columns are dealt face up, from one card to nine.",
    "- The seven cards left over form the **reserve**. Each is available to play.",
    "## Rules",
    "- Build tableau columns **down in alternating colors**.",
    "- Move **one card at a time**; runs never move together.",
    "- Reserve cards may go to a foundation or a column, but no card may be put back into the reserve.",
    "- Any card may fill an empty column.",
    "## Raglan",
    "In the Raglan variant, the Aces start on the foundations, the longest columns hold seven cards, and the reserve holds six.",
  ],
};
