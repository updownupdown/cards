import { useGameLoading } from "@/hooks/useGameLoading";
import { textStyles } from "@/styles/textStyles";
import { useMemo, useRef, useState } from "react";
import type { GestureResponderEvent, View as RNView } from "react-native";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card } from "../../Cards/Card";
import {
  DRAG_CAPTURE_THRESHOLD,
  DRAG_MOVE_THRESHOLD,
  RANK_VALUE,
  createDeck,
  measureNode,
  pointInRect,
  shuffle,
  type PlayingCard,
} from "../../Cards/card-utils";
import { GameWrapper } from "../../common/GameWrapper";

const cardsPerRow = 10;

type TableauCard = PlayingCard & {
  row: number;
  col: number;
  removed: boolean;
};

type GameState = {
  tableau: TableauCard[];
  stock: PlayingCard[];
  waste: PlayingCard[];
};

type DragGhost = {
  index: number;
  card: TableauCard;
  origin: { x: number; y: number };
};

function isAdjacentRank(a: PlayingCard, b: PlayingCard) {
  if (
    (a.rank === "A" && b.rank === "K") ||
    (a.rank === "K" && b.rank === "A")
  ) {
    return true;
  }

  return Math.abs(RANK_VALUE[a.rank] - RANK_VALUE[b.rank]) === 1;
}

function createInitialState(): GameState {
  const deck = shuffle(createDeck({ faceUp: true }));

  const rows = [3, 6, 9, 10];
  const tableau: TableauCard[] = [];

  rows.forEach((count, row) => {
    for (let col = 0; col < count; col += 1) {
      const base = deck.pop();
      if (!base) continue;
      tableau.push({ ...base, row, col, removed: false });
    }
  });

  const wasteSeed = deck.pop();

  return {
    tableau,
    stock: deck,
    waste: wasteSeed ? [wasteSeed] : [],
  };
}

function isExposed(card: TableauCard, tableau: TableauCard[]) {
  if (card.removed) return false;
  if (card.row === 3) return true;

  const nextRowStart = card.row === 0 ? 0 : card.row === 1 ? 3 : 9;
  const nextRowCount = card.row === 0 ? 6 : card.row === 1 ? 9 : 10;

  const leftIndex = nextRowStart + card.col;
  const rightIndex = leftIndex + 1;

  const nextRowCards = tableau
    .filter((entry) => entry.row === card.row + 1)
    .slice(0, nextRowCount);

  const left = nextRowCards[leftIndex - nextRowStart];
  const right = nextRowCards[rightIndex - nextRowStart];

  const leftBlocking = left && !left.removed;
  const rightBlocking = right && !right.removed;

  return !leftBlocking && !rightBlocking;
}

export default function TriPeaks() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();

  const [game, setGame] = useState<GameState>(createInitialState);
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
  const [isWasteDropActive, setIsWasteDropActive] = useState(false);
  const [boardOrigin, setBoardOrigin] = useState({ x: 0, y: 0 });

  const dragTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const boardRef = useRef<RNView | null>(null);
  const wasteRef = useRef<RNView | null>(null);
  const cardRefs = useRef<Record<string, RNView | null>>({});

  const removedCount = useMemo(
    () => game.tableau.filter((card) => card.removed).length,
    [game.tableau],
  );

  const won = removedCount === 28;
  const wasteTop = game.waste[game.waste.length - 1];

  function updateBoardOrigin() {
    boardRef.current?.measureInWindow((x, y) => {
      setBoardOrigin({ x, y });
    });
  }

  function resetGame() {
    setGame(createInitialState());
    setDragGhost(null);
    setIsWasteDropActive(false);
    dragTranslate.setValue({ x: 0, y: 0 });
  }

  function draw() {
    setGame((prev) => {
      if (prev.stock.length === 0) return prev;
      const nextStock = [...prev.stock];
      const drawn = nextStock.pop();
      if (!drawn) return prev;

      return {
        ...prev,
        stock: nextStock,
        waste: [...prev.waste, drawn],
      };
    });
  }

  function removeTableauCard(index: number) {
    setGame((prev) => {
      const card = prev.tableau[index];
      const top = prev.waste[prev.waste.length - 1];
      if (!card || card.removed || !top || !isExposed(card, prev.tableau)) {
        return prev;
      }
      if (!isAdjacentRank(card, top)) return prev;

      return {
        ...prev,
        tableau: prev.tableau.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, removed: true } : entry,
        ),
        waste: [...prev.waste, { ...card }],
      };
    });
  }

  function onTableauPress(index: number) {
    removeTableauCard(index);
  }

  function startDrag(index: number, event: GestureResponderEvent) {
    const card = game.tableau[index];
    if (!card || card.removed || !isExposed(card, game.tableau)) return;

    const { pageX, pageY, locationX, locationY } = event.nativeEvent;
    dragTranslate.setValue({ x: 0, y: 0 });
    setDragGhost({
      index,
      card,
      origin: {
        x: pageX - locationX,
        y: pageY - locationY,
      },
    });
  }

  function clearDrag() {
    setDragGhost(null);
    setIsWasteDropActive(false);
    dragTranslate.setValue({ x: 0, y: 0 });
  }

  function canDropToWaste(index: number, snapshot = game) {
    const card = snapshot.tableau[index];
    const top = snapshot.waste[snapshot.waste.length - 1];
    if (!card || card.removed || !top || !isExposed(card, snapshot.tableau)) {
      return false;
    }
    return isAdjacentRank(card, top);
  }

  async function updateWasteHover(index: number, pageX: number, pageY: number) {
    const wasteRect = await measureNode(wasteRef.current);
    const overWaste = !!wasteRect && pointInRect(pageX, pageY, wasteRect);
    setIsWasteDropActive(overWaste && canDropToWaste(index));
  }

  async function handleDrop(index: number, event: GestureResponderEvent) {
    const wasteRect = await measureNode(wasteRef.current);
    if (!wasteRect) return;

    if (
      pointInRect(event.nativeEvent.pageX, event.nativeEvent.pageY, wasteRect)
    ) {
      removeTableauCard(index);
    }
  }

  function makeDragHandlers(index: number) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_MOVE_THRESHOLD,
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_CAPTURE_THRESHOLD,
      onPanResponderGrant: (event) => {
        startDrag(index, event);
      },
      onPanResponderMove: (_, gesture) => {
        dragTranslate.setValue({ x: gesture.dx, y: gesture.dy });
        const sourceIndex = dragGhost?.index ?? index;
        void updateWasteHover(sourceIndex, gesture.moveX, gesture.moveY);
      },
      onPanResponderRelease: (event, gesture) => {
        const moved =
          Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_MOVE_THRESHOLD;
        if (!moved) {
          clearDrag();
          onTableauPress(index);
          return;
        }

        const sourceIndex = dragGhost?.index ?? index;
        void handleDrop(sourceIndex, event).finally(() => {
          clearDrag();
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
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={won}
      won={won}
      reset={resetGame}
      isLoaded={isLoaded}
    >
      <View
        ref={boardRef}
        onLayout={updateBoardOrigin}
        style={styles.container}
      >
        <Text style={textStyles.default}>
          Remove exposed cards adjacent to waste rank.
        </Text>
        {won && <Text style={styles.winText}>You won!</Text>}

        <View style={styles.stockWasteRow}>
          <Pressable style={styles.cardSlot} onPress={draw}>
            {/* {game.stock.length > 0 ? (
              <Card cardsPerRow={cardsPerRow}  />
            ) : (
              <Text style={styles.slotLabel}>Stock</Text>
            )} */}
          </Pressable>

          <View
            ref={wasteRef}
            collapsable={false}
            style={[
              styles.cardSlot,
              isWasteDropActive ? styles.dropHintSlot : null,
            ]}
          >
            {wasteTop ? (
              <Card card={wasteTop} cardsPerRow={cardsPerRow} />
            ) : (
              <Text style={styles.slotLabel}>Waste</Text>
            )}
          </View>
        </View>

        <View style={styles.tableauWrap}>
          {Array.from({ length: 4 }, (_, row) => {
            const rowCards = game.tableau.filter((card) => card.row === row);

            return (
              <View key={`tripeaks-row-${row}`} style={styles.tableauRow}>
                {rowCards.map((card) => {
                  const index = game.tableau.findIndex(
                    (entry) => entry.id === card.id,
                  );
                  const exposed = isExposed(card, game.tableau);
                  const hiddenByDrag = dragGhost?.index === index;
                  const dragHandlers =
                    exposed && !card.removed ? makeDragHandlers(index) : null;

                  return (
                    <Pressable
                      key={card.id}
                      ref={(node) => {
                        cardRefs.current[card.id] = node;
                      }}
                      collapsable={false}
                      onPress={() => onTableauPress(index)}
                      disabled={!exposed || card.removed}
                      style={[
                        card.removed ? styles.removedCard : null,
                        hiddenByDrag ? styles.hiddenDuringDrag : null,
                      ]}
                      {...(dragHandlers ?? {})}
                    >
                      {!card.removed ? (
                        <Card card={card} cardsPerRow={cardsPerRow} />
                      ) : (
                        <View style={styles.removedPlaceholder} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
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
            <Card card={dragGhost.card} cardsPerRow={cardsPerRow} />
          </Animated.View>
        ) : null}
      </View>
    </GameWrapper>
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
    alignItems: "center",
    justifyContent: "space-between",
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
  metaText: {
    color: "#334155",
    fontFamily: "Outfit_500Medium",
  },
  winText: {
    color: "#047857",
    fontFamily: "Outfit_600SemiBold",
  },
  stockWasteRow: {
    flexDirection: "row",
    gap: 8,
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
  slotLabel: {
    color: "#334155",
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
  },
  dropHintSlot: {
    borderColor: "#0f766e",
    borderStyle: "solid",
    borderWidth: 2,
    backgroundColor: "rgba(16, 185, 129, 0.18)",
  },
  tableauWrap: {
    flex: 1,
    gap: 2,
  },
  tableauRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: -26,
    gap: 2,
  },
  removedCard: {
    opacity: 0.08,
  },
  removedPlaceholder: {
    width: 24,
    height: 34,
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
