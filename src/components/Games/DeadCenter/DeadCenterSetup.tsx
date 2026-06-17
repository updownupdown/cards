import { ZoneConfig } from "@/hooks/useZoneLayout";
import { PlayingCard } from "../../Cards/card-utils";

export type Zombie = {
  id: string;
  card: PlayingCard;
  dead: boolean;
};

export type Phase = "reveal" | "play" | "kill";

export type GameState = {
  piles: PlayingCard[][];
  zombies: Zombie[];
  draw: PlayingCard[];
  phase: Phase;
  lastPlayedPile: number | null;
  ended: boolean;
  won: boolean;
  winLoseMessage?: string;
};

export type GameSnapshot = {
  game: GameState;
};

export const PILE_TO_ZOMBIES: Record<number, number[]> = {
  0: [0, 11],
  1: [1],
  2: [2, 3],
  3: [10],
  4: [],
  5: [4],
  6: [8, 9],
  7: [7],
  8: [5, 6],
};

export const layoutZones: ZoneConfig[] = [
  // ===== Game Info ===== //
  {
    id: "gameInfo",
    col: 0,
    row: 0,
    width: 6.4,
  },
  // ===== Draw Pile ===== //
  {
    id: "draw",
    col: 4,
    row: 0,
    fan: { maxVisible: 3 },
    placeholder: { show: true, text: "Draw", infoPos: "left" },
  },
  // ===== Zombies ===== //
  // Top
  {
    id: `zombie-0`,
    col: 1,
    row: 1,
  },
  {
    id: `zombie-1`,
    col: 2,
    row: 1,
  },
  {
    id: `zombie-2`,
    col: 3,
    row: 1,
  },
  // Right
  {
    id: `zombie-3`,
    col: 4,
    row: 2,
  },
  {
    id: `zombie-4`,
    col: 4,
    row: 3,
  },
  {
    id: `zombie-5`,
    col: 4,
    row: 4,
  },
  // Bottom
  {
    id: `zombie-6`,
    col: 3,
    row: 5,
  },
  {
    id: `zombie-7`,
    col: 2,
    row: 5,
  },
  {
    id: `zombie-8`,
    col: 1,
    row: 5,
  },
  // Left
  {
    id: `zombie-9`,
    col: 0,
    row: 4,
  },
  {
    id: `zombie-10`,
    col: 0,
    row: 3,
  },
  {
    id: `zombie-11`,
    col: 0,
    row: 2,
  },
  // ===== Piles ===== //
  {
    id: `pile-0`,
    col: 1,
    row: 2,
    fan: {},
  },
  {
    id: `pile-1`,
    col: 2,
    row: 2,
    fan: {},
  },
  {
    id: `pile-2`,
    col: 3,
    row: 2,
    fan: {},
  },
  {
    id: `pile-3`,
    col: 1,
    row: 3,
    fan: {},
  },
  {
    id: `pile-4`,
    col: 2,
    row: 3,
    fan: {},
  },
  {
    id: `pile-5`,
    col: 3,
    row: 3,
    fan: {},
  },
  {
    id: `pile-6`,
    col: 1,
    row: 4,
    fan: {},
  },
  {
    id: `pile-7`,
    col: 2,
    row: 4,
    fan: {},
  },
  {
    id: `pile-8`,
    col: 3,
    row: 4,
    fan: {},
  },
];
