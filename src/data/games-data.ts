import { GameBackgroundName } from "./game-backgrounds";
import { GameThumbnailName } from "./game-thumbnails";
import { isLocalDevEnvironment } from "@/utils/utils";

export enum GameTag {
  EasyToLearn = "EasyToLearn",
  ClassicSolitaire = "ClassicSolitaire",
  IsaludoCollection = "IsaludoCollection",
  TapAndDrag = "TapAndDrag",
  ModernMechanics = "ModernMechanics",
  Beta = "Beta",
  // AIGenerated = "AIGenerated",
}

export const GameTagNames: Record<GameTag, string> = {
  [GameTag.EasyToLearn]: "Easy to Learn",
  [GameTag.IsaludoCollection]: "Isaludo Collection",
  [GameTag.ClassicSolitaire]: "Classic Solitaire",
  [GameTag.TapAndDrag]: "Tap and drag",
  [GameTag.ModernMechanics]: "Modern Mechanics",
  [GameTag.Beta]: "Beta",
  // [GameTag.AIGenerated]: "AI Generated",
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
export const DEFAULT_GAME_BACKGROUND: GameBackgroundName = "felt-grey.jpg";

/** A single step of guidance shown in the tips box for a given phase. */
export type TipInstruction = {
  /** What the player should do next, e.g. "Pick a card". */
  text: string;
  /** Optional hint to help make the choice, e.g. "Suits must match.". */
  tip?: string;
};

/**
 * Phase-keyed tips instructions. Games pass a `tipPhase` string to
 * `GameWrapper`; the matching entry here is shown in the tips box. Games
 * with a single continuous action can use the `"default"` key.
 */
export type TipInstructions = Record<string, TipInstruction>;

/** The phase key used by single-phase games (or when no phase is provided). */
export const DEFAULT_TIP_PHASE = "default";

export type GameMenuInfo = {
  title: string;
  thumbnail?: GameThumbnailName;
  cardBack?: string;
  /** Optional shared background texture image (see assets/backgrounds). */
  background?: GameBackgroundName;
  cardColorBg: HexColor;
  cardColorText: HexColor;
  cardDescription: string;
  rating: GameRating;
  enabled?: boolean;
  enabledOnLocalOnly?: boolean;
  /** Markdown-ish blocks; supports headings, bold, lists and {5H}/{JC} card tokens. */
  about?: string[];
  /** Markdown-ish blocks; supports headings, bold, lists and {5H}/{JC} card tokens. */
  howToPlay?: string[];
  /** Per-phase tip-mode instructions keyed by phase (or "default"). */
  tip?: TipInstructions;
  byLine?: string;
  tags?: GameTag[];
};

/** A single game entry authored in src/data/games/<slug>.ts. */
export type GameDefinition = GameMenuInfo & { path: string };

export function isGameEnabled(game: GameMenuInfo | undefined) {
  if (!game) {
    return false;
  }

  if (game.enabled === false) {
    return false;
  }

  if (game.enabledOnLocalOnly && !isLocalDevEnvironment()) {
    return false;
  }

  return true;
}
