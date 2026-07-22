import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToFace,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const columnCount = 8;
const columnHeight = 6;

type Selection = { zone: "col" | "reserve"; index: number } | undefined;

type GameState = {
  columns: PlayingCard[][];
  reserve: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  columns: Array.from({ length: columnCount }, () => []),
  reserve: [],
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const deck = shuffle(createDeck({ faceUp: true }));
    const columns: PlayingCard[][] = Array.from(
      { length: columnCount },
      () => [],
    );

    // Deal columns, avoiding two cards of the same rank in one column.
    for (let c = 0; c < columnCount; c += 1) {
      const ranksInColumn = new Set<string>();
      for (let n = 0; n < columnHeight; n += 1) {
        let index = deck.findIndex((card) => !ranksInColumn.has(card.rank));
        if (index === -1) index = 0; // fallback if a distinct rank isn't left
        const [card] = deck.splice(index, 1);
        columns[c].push(flipToFace(card));
        ranksInColumn.add(card.rank);
      }
    }

    draft.columns = columns;
    draft.reserve = deck.map(flipToFace);
    draft.ended = false;
    draft.won = false;
  });

  await delay();
}

function exposedCard(state: GameState, sel: Selection) {
  if (!sel) return undefined;
  return sel.zone === "reserve"
    ? top(state.reserve)
    : top(state.columns[sel.index]);
}

function evaluateEnd(state: GameState) {
  const cardsLeft =
    state.columns.reduce((sum, col) => sum + col.length, 0) +
    state.reserve.length;
  if (cardsLeft === 0) return { ended: true, won: true };

  const exposed: PlayingCard[] = [];
  state.columns.forEach((col) => {
    const card = top(col);
    if (card) exposed.push(card);
  });
  const reserveTop = top(state.reserve);
  if (reserveTop) exposed.push(reserveTop);

  const rankCounts = new Map<string, number>();
  for (const card of exposed) {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) ?? 0) + 1);
  }
  const anyPair = [...rankCounts.values()].some((count) => count >= 2);
  if (!anyPair) return { ended: true, won: false };
  return { ended: false, won: false };
}

// ========== Main Component ========== //
export default function Nestor() {
  const [selected, setSelected] = useState<Selection>(undefined);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
      resetNonGameStates: () => setSelected(undefined),
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

  function sameSelection(a: Selection, b: Selection) {
    return !!a && !!b && a.zone === b.zone && a.index === b.index;
  }

  function removePair(
    a: Exclude<Selection, undefined>,
    b: Exclude<Selection, undefined>,
  ) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const pop = (sel: Exclude<Selection, undefined>) => {
        if (sel.zone === "reserve") draft.reserve.pop();
        else draft.columns[sel.index].pop();
      };
      pop(a);
      pop(b);
    });
    setSelected(undefined);
  }

  function onCardPress(sel: Exclude<Selection, undefined>) {
    if (game.ended) return;

    if (!selected) {
      setSelected(sel);
      return;
    }

    if (sameSelection(selected, sel)) {
      setSelected(undefined);
      return;
    }

    const firstCard = exposedCard(game, selected);
    const secondCard = exposedCard(game, sel);
    if (firstCard && secondCard && firstCard.rank === secondCard.rank) {
      removePair(selected, sel);
    } else {
      setSelected(sel);
    }
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const columnZones: MapZone[] = game.columns.map((pile, i) => ({
      id: `col-${i}`,
      name: "col",
      pileIndex: i,
      cards: pile,
      col: i,
      row: 1.2,
      baseZIndex: 10 + i,
      fan: {
        direction: "down",
        offset: cardDims.tableauOffset,
        center: false,
        showCount: false,
      },
      placeholder: {},
    }));

    return [
      {
        id: "reserve",
        name: "reserve",
        cards: game.reserve,
        col: 5.4,
        row: 0,
        fan: { direction: "right", offset: 0.4, maxVisible: 4 },
        baseZIndex: 60,
        placeholder: { text: "Reserve", infoPos: "left" },
      },
      ...columnZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (!mappedCard.topOfZone) return {};

    let sel: Selection;
    if (mappedCard.zoneName === "col" && mappedCard.pileIndex !== undefined) {
      sel = { zone: "col", index: mappedCard.pileIndex };
    } else if (mappedCard.zoneName === "reserve") {
      sel = { zone: "reserve", index: 0 };
    } else {
      return {};
    }

    const isSelected = sameSelection(selected, sel);
    return {
      isSelected,
      selectColor: "blue",
      isDisabled: game.ended,
      onPress: () => onCardPress(sel!),
    };
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "tableau",
    fixedRows: 4,
    gap: 0.12,
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.won ? "Board cleared!" : "No matching pair remains."}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
