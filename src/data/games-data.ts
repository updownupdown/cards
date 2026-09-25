import { city, GameBackground } from "./game-backgrounds";
import type { GameThumbnailName } from "./game-thumbnails";
import { isLocalDevEnvironment } from "@/utils/utils";
import type { GameAnimation } from "@/animations/types";
import type { CardBackColor } from "./card-backs";

export enum GameTag {
  // Categories: a game's first tag is the one it is collected under.
  KlondikeFamily = "KlondikeFamily",
  YukonFamily = "YukonFamily",
  FreeCellFamily = "FreeCellFamily",
  SpiderFamily = "SpiderFamily",
  FortyThievesFamily = "FortyThievesFamily",
  CastlesAndFans = "CastlesAndFans",
  FoundationBuilders = "FoundationBuilders",
  DoubleDeckers = "DoubleDeckers",
  ClearTheBoard = "ClearTheBoard",
  PairMatching = "PairMatching",
  Puzzles = "Puzzles",
  Sports = "Sports",
  PokerAndCribbage = "PokerAndCribbage",
  CardCombat = "CardCombat",
  DungeonCrawler = "DungeonCrawler",
  ModernMechanics = "ModernMechanics",
  // Mechanics, kept as secondary tags.
  TableauBuilding = "TableauBuilding",
  SequenceBuilding = "SequenceBuilding",
  StockAndWaste = "StockAndWaste",
  SpatialControl = "SpatialControl",
  GridPlacement = "GridPlacement",
  ScoringPuzzles = "ScoringPuzzles",
}

export type HexColor = `#${string}`;

export type GameRating = {
  complexity: number;
  difficulty: number;
  luck: number;
};

export type GameStatsNames = keyof GameRating;
export const statKeys: GameStatsNames[] = ["complexity", "difficulty", "luck"];

export const DEFAULT_GAME_THUMBNAIL: GameThumbnailName =
  "DefaultThumbnail.webp";
export const DEFAULT_GAME_BACKGROUND: GameBackground = city;

export type GameMenuInfo = {
  // Basic
  title: string;
  aliases?: string[];
  enabledOnLocalOnly?: boolean;
  tags: [GameTag, ...GameTag[]];
  rating: GameRating;
  /**
   * For games whose score counts something you want less of, such as moves
   * or guesses: the best score is then the lowest, and only wins count
   * towards it, since giving up early would otherwise look like a record.
   */
  lowerScoreIsBetter?: boolean;

  // Images
  thumbnail?: GameThumbnailName;
  background?: GameBackground;
  animation?: GameAnimation;

  // Colors
  gameColorDark: HexColor;
  gameColorPale: HexColor;
  /** Which shared card-back ink this game's deck is printed in. */
  cardBack: CardBackColor;
  cardDescription: string;

  // How to Play
  quickStart?: string[]; // Plain text only
  howToPlay?: string[]; // Supports markdown-ish blocks
};

/** A single game entry authored in src/data/games/<slug>.ts. */
export type GameDefinition = GameMenuInfo & {
  path: string;
};

export function isGameEnabled(game: GameMenuInfo | undefined) {
  if (!game || (game.enabledOnLocalOnly && !isLocalDevEnvironment())) {
    return false;
  }

  return true;
}
