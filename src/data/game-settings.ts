import { normalizeGamePath, type GameSettings } from "./game-menu";

export type GameSpecificSettingKey =
  | "difficulty"
  | "memoryDifficulty"
  | "drawCount"
  | "islandJokers"
  | "lycanMode"
  | "dungeonLevel"
  | "boomerAce"
  | "powerReserve"
  | "specialAbilities"
  | "gridlinesHard"
  | "pokerJokers"
  | "ascentDifficulty"
  | "ascentChallenge"
  | "chapterAndVerseLoyalPatrons"
  | "chapterAndVerseCheckBack"
  | "chapterAndVerseSuperExclusive"
  | "chapterAndVerseVandals"
  | "fightClubsDifficulty"
  | "herbalistOpenStables"
  | "royalRestHardMode"
  | "pyramidDifficulty"
  | "golfDifficulty"
  | "gapsDifficulty"
  | "seerDifficulty"
  | "gremlinDifficulty"
  | "nightVigilDifficulty";
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
    "/gaps": [
      {
        key: "gapsDifficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "next-game",
        description:
          "Controls how many times the unordered cards may be redealt.",
        options: [
          { label: "Easy (3 redeals)", value: "easy" },
          { label: "Hard (2 redeals)", value: "hard" },
        ],
      },
    ],
    "/golf": [
      {
        key: "golfDifficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "immediate",
        description: "Easy mode lets Aces and Kings play on each other.",
        options: [
          { label: "Easy", value: "easy" },
          { label: "Hard", value: "hard" },
        ],
      },
    ],
    "/night-vigil": [
      {
        key: "nightVigilDifficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "next-game",
        options: [
          {
            label: "Street Level",
            value: "street",
            description: "Kings deal 1 additional damage.",
          },
          {
            label: "Kingpin Case",
            value: "kingpin",
            description: "Queens and Kings deal 1 additional damage.",
          },
          {
            label: "City in Shadows",
            value: "city",
            description: "Queens deal 1 and Kings deal 2 additional damage.",
          },
        ],
      },
    ],
    "/gremlin": [
      {
        key: "gremlinDifficulty",
        label: "Hand Size",
        type: "string",
        applyBehavior: "next-game",
        options: [
          { label: "5 (Easy)", value: "easy" },
          { label: "4 (Hard)", value: "hard" },
        ],
      },
    ],
    "/seer": [
      {
        key: "seerDifficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "immediate",
        description: "Controls which neighboring stones a success can free.",
        options: [
          { label: "Easy (including diagonals)", value: "easy" },
          { label: "Normal (orthogonal)", value: "normal" },
          { label: "Hard (choose one)", value: "hard" },
        ],
      },
    ],
    "/royal-rest": [
      {
        key: "royalRestHardMode",
        label: "Hard Mode",
        type: "boolean",
        booleanType: "toggle",
        applyBehavior: "immediate",
        description:
          "Jacks cannot move onto a column containing another Jack, even when a pillow separates them.",
        options: [
          { label: "Off", value: false },
          { label: "On", value: true },
        ],
      },
    ],
    "/herbalist": [
      {
        key: "herbalistOpenStables",
        label: "Open Stables",
        type: "boolean",
        booleanType: "toggle",
        applyBehavior: "next-game",
        description:
          "Adds the Noble and Jester companions to the central Stables location.",
        options: [
          { label: "Off", value: false },
          { label: "On", value: true },
        ],
      },
    ],
    "/fight-clubs": [
      {
        key: "fightClubsDifficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "next-game",
        description: "Hard mode adds a second Joker to the grid deck.",
        options: [
          { label: "Easy (1 Joker)", value: "easy" },
          { label: "Hard (2 Jokers)", value: "hard" },
        ],
      },
    ],
    "/pyramid": [
      {
        key: "pyramidDifficulty",
        label: "Difficulty",
        type: "string",
        applyBehavior: "immediate",
        description:
          "Easy mode lets you select a second card if it is only covered by the first selected card. It's not actually much easier, but it is more forgiving.",
        options: [
          { label: "Easy", value: "easy" },
          { label: "Hard", value: "hard" },
        ],
      },
    ],
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
          {
            label: "Easy",
            value: "easy",
            description: "Allows infinite redeals.",
          },
          {
            label: "Difficult",
            value: "difficult",
            description: "No redeals allowed.",
          },
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
    "/archipelago": [
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
    "/lycan": [
      {
        key: "lycanMode",
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
    "/twelve-trials": [
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
    "/gridlines": [
      {
        key: "gridlinesHard",
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
    "/pocket-poker": [
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
    "/ascent": [
      {
        key: "ascentDifficulty",
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
        key: "ascentChallenge",
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
    "/chapter-and-verse": [
      {
        key: "chapterAndVerseLoyalPatrons",
        label: "Loyal Patrons",
        type: "boolean",
        booleanType: "toggle",
        applyBehavior: "next-game",
        description:
          "Offers using four or more Books add the Customer to Guild Standing.",
        options: [
          { label: "Off", value: false },
          { label: "On (Easy)", value: true },
        ],
      },
      {
        key: "chapterAndVerseCheckBack",
        label: "Let Me Check in the Back",
        type: "boolean",
        booleanType: "toggle",
        applyBehavior: "next-game",
        description: "The top Book in Inventory can be included in an offer.",
        options: [
          { label: "Off", value: false },
          { label: "On (Easy)", value: true },
        ],
      },
      {
        key: "chapterAndVerseSuperExclusive",
        label: "Super Exclusive Offer",
        type: "boolean",
        booleanType: "toggle",
        applyBehavior: "next-game",
        description: "Books matching the Used Book's genre or value cost $0.",
        options: [
          { label: "Off", value: false },
          { label: "On (Hard)", value: true },
        ],
      },
      {
        key: "chapterAndVerseVandals",
        label: "Vandals!",
        type: "string",
        applyBehavior: "next-game",
        description:
          "Jokers lock the first available Bookstore shelf when they reach the Line.",
        options: [
          { label: "Off", value: "off" },
          { label: "1 Joker (Hard)", value: "one" },
          { label: "2 Jokers (Harder)", value: "two" },
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
