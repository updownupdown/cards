import { useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { GestureResponderEvent, View as RNView } from "react-native";

import { Card } from "../Cards/Card";
import InfoModal from "../Modals/InfoModal";
import {
  DRAG_CAPTURE_THRESHOLD,
  DRAG_MOVE_THRESHOLD,
  RANK_VALUE,
  SUITS,
  createDeck,
  isRed,
  measureNode,
  pointInRect,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";

type GameState = {
  cascades: PlayingCard[][];
  freeCells: Array<PlayingCard | null>;
  foundations: Record<(typeof SUITS)[number], PlayingCard[]>;
};

type Selection =
  | { zone: "cascade"; pileIndex: number }
  | { zone: "free"; slotIndex: number }
  | null;

type MoveSource = Exclude<Selection, null>;

type DropTarget =
  | { zone: "cascade"; pileIndex: number }
  | { zone: "free"; slotIndex: number }
  | { zone: "foundation"; suit: (typeof SUITS)[number] };

type DragGhost = {
  source: MoveSource;
  card: PlayingCard;
  origin: { x: number; y: number };
};

function createInitialState(): GameState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const cascades: PlayingCard[][] = Array.from({ length: 8 }, () => []);

  deck.forEach((card, index) => {
    cascades[index % 8].push(card);
  });

  return {
    cascades,
    freeCells: [null, null, null, null],
    foundations: {
      clubs: [],
      diamonds: [],
      hearts: [],
      spades: [],
    },
  };
}

function cloneGame(prev: GameState): GameState {
  return {
    cascades: prev.cascades.map((entry) => [...entry]),
    freeCells: [...prev.freeCells],
    foundations: {
      clubs: [...prev.foundations.clubs],
      diamonds: [...prev.foundations.diamonds],
      hearts: [...prev.foundations.hearts],
      spades: [...prev.foundations.spades],
    },
  };
}

function canPlaceOnCascade(card: PlayingCard, destinationTop?: PlayingCard) {
  if (!destinationTop) return true;

  return (
    isRed(card.suit) !== isRed(destinationTop.suit) &&
    RANK_VALUE[card.rank] + 1 === RANK_VALUE[destinationTop.rank]
  );
}

function canPlaceOnFoundation(card: PlayingCard, destinationTop?: PlayingCard) {
  if (!destinationTop) return card.rank === "A";

  return (
    card.suit === destinationTop.suit &&
    RANK_VALUE[card.rank] === RANK_VALUE[destinationTop.rank] + 1
  );
}

export default function FreeCell() {
  const [game, setGame] = useState<GameState>(createInitialState);
  const [selected, setSelected] = useState<Selection>(null);
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);
  const [boardOrigin, setBoardOrigin] = useState({ x: 0, y: 0 });

  const dragTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const boardRef = useRef<RNView | null>(null);
  const cascadeRefs = useRef<Array<RNView | null>>([]);
  const freeRefs = useRef<Array<RNView | null>>([]);
  const foundationRefs = useRef<Record<(typeof SUITS)[number], RNView | null>>({
    clubs: null,
    diamonds: null,
    hearts: null,
    spades: null,
  });
  const cascadeTopCardRefs = useRef<Record<string, RNView | null>>({});
  const freeCardRefs = useRef<Record<number, RNView | null>>({});

  const won = useMemo(
    () => SUITS.every((suit) => game.foundations[suit].length === 13),
    [game.foundations],
  );

  function updateBoardOrigin() {
    boardRef.current?.measureInWindow((x, y) => {
      setBoardOrigin({ x, y });
    });
  }

  function resetGame() {
    setGame(createInitialState());
    setSelected(null);
    setDragGhost(null);
    setHoverTarget(null);
    dragTranslate.setValue({ x: 0, y: 0 });
  }

  function getSelectedCard(selection: Selection, snapshot = game) {
    if (!selection) return null;

    if (selection.zone === "cascade") {
      const pile = snapshot.cascades[selection.pileIndex];
      return pile[pile.length - 1] ?? null;
    }

    return snapshot.freeCells[selection.slotIndex];
  }

  function removeSelectedCard(next: GameState, selection: MoveSource) {
    if (selection.zone === "cascade") {
      const pile = next.cascades[selection.pileIndex];
      return pile.pop() ?? null;
    }

    const card = next.freeCells[selection.slotIndex];
    next.freeCells[selection.slotIndex] = null;
    return card;
  }

  function sameDropTarget(a: DropTarget | null, b: DropTarget | null) {
    if (!a || !b) return a === b;
    if (a.zone !== b.zone) return false;
    if (a.zone === "cascade" && b.zone === "cascade") {
      return a.pileIndex === b.pileIndex;
    }
    if (a.zone === "free" && b.zone === "free") {
      return a.slotIndex === b.slotIndex;
    }
    return (
      a.zone === "foundation" && b.zone === "foundation" && a.suit === b.suit
    );
  }

  function canDrop(source: MoveSource, target: DropTarget, snapshot = game) {
    const moving = getSelectedCard(source, snapshot);
    if (!moving) return false;

    if (target.zone === "cascade") {
      const destinationTop =
        snapshot.cascades[target.pileIndex][
          snapshot.cascades[target.pileIndex].length - 1
        ];
      return canPlaceOnCascade(moving, destinationTop);
    }

    if (target.zone === "free") {
      return !snapshot.freeCells[target.slotIndex];
    }

    const foundationTop =
      snapshot.foundations[target.suit][
        snapshot.foundations[target.suit].length - 1
      ];
    return canPlaceOnFoundation(moving, foundationTop);
  }

  async function findDropTarget(
    pageX: number,
    pageY: number,
  ): Promise<DropTarget | null> {
    const foundationRects = await Promise.all(
      SUITS.map(async (suit) => {
        const rect = await measureNode(foundationRefs.current[suit]);
        if (!rect) return null;
        return { suit, rect };
      }),
    );

    for (const entry of foundationRects) {
      if (!entry) continue;
      if (pointInRect(pageX, pageY, entry.rect)) {
        return { zone: "foundation", suit: entry.suit };
      }
    }

    const freeRects = await Promise.all(
      game.freeCells.map(async (_, slotIndex) => {
        const rect = await measureNode(freeRefs.current[slotIndex] ?? null);
        if (!rect) return null;
        return { slotIndex, rect };
      }),
    );

    for (const entry of freeRects) {
      if (!entry) continue;
      if (pointInRect(pageX, pageY, entry.rect)) {
        return { zone: "free", slotIndex: entry.slotIndex };
      }
    }

    const cascadeRects = await Promise.all(
      game.cascades.map(async (_, pileIndex) => {
        const rect = await measureNode(cascadeRefs.current[pileIndex] ?? null);
        if (!rect) return null;
        return { pileIndex, rect };
      }),
    );

    for (const entry of cascadeRects) {
      if (!entry) continue;
      if (pointInRect(pageX, pageY, entry.rect)) {
        return { zone: "cascade", pileIndex: entry.pileIndex };
      }
    }

    return null;
  }

  function applyMove(source: MoveSource, target: DropTarget) {
    setGame((prev) => {
      if (!canDrop(source, target, prev)) return prev;

      const next = cloneGame(prev);
      const card = removeSelectedCard(next, source);
      if (!card) return prev;

      if (target.zone === "cascade") {
        next.cascades[target.pileIndex].push(card);
      } else if (target.zone === "free") {
        next.freeCells[target.slotIndex] = card;
      } else {
        next.foundations[target.suit].push(card);
      }

      return next;
    });
  }

  function startDrag(source: MoveSource, event: GestureResponderEvent) {
    const card = getSelectedCard(source);
    if (!card) return;

    const { pageX, pageY, locationX, locationY } = event.nativeEvent;
    dragTranslate.setValue({ x: 0, y: 0 });
    setDragGhost({
      source,
      card,
      origin: {
        x: pageX - locationX,
        y: pageY - locationY,
      },
    });
  }

  function clearDrag() {
    setDragGhost(null);
    setHoverTarget(null);
    dragTranslate.setValue({ x: 0, y: 0 });
  }

  async function updateHoverTarget(
    source: MoveSource,
    pageX: number,
    pageY: number,
  ) {
    const target = await findDropTarget(pageX, pageY);
    const validTarget = target && canDrop(source, target) ? target : null;
    setHoverTarget((current) =>
      sameDropTarget(current, validTarget) ? current : validTarget,
    );
  }

  async function handleDrop(source: MoveSource, event: GestureResponderEvent) {
    const { pageX, pageY } = event.nativeEvent;
    const target = await findDropTarget(pageX, pageY);
    if (!target || !canDrop(source, target)) return;
    applyMove(source, target);
  }

  function onCascadePress(pileIndex: number) {
    const pile = game.cascades[pileIndex];

    if (!selected) {
      if (pile.length > 0) {
        setSelected({ zone: "cascade", pileIndex });
      }
      return;
    }

    const moving = getSelectedCard(selected);
    if (!moving) {
      setSelected(null);
      return;
    }

    const destinationTop = pile[pile.length - 1];
    if (!canPlaceOnCascade(moving, destinationTop)) {
      setSelected(null);
      return;
    }

    applyMove(selected, { zone: "cascade", pileIndex });
    setSelected(null);
  }

  function onFreeCellPress(slotIndex: number) {
    const slotCard = game.freeCells[slotIndex];

    if (!selected) {
      if (slotCard) {
        setSelected({ zone: "free", slotIndex });
      }
      return;
    }

    if (slotCard) {
      setSelected(null);
      return;
    }

    applyMove(selected, { zone: "free", slotIndex });
    setSelected(null);
  }

  function onFoundationPress(suit: (typeof SUITS)[number]) {
    if (!selected) return;
    applyMove(selected, { zone: "foundation", suit });
    setSelected(null);
  }

  function makeDragHandlers(source: MoveSource, onTap: () => void) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_MOVE_THRESHOLD,
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_CAPTURE_THRESHOLD,
      onPanResponderGrant: (event) => {
        startDrag(source, event);
      },
      onPanResponderMove: (_, gesture) => {
        dragTranslate.setValue({ x: gesture.dx, y: gesture.dy });
        const sourceForHover = dragGhost?.source ?? source;
        void updateHoverTarget(sourceForHover, gesture.moveX, gesture.moveY);
      },
      onPanResponderRelease: (event, gesture) => {
        const moved =
          Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_MOVE_THRESHOLD;
        if (!moved) {
          clearDrag();
          onTap();
          return;
        }

        const sourceForDrop = dragGhost?.source ?? source;
        void handleDrop(sourceForDrop, event).finally(() => {
          clearDrag();
          setSelected(null);
        });
      },
      onPanResponderTerminate: () => {
        clearDrag();
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }).panHandlers;
  }

  const ghostLeft = dragGhost ? dragGhost.origin.x - boardOrigin.x : 0;
  const ghostTop = dragGhost ? dragGhost.origin.y - boardOrigin.y : 0;

  return (
    <View ref={boardRef} onLayout={updateBoardOrigin} style={styles.container}>
      <InfoModal ended={won} won={won} />
      <View style={styles.headerRow}>
        <Text style={styles.title}>FreeCell</Text>
        <Pressable style={styles.button} onPress={resetGame}>
          <Text style={styles.buttonText}>New Game</Text>
        </Pressable>
      </View>

      {won && <Text style={styles.winText}>You won!</Text>}

      <View style={styles.topRow}>
        <View style={styles.freeRow}>
          {game.freeCells.map((card, index) => {
            const isSelected =
              selected?.zone === "free" && selected.slotIndex === index;
            const dragHandlers = card
              ? makeDragHandlers({ zone: "free", slotIndex: index }, () =>
                  onFreeCellPress(index),
                )
              : null;
            const hiddenByDrag =
              dragGhost?.source.zone === "free" &&
              dragGhost.source.slotIndex === index;

            return (
              <View
                key={`free-${index}`}
                ref={(node) => {
                  freeRefs.current[index] = node;
                  if (card) {
                    freeCardRefs.current[index] = node;
                  }
                }}
                collapsable={false}
                {...(dragHandlers ?? {})}
              >
                <Pressable
                  onPress={() => onFreeCellPress(index)}
                  style={[
                    styles.cardSlot,
                    isSelected ? styles.selectedSlot : null,
                    hoverTarget?.zone === "free" &&
                    hoverTarget.slotIndex === index
                      ? styles.dropHintSlot
                      : null,
                  ]}
                >
                  {card ? (
                    <View
                      style={hiddenByDrag ? styles.hiddenDuringDrag : undefined}
                    >
                      <Card suit={card.suit} rank={card.rank} widthRatio={9} />
                    </View>
                  ) : (
                    <Text style={styles.slotLabel}>Free</Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.foundationRow}>
          {SUITS.map((suit) => {
            const top =
              game.foundations[suit][game.foundations[suit].length - 1];

            return (
              <View
                key={suit}
                ref={(node) => {
                  foundationRefs.current[suit] = node;
                }}
                collapsable={false}
              >
                <Pressable
                  onPress={() => onFoundationPress(suit)}
                  style={[
                    styles.cardSlot,
                    hoverTarget?.zone === "foundation" &&
                    hoverTarget.suit === suit
                      ? styles.dropHintSlot
                      : null,
                  ]}
                >
                  {top ? (
                    <Card suit={top.suit} rank={top.rank} widthRatio={9} />
                  ) : (
                    <Text style={styles.slotLabel}>
                      {suit[0].toUpperCase()}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.cascadeRow}>
        {game.cascades.map((pile, pileIndex) => {
          const pileHeight = Math.max(220, pile.length * 16 + 140);
          const topCard = pile[pile.length - 1];
          const topDragHandlers = topCard
            ? makeDragHandlers({ zone: "cascade", pileIndex }, () =>
                onCascadePress(pileIndex),
              )
            : null;

          return (
            <Pressable
              key={`cascade-${pileIndex}`}
              ref={(node) => {
                cascadeRefs.current[pileIndex] = node;
              }}
              collapsable={false}
              onPress={() => onCascadePress(pileIndex)}
              style={[
                styles.cascadePile,
                { minHeight: pileHeight },
                hoverTarget?.zone === "cascade" &&
                hoverTarget.pileIndex === pileIndex
                  ? styles.dropHintPile
                  : null,
              ]}
            >
              {pile.length === 0 ? (
                <View style={[styles.cardSlot, styles.emptyPileSlot]} />
              ) : null}

              {pile.map((card, cardIndex) => {
                const isTop = cardIndex === pile.length - 1;
                const isSelected =
                  selected?.zone === "cascade" &&
                  selected.pileIndex === pileIndex;
                const hiddenByDrag =
                  isTop &&
                  dragGhost?.source.zone === "cascade" &&
                  dragGhost.source.pileIndex === pileIndex;

                return (
                  <View
                    key={card.id}
                    ref={(node) => {
                      if (isTop) {
                        cascadeTopCardRefs.current[card.id] = node;
                      }
                    }}
                    collapsable={false}
                    style={[
                      styles.cascadeCard,
                      { top: cardIndex * 16, zIndex: cardIndex + 1 },
                      isTop && isSelected ? styles.selectedCard : null,
                      hiddenByDrag ? styles.hiddenDuringDrag : null,
                    ]}
                    {...(isTop ? topDragHandlers : {})}
                  >
                    <Card suit={card.suit} rank={card.rank} widthRatio={9} />
                  </View>
                );
              })}
            </Pressable>
          );
        })}
      </View>

      {dragGhost ? (
        <Animated.View
          style={[
            styles.ghostLayer,
            {
              left: ghostLeft,
              top: ghostTop,
              transform: dragTranslate.getTranslateTransform(),
            },
          ]}
        >
          <Card
            suit={dragGhost.card.suit}
            rank={dragGhost.card.rank}
            widthRatio={9}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    paddingTop: 56,
    paddingHorizontal: 8,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: "Outfit_600SemiBold",
    color: "#1f2937",
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1d4ed8",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Outfit_500Medium",
  },
  winText: {
    color: "#047857",
    fontFamily: "Outfit_600SemiBold",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  freeRow: {
    flexDirection: "row",
    gap: 6,
  },
  foundationRow: {
    flexDirection: "row",
    gap: 6,
  },
  cardSlot: {
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.25)",
    borderStyle: "dashed",
    borderRadius: 8,
    minWidth: 36,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  selectedSlot: {
    borderColor: "#2563eb",
    borderStyle: "solid",
    borderWidth: 2,
  },
  dropHintSlot: {
    borderColor: "#0f766e",
    borderStyle: "solid",
    borderWidth: 2,
    backgroundColor: "rgba(16, 185, 129, 0.18)",
  },
  slotLabel: {
    color: "#334155",
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
  },
  cascadeRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "flex-start",
  },
  cascadePile: {
    flex: 1,
    position: "relative",
    borderRadius: 8,
  },
  dropHintPile: {
    borderWidth: 2,
    borderColor: "#0f766e",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  emptyPileSlot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 72,
  },
  cascadeCard: {
    position: "absolute",
    left: 0,
  },
  selectedCard: {
    transform: [{ translateY: -4 }],
  },
  hiddenDuringDrag: {
    opacity: 0,
  },
  ghostLayer: {
    position: "absolute",
    zIndex: 4000,
    pointerEvents: "none",
  },
});
