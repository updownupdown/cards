import { useFade } from "@/hooks/useFade";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { Animated, View } from "react-native";
import { Button } from "../Button/Button";
import {
  AnimatedCardMapping,
  bufferedDefaultAnimDuration,
} from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { infoSize } from "../Cards/CardMapBackgrounds";
import {
  cardDims,
  CardSuit,
  createDeck,
  flipAllToBack,
  isAce,
  isFace,
  isJoker,
  isNumberRank,
  RANK_VALUE,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import {
  cardTarget,
  makeHint,
  pressHint,
  withNote,
  zoneTarget,
  type Hint,
} from "@/hints/hint";
const maxMarkedPaths = 3;

export type LoopRank = PlayingCard["rank"] | "Joker";

export type LoopCard = {
  id: string;
  suit: CardSuit;
  rank: LoopRank;
  faceUp: boolean;
};

type Path = LoopCard | null;
type MarkedPaths = [Path, Path, Path];
type Note = { card: LoopCard; index: number };

type GameState = {
  deck: LoopCard[];
  dealDeck: LoopCard[];
  deckPos: number;
  paths: MarkedPaths;
  acesPile: LoopCard[];
  trinketsPile: LoopCard[];
  ended: boolean;
  won: boolean;
  winLoseMessage?: string;
  numLoops: number;
};

function isBadStartCard(card: LoopCard) {
  return isJoker(card) || isAce(card) || isFace(card);
}

function hasViableSecondTurn(deck: LoopCard[]) {
  return deck.slice(0, 2).some((card) => {
    if (!isNumberRank(card.rank)) return false;

    const targetIndex = rankValue(card, 1, 0) % deck.length;
    return ![deck[targetIndex], deck[(targetIndex + 1) % deck.length]].every(
      isBadStartCard,
    );
  });
}

function hasSafeLoopStart(deck: LoopCard[]) {
  return (
    deck.length > 1 &&
    !deck.slice(0, 2).every(isBadStartCard) &&
    hasViableSecondTurn(deck)
  );
}

function getLoopDeck(cards?: LoopCard[]): LoopCard[] {
  const deckToShuffle = cards ?? [
    ...createDeck({ faceUp: false }).map((card) => ({
      ...card,
      rank: card.rank as LoopRank,
      faceUp: false,
    })),
    { id: "joker-loop", suit: "spades" as const, rank: "Joker", faceUp: false },
  ];

  let deck: LoopCard[];
  // Ensure an Explore action can reach a viable next turn.
  do {
    deck = shuffle(deckToShuffle);
  } while (!hasSafeLoopStart(deck));

  return deck;
}

// —— Hints ——

type LoopAction =
  | { type: "look" }
  | { type: "explore"; index: number }
  | { type: "mark"; index: number; slot: number }
  | { type: "return"; slot: number };

type LoopState = Pick<
  GameState,
  "deck" | "deckPos" | "paths" | "acesPile" | "trinketsPile" | "ended" | "won"
>;

// Actions looked ahead: marking and returning paths steer the next explore.
const LOOP_DEPTH = 4;

function loopActions(state: LoopState): LoopAction[] {
  const { deck, deckPos, paths } = state;
  if (state.ended || deck.length === 0) return [];
  if (!deck[deckPos].faceUp) return [{ type: "look" }];
  const actions: LoopAction[] = [];
  const free = paths.findIndex((path) => path === null);
  const marked = paths.filter((path) => path !== null).length;
  for (const index of [deckPos, (deckPos + 1) % deck.length]) {
    const card = deck[index];
    if (!card.faceUp || !isNumberRank(card.rank)) continue;
    actions.push({ type: "explore", index });
    if (free >= 0 && marked < maxMarkedPaths) {
      actions.push({ type: "mark", index, slot: free });
    }
  }
  paths.forEach((path, slot) => {
    if (path) actions.push({ type: "return", slot });
  });
  return actions;
}

/** The game after an action, as the game plays it (looking turns cards up). */
function applyLoopAction(state: LoopState, action: LoopAction): LoopState {
  const next: LoopState = {
    ...state,
    deck: [...state.deck],
    paths: [...state.paths] as MarkedPaths,
    acesPile: [...state.acesPile],
    trinketsPile: [...state.trinketsPile],
  };
  const length = next.deck.length;
  if (action.type === "look") {
    for (const index of [next.deckPos, (next.deckPos + 1) % length]) {
      next.deck[index] = { ...next.deck[index], faceUp: true };
    }
  } else if (action.type === "mark") {
    next.paths[action.slot] = next.deck[action.index];
    next.deck.splice(action.index, 1);
    if (action.index < next.deckPos) next.deckPos -= 1;
    next.deckPos = Math.min(next.deckPos, Math.max(0, next.deck.length - 1));
  } else if (action.type === "return") {
    next.deck.splice(next.deckPos, 0, next.paths[action.slot]!);
    next.paths[action.slot] = null;
  } else {
    const card = next.deck[action.index];
    const pos = (next.deckPos + rankValue(card as PlayingCard, 1, 0)) % length;
    next.deckPos = pos;
    const landed = next.deck[pos];
    if (landed.faceUp && isFace(landed as PlayingCard)) {
      next.ended = true;
    } else if (landed.faceUp && isJoker(landed as PlayingCard)) {
      if (next.acesPile.length === 4) {
        next.ended = true;
        next.won = true;
      }
    } else if (landed.faceUp && isAce(landed as PlayingCard)) {
      next.deck.splice(pos, 1);
      next.acesPile.push(landed);
    } else if (landed.faceUp && isNumberRank(landed.rank)) {
      next.deck.splice(pos, 1);
      next.trinketsPile.push(landed);
    }
    if (next.deck.length > 0) next.deckPos %= next.deck.length;
  }
  return next;
}

/**
 * How good a position is: jewels, then trinkets, marked paths (ways out of
 * a dead end) and number cards on view to move by. Lost with no way
 * forward: two cards on view that move nothing, and no path.
 */
function loopValue(state: LoopState) {
  if (state.won) return 1e4;
  if (state.ended) return -1e4;
  const { deck, deckPos, paths } = state;
  const marked = paths.filter((path) => path !== null).length;
  const onView = [deck[deckPos], deck[(deckPos + 1) % deck.length]];
  const movers = onView.filter(
    (card) => card?.faceUp && isNumberRank(card.rank),
  ).length;
  // With no path, the two cards on view are a dead end if neither moves:
  // certain for a card on view, about a third of the time for one face down.
  const stuck = (card: LoopCard | undefined) =>
    !card ? 1 : card.faceUp ? (isNumberRank(card.rank) ? 0 : 1) : 0.32;
  const risk = marked === 0 ? stuck(onView[0]) * stuck(onView[1]) * 1e4 : 0;
  return (
    state.acesPile.length * 100 +
    state.trinketsPile.length * 2 +
    Math.min(marked, 1) * 20 +
    marked * 15 +
    movers * 3 -
    risk
  );
}

function bestLoopLine(
  state: LoopState,
  depth: number,
  root = true,
): { value: number; first: LoopAction | null } {
  const actions = depth > 0 ? loopActions(state) : [];
  if (actions.length === 0) return { value: loopValue(state), first: null };
  // Past the first move, a line may stop where it stands: the moves after
  // it are for later hints to choose.
  let best = {
    value: root ? -Infinity : loopValue(state),
    first: null as LoopAction | null,
  };
  for (const action of actions) {
    const next = applyLoopAction(state, action);
    // A path is only returned to, to explore by it at once (else it's
    // marked again, round and round).
    const value =
      action.type === "return"
        ? loopValue(
            applyLoopAction(next, { type: "explore", index: next.deckPos }),
          )
        : // Looking turns up unknown cards: the line stops there.
          action.type === "look" || next.ended
          ? loopValue(next) + (action.type === "look" ? 1 : 0)
          : bestLoopLine(next, depth - 1, false).value;
    if (value > best.value) best = { value, first: action };
  }
  return best;
}

function loopKey(state: LoopState) {
  return [
    state.deckPos,
    state.deck.map((card) => `${card.id}${card.faceUp ? "" : "?"}`).join(","),
    state.paths.map((path) => path?.id ?? "-").join(","),
  ].join("|");
}

// After a hint to return to a path, the position it leads to and the
// explore it was for: the next hint keeps to it.
let returnPlan: { key: string; action: LoopAction } | null = null;

function findOuroborosHint(
  game: GameState,
  selectedCard: number | undefined,
  selectedPath: number | undefined,
): Hint | null {
  if (game.ended || game.deck.length === 0) return null;
  const planned = returnPlan?.key === loopKey(game) ? returnPlan.action : null;
  const first = planned ?? bestLoopLine(game, LOOP_DEPTH).first;
  if (first?.type === "return") {
    const after = applyLoopAction(game, first);
    returnPlan = {
      key: loopKey(after),
      action: { type: "explore", index: after.deckPos },
    };
  }
  if (!first) return null;
  if (first.type === "look") {
    return withNote(
      pressHint("buttons", i18n.t("games:ouroboros.lookAround")),
      i18n.t("games:ouroboros.hint.lookAround"),
    );
  }
  if (first.type === "return") {
    const hint = makeHint(
      {
        key: "press",
        values: { label: i18n.t("games:ouroboros.returnToPath") },
      },
      selectedPath === first.slot ? [] : cardTarget(game.paths[first.slot]!.id),
      zoneTarget("buttons"),
    );
    return withNote(hint, i18n.t("games:ouroboros.hint.returnToPath"));
  }
  const card = game.deck[first.index];
  const pick = selectedCard === first.index ? [] : cardTarget(card.id);
  if (first.type === "mark") {
    return withNote(
      makeHint(
        {
          key: "press",
          values: { label: markPathLabel(first.slot) },
        },
        pick,
        zoneTarget(`path-${first.slot}`),
      ),
      i18n.t("games:ouroboros.hint.markPath"),
    );
  }
  const after = applyLoopAction(game, first);
  const note = after.won
    ? "escape"
    : after.acesPile.length > game.acesPile.length
      ? "jewel"
      : "explore";
  return withNote(
    makeHint(
      { key: "press", values: { label: i18n.t("games:ouroboros.explore") } },
      pick,
      zoneTarget("buttons"),
    ),
    i18n.t(`games:ouroboros.hint.${note}`),
  );
}

/** Each Mark Path button's own name, so a hint can press the right one. */
function markPathLabel(slot: number) {
  return i18n.t("games:ouroboros.markPathNumber", { number: slot + 1 });
}

export const ouroborosRules = {
  findHint: findOuroborosHint,
  bestLoopLine,
  applyLoopAction,
  isBadStartCard,
  hasViableSecondTurn,
  hasSafeLoopStart,
  getLoopDeck,
  maxMarkedPaths,
};

const gameStateInitial: GameState = {
  deck: [],
  dealDeck: getLoopDeck(),
  deckPos: 0,
  paths: [null, null, null],
  acesPile: [],
  trinketsPile: [],
  ended: false,
  won: false,
  numLoops: 0,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  // Gather all cards to dealDeck
  setGame((draft) => {
    const allCards = [
      ...draft.deck,
      ...draft.dealDeck,
      ...draft.acesPile,
      ...draft.trinketsPile,
      ...draft.paths.filter((p) => p !== null).map((p) => p as LoopCard),
    ];

    draft.deck = [];
    draft.dealDeck = flipAllToBack(allCards);
    draft.acesPile = [];
    draft.trinketsPile = [];
    draft.paths = [null, null, null];
    draft.deckPos = 0;
    draft.ended = false;
    draft.won = false;
    draft.winLoseMessage = "";
    draft.numLoops = 0;
  });

  await delay(bufferedDefaultAnimDuration * 1.5);

  // Deal new cards from dealDeck to deck
  setGame((draft) => {
    draft.deck = getLoopDeck(draft.dealDeck);
    draft.dealDeck = [];
  });
}

export default function Ouroboros() {
  const { scale: responsiveScale } = useResponsiveMetrics();
  const scaleByLayout = (value: number) => value * responsiveScale;

  const [selectedCardIndex, setSelectedCardIndex] = useState<
    number | undefined
  >(undefined);
  const [selectedPath, setSelectedPath] = useState<Note | undefined>(undefined);
  const [selectedRevealedRank, setSelectedRevealedRank] = useState<
    number | undefined
  >(undefined);

  const orbitingLoopAnimation: AnimatedCardMapping = {
    orbitConfig: { enabled: true },
  };

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedCardIndex(undefined);
        setSelectedPath(undefined);
        setSelectedRevealedRank(undefined);
      },
    });

  useEffect(() => {
    const selectedCard =
      selectedCardIndex !== undefined
        ? game.deck[selectedCardIndex]
        : undefined;

    const selectedRevealedIsNumber = !!(
      selectedCard !== undefined &&
      selectedCard.faceUp &&
      isNumberRank(selectedCard.rank)
    );

    setSelectedRevealedRank(
      selectedRevealedIsNumber ? RANK_VALUE[selectedCard!.rank] : undefined,
    );
  }, [selectedCardIndex, game.deck]);

  useHint(
    () => findOuroborosHint(game, selectedCardIndex, selectedPath?.index),
    { game },
  );

  // Look around
  function lookAround() {
    if (game.deck.length === 0) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      if (draft.deck.length === 0) return;

      // Turn two cards up in current and next position
      const index0 = draft.deckPos;
      const index1 = (draft.deckPos + 1) % draft.deck.length;

      draft.deck[index0] = { ...draft.deck[index0], faceUp: true };
      draft.deck[index1] = { ...draft.deck[index1], faceUp: true };
    });

    setSelectedCardIndex(game.deckPos);
  }

  // Mark path
  async function markPath(selectedCardId: string, noteIndex: number) {
    const pathToMark = game.deck.find((card) => card.id === selectedCardId);
    if (
      !pathToMark ||
      game.paths.filter((p) => p !== null).length >= maxMarkedPaths ||
      game.paths[noteIndex] !== null ||
      !pathToMark.faceUp ||
      !isNumberRank(pathToMark.rank)
    ) {
      return;
    }

    saveUndoState(structuredClone(game));

    setSelectedCardIndex(undefined);

    setGame((draft) => {
      const indexToMark = draft.deck.findIndex(
        (card) => card.id === selectedCardId,
      );
      if (indexToMark < 0) return;

      const draftPathToMark = draft.deck[indexToMark];
      if (
        !draftPathToMark ||
        !draftPathToMark.faceUp ||
        !isNumberRank(draftPathToMark.rank)
      ) {
        return;
      }

      const notes: MarkedPaths = [...draft.paths];
      notes[noteIndex] = draftPathToMark;

      draft.paths = notes;
      draft.deck.splice(indexToMark, 1);

      // If we removed a card before the current deck position, shift deckPos.
      if (indexToMark < draft.deckPos) {
        draft.deckPos -= 1;
      }

      // Keep deckPos in bounds after mutation.
      if (draft.deck.length > 0) {
        draft.deckPos = Math.min(draft.deckPos, draft.deck.length - 1);
      } else {
        draft.deckPos = 0;
      }
    });
  }

  // Explore
  function explore(selectedCardIndex: number) {
    const selectedCard = game.deck[selectedCardIndex];

    // Can't explore
    if (
      !selectedCard ||
      !selectedCard.faceUp ||
      !isNumberRank(selectedCard.rank)
    ) {
      return;
    }

    saveUndoState(structuredClone(game));

    setSelectedCardIndex(undefined);

    setGame((draft) => {
      const selectedDraftCard = draft.deck[selectedCardIndex];
      if (!selectedDraftCard || !selectedDraftCard.faceUp) return;
      if (!isNumberRank(selectedDraftCard.rank)) return;

      const movedBy = rankValue(selectedDraftCard, 1, 0);
      const deckPos = (draft.deckPos + movedBy) % draft.deck.length;
      const numLoops = draft.numLoops + (deckPos < draft.deckPos ? 1 : 0);

      draft.deckPos = deckPos;
      draft.numLoops = numLoops;

      const newTopCard = draft.deck[deckPos];

      if (newTopCard.faceUp && isFace(newTopCard)) {
        // Lose condition: landed directly on face card
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = i18n.t("games:ouroboros.landedOnTrap");
        return;
      } else if (newTopCard.faceUp && isJoker(newTopCard)) {
        // Win condition: found all aces and landed on joker (exit)
        if (draft.acesPile.length === 4) {
          draft.ended = true;
          draft.won = true;
          draft.winLoseMessage = i18n.t("games:ouroboros.gotAllJewels");
          return;
        } else {
          // Landed on joker without all aces does nothing
          return;
        }
      } else if (
        newTopCard.faceUp &&
        (isAce(newTopCard) || isNumberRank(newTopCard.rank))
      ) {
        // Remove top card from deck and move it to the scorePile
        if (newTopCard.rank === "A") {
          draft.deck.splice(deckPos, 1);
          draft.acesPile.push(newTopCard);
        } else {
          draft.deck.splice(deckPos, 1);
          draft.trinketsPile.push(newTopCard);
        }
        // The last card of the loop gone: the next is the first.
        if (draft.deckPos >= draft.deck.length) draft.deckPos = 0;

        return;
      }
    });
  }

  function returnToSelectedMarkedPath() {
    if (selectedPath !== undefined && selectedPath.card) {
      const insertAt = game.deckPos;

      setSelectedPath(undefined);

      saveUndoState(structuredClone(game));

      setSelectedCardIndex(undefined);

      setGame((draft) => {
        // Remove cards from notes
        const notes: MarkedPaths = [...draft.paths];
        notes[selectedPath.index] = null;

        // Insert path card in deck
        const deck = [...draft.deck];
        deck.splice(draft.deckPos, 0, selectedPath.card);

        draft.deck = deck;
        draft.paths = notes;
      });

      // Select the newly inserted card after state update.
      setSelectedCardIndex(insertAt);
    }
  }

  // Need to check for stuck lose conditions whenever game state updates
  useEffect(() => {
    // Lose condition: no marked paths, and first two cards are not number cards
    if (game.deck.length === 0) return;

    const firstCard = game.deck[game.deckPos];
    const secondCard = game.deck[(game.deckPos + 1) % game.deck.length];

    if (
      game.paths.filter((p) => p !== null).length === 0 &&
      firstCard.faceUp &&
      !isNumberRank(firstCard.rank) &&
      !isNumberRank(secondCard.rank)
    ) {
      setGame((draft) => {
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage =
          draft.acesPile.length + draft.trinketsPile.length > 0
            ? i18n.t("games:ouroboros.lostWithLoot")
            : i18n.t("games:ouroboros.lostInDungeon");
      });
    }
  }, [game]);

  const canMarkPath = useMemo(() => {
    const selectedCard =
      selectedCardIndex !== undefined
        ? game.deck[selectedCardIndex]
        : undefined;

    return (
      selectedCard !== undefined &&
      isNumberRank(selectedCard.rank) &&
      selectedCard.faceUp &&
      game.paths.filter((p) => p !== null).length < maxMarkedPaths
    );
  }, [selectedCardIndex, game.paths, game.deck]);

  const { isRendered: renderMarkPathButtons, opacity: markPathOpacity } =
    useFade(canMarkPath, 200);

  // ========== Card Mapping ========== //
  const positioning = {
    horizontalPadding: 0,
    colWidth: 8,
    rad: 3.6,
    translateOnSelect: 0.2,
    firstCardAngleIncrease: 10,
    secondCardAngleIncrease: 2,
    gapAngle: 45,
    loopOffset: 75,
  };

  const zones: MapZone[] = useMemo(() => {
    const deckLength = game.deck.length;
    const eachCardAngle =
      deckLength > 0 ? (360 - positioning.gapAngle) / deckLength : 0;

    // ---------- Loop Cards ---------- //
    const loopZones: MapZone[] = game.deck.map((_pos, i) => {
      // Style
      const isSelected = selectedCardIndex === i;

      const isExploreTarget = !!(
        deckLength > 0 &&
        selectedRevealedRank !== undefined &&
        selectedCardIndex !== undefined &&
        i === (game.deckPos + selectedRevealedRank) % deckLength
      );

      let rad = positioning.rad;

      if (isSelected || isExploreTarget) {
        rad -= positioning.translateOnSelect;
      }

      let baseZIndex = 100 - i;
      let angle = (i - game.deckPos) * eachCardAngle + positioning.loopOffset;

      if (i < game.deckPos) {
        angle -= positioning.gapAngle;
        baseZIndex -= deckLength + i;
      }

      const nextDeckPos = (game.deckPos + 1) % deckLength;

      if (i === game.deckPos) {
        angle -= positioning.firstCardAngleIncrease;
      } else if (i === nextDeckPos) {
        angle -= positioning.secondCardAngleIncrease;
      }

      const rotation = angle - 90;
      const angleRadians = angle * (Math.PI / 180);

      const col = rad * Math.cos(angleRadians) + positioning.colWidth / 2 - 0.5;
      const row =
        rad * Math.sin(angleRadians) * cardDims.aspectRatio + rad / 2 + 0.25;

      return {
        id: `loop-${i}`,
        pileIndex: i,
        cards: game.deck[i] ? [game.deck[i]] : undefined,
        name: "loop",
        col,
        row,
        baseZIndex,
        rotation,
      };
    });

    // ---------- Paths ---------- //
    const dims = {
      colOffset: 1.25,
      colStart: 2.25,
      acesRow: 1.3,
    };

    const pathZones: MapZone[] = Array.from({ length: 3 }, (_, i) => {
      const path = game.paths[i];

      return {
        id: `path-${i}`,
        pileIndex: i,
        cards: path === null ? undefined : [path],
        name: "path",
        col: i * dims.colOffset + dims.colStart,
        row: dims.acesRow + dims.colOffset,
        baseZIndex: 2,
        placeholder: {},
      };
    });

    return [
      ...loopZones,
      ...pathZones,
      {
        id: "aces",
        name: "aces",
        col: dims.colStart + infoSize.leftRight,
        row: dims.acesRow,
        cards: game.acesPile,
        placeholder: {
          infoPos: "left",
          text: i18n.t("games:ouroboros.jewels"),
        },
        fan: {},
      },
      {
        id: "trinkets",
        name: "trinkets",
        col: 2 * dims.colOffset + dims.colStart - infoSize.leftRight,
        row: dims.acesRow,
        cards: game.trinketsPile,
        placeholder: {
          infoPos: "right",
          text: i18n.t("games:ouroboros.trinkets"),
        },
        fan: { maxVisible: 3 },
      },
      {
        id: "dealDeck",
        name: "dealDeck",
        col: dims.colOffset + dims.colStart,
        row: dims.acesRow + 1,
        cards: game.dealDeck,
      },
      {
        id: "buttons",
        col: 0.4,
        row: 6.2,
        height: 0.8,
        width: positioning.colWidth - 0.8,
      },
    ];
  }, [game, selectedCardIndex, selectedPath, selectedRevealedRank]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "loop") {
      // ---------- Loop cards ---------- //
      const index = mappedCard.pileIndex;
      const card = mappedCard.card;

      if (index === undefined || card === undefined)
        return orbitingLoopAnimation;

      const deckLength = game.deck.length;
      if (deckLength === 0) return orbitingLoopAnimation;

      const nextDeckPos = (game.deckPos + 1) % deckLength;
      const isSelected = selectedCardIndex === index;
      const isLookAround = index === game.deckPos && !card.faceUp;
      const isExploreTarget = !!(
        deckLength > 0 &&
        selectedRevealedRank !== undefined &&
        selectedCardIndex !== undefined &&
        index === (game.deckPos + selectedRevealedRank) % deckLength
      );
      const isPotentialPathTarget = !!(
        deckLength > 0 &&
        selectedPath?.card !== undefined &&
        selectedPath?.card !== null &&
        selectedPath?.index !== undefined &&
        index === (rankValue(selectedPath.card) + game.deckPos - 1) % deckLength
      );

      const selectedColor = () => {
        if (isLookAround) {
          return "blue";
        } else if (index === selectedCardIndex) {
          return isNumberRank(card.rank) ? "blue" : "red";
        } else if (isExploreTarget) {
          return "purple";
        } else if (isPotentialPathTarget) {
          return "green";
        }
        return "blue";
      };

      return {
        ...orbitingLoopAnimation,
        onPress: () => {
          // Ignore cards that are not the first two
          if (index !== game.deckPos && index !== nextDeckPos) {
            return undefined;
          }

          if (!card.faceUp) {
            if (index === game.deckPos) {
              return lookAround;
            }
            return undefined;
          }

          // Unselect path
          if (selectedPath !== undefined) {
            setSelectedPath(undefined);
          }

          setSelectedCardIndex(selectedCardIndex === index ? undefined : index);
        },
        isSelected,
        selectColor: selectedColor(),
        forceSelectColor: isExploreTarget || isPotentialPathTarget,
        forceOverlayColor:
          isExploreTarget || isPotentialPathTarget || isLookAround,
      };
    } else if (mappedCard.zoneName === "path") {
      // ---------- Marked paths ---------- //
      const index = mappedCard.pileIndex;

      if (index === undefined) return {};

      const noteCard = game.paths[index];
      const isSelected = selectedPath?.index === index;

      return {
        selectColor: "green",
        isSelected,
        onPress: () => {
          if (!noteCard) {
            setSelectedPath(undefined);
            return;
          }

          setSelectedCardIndex(undefined);
          setSelectedPath(
            selectedPath?.index === index
              ? undefined
              : { card: noteCard as PlayingCard, index },
          );
        },
      };
    }
  };

  const { cardMap, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: 0,
    cardMapper,
    cardSize: "small",
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0.6,
    fixedCols: positioning.colWidth,
  });

  const selectedDeckCard =
    selectedCardIndex !== undefined ? game.deck[selectedCardIndex] : undefined;

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={game.acesPile.length + game.trinketsPile.length}
      winLoseMessage={game.winLoseMessage}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {renderMarkPathButtons &&
        [0, 1, 2].map((pathIndex) => (
          <Animated.View
            key={`mark-path-${pathIndex}`}
            style={[
              getZoneStylesById(`path-${pathIndex}`),
              {
                opacity: markPathOpacity,
                zIndex: game.paths[pathIndex] ? 0 : 20,
              },
            ]}
          >
            <Button
              accessibilityLabel={markPathLabel(pathIndex)}
              iconName="map"
              iconSize={cardWidth * 0.6}
              textOnly
              onPress={() => {
                if (selectedCardIndex !== undefined) {
                  const selectedCard = game.deck[selectedCardIndex];
                  if (selectedCard) {
                    markPath(selectedCard.id, pathIndex);
                  }
                }
              }}
              disabled={selectedCardIndex === undefined}
              style={[flexStyles.fullWidth, flexStyles.fullHeight]}
              theme={"green"}
            />
          </Animated.View>
        ))}

      {/* ----- Buttons ----- */}
      <View
        style={[
          flexStyles.rowCentered,
          getZoneStylesById("buttons"),
          {
            gap: cardWidth * scaleByLayout(0.25),
          },
        ]}
      >
        <Button
          text={i18n.t("games:ouroboros.explore")}
          onPress={() => {
            if (selectedCardIndex !== undefined) {
              explore(selectedCardIndex);
            }
          }}
          disabled={
            selectedDeckCard === undefined ||
            !isNumberRank(selectedDeckCard.rank) ||
            !selectedDeckCard.faceUp
          }
          style={[flexStyles.flex1]}
          theme={"purple"}
          taller
        />

        <Button
          text={i18n.t("games:ouroboros.returnToPath")}
          onPress={returnToSelectedMarkedPath}
          disabled={selectedPath === undefined}
          style={[flexStyles.flex1]}
          theme={"green"}
          taller
          lineHeight={1.1}
        />

        <Button
          text={i18n.t("games:ouroboros.lookAround")}
          onPress={lookAround}
          disabled={
            game.ended ||
            game.deck.length === 0 ||
            game.deck[game.deckPos].faceUp
          }
          style={[flexStyles.flex1]}
          theme={"blue"}
          taller
          lineHeight={1.1}
        />
      </View>
    </GameWrapper>
  );
}
