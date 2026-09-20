import { useStateManager } from "@/hooks/useStateManager";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { DragGhostCards, DragHandle } from "@/components/Cards/DragDrop";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  top,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
export type SingleDeckSpiderVariant = "simple-simon" | "spiderette";

const TABLEAU_ROW = 1.2;
const BOARD_ROWS = 7;

const LAYOUTS = {
  "simple-simon": {
    tableauRow: 0,
    stock: { col: 10.5, row: 0 },
    discard: { col: 10.5, row: 0 },
    fixedCols: 11.5,
    fixedRows: 5,
  },
  spiderette: {
    tableauRow: 0,
    stock: { col: 0, row: BOARD_ROWS - 1 },
    discard: { col: 1, row: BOARD_ROWS - 1 },
    fixedCols: 7,
    fixedRows: BOARD_ROWS,
  },
} as const;

/** A column's fan offset, tightened once it would run off the board. */
function pileOffset(count: number) {
  return zoneFanOffset(
    count,
    BOARD_ROWS - TABLEAU_ROW,
    cardDims.tableauOffsetMin,
    cardDims.tableauOffset,
  );
}
export type SingleDeckSpiderState = {
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};
type Selection = { pile: number; card: number } | null;
type MoveSource = Exclude<Selection, null>;
type DropTarget = { pile: number };

const CONFIGS = {
  "simple-simon": {
    sizes: [8, 8, 8, 7, 6, 5, 4, 3, 2, 1],
    faceUp: "all" as const,
  },
  spiderette: {
    sizes: [1, 2, 3, 4, 5, 6, 7],
    faceUp: "top" as const,
  },
};

function isSuitedRun(cards: PlayingCard[]) {
  return (
    cards.length > 0 &&
    cards.every(
      (card, index) =>
        card.faceUp &&
        (index === 0 ||
          (card.suit === cards[index - 1].suit &&
            rankValue(card) === rankValue(cards[index - 1]) - 1)),
    )
  );
}

function canBuild(card: PlayingCard, destination?: PlayingCard) {
  return !destination || rankValue(card) === rankValue(destination) - 1;
}

function isComplete(cards: PlayingCard[]) {
  return (
    cards.length === 13 &&
    cards[0].rank === "K" &&
    cards[12].rank === "A" &&
    isSuitedRun(cards)
  );
}

function settle(state: SingleDeckSpiderState) {
  state.tableau.forEach((pile, index) => {
    const tail = pile.slice(-13);
    if (isComplete(tail)) {
      state.discard.push(...tail.map(flipToBack));
      pile.splice(-13);
    }
    const exposed = top(pile);
    if (exposed && !exposed.faceUp) pile[pile.length - 1] = flipToFace(exposed);
    state.tableau[index] = pile;
  });
  state.won = state.discard.length === 52;
  state.ended = state.won;
}

function createInitialState(
  variant: SingleDeckSpiderVariant,
): SingleDeckSpiderState {
  const config = CONFIGS[variant];
  const deck = shuffle(createDeck());
  let offset = 0;
  const tableau = config.sizes.map((size) => {
    const cards = deck.slice(offset, offset + size);
    offset += size;
    return cards.map((card, index) =>
      config.faceUp === "all" || index === cards.length - 1
        ? flipToFace(card)
        : flipToBack(card),
    );
  });
  return {
    tableau,
    stock: deck.slice(offset).map(flipToBack),
    discard: [],
    ended: false,
    won: false,
  };
}

export const singleDeckSpiderRules = {
  canBuild,
  createInitialState,
  isComplete,
  isSuitedRun,
  settle,
};

export function SingleDeckSpider({
  variant,
}: {
  variant: SingleDeckSpiderVariant;
}) {
  const layout = LAYOUTS[variant];
  const initial = useMemo(() => createInitialState(variant), [variant]);
  const [selected, setSelected] = useState<Selection>(null);
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<SingleDeckSpiderState>({
      gameStateInitial: initial,
      resetNonGameStates: () => {
        setSelected(null);
        clearDragGhost();
      },
      resetAndSetup: async () => {
        setGame(createInitialState(variant));
      },
    });

  const { width: windowWidth, height: windowHeight } = useViewportDimensions();
  const dropHitAreasRef = useRef<DropHitArea<DropTarget>[]>([]);

  const {
    hoverTarget,
    dragGhost,
    draggedCardIds,
    justDroppedCardIds,
    dragTranslate,
    boardRef,
    boardPageOffset,
    clearDragGhost,
    startDrag,
    updateBoardOffset,
    makeDragHandlers,
  } = useDragDrop<MoveSource, DropTarget>({
    canDropOnTarget,
    onSuccessfulDrop: (source, target) => {
      move(target.pile, source);
    },
    getDroppedCardIds: (source) =>
      getSourceCards(source, game).map((card) => card.id),
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    getTapHandler,
  });

  useEffect(() => {
    if (game.won && !game.ended) {
      setGame((draft) => {
        draft.ended = true;
      });
    }
  }, [game.ended, game.won, setGame]);

  function getSourceCards(source: MoveSource, snapshot: SingleDeckSpiderState) {
    const cards = snapshot.tableau[source.pile].slice(source.card);
    return isSuitedRun(cards) ? cards : [];
  }

  function canDropOnTarget(
    source: MoveSource,
    target: DropTarget,
    snapshot = game,
  ) {
    if (snapshot.ended || source.pile === target.pile) return false;
    const cards = getSourceCards(source, snapshot);
    return (
      cards.length > 0 && canBuild(cards[0], top(snapshot.tableau[target.pile]))
    );
  }

  function move(destination: number, source: Selection = selected) {
    const cards = source ? getSourceCards(source, game) : [];
    if (
      !source ||
      source.pile === destination ||
      cards.length === 0 ||
      !canBuild(cards[0], top(game.tableau[destination]))
    ) {
      return false;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moving = draft.tableau[source.pile].splice(source.card);
      draft.tableau[destination].push(...moving);
      settle(draft);
    });
    setSelected(null);
    return true;
  }

  function onCardPress(pile: number, card: number) {
    if (game.ended || !game.tableau[pile][card].faceUp) return;
    const next = { pile, card };
    if (!selected) {
      if (isSuitedRun(game.tableau[pile].slice(card))) setSelected(next);
      return;
    }
    if (selected.pile === pile && selected.card === card)
      return setSelected(null);
    if (!move(pile) && isSuitedRun(game.tableau[pile].slice(card)))
      setSelected(next);
  }

  function dealRow() {
    if (
      game.ended ||
      game.stock.length === 0 ||
      game.tableau.some((pile) => pile.length === 0)
    ) {
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.tableau.forEach((pile) => {
        const card = draft.stock.pop();
        if (card) pile.push(flipToFace(card));
      });
      settle(draft);
    });
    setSelected(null);
  }

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: layout.stock.col,
        row: layout.stock.row,
        fan: { maxVisible: 3 },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: layout.discard.col,
        row: layout.discard.row,
        fan: { maxVisible: 3 },
      },
      ...game.tableau.map((pile, index) => ({
        id: `tableau-${index}`,
        name: "tableau",
        pileIndex: index,
        cards: pile,
        col: index,
        row: layout.tableauRow,
        fan: { direction: "down" as const, offset: pileOffset(pile.length) },
        placeholder: {},
      })),
    ],
    [game, layout],
  );

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(card.card.id) ?? false;
    const animDuration = justDroppedCardIds.current?.has(card.card.id)
      ? 0
      : undefined;

    if (card.zoneName === "stock" && card.topOfZone)
      return {
        onPress: dealRow,
        isDisabled: game.stock.length === 0,
        isVisible: !isBeingDragged,
        animDuration,
      };
    if (card.zoneName !== "tableau" || card.pileIndex === undefined)
      return { isVisible: !isBeingDragged, animDuration };
    const highlighted =
      selected?.pile === card.pileIndex && card.cardIndex >= selected.card;
    const isHoverTarget =
      !!dragGhost && card.topOfZone && hoverTarget?.pile === card.pileIndex;
    return {
      isDisabled: game.ended || !card.card.faceUp,
      isSelected: highlighted || isHoverTarget,
      selectColor: isHoverTarget ? "green" : "blue",
      onPress: () => onCardPress(card.pileIndex!, card.cardIndex),
      isVisible: !isBeingDragged,
      animDuration,
    };
  };
  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock")
      return { onPress: dealRow, isDisabled: game.stock.length === 0 };
    if (zone.name === "tableau" && zone.pileIndex !== undefined)
      return {
        onPress: () => move(zone.pileIndex!),
        isDisabled: !selected || !!dragGhost,
        isSelected:
          !!dragGhost &&
          zone.cards?.length === 0 &&
          hoverTarget?.pile === zone.pileIndex,
        selectColor: "green",
      };
    return {};
  };
  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    fixedCols: layout.fixedCols,
    fixedRows: layout.fixedRows,
    gap: 0.1,
  });

  function getSourceRect(source: MoveSource) {
    const zone = zones.find(
      (entry) => entry.name === "tableau" && entry.pileIndex === source.pile,
    );
    if (!zone) return null;
    const base = getZoneBasePos(zone);
    return createRect(
      base.x,
      base.y +
        source.card * pileOffset(game.tableau[source.pile].length) * cardHeight,
      cardWidth,
      cardHeight,
    );
  }

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      if (zone.name !== "tableau" || zone.pileIndex === undefined) return;
      const base = getZoneBasePos(zone);
      const pile = game.tableau[zone.pileIndex];
      const offset = pileOffset(pile.length);

      pile.forEach((card, cardIndex) => {
        if (!card.faceUp) return;
        areas.push({
          source: { pile: zone.pileIndex!, card: cardIndex },
          rect: createRect(
            base.x,
            base.y + cardIndex * offset * cardHeight,
            cardWidth,
            cardIndex === pile.length - 1 ? cardHeight : offset * cardHeight,
          ),
          priority: 10 + cardIndex,
        });
      });
    });

    return areas;
  }, [cardHeight, cardWidth, game.tableau, getZoneBasePos, zones]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateBoardOffset());
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, zones.length, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(() => {
    return zones.flatMap((zone) => {
      if (zone.name !== "tableau" || zone.pileIndex === undefined) return [];
      const base = getZoneBasePos(zone);
      const pile = game.tableau[zone.pileIndex];
      const pileHeight =
        cardHeight +
        Math.max(0, pile.length - 1) * pileOffset(pile.length) * cardHeight;

      return [
        {
          target: { pile: zone.pileIndex },
          rect: createRect(
            base.x + boardPageOffset.x,
            base.y + boardPageOffset.y,
            cardWidth,
            pileHeight,
          ),
          priority: 40 + pile.length,
        },
      ];
    });
  }, [
    boardPageOffset.x,
    boardPageOffset.y,
    cardHeight,
    cardWidth,
    game.tableau,
    getZoneBasePos,
    zones,
  ]);

  dropHitAreasRef.current = dropHitAreas;

  function startGhostDrag(source: MoveSource) {
    if (game.ended) return;
    const cards = getSourceCards(source, game);
    if (cards.length === 0) return;
    const rect = getSourceRect(source);
    if (!rect) return;
    startDrag(
      source,
      cards,
      { x: rect.x, y: rect.y },
      pileOffset(game.tableau[source.pile].length),
    );
  }

  function getTapHandler(source: MoveSource) {
    return () => onCardPress(source.pile, source.card);
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map(({ source, rect }) => (
        <DragHandle
          key={`tableau-${source.pile}-${source.card}`}
          collapsable={false}
          style={{
            position: "absolute",
            backgroundColor: "transparent",
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
          gesture={makeDragHandlers(source, startGhostDrag)}
        />
      )),
    [cardHitAreas],
  );

  const stockZone = zones.find((zone) => zone.name === "stock");
  const stockPosition = stockZone ? getZoneBasePos(stockZone) : null;
  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={game.discard.length / 13}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={i18n.t("games:singleDeckSpider.fourCompleteSuits")}
      showDeviceRotateHint={
        variant === "simple-simon" ? "landscape" : undefined
      }
    >
      <View
        ref={boardRef}
        style={{
          flex: 1,
          width: "100%",
          position: "relative",
          touchAction: "none",
          overscrollBehaviorX: "contain",
        }}
      >
        {cardMap}
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            zIndex: 3000,
            touchAction: "none",
            overscrollBehaviorX: "contain",
            pointerEvents: "box-none",
          }}
        >
          {stockPosition && (
            <Pressable
              style={{
                position: "absolute",
                left: stockPosition.x,
                top: stockPosition.y,
                width: cardWidth,
                height: cardHeight,
              }}
              onPress={dealRow}
              disabled={
                game.ended ||
                game.stock.length === 0 ||
                game.tableau.some((pile) => pile.length === 0) ||
                !!dragGhost
              }
            />
          )}
          {interactionTargets}
        </View>
        {dragGhost && (
          <DragGhostCards
            ghost={dragGhost}
            translate={dragTranslate}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize="tableau"
            isValidDrop={hoverTarget !== null}
            highlightLeadOnly
          />
        )}
      </View>
    </GameWrapper>
  );
}
