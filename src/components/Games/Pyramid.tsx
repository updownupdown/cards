import { useMemo, useRef, useState } from "react";
import { GameMenus } from "../common/GameMenus";
import { useGameLoading } from "@/hooks/useGameLoading";
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
import { GameWrapper } from "../common/GameWrapper";

const cardsPerRow = 7;

type PyramidCard = PlayingCard & {
  row: number;
  col: number;
  removed: boolean;
};

type Selection = { zone: "pyramid"; index: number } | { zone: "waste" } | null;

type GameState = {
  pyramid: PyramidCard[];
  stock: PlayingCard[];
  waste: PlayingCard[];
};

type DragGhost = {
  source: Selection;
  card: PlayingCard;
  origin: { x: number; y: number };
};

function isCardExposed(card: PyramidCard, pyramid: PyramidCard[]) {
  if (card.removed) return false;
  if (card.row === 6) return true;

  const leftCoveredBy = pyramid.find(
    (candidate) =>
      candidate.row === card.row + 1 &&
      candidate.col === card.col &&
      !candidate.removed,
  );

  const rightCoveredBy = pyramid.find(
    (candidate) =>
      candidate.row === card.row + 1 &&
      candidate.col === card.col + 1 &&
      !candidate.removed,
  );

  return !leftCoveredBy && !rightCoveredBy;
}

function createInitialState(): GameState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const pyramid: PyramidCard[] = [];

  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      const base = deck.pop();
      if (!base) continue;
      pyramid.push({ ...base, row, col, removed: false });
    }
  }

  return {
    pyramid,
    stock: deck,
    waste: [],
  };
}

function cardValue(card: PlayingCard) {
  return RANK_VALUE[card.rank];
}

export default function Pyramid() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();

  const [game, setGame] = useState<GameState>(createInitialState);
  const [selected, setSelected] = useState<Selection>(null);
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
  const [hoverTarget, setHoverTarget] = useState<Selection>(null);
  const [boardOrigin, setBoardOrigin] = useState({ x: 0, y: 0 });

  const dragTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const boardRef = useRef<RNView | null>(null);
  const wasteRef = useRef<RNView | null>(null);
  const pyramidRefs = useRef<Record<string, RNView | null>>({});

  const removedCount = useMemo(
    () => game.pyramid.filter((card) => card.removed).length,
    [game.pyramid],
  );

  const won = removedCount === 28;

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

  function drawCard() {
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
    setSelected(null);
  }

  function getSelectionCard(selection: Selection, snapshot = game) {
    if (!selection) return null;
    if (selection.zone === "waste") {
      return snapshot.waste[snapshot.waste.length - 1] ?? null;
    }
    return snapshot.pyramid[selection.index] ?? null;
  }

  function removeSingleKing(selection: Selection) {
    if (!selection) return false;

    if (selection.zone === "waste") {
      const top = game.waste[game.waste.length - 1];
      if (!top || top.rank !== "K") return false;

      setGame((prev) => ({
        ...prev,
        waste: prev.waste.slice(0, -1),
      }));
      setSelected(null);
      return true;
    }

    const card = game.pyramid[selection.index];
    if (!card || card.rank !== "K" || !isCardExposed(card, game.pyramid)) {
      return false;
    }

    setGame((prev) => ({
      ...prev,
      pyramid: prev.pyramid.map((entry, index) =>
        index === selection.index ? { ...entry, removed: true } : entry,
      ),
    }));
    setSelected(null);
    return true;
  }

  function applyPairRemoval(first: Selection, second: Selection) {
    if (!first || !second) return false;
    if (first.zone === second.zone && first.zone === "waste") return false;

    const firstCard = getSelectionCard(first);
    const secondCard = getSelectionCard(second);
    if (!firstCard || !secondCard) return false;

    if (first.zone === "pyramid") {
      const pyramidCard = game.pyramid[first.index];
      if (
        !pyramidCard ||
        pyramidCard.removed ||
        !isCardExposed(pyramidCard, game.pyramid)
      ) {
        return false;
      }
    }

    if (second.zone === "pyramid") {
      const pyramidCard = game.pyramid[second.index];
      if (
        !pyramidCard ||
        pyramidCard.removed ||
        !isCardExposed(pyramidCard, game.pyramid)
      ) {
        return false;
      }
    }

    if (cardValue(firstCard) + cardValue(secondCard) !== 13) {
      return false;
    }

    setGame((prev) => {
      let nextPyramid = prev.pyramid;
      let nextWaste = prev.waste;

      if (first.zone === "pyramid") {
        nextPyramid = nextPyramid.map((entry, index) =>
          index === first.index ? { ...entry, removed: true } : entry,
        );
      } else {
        nextWaste = nextWaste.slice(0, -1);
      }

      if (second.zone === "pyramid") {
        nextPyramid = nextPyramid.map((entry, index) =>
          index === second.index ? { ...entry, removed: true } : entry,
        );
      } else {
        nextWaste = nextWaste.slice(0, -1);
      }

      return {
        ...prev,
        pyramid: nextPyramid,
        waste: nextWaste,
      };
    });

    setSelected(null);
    return true;
  }

  function sameSelection(a: Selection, b: Selection) {
    if (!a || !b) return a === b;
    if (a.zone !== b.zone) return false;
    if (a.zone === "waste" && b.zone === "waste") return true;
    return a.zone === "pyramid" && b.zone === "pyramid" && a.index === b.index;
  }

  function canPairSelections(
    first: Selection,
    second: Selection,
    snapshot = game,
  ) {
    if (!first || !second) return false;
    if (first.zone === second.zone && first.zone === "waste") return false;
    if (
      first.zone === second.zone &&
      first.zone === "pyramid"
      // &&
      // first.index === second.index
    ) {
      return false;
    }

    const firstCard = getSelectionCard(first, snapshot);
    const secondCard = getSelectionCard(second, snapshot);
    if (!firstCard || !secondCard) return false;

    if (first.zone === "pyramid") {
      const pyramidCard = snapshot.pyramid[first.index];
      if (
        !pyramidCard ||
        pyramidCard.removed ||
        !isCardExposed(pyramidCard, snapshot.pyramid)
      ) {
        return false;
      }
    }

    if (second.zone === "pyramid") {
      const pyramidCard = snapshot.pyramid[second.index];
      if (
        !pyramidCard ||
        pyramidCard.removed ||
        !isCardExposed(pyramidCard, snapshot.pyramid)
      ) {
        return false;
      }
    }

    return cardValue(firstCard) + cardValue(secondCard) === 13;
  }

  function onPyramidPress(index: number) {
    const card = game.pyramid[index];
    if (!card || card.removed || !isCardExposed(card, game.pyramid)) return;

    if (!selected) {
      if (!removeSingleKing({ zone: "pyramid", index })) {
        setSelected({ zone: "pyramid", index });
      }
      return;
    }

    if (selected.zone === "pyramid" && selected.index === index) {
      setSelected(null);
      return;
    }

    if (!applyPairRemoval(selected, { zone: "pyramid", index })) {
      setSelected(null);
    }
  }

  function onWastePress() {
    if (game.waste.length === 0) {
      setSelected(null);
      return;
    }

    if (!selected) {
      if (!removeSingleKing({ zone: "waste" })) {
        setSelected({ zone: "waste" });
      }
      return;
    }

    if (selected.zone === "waste") {
      setSelected(null);
      return;
    }

    if (!applyPairRemoval(selected, { zone: "waste" })) {
      setSelected(null);
    }
  }

  function startDrag(source: Selection, event: GestureResponderEvent) {
    const card = getSelectionCard(source);
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
    source: Selection,
    pageX: number,
    pageY: number,
  ) {
    const target = await findDropTarget(pageX, pageY);
    const validTarget = canPairSelections(source, target) ? target : null;
    setHoverTarget((current) =>
      sameSelection(current, validTarget) ? current : validTarget,
    );
  }

  async function findDropTarget(
    pageX: number,
    pageY: number,
  ): Promise<Selection> {
    const wasteRect = await measureNode(wasteRef.current);
    if (wasteRect && pointInRect(pageX, pageY, wasteRect)) {
      return { zone: "waste" };
    }

    const exposedCards = game.pyramid
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => !card.removed && isCardExposed(card, game.pyramid));

    const cardRects = await Promise.all(
      exposedCards.map(async ({ card, index }) => {
        const rect = await measureNode(pyramidRefs.current[card.id] ?? null);
        if (!rect) return null;
        return { index, rect };
      }),
    );

    for (const entry of cardRects) {
      if (!entry) continue;
      if (pointInRect(pageX, pageY, entry.rect)) {
        return { zone: "pyramid", index: entry.index };
      }
    }

    return null;
  }

  async function handleDrop(source: Selection, event: GestureResponderEvent) {
    const target = await findDropTarget(
      event.nativeEvent.pageX,
      event.nativeEvent.pageY,
    );
    if (!source || !target) return;
    if (!canPairSelections(source, target)) return;

    const moved = applyPairRemoval(source, target);
    if (!moved) {
      setSelected(null);
    }
  }

  function makeDragHandlers(source: Selection, onTap: () => void) {
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
        });
      },
      onPanResponderTerminate: () => {
        clearDrag();
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }).panHandlers;
  }

  const wasteTop = game.waste[game.waste.length - 1];
  const wasteDragHandlers = wasteTop
    ? makeDragHandlers({ zone: "waste" }, onWastePress)
    : null;

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
          Clear all pyramid cards by making 13.
        </Text>
        {won && <Text style={styles.winText}>You won!</Text>}

        <View style={styles.stockWasteRow}>
          <Pressable style={styles.cardSlot} onPress={drawCard}>
            {/* {game.stock.length > 0 ? (
              <Card cardsPerRow={cardsPerRow}  />
            ) : (
              <Text style={styles.slotLabel}>Stock</Text>
            )} */}
          </Pressable>

          <View
            ref={wasteRef}
            collapsable={false}
            {...(wasteDragHandlers ?? {})}
          >
            <Pressable
              style={[
                styles.cardSlot,
                selected?.zone === "waste" ? styles.selectedSlot : null,
                hoverTarget?.zone === "waste" ? styles.dropHintSlot : null,
              ]}
              onPress={onWastePress}
            >
              {wasteTop ? (
                <View
                  style={
                    dragGhost?.source?.zone === "waste"
                      ? styles.hiddenDuringDrag
                      : undefined
                  }
                >
                  <Card card={wasteTop} cardsPerRow={cardsPerRow} />
                </View>
              ) : (
                <Text style={styles.slotLabel}>Waste</Text>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.pyramidWrap}>
          {Array.from({ length: 7 }, (_, row) => {
            const rowCards = game.pyramid.filter((card) => card.row === row);

            return (
              <View key={`row-${row}`} style={styles.pyramidRow}>
                {rowCards.map((card) => {
                  const index = game.pyramid.findIndex(
                    (entry) => entry.id === card.id,
                  );
                  const exposed = isCardExposed(card, game.pyramid);
                  const isSelected =
                    selected?.zone === "pyramid" && selected.index === index;
                  const dragHandlers =
                    exposed && !card.removed
                      ? makeDragHandlers({ zone: "pyramid", index }, () =>
                          onPyramidPress(index),
                        )
                      : null;
                  const hiddenByDrag =
                    dragGhost?.source?.zone === "pyramid" &&
                    dragGhost.source.index === index;

                  return (
                    <Pressable
                      key={card.id}
                      ref={(node) => {
                        pyramidRefs.current[card.id] = node;
                      }}
                      collapsable={false}
                      onPress={() => onPyramidPress(index)}
                      style={[
                        styles.pyramidCard,
                        isSelected ? styles.selectedCard : null,
                        hoverTarget?.zone === "pyramid" &&
                        hoverTarget.index === index
                          ? styles.dropHintCard
                          : null,
                        card.removed ? styles.removedCard : null,
                        hiddenByDrag ? styles.hiddenDuringDrag : null,
                      ]}
                      disabled={card.removed || !exposed}
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
  pyramidWrap: {
    flex: 1,
    gap: 2,
    paddingTop: 4,
  },
  pyramidRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: -30,
    gap: 2,
  },
  pyramidCard: {
    opacity: 1,
    borderRadius: 8,
  },
  dropHintCard: {
    borderWidth: 2,
    borderColor: "#0f766e",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  selectedCard: {
    transform: [{ translateY: -3 }],
  },
  removedCard: {
    opacity: 0.1,
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
