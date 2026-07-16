import { GameDefinition, GameTag } from "../games-data";

export const area52: GameDefinition = {
  path: "/area-52",
  title: "Area 52",
  thumbnail: "Area52.jpg",
  cardBack: "Area52.png",
  background: "concrete.jpg",
  cardColorBg: "#2a2836",
  cardColorText: "#b5faff",
  cardDescription:
    "Fight off waves of alien invaders before running out of defenders.",
  stats: {
    complexity: 40,
    difficulty: 70,
    luck: 30,
  },
  tags: [
    GameTag.IsaludoCollection,
    GameTag.ModernMechanics,
    GameTag.EasyToLearn,
  ],
  byLine: "Game design by Wil Su",
  briefRules: [
    "Survive both waves of alien invaders before running out of defenders to win.",
    "Single attacks must be of greater value and opposite color to the attacker.",
    "Dual attacks must add up to exactly the attacker's value. During wave 2, defenders matching the attacker's color are lost.",
    "Use sacrifices as a last resort.",
  ],
  about: [
    "Strategically command your defenders to fight off two waves of invading aliens.",
    "This game is adapted from Wil Su's Isaludo collection.",
  ],
  howToPlay: [
    "To win, you must survive both waves of alien invaders before running out of defenders.",
    "Each wave is made up of a series of attacks. Choose one or two defenders to tackle the lead attacker.",
    "Single attacks can be done with a defender of greater value and opposite color to the attacker. After a single attack, the defender is lost, and is replaced with the attacker.",
    "Dual attacks can be done with two cards whose total value equals the attacker's value. No attackers are lost during dual attacks, except during the second wave, where defenders matching the attacker's color are lost.",
    "Sacrifices can be used to move the lead attacker to the back of the attacker deck; the sacrified defender is lost.",
  ],
  tip: {
    select: {
      text: "Choose 1-2 defenders: higher opposite color, or sum target.",
    },
    act: {
      text: "Attack to fight, or sacrifice a defender to send attacker back.",
    },
  },
};
