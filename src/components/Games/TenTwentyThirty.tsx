import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { i18n } from "@/i18n";

const lineCols = 7;
const startCards = 3;
// Rows of height reserved for the line; further rows overlap to fit.
const lineRows = 5;
const shiftDelay = 20;
// Bottom row for the stock and discards, leaving room for their labels above.
const stockRow = lineRows + 0.55;
const decades = [10, 20, 30];

type GameState = {
  stock: PlayingCard[];
  /** The line reads left to right, wrapping every `lineCols` cards. */
  line: PlayingCard[];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

export type TenTwentyThirtyGameState = GameState;

const gameStateInitial: GameState = {
  stock: shuffle(createDeck()).map(flipToBack),
  line: [],
  discard: [],
  ended: false,
  won: false,
};

/** Face cards count ten. */
function points(card: PlayingCard) {
  return Math.min(rankValue(card), 10);
}

function total(cards: PlayingCard[]) {
  return cards.reduce((sum, card) => sum + points(card), 0);
}

function isDecade(cards: PlayingCard[]) {
  return cards.length >= 2 && decades.includes(total(cards));
}

function hasDecade(line: PlayingCard[]) {
  for (let start = 0; start < line.length; start += 1) {
    let sum = points(line[start]);
    for (let end = start + 1; end < line.length && sum < 30; end += 1) {
      sum += points(line[end]);
      if (decades.includes(sum)) return true;
    }
  }
  return false;
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  const playing = { ended: false, won: false };
  if (isSettingUp) return playing;
  if (state.line.length === 0 && state.stock.length === 0)
    return { ended: true, won: true };
  if (state.stock.length > 0 || hasDecade(state.line)) return playing;
  return { ended: true, won: false };
}

export const tenTwentyThirtyRules = {
  points,
  isDecade,
  hasDecade,
  evaluateEnd,
};

export default function TenTwentyThirty() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Line slots while cards slide left one at a time after a discard.
  const [slots, setSlots] = useState<(PlayingCard | null)[] | null>(null);
  const shiftRun = useRef(0);
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
    resetNonGameStates: () => {
      shiftRun.current += 1;
      setSlots(null);
      setSelectedIds([]);
    },
    resetAndSetup: async () => {
      setGame((draft) => {
        const cards = [...draft.stock, ...draft.line, ...draft.discard];
        draft.stock = shuffle(cards).map(flipToBack);
        draft.line = [];
        draft.discard = [];
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        for (let index = 0; index < startCards; index += 1) {
          const card = draft.stock.pop();
          if (card) draft.line.push(flipToFace(card));
        }
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

  async function shiftLine(
    before: PlayingCard[],
    start: number,
    count: number,
  ) {
    const run = ++shiftRun.current;
    const tail = before.slice(start + count);
    const build = (moved: number) => {
      const next: (PlayingCard | null)[] = Array(before.length).fill(null);
      before.slice(0, start).forEach((card, i) => (next[i] = card));
      tail.forEach((card, m) => {
        next[m < moved ? start + m : start + count + m] = card;
      });
      return next;
    };
    setSlots(build(0));
    for (let moved = 1; moved <= tail.length; moved += 1) {
      await delay(shiftDelay);
      if (shiftRun.current !== run) return;
      setSlots(build(moved));
    }
    await delay(shiftDelay);
    if (shiftRun.current === run) setSlots(null);
  }

  /** Select adjacent cards; once they total 10, 20 or 30 they are discarded. */
  function onLinePress(index: number) {
    const card = game.line[index];
    if (game.ended || slots || !card) return;
    const selected = game.line
      .map((entry, i) => (selectedIds.includes(entry.id) ? i : -1))
      .filter((i) => i >= 0);

    if (selected.includes(index)) {
      // Only an end card can be removed, keeping the selection contiguous.
      if (index === selected[0] || index === selected[selected.length - 1])
        setSelectedIds(
          selected.filter((i) => i !== index).map((i) => game.line[i].id),
        );
      return;
    }

    const adjacent =
      selected.length > 0 &&
      (index === selected[0] - 1 ||
        index === selected[selected.length - 1] + 1);
    const next = adjacent
      ? [...selected, index].sort((a, b) => a - b)
      : [index];
    const cards = next.map((i) => game.line[i]);
    if (total(cards) > 30) return setSelectedIds([card.id]);
    if (!isDecade(cards)) return setSelectedIds(cards.map((c) => c.id));

    const start = next[0];
    const before = game.line;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.discard.push(
        ...draft.line.splice(start, next.length).map(flipToBack),
      );
    });
    setSelectedIds([]);
    void shiftLine(before, start, next.length);
  }

  function drawStock() {
    if (game.ended || slots || game.stock.length === 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.stock.pop();
      if (card) draft.line.push(flipToFace(card));
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const visible = slots ?? game.line;
    const rows = Math.max(1, Math.ceil(game.line.length / lineCols));
    const rowStep = rows > lineRows ? (lineRows - 1) / (rows - 1) : 1;
    const top = rows > lineRows ? 0 : ((lineRows - rows) * rowStep) / 2;
    const lineZones: MapZone[] = [];
    visible.forEach((card, i) => {
      if (!card) return;
      lineZones.push({
        id: `line-${i}`,
        name: "line",
        pileIndex: i,
        cards: [card],
        col: i % lineCols,
        row: top + Math.floor(i / lineCols) * rowStep,
        baseZIndex: 10 + i,
      });
    });

    return [
      ...lineZones,
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 0,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:discard"),
          infoPos: "right",
          showCount: true,
        },
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: lineCols - 1,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "left",
          showCount: true,
        },
      },
    ];
  }, [game, slots]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "line" && mappedCard.pileIndex !== undefined) {
      const index = mappedCard.pileIndex;
      return {
        isDisabled: game.ended || !!slots,
        isSelected: selectedIds.includes(mappedCard.card.id),
        selectColor: "blue",
        onPress: () => onLinePress(index),
      };
    }
    if (mappedCard.zoneName === "stock" && mappedCard.topOfZone) {
      return { isDisabled: game.ended, onPress: drawStock };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return {
        onPress: drawStock,
        isDisabled: game.ended || game.stock.length === 0,
      };
    }
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    fixedCols: lineCols,
    fixedRows: stockRow + 1,
    gap: 0.14,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:tenTwentyThirty.everyDecadeCounted")
          : i18n.t("games:tenTwentyThirty.noSumsRemain")
      }
      canUndo={canUndo && !slots}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
