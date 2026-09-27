import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { CardBackColors } from "../card-backs";
import { GameAnimations } from "@/animations";

export const invaders: GameDefinition = {
  path: "/invaders",
  title: "Invaders",
  tags: [GameTag.CardCombat],
  rating: {
    complexity: 40,
    difficulty: 70,
    luck: 30,
  },
  thumbnail: "Invaders.webp",
  thumbnailCredit: {
    title: "Landscape with Stars",
    artistName: "Henri-Edmond Cross",
    date: "ca. 1905–1908",
    sourceName: "The Metropolitan Museum of Art",
    sourceLink: "https://www.metmuseum.org/art/collection/search/459189",
  },
  background: GAME_BACKGROUNDS.nightSky,
  animation: GameAnimations.Stars,
  gameColorDark: "#2a2836",
  gameColorPale: "#b5faff",
  cardBack: CardBackColors.Teal,
  cardDescription:
    "Fight off waves of alien invaders before running out of defenders.",
  quickStart: [
    "Beat back 2 waves of attackers using attacks and sacrifices.",
    "Single attacks: opposite color and larger value.",
    "Dual attacks: the two defenders must add up to the attacker's value.",
  ],
  howToPlay: [
    "## Objective",
    "Win by surviving both waves of alien invaders before running out of defenders.",

    "## Waves",
    "Each wave is made up of a series of attacks. You must tackle the leading attacker for each attack.",
    "The second wave differs from the first in that, during dual attacks, defenders of the same color as the attacker are lost.",

    "## Actions",
    "- **Single attacks** can be done with a defender of greater value and opposite color to the attacker. After a single attack, the defender is lost, and is replaced with the attacker.",
    "- **Dual attacks** can be done with two cards whose total value equals the attacker's value. No defenders are lost during dual attacks, except during the second wave, where defenders matching the attacker's color are lost.",
    "- **Sacrifices** can be used to move the lead attacker to the back of the attacker deck; the sacrificed defender is lost.",
  ],
};
