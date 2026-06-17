import { PlayingCard } from "@/components/Cards/card-utils";
import { ZoneConfig } from "@/hooks/useZoneLayout";

const piles: ZoneConfig[] = Array.from({ length: 16 }, (_, i) => ({
  id: `pile-${i}`,
  col: i % 4,
  row: Math.floor(i / 4) + 1,
  fan: { maxVisible: 4 },
  placeholder: { show: true },
}));

export const layoutZones: ZoneConfig[] = [
  {
    id: "deck",
    col: 1.5,
    row: 0,
    fan: { maxVisible: 3 },
    placeholder: { show: true, showCount: true, infoPos: "left" },
  },
  ...piles,
];

export function getColRow(index: number) {
  let row: number[] = [];
  let col: number[] = [];

  for (let i = 0; i < 16; i++) {
    if (Math.floor(i / 4) === Math.floor(index / 4) && i !== index) {
      row.push(i);
    }
    if (i % 4 === index % 4 && i !== index) {
      col.push(i);
    }
  }

  return { row, col };
}

export type GameState = {
  deck: PlayingCard[];
  piles: PlayingCard[][];
  ended: boolean;
  won: boolean;
  winLoseMessage?: string;
};

export type GameSnapshot = {
  game: GameState;
};
