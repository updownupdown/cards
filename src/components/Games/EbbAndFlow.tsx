import { DragGhostCards, DragHandle } from "@/components/Cards/DragDrop";
import type { GameSettings } from "@/data/game-menu";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { useGameColors } from "@/hooks/useGameColors";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useStateManager } from "@/hooks/useStateManager";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { Icon } from "@/icons";
import { rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  sortCardsByRank,
  top,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { i18n } from "@/i18n";

const cardSize = "small";

// The Game (Steffen Benndorf) in playing cards: two piles climb, two fall, and
// at least two cards go down each turn. The Game's jump back by exactly ten
// becomes a step back of one rank in the same suit: one card for each pile top,
// just as there.
type EbbAndFlowDifficulty = GameSettings["ebbAndFlowDifficulty"];
const HAND_SIZES: Record<EbbAndFlowDifficulty, number> = {
  easy: 8,
  normal: 7,
  hard: 6,
};
const MIN_PLAYS = 2;
type Direction = "up" | "down";
const PILE_DIRECTIONS: Direction[] = ["up", "up", "down", "down"];

const GROUP_DIRECTIONS: Direction[] = ["up", "down"];
const COLS = PILE_DIRECTIONS.length;
const GAP = 0.14;
// Space between the rising and falling groups, in card widths.
const GROUP_GAP = 0.4;
const TOTAL_COLS = COLS + GROUP_GAP;
const ARROW_ROW = 0.4;
const DECK_ROW = 0;
const GROUP_PAD = 0.1;
const GROUP_ROW = 1.25;
const PILE_ROW = ARROW_ROW + GROUP_ROW;
const HAND_ROW = PILE_ROW + 1.25;

/** Column of a pile; the falling piles sit past the gap between groups. */
function pileCol(index: number) {
  return index < 2 ? index : index + GROUP_GAP;
}
// Let the played card land before the hand fills up again.
const AUTO_DRAW_DELAY = 350;

export type EbbAndFlowGameState = {
  stock: PlayingCard[];
  hand: PlayingCard[];
  /** Two rising piles, then two falling piles. */
  piles: PlayingCard[][];
  /** Cards played since the hand was last filled. */
  played: number;
  /** Fixed at the deal, so changing the difficulty waits for the next game. */
  handSize: number;
};

type Source = { cardId: string };
type Target = { pile: number };

// ========== Rules ========== //
function canPlay(card: PlayingCard, pile: PlayingCard[], direction: Direction) {
  const pileTop = top(pile);
  if (!pileTop) return true;
  const rise = rankValue(card) - rankValue(pileTop);
  const step = direction === "up" ? rise : -rise;
  return step >= 0 || (step === -1 && card.suit === pileTop.suit);
}

function canPlayOn(state: EbbAndFlowGameState, cardId: string, pile: number) {
  const card = state.hand.find((c) => c.id === cardId);
  return !!card && canPlay(card, state.piles[pile], PILE_DIRECTIONS[pile]);
}

function hasPlay(state: EbbAndFlowGameState) {
  return state.hand.some((card) =>
    state.piles.some((pile, index) =>
      canPlay(card, pile, PILE_DIRECTIONS[index]),
    ),
  );
}

/** Cards still owed this turn; once the deck is empty, a turn is one card. */
function playsOwed(state: EbbAndFlowGameState) {
  return state.stock.length > 0 ? Math.max(0, MIN_PLAYS - state.played) : 0;
}

function canDraw(state: EbbAndFlowGameState) {
  return state.stock.length > 0 && playsOwed(state) === 0;
}

function playCard(state: EbbAndFlowGameState, cardId: string, pile: number) {
  if (!canPlayOn(state, cardId, pile)) return false;
  const index = state.hand.findIndex((c) => c.id === cardId);
  const [card] = state.hand.splice(index, 1);
  state.piles[pile].push(card);
  state.played += 1;
  return true;
}

function drawHand(state: EbbAndFlowGameState) {
  while (state.hand.length < state.handSize && state.stock.length > 0) {
    state.hand.push(flipToFace(state.stock.pop()!));
  }
  sortCardsByRank(state.hand);
  state.played = 0;
}

function isWon(state: EbbAndFlowGameState) {
  return (
    state.stock.length === 0 &&
    state.hand.length === 0 &&
    state.piles.some((pile) => pile.length > 0)
  );
}

function isLost(state: EbbAndFlowGameState) {
  return state.hand.length > 0 && !hasPlay(state) && !canDraw(state);
}

function cardsLeft(state: EbbAndFlowGameState) {
  return state.stock.length + state.hand.length;
}

// ========== Deal ========== //
function emptyPiles() {
  return PILE_DIRECTIONS.map(() => [] as PlayingCard[]);
}

function createInitialState(handSize: number): EbbAndFlowGameState {
  const state: EbbAndFlowGameState = {
    stock: shuffle(createDeck()),
    hand: [],
    piles: emptyPiles(),
    played: 0,
    handSize,
  };
  drawHand(state);
  return state;
}

function gatherState(
  state: EbbAndFlowGameState,
  handSize: number,
): EbbAndFlowGameState {
  return {
    stock: shuffle(collectCards(state)).map(flipToBack),
    hand: [],
    piles: emptyPiles(),
    played: 0,
    handSize,
  };
}

const gameStateInitial = createInitialState(HAND_SIZES.normal);

function handOffset(count: number) {
  return zoneFanOffset(count, TOTAL_COLS * (1 + GAP) - GAP, 0.3, 1 + GAP);
}

export const ebbAndFlowRules = {
  HAND_SIZES,
  MIN_PLAYS,
  PILE_DIRECTIONS,
  canPlay,
  canPlayOn,
  hasPlay,
  playsOwed,
  canDraw,
  playCard,
  drawHand,
  isWon,
  isLost,
  cardsLeft,
  createInitialState,
};

// ========== Component ========== //
export default function EbbAndFlow() {
  const difficulty = useGameSettingValue("ebbAndFlowDifficulty");
  const { colorPale, colorZone } = useGameColors();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { width: windowWidth, height: windowHeight } = useViewportDimensions();
  const dropHitAreasRef = useRef<DropHitArea<Target>[]>([]);

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<EbbAndFlowGameState>({
    gameStateInitial,
    resetNonGameStates: () => {
      setSelectedId(null);
      clearDragGhost();
    },
    resetAndSetup: async () => {
      // Gather every card into the deck, then draw the first hand.
      setGame((draft) => gatherState(draft, HAND_SIZES[difficulty]));
      await delay();
      setGame((draft) => {
        drawHand(draft);
      });
    },
  });

  const won = isWon(game);
  const lost = isLost(game);
  const ended = won || lost;
  const selected = game.hand.some((c) => c.id === selectedId)
    ? selectedId
    : null;

  // With every card that must be played down and nothing left to play, the
  // only move is to draw.
  useEffect(() => {
    if (isSettingUp || !canDraw(game) || hasPlay(game)) return;
    const timer = setTimeout(() => {
      setGame((draft) => {
        if (canDraw(draft) && !hasPlay(draft)) drawHand(draft);
      });
    }, AUTO_DRAW_DELAY);
    return () => clearTimeout(timer);
  }, [game, isSettingUp, setGame]);

  function play(cardId: string, pile: number) {
    if (ended || !canPlayOn(game, cardId, pile)) return false;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      playCard(draft, cardId, pile);
    });
    setSelectedId(null);
    return true;
  }

  function draw() {
    if (ended || !canDraw(game)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      drawHand(draft);
    });
    setSelectedId(null);
  }

  function onHandTap(cardId: string) {
    if (ended) return;
    setSelectedId(selected === cardId ? null : cardId);
  }

  function onPileTap(pile: number) {
    if (selected !== null) play(selected, pile);
  }

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
      !ended && canPlayOn(game, source.cardId, target.pile),
    onSuccessfulDrop: (source, target) => {
      play(source.cardId, target.pile);
    },
    getDroppedCardIds: (source) => [source.cardId],
    getDropHitAreas: () => dropHitAreasRef.current,
    getSourceRect,
    getTapHandler: (source) => () => onHandTap(source.cardId),
  });

  const zones: MapZone[] = useMemo(() => {
    const pileZones: MapZone[] = game.piles.map((pile, index) => ({
      id: `pile-${index}`,
      name: "pile",
      pileIndex: index,
      cards: pile,
      col: pileCol(index),
      row: PILE_ROW,
      baseZIndex: 10,
      fan: { maxVisible: 2 },
      placeholder: { showCount: false, hideShadow: true },
    }));

    return [
      {
        id: "deck",
        name: "deck",
        cards: game.stock,
        col: 1.7,
        row: DECK_ROW,
        baseZIndex: 20,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:ebbAndFlow.stock"),
          infoPos: "above",
          showCount: true,
        },
      },
      {
        id: "group-up",
        col: 0,
        row: GROUP_ROW,
        width: 2,
        height: ARROW_ROW + 1,
      },
      {
        id: "group-down",
        col: pileCol(2),
        row: GROUP_ROW,
        width: 2,
        height: ARROW_ROW + 1,
      },
      ...pileZones,
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 0,
        row: HAND_ROW,
        width: TOTAL_COLS,
        baseZIndex: 40,
        fan: { direction: "right", offset: handOffset(game.hand.length) },
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const isDragged = draggedCardIds?.has(mappedCard.card.id) ?? false;
    const animDuration = justDroppedCardIds.current?.has(mappedCard.card.id)
      ? 0
      : undefined;

    if (mappedCard.zoneName === "hand") {
      return {
        isSelected: mappedCard.card.id === selected,
        selectColor: "blue",
        isVisible: !isDragged,
        animDuration,
      };
    }
    if (mappedCard.zoneName === "pile" && mappedCard.pileIndex !== undefined) {
      const pile = mappedCard.pileIndex;
      const isTarget = mappedCard.topOfZone && pileHighlighted(pile);
      return {
        onPress: () => onPileTap(pile),
        isDisabled: ended || selected === null,
        isSelected: isTarget,
        selectColor: isTarget ? "green" : "none",
        animDuration,
      };
    }
    if (mappedCard.zoneName === "deck") {
      const drawable = canDraw(game) && !ended;
      return {
        onPress: draw,
        isDisabled: !drawable,
      };
    }
    return { isDisabled: true };
  };

  /** Only the pile a dragged card hovers over is highlighted. */
  function pileHighlighted(pile: number) {
    return !!dragGhost && hoverTarget?.pile === pile;
  }

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "pile" && zone.pileIndex !== undefined) {
      const pile = zone.pileIndex;
      const isTarget = pileHighlighted(pile);
      return {
        onPress: () => onPileTap(pile),
        isDisabled: ended || selected === null,
        isSelected: isTarget,
        selectColor: isTarget ? "green" : "none",
      };
    }
    return { isDisabled: true };
  };

  const {
    cardMap,
    getZoneBasePos,
    getCardPos,
    getZoneStylesById,
    cardWidth,
    cardHeight,
  } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize,
    gap: GAP,
  });

  const groupPad = cardWidth * GROUP_PAD;
  const handZone = zones.find((zone) => zone.name === "hand");

  function getSourceRect(source: Source) {
    const index = game.hand.findIndex((c) => c.id === source.cardId);
    if (!handZone || index < 0) return null;
    const { x, y } = getCardPos(handZone, index);
    return createRect(x, y, cardWidth, cardHeight);
  }

  // Each hand card is held by the strip of it that shows; the last one whole.
  const cardHitAreas = useMemo<CardHitArea<Source>[]>(() => {
    if (!handZone || ended) return [];
    const strip = Math.min(1, handOffset(game.hand.length)) * cardWidth;
    return game.hand.map((card, index) => {
      const { x, y } = getCardPos(handZone, index);
      const isLast = index === game.hand.length - 1;
      return {
        source: { cardId: card.id },
        rect: createRect(x, y, isLast ? cardWidth : strip, cardHeight),
        priority: index,
      };
    });
  }, [cardHeight, cardWidth, ended, game.hand, getCardPos, handZone]);

  const dropHitAreas = useMemo<DropHitArea<Target>[]>(
    () =>
      zones.flatMap((zone) => {
        if (zone.name !== "pile" || zone.pileIndex === undefined) return [];
        const base = getZoneBasePos(zone);
        return [
          {
            target: { pile: zone.pileIndex },
            rect: createRect(
              base.x + boardPageOffset.x,
              base.y + boardPageOffset.y,
              cardWidth,
              cardHeight * 1.2,
            ),
            priority: zone.pileIndex,
          },
        ];
      }),
    [
      boardPageOffset.x,
      boardPageOffset.y,
      cardHeight,
      cardWidth,
      getZoneBasePos,
      zones,
    ],
  );

  dropHitAreasRef.current = dropHitAreas;

  useEffect(() => {
    const frame = requestAnimationFrame(() => updateBoardOffset());
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, cardWidth, cardHeight]);

  function startGhostDrag(source: Source) {
    if (ended) return;
    const card = game.hand.find((c) => c.id === source.cardId);
    const rect = getSourceRect(source);
    if (!card || !rect) return;
    setSelectedId(null);
    startDrag(source, [card], { x: rect.x, y: rect.y });
  }

  const interactionTargets = useMemo(
    () =>
      cardHitAreas.map(({ source, rect }) => (
        <DragHandle
          key={source.cardId}
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

  return (
    <GameWrapper
      outcome={won ? "won" : lost ? "lost" : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        won
          ? i18n.t("games:ebbAndFlow.allPlayed")
          : i18n.t("games:ebbAndFlow.stuck", { count: cardsLeft(game) })
      }
    >
      <View ref={boardRef} style={styles.board}>
        {cardMap}

        {GROUP_DIRECTIONS.map((direction) => {
          const box = getZoneStylesById(`group-${direction}`);
          return (
            <View
              key={direction}
              style={[
                pointerEventsStyles.none,
                box,
                {
                  backgroundColor: colorZone,
                  borderRadius: cardWidth * 0.12,
                  marginLeft: -groupPad,
                  width: (box.width as number) + groupPad * 2,
                  height: (box.height as number) + groupPad,
                  alignItems: "center",
                  paddingTop: cardHeight * ARROW_ROW * 0.2,
                },
              ]}
            >
              <Icon
                name={direction === "up" ? "arrow-up" : "arrow-down"}
                size={cardWidth * 0.4}
                color={rgba(colorPale, 0.7)}
              />
            </View>
          );
        })}

        <View style={[pointerEventsStyles.boxNone, styles.interactionLayer]}>
          {interactionTargets}
        </View>

        {dragGhost && (
          <DragGhostCards
            ghost={dragGhost}
            translate={dragTranslate}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize={cardSize}
            isValidDrop={hoverTarget !== null}
          />
        )}
      </View>
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    width: "100%",
    position: "relative",
    touchAction: "none",
    overscrollBehaviorX: "contain",
  },
  interactionLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3000,
    touchAction: "none",
    overscrollBehaviorX: "contain",
  },
});
