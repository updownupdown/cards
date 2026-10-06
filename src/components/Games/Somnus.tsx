import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  collectCards,
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isFace,
  isJoker,
  rankValue,
  shuffle,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { ProgressBar } from "../Home/ProgressBar";
import { Text } from "../common/Text";
import { useToast } from "../common/Toast";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import {
  cardTarget,
  makeHint,
  withNote,
  zoneTarget,
  type HintTarget,
} from "@/hints/hint";
const MAX_LIFE = 40;
const BOARD_SIZE = 3;
const MAX_HAND = 4;

export type SomnusGameState = {
  dreamDeck: PlayingCard[];
  dreamDiscard: PlayingCard[];
  board: (PlayingCard | null)[];
  assignments: PlayingCard[][];
  guardianDeck: PlayingCard[];
  guardianDiscard: PlayingCard[];
  hand: PlayingCard[];
  removedGuardians: PlayingCard[];
  removedNightmares: PlayingCard[];
  life: number;
  playedThisTurn: boolean;
  exileUsedThisTurn: boolean;
  remSleepUsed: boolean;
  turn: number;
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

function createEmptyState(): SomnusGameState {
  return {
    dreamDeck: [],
    dreamDiscard: [],
    board: [null, null, null],
    assignments: [[], [], []],
    guardianDeck: [],
    guardianDiscard: [],
    hand: [],
    removedGuardians: [],
    removedNightmares: [],
    life: MAX_LIFE,
    playedThisTurn: false,
    exileUsedThisTurn: false,
    remSleepUsed: false,
    turn: 1,
    ended: false,
    won: false,
    winLoseMessage: "",
  };
}

/** The table cleared, with every card gathered face down into the dream deck. */
function gatherState(cards: PlayingCard[]): SomnusGameState {
  return { ...createEmptyState(), dreamDeck: shuffle(flipAllToBack(cards)) };
}

// Starts with every card in the dream deck, to be dealt out from there.
const initialState = gatherState(createDeck({ includeJokers: true }));

function isGuardian(card: PlayingCard) {
  return card.suit === "hearts" || card.suit === "diamonds";
}

function isNightmare(card: PlayingCard) {
  return !isGuardian(card);
}

function isGuardianAce(card: PlayingCard) {
  return isGuardian(card) && card.rank === "A";
}

function isNightmareAce(card: PlayingCard | null) {
  return !!card && isNightmare(card) && card.rank === "A";
}

function isAceDestroyer(card: PlayingCard) {
  return (
    isGuardian(card) &&
    (card.rank === "A" ||
      card.rank === "J" ||
      card.rank === "Q" ||
      card.rank === "K")
  );
}

function isNonAceSpecialGuardian(card: PlayingCard) {
  return isGuardian(card) && (isFace(card) || isJoker(card));
}

function copiedCardValue(card: PlayingCard | undefined) {
  if (!card || card.rank === "A") return 0;
  if (isJoker(card)) return 0;
  return rankValue(card);
}

function dreamCardValue(
  card: PlayingCard,
  removedGuardians: PlayingCard[],
  removedNightmares: PlayingCard[],
) {
  if (card.rank === "A") return 0;
  if (!isJoker(card)) return rankValue(card);

  const copiedPile = isGuardian(card) ? removedGuardians : removedNightmares;
  return copiedCardValue(copiedPile.at(-1));
}

function playedValue(
  cards: PlayingCard[],
  board: (PlayingCard | null)[],
  removedGuardians: PlayingCard[],
  removedNightmares: PlayingCard[],
) {
  const baseValue = cards.reduce(
    (total, card) =>
      total +
      (isGuardianAce(card)
        ? 0
        : dreamCardValue(card, removedGuardians, removedNightmares)),
    0,
  );
  const hasGuardianAce = cards.some(isGuardianAce);
  const nightmareAcePresent = board.some(isNightmareAce);

  if (nightmareAcePresent) {
    return hasGuardianAce ? baseValue : baseValue / 2;
  }
  return hasGuardianAce ? baseValue * 2 : baseValue;
}

function canAssignToTarget(
  target: PlayingCard,
  assigned: PlayingCard[],
  selected: PlayingCard[],
  state: SomnusGameState,
) {
  if (selected.length === 0 || selected.some((card) => !isGuardian(card))) {
    return false;
  }

  const combined = [...assigned, ...selected];
  if (combined.filter(isGuardianAce).length > 1) return false;

  if (isNightmare(target)) {
    return combined.filter((card) => !isGuardianAce(card)).length <= 2;
  }

  if (target.rank === "A" && !combined.some(isAceDestroyer)) return false;
  if (isJoker(target) && state.removedGuardians.length === 0) return false;
  if (
    isJoker(target) &&
    state.removedGuardians.at(-1)?.rank === "A" &&
    !combined.some(isAceDestroyer)
  ) {
    return false;
  }

  return (
    playedValue(
      combined,
      state.board,
      state.removedGuardians,
      state.removedNightmares,
    ) >= dreamCardValue(target, state.removedGuardians, state.removedNightmares)
  );
}

function removeCardsById(cards: PlayingCard[], ids: Set<string>) {
  return cards.filter((card) => !ids.has(card.id));
}

function drawGuardians(state: SomnusGameState) {
  const drawCount = state.hand.length === 0 ? 3 : MAX_HAND - state.hand.length;

  for (let index = 0; index < drawCount; index += 1) {
    if (state.guardianDeck.length === 0 && state.guardianDiscard.length > 0) {
      state.guardianDeck = shuffle(state.guardianDiscard.map(flipToBack));
      state.guardianDiscard = [];
    }

    const card = state.guardianDeck.pop();
    if (!card) break;
    state.hand.push(flipToFace(card));
  }
}

function remainingDreamCards(state: SomnusGameState) {
  return [
    ...state.dreamDeck,
    ...state.dreamDiscard,
    ...state.board.filter((card): card is PlayingCard => card !== null),
  ];
}

function checkDreamExhaustion(state: SomnusGameState) {
  const remaining = remainingDreamCards(state);
  const nonAceNightmares = remaining.filter(
    (card) => isNightmare(card) && card.rank !== "A",
  );

  if (nonAceNightmares.length === 0) {
    state.ended = true;
    state.won = true;
    state.winLoseMessage = i18n.t("games:somnus.aliceAwakened", {
      count: state.life,
    });
    return true;
  }

  const lostSpecialGuardians = state.removedGuardians.filter(
    isNonAceSpecialGuardian,
  ).length;
  if (lostSpecialGuardians >= 7) {
    state.ended = true;
    state.won = false;
    state.winLoseMessage = i18n.t("games:somnus.guardiansLost");
    return true;
  }

  return false;
}

function recycleDreamDeck(state: SomnusGameState) {
  if (state.dreamDeck.length > 0) return true;
  if (checkDreamExhaustion(state)) return false;
  if (state.dreamDiscard.length === 0) return false;

  state.dreamDeck = shuffle(state.dreamDiscard.map(flipToBack));
  state.dreamDiscard = [];
  return true;
}

function refillBoard(state: SomnusGameState) {
  for (let slot = BOARD_SIZE - 1; slot >= 0; slot -= 1) {
    if (state.board[slot]) continue;
    if (!recycleDreamDeck(state)) return;

    const card = state.dreamDeck.pop();
    if (card) state.board[slot] = flipToFace(card);
  }

  if (state.dreamDeck.length === 0 && !state.ended) {
    recycleDreamDeck(state);
  }
}

function resolveBoard(state: SomnusGameState) {
  for (let slot = BOARD_SIZE - 1; slot >= 0; slot -= 1) {
    const target = state.board[slot];
    if (!target) continue;
    const assigned = state.assignments[slot];

    if (isNightmare(target)) {
      const targetValue = dreamCardValue(
        target,
        state.removedGuardians,
        state.removedNightmares,
      );
      const defenseValue = playedValue(
        assigned,
        state.board,
        state.removedGuardians,
        state.removedNightmares,
      );
      const copiesAce =
        isJoker(target) && state.removedNightmares.at(-1)?.rank === "A";
      const eliminated =
        assigned.length > 0 &&
        (target.rank === "A"
          ? assigned.some(isAceDestroyer)
          : copiesAce || defenseValue > targetValue);

      if (eliminated) {
        state.removedNightmares.push(flipToFace(target));
        state.board[slot] = null;
        if (isFace(target)) {
          state.life = Math.min(MAX_LIFE, state.life + 3);
        }
      } else {
        state.life -= Math.max(0, targetValue - defenseValue);
      }
    } else if (assigned.length > 0) {
      if (isJoker(target)) {
        const restored = state.removedGuardians.pop();
        if (restored) state.guardianDiscard.push(flipToFace(restored));
        state.removedGuardians.push(flipToFace(target));
      } else {
        state.guardianDiscard.push(flipToFace(target));
      }
      state.board[slot] = null;
    }

    state.guardianDiscard.push(...assigned.map(flipToFace));
    state.assignments[slot] = [];

    if (state.life <= 0) {
      state.life = 0;
      state.ended = true;
      state.won = false;
      state.winLoseMessage = i18n.t("games:somnus.nightmaresOverwhelmed");
      return;
    }
  }
}

function advanceBoard(state: SomnusGameState) {
  const rightmost = state.board[2];
  if (rightmost) {
    if (isNightmare(rightmost)) {
      state.dreamDiscard.push(flipToFace(rightmost));
    } else {
      state.removedGuardians.push(flipToFace(rightmost));
    }
  }

  const survivors = state.board
    .slice(0, 2)
    .filter((card): card is PlayingCard => card !== null);
  state.board = [
    ...Array.from({ length: BOARD_SIZE - survivors.length }, () => null),
    ...survivors,
  ];
  state.assignments = [[], [], []];
  refillBoard(state);
}

function finishTurn(state: SomnusGameState) {
  resolveBoard(state);
  if (state.ended) return;
  advanceBoard(state);
  if (state.ended) return;
  drawGuardians(state);
  state.playedThisTurn = false;
  state.exileUsedThisTurn = false;
  state.turn += 1;
}

function createGame(cards = createDeck({ includeJokers: true })) {
  const redAces = shuffle(
    cards.filter((card) => isGuardian(card) && card.rank === "A"),
  );
  const startingAce = redAces[0];
  const startingGuardians = cards.filter(
    (card) =>
      isGuardian(card) &&
      (["2", "3", "4", "5"].includes(card.rank) || card.id === startingAce.id),
  );
  const startingIds = new Set(startingGuardians.map((card) => card.id));
  const dreamCards = cards.filter((card) => !startingIds.has(card.id));
  const openingCards = shuffle(
    dreamCards.filter(
      (card) => card.rank !== "A" && !isFace(card) && !isJoker(card),
    ),
  );
  const openingBoard = openingCards.slice(0, BOARD_SIZE).map(flipToFace);
  const openingIds = new Set(openingBoard.map((card) => card.id));

  const state: SomnusGameState = {
    ...createEmptyState(),
    board: openingBoard,
    assignments: [[], [], []],
    guardianDeck: shuffle(startingGuardians.map(flipToBack)),
    dreamDeck: shuffle(
      dreamCards.filter((card) => !openingIds.has(card.id)).map(flipToBack),
    ),
  };
  while (state.hand.length < MAX_HAND) {
    const card = state.guardianDeck.pop();
    if (!card) break;
    state.hand.push(flipToFace(card));
  }
  return state;
}

// —— Hints ——

/** A turn's plan: which hand cards go to which Dream card, and any Exile. */
type SomnusPlan = {
  /** By board slot, the hand cards to assign there. */
  groups: PlayingCard[][];
  exile: { slot: number; card: PlayingCard } | null;
  score: number;
};

/** A copy of what resolving the board touches, to try a plan on. */
function previewState(state: SomnusGameState): SomnusGameState {
  return {
    ...state,
    board: [...state.board],
    assignments: state.assignments.map((cards) => [...cards]),
    removedGuardians: [...state.removedGuardians],
    removedNightmares: [...state.removedNightmares],
    guardianDiscard: [],
    dreamDiscard: [],
  };
}

/** What a Guardian card is worth to keep: Aces double, so count them high. */
function guardianWorth(card: PlayingCard) {
  return card.rank === "A" ? 7 : isJoker(card) ? 10 : rankValue(card);
}

/**
 * How good the board is once a plan is resolved: Alice's life, Nightmares
 * eliminated for good, Guardians molded into the deck, less what still
 * threatens: Nightmares that will strike again, and a special Guardian
 * about to leave unmolded (lose seven and the game is lost). The weights
 * were tuned by playing many deals.
 */
function scorePlan(before: SomnusGameState, after: SomnusGameState) {
  if (after.ended && !after.won) return -10000;
  let score = after.life;
  before.board.forEach((target, slot) => {
    if (!target || after.board[slot]) return;
    if (isNightmare(target)) {
      score += target.rank === "A" ? 4 : 12;
    } else {
      score +=
        0.5 * guardianWorth(target) + (isNonAceSpecialGuardian(target) ? 4 : 0);
    }
  });
  after.board.forEach((card, slot) => {
    if (!card) return;
    if (isNightmare(card)) {
      // It strikes again for each turn it stays: once more for each card
      // that stays to its right (the rightmost leaves now).
      const stays =
        slot === BOARD_SIZE - 1
          ? 0
          : 1 +
            after.board.slice(slot + 1, BOARD_SIZE - 1).filter(Boolean).length;
      score -=
        0.4 *
        stays *
        dreamCardValue(card, after.removedGuardians, after.removedNightmares);
    } else if (slot === BOARD_SIZE - 1 && isNonAceSpecialGuardian(card)) {
      const lost = after.removedGuardians.filter(
        isNonAceSpecialGuardian,
      ).length;
      score -= 12 + 4 * lost;
    }
  });
  return score;
}

const EXILE_ABOVE = 20;

/** Tries a plan: Exile first, then the assignments, then resolve. */
function tryPlan(
  state: SomnusGameState,
  groups: PlayingCard[][],
  exile: SomnusPlan["exile"],
) {
  const preview = previewState(state);
  if (exile) {
    preview.board[exile.slot] = null;
    preview.life -= 5;
  }
  groups.forEach((cards, slot) => preview.assignments[slot].push(...cards));
  const before = previewState(preview);
  resolveBoard(preview);
  return scorePlan(before, preview);
}

/**
 * The best plan for the rest of this turn, over every way to share the
 * hand out (four cards at most, three slots), with and without an Exile.
 */
function bestSomnusPlan(state: SomnusGameState): SomnusPlan {
  const exiles: SomnusPlan["exile"][] = [null];
  // Exiling costs 5 life, and the Nightmare comes back: only while there's
  // life to spare.
  if (!state.exileUsedThisTurn && state.life >= EXILE_ABOVE) {
    state.board.forEach((target, slot) => {
      if (!target || !isNightmare(target)) return;
      state.hand.forEach((card) => exiles.push({ slot, card }));
    });
  }

  let best: SomnusPlan | null = null;
  for (const exile of exiles) {
    const board = [...state.board];
    if (exile) board[exile.slot] = null;
    const after = { ...state, board };
    const hand = state.hand.filter((card) => card !== exile?.card);
    const slots = [-1, ...board.flatMap((card, slot) => (card ? [slot] : []))];
    const choices = slots.length ** hand.length;
    for (let choice = 0; choice < choices; choice += 1) {
      const groups: PlayingCard[][] = [[], [], []];
      let rest = choice;
      hand.forEach((card) => {
        const slot = slots[rest % slots.length];
        rest = Math.floor(rest / slots.length);
        if (slot >= 0) groups[slot].push(card);
      });
      const valid = groups.every(
        (cards, slot) =>
          cards.length === 0 ||
          canAssignToTarget(
            board[slot]!,
            state.assignments[slot],
            cards,
            after,
          ),
      );
      if (!valid) continue;
      // Ties go to the plan that spends least: kept cards stay in hand.
      const spent = groups
        .flat()
        .reduce((sum, card) => sum + guardianWorth(card), 0);
      const score =
        tryPlan(state, groups, exile) - spent * 0.01 - (exile ? 0.5 : 0);
      if (!best || score > best.score) best = { groups, exile, score };
    }
  }
  return best!;
}

function findSomnusHint(
  state: SomnusGameState,
  selectedHandIds: string[],
  selectedBoardSlot: number | null,
) {
  if (state.ended) return null;
  const noAssignments = state.assignments.every((cards) => cards.length === 0);

  /** Taps to pick exactly these hand cards and this Dream card. */
  const pick = (cards: PlayingCard[], slot: number | null) => {
    const ids = new Set(cards.map((card) => card.id));
    const taps = state.hand
      .filter((card) => ids.has(card.id) !== selectedHandIds.includes(card.id))
      .map(cardTarget);
    if (slot !== null && selectedBoardSlot !== slot) {
      taps.push(cardTarget(state.board[slot]!));
    }
    return taps;
  };
  const press = (
    label: string,
    taps: HintTarget[],
    note?:
      | "eliminate"
      | "defend"
      | "mold"
      | "exile"
      | "deepBreath"
      | "remSleep",
  ) => {
    const hint = makeHint(
      { key: "press", values: { label } },
      ...taps,
      zoneTarget("actions"),
    );
    return note ? withNote(hint, i18n.t(`games:somnus.hint.${note}`)) : hint;
  };

  const plan = bestSomnusPlan(state);
  if (
    plan.score <= -10000 &&
    state.life <= 10 &&
    !state.remSleepUsed &&
    noAssignments
  ) {
    return press(i18n.t("games:somnus.remSleep"), [], "remSleep");
  }
  if (plan.exile) {
    return press(
      i18n.t("games:somnus.exile"),
      pick([plan.exile.card], plan.exile.slot),
      "exile",
    );
  }
  // The rightmost first: it resolves first.
  for (let slot = BOARD_SIZE - 1; slot >= 0; slot -= 1) {
    const cards = plan.groups[slot];
    const target = state.board[slot];
    if (cards.length === 0 || !target) continue;
    const preview = previewState(state);
    preview.assignments[slot].push(...cards);
    resolveBoard(preview);
    const note = isGuardian(target)
      ? "mold"
      : preview.board[slot] === null
        ? "eliminate"
        : "defend";
    return press(i18n.t("games:somnus.assign"), pick(cards, slot), note);
  }

  // Nothing worth assigning: swap the weakest card for a new one, if the
  // deck holds better on average.
  if (noAssignments && !state.playedThisTurn && state.hand.length > 0) {
    const weakest = state.hand.reduce((low, card) =>
      guardianWorth(card) < guardianWorth(low) ? card : low,
    );
    const pool = [...state.guardianDeck, ...state.guardianDiscard];
    const average =
      pool.reduce((sum, card) => sum + guardianWorth(card), 0) /
      Math.max(1, pool.length);
    if (guardianWorth(weakest) < average) {
      return press(
        i18n.t("games:somnus.deepBreath"),
        pick([weakest], null),
        "deepBreath",
      );
    }
  }
  return press(i18n.t("cards:resolve"), []);
}

export const somnusRules = {
  findHint: findSomnusHint,
  bestPlan: bestSomnusPlan,
  isGuardian,
  isNightmare,
  dreamCardValue,
  playedValue,
  canAssignToTarget,
  drawGuardians,
  checkDreamExhaustion,
  resolveBoard,
  advanceBoard,
  finishTurn,
  createGame,
};

export default function Somnus() {
  const showToast = useToast();
  const [selectedHandIds, setSelectedHandIds] = useState<string[]>([]);
  const [selectedBoardSlot, setSelectedBoardSlot] = useState<number | null>(
    null,
  );

  function clearSelection() {
    setSelectedHandIds([]);
    setSelectedBoardSlot(null);
  }

  const { game, setGame, reset, isLoaded, canUndo, undo, saveUndoState } =
    useStateManager<SomnusGameState>({
      gameStateInitial: initialState,
      resetNonGameStates: clearSelection,
      resetAndSetup: async () => {
        // Gather every card into the dream deck, then deal them back out.
        setGame((draft) => gatherState(collectCards(draft)));
        await delay();
        setGame((draft) => createGame(draft.dreamDeck));
        await delay(100);
      },
    });

  useHint(() => findSomnusHint(game, selectedHandIds, selectedBoardSlot), {
    game,
  });

  const selectedCards = game.hand.filter((card) =>
    selectedHandIds.includes(card.id),
  );
  const selectedTarget =
    selectedBoardSlot === null ? null : game.board[selectedBoardSlot];
  const canAssign =
    selectedBoardSlot !== null &&
    !!selectedTarget &&
    canAssignToTarget(
      selectedTarget,
      game.assignments[selectedBoardSlot],
      selectedCards,
      game,
    );
  const canExile =
    selectedCards.length === 1 &&
    selectedBoardSlot !== null &&
    !!selectedTarget &&
    isNightmare(selectedTarget) &&
    !game.exileUsedThisTurn &&
    game.life >= 6;
  const noAssignments = game.assignments.every(
    (assignment) => assignment.length === 0,
  );
  const canDeepBreath =
    selectedCards.length === 1 && !game.playedThisTurn && noAssignments;
  const canRemSleep = game.life <= 10 && !game.remSleepUsed && noAssignments;
  const selectedValue = playedValue(
    selectedCards,
    game.board,
    game.removedGuardians,
    game.removedNightmares,
  );

  function toggleHandCard(card: PlayingCard) {
    setSelectedHandIds((current) =>
      current.includes(card.id)
        ? current.filter((id) => id !== card.id)
        : [...current, card.id],
    );
  }

  function assignCards() {
    if (!canAssign || selectedBoardSlot === null) {
      showToast(i18n.t("games:somnus.thatAssignmentDoesNotMeet"));
      return;
    }

    saveUndoState(structuredClone(game));
    const selectedIds = new Set(selectedHandIds);
    setGame((draft) => {
      const cards = draft.hand.filter((card) => selectedIds.has(card.id));
      draft.hand = removeCardsById(draft.hand, selectedIds);
      draft.assignments[selectedBoardSlot].push(...cards);
      draft.playedThisTurn = true;
    });
    clearSelection();
  }

  function exileNightmare() {
    if (!canExile || selectedBoardSlot === null) return;
    saveUndoState(structuredClone(game));
    const selectedId = selectedHandIds[0];
    setGame((draft) => {
      const discarded = draft.hand.find((card) => card.id === selectedId);
      if (discarded) draft.guardianDiscard.push(flipToFace(discarded));
      draft.hand = draft.hand.filter((card) => card.id !== selectedId);
      const target = draft.board[selectedBoardSlot];
      if (target) draft.dreamDiscard.push(flipToFace(target));
      draft.board[selectedBoardSlot] = null;
      draft.life -= 5;
      draft.exileUsedThisTurn = true;
    });
    clearSelection();
  }

  function resolveTurn() {
    if (game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => finishTurn(draft));
    clearSelection();
  }

  function deepBreath() {
    if (!canDeepBreath) return;
    saveUndoState(structuredClone(game));
    const selectedId = selectedHandIds[0];
    setGame((draft) => {
      const discarded = draft.hand.find((card) => card.id === selectedId);
      if (discarded) draft.guardianDiscard.push(flipToFace(discarded));
      draft.hand = draft.hand.filter((card) => card.id !== selectedId);
      finishTurn(draft);
    });
    clearSelection();
  }

  function remSleep() {
    if (!canRemSleep) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const dreamCards = [
        ...draft.dreamDeck,
        ...draft.dreamDiscard,
        ...draft.board.filter((card): card is PlayingCard => card !== null),
      ];
      const guardianCards = [
        ...draft.guardianDeck,
        ...draft.guardianDiscard,
        ...draft.hand,
      ];

      draft.dreamDeck = shuffle(dreamCards.map(flipToBack));
      draft.dreamDiscard = [];
      draft.board = [null, null, null];
      draft.assignments = [[], [], []];
      for (let slot = BOARD_SIZE - 1; slot >= 0; slot -= 1) {
        const card = draft.dreamDeck.pop();
        if (card) draft.board[slot] = flipToFace(card);
      }

      draft.guardianDeck = shuffle(guardianCards.map(flipToBack));
      draft.guardianDiscard = [];
      draft.hand = [];
      while (draft.hand.length < MAX_HAND) {
        const card = draft.guardianDeck.pop();
        if (!card) break;
        draft.hand.push(flipToFace(card));
      }
      draft.remSleepUsed = true;
    });
    clearSelection();
  }

  const zones: MapZone[] = useMemo(() => {
    const boardZones = game.board.map((card, slot) => ({
      id: `board-${slot}`,
      name: "board",
      pileIndex: slot,
      cards: card ? [card] : [],
      col: 2.25 + slot,
      row: 0.75,
      baseZIndex: 20,
      placeholder: {},
    }));
    const assignmentZones = game.assignments.map((cards, slot) => ({
      id: `assignment-${slot}`,
      name: "assignment",
      pileIndex: slot,
      cards,
      col: 2.25 + slot,
      row: 1.5,
      baseZIndex: 30,
      fan: { direction: "down" as const, offset: cardDims.smallCardOffset },
    }));

    return [
      {
        id: "dream-discard",
        name: "dreamDiscard",
        cards: game.dreamDiscard,
        col: 0,
        row: 0.75,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:discard"), infoPos: "below" },
      },
      {
        id: "dream-deck",
        name: "dreamDeck",
        cards: game.dreamDeck,
        col: 1,
        row: 0.75,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:somnus.dream"),
          infoPos: "below",
          showCount: true,
        },
      },
      ...boardZones,
      {
        id: "removed-nightmares",
        name: "removedNightmares",
        cards: game.removedNightmares,
        col: 5.5,
        row: 0.75,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:somnus.removed"),
          infoPos: "below",
          showCount: true,
        },
      },
      {
        id: "removed-guardians",
        name: "removedGuardians",
        cards: game.removedGuardians,
        col: 5.5,
        row: 3,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:somnus.removed"),
          infoPos: "above",
          showCount: true,
        },
      },
      ...assignmentZones,
      {
        id: "guardian-discard",
        name: "guardianDiscard",
        cards: game.guardianDiscard,
        col: 0,
        row: 3,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:discard"), infoPos: "above" },
      },
      {
        id: "guardian-deck",
        name: "guardianDeck",
        cards: game.guardianDeck,
        col: 1,
        row: 3,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:somnus.guard"),
          infoPos: "above",
          showCount: true,
        },
      },
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 2.25,
        row: 3,
        width: 3,
        fan: { direction: "right", offset: zoneFanOffset(game.hand.length, 3) },
        placeholder: {},
      },
      {
        id: "life",
        col: 0,
        row: 0,
        width: "full",
        height: 0.4,
        baseZIndex: 10,
      },
      {
        id: "actions",
        col: 0,
        row: 4.25,
        width: "full",
        height: 2,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand") {
      const selected = selectedHandIds.includes(mappedCard.card.id);
      return {
        isSelected: selected,
        selectColor: "blue",
        yOffset: selected ? -0.12 : 0,
        onPress: () => toggleHandCard(mappedCard.card),
      };
    }

    if (mappedCard.zoneName === "board") {
      const selected = selectedBoardSlot === mappedCard.pileIndex;
      return {
        isSelected: selected,
        selectColor: isNightmare(mappedCard.card) ? "red" : "green",
        onPress: () =>
          setSelectedBoardSlot(
            selected ? null : (mappedCard.pileIndex ?? null),
          ),
      };
    }

    return { isDisabled: true, clickThroughCards: true };
  };

  const zoneMapper = (zone: MapZone) => {
    if (zone.name !== "board" || zone.pileIndex === undefined) return;
    const selected = selectedBoardSlot === zone.pileIndex;
    return {
      isSelected: selected,
      forceOverlayColor: selected,
      selectColor: selected ? "blue" : "none",
      onPress: () => setSelectedBoardSlot(selected ? null : zone.pileIndex!),
    };
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
  });

  const targetValue = selectedTarget
    ? dreamCardValue(
        selectedTarget,
        game.removedGuardians,
        game.removedNightmares,
      )
    : null;

  const lifePreview = structuredClone(game);

  resolveBoard(lifePreview);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      score={game.life}
      winLoseMessage={game.winLoseMessage}
    >
      {cardMap}

      <View style={[getZoneStylesById("life"), flexStyles.rowCentered]}>
        <Text size="md" weight={600} color={Colors.K100} style={{ flex: 1 }}>
          {i18n.t("games:somnus.turn")} {game.turn}
        </Text>

        <ProgressBar
          totalValue={MAX_LIFE}
          progressValue={game.life}
          previewProgressValue={lifePreview.life}
          autoTallyText
          color={
            game.life / MAX_LIFE <= 0.25
              ? "red"
              : game.life / MAX_LIFE <= 0.5
                ? "orange"
                : "green"
          }
          iconName="heart"
          scaledHeight={cardHeight * 0.4}
          style={{ flex: 3.4 }}
        />
      </View>

      <View
        style={[
          getZoneStylesById("actions"),
          flexStyles.colCentered,
          {
            gap: cardHeight * 0.2,
          },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              gap: cardHeight * 0.2,
            },
          ]}
        >
          <Text size="md" weight={500} color={Colors.K200}>
            {selectedTarget
              ? i18n.t(
                  isNightmare(selectedTarget)
                    ? "games:somnus.nightmareValue"
                    : "games:somnus.guardianValue",
                  { value: targetValue },
                )
              : i18n.t("games:somnus.selectNightmareOrGuardian")}
          </Text>
          <Text size="md" weight={500} color={Colors.K200}>
            {i18n.t("games:somnus.selected", { selectedValue })}
          </Text>
        </View>

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            { gap: cardHeight * 0.2 },
          ]}
        >
          <Button
            text={i18n.t("games:somnus.assign")}
            size="sm"
            theme="green"
            disabled={!canAssign}
            onPress={assignCards}
            style={[flexStyles.flex1]}
            taller
          />
          <Button
            text={i18n.t("games:somnus.exile")}
            size="sm"
            theme="red"
            disabled={!canExile}
            onPress={exileNightmare}
            style={[flexStyles.flex1]}
            taller
          />
          <Button
            text={i18n.t("cards:resolve")}
            size="sm"
            theme="blue"
            onPress={resolveTurn}
            style={[flexStyles.flex1]}
            taller
          />
        </View>

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            { gap: cardHeight * 0.2 },
          ]}
        >
          <Button
            text={i18n.t("games:somnus.deepBreath")}
            size="sm"
            theme="purple"
            disabled={!canDeepBreath}
            onPress={deepBreath}
            style={[flexStyles.flex1]}
          />
          <Button
            text={
              game.remSleepUsed
                ? i18n.t("games:somnus.remUsed")
                : i18n.t("games:somnus.remSleep")
            }
            size="sm"
            theme="orange"
            disabled={!canRemSleep}
            onPress={remSleep}
            style={[flexStyles.flex1]}
          />
        </View>
      </View>
    </GameWrapper>
  );
}
