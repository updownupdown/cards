import { useStateManager } from "@/hooks/useStateManager";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { DragGhostCards, DragHandle } from "@/components/Cards/DragDrop";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { delay, DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
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
  type CardRank,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const pileCount = 8;
const pileSize = 5;
// Starting cards for the 1 o'clock to 12 o'clock foundations.
const clockStart: [CardRank, CardSuit][] = [
  ["10", "hearts"],
  ["J", "spades"],
  ["Q", "diamonds"],
  ["K", "clubs"],
  ["2", "hearts"],
  ["3", "spades"],
  ["4", "diamonds"],
  ["5", "clubs"],
  ["6", "hearts"],
  ["7", "spades"],
  ["8", "diamonds"],
  ["9", "clubs"],
];
const clockRadius = 2.8;
const clockCenterCol = (pileCount - 1) / 2 - 0.5;
const tableauRow = clockRadius * cardDims.aspectRatio * 2 + 1.3;
// Rows of height each tableau pile may fan into.
const pileRows = 4.5;

type GameState = {
  /** Cards gathered for the deal; empty during play. */
  deck: PlayingCard[];
  tableau: PlayingCard[][];
  /** Index 0 is 1 o'clock, index 11 is 12 o'clock. */
  foundations: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

export type GrandfathersClockGameState = GameState;

type Source = { pile: number };
type Target =
  { zone: "tableau"; pile: number } | { zone: "foundation"; pile: number };

function emptyPiles(count: number) {
  return Array.from({ length: count }, () => [] as PlayingCard[]);
}

const gameStateInitial: GameState = {
  deck: shuffle(createDeck()).map(flipToBack),
  tableau: emptyPiles(pileCount),
  foundations: emptyPiles(clockStart.length),
  ended: false,
  won: false,
};

/** The rank above, wrapping from King to Ace. */
function nextRankValue(value: number) {
  return (value % 13) + 1;
}

/** A foundation is done once its top card shows its hour (J 11, Q 12). */
function isComplete(pile: PlayingCard[], index: number) {
  const pileTop = top(pile);
  return !!pileTop && rankValue(pileTop) === index + 1;
}

function canBuildFoundation(
  card: PlayingCard,
  pile: PlayingCard[],
  index: number,
) {
  const pileTop = top(pile);
  return (
    !!pileTop &&
    !isComplete(pile, index) &&
    pileTop.suit === card.suit &&
    rankValue(card) === nextRankValue(rankValue(pileTop))
  );
}

/** Build down regardless of suit, a King going on an Ace. */
function canBuildTableau(card: PlayingCard, pile: PlayingCard[]) {
  const pileTop = top(pile);
  return !pileTop || nextRankValue(rankValue(card)) === rankValue(pileTop);
}

function canMove(state: GameState, source: Source, target: Target) {
  const card = top(state.tableau[source.pile]);
  if (!card) return false;
  if (target.zone === "foundation")
    return canBuildFoundation(
      card,
      state.foundations[target.pile],
      target.pile,
    );
  return (
    target.pile !== source.pile &&
    canBuildTableau(card, state.tableau[target.pile])
  );
}

function hasMove(state: GameState) {
  return state.tableau.some((pile, source) => {
    if (pile.length === 0) return false;
    return (
      state.foundations.some((_, target) =>
        canMove(state, { pile: source }, { zone: "foundation", pile: target }),
      ) ||
      state.tableau.some(
        (other, target) =>
          (other.length > 0 || pile.length > 1) &&
          canMove(state, { pile: source }, { zone: "tableau", pile: target }),
      )
    );
  });
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  const playing = { ended: false, won: false };
  if (isSettingUp) return playing;
  if (state.foundations.every((pile, index) => isComplete(pile, index)))
    return { ended: true, won: true };
  return hasMove(state) ? playing : { ended: true, won: false };
}

function pileOffset(count: number) {
  return zoneFanOffset(count, pileRows, 0.12, cardDims.tableauOffset);
}

export const grandfathersClockRules = {
  clockStart,
  isComplete,
  canMove,
  hasMove,
  evaluateEnd,
};

export default function GrandfathersClock() {
  const [selected, setSelected] = useState<number | null>(null);
  const [lastTap, setLastTap] = useState<{ pile: number; at: number } | null>(
    null,
  );
  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetNonGameStates: () => {
      setSelected(null);
      setLastTap(null);
      clearDragGhost();
    },
    resetAndSetup: async () => {
      setGame((draft) => {
        const cards = [
          ...draft.deck,
          ...draft.tableau.flat(),
          ...draft.foundations.flat(),
        ];
        draft.deck = shuffle(cards).map(flipToBack);
        draft.tableau = emptyPiles(pileCount);
        draft.foundations = emptyPiles(clockStart.length);
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        const deck = [...draft.deck];
        draft.foundations = clockStart.map(([rank, suit]) => [
          flipToFace(
            deck.splice(
              deck.findIndex(
                (card) => card.rank === rank && card.suit === suit,
              ),
              1,
            )[0],
          ),
        ]);
        draft.tableau = Array.from({ length: pileCount }, (_, index) =>
          deck
            .slice(index * pileSize, (index + 1) * pileSize)
            .map(flipToFace),
        );
        draft.deck = [];
      });
    },
  });

  const { width: windowWidth, height: windowHeight } = useViewportDimensions();
  const dropHitAreasRef = useRef<DropHitArea<Target>[]>([]);

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
  } = useDragDrop<Source, Target>({
    canDropOnTarget: (source, target) =>
      !game.ended && canMove(game, source, target),
    onSuccessfulDrop: (source, target) => {
      moveCard(source.pile, target);
    },
    getDroppedCardIds: (source) => {
      const card = top(game.tableau[source.pile]);
      return card ? [card.id] : [];
    },
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    getTapHandler: (source) => () => onPilePress(source.pile),
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

  function moveCard(source: number, target: Target) {
    if (game.ended || !canMove(game, { pile: source }, target)) return false;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.tableau[source].pop();
      if (!card) return;
      if (target.zone === "foundation") {
        draft.foundations[target.pile].push(card);
      } else {
        draft.tableau[target.pile].push(card);
      }
    });
    setSelected(null);
    return true;
  }

  function moveToFoundation(source: number) {
    const card = top(game.tableau[source]);
    if (!card) return false;
    const pile = game.foundations.findIndex((foundation, index) =>
      canBuildFoundation(card, foundation, index),
    );
    return pile >= 0 && moveCard(source, { zone: "foundation", pile });
  }

  function onPilePress(pile: number) {
    if (game.ended) return;
    if (!top(game.tableau[pile])) {
      if (selected !== null) moveCard(selected, { zone: "tableau", pile });
      return;
    }
    const now = Date.now();
    if (lastTap?.pile === pile && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      if (moveToFoundation(pile)) return;
    } else setLastTap({ pile, at: now });
    if (selected === null) return setSelected(pile);
    if (selected === pile) return setSelected(null);
    if (!moveCard(selected, { zone: "tableau", pile })) setSelected(pile);
  }

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => {
      // Hours run clockwise with 3 o'clock pointing right.
      const angle = (i + 1 - 3) * (Math.PI / 6);
      return {
        id: `foundation-${i}`,
        name: "foundation",
        pileIndex: i,
        cards: pile,
        col:
          Math.round((clockCenterCol + clockRadius * Math.cos(angle)) * 100) /
          100,
        row:
          Math.round(
            clockRadius *
              cardDims.aspectRatio *
              (1 + Math.sin(angle)) *
              100,
          ) / 100,
        fan: { maxVisible: 2 },
        placeholder: {},
      };
    });
    const tableauZones: MapZone[] = game.tableau.map((pile, i) => ({
      id: `tableau-${i}`,
      name: "tableau",
      pileIndex: i,
      cards: pile,
      col: i,
      row: tableauRow,
      fan: { direction: "down", offset: pileOffset(pile.length) },
      placeholder: {},
    }));
    return [
      ...foundationZones,
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: clockCenterCol,
        row: clockRadius * cardDims.aspectRatio,
        fan: { maxVisible: 3 },
      },
      ...tableauZones,
    ];
  }, [game]);

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(card.card.id) ?? false;
    const animDuration = justDroppedCardIds.current?.has(card.card.id)
      ? 0
      : undefined;

    if (card.zoneName === "tableau" && card.pileIndex !== undefined) {
      const pile = card.pileIndex;
      const isHoverTarget =
        !!dragGhost &&
        card.topOfZone &&
        hoverTarget?.zone === "tableau" &&
        hoverTarget.pile === pile;
      return {
        isDisabled: game.ended,
        isSelected: (selected === pile && card.topOfZone) || isHoverTarget,
        selectColor: isHoverTarget ? "green" : "blue",
        onPress: () => onPilePress(pile),
        isVisible: !isBeingDragged,
        animDuration,
      };
    }
    if (card.zoneName === "foundation") {
      const isHoverTarget =
        !!dragGhost &&
        card.topOfZone &&
        hoverTarget?.zone === "foundation" &&
        hoverTarget.pile === card.pileIndex;
      return {
        isSelected: isHoverTarget,
        selectColor: isHoverTarget ? "green" : "none",
        onPress: () =>
          selected !== null &&
          moveCard(selected, { zone: "foundation", pile: card.pileIndex! }),
        isVisible: !isBeingDragged,
        animDuration,
      };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "tableau" && zone.pileIndex !== undefined) {
      return {
        onPress: () => onPilePress(zone.pileIndex!),
        isDisabled: selected === null || !!dragGhost,
        isSelected:
          !!dragGhost &&
          hoverTarget?.zone === "tableau" &&
          hoverTarget.pile === zone.pileIndex,
        selectColor: "green",
      };
    }
    return {};
  };

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    fixedCols: pileCount,
    fixedRows: tableauRow + pileRows,
    gap: 0.14,
  });

  function getSourceRect(source: Source) {
    const zone = zones.find(
      (entry) => entry.name === "tableau" && entry.pileIndex === source.pile,
    );
    if (!zone) return null;
    const count = game.tableau[source.pile].length;
    const base = getZoneBasePos(zone);
    return createRect(
      base.x,
      base.y + Math.max(0, count - 1) * pileOffset(count) * cardHeight,
      cardWidth,
      cardHeight,
    );
  }

  const cardHitAreas = useMemo<CardHitArea<Source>[]>(
    () =>
      game.tableau.flatMap((pile, index) => {
        const rect = pile.length > 0 ? getSourceRect({ pile: index }) : null;
        return rect ? [{ source: { pile: index }, rect, priority: 10 }] : [];
      }),
    [cardHeight, cardWidth, game, getZoneBasePos, zones],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateBoardOffset());
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<Target>[]>(() => {
    const areas: DropHitArea<Target>[] = [];
    zones.forEach((zone) => {
      if (
        (zone.name !== "foundation" && zone.name !== "tableau") ||
        zone.pileIndex === undefined
      ) {
        return;
      }
      const base = getZoneBasePos(zone);
      const count = zone.cards?.length ?? 0;
      const height =
        zone.name === "tableau"
          ? cardHeight + Math.max(0, count - 1) * pileOffset(count) * cardHeight
          : cardHeight;
      areas.push({
        target: { zone: zone.name, pile: zone.pileIndex },
        rect: createRect(
          base.x + boardPageOffset.x,
          base.y + boardPageOffset.y,
          cardWidth,
          height,
        ),
        priority: zone.name === "foundation" ? 90 : 50 + count,
      });
    });
    return areas;
  }, [
    boardPageOffset.x,
    boardPageOffset.y,
    cardHeight,
    cardWidth,
    getZoneBasePos,
    zones,
  ]);

  dropHitAreasRef.current = dropHitAreas;

  function startGhostDrag(source: Source) {
    if (game.ended) return;
    const card = top(game.tableau[source.pile]);
    const rect = getSourceRect(source);
    if (!card || !rect) return;
    startDrag(source, [card], { x: rect.x, y: rect.y });
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map(({ source, rect }) => (
        <DragHandle
          key={`tableau-${source.pile}`}
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

  const completed = game.foundations.filter((pile, index) =>
    isComplete(pile, index),
  ).length;

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={completed}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={game.won ? "Every hour struck!" : "No moves remain."}
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
