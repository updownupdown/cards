import { city, GameBackground } from "./game-backgrounds";
import { GameThumbnailName } from "./game-thumbnails";
import { isLocalDevEnvironment } from "@/utils/utils";
import type { GameAnimation } from "@/animations/types";

export enum GameTag {
  EasyToLearn = "EasyToLearn",
  TableauBuilding = "TableauBuilding",
  ModernMechanics = "ModernMechanics",
  DungeonCrawler = "DungeonCrawler",
  CardCombat = "CardCombat",
  GridPlacement = "GridPlacement",
  PokerAndCribbage = "PokerAndCribbage",
  PairMatching = "PairMatching",
  SequenceBuilding = "SequenceBuilding",
  StockAndWaste = "StockAndWaste",
  ScoringPuzzles = "ScoringPuzzles",
  SpatialControl = "SpatialControl",
}

export const GameTagNames: Record<GameTag, string> = {
  [GameTag.EasyToLearn]: "Easy to Learn",
  [GameTag.TableauBuilding]: "Tableau Building",
  [GameTag.ModernMechanics]: "Modern Mechanics",
  [GameTag.DungeonCrawler]: "Dungeon Crawler",
  [GameTag.CardCombat]: "Card Combat",
  [GameTag.GridPlacement]: "Grid Placement",
  [GameTag.PokerAndCribbage]: "Poker & Cribbage",
  [GameTag.PairMatching]: "Pair Matching",
  [GameTag.SequenceBuilding]: "Sequence Building",
  [GameTag.StockAndWaste]: "Stock & Waste",
  [GameTag.ScoringPuzzles]: "Scoring Puzzles",
  [GameTag.SpatialControl]: "Spatial Control",
};

export type HexColor = `#${string}`;

export type GameRating = {
  complexity: number;
  difficulty: number;
  luck: number;
};

export type GameStatsNames = keyof GameRating;
export const statKeys: GameStatsNames[] = ["complexity", "difficulty", "luck"];

export const DEFAULT_GAME_THUMBNAIL: GameThumbnailName = "DefaultThumbnail.jpg";
export const DEFAULT_GAME_BACKGROUND: GameBackground = city;

export type GameMenuInfo = {
  // Basic
  title: string;
  enabledOnLocalOnly?: boolean;
  tags?: GameTag[];
  rating: GameRating;

  // Images
  thumbnail?: GameThumbnailName;
  background?: GameBackground;
  animation?: GameAnimation;
  cardBack?: string;

  // Colors
  gameColorDark: HexColor;
  gameColorPale: HexColor;
  cardDescription: string;

  // How to Play
  quickStart?: string[]; // Plain text only
  howToPlay?: string[]; // Supports markdown-ish blocks
};

/** A single game entry authored in src/data/games/<slug>.ts. */
export type GameDefinition = GameMenuInfo & { path: string };

export function isGameEnabled(game: GameMenuInfo | undefined) {
  if (!game || (game.enabledOnLocalOnly && !isLocalDevEnvironment())) {
    return false;
  }

  return true;
}
