import { GameBackgroundName } from "./game-backgrounds";
import { GameThumbnailName } from "./game-thumbnails";
import { isLocalDevEnvironment } from "@/utils/utils";

export enum GameTag {
  EasyToLearn = "EasyToLearn",
  ClassicSolitaire = "ClassicSolitaire",
  IsaludoCollection = "IsaludoCollection",
  DragAndDrop = "DragAndDrop",
  ModernMechanics = "ModernMechanics",
}

export const GameTagNames: Record<GameTag, string> = {
  [GameTag.EasyToLearn]: "Easy to Learn",
  [GameTag.IsaludoCollection]: "Isaludo Collection",
  [GameTag.ClassicSolitaire]: "Classic Solitaire",
  [GameTag.DragAndDrop]: "Drag-and-Drop",
  [GameTag.ModernMechanics]: "Modern Mechanics",
};

export type HexColor = `#${string}`;

export type GameStats = {
  complexity: number;
  difficulty: number;
  luck: number;
};

export const DEFAULT_GAME_THUMBNAIL: GameThumbnailName = "DefaultThumbnail.jpg";
export const DEFAULT_GAME_BACKGROUND: GameBackgroundName = "felt-grey.jpg";

/** A single step of guidance shown in the tutorial box for a given phase. */
export type TutorialInstruction = {
  /** What the player should do next, e.g. "Pick a card". */
  text: string;
  /** Optional hint to help make the choice, e.g. "Suits must match.". */
  tip?: string;
};

/**
 * Phase-keyed tutorial instructions. Games pass a `tutorialPhase` string to
 * `GameWrapper`; the matching entry here is shown in the tutorial box. Games
 * with a single continuous action can use the `"default"` key.
 */
export type TutorialInstructions = Record<string, TutorialInstruction>;

/** The phase key used by single-phase games (or when no phase is provided). */
export const DEFAULT_TUTORIAL_PHASE = "default";

export type GameMenuInfo = {
  title: string;
  thumbnail?: GameThumbnailName;
  cardBack?: string;
  /** Optional shared background texture image (see assets/backgrounds). */
  background?: GameBackgroundName;
  cardColorBg: HexColor;
  cardColorText: HexColor;
  cardDescription: string;
  stats: GameStats;
  enabled?: boolean;
  enabledOnLocalOnly?: boolean;
  /** Markdown-ish blocks; supports headings, bold, lists and {5H}/{JC} card tokens. */
  about?: string[];
  /** Markdown-ish blocks; supports headings, bold, lists and {5H}/{JC} card tokens. */
  briefRules: string[];
  /** Markdown-ish blocks; supports headings, bold, lists and {5H}/{JC} card tokens. */
  howToPlay?: string[];
  /** Per-phase tutorial-mode instructions keyed by phase (or "default"). */
  tutorial?: TutorialInstructions;
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
