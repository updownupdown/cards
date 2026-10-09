import { GameAnimations } from "@/animations";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameDefinition, GameTag } from "../games-data";

export const kingAlbert: GameDefinition = {
  path: "/king-albert",
  title: "King Albert",
  aliases: ["Raglan"],
  tags: [GameTag.KlondikeFamily, GameTag.TableauBuilding],
  rating: { complexity: 30, difficulty: 70, luck: 20 },
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
  gameColorAccent: "#e6c07c",
  cardBack: CardBackColors.Pine,
  quickStart: [
    "Build down in alternating colors.",
    "Move one card at a time.",
    "Reserve cards can be played, but never put back.",
  ],
  howToPlay: [
    "## Goal",
    "Move every card to the foundations.",
    "## Rules",
    "| Foundations (4) | Ace to King, by suit |",
    "| Build | Down, alternating colors |",
    "| Move | One card at a time |",
    "| Empty column | Any card |",
    "| Reserve (7) | Every card is playable; nothing goes back |",
    "| Stock | None |",
    "| Cards | 52 |",
    "## Variants",
    "- **Raglan**: the Aces start on the foundations, and the reserve holds six cards.",
  ],
};
