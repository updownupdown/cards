import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
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
// Rows of height the line may wrap into before its rows start to overlap.
const lineRows = 6.2;
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

function isDecade(cards: PlayingCard[]) {
  const total = cards.reduce((sum, card) => sum + points(card), 0);
  return cards.length >= 2 && decades.includes(total);
}

function hasDecade(line: PlayingCard[]) {
  for (let start = 0; start < line.length; start += 1) {
    let total = points(line[start]);
    for (let end = start + 1; end < line.length && total < 30; end += 1) {
      total += points(line[end]);
      if (decades.includes(total)) return true;
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
  const [anchorId, setAnchorId] = useState<string | null>(null);
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
    resetNonGameStates: () => setAnchorId(null),
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

  /** Tap the first and last cards of a run; a run totalling 10, 20 or 30 goes. */
  function onLinePress(index: number) {
    const card = game.line[index];
    if (game.ended || !card) return;
    const anchor = game.line.findIndex((entry) => entry.id === anchorId);
    if (anchor < 0) return setAnchorId(card.id);
    if (anchor === index) return setAnchorId(null);

    const start = Math.min(anchor, index);
    const end = Math.max(anchor, index);
    if (!isDecade(game.line.slice(start, end + 1))) return setAnchorId(card.id);

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.discard.push(
        ...draft.line.splice(start, end - start + 1).map(flipToBack),
      );
    });
    setAnchorId(null);
  }

  function drawStock() {
    if (game.ended || game.stock.length === 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.stock.pop();
      if (card) draft.line.push(flipToFace(card));
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const lineZones: MapZone[] = game.line.map((card, i) => ({
      id: `line-${i}`,
      name: "line",
      pileIndex: i,
      cards: [card],
      col: i % lineCols,
      row: Math.floor(i / lineCols),
      baseZIndex: 10 + i,
    }));

    return [
      ...lineZones,
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: lineCols - 2.5,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:discard"),
          infoPos: "left",
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
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "line" && mappedCard.pileIndex !== undefined) {
      const index = mappedCard.pileIndex;
      return {
        isDisabled: game.ended,
        isSelected: mappedCard.card.id === anchorId,
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
      score={game.discard.length}
      winLoseMessage={
        game.won
          ? i18n.t("games:tenTwentyThirty.everyDecadeCounted")
          : i18n.t("games:tenTwentyThirty.noSumsRemain")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
