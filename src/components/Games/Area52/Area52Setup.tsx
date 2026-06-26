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
