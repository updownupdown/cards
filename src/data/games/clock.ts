import { GameAnimations } from "@/animations";
import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";

export const clock: GameDefinition = {
  path: "/clock",
  title: "Clock Solitaire",
  tags: [GameTag.FoundationBuilders, GameTag.TableauBuilding],
  rating: {
    complexity: 5,
    difficulty: 90,
    luck: 100,
  },
  thumbnail: "Clock.webp",
  thumbnailCredit: {
    title: "Boy Holding Hourglass and Chinese Fan",
    artistName: "Unknown artist",
    date: "1780s",
    sourceName: "Art Institute of Chicago",
    sourceLink: "https://www.artic.edu/artworks/47757",
  },
  background: GAME_BACKGROUNDS.oldRoom,
  animation: GameAnimations.CandleMotes,
  gameColorDark: "#1d1610",
  gameColorPale: "#eed9c2",
  cardBack: CardBackColors.Bronze,
  quickStart: [
    "Tap the center pile to start, then tap the hour pile that matches the last revealed card.",
  ],
  howToPlay: [
    "## Objective",
    "Turn every card face up, sorting all 52 into their clock positions, before all four Kings are revealed.",

    "## Playing",
    "- Turn up the top card of the center pile to begin.",
    "- Tap the corresponding hour pile: Aces at 1 o'clock, numbers at their hour, Jack at 11, Queen at 12, and Kings in the center.",

    "## Winning & Losing",
    "You win if every pile is turned face up. You lose the moment the **fourth King** is revealed.",
  ],
};
