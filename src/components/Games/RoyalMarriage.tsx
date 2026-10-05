import { Button } from "@/components/Button/Button";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { delay, DOUBLE_TAP_MS } from "@/utils/utils";
import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToFace,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";

type GameState = {
  setupPile: PlayingCard[];
  line: PlayingCard[];
};

export type RoyalMarriageGameState = GameState;

const COLS = 7;
const ROWS = 8;
const BUTTON_ROW = ROWS + 0.15;

const gameStateInitial: GameState = {
  setupPile: shuffle(createDeck()),
  line: [],
};

function isRoyalCouple(card: PlayingCard) {
  return card.suit === "hearts" && (card.rank === "Q" || card.rank === "K");
}

function matches(a: PlayingCard, b: PlayingCard) {
  return a.rank === b.rank || a.suit === b.suit;
}

/** The Queen of Hearts first, the King of Hearts last, the rest shuffled between. */
function dealLine(cards: PlayingCard[]) {
  const queen = cards.find((c) => c.suit === "hearts" && c.rank === "Q");
  const king = cards.find((c) => c.suit === "hearts" && c.rank === "K");
  const others = shuffle(cards.filter((c) => !isRoyalCouple(c)));
  return [queen, ...others, king]
    .filter((card): card is PlayingCard => !!card)
    .map(flipToFace);
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    draft.setupPile = flipAllToBack([...draft.setupPile, ...draft.line]);
    draft.line = [];
  });

  await delay();

  setGame((draft) => {
    draft.line = dealLine(draft.setupPile);
    draft.setupPile = [];
  });
}

/**
 * Whether the cards at `start`..`start + count - 1` can go out: they sit
 * between two cards matching in rank or suit and number one or two, or are
 * all of one suit. The royal couple never leaves.
 */
function canDiscardRun(line: PlayingCard[], start: number, count: number) {
  const left = line[start - 1];
  const right = line[start + count];
  if (!left || !right || count < 1) return false;
  const run = line.slice(start, start + count);
  if (run.some(isRoyalCouple)) return false;
  if (!matches(left, right)) return false;
  return count <= 2 || run.every((card) => card.suit === run[0].suit);
}

/** The selected line positions, if they form one discardable run. */
function canDiscardSelection(line: PlayingCard[], selected: number[]) {
  if (selected.length === 0) return false;
  const sorted = [...selected].sort((a, b) => a - b);
  const contiguous = sorted.every(
    (index, i) => i === 0 || index === sorted[i - 1] + 1,
  );
  return contiguous && canDiscardRun(line, sorted[0], sorted.length);
}

function hasAnyMove(line: PlayingCard[]) {
  for (let start = 1; start < line.length - 1; start += 1) {
    for (let count = 1; start + count < line.length; count += 1) {
      if (canDiscardRun(line, start, count)) return true;
    }
  }
  return false;
}

export const royalMarriageRules = {
  canDiscardRun,
  canDiscardSelection,
  hasAnyMove,
};

export default function RoyalMarriage() {
  const { colorAccent } = useGameColors();
  const [selected, setSelected] = useState<number[]>([]);
  const lastTapRef = useRef<{ index: number; at: number } | null>(null);

  const {
    isLoaded,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
    isAnimatingRef,
  } = useStateManager<GameState>({
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    gameStateInitial,
    resetNonGameStates: () => {
      setSelected([]);
    },
  });

  const won = game.line.length === 2 && game.line.every(isRoyalCouple);
  const lost = game.line.length > 0 && !won && !hasAnyMove(game.line);
  const ended = won || lost;
  const canDiscard = !ended && canDiscardSelection(game.line, selected);

  function onCardPress(index: number) {
    if (isAnimatingRef.current || ended) return;
    if (isRoyalCouple(game.line[index])) return;

    const now = Date.now();
    const last = lastTapRef.current;
    lastTapRef.current = { index, at: now };
    if (
      last?.index === index &&
      now - last.at < DOUBLE_TAP_MS &&
      selected.length === 1 &&
      selected[0] === index &&
      canDiscardSelection(game.line, [index])
    ) {
      lastTapRef.current = null;
      discardIndices([index]);
      return;
    }

    setSelected((current) =>
      current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index],
    );
  }

  function discardIndices(indices: number[]) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.line = draft.line.filter((_, i) => !indices.includes(i));
    });
    setSelected([]);
  }

  function discardSelected() {
    if (!canDiscard) return;
    discardIndices(selected);
  }

  const zones: MapZone[] = useMemo(() => {
    const rows = Math.ceil(game.line.length / COLS);
    const singleRow = rows === 1;
    // Centre the shrinking grid within the fixed artboard.
    const gridZones: MapZone[] = getGridColRows({
      cols: singleRow ? game.line.length : COLS,
      rows,
      rowOffset: (ROWS - rows) / 2,
      colOffset: singleRow ? (COLS - game.line.length) / 2 : 0,
    }).map((pos, i) => ({
      id: `line-${i}`,
      name: "line",
      pileIndex: i,
      cards: game.line[i] ? [game.line[i]] : undefined,
      col: pos.c,
      row: pos.r,
      baseZIndex: i + 10,
    }));

    return [
      {
        id: "setup",
        name: "setup",
        cards: game.setupPile,
        col: 3,
        row: 3,
        baseZIndex: 1,
        fan: { maxVisible: 3 },
      },
      ...gridZones,
      { id: "buttons", col: 0, row: BUTTON_ROW, width: COLS, height: 1 },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const index = mappedCard.pileIndex;
    if (index === undefined || mappedCard.zoneName !== "line") return;

    if (isRoyalCouple(game.line[index])) {
      return { forceOverlayColor: true, selectColor: "lightGrey" };
    }

    return {
      onPress: () => onCardPress(index),
      isSelected: selected.includes(index),
      selectColor: canDiscard ? "green" : "blue",
    };
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    gap: 0.12,
    fixedCols: COLS,
    fixedRows: ROWS + 1,
  });

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        won ? i18n.t("cards:youWon") : i18n.t("cards:noLegalMovesRemain")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[getZoneStylesById("buttons"), flexStyles.rowCentered]}>
        <Button
          text={i18n.t("cards:discard")}
          size="md"
          onPress={discardSelected}
          disabled={!canDiscard}
          theme={colorAccent}
          style={{
            flex: 1,
            height: cardHeight * 0.6,
            borderRadius: cardHeight * 0.1,
          }}
        />
      </View>
    </GameWrapper>
  );
}
