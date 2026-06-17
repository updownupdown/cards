import { ZoneConfig } from "@/hooks/useZoneLayout";
import {
  createDeck,
  isRed,
  shuffle,
  type PlayingCard,
} from "../../Cards/card-utils";

export const maxAttackersNum = 3;
export const maxDefendersNum = 6;

export type Wave = 1 | 2;

export type GameState = {
  defenderDeck: PlayingCard[];
  currentDefenders: (PlayingCard | null)[];
  attackerDeck: PlayingCard[];
  discardDeck: PlayingCard[];
  currentAttackers: PlayingCard[];
  wave: Wave;
  started: boolean;
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

const attackerRowOffset = 1.4;

const layoutPos = {
  middleGap: 0.2,
  defendersRow1: attackerRowOffset * 2 - 1,
  defendersRow2: attackerRowOffset * 2,
};

export const layoutZones: ZoneConfig[] = [
  // Piles (on the left)
  {
    id: "attackerDeck",
    col: 0,
    row: attackerRowOffset * 0,
    fan: { maxVisible: 3 },
    placeholder: { show: true, text: "Atks", infoPos: "above" },
  },
  {
    id: "discardDeck",
    col: 0,
    row: attackerRowOffset * 1,
    fan: { maxVisible: 3 },
    placeholder: { show: true, text: "Dscrd", infoPos: "above" },
  },
  {
    id: "defenderDeck",
    col: 0,
    row: attackerRowOffset * 2,
    fan: { maxVisible: 3 },
    placeholder: { show: true, text: "Defs", infoPos: "above" },
  },

  // Attackers
  { id: "attacker-0", col: 1 + layoutPos.middleGap, row: 0 },
  { id: "attacker-1", col: 2 + layoutPos.middleGap, row: 0 },
  { id: "attacker-2", col: 3 + layoutPos.middleGap, row: 0 },

  // Defenders
  {
    id: "defender-0",
    col: 1 + layoutPos.middleGap,
    row: layoutPos.defendersRow1,
    placeholder: { show: true },
  },
  {
    id: "defender-1",
    col: 2 + layoutPos.middleGap,
    row: layoutPos.defendersRow1,
    placeholder: { show: true },
  },
  {
    id: "defender-2",
    col: 3 + layoutPos.middleGap,
    row: layoutPos.defendersRow1,
    placeholder: { show: true },
  },
  {
    id: "defender-3",
    col: 1 + layoutPos.middleGap,
    row: layoutPos.defendersRow2,
    placeholder: { show: true },
  },
  {
    id: "defender-4",
    col: 2 + layoutPos.middleGap,
    row: layoutPos.defendersRow2,
    placeholder: { show: true },
  },
  {
    id: "defender-5",
    col: 3 + layoutPos.middleGap,
    row: layoutPos.defendersRow2,
    placeholder: { show: true },
  },
];

// --- SETUP --- //
export function setup(firstSetup = false): GameState {
  const all = shuffle(createDeck());
  const defenderDeck = all.filter((card) => !isRed(card.suit));
  const attackerDeck = all.filter((card) => isRed(card.suit));

  return {
    defenderDeck,
    currentDefenders: [],
    attackerDeck,
    discardDeck: [],
    currentAttackers: [],
    wave: 1,
    ended: false,
    won: false,
    started: !firstSetup,
    winLoseMessage: "",
  };
}
