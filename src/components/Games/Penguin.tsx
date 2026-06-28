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
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { Card } from "../Cards/Card";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  CardSuit,
  RANK_VALUE,
  SUITS,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

// ─── Constants ────────────────────────────────────────────────────────────────

const TABLEAU_FAN_OFFSET = 0.22;

// ─── Types ────────────────────────────────────────────────────────────────────

type GameState = {
  foundations: Record<CardSuit, PlayingCard[]>;
  beakRank: PlayingCard["rank"];
  tableau: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

type Selection = {
  zone: "tableau";
  pileIndex: number;
  cardIndex: number;
} | null;

type MoveSource = Exclude<Selection, null>;

type DropTarget =
  | { zone: "tableau"; pileIndex: number }
  | { zone: "foundation"; suit: CardSuit };

// ─── Pure game logic ──────────────────────────────────────────────────────────

function rankVal(rank: PlayingCard["rank"]): number {
  return RANK_VALUE[rank as keyof typeof RANK_VALUE];
}

/** Rank one step lower with wrapping (A→K, 2→A, etc.) */
function prevRankVal(rank: PlayingCard["rank"]): number {
  const v = rankVal(rank);
  return v === 1 ? 13 : v - 1;
}

/** Rank one step higher with wrapping (K→A, Q→K, etc.) */
function nextRankVal(rank: PlayingCard["rank"]): number {
  const v = rankVal(rank);
  return v === 13 ? 1 : v + 1;
}

/**
 * A card can go on a foundation pile if it is the same suit and the next
 * rank above the top card (wrapping K→A).
 */
function canPlaceOnFoundation(card: PlayingCard, pile: PlayingCard[]): boolean {
  const top = pile[pile.length - 1] ?? null;
  if (!top) return false;
  return card.suit === top.suit && rankVal(card.rank) === nextRankVal(top.rank);
}

/**
 * A card (or run bottom) can land on a tableau column if:
 *  - Empty column: card rank must equal prevRankVal(beakRank)
 *  - Non-empty: same suit and one rank lower (wrapping).
 */
function canPlaceOnTableau(
  card: PlayingCard,
  targetTop: PlayingCard | null,
  beakRank: PlayingCard["rank"],
): boolean {
  if (!targetTop) {
    return rankVal(card.rank) === prevRankVal(beakRank);
  }
  return (
    card.suit === targetTop.suit &&
    rankVal(card.rank) === prevRankVal(targetTop.rank)
  );
}

/** Returns true iff cards form a valid same-suit descending (wrapping) run. */
function isValidRun(cards: PlayingCard[]): boolean {
  if (cards.length <= 1) return true;
  for (let i = 0; i < cards.length - 1; i += 1) {
    const a = cards[i];
    const b = cards[i + 1];
    if (a.suit !== b.suit) return false;
    if (rankVal(a.rank) !== nextRankVal(b.rank)) return false;
  }
  return true;
}

function hasAnyLegalMove(state: GameState): boolean {
  for (let i = 0; i < state.tableau.length; i += 1) {
    const col = state.tableau[i];
    if (col.length === 0) continue;

    for (let ci = 0; ci < col.length; ci += 1) {
      const run = col.slice(ci);
      if (!isValidRun(run)) continue;

      // Can the run move to another column?
      for (let j = 0; j < state.tableau.length; j += 1) {
        if (i === j) continue;
        const targetTop = state.tableau[j][state.tableau[j].length - 1] ?? null;
        if (canPlaceOnTableau(run[0], targetTop, state.beakRank)) return true;
      }

      // Can the bottom card go to foundation? (only single cards)
      if (run.length === 1) {
        if (canPlaceOnFoundation(run[0], state.foundations[run[0].suit])) {
          return true;
        }
      }
    }
  }
  return false;
}

function countFoundations(
  foundations: Record<CardSuit, PlayingCard[]>,
): number {
  return SUITS.reduce((sum, s) => sum + foundations[s as CardSuit].length, 0);
}

function evaluate(state: GameState): GameState {
  if (countFoundations(state.foundations) === 52) {
    return { ...state, ended: true, won: true };
  }
  if (!hasAnyLegalMove(state)) {
    return { ...state, ended: true, won: false };
  }
  return state;
}

function createInitialState(): GameState {
  const cards = shuffle(createDeck({ faceUp: true }));
  const beak = cards.shift();
  if (!beak) {
    return {
      foundations: { clubs: [], diamonds: [], hearts: [], spades: [] },
      beakRank: "A",
      tableau: Array.from({ length: 7 }, () => []),
      ended: true,
      won: false,
    };
  }

  const foundations: Record<CardSuit, PlayingCard[]> = {
    clubs: [],
    diamonds: [],
    hearts: [],
    spades: [],
  };
  const remaining: PlayingCard[] = [];

  for (const card of [beak, ...cards]) {
    if (card.rank === beak.rank && foundations[card.suit].length === 0) {
      foundations[card.suit].push(card);
    } else {
      remaining.push(card);
    }
  }

  const tableau: PlayingCard[][] = Array.from({ length: 7 }, () => []);
  remaining.forEach((card, i) => tableau[i % 7].push(card));

  return {
    foundations,
    beakRank: beak.rank,
    tableau,
    ended: false,
    won: false,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Penguin() {
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
    sameTarget: sameDropTarget,
    onSuccessfulDrop: (source, target) => {
      applyMove(source, target);
    },
    getDroppedCardIds: (source) =>
      game.tableau[source.pileIndex].slice(source.cardIndex).map((c) => c.id),
  });

  // ── Derived ─────────────────────────────────────────────────────────────────

  const foundationCount = useMemo(
    () => countFoundations(game.foundations),
    [game.foundations],
  );

  // ── CardMap zones ───────────────────────────────────────────────────────────

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = (SUITS as readonly CardSuit[]).map(
      (suit, i) => ({
        id: `foundation-${suit}`,
        name: "foundation",
        pileIndex: i,
        cards: game.foundations[suit],
        col: i,
        row: 0,
        baseZIndex: 40,
        fan: { maxVisible: 1 },
        placeholder: {
          text: suit[0].toUpperCase(),
          infoPos: "above" as const,
        },
      }),
    );

    const tableauZones: MapZone[] = game.tableau.map((pile, i) => ({
      id: `tableau-${i}`,
      name: "tableau",
      pileIndex: i,
      cards: pile,
      col: i,
      row: 1.5,
      baseZIndex: 10 + i,
      fan: {
        direction: "down" as const,
        offset: TABLEAU_FAN_OFFSET,
        maxVisible: 52,
      },
      placeholder: { showCount: false },
    }));

    return [...foundationZones, ...tableauZones];
  }, [game]);

  // ── CardMap callbacks ───────────────────────────────────────────────────────

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const isBeingDragged = draggedCardIds?.has(mappedCard.card.id) ?? false;
    const animDuration =
      justDroppedCardIds.current?.has(mappedCard.card.id) === true
        ? 0
        : undefined;

    if (
      mappedCard.zoneName === "foundation" &&
      mappedCard.pileIndex !== undefined
    ) {
      return {
        selectColor: "green",
        isSelected: false,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
        clickThroughCards: true,
      };
    }

    if (
      mappedCard.zoneName === "tableau" &&
      mappedCard.pileIndex !== undefined
    ) {
      const pileIndex = mappedCard.pileIndex;
      const cardIndex = mappedCard.cardIndex;
      const isInSelectedRun =
        selected?.pileIndex === pileIndex && cardIndex >= selected.cardIndex;

      return {
        selectColor: isInSelectedRun ? "blue" : "none",
        isSelected: isInSelectedRun,
        isVisible: !isBeingDragged,
        animDuration: animDuration,
      };
    }

    return undefined;
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "foundation" && zone.pileIndex !== undefined) {
      const suit = SUITS[zone.pileIndex] as CardSuit;
      return {
        onPress: () => onFoundationTap(suit),
        isDisabled: !!dragGhost || !selected || selected.zone !== "tableau",
        isSelected: false,
      };
    }

    if (zone.name === "tableau" && zone.pileIndex !== undefined) {
      const pileIndex = zone.pileIndex;
      return {
        onPress: () => onEmptyTableauTap(pileIndex),
        isDisabled: !!dragGhost || !selected,
        isSelected:
          selected?.pileIndex === pileIndex &&
          selected.cardIndex === 0 &&
          game.tableau[pileIndex].length === 0,
      };
    }

    return undefined;
  };

  // ── useCardMap ──────────────────────────────────────────────────────────────

  const { cardMap, getZoneBasePos, cardWidth, cardHeight } = useCardMap({
    game,
    zones,
    gap: 0.3,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    paddingBottom: 1.2,
  });

  // ── Hit areas ───────────────────────────────────────────────────────────────

  const cardHitAreas = useMemo<CardHitArea<MoveSource>[]>(() => {
    const areas: CardHitArea<MoveSource>[] = [];

    zones.forEach((zone) => {
      if (zone.name !== "tableau" || zone.pileIndex === undefined) return;

      const pile = game.tableau[zone.pileIndex];
      const zoneRect = getZoneBasePos(zone);

      pile.forEach((_, cardIndex) => {
        const run = pile.slice(cardIndex);
        if (!isValidRun(run)) return;
        areas.push({
          source: { zone: "tableau", pileIndex: zone.pileIndex!, cardIndex },
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
      const zoneRect = getZoneBasePos(zone);
      const bx = zoneRect.x + boardPageOffset.x;
      const by = zoneRect.y + boardPageOffset.y;

      if (zone.name === "foundation" && zone.pileIndex !== undefined) {
        const suit = SUITS[zone.pileIndex] as CardSuit;
        areas.push({
          target: { zone: "foundation", suit },
          rect: createRect(bx, by, cardWidth, cardHeight),
          priority: 90,
        });
      }

      if (zone.name === "tableau" && zone.pileIndex !== undefined) {
        const pile = game.tableau[zone.pileIndex];
        const pileHeight =
          cardHeight +
          Math.max(0, pile.length - 1) * TABLEAU_FAN_OFFSET * cardHeight;
        areas.push({
          target: { zone: "tableau", pileIndex: zone.pileIndex },
          rect: createRect(bx, by, cardWidth, pileHeight),
          priority: 50 + pile.length,
        });
      }
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

  function sameDropTarget(a: DropTarget | null, b: DropTarget | null): boolean {
    if (!a || !b) return a === b;
    if (a.zone !== b.zone) return false;
    if (a.zone === "tableau" && b.zone === "tableau")
      return a.pileIndex === b.pileIndex;
    return (
      a.zone === "foundation" && b.zone === "foundation" && a.suit === b.suit
    );
  }

  function canDropOnTarget(source: MoveSource, target: DropTarget): boolean {
    const run = game.tableau[source.pileIndex].slice(source.cardIndex);
    if (run.length === 0) return false;

    if (target.zone === "foundation") {
      if (run.length !== 1) return false;
      return (
        canPlaceOnFoundation(run[0], game.foundations[run[0].suit]) &&
        run[0].suit === target.suit
      );
    }

    if (source.pileIndex === target.pileIndex) return false;

    const pile = game.tableau[target.pileIndex];
    const targetTop = pile[pile.length - 1] ?? null;
    return canPlaceOnTableau(run[0], targetTop, game.beakRank);
  }

  function applyMove(source: MoveSource, target: DropTarget) {
    setGame((prev) => {
      const run = prev.tableau[source.pileIndex].slice(source.cardIndex);
      if (run.length === 0) return prev;

      const tableau = prev.tableau.map((c) => [...c]);
      const foundations: Record<CardSuit, PlayingCard[]> = {
        clubs: [...prev.foundations.clubs],
        diamonds: [...prev.foundations.diamonds],
        hearts: [...prev.foundations.hearts],
        spades: [...prev.foundations.spades],
      };

      tableau[source.pileIndex] = tableau[source.pileIndex].slice(
        0,
        source.cardIndex,
      );

      if (target.zone === "foundation") {
        foundations[target.suit] = [...foundations[target.suit], run[0]];
      } else {
        tableau[target.pileIndex] = [...tableau[target.pileIndex], ...run];
      }

      return evaluate({ ...prev, foundations, tableau });
    });
    setSelected(null);
  }

  function resetGame() {
    setGame(createInitialState());
    setSelected(null);
    clearDragGhost();
  }

  // ── Drag helpers ─────────────────────────────────────────────────────────────

  function startGhostDrag(source: MoveSource, _event: GestureResponderEvent) {
    const run = game.tableau[source.pileIndex].slice(source.cardIndex);
    if (run.length === 0) return;

    const zone = zones.find(
      (z) => z.name === "tableau" && z.pileIndex === source.pileIndex,
    );
    if (!zone) return;

    const base = getZoneBasePos(zone);
    startDrag(source, run, {
      x: base.x,
      y: base.y + source.cardIndex * TABLEAU_FAN_OFFSET * cardHeight,
    });
  }

  function makeHandlers(source: MoveSource, onTap?: () => void) {
    return makeDragHandlers(source, startGhostDrag, onTap);
  }

  // ── Tap handlers ─────────────────────────────────────────────────────────────

  function onTableauCardTap(pileIndex: number, cardIndex: number) {
    if (dragGhost) return;

    // If tapping the active selection, deselect
    if (selected?.pileIndex === pileIndex && selected.cardIndex === cardIndex) {
      setSelected(null);
      return;
    }

    if (!selected) {
      const run = game.tableau[pileIndex].slice(cardIndex);
      if (isValidRun(run)) {
        setSelected({ zone: "tableau", pileIndex, cardIndex });
      }
      return;
    }

    // Try moving selected run to this column
    const target: DropTarget = { zone: "tableau", pileIndex };
    if (canDropOnTarget(selected, target)) {
      applyMove(selected, target);
      return;
    }

    // Re-select from the tapped card
    const run = game.tableau[pileIndex].slice(cardIndex);
    if (isValidRun(run)) {
      setSelected({ zone: "tableau", pileIndex, cardIndex });
    } else {
      setSelected(null);
    }
  }

  function onEmptyTableauTap(pileIndex: number) {
    if (!selected || dragGhost) return;
    const target: DropTarget = { zone: "tableau", pileIndex };
    if (canDropOnTarget(selected, target)) {
      applyMove(selected, target);
    } else {
      setSelected(null);
    }
  }

  function onFoundationTap(suit: CardSuit) {
    if (!selected || dragGhost) return;
    const target: DropTarget = { zone: "foundation", suit };
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
      ended={game.ended}
      won={game.won}
      reset={resetGame}
      isLoaded={isLoaded}
    >
      <View style={styles.gameShell}>
        <View ref={boardRef} style={styles.boardShell}>
          {cardMap}

          <View style={styles.interactionLayer}>
            {cardHitAreas.map((hit) => {
              const { source, rect } = hit;
              const onTap = () =>
                onTableauCardTap(source.pileIndex, source.cardIndex);

              return (
                <View
                  key={`t-${source.pileIndex}-${source.cardIndex}`}
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
                    { top: i * TABLEAU_FAN_OFFSET * cardHeight, zIndex: i + 1 },
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
