import { GameDefinition, GameTag } from "../games-data";
import { GAME_BACKGROUNDS } from "../game-backgrounds";
import { GameCreators } from "../game-creators";

export const syndicate: GameDefinition = {
  path: "/syndicate",
  title: "Syndicate",
  tags: [GameTag.IsaludoCollection, GameTag.ModernMechanics],
  rating: {
    complexity: 70,
    difficulty: 70,
    luck: 30,
  },
  thumbnail: "Syndicate.jpg",
  background: GAME_BACKGROUNDS.brickStreet,
  cardColorBg: "#252220",
  cardColorText: "#b2eee1",
  cardDescription:
    "Stategically promote members and candidates to the top of the syndicate hierarchy.",
  quickStart: ["Build stacks under rank limits; convert in timing windows."],
  howToPlay: [
    "Build and convert stacks under syndicate rank restrictions.",
    "Use timing windows to secure high-value conversions.",
    "Game ends when objective is met or no legal move remains.",
  ],
  credits: {
    creators: [GameCreators.WilSu],
    creationDate: "2021",
  },
};
