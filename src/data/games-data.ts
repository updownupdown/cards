import { GameCreator } from "./game-creators";
import { feltGreyBackground, GameBackground } from "./game-backgrounds";
import { GameThumbnailName } from "./game-thumbnails";
import { isLocalDevEnvironment } from "@/utils/utils";

export enum GameTag {
  EasyToLearn = "EasyToLearn",
  ClassicSolitaire = "ClassicSolitaire",
  IsaludoCollection = "IsaludoCollection",
  TapAndDrag = "TapAndDrag",
  ModernMechanics = "ModernMechanics",
}

export const GameTagNames: Record<GameTag, string> = {
  [GameTag.EasyToLearn]: "Easy to Learn",
  [GameTag.IsaludoCollection]: "Isaludo Collection",
  [GameTag.ClassicSolitaire]: "Classic Solitaire",
  [GameTag.TapAndDrag]: "Tap and drag",
  [GameTag.ModernMechanics]: "Modern Mechanics",
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
export const DEFAULT_GAME_BACKGROUND: GameBackground = feltGreyBackground;

export type GameMenuInfo = {
  // Basic
  title: string;
  enabledOnLocalOnly?: boolean;
  tags?: GameTag[];
  rating: GameRating;

  // Images
  thumbnail?: GameThumbnailName;
  background?: GameBackground;
  cardBack?: string;

  // Colors
  cardColorBg: HexColor;
  cardColorText: HexColor;
  cardDescription: string;

  // How to Play
  quickStart?: string[]; // Plain text only
  howToPlay?: string[]; // Supports markdown-ish blocks

  // About and credits
  about?: string[]; // Supports markdown-ish blocks
  credits?: {
    creators?: GameCreator[];
    creationDate?: string;
    creatorLink?: string;
  };
};

/** A single game entry authored in src/data/games/<slug>.ts. */
export type GameDefinition = GameMenuInfo & { path: string };

export function isGameEnabled(game: GameMenuInfo | undefined) {
  if (!game || (game.enabledOnLocalOnly && !isLocalDevEnvironment())) {
    return false;
  }

  return true;
}
