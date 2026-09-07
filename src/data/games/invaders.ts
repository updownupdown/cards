import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
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
  thumbnail: "Invaders.jpg",
  background: GAME_BACKGROUNDS.nightSky,
  animation: GameAnimations.Stars,
  gameColorDark: "#2a2836",
  gameColorMid: "#29a4b4",
  gameColorPale: "#b5faff",
  cardDescription:
    "Fight off waves of alien invaders before running out of defenders.",
  quickStart: [
    "Beat back 2 waves of attackers using attacks and sacrifices.",
    "Single attacks: opposite color and larger value",
    "Double attacks: sum of defenders must be of equal value to attacker.",
  ],
  howToPlay: [
    "## Objective",
    "Win by surviving both waves of alien invaders before running out of defenders.",

    "## Waves",
    "Each wave is made up of a series of attacks. You must tackle the leading attacker for each attack.",
    "The second wave differs from the first in that, during dual attacks, defenders of the same color as the attacker are lost.",

    "## Actions",
    "- **Single attacks** can be done with a defender of greater value and opposite color to the attacker. After a single attack, the defender is lost, and is replaced with the attacker.",
    "- **Dual attacks** can be done with two cards whose total value equals the attacker's value. No attackers are lost during dual attacks, except during the second wave, where defenders matching the attacker's color are lost.",
    "- **Sacrifices** can be used to move the lead attacker to the back of the attacker deck; the sacrified defender is lost.",
  ],
};
