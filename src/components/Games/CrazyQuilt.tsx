import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  SUITS,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
const quiltSize = 8;
const quiltCells = quiltSize * quiltSize;
const gap = 0;
// Each quilt cell is a square a little larger than a card's long side, so
// upright and sideways cards interlock without touching.
const cellSize = 0.92;
const pitchCol = cellSize / cardDims.aspectRatio / (1 + gap);
const pitchRow = cellSize / (1 + gap * cardDims.aspectRatio);
const halfCardCols = 0.5 / (1 + gap);
const halfCardRows = 0.5 / (1 + gap * cardDims.aspectRatio);
const quiltRow = 1.4;
const quiltWidth = quiltSize * pitchCol;
const foundationGap = 1.8;
const foundationSpacing = (quiltWidth - 1 - foundationGap) / 6;
// Bottom row for the stock and waste, leaving room for their labels above.
const stockRow = quiltRow + quiltSize * pitchRow + 0.5;
const redeals = 1;

type GameState = {
  quilt: (PlayingCard | null)[];
  stock: PlayingCard[];
  waste: PlayingCard[];
  /** 0-3 build up from the Aces by suit; 4-7 down from the Kings. */
  foundations: PlayingCard[][];
  redealsUsed: number;
  ended: boolean;
  won: boolean;
};

export type CrazyQuiltGameState = GameState;

const gameStateInitial: GameState = {
  quilt: Array(quiltCells).fill(null),
  stock: shuffle(createDeck({ deckCount: 2 })).map(flipToBack),
  waste: [],
  foundations: Array.from({ length: 8 }, () => []),
  redealsUsed: 0,
  ended: false,
  won: false,
};

/** Upright and sideways cards alternate like a chessboard. */
function isUpright(index: number) {
  return (Math.floor(index / quiltSize) + (index % quiltSize)) % 2 === 0;
}

/** A quilt card is free when either of its short ends is uncovered. */
function isAvailable(quilt: (PlayingCard | null)[], index: number) {
  if (!quilt[index]) return false;
  const row = Math.floor(index / quiltSize);
  const col = index % quiltSize;
  const open = (r: number, c: number) =>
    r < 0 ||
    c < 0 ||
    r >= quiltSize ||
    c >= quiltSize ||
    !quilt[r * quiltSize + c];
  return isUpright(index)
    ? open(row - 1, col) || open(row + 1, col)
    : open(row, col - 1) || open(row, col + 1);
}

function foundationFor(state: GameState, card: PlayingCard) {
  return state.foundations.findIndex((pile, index) => {
    const pileTop = top(pile);
    return (
      !!pileTop &&
      pileTop.suit === card.suit &&
      rankValue(card) === rankValue(pileTop) + (index < 4 ? 1 : -1)
    );
  });
}

/** Quilt cards pack onto the waste up or down in suit. */
function canBuildWaste(card: PlayingCard, waste: PlayingCard[]) {
  const wasteTop = top(waste);
  return (
    !!wasteTop &&
    wasteTop.suit === card.suit &&
    Math.abs(rankValue(card) - rankValue(wasteTop)) === 1
  );
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  const playing = { ended: false, won: false };
  if (isSettingUp) return playing;

  const placed = state.foundations.reduce((sum, pile) => sum + pile.length, 0);
  if (placed === 104) return { ended: true, won: true };
  if (state.stock.length > 0) return playing;
  if (state.redealsUsed < redeals && state.waste.length > 0) return playing;

  const wasteTop = top(state.waste);
  if (wasteTop && foundationFor(state, wasteTop) >= 0) return playing;
  const quiltMove = state.quilt.some(
    (card, index) =>
      !!card &&
      isAvailable(state.quilt, index) &&
      (foundationFor(state, card) >= 0 || canBuildWaste(card, state.waste)),
  );
  return quiltMove ? playing : { ended: true, won: false };
}

/**
 * Cards home first, the waste's then the quilt's. A quilt card packs onto
 * the waste only when that frees a quilt card that can go home; otherwise
 * draw, or turn the waste over.
 */
function findCrazyQuiltHint(state: GameState) {
  const wasteTop = top(state.waste);
  const home = (card: PlayingCard) =>
    makeHint(
      "toFoundation",
      cardTarget(card),
      zoneTarget(`foundation-${foundationFor(state, card)}`),
    );
  if (wasteTop && foundationFor(state, wasteTop) >= 0) return home(wasteTop);
  const free = state.quilt.flatMap((card, index) =>
    card && isAvailable(state.quilt, index) ? [index] : [],
  );
  for (const index of free) {
    const card = state.quilt[index]!;
    if (foundationFor(state, card) >= 0) return home(card);
  }
  for (const index of free) {
    const card = state.quilt[index]!;
    if (!canBuildWaste(card, state.waste)) continue;
    const quilt = state.quilt.map((cell, at) => (at === index ? null : cell));
    const freesHome = quilt.some(
      (cell, at) =>
        cell &&
        !free.includes(at) &&
        isAvailable(quilt, at) &&
        foundationFor(state, cell) >= 0,
    );
    if (freesHome) {
      return makeHint("toWaste", cardTarget(card), zoneTarget("waste"));
    }
  }
  if (state.stock.length > 0) return makeHint("draw", zoneTarget("stock"));
  return state.redealsUsed < redeals && state.waste.length > 0
    ? makeHint("redeal", zoneTarget("stock"))
    : null;
}

export const crazyQuiltRules = {
  findHint: findCrazyQuiltHint,
  isUpright,
  isAvailable,
  canBuildWaste,
  evaluateEnd,
};

export default function CrazyQuilt() {
  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
  } = useStateManager({
    gameStateInitial,
    resetAndSetup: async () => {
      setGame((draft) => {
        const cards = [
          ...draft.quilt.filter((card): card is PlayingCard => !!card),
          ...draft.stock,
          ...draft.waste,
          ...draft.foundations.flat(),
        ];
        draft.stock = shuffle(cards).map(flipToBack);
        draft.quilt = Array(quiltCells).fill(null);
        draft.waste = [];
        draft.foundations = Array.from({ length: 8 }, () => []);
        draft.redealsUsed = 0;
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        const deck = [...draft.stock];
        const take = (rank: "A" | "K", suit: PlayingCard["suit"]) =>
          flipToFace(
            deck.splice(
              deck.findIndex(
                (card) => card.rank === rank && card.suit === suit,
              ),
              1,
            )[0],
          );
        SUITS.forEach((suit, index) => {
          draft.foundations[index] = [take("A", suit)];
          draft.foundations[4 + index] = [take("K", suit)];
        });
        draft.quilt = deck.splice(deck.length - quiltCells).map(flipToFace);
        draft.stock = deck;
      });
    },
  });

  useEffect(() => {
    const { ended, won } = evaluateEnd(game, isSettingUp);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [game, isSettingUp, setGame]);

  useHint(() => findCrazyQuiltHint(game), {
    game,
    enabled: !isSettingUp && !game.ended,
  });

  /** A free quilt card goes to a foundation if it can, else onto the waste. */
  function playQuilt(index: number) {
    const card = game.quilt[index];
    if (game.ended || !card || !isAvailable(game.quilt, index)) return;
    const target = foundationFor(game, card);
    if (target < 0 && !canBuildWaste(card, game.waste)) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.quilt[index];
      if (!moved) return;
      draft.quilt[index] = null;
      if (target >= 0) draft.foundations[target].push(moved);
      else draft.waste.push(moved);
    });
  }

  function playWaste() {
    const card = top(game.waste);
    if (game.ended || !card) return;
    const target = foundationFor(game, card);
    if (target < 0) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.waste.pop();
      if (moved) draft.foundations[target].push(moved);
    });
  }

  const canRedeal =
    game.stock.length === 0 &&
    game.redealsUsed < redeals &&
    game.waste.length > 0;

  function onStockPress() {
    if (game.ended || (game.stock.length === 0 && !canRedeal)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (draft.stock.length > 0) {
        const card = draft.stock.pop();
        if (card) draft.waste.push(flipToFace(card));
      } else {
        // Turned over without shuffling.
        draft.stock = draft.waste.reverse().map(flipToBack);
        draft.waste = [];
        draft.redealsUsed += 1;
      }
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col:
        i < 4
          ? i * foundationSpacing
          : 3 * foundationSpacing + foundationGap + (i - 4) * foundationSpacing,
      row: 0,
      fan: { maxVisible: 3 },
      placeholder: { iconName: i < 4 ? "ace" : "king" },
    }));

    const quiltZones: MapZone[] = game.quilt.map((card, i) => ({
      id: `quilt-${i}`,
      name: "quilt",
      pileIndex: i,
      cards: card ? [card] : [],
      col: (i % quiltSize) * pitchCol + pitchCol / 2 - halfCardCols,
      row:
        quiltRow +
        Math.floor(i / quiltSize) * pitchRow +
        pitchRow / 2 -
        halfCardRows,
      rotation: isUpright(i) ? 0 : 90,
      baseZIndex: 10,
    }));

    return [
      ...foundationZones,
      ...quiltZones,
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: quiltWidth - 3,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:waste"),
          infoPos: "left",
          showCount: true,
        },
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: quiltWidth - 1.25,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "left",
          showCount: true,
        },
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "quilt" && mappedCard.pileIndex !== undefined) {
      const index = mappedCard.pileIndex;
      return {
        isDisabled: game.ended || !isAvailable(game.quilt, index),
        onPress: () => playQuilt(index),
      };
    }
    if (!mappedCard.topOfZone) return {};
    if (mappedCard.zoneName === "waste") {
      return { isDisabled: game.ended, onPress: playWaste };
    }
    if (mappedCard.zoneName === "stock") {
      return { isDisabled: game.ended, onPress: onStockPress };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return { onPress: onStockPress, isDisabled: game.ended || !canRedeal };
    }
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedRows: stockRow + 1,
    gap,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:crazyQuilt.theQuiltIsUnstitched")
          : i18n.t("cards:noMovesRemain")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
