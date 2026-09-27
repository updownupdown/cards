import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const carpet: GameDefinition = {
  path: "/carpet",
  title: "Carpet",
  tags: [GameTag.FoundationBuilders, GameTag.StockAndWaste],
  rating: {
    complexity: 10,
    difficulty: 65,
    luck: 90,
  },
  thumbnail: "Carpet.webp",
  thumbnailCredit: {
    title: "Lotto Carpet",
    artistName: "Unknown Turkish weaver",
    date: "17th century",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/447571",
  },
  background: GAME_BACKGROUNDS.castleIndoors,
  animation: GameAnimations.Dust,
  gameColorDark: "#2b1a14",
  gameColorPale: "#f6dcc0",
  cardBack: CardBackColors.Terracotta,
  cardDescription:
    "Lift a twenty-card carpet onto the foundations as the stock patches every gap.",
  quickStart: [
    "Build foundations up by suit from the Aces.",
    "Tap a carpet or waste card to send it up.",
    "Gaps in the carpet refill from the waste, then the stock.",
  ],
  howToPlay: [
    "## Objective",
    "Move all 52 cards onto the four foundations, built up by suit from Ace to King.",

    "## Rules",
    "- Any carpet card, and the top waste card, can be played to a foundation.",
    "- A gap in the carpet is automatically filled with the top **waste** card, or from the **stock** if the waste is empty.",
    "- Tap the **stock** to turn one card onto the waste.",
    "- **There is no redeal**.",
  ],
};
