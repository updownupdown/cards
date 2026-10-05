import { useStateManager } from "@/hooks/useStateManager";
import { useAutoComplete } from "@/hooks/useAutoComplete";
import { Button } from "@/components/Button/Button";
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
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
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
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  EXHAUSTED_PILE_PLACEHOLDER,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { flexStyles } from "@/styles/flexStyles";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { findClassicHint } from "@/hints/classic";
const pileCount = 12;
const pileSize = 4;
const pilesPerRow = 6;
const tableauRow = 1.2;
// Rows of height each tableau row may fan into.
const pileRows = 3.3;
const pileRowGap = 0.2;

type GameState = {
  /** Cards gathered for the deal; empty during play. */
  deck: PlayingCard[];
  tableau: PlayingCard[][];
  foundations: PlayingCard[][];
  /** A redeal is only allowed after a move since the last one. */
  canRedeal: boolean;
  ended: boolean;
  won: boolean;
};

export type CruelGameState = GameState;

type Source = { pile: number };
type Target =
  | { zone: "tableau"; pile: number }
  | { zone: "foundation"; pile: number };

function emptyPiles(count: number) {
  return Array.from({ length: count }, () => [] as PlayingCard[]);
}

const gameStateInitial: GameState = {
  deck: shuffle(createDeck()).map(flipToBack),
  tableau: emptyPiles(pileCount),
  foundations: emptyPiles(4),
  canRedeal: false,
  ended: false,
  won: false,
};

function canPlaceOnFoundation(card: PlayingCard, destinationTop?: PlayingCard) {
  if (!destinationTop) return card.rank === "A";
  return (
    destinationTop.suit === card.suit &&
    rankValue(card) === rankValue(destinationTop) + 1
  );
}

function canBuildFoundation(card: PlayingCard, pile: PlayingCard[]) {
  return canPlaceOnFoundation(card, top(pile));
}

/** Build down in suit; empty piles are never filled. */
function canBuildTableau(card: PlayingCard, pile: PlayingCard[]) {
  const pileTop = top(pile);
  return (
    !!pileTop &&
    pileTop.suit === card.suit &&
    rankValue(card) === rankValue(pileTop) - 1
  );
}

function canMove(state: GameState, source: Source, target: Target) {
  const card = top(state.tableau[source.pile]);
  if (!card) return false;
  if (target.zone === "foundation")
    return canBuildFoundation(card, state.foundations[target.pile]);
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
      state.tableau.some((_, target) =>
        canMove(state, { pile: source }, { zone: "tableau", pile: target }),
      )
    );
  });
}

/** Gather the piles in order and deal them out again in fours. */
function redealPiles(tableau: PlayingCard[][]) {
  const cards = tableau.flat();
  return Array.from({ length: pileCount }, (_, index) =>
    cards.slice(index * pileSize, (index + 1) * pileSize),
  );
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  const playing = { ended: false, won: false };
  if (isSettingUp) return playing;
  if (state.foundations.every((pile) => pile.length === 13))
    return { ended: true, won: true };
  if (state.canRedeal || hasMove(state)) return playing;
  return { ended: true, won: false };
}

function pileOffset(count: number) {
  return zoneFanOffset(count, pileRows, 0.12, cardDims.tableauOffset);
}

/**
 * Every card is on view. Moves come first; the redeal (allowed after a move)
 * only when nothing on the table helps. With no redeal left, the hint
 * searches for a win.
 */
function findCruelHint(state: GameState) {
  return findClassicHint(
    { tableau: state.tableau, foundations: state.foundations },
    {
      toFoundation: (card, pile) => canBuildFoundation(card, pile),
      toTableau: (cards, pile) =>
        cards.length === 1 && canBuildTableau(cards[0], pile),
      canLift: (pile, index) => index === pile.length - 1,
      buildQuality: (card, base) => (canBuildTableau(card, [base]) ? 2 : 0),
    },
    {
      tableau: (pile) => `tableau-${pile}`,
      foundation: (pile) => `foundation-${pile}`,
    },
    {
      stock: state.canRedeal
        ? {
            zone: "redeal",
            message: "press",
            label: i18n.t("cards:redealAction"),
          }
        : null,
      search: state.canRedeal ? undefined : "cruel",
    },
  );
}

export const cruelRules = {
  findHint: findCruelHint,
  canMove,
  canPlaceOnFoundation,
  hasMove,
  redealPiles,
  evaluateEnd,
};

export default function Cruel() {
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
        draft.foundations = emptyPiles(4);
        draft.canRedeal = false;
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        const rest: PlayingCard[] = [];
        draft.deck.forEach((card) => {
          if (card.rank === "A") {
            draft.foundations[SUITS.indexOf(card.suit)].push(flipToFace(card));
          } else {
            rest.push(flipToFace(card));
          }
        });
        draft.tableau = redealPiles([rest]);
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

  const { isAutoCompleting } = useAutoComplete({
    game,
    setGame,
    isSettingUp,
    won: game.won,
    isBlocked: game.ended || !!dragGhost,
    getSources: (state) => (state.deck.length === 0 ? state.tableau : null),
    getFoundations: (state) => state.foundations,
    canPlaceOnFoundation,
    onStart: () => {
      setSelected(null);
      setLastTap(null);
    },
  });

  useHint(() => findCruelHint(game), {
    game,
    enabled:
      !isSettingUp && !game.ended && !isAutoCompleting && !game.deck.length,
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
      draft.canRedeal = true;
    });
    setSelected(null);
    return true;
  }

  function moveToFoundation(source: number) {
    const card = top(game.tableau[source]);
    if (!card) return false;
    const pile = game.foundations.findIndex((foundation) =>
      canBuildFoundation(card, foundation),
    );
    return pile >= 0 && moveCard(source, { zone: "foundation", pile });
  }

  function onPilePress(pile: number) {
    if (game.ended || !top(game.tableau[pile])) return;
    const now = Date.now();
    if (lastTap?.pile === pile && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      if (moveToFoundation(pile)) return;
    } else setLastTap({ pile, at: now });
    if (selected === null) return setSelected(pile);
    if (selected === pile) return setSelected(null);
    if (!moveCard(selected, { zone: "tableau", pile })) setSelected(pile);
  }

  function redeal() {
    if (game.ended || !game.canRedeal) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.tableau = redealPiles(draft.tableau);
      draft.canRedeal = false;
    });
    setSelected(null);
  }

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: i,
      row: 0,
      fan: { maxVisible: 3 },
      placeholder: { iconName: "ace" },
    }));
    const tableauZones: MapZone[] = game.tableau.map((pile, i) => ({
      id: `tableau-${i}`,
      name: "tableau",
      pileIndex: i,
      cards: pile,
      col: i % pilesPerRow,
      row: tableauRow + Math.floor(i / pilesPerRow) * (pileRows + pileRowGap),
      fan: { direction: "down", offset: pileOffset(pile.length) },
      // No card is ever moved onto an empty pile.
      placeholder: pile.length === 0 ? EXHAUSTED_PILE_PLACEHOLDER : {},
    }));
    return [
      ...foundationZones,
      {
        id: "redeal",
        col: pilesPerRow - 1.75,
        row: 0,
        width: 1.75,
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
    if (zone.name === "foundation" && zone.pileIndex !== undefined) {
      return {
        onPress: () =>
          selected !== null &&
          moveCard(selected, { zone: "foundation", pile: zone.pileIndex! }),
        isDisabled: selected === null || !!dragGhost,
        isSelected:
          !!dragGhost &&
          hoverTarget?.zone === "foundation" &&
          hoverTarget.pile === zone.pileIndex,
        selectColor: "green",
      };
    }
    return {};
  };

  const { cardMap, getZoneBasePos, cardWidth, cardHeight, getZoneStylesById } =
    useCardMap({
      game,
      zones,
      cardMapper,
      zoneMapper,
      cardSize: "tableau",
      fixedCols: pilesPerRow,
      fixedRows: tableauRow + pileRows * 2 + pileRowGap,
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

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      autoCompleting={isAutoCompleting}
      winLoseMessage={
        game.won
          ? i18n.t("games:cruel.crueltyConquered")
          : i18n.t("cards:noMovesRemain")
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
        <View style={[flexStyles.colCentered, getZoneStylesById("redeal")]}>
          <Button
            text={i18n.t("cards:redealAction")}
            size="sm"
            onPress={redeal}
            fullWidth
            taller
            disabled={game.ended || !game.canRedeal}
            theme="#80262e"
            style={{ flex: 1 }}
          />
        </View>
        <View
          style={[
            pointerEventsStyles.boxNone,
            {
              ...StyleSheet.absoluteFillObject,
              zIndex: 3000,
              touchAction: "none",
              overscrollBehaviorX: "contain",
            },
          ]}
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
