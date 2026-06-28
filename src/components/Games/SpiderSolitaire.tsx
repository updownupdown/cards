import { useGameLoading } from "@/hooks/useGameLoading";
import {
  CardHitArea,
  createRect,
  DropHitArea,
  pointInRect,
  useDragDrop,
} from "@/hooks/useDragDrop";
import { useNavigation } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import { Animated, StyleSheet, useWindowDimensions, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { Card } from "../Cards/Card";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  RANK_VALUE,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

// ─── Constants ────────────────────────────────────────────────────────────────

const CASCADE_FAN_OFFSET = 0.16;

// ─── Types ────────────────────────────────────────────────────────────────────

type GameState = {
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  completedRuns: number;
};

/**
 * Selection tracks the start of the movable same-suit run the user picked.
 * cardIndex is the index of the first card in the run within the pile.
 */
type Selection = { pileIndex: number; cardIndex: number } | null;

type MoveSource = Exclude<Selection, null>;
type DropTarget = { pileIndex: number };

// ─── Pure game logic ──────────────────────────────────────────────────────────

/**
 * Returns the sub-array of cards from startIndex that forms a valid same-suit
 * descending sequence. Returns [] if the starting card is face-down or the
 * sequence is broken.
 */
function getSameSuitRun(
  pile: PlayingCard[],
  startIndex: number,
): PlayingCard[] {
  if (startIndex < 0 || startIndex >= pile.length) return [];
  if (!pile[startIndex].faceUp) return [];

  const result: PlayingCard[] = [pile[startIndex]];
  for (let i = startIndex + 1; i < pile.length; i += 1) {
    const prev = pile[i - 1];
    const curr = pile[i];
    if (!curr.faceUp) return [];
    if (curr.suit !== prev.suit) return [];
    if (
      RANK_VALUE[prev.rank as keyof typeof RANK_VALUE] !==
      RANK_VALUE[curr.rank as keyof typeof RANK_VALUE] + 1
    )
      return [];
    result.push(curr);
  }
  return result;
}

/**
 * Find the longest same-suit descending run at the end of the pile.
 * Returns the cardIndex where that run starts, or null if the top is face-down.
 */
function getTopMovableRun(
  pile: PlayingCard[],
): { startIndex: number; cards: PlayingCard[] } | null {
  if (pile.length === 0) return null;
  if (!pile[pile.length - 1].faceUp) return null;

  let startIndex = pile.length - 1;
  while (startIndex > 0) {
    const above = pile[startIndex - 1];
    const curr = pile[startIndex];
    if (!above.faceUp) break;
    if (above.suit !== curr.suit) break;
    if (
      RANK_VALUE[above.rank as keyof typeof RANK_VALUE] !==
      RANK_VALUE[curr.rank as keyof typeof RANK_VALUE] + 1
    )
      break;
    startIndex -= 1;
  }

  return { startIndex, cards: pile.slice(startIndex) };
}

/**
 * A run (or single card) can be placed on a destination pile if:
 *  - Destination is empty (accepts any card).
 *  - OR the bottom card of the run is exactly one rank below the destination top.
 *    (Any suit — Spider allows mixed-suit builds.)
 */
function canPlaceOnPile(
  runBottom: PlayingCard,
  targetPile: PlayingCard[],
): boolean {
  if (targetPile.length === 0) return true;
  const targetTop = targetPile[targetPile.length - 1];
  return (
    RANK_VALUE[runBottom.rank as keyof typeof RANK_VALUE] + 1 ===
    RANK_VALUE[targetTop.rank as keyof typeof RANK_VALUE]
  );
}

/**
 * Remove a complete K→A same-suit run from the end of a pile (if present).
 * Returns the updated pile and whether a run was collected.
 */
function tryCollectRun(pile: PlayingCard[]): {
  pile: PlayingCard[];
  collected: boolean;
} {
  if (pile.length < 13) return { pile, collected: false };

  const run = pile.slice(-13);
  if (run[0].rank !== "K") return { pile, collected: false };

  for (let i = 0; i < run.length - 1; i += 1) {
    const curr = run[i];
    const next = run[i + 1];
    if (curr.suit !== next.suit) return { pile, collected: false };
    if (
      RANK_VALUE[curr.rank as keyof typeof RANK_VALUE] !==
      RANK_VALUE[next.rank as keyof typeof RANK_VALUE] + 1
    ) {
      return { pile, collected: false };
    }
  }

  return { pile: pile.slice(0, -13), collected: true };
}

function createInitialState(): GameState {
  // Two full decks, single suit (1-suit Spider)
  const deck = shuffle(
    createDeck({ deckCount: 2, forceSuit: "spades", faceUp: false }),
  );
  const tableau: PlayingCard[][] = Array.from({ length: 10 }, () => []);

  // Columns 0-3 get 6 cards, columns 4-9 get 5 cards (54 total dealt)
  for (let col = 0; col < 10; col += 1) {
    const count = col < 4 ? 6 : 5;
    for (let i = 0; i < count; i += 1) {
      const card = deck.pop();
      if (!card) break;
      tableau[col].push({ ...card, faceUp: i === count - 1 });
    }
  }

  return { tableau, stock: deck, completedRuns: 0 };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpiderSolitaire() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const navigation = useNavigation();

  const [game, setGame] = useState<GameState>(createInitialState);
  const [selected, setSelected] = useState<Selection>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const dropHitAreasRef = useRef<DropHitArea<DropTarget>[]>([]);

  const {
    dragGhost,
    draggedCardIds,
    hoverTargetRef,
    justDroppedCardIds,
    dragTranslate,
    boardRef,
    boardPageOffset,
    clearDragGhost,
    startDrag,
    updateBoardOffset,
    makeDragHandlers,
  } = useDragDrop<MoveSource, DropTarget>({
    findDropTarget: (pageX, pageY) => {
      const hit = [...dropHitAreasRef.current]
        .filter(({ rect }) => pointInRect(pageX, pageY, rect))
        .sort((a, b) => b.priority - a.priority)[0];
      return hit?.target ?? null;
    },
    canDropOnTarget,
    sameTarget: (a, b) => {
      if (!a || !b) return a === b;
      return a.pileIndex === b.pileIndex;
    },
    onSuccessfulDrop: (source, target) => {
      applyMove(source, target);
    },
    getDroppedCardIds: (source) =>
      getSameSuitRun(game.tableau[source.pileIndex], source.cardIndex).map(
        (c) => c.id,
      ),
  });

  // ── Derived ─────────────────────────────────────────────────────────────────

  const won = useMemo(() => game.completedRuns === 8, [game.completedRuns]);

  const canDeal = game.stock.length >= 10;

  // ── CardMap zones ───────────────────────────────────────────────────────────

  const zones: MapZone[] = useMemo(() => {
    const tableauZones: MapZone[] = game.tableau.map((pile, i) => ({
      id: `cascade-${i}`,
      name: "cascade",
      pileIndex: i,
      cards: pile,
      col: i,
      row: 0,
      baseZIndex: 10 + i,
      fan: {
        direction: "down" as const,
        offset: CASCADE_FAN_OFFSET,
        maxVisible: 104,
      },
      placeholder: { showCount: false },
    }));

    return tableauZones;
  }, [game.tableau]);

  // ── CardMap callbacks ───────────────────────────────────────────────────────

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (
      mappedCard.zoneName !== "cascade" ||
      mappedCard.pileIndex === undefined
    ) {
      return undefined;
    }

    const isBeingDragged = draggedCardIds?.has(mappedCard.card.id) ?? false;
    const animDuration =
      justDroppedCardIds.current?.has(mappedCard.card.id) === true
        ? 0
        : undefined;

    const pileIndex = mappedCard.pileIndex;
    const cardIndex = mappedCard.cardIndex;
    const isInSelectedRun =
      selected?.pileIndex === pileIndex && cardIndex >= selected.cardIndex;

    return {
      selectColor: isInSelectedRun ? "blue" : "none",
      isSelected: isInSelectedRun,
      isDisabled: !mappedCard.card.faceUp,
      isVisible: !isBeingDragged,
      animDuration: animDuration,
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "cascade" && zone.pileIndex !== undefined) {
      const pileIndex = zone.pileIndex;
      return {
        onPress: () => onPilePress(pileIndex),
        isDisabled: !!dragGhost || !selected,
        isSelected:
          selected?.pileIndex === pileIndex &&
          game.tableau[pileIndex].length === 0,
      };
    }
    return undefined;
  };

  // ── useCardMap ──────────────────────────────────────────────────────────────

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    gap: 0.18,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    paddingTop: 0.2,
    paddingBottom: 2.5,
  });

  // ── Hit areas ───────────────────────────────────────────────────────────────

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      if (zone.name !== "cascade" || zone.pileIndex === undefined) return;

      const pile = game.tableau[zone.pileIndex];
      const zoneRect = getZoneBasePos(zone);

      // Add a hit area for each valid same-suit run start
      for (let ci = 0; ci < pile.length; ci += 1) {
        const run = getSameSuitRun(pile, ci);
        if (run.length === 0) continue;
        areas.push({
          source: { pileIndex: zone.pileIndex!, cardIndex: ci },
          rect: createRect(
            zoneRect.x,
            zoneRect.y + ci * CASCADE_FAN_OFFSET * cardHeight,
            cardWidth,
            cardHeight,
          ),
          priority: 10 + ci,
        });
      }
    });

    return areas;
  }, [cardHeight, cardWidth, game, getZoneBasePos, zones]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      updateBoardOffset();
    });
    return () => cancelAnimationFrame(frame);
  }, [windowWidth, windowHeight, zones.length, cardWidth, cardHeight]);

  const dropHitAreas = useMemo<DropHitArea<DropTarget>[]>(() => {
    const areas: DropHitArea<DropTarget>[] = [];

    zones.forEach((zone) => {
      if (zone.name !== "cascade" || zone.pileIndex === undefined) return;
      const zoneRect = getZoneBasePos(zone);
      const bx = zoneRect.x + boardPageOffset.x;
      const by = zoneRect.y + boardPageOffset.y;
      const pile = game.tableau[zone.pileIndex];
      const pileHeight =
        cardHeight +
        Math.max(0, pile.length - 1) * CASCADE_FAN_OFFSET * cardHeight;
      areas.push({
        target: { pileIndex: zone.pileIndex },
        rect: createRect(bx, by, cardWidth, pileHeight),
        priority: 50 + pile.length,
      });
    });

    return areas;
  }, [
    boardPageOffset.x,
    boardPageOffset.y,
    cardHeight,
    cardWidth,
    game,
    getZoneBasePos,
    zones,
  ]);

  dropHitAreasRef.current = dropHitAreas;

  // ── Navigation ──────────────────────────────────────────────────────────────

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  // ── Game logic ──────────────────────────────────────────────────────────────

  function canDropOnTarget(source: MoveSource, target: DropTarget): boolean {
    if (source.pileIndex === target.pileIndex) return false;
    const run = getSameSuitRun(
      game.tableau[source.pileIndex],
      source.cardIndex,
    );
    if (run.length === 0) return false;
    return canPlaceOnPile(run[0], game.tableau[target.pileIndex]);
  }

  function applyMove(source: MoveSource, target: DropTarget) {
    setGame((prev) => {
      const run = getSameSuitRun(
        prev.tableau[source.pileIndex],
        source.cardIndex,
      );
      if (run.length === 0) return prev;

      const tableau = prev.tableau.map((p) => [...p]);

      // Remove run from source pile
      tableau[source.pileIndex] = tableau[source.pileIndex].slice(
        0,
        source.cardIndex,
      );

      // Reveal newly exposed face-down card
      const srcPile = tableau[source.pileIndex];
      if (srcPile.length > 0 && !srcPile[srcPile.length - 1].faceUp) {
        srcPile[srcPile.length - 1] = {
          ...srcPile[srcPile.length - 1],
          faceUp: true,
        };
      }

      // Place run on destination
      tableau[target.pileIndex] = [...tableau[target.pileIndex], ...run];

      // Check for completed K→A same-suit run
      let completedRuns = prev.completedRuns;
      const { pile: newDest, collected } = tryCollectRun(
        tableau[target.pileIndex],
      );
      if (collected) {
        completedRuns += 1;
        tableau[target.pileIndex] = newDest;
      }

      return { ...prev, tableau, completedRuns };
    });
    setSelected(null);
  }

  function dealFromStock() {
    if (!canDeal) return;
    setGame((prev) => {
      if (prev.stock.length < 10) return prev;
      const tableau = prev.tableau.map((p) => [...p]);
      const stock = [...prev.stock];
      for (let i = 0; i < 10; i += 1) {
        const card = stock.pop();
        if (!card) break;
        tableau[i].push({ ...card, faceUp: true });
      }
      return { ...prev, tableau, stock };
    });
    setSelected(null);
    clearDragGhost();
  }

  function resetGame() {
    setGame(createInitialState());
    setSelected(null);
    clearDragGhost();
  }

  // ── Drag helpers ─────────────────────────────────────────────────────────────

  function startGhostDrag(source: MoveSource, _event: GestureResponderEvent) {
    const run = getSameSuitRun(
      game.tableau[source.pileIndex],
      source.cardIndex,
    );
    if (run.length === 0) return;

    const zone = zones.find(
      (z) => z.name === "cascade" && z.pileIndex === source.pileIndex,
    );
    if (!zone) return;

    const base = getZoneBasePos(zone);
    startDrag(source, run, {
      x: base.x,
      y: base.y + source.cardIndex * CASCADE_FAN_OFFSET * cardHeight,
    });
  }

  function makeHandlers(source: MoveSource, onTap?: () => void) {
    return makeDragHandlers(source, startGhostDrag, onTap);
  }

  // ── Tap handlers ─────────────────────────────────────────────────────────────

  function onCardTap(pileIndex: number, cardIndex: number) {
    if (dragGhost) return;

    if (selected?.pileIndex === pileIndex && selected.cardIndex === cardIndex) {
      setSelected(null);
      return;
    }

    if (!selected) {
      const run = getSameSuitRun(game.tableau[pileIndex], cardIndex);
      if (run.length > 0) {
        setSelected({ pileIndex, cardIndex });
      }
      return;
    }

    const target: DropTarget = { pileIndex };
    if (canDropOnTarget(selected, target)) {
      applyMove(selected, target);
      return;
    }

    // Re-select from the tapped position
    const run = getSameSuitRun(game.tableau[pileIndex], cardIndex);
    if (run.length > 0) {
      setSelected({ pileIndex, cardIndex });
    } else {
      setSelected(null);
    }
  }

  function onPilePress(pileIndex: number) {
    if (!selected || dragGhost) return;
    const target: DropTarget = { pileIndex };
    if (canDropOnTarget(selected, target)) {
      applyMove(selected, target);
    } else {
      setSelected(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const ghostLeft = dragGhost ? dragGhost.origin.x : 0;
  const ghostTop = dragGhost ? dragGhost.origin.y : 0;

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={won}
      won={won}
      reset={resetGame}
      isLoaded={isLoaded}
    >
      <View style={styles.gameShell}>
        <View style={styles.toolbar}>
          <Text size="sm" style={styles.runsText}>
            Runs: {game.completedRuns}/8
          </Text>
          <Button
            onPress={dealFromStock}
            disabled={!canDeal || !!dragGhost}
            text={`Deal (${Math.floor(game.stock.length / 10)} left)`}
          />
          <Button onPress={resetGame} disabled={!!dragGhost} text="New game" />
        </View>

        <View ref={boardRef} style={styles.boardShell}>
          {cardMap}

          <View style={styles.interactionLayer}>
            {cardHitAreas.map((hit) => {
              const { source, rect } = hit;
              const onTap = () => onCardTap(source.pileIndex, source.cardIndex);
              return (
                <View
                  key={`c-${source.pileIndex}-${source.cardIndex}`}
                  collapsable={false}
                  style={[
                    styles.interactionTarget,
                    {
                      left: rect.x,
                      top: rect.y,
                      width: rect.width,
                      height: rect.height,
                    },
                  ]}
                  {...makeHandlers(source, onTap)}
                />
              );
            })}
          </View>

          {dragGhost && (
            <Animated.View
              style={[
                styles.ghostLayer,
                {
                  left: ghostLeft,
                  top: ghostTop,
                  transform: dragTranslate.getTranslateTransform(),
                  pointerEvents: "none",
                },
              ]}
            >
              {dragGhost.cards.map((card, i) => (
                <View
                  key={`ghost-${card.id}`}
                  style={[
                    styles.ghostCard,
                    { width: cardWidth, height: cardHeight },
                    { top: i * CASCADE_FAN_OFFSET * cardHeight, zIndex: i + 1 },
                  ]}
                >
                  <Card card={card} cardWidth={cardWidth} cardSize="small" />
                </View>
              ))}
            </Animated.View>
          )}
        </View>
      </View>
    </GameWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gameShell: {
    flex: 1,
    width: "100%",
    gap: 8,
    paddingHorizontal: 8,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  runsText: {
    flex: 1,
  },
  boardShell: {
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
    pointerEvents: "box-none",
  },
  interactionTarget: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  ghostLayer: {
    position: "absolute",
    zIndex: 4000,
    pointerEvents: "none",
  },
  ghostCard: {
    position: "absolute",
    left: 0,
    opacity: 1,
  },
});
