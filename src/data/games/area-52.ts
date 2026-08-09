import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";
import { GameAnimations } from "@/animations";

export const area52: GameDefinition = {
  path: "/area-52",
  title: "Area 52",
  tags: [
    GameTag.IsaludoCollection,
    GameTag.ModernMechanics,
    GameTag.CardCombat,
  ],
  rating: {
    complexity: 40,
    difficulty: 70,
    luck: 30,
  },
  thumbnail: "Area52.jpg",
  background: GAME_BACKGROUNDS.nightSky,
  animation: GameAnimations.Stars,
  cardBack: "Area52.png",
  gameColorDark: "#2a2836",
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
  about: [
    "Strategically command your defenders to fight off two waves of invading aliens.",
    "This game is part of Wil Su's Isaludo collection.",
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
  },
};
