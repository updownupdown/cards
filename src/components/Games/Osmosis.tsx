import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const reserveCount = 4;
const reserveSize = 4;

type GameState = {
  reserves: PlayingCard[][];
  foundations: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  reserves: Array.from({ length: reserveCount }, () => []),
  foundations: Array.from({ length: 4 }, () => []),
  stock: [],
  waste: [],
  ended: false,
  won: false,
};

/** Which foundation row (if any) a card may join right now; -1 if none. */
function foundationTarget(state: GameState, card: PlayingCard): number {
  const base = state.foundations[0][0];
  if (!base) return -1;

  const suitRow = state.foundations.findIndex(
    (row) => row.length > 0 && row[0].suit === card.suit,
  );

  if (suitRow !== -1) {
    if (suitRow === 0) return 0; // first row: any card of its suit
    const above = state.foundations[suitRow - 1];
    return above.some((c) => c.rank === card.rank) ? suitRow : -1;
  }

  // Starting a fresh row: must match the key rank.
  if (card.rank === base.rank) {
    const empty = state.foundations.findIndex(
      (row, i) => i > 0 && row.length === 0,
    );
    if (empty !== -1) return empty;
  }
  return -1;
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const deck = shuffle(createDeck());

    const reserves: PlayingCard[][] = [];
    for (let i = 0; i < reserveCount; i += 1) {
      reserves.push(deck.splice(0, reserveSize).map(flipToFace));
    }

    const seed = deck.shift();
    const foundations: PlayingCard[][] = Array.from({ length: 4 }, () => []);
    if (seed) foundations[0] = [flipToFace(seed)];

    draft.reserves = reserves;
    draft.foundations = foundations;
    draft.stock = deck.map(flipToBack);
    draft.waste = [];
    draft.ended = false;
    draft.won = false;
  });

  await delay();
}

function evaluateEnd(state: GameState) {
  const placed = state.foundations.reduce((sum, row) => sum + row.length, 0);
  if (placed === 52) return { ended: true, won: true };

  if (state.stock.length > 0) return { ended: false, won: false };

  const reservePlayable = state.reserves.some((r) => {
    const card = top(r);
    return card ? foundationTarget(state, card) !== -1 : false;
  });
  const wastePlayable = state.waste.some(
    (card) => foundationTarget(state, card) !== -1,
  );

  if (!reservePlayable && !wastePlayable) return { ended: true, won: false };
  return { ended: false, won: false };
}

// ========== Main Component ========== //
export default function Osmosis() {
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
    });

  useEffect(() => {
    const { ended, won } = evaluateEnd(game);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [game]);

  function playFromReserve(index: number) {
    if (game.ended) return;
    const card = top(game.reserves[index]);
    if (!card) return;
    const target = foundationTarget(game, card);
    if (target === -1) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.reserves[index].pop();
      if (moved) draft.foundations[target].push(moved);
    });
  }

  function playFromWaste() {
    if (game.ended) return;
    const card = top(game.waste);
    if (!card) return;
    const target = foundationTarget(game, card);
    if (target === -1) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.waste.pop();
      if (moved) draft.foundations[target].push(moved);
    });
  }

  function onStockPress() {
    if (game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (draft.stock.length > 0) {
        const card = draft.stock.pop();
        if (card) draft.waste.push(flipToFace(card));
      } else if (draft.waste.length > 0) {
        draft.stock = draft.waste.reverse().map(flipToBack);
        draft.waste = [];
      }
    });
  }

  const wasteTop = top(game.waste);
  const wastePlayable = !!wasteTop && foundationTarget(game, wasteTop) !== -1;

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const reserveZones: MapZone[] = game.reserves.map((pile, i) => ({
      id: `reserve-${i}`,
      name: "reserve",
      pileIndex: i,
      cards: pile,
      col: 0,
      row: i * 1.15,
      baseZIndex: 10,
      fan: { direction: "right", offset: 0.28, maxVisible: reserveSize },
      placeholder: { text: i === 0 ? "Reserves" : undefined, infoPos: "below" },
    }));

    const foundationZones: MapZone[] = game.foundations.map((row, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: row,
      col: 2.5,
      row: i * 1.15,
      baseZIndex: 20,
      fan: { direction: "right", offset: 0.26, maxVisible: 5 },
      placeholder: {},
    }));

    return [
      ...reserveZones,
      ...foundationZones,
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: 4.7,
        fan: { maxVisible: 3 },
        baseZIndex: 60,
        placeholder: { text: "Stock", infoPos: "right", showCount: true },
      },
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: 1.3,
        row: 4.7,
        fan: { maxVisible: 3 },
        baseZIndex: 60,
        placeholder: { text: "Waste", infoPos: "left" },
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (!mappedCard.topOfZone) return {};

    if (
      mappedCard.zoneName === "reserve" &&
      mappedCard.pileIndex !== undefined
    ) {
      const index = mappedCard.pileIndex;
      const playable = foundationTarget(game, mappedCard.card) !== -1;
      return {
        isDisabled: game.ended,
        selectColor: playable ? "green" : "none",
        onPress: () => playFromReserve(index),
      };
    }

    if (mappedCard.zoneName === "waste") {
      return {
        isDisabled: game.ended,
        selectColor: wastePlayable ? "green" : "none",
        onPress: playFromWaste,
      };
    }

    if (mappedCard.zoneName === "stock") {
      return {
        isDisabled: game.ended,
        onPress: onStockPress,
      };
    }

    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      // Allow redeal when the stock has emptied.
      return {
        onPress: onStockPress,
        isDisabled: game.ended || game.waste.length === 0,
      };
    }
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    gap: 0.14,
    cardSize: "small",
  });

  const placed = game.foundations.reduce((sum, row) => sum + row.length, 0);

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      score={placed}
      winLoseMessage={
        game.won ? "Every suit soaked through!" : "Nothing left to play."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
