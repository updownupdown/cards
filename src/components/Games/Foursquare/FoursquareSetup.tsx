import { PlayingCard } from "@/components/Cards/card-utils";
import { getZoneGrid } from "@/components/Cards/CardPositionBuilder";
import { ZoneConfig } from "@/hooks/useZoneLayout";

export const layoutZones: ZoneConfig[] = [
  {
    id: "deck",
    col: 1.5,
    row: 0,
    fan: { maxVisible: 3 },
    placeholder: { show: true, showCount: true, infoPos: "left" },
  },
  ...getZoneGrid({
    idPrefix: "pile",
    length: 16,
    cols: 4,
    rowOffset: 1,
    config: { fan: { maxVisible: 4 }, placeholder: { show: true } },
  }),
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
