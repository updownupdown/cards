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
  createDeck,
  measureNode,
  pointInRect,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { textStyles } from "@/styles/textStyles";

type GameState = {
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  completedRuns: number;
};

type Selection = { pileIndex: number } | null;

type DragGhost = {
  sourcePile: number;
  card: PlayingCard;
  origin: { x: number; y: number };
};

function createInitialState(): GameState {
  const deck = shuffle(
    createDeck({ deckCount: 2, forceSuit: "spades", faceUp: false }),
  );
  const tableau: PlayingCard[][] = Array.from({ length: 10 }, () => []);

  for (let pileIndex = 0; pileIndex < 10; pileIndex += 1) {
    const count = pileIndex < 4 ? 6 : 5;
    for (let i = 0; i < count; i += 1) {
      const card = deck.pop();
      if (!card) break;
      tableau[pileIndex].push({ ...card, faceUp: i === count - 1 });
    }
  }

  return {
    tableau,
    stock: deck,
    completedRuns: 0,
  };
}

function isSingleStepDescending(moving: PlayingCard, targetTop?: PlayingCard) {
  if (!targetTop) return true;
  return RANK_VALUE[moving.rank] + 1 === RANK_VALUE[targetTop.rank];
}

function tryCollectRun(pile: PlayingCard[]) {
  if (pile.length < 13) return pile;

  const run = pile.slice(-13);
  if (run[0].rank !== "K") return pile;

  for (let i = 0; i < run.length - 1; i += 1) {
    if (RANK_VALUE[run[i].rank] !== RANK_VALUE[run[i + 1].rank] + 1) {
      return pile;
    }
  }

  return pile.slice(0, -13);
}

export default function SpiderSolitaire() {
  const [game, setGame] = useState<GameState>(createInitialState);
  const [selected, setSelected] = useState<Selection>(null);
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
  const [hoverPile, setHoverPile] = useState<number | null>(null);
  const [boardOrigin, setBoardOrigin] = useState({ x: 0, y: 0 });

  const dragTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const boardRef = useRef<RNView | null>(null);
  const pileRefs = useRef<Array<RNView | null>>([]);

  const won = useMemo(() => game.completedRuns === 8, [game.completedRuns]);

  function updateBoardOrigin() {
    boardRef.current?.measureInWindow((x, y) => {
      setBoardOrigin({ x, y });
    });
  }

  function resetGame() {
    setGame(createInitialState());
    setSelected(null);
    setDragGhost(null);
    setHoverPile(null);
    dragTranslate.setValue({ x: 0, y: 0 });
  }

  function drawFromStock() {
    if (game.stock.length < 10) return;

    setGame((prev) => {
      if (prev.stock.length < 10) return prev;

      const nextTableau = prev.tableau.map((pile) => [...pile]);
      const nextStock = [...prev.stock];

      for (let i = 0; i < 10; i += 1) {
        const drawn = nextStock.pop();
        if (!drawn) break;
        nextTableau[i].push({ ...drawn, faceUp: true });
      }

      return {
        ...prev,
        tableau: nextTableau,
        stock: nextStock,
      };
    });

    setSelected(null);
  }

  function moveTopCard(sourcePile: number, destinationPile: number) {
    setGame((prev) => {
      if (sourcePile === destinationPile) return prev;

      const sourceTop =
        prev.tableau[sourcePile][prev.tableau[sourcePile].length - 1];
      const destinationTop =
        prev.tableau[destinationPile][prev.tableau[destinationPile].length - 1];

      if (
        !sourceTop?.faceUp ||
        !isSingleStepDescending(sourceTop, destinationTop)
      ) {
        return prev;
      }

      const tableau = prev.tableau.map((entry) => [...entry]);
      const from = tableau[sourcePile];
      const to = tableau[destinationPile];
      const moving = from.pop();

      if (!moving) return prev;
      to.push(moving);

      if (from.length > 0 && !from[from.length - 1].faceUp) {
        from[from.length - 1] = {
          ...from[from.length - 1],
          faceUp: true,
        };
      }

      let completedRuns = prev.completedRuns;
      const collectedPile = tryCollectRun(to);
      if (collectedPile.length !== to.length) {
        completedRuns += 1;
        tableau[destinationPile] = collectedPile;
      }

      return {
        tableau,
        stock: prev.stock,
        completedRuns,
      };
    });
  }

  async function findDropPile(
    pageX: number,
    pageY: number,
  ): Promise<number | null> {
    const pileRects = await Promise.all(
      game.tableau.map(async (_, pileIndex) => {
        const rect = await measureNode(pileRefs.current[pileIndex] ?? null);
        if (!rect) return null;
        return { pileIndex, rect };
      }),
    );

    for (const entry of pileRects) {
      if (!entry) continue;
      if (pointInRect(pageX, pageY, entry.rect)) {
        return entry.pileIndex;
      }
    }

    return null;
  }

  function startDrag(sourcePile: number, event: GestureResponderEvent) {
    const top = game.tableau[sourcePile][game.tableau[sourcePile].length - 1];
    if (!top?.faceUp) return;

    const { pageX, pageY, locationX, locationY } = event.nativeEvent;
    dragTranslate.setValue({ x: 0, y: 0 });
    setDragGhost({
      sourcePile,
      card: top,
      origin: {
        x: pageX - locationX,
        y: pageY - locationY,
      },
    });
  }

  function clearDrag() {
    setDragGhost(null);
    setHoverPile(null);
    dragTranslate.setValue({ x: 0, y: 0 });
  }

  function canDropOnPile(
    sourcePile: number,
    destinationPile: number,
    snapshot = game,
  ) {
    if (sourcePile === destinationPile) return false;
    const sourceTop =
      snapshot.tableau[sourcePile][snapshot.tableau[sourcePile].length - 1];
    const destinationTop =
      snapshot.tableau[destinationPile][
        snapshot.tableau[destinationPile].length - 1
      ];
    return (
      !!sourceTop?.faceUp && isSingleStepDescending(sourceTop, destinationTop)
    );
  }

  async function updateHoverPile(
    sourcePile: number,
    pageX: number,
    pageY: number,
  ) {
    const targetPile = await findDropPile(pageX, pageY);
    const validPile =
      targetPile !== null && canDropOnPile(sourcePile, targetPile)
        ? targetPile
        : null;
    setHoverPile(validPile);
  }

  async function handleDrop(sourcePile: number, event: GestureResponderEvent) {
    const { pageX, pageY } = event.nativeEvent;
    const targetPile = await findDropPile(pageX, pageY);
    if (targetPile === null) return;
    if (!canDropOnPile(sourcePile, targetPile)) return;
    moveTopCard(sourcePile, targetPile);
  }

  function onPilePress(pileIndex: number) {
    const pile = game.tableau[pileIndex];
    const top = pile[pile.length - 1];

    if (!selected) {
      if (top?.faceUp) {
        setSelected({ pileIndex });
      }
      return;
    }

    if (selected.pileIndex === pileIndex) {
      setSelected(null);
      return;
    }

    moveTopCard(selected.pileIndex, pileIndex);
    setSelected(null);
  }

  function makeDragHandlers(sourcePile: number) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_MOVE_THRESHOLD,
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_CAPTURE_THRESHOLD,
      onPanResponderGrant: (event) => {
        startDrag(sourcePile, event);
      },
      onPanResponderMove: (_, gesture) => {
        dragTranslate.setValue({ x: gesture.dx, y: gesture.dy });
        const sourceForHover = dragGhost?.sourcePile ?? sourcePile;
        void updateHoverPile(sourceForHover, gesture.moveX, gesture.moveY);
      },
      onPanResponderRelease: (event, gesture) => {
        const moved =
          Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_MOVE_THRESHOLD;
        if (!moved) {
          clearDrag();
          onPilePress(sourcePile);
          return;
        }

        const sourceForDrop = dragGhost?.sourcePile ?? sourcePile;
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
        <Text style={styles.title}>Spider Solitaire</Text>
        <View style={styles.headerButtons}>
          <Pressable style={styles.button} onPress={drawFromStock}>
            <Text style={styles.buttonText}>Deal Row</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={resetGame}>
            <Text style={styles.buttonText}>New Game</Text>
          </Pressable>
        </View>
      </View>

      <Text style={textStyles.default}>
        Runs completed: {game.completedRuns}/8
      </Text>
      {won && <Text style={styles.winText}>You won!</Text>}

      <View style={styles.stockRow}>
        <View style={styles.stockSlot}>
          {game.stock.length > 0 ? (
            <Card suit="spades" rank="Back" cardsPerRow={5} isBack />
          ) : (
            <Text style={styles.slotLabel}>Empty</Text>
          )}
        </View>
        <Text style={textStyles.default}>Stock: {game.stock.length}</Text>
      </View>

      <View style={styles.tableauRow}>
        {game.tableau.map((pile, pileIndex) => {
          const pileHeight = Math.max(230, pile.length * 16 + 140);
          const isSelected = selected?.pileIndex === pileIndex;
          const topCard = pile[pile.length - 1];
          const topHandlers = topCard?.faceUp
            ? makeDragHandlers(pileIndex)
            : null;

          return (
            <Pressable
              key={`spider-pile-${pileIndex}`}
              ref={(node) => {
                pileRefs.current[pileIndex] = node;
              }}
              collapsable={false}
              onPress={() => onPilePress(pileIndex)}
              style={[
                styles.tableauPile,
                { minHeight: pileHeight },
                hoverPile === pileIndex ? styles.dropHintPile : null,
              ]}
            >
              {pile.length === 0 ? <View style={styles.emptyPileSlot} /> : null}
              {pile.map((card, cardIndex) => {
                const isTop = cardIndex === pile.length - 1;
                const hiddenByDrag =
                  isTop && dragGhost?.sourcePile === pileIndex;

                return (
                  <View
                    key={card.id}
                    style={[
                      styles.tableauCard,
                      { top: cardIndex * 16, zIndex: cardIndex + 1 },
                      isSelected && isTop ? styles.selectedCard : null,
                      hiddenByDrag ? styles.hiddenDuringDrag : null,
                    ]}
                    {...(isTop ? topHandlers : {})}
                  >
                    <Card
                      suit={card.suit}
                      rank={card.rank}
                      cardsPerRow={5}
                      isBack={!card.faceUp}
                    />
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
            cardsPerRow={5}
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: "Outfit_600SemiBold",
    color: "#1f2937",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 6,
  },
  button: {
    paddingHorizontal: 10,
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
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stockSlot: {
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.25)",
    borderStyle: "dashed",
    borderRadius: 8,
    minWidth: 32,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  slotLabel: {
    color: "#334155",
    fontSize: 10,
    fontFamily: "Outfit_500Medium",
  },
  tableauRow: {
    flex: 1,
    flexDirection: "row",
    gap: 5,
    alignItems: "flex-start",
  },
  tableauPile: {
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
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.25)",
    borderStyle: "dashed",
  },
  tableauCard: {
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
