import { useStateManager } from "@/hooks/useStateManager";
import { useGameVariant } from "@/hooks/useGameVariant";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { DragGhostCards, DragHandle } from "@/components/Cards/DragDrop";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  CardRank,
  collectCards,
  createDeck,
  flipAllToBack,
  PlayingCard,
  RANK_VALUE,
  redealWith,
  shuffle,
} from "../Cards/card-utils";
import { delay } from "@/utils/utils";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
const TABLEAU_FAN_OFFSET = 0.35;

export type ScorpionState = {
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  foundations: PlayingCard[][];
  stockDealt: boolean;
};

type Selection = {
  zone: "tableau";
  pileIndex: number;
  cardIndex: number;
} | null;

type MoveSource = Exclude<Selection, null>;

type DropTarget = { zone: "tableau"; pileIndex: number };

const DESC_RANKS: CardRank[] = [
  "K",
  "Q",
  "J",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
  "A",
];

function createInitialState(): ScorpionState {
  const deck = shuffle(createDeck({ faceUp: false }));
  const tableau: PlayingCard[][] = Array.from({ length: 7 }, () => []);
  let cursor = 0;

  for (let column = 0; column < 7; column += 1) {
    for (let row = 0; row < 7; row += 1) {
      const baseCard = deck[cursor++];
      if (!baseCard) continue;
      const hidden = column < 4 && row < 3;
      tableau[column].push({ ...baseCard, faceUp: !hidden });
    }
  }

  return {
    tableau,
    stock: deck.slice(cursor, cursor + 3).map((card) => ({
      ...card,
      faceUp: false,
    })),
    foundations: Array.from({ length: 4 }, () => [] as PlayingCard[]),
    stockDealt: false,
  };
}

function normalizeColumn(column: PlayingCard[]) {
  if (column.length === 0) return column;
  const top = column[column.length - 1];
  if (top.faceUp) return column;

  return [...column.slice(0, -1), { ...top, faceUp: true }];
}

/** In Wasp, any card may fill an empty column; in Scorpion only a King. */
function canAttachToTableau(
  movingTop: PlayingCard,
  destinationTop?: PlayingCard,
  anyCardToEmpty = false,
) {
  if (!destinationTop) {
    return anyCardToEmpty || movingTop.rank === "K";
  }

  if (!destinationTop.faceUp) {
    return false;
  }

  return (
    movingTop.suit === destinationTop.suit &&
    RANK_VALUE[destinationTop.rank] === RANK_VALUE[movingTop.rank] + 1
  );
}

function isCompleteSuitRun(cards: PlayingCard[]) {
  if (cards.length !== 13) return false;
  if (!cards.every((card) => card.faceUp)) return false;

  const suit = cards[0].suit;
  for (let i = 0; i < cards.length; i += 1) {
    if (cards[i].suit !== suit) return false;
    if (cards[i].rank !== DESC_RANKS[i]) return false;
  }

  return true;
}

function moveCompletedRunsToFoundations(
  tableau: PlayingCard[][],
  foundations: PlayingCard[][],
) {
  for (let pileIndex = 0; pileIndex < tableau.length; pileIndex += 1) {
    while (tableau[pileIndex].length >= 13) {
      const run = tableau[pileIndex].slice(-13);
      if (!isCompleteSuitRun(run)) {
        break;
      }

      const targetFoundationIndex = foundations.findIndex(
        (pile) => pile.length === 0,
      );
      if (targetFoundationIndex < 0) {
        break;
      }

      tableau[pileIndex] = tableau[pileIndex].slice(0, -13);
      foundations[targetFoundationIndex] = run.map((card) => ({
        ...card,
        faceUp: true,
      }));
      tableau[pileIndex] = normalizeColumn(tableau[pileIndex]);
    }
  }
}

export const scorpionRules = {
  createInitialState,
  normalizeColumn,
  canAttachToTableau,
  isCompleteSuitRun,
  moveCompletedRunsToFoundations,
  descendingRanks: DESC_RANKS,
};

/** The board with every card gathered face down into the stock. */
function gatherState(state: ScorpionState): ScorpionState {
  return {
    tableau: Array.from({ length: 7 }, () => []),
    stock: shuffle(flipAllToBack(collectCards(state))),
    foundations: Array.from({ length: 4 }, () => []),
    stockDealt: false,
  };
}

// Starts with every card in the stock, to be dealt out from there.
const gameStateInitial = gatherState(createInitialState());

export default function Scorpion() {
  const variant = useGameVariant("/scorpion");
  if (!variant) return null;
  return <ScorpionBoard key={variant} anyCardToEmpty={variant === "wasp"} />;
}

function ScorpionBoard({ anyCardToEmpty }: { anyCardToEmpty: boolean }) {
  const [selected, setSelected] = useState<Selection>(null);

  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<ScorpionState>({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelected(null);
        clearDragGhost();
      },
      resetAndSetup: async () => {
        // Gather every card into the stock, then deal them back out.
        setGame((draft) => gatherState(draft));
        await delay();
        setGame((draft) => redealWith(createInitialState(), draft.stock));
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
    onSuccessfulDrop: async (source, target) => {
      moveSourceToTableau(source, target.pileIndex);
    },
    getDroppedCardIds: (source) =>
      getSourceCards(source, game).map((card) => card.id),
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    getTapHandler,
  });

  const zones: MapZone[] = useMemo(() => {
    const tableauZones: MapZone[] = game.tableau.map((pile, pileIndex) => ({
      id: `tableau-${pileIndex}`,
      name: "tableau",
      pileIndex,
      cards: pile,
      col: pileIndex,
      row: 1.6,
      baseZIndex: 10 + pileIndex,
      fan: { direction: "down", offset: TABLEAU_FAN_OFFSET },
      placeholder: anyCardToEmpty
        ? { showCount: false, text: i18n.t("cards:empty") }
        : { iconName: "king" },
    }));

    return [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: 0,
        baseZIndex: 35,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "below" },
      },
      {
        id: "foundation-0",
        name: "foundation",
        pileIndex: 0,
        cards: game.foundations[0],
        col: 3,
        row: 0,
        baseZIndex: 20,
        fan: { maxVisible: 3 },
      },
      {
        id: "foundation-1",
        name: "foundation",
        pileIndex: 1,
        cards: game.foundations[1],
        col: 4,
        row: 0,
        baseZIndex: 20,
        fan: { maxVisible: 3 },
      },
      {
        id: "foundation-2",
        name: "foundation",
        pileIndex: 2,
        cards: game.foundations[2],
        col: 5,
        row: 0,
        baseZIndex: 20,
        fan: { maxVisible: 3 },
      },
      {
        id: "foundation-3",
        name: "foundation",
        pileIndex: 3,
        cards: game.foundations[3],
        col: 6,
        row: 0,
        baseZIndex: 20,
        fan: { maxVisible: 3 },
      },
      ...tableauZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(mappedCard.card.id) ?? false;
    const animDuration =
      justDroppedCardIds.current?.has(mappedCard.card.id) === true
        ? 0
        : undefined;

    if (mappedCard.zoneName === "stock" && mappedCard.topOfZone) {
      return {
        selectColor: "blue",
        isSelected: false,
        onPress: dealStock,
        isDisabled: game.stock.length === 0 || game.stockDealt,
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    if (
      mappedCard.zoneName === "tableau" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isSelectedSource =
        selected?.zone === "tableau" &&
        selected.pileIndex === mappedCard.pileIndex &&
        mappedCard.cardIndex >= selected.cardIndex;
      const isHoverTargetTop =
        !!dragGhost &&
        mappedCard.topOfZone &&
        hoverTarget?.zone === "tableau" &&
        hoverTarget.pileIndex === mappedCard.pileIndex;

      return {
        selectColor: isHoverTargetTop
          ? "green"
          : isSelectedSource
            ? "blue"
            : "none",
        isSelected: isSelectedSource || isHoverTargetTop,
        isDisabled: !mappedCard.card.faceUp,
        isVisible: !isBeingDragged,
        animDuration,
      };
    }

    return {
      isVisible: !isBeingDragged,
      animDuration,
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return {
        onPress: dealStock,
        isDisabled: game.stock.length === 0 || game.stockDealt,
        isSelected: false,
      };
    }

    if (zone.name === "tableau" && zone.pileIndex !== undefined) {
      const isHoverDropTarget =
        !!dragGhost &&
        hoverTarget?.zone === "tableau" &&
        hoverTarget.pileIndex === zone.pileIndex;

      return {
        onPress: () => onEmptyTableauPress(zone.pileIndex!),
        isDisabled: !selected || !!dragGhost,
        isSelected: isHoverDropTarget && zone.cards?.length === 0,
        selectColor: "green",
      };
    }

    return undefined;
  };

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    fixedRows: 6,
    gap: 0.12,
  });

  const stockTapRect = useMemo(() => {
    const stockZone = zones.find((zone) => zone.name === "stock");
    if (!stockZone) return null;
    const pos = getZoneBasePos(stockZone);
    return createRect(pos.x, pos.y, cardWidth, cardHeight);
  }, [cardHeight, cardWidth, getZoneBasePos, zones]);

  function getSourceRect(source: MoveSource) {
    const zone = zones.find(
      (entry) =>
        entry.name === "tableau" && entry.pileIndex === source.pileIndex,
    );
    if (!zone) return null;

    const base = getZoneBasePos(zone);
    return createRect(
      base.x,
      base.y + source.cardIndex * TABLEAU_FAN_OFFSET * cardHeight,
      cardWidth,
      cardHeight,
    );
  }

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      if (zone.name !== "tableau" || zone.pileIndex === undefined) {
        return;
      }

      const zoneRect = getZoneBasePos(zone);
      const pile = game.tableau[zone.pileIndex];

      pile.forEach((card, cardIndex) => {
        if (!card.faceUp) return;

        areas.push({
          source: {
            zone: "tableau",
            pileIndex: zone.pileIndex!,
            cardIndex,
          },
          rect: createRect(
            zoneRect.x,
            zoneRect.y + cardIndex * TABLEAU_FAN_OFFSET * cardHeight,
            cardWidth,
            cardHeight,
          ),
          priority: 10 + cardIndex,
        });
      });
    });

    return areas;
  }, [cardHeight, cardWidth, game.tableau, getZoneBasePos, zones]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      updateBoardOffset();
    });
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, zones.length, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(() => {
    const areas: DropHitArea<DropTarget>[] = [];

    zones.forEach((zone) => {
      if (zone.name !== "tableau" || zone.pileIndex === undefined) {
        return;
      }

      const zoneRect = getZoneBasePos(zone);
      const pile = game.tableau[zone.pileIndex];
      const pileHeight =
        cardHeight +
        Math.max(0, pile.length - 1) * TABLEAU_FAN_OFFSET * cardHeight;

      areas.push({
        target: { zone: "tableau", pileIndex: zone.pileIndex },
        rect: createRect(
          zoneRect.x + boardPageOffset.x,
          zoneRect.y + boardPageOffset.y,
          cardWidth,
          pileHeight,
        ),
        priority: 40 + pile.length,
      });
    });

    return areas;
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

  const won = useMemo(
    () => game.foundations.every((pile) => pile.length === 13),
    [game.foundations],
  );

  function clearSelection() {
    setSelected(null);
  }

  function getSourceCards(source: MoveSource, snapshot: ScorpionState) {
    const pile = snapshot.tableau[source.pileIndex];
    const cards = pile.slice(source.cardIndex);

    if (cards.length === 0 || !cards[0].faceUp) {
      return [];
    }

    return cards;
  }

  function startGhostDrag(source: MoveSource) {
    const cards = getSourceCards(source, game);
    if (cards.length === 0) return;

    const rect = getSourceRect(source);
    if (!rect) return;

    startDrag(source, cards, { x: rect.x, y: rect.y });
  }

  function dealStock() {
    if (dragGhost) {
      clearDragGhost();
    }

    if (game.stockDealt || game.stock.length === 0) {
      clearSelection();
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (draft.stockDealt || draft.stock.length === 0) {
        return;
      }

      for (let column = 0; column < 3; column += 1) {
        const card = draft.stock[column];
        if (!card) continue;
        draft.tableau[column].push({ ...card, faceUp: true });
      }

      draft.stock = [];
      draft.stockDealt = true;

      for (let column = 0; column < draft.tableau.length; column += 1) {
        draft.tableau[column] = normalizeColumn(draft.tableau[column]);
      }

      moveCompletedRunsToFoundations(draft.tableau, draft.foundations);
    });

    clearSelection();
  }

  function moveSourceToTableau(source: MoveSource, destinationIndex: number) {
    if (
      !canDropOnTarget(source, {
        zone: "tableau",
        pileIndex: destinationIndex,
      })
    ) {
      clearSelection();
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (source.pileIndex === destinationIndex) {
        return;
      }

      const sourcePile = draft.tableau[source.pileIndex];
      const movingCards = sourcePile.slice(source.cardIndex);
      if (movingCards.length === 0 || !movingCards[0].faceUp) {
        return;
      }

      const destinationPile = draft.tableau[destinationIndex];
      const destinationTop = destinationPile[destinationPile.length - 1];
      if (!canAttachToTableau(movingCards[0], destinationTop, anyCardToEmpty)) {
        return;
      }

      sourcePile.splice(source.cardIndex, movingCards.length);
      destinationPile.push(
        ...movingCards.map((card) => ({ ...card, faceUp: true })),
      );

      draft.tableau[source.pileIndex] = normalizeColumn(sourcePile);
      draft.tableau[destinationIndex] = normalizeColumn(destinationPile);

      moveCompletedRunsToFoundations(draft.tableau, draft.foundations);
    });

    clearSelection();
  }

  function onTableauCardPress(pileIndex: number, cardIndex: number) {
    if (dragGhost) {
      clearSelection();
      return;
    }

    const card = game.tableau[pileIndex]?.[cardIndex];
    if (!card?.faceUp) {
      return;
    }

    const source: MoveSource = { zone: "tableau", pileIndex, cardIndex };

    if (!selected) {
      setSelected(source);
      return;
    }

    if (selected.pileIndex === pileIndex && selected.cardIndex === cardIndex) {
      clearSelection();
      return;
    }

    if (selected.pileIndex === pileIndex) {
      setSelected(source);
      return;
    }

    moveSourceToTableau(selected, pileIndex);
  }

  function onEmptyTableauPress(pileIndex: number) {
    if (!selected || dragGhost) return;
    moveSourceToTableau(selected, pileIndex);
  }

  function canDropOnTarget(
    source: MoveSource,
    target: DropTarget,
    snapshot = game,
  ) {
    if (source.pileIndex === target.pileIndex) {
      return false;
    }

    const movingCards = getSourceCards(source, snapshot);
    if (movingCards.length === 0) return false;

    const destinationPile = snapshot.tableau[target.pileIndex];
    const destinationTop = destinationPile[destinationPile.length - 1];
    return canAttachToTableau(movingCards[0], destinationTop, anyCardToEmpty);
  }

  function makeHandlers(source: MoveSource, onTap?: () => void) {
    return makeDragHandlers(source, startGhostDrag, onTap);
  }

  function getTapHandler(source: MoveSource) {
    return () => onTableauCardPress(source.pileIndex, source.cardIndex);
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map((hit) => {
        const source = hit.source;
        const rect = hit.rect;

        return (
          <DragHandle
            key={`tableau-${source.pileIndex}-${source.cardIndex}`}
            collapsable={false}
            style={{
              position: "absolute",
              backgroundColor: "transparent",
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
            }}
            gesture={makeHandlers(source)}
          />
        );
      }),
    [cardHitAreas],
  );

  return (
    <GameWrapper
      outcome={won ? "won" : "playing"}
      reset={() => {
        void reset();
      }}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        won ? i18n.t("games:scorpion.allFourSuitStacksAre") : undefined
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
          style={[
            pointerEventsStyles.boxNone,
            {
              ...StyleSheet.absoluteFill,
              zIndex: 3000,
              touchAction: "none",
              overscrollBehaviorX: "contain",
            },
          ]}
        >
          {stockTapRect && (
            <Pressable
              style={{
                position: "absolute",
                backgroundColor: "transparent",
                left: stockTapRect.x,
                top: stockTapRect.y,
                width: stockTapRect.width,
                height: stockTapRect.height,
              }}
              onPress={dealStock}
              disabled={game.stock.length === 0 || game.stockDealt}
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
            fanOffset={TABLEAU_FAN_OFFSET}
            isValidDrop={hoverTarget !== null}
          />
        )}
      </View>
    </GameWrapper>
  );
}
