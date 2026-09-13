import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";

export const chainOfCommand: GameDefinition = {
  path: "/chain-of-command",
  title: "Chain of Command",
  tags: [GameTag.ModernMechanics],
  rating: {
    complexity: 70,
    difficulty: 70,
    luck: 30,
  },
  thumbnail: "ChainOfCommand.webp",
  background: GAME_BACKGROUNDS.brickStreet,
  gameColorDark: "#252220",
  gameColorMid: "#4fa590",
  gameColorPale: "#b2eee1",
  cardDescription:
    "Strategically promote members and candidates to the top of the chain of command hierarchy.",
  quickStart: [
    "Win by promoting a member beyond rank 1.",
    "Select a member to promote to the next rank, and replace it by a candidate.",
    "Valid candidates are determined by the last digit of the remaining members' sum or product.",
  ],
  howToPlay: [
    "## Objective",
    "**Win** by promoting a chainOfCommand member beyond rank 1.",
    "**Lose** when no legal replacement remains.",

    "## Replacing Members",
    "- Choose a rank band with exactly three members, then choose one member to promote.",
    "- Replace it with a candidate whose value equals the last digit of the two remaining members' sum **or** product. Tens count as 0.",
    "- Promote the replaced member to the next rank as either a member or a candidate.",
    "- A rank can hold at most three members. If a promotion would exceed this limit, discard one member from that rank.",
  ],
};
