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

/**
 * Ratings from 0 to 100, for the default settings and a thoughtful adult
 * with moderate experience of the game. Difficulty and luck place games on
 * the Campaign map, so keep them on the same scale as the other games.
 */
export type GameRating = {
  /** How much there is to learn and keep track of: 5 for Clock, 20 for
   *  Klondike, 85 for Royal Envoy. */
  complexity: number;
  /** How rarely a game is won: about 15 when nearly every game is won, 50
   *  for about half, 70 for a quarter, 85 for one in ten, 95 for fewer than
   *  one in twenty. Games that can't be lost rate the effort to finish. */
  difficulty: number;
  /** How much the deal decides the result rather than your play: 0 for a
   *  puzzle with no hidden or random cards, 100 for a game with no choices. */
  luck: number;
};

export type GameStatsNames = keyof GameRating;
export const statKeys: GameStatsNames[] = ["complexity", "difficulty", "luck"];

export const DEFAULT_GAME_BACKGROUND: GameBackground = city;

/** Where a game's public domain thumbnail art comes from. */
export type ArtCredit = {
  /** The artwork's title, as its source gives it. */
  title: string;
  artistName: string;
  /** When it was made, as its source gives it, e.g. "1890–95" or "ca. 1800". */
  date?: string;
  /** The collection or archive the image was taken from. */
  sourceName: string;
  /** The artwork's page at that source. */
  sourceLink: string;
};

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
  /** Credit for the thumbnail's art. npm run thumbnails:convert won't
   *  assign a new thumbnail to a game without one. */
  thumbnailCredit?: ArtCredit;
  background?: GameBackground;
  animation?: GameAnimation;

  // Colors
  gameColorDark: HexColor;
  gameColorPale: HexColor;
  /**
   * A highlight that goes with the game's two colours, for links and other
   * touches in its menus: often its card back's ink, lightened, unless that
   * sits too close to the game's own colours or its scene.
   */
  gameColorAccent: HexColor;
  /** Which shared card-back ink this game's deck is printed in. */
  cardBack: CardBackColor;

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
