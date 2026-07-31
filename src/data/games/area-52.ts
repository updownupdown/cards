import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const area52: GameDefinition = {
  path: "/area-52",
  title: "Area 52",
  tags: [
    GameTag.IsaludoCollection,
    GameTag.ModernMechanics,
    GameTag.EasyToLearn,
  ],
  rating: {
    complexity: 40,
    difficulty: 70,
    luck: 30,
  },
  thumbnail: "Area52.jpg",
  background: GAME_BACKGROUNDS.nightSky,
  cardBack: "Area52.png",
  cardColorBg: "#2a2836",
  cardColorText: "#b5faff",
  cardDescription:
    "Fight off waves of alien invaders before running out of defenders.",
  quickStart: [
    "Beat back 2 waves of attackers via attacks or sacrifices.",
    "Single attacks: opposite color, and of larger or equal value",
    "Double attacks: sum must be of equal value.",
  ],
  howToPlay: [
    "## Objective",
    "To win, you must survive both waves of alien invaders before running out of defenders.",

    "## Gameplay",
    "Each wave is made up of a series of attacks. Choose one or two defenders to tackle the lead attacker.",

    "## Actions",
    "- **Single attacks** can be done with a defender of greater value and opposite color to the attacker. After a single attack, the defender is lost, and is replaced with the attacker.",
    "- **Dual attacks** can be done with two cards whose total value equals the attacker's value. No attackers are lost during dual attacks, except during the second wave, where defenders matching the attacker's color are lost.",
    "- **Sacrifices** can be used to move the lead attacker to the back of the attacker deck; the sacrified defender is lost.",
  ],
  about: [
    "Strategically command your defenders to fight off two waves of invading aliens.",
    "This game is adapted from Wil Su's Isaludo collection.",
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
    creatorLink:
      "https://boardgamegeek.com/boardgamedesigner/121533/wilhelm-su",
  },
};
