import { normalizeGamePath, type GameSettings } from "./game-menu";

export type GameSpecificSettingKey =
  | "difficulty"
  | "memoryDifficulty"
  | "drawCount"
  | "islandJokers"
  | "loboMode"
  | "dungeonLevel"
  | "boomerAce"
  | "powerReserve"
  | "specialAbilities"
  | "optritaHard"
  | "pokerJokers"
  | "alpineDifficulty"
  | "alpineChallenge"
  | "dungeonDifficulty";
export type GameSpecificSettingApplyBehavior = "immediate" | "next-game";

type GameSpecificSettingOptionValue = GameSettings[GameSpecificSettingKey];

export type GameSpecificSettingDefinition = {
  key: GameSpecificSettingKey;
  label: string;
  type: "string" | "boolean";
  booleanType?: "toggle" | "checkbox";
  applyBehavior: GameSpecificSettingApplyBehavior;
  options: {
    label: string;
    value: GameSpecificSettingOptionValue;
    description?: string;
  }[];
  description?: string;
};

const GAME_SPECIFIC_SETTINGS: Record<string, GameSpecificSettingDefinition[]> =
  {
    "/canfield": [
      {
        key: "drawCount",
        label: "Stock Draw",
        type: "string",
        applyBehavior: "next-game",
        options: [
          { label: "Draw 1", value: 1 },
          { label: "Draw 3", value: 3 },
        ],
      },
    ],
    "/forty-thieves": [
      {
        key: "difficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "next-game",
        options: [
          { label: "Easy", value: "easy" },
          { label: "Difficult", value: "difficult" },
        ],
      },
    ],
    "/baroness": [
      {
        key: "difficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "immediate",
        options: [
          { label: "Easy", value: "easy" },
          { label: "Difficult", value: "difficult" },
        ],
      },
    ],
    "/memory": [
      {
        key: "memoryDifficulty",
        label: "Grid Size",
        type: "string",
        applyBehavior: "next-game",
        options: [
          {
            label: "Very Easy (4 x 3)",
            value: "veryeasy",
          },
          {
            label: "Easy (5 x 4)",
            value: "easy",
          },
          {
            label: "Medium (6 x 5)",
            value: "medium",
          },
          {
            label: "Hard (7 x 6)",
            value: "hard",
          },
          {
            label: "Very Hard (8 x 7)",
            value: "veryhard",
          },
          {
            label: "Extreme (8 x 9)",
            value: "extreme",
          },
        ],
      },
    ],
    "/klondike": [
      {
        key: "drawCount",
        label: "Stock Draw",
        type: "string",
        applyBehavior: "immediate",
        options: [
          { label: "Draw 1", value: 1 },
          { label: "Draw 3", value: 3 },
        ],
      },
    ],
    "/osmosis": [
      {
        key: "drawCount",
        label: "Stock Draw",
        type: "string",
        applyBehavior: "immediate",
        options: [
          { label: "Draw 1", value: 1 },
          { label: "Draw 3", value: 3 },
        ],
      },
    ],
    "/island-of-cards": [
      {
        key: "islandJokers",
        label: "Use Jokers",
        type: "string",
        applyBehavior: "next-game",
        description: "Adds two Joker wildcards you can place anywhere.",
        options: [
          { label: "No", value: false },
          { label: "Yes (Easier)", value: true },
        ],
      },
    ],
    "/lobo": [
      {
        key: "loboMode",
        label: "Difficulty",
        type: "string",
        applyBehavior: "next-game",
        description: "Fewer high rank cards make the Wolf easier to beat.",
        options: [
          { label: "Easy (no 9s or 10s)", value: "easy" },
          { label: "Medium (no 10s)", value: "medium" },
          { label: "Hard (all cards)", value: "hard" },
        ],
      },
    ],
    "/clear-the-dungeon": [
      {
        key: "dungeonLevel",
        label: "Dungeon Layout",
        type: "string",
        applyBehavior: "next-game",
        options: [
          { label: "Level 1 (Beginner)", value: 1 },
          { label: "Level 2", value: 2 },
          { label: "Level 3", value: 3 },
          { label: "Level 4", value: 4 },
          { label: "Level 5 (Extreme)", value: 5 },
        ],
      },
      {
        key: "boomerAce",
        label: "Boomer-Ace",
        type: "boolean",
        booleanType: "toggle",
        applyBehavior: "next-game",
        description:
          "Aces are worth 11, and return to the hand when used as a trigger.",
        options: [
          { label: "Off", value: false },
          { label: "On", value: true },
        ],
      },
      {
        key: "powerReserve",
        label: "Power Reserve",
        type: "boolean",
        booleanType: "toggle",
        applyBehavior: "next-game",
        description:
          "Draw five cards on the first turn, and set two aside to use at any time.",
        options: [
          { label: "Off", value: false },
          { label: "On", value: true },
        ],
      },
      {
        key: "specialAbilities",
        label: "Special Abilities",
        type: "boolean",
        booleanType: "toggle",
        applyBehavior: "next-game",
        description: "Defeated Kings grant one-time abilities.",
        options: [
          { label: "Off", value: false },
          { label: "On", value: true },
        ],
      },
    ],
    "/optrita-lines": [
      {
        key: "optritaHard",
        label: "Mode",
        type: "string",
        applyBehavior: "next-game",
        description: "Hard mode gives the grid a lower target to reach.",
        options: [
          { label: "Normal", value: false },
          { label: "Hard", value: true },
        ],
      },
    ],
    "/in-hand-poker": [
      {
        key: "pokerJokers",
        label: "Jokers",
        type: "string",
        applyBehavior: "next-game",
        description: "Include two wild Jokers in the deck.",
        options: [
          { label: "No Jokers", value: false },
          { label: "Wild Jokers", value: true },
        ],
      },
    ],
    "/alpine-solitaire": [
      {
        key: "alpineDifficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "next-game",
        options: [
          {
            label: "Gentle",
            value: "gentle",
            description:
              "When you reach a camp, always add the played milestone to your trail, even if it is not higher than the previous one.",
          },
          { label: "Standard", value: "standard", description: "No changes." },
          {
            label: "Intense",
            value: "intense",
            description:
              "When you reach a camp, only add the played milestone to your trail if it contains more cards than the previous one.",
          },
        ],
      },
      {
        key: "alpineChallenge",
        label: "The Eight-Thousanders",
        type: "string",
        applyBehavior: "next-game",
        description: "Optional challenges that tweak trail length and rules.",
        options: [
          {
            label: "Base Climb (7,500m)",
            value: "none",
            description: "Trail Length: 3. No special challenge rules.",
          },
          {
            label: "Cho Oyu (8,188m)",
            value: "cho-oyu",
            description:
              "Trail Length: 2. When you reach a camp, do not add the camp's milestone to your trail unless it has at least 6 cards.",
          },
          {
            label: "Shishapangma (8,027m)",
            value: "shishapangma",
            description:
              "Trail Length: 3. When you play a route with a technical (diamonds) or free-climbing (spades) approach, draw an additional card. When you play a route with a cautious (hearts) or reckless (clubs) approach, draw one fewer card. You still do not draw more cards than the number of cards in the route played.",
          },
          {
            label: "Manaslu (8,163m)",
            value: "manaslu",
            description:
              "Trail Length: 4. When you reach a camp, do not add any additional cards to the fatigue pile. When you rest, after adding the cards in the fatigue pile into your hand, only add one card to the fatigue pile.",
          },
          {
            label: "Broad Peak (8,051m)",
            value: "broad-peak",
            description:
              "Trail Length: 3. You cannot play a route unless its approach is different than that of the previous route. When you reach a camp, do not add that camp's milestone to the trail unless its approach is different from that of all previous routes in the trail.",
          },
          {
            label: "Gasherbrum II (8,035m)",
            value: "gasherbrum-ii",
            description:
              "Trail Length: 4. When you play a route, reduce the number of cards you would draw by one before actually drawing cards. If this would cause the number of cards drawn to be negative, instead draw cards equal to the number of cards in the route.",
          },
          {
            label: "Mount Everest (8,848m)",
            value: "everest",
            description:
              "Trail Length: 5. During setup, and whenever you reach a camp, only draw seven cards instead of ten.",
          },
          {
            label: "Dhaulagiri (8,167m)",
            value: "dhaulagiri",
            description:
              "Trail Length: 3. When you reach a camp, do not add that camp's milestone to your trail unless a traverse with at least two cards is in the play area, including the milestone itself.",
          },
          {
            label: "Gasherbrum I (8,080m)",
            value: "gasherbrum-i",
            description:
              "Trail Length: 3. You cannot play a route with an odd-valued anchor, including Aces, Jacks, or Kings.",
          },
          {
            label: "Kangchenjunga (8,586m)",
            value: "kangchenjunga",
            description:
              "Trail Length: 4. When you play a route, you do not have to play the cards in order, so any card in the route can be the anchor. You still cannot play a Joker as the anchor of a route.",
          },
          {
            label: "Lhotse (8,516m)",
            value: "lhotse",
            description:
              "Trail Length: 3. You cannot play a route unless it contains at least two cards.",
          },
          {
            label: "Makalu (8,481m)",
            value: "makalu",
            description:
              "Trail Length: 4. When you play a route, you may also discard any card from your hand.",
          },
          {
            label: "Nanga Parbat (8,126m)",
            value: "nanga-parbat",
            description:
              "Trail Length: 3. You cannot play traverses or descents. Cards in an ascent do not need to be consecutive, but the distance between each card must be the same.",
          },
          {
            label: "K2 (8,611m)",
            value: "k2",
            description:
              "Trail Length: 3. When you play a route, the number of cards you draw is not limited by the number of cards in the route played.",
          },
          {
            label: "Annapurna I (8,091m)",
            value: "annapurna",
            description:
              "Trail Length: 4. When you draw cards after playing a route, if any of the cards drawn match the suit of the route's anchor, return all cards in the route played to your hand. Do not do this when you reach a camp. If you ever have 18 or more cards in your hand, you immediately lose the game.",
          },
        ],
      },
    ],
    "/dungeon-bounty": [
      {
        key: "dungeonDifficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "next-game",
        description:
          "Higher tiers start with less strength; only Beginner ignores enemy suit powers.",
        options: [
          { label: "Beginner (5, no powers)", value: "beginner" },
          { label: "Intermediate (5)", value: "intermediate" },
          { label: "Advanced (3)", value: "advanced" },
          { label: "Bloodlust (1)", value: "bloodlust" },
        ],
      },
    ],
  };

const APPLY_BEHAVIOR_TEXT: Record<GameSpecificSettingApplyBehavior, string> = {
  immediate: "Applies without resetting the game.",
  "next-game": "Resets the game on change.",
};

export function getSettingApplyBehaviorText(
  applyBehavior: GameSpecificSettingApplyBehavior,
) {
  return APPLY_BEHAVIOR_TEXT[applyBehavior];
}

export function getGameSpecificSettingDefinitions(pathname: string) {
  const key = normalizeGamePath(pathname);
  return GAME_SPECIFIC_SETTINGS[key] ?? [];
}
