import { useGameLoading } from "@/hooks/useGameLoading";
import { cardStyles } from "@/styles/cardStyles";
import { flexStyles } from "@/styles/flexStyles";
import { useNavigation } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GestureResponderEvent, View as RNView } from "react-native";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "../Button/Button";
import { CardOLD } from "../Cards/CardOLD";
import {
  CardSuit,
  DRAG_CAPTURE_THRESHOLD,
  DRAG_MOVE_THRESHOLD,
  isRed,
  PlayingCard,
  RANK_VALUE,
  RANKS,
  shuffle,
  SUITS,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

type GameState = {
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  foundations: Record<CardSuit, PlayingCard[]>;
};

type Selection =
  | { zone: "waste" }
  | { zone: "tableau"; pileIndex: number; cardIndex: number }
  | { zone: "foundation"; suit: CardSuit }
  | null;

type MoveSource = Exclude<Selection, null>;

type DropTarget =
  | { zone: "tableau"; pileIndex: number }
  | { zone: "foundation"; suit: CardSuit };

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragGhost = {
  source: MoveSource;
  cards: PlayingCard[];
  origin: { x: number; y: number };
};

const TABLEAU_GAP = 18;
const DOUBLE_TAP_MS = 300;

function cloneGameState(prev: GameState): GameState {
  return {
    tableau: prev.tableau.map((pile) => [...pile]),
    stock: [...prev.stock],
    waste: [...prev.waste],
    foundations: {
      clubs: [...prev.foundations.clubs],
      diamonds: [...prev.foundations.diamonds],
      hearts: [...prev.foundations.hearts],
      spades: [...prev.foundations.spades],
    },
  };
}

function createInitialState(): GameState {
  const fullDeck = shuffle(
    SUITS.flatMap((suit) =>
      RANKS.map((rank) => ({
        id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 8)}`,
        suit,
        rank,
        faceUp: false,
      })),
    ),
  );

  const tableau: PlayingCard[][] = Array.from({ length: 7 }, () => []);
  let cursor = 0;

  for (let pile = 0; pile < 7; pile += 1) {
    for (let depth = 0; depth <= pile; depth += 1) {
      const baseCard = fullDeck[cursor++];
      tableau[pile].push({
        ...baseCard,
        faceUp: depth === pile,
      });
    }
  }

  return {
    tableau,
    stock: fullDeck.slice(cursor),
    waste: [],
    foundations: {
      clubs: [],
      diamonds: [],
      hearts: [],
      spades: [],
    },
  };
}

function canPlaceOnTableau(card: PlayingCard, destinationTop?: PlayingCard) {
  if (!destinationTop) {
    return card.rank === "K";
  }

  return (
    isRed(card.suit) !== isRed(destinationTop.suit) &&
    RANK_VALUE[card.rank] + 1 === RANK_VALUE[destinationTop.rank]
  );
}

function canPlaceOnFoundation(card: PlayingCard, destinationTop?: PlayingCard) {
  if (!destinationTop) {
    return card.rank === "A";
  }

  return (
    card.suit === destinationTop.suit &&
    RANK_VALUE[card.rank] === RANK_VALUE[destinationTop.rank] + 1
  );
}

function isValidTableauRun(cards: PlayingCard[]) {
  if (cards.length <= 1) return true;

  for (let i = 0; i < cards.length - 1; i += 1) {
    const current = cards[i];
    const next = cards[i + 1];

    if (isRed(current.suit) === isRed(next.suit)) return false;
    if (RANK_VALUE[current.rank] !== RANK_VALUE[next.rank] + 1) return false;
  }

  return true;
}

function revealLastIfNeeded(pile: PlayingCard[]) {
  if (pile.length === 0) return pile;
  const last = pile[pile.length - 1];
  if (last.faceUp) return pile;

  return [...pile.slice(0, -1), { ...last, faceUp: true }];
}

function pointInRect(pageX: number, pageY: number, rect: Rect) {
  return (
    pageX >= rect.x &&
    pageX <= rect.x + rect.width &&
    pageY >= rect.y &&
    pageY <= rect.y + rect.height
  );
}

function measureNode(node: RNView | null): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!node) {
      resolve(null);
      return;
    }

    node.measureInWindow((x, y, width, height) => {
      resolve({ x, y, width, height });
    });
  });
}

function runTiming(
  value: Animated.ValueXY,
  toValue: { x: number; y: number },
  duration = 180,
) {
  return new Promise<void>((resolve) => {
    Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => resolve());
  });
}

export default function Solitaire() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();

  const navigation = useNavigation();

  const [game, setGame] = useState<GameState>(createInitialState);
  const [history, setHistory] = useState<GameState[]>([]);
  const [selected, setSelected] = useState<Selection>(null);
  const [lastTap, setLastTap] = useState<{ key: string; at: number } | null>(
    null,
  );
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null);
  const [hoverTarget, setHoverTarget] = useState<DropTarget | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [boardOrigin, setBoardOrigin] = useState({ x: 0, y: 0 });

  const dragTranslate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const boardRef = useRef<RNView | null>(null);
  const wasteRef = useRef<RNView | null>(null);
  const foundationRefs = useRef<Record<CardSuit, RNView | null>>({
    clubs: null,
    diamonds: null,
    hearts: null,
    spades: null,
  });
  const tableauRefs = useRef<Array<RNView | null>>([]);
  const tableauCardRefs = useRef<Record<string, RNView | null>>({});

  const wasteTop = game.waste[game.waste.length - 1];

  const won = useMemo(
    () => SUITS.every((suit) => game.foundations[suit].length === 13),
    [game.foundations],
  );

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });

    return () => {
      navigation.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  function updateBoardOrigin() {
    boardRef.current?.measureInWindow((x, y) => {
      setBoardOrigin({ x, y });
    });
  }

  function clearSelection() {
    setSelected(null);
  }

  function clearDragGhost() {
    setDragGhost(null);
    setHoverTarget(null);
    dragTranslate.setValue({ x: 0, y: 0 });
  }

  function sameDropTarget(a: DropTarget | null, b: DropTarget | null) {
    if (!a || !b) return a === b;
    if (a.zone !== b.zone) return false;
    if (a.zone === "tableau" && b.zone === "tableau") {
      return a.pileIndex === b.pileIndex;
    }
    return (
      a.zone === "foundation" && b.zone === "foundation" && a.suit === b.suit
    );
  }

  function applyGameUpdate(updater: (prev: GameState) => GameState) {
    setGame((prev) => {
      const next = updater(prev);
      if (next !== prev) {
        setHistory((existing) => [prev, ...existing].slice(0, 200));
      }
      return next;
    });
  }

  function resetGame() {
    setGame(createInitialState());
    setHistory([]);
    clearSelection();
    clearDragGhost();
  }

  function undoMove() {
    setHistory((prev) => {
      if (prev.length === 0) return prev;

      const [latest, ...rest] = prev;
      setGame(latest);
      clearSelection();
      clearDragGhost();
      return rest;
    });
  }

  function getSourceCards(source: MoveSource, snapshot: GameState) {
    if (source.zone === "waste") {
      const top = snapshot.waste[snapshot.waste.length - 1];
      return top ? [top] : [];
    }

    if (source.zone === "foundation") {
      const top =
        snapshot.foundations[source.suit][
          snapshot.foundations[source.suit].length - 1
        ];
      return top ? [top] : [];
    }

    const pile = snapshot.tableau[source.pileIndex];
    const cards = pile.slice(source.cardIndex);
    if (cards.length === 0 || !cards[0].faceUp) return [];

    return cards;
  }

  function getSourceNode(source: MoveSource): RNView | null {
    if (source.zone === "waste") {
      return wasteRef.current;
    }

    if (source.zone === "foundation") {
      return foundationRefs.current[source.suit];
    }

    const card = game.tableau[source.pileIndex]?.[source.cardIndex];
    if (!card) return null;

    return tableauCardRefs.current[card.id] ?? null;
  }

  function startGhostDrag(source: MoveSource, event: GestureResponderEvent) {
    if (isAnimating) return;

    const cards = getSourceCards(source, game);
    if (cards.length === 0) return;

    if (source.zone === "tableau" && !isValidTableauRun(cards)) {
      return;
    }

    const { pageX, pageY, locationX, locationY } = event.nativeEvent;
    const provisionalOrigin = {
      x: pageX - locationX,
      y: pageY - locationY,
    };

    dragTranslate.setValue({ x: 0, y: 0 });
    setDragGhost({ source, cards, origin: provisionalOrigin });
  }

  function drawFromStock() {
    if (dragGhost || isAnimating) return;

    applyGameUpdate((prev) => {
      if (prev.stock.length > 0) {
        const top = prev.stock[prev.stock.length - 1];
        return {
          ...prev,
          stock: prev.stock.slice(0, -1),
          waste: [...prev.waste, { ...top, faceUp: true }],
        };
      }

      if (prev.waste.length === 0) {
        return prev;
      }

      return {
        ...prev,
        stock: prev.waste
          .slice()
          .reverse()
          .map((card) => ({ ...card, faceUp: false })),
        waste: [],
      };
    });

    clearSelection();
  }

  function canMoveSourceToFoundation(
    source: MoveSource,
    targetSuit: CardSuit,
    snapshot: GameState,
  ) {
    const movingCards = getSourceCards(source, snapshot);
    if (movingCards.length !== 1) return false;

    const moving = movingCards[0];

    if (source.zone === "tableau") {
      const pile = snapshot.tableau[source.pileIndex];
      if (source.cardIndex !== pile.length - 1) return false;
      if (!moving.faceUp) return false;
    }

    if (moving.suit !== targetSuit) return false;

    const targetTop =
      snapshot.foundations[targetSuit][
        snapshot.foundations[targetSuit].length - 1
      ];

    return canPlaceOnFoundation(moving, targetTop);
  }

  async function animateSourceToFoundation(
    source: MoveSource,
    targetSuit: CardSuit,
  ) {
    const sourceNode = getSourceNode(source);
    const targetNode = foundationRefs.current[targetSuit];

    const [sourceRect, targetRect] = await Promise.all([
      measureNode(sourceNode),
      measureNode(targetNode),
    ]);

    const cards = getSourceCards(source, game);

    if (!sourceRect || !targetRect || cards.length === 0) {
      return;
    }

    dragTranslate.setValue({ x: 0, y: 0 });
    setDragGhost({ source, cards: [cards[0]], origin: sourceRect });

    await runTiming(dragTranslate, {
      x: targetRect.x - sourceRect.x,
      y: targetRect.y - sourceRect.y,
    });

    clearDragGhost();
  }

  async function moveSourceToFoundation(
    source: MoveSource,
    targetSuit: CardSuit,
    options?: { animate?: boolean },
  ) {
    if (isAnimating) return;

    if (!canMoveSourceToFoundation(source, targetSuit, game)) {
      clearSelection();
      return;
    }

    if (options?.animate && !dragGhost) {
      await animateSourceToFoundation(source, targetSuit);
    }

    applyGameUpdate((prev) => {
      const next = cloneGameState(prev);
      let moving: PlayingCard | null = null;

      if (source.zone === "waste") {
        moving = next.waste[next.waste.length - 1] ?? null;
        if (!moving) return prev;
        next.waste.pop();
      } else if (source.zone === "foundation") {
        if (source.suit === targetSuit) return prev;
        moving =
          next.foundations[source.suit][
            next.foundations[source.suit].length - 1
          ] ?? null;
        if (!moving) return prev;
        next.foundations[source.suit].pop();
      } else {
        const sourcePile = next.tableau[source.pileIndex];
        if (source.cardIndex !== sourcePile.length - 1) return prev;
        moving = sourcePile[sourcePile.length - 1] ?? null;
        if (!moving || !moving.faceUp) return prev;
        sourcePile.pop();
        next.tableau[source.pileIndex] = revealLastIfNeeded(sourcePile);
      }

      if (!moving || moving.suit !== targetSuit) {
        return prev;
      }

      const targetPile = next.foundations[targetSuit];
      const top = targetPile[targetPile.length - 1];
      if (!canPlaceOnFoundation(moving, top)) {
        return prev;
      }

      targetPile.push({ ...moving, faceUp: true });
      return next;
    });

    clearSelection();
  }

  function moveSourceToTableau(source: MoveSource, destinationIndex: number) {
    if (isAnimating) return;

    applyGameUpdate((prev) => {
      const next = cloneGameState(prev);
      let movingCards: PlayingCard[] = [];

      if (source.zone === "waste") {
        const top = next.waste[next.waste.length - 1];
        if (!top) return prev;
        movingCards = [top];
        next.waste.pop();
      } else if (source.zone === "foundation") {
        const sourcePile = next.foundations[source.suit];
        const top = sourcePile[sourcePile.length - 1];
        if (!top) return prev;
        movingCards = [top];
        sourcePile.pop();
      } else {
        const sourcePile = next.tableau[source.pileIndex];
        movingCards = sourcePile.slice(source.cardIndex);

        if (movingCards.length === 0 || !movingCards[0].faceUp) {
          return prev;
        }

        if (!isValidTableauRun(movingCards)) {
          return prev;
        }

        next.tableau[source.pileIndex] = revealLastIfNeeded(
          sourcePile.slice(0, source.cardIndex),
        );
      }

      const destinationPile = next.tableau[destinationIndex];
      const destinationTop = destinationPile[destinationPile.length - 1];
      if (!canPlaceOnTableau(movingCards[0], destinationTop)) {
        return prev;
      }

      destinationPile.push(
        ...movingCards.map((card) => ({ ...card, faceUp: true })),
      );
      return next;
    });

    clearSelection();
  }

  async function tryAutoFoundation(source: MoveSource) {
    let sourceCard: PlayingCard | undefined;

    if (source.zone === "waste") {
      sourceCard = game.waste[game.waste.length - 1];
    } else if (source.zone === "foundation") {
      sourceCard =
        game.foundations[source.suit][game.foundations[source.suit].length - 1];
    } else {
      const pile = game.tableau[source.pileIndex];
      sourceCard = pile[source.cardIndex];
      if (!sourceCard?.faceUp || source.cardIndex !== pile.length - 1) {
        return;
      }
    }

    if (!sourceCard) return;
    await moveSourceToFoundation(source, sourceCard.suit, { animate: true });
  }

  function onWastePress() {
    if (!wasteTop || dragGhost || isAnimating) {
      clearSelection();
      return;
    }

    const now = Date.now();
    if (lastTap?.key === "waste" && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      void tryAutoFoundation({ zone: "waste" });
      return;
    }

    setLastTap({ key: "waste", at: now });

    if (!selected) {
      setSelected({ zone: "waste" });
      return;
    }

    clearSelection();
  }

  function onFoundationPress(suit: CardSuit) {
    if (dragGhost || isAnimating) {
      clearSelection();
      return;
    }

    const now = Date.now();
    const tapKey = `foundation-${suit}`;

    if (lastTap?.key === tapKey && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      void tryAutoFoundation({ zone: "foundation", suit });
      return;
    }

    setLastTap({ key: tapKey, at: now });

    if (!selected) {
      const pile = game.foundations[suit];
      if (pile.length > 0) {
        setSelected({ zone: "foundation", suit });
      }
      return;
    }

    void moveSourceToFoundation(selected, suit, { animate: true });
  }

  function onTableauCardPress(pileIndex: number, cardIndex: number) {
    if (dragGhost || isAnimating) {
      clearSelection();
      return;
    }

    const card = game.tableau[pileIndex][cardIndex];
    if (!card.faceUp) return;

    const now = Date.now();
    const tapKey = `tableau-${pileIndex}-${cardIndex}`;

    if (lastTap?.key === tapKey && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      void tryAutoFoundation({ zone: "tableau", pileIndex, cardIndex });
      return;
    }

    setLastTap({ key: tapKey, at: now });

    if (!selected) {
      setSelected({ zone: "tableau", pileIndex, cardIndex });
      return;
    }

    moveSourceToTableau(selected, pileIndex);
  }

  function onEmptyTableauPress(pileIndex: number) {
    if (!selected || dragGhost || isAnimating) return;
    moveSourceToTableau(selected, pileIndex);
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

    const tableauRects = await Promise.all(
      game.tableau.map(async (_, pileIndex) => {
        const rect = await measureNode(tableauRefs.current[pileIndex] ?? null);
        if (!rect) return null;
        return { pileIndex, rect };
      }),
    );

    for (const entry of tableauRects) {
      if (!entry) continue;
      if (pointInRect(pageX, pageY, entry.rect)) {
        return { zone: "tableau", pileIndex: entry.pileIndex };
      }
    }

    return null;
  }

  function canDropOnTarget(
    source: MoveSource,
    target: DropTarget,
    snapshot = game,
  ) {
    if (target.zone === "foundation") {
      return canMoveSourceToFoundation(source, target.suit, snapshot);
    }

    const movingCards = getSourceCards(source, snapshot);
    if (movingCards.length === 0) return false;
    if (source.zone === "tableau" && !isValidTableauRun(movingCards))
      return false;

    const destinationPile = snapshot.tableau[target.pileIndex];
    const destinationTop = destinationPile[destinationPile.length - 1];
    return canPlaceOnTableau(movingCards[0], destinationTop);
  }

  async function updateHoverTarget(
    source: MoveSource,
    pageX: number,
    pageY: number,
  ) {
    const target = await findDropTarget(pageX, pageY);
    const validTarget =
      target && canDropOnTarget(source, target) ? target : null;
    setHoverTarget((current) =>
      sameDropTarget(current, validTarget) ? current : validTarget,
    );
  }

  async function handleDrop(source: MoveSource, event: GestureResponderEvent) {
    const { pageX, pageY } = event.nativeEvent;
    const target = await findDropTarget(pageX, pageY);

    if (!target || !canDropOnTarget(source, target)) return;

    if (target.zone === "foundation") {
      await moveSourceToFoundation(source, target.suit);
      return;
    }

    moveSourceToTableau(source, target.pileIndex);
  }

  function makeDragHandlers(source: MoveSource, onTap?: () => void) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_MOVE_THRESHOLD,
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > DRAG_CAPTURE_THRESHOLD,
      onPanResponderGrant: (event) => {
        startGhostDrag(source, event);
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
          clearDragGhost();
          onTap?.();
          return;
        }

        const sourceForDrop = dragGhost?.source ?? source;
        void handleDrop(sourceForDrop, event).finally(() => {
          clearDragGhost();
        });
      },
      onPanResponderTerminate: () => {
        clearDragGhost();
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    }).panHandlers;
  }

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
        // style={layoutStyles.gameGrid}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.justifyEvenly,
            flexStyles.fullWidth,
          ]}
        >
          <Button
            onPress={undoMove}
            disabled={history.length === 0 || !!dragGhost || isAnimating}
            text="Undo"
          />
          <Button
            onPress={resetGame}
            disabled={!!dragGhost || isAnimating}
            text="New game"
          />
        </View>

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.justifyEvenly,
          ]}
        >
          <View style={[flexStyles.rowCentered, flexStyles.gap10]}>
            {/* <Pressable onPress={drawFromStock} style={styles.cardSlot}>
              {game.stock.length > 0 ? (
                <Deck
                  backCount={Math.min(game.stock.length, 8)}
                  cardsPerRow={7}
                />
              ) : (
                <Text style={styles.slotLabel}>Recycle</Text>
              )}
            </Pressable> */}

            <View
              ref={wasteRef}
              collapsable={false}
              {...(wasteDragHandlers ?? {})}
            >
              <Pressable
                style={[
                  styles.cardSlot,
                  selected?.zone === "waste" ? styles.selectedSlot : null,
                  dragGhost?.source.zone === "waste"
                    ? styles.draggingSlot
                    : null,
                ]}
              >
                {wasteTop ? (
                  <View
                    style={
                      dragGhost?.source.zone === "waste"
                        ? styles.hiddenDuringDrag
                        : undefined
                    }
                  >
                    <CardOLD card={wasteTop} cardsPerRow={7} />
                  </View>
                ) : (
                  <Text style={styles.slotLabel}>Waste</Text>
                )}
              </Pressable>
            </View>
          </View>

          <View
            style={[flexStyles.rowCentered, flexStyles.gap10, flexStyles.flex1]}
          >
            {SUITS.map((suit) => {
              const top =
                game.foundations[suit][game.foundations[suit].length - 1];
              const selectedFoundation =
                selected?.zone === "foundation" && selected.suit === suit;
              const foundationDragHandlers =
                top && !selectedFoundation
                  ? makeDragHandlers({ zone: "foundation", suit }, () =>
                      onFoundationPress(suit),
                    )
                  : null;

              return (
                <View
                  key={suit}
                  ref={(node) => {
                    foundationRefs.current[suit] = node;
                  }}
                  collapsable={false}
                  {...(foundationDragHandlers ?? {})}
                >
                  <Pressable
                    style={[
                      styles.cardSlot,
                      selectedFoundation ? styles.selectedSlot : null,
                      hoverTarget?.zone === "foundation" &&
                      hoverTarget.suit === suit
                        ? styles.dropHintSlot
                        : null,
                      dragGhost?.source.zone === "foundation" &&
                      dragGhost.source.suit === suit
                        ? styles.draggingSlot
                        : null,
                    ]}
                  >
                    {top ? (
                      <View
                        style={
                          dragGhost?.source.zone === "foundation" &&
                          dragGhost.source.suit === suit
                            ? styles.hiddenDuringDrag
                            : undefined
                        }
                      >
                        <CardOLD card={top} cardsPerRow={7} />
                      </View>
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

        <View style={[cardStyles.row, flexStyles.flex1]}>
          {game.tableau.map((pile, pileIndex) => {
            const pileHeight = Math.max(200, pile.length * TABLEAU_GAP + 180);

            return (
              <Pressable
                key={`pile-${pileIndex}`}
                ref={(node) => {
                  tableauRefs.current[pileIndex] = node;
                }}
                collapsable={false}
                onPress={() => onEmptyTableauPress(pileIndex)}
                style={[
                  styles.tableauPile,
                  { minHeight: pileHeight },
                  hoverTarget?.zone === "tableau" &&
                  hoverTarget.pileIndex === pileIndex
                    ? styles.dropHintPile
                    : null,
                ]}
              >
                {pile.length === 0 && (
                  <View style={[styles.emptyPileSlot, styles.cardSlot]} />
                )}

                {pile.map((card, cardIndex) => {
                  const isSelected =
                    selected?.zone === "tableau" &&
                    selected.pileIndex === pileIndex &&
                    cardIndex >= selected.cardIndex;

                  const cardSource: MoveSource = {
                    zone: "tableau",
                    pileIndex,
                    cardIndex,
                  };

                  const dragHandlers = card.faceUp
                    ? makeDragHandlers(cardSource, () =>
                        onTableauCardPress(pileIndex, cardIndex),
                      )
                    : null;

                  const hiddenByDrag =
                    dragGhost?.source.zone === "tableau" &&
                    dragGhost.source.pileIndex === pileIndex &&
                    cardIndex >= dragGhost.source.cardIndex;

                  return (
                    <View
                      key={card.id}
                      ref={(node) => {
                        tableauCardRefs.current[card.id] = node;
                      }}
                      collapsable={false}
                      style={[
                        styles.tableauCard,
                        { top: cardIndex * TABLEAU_GAP, zIndex: cardIndex },
                        isSelected ? styles.selectedCard : null,
                        hiddenByDrag ? styles.hiddenDuringDrag : null,
                      ]}
                      {...(dragHandlers ?? {})}
                    >
                      <View>
                        <CardOLD card={card} cardsPerRow={7} />
                      </View>
                    </View>
                  );
                })}
              </Pressable>
            );
          })}
        </View>

        {dragGhost && (
          <Animated.View
            style={[
              styles.ghostLayer,
              styles.ghostNoPointerEvents,
              {
                left: ghostLeft,
                top: ghostTop,
                transform: dragTranslate.getTranslateTransform(),
              },
            ]}
          >
            {dragGhost.cards.map((card, index) => (
              <View
                key={`ghost-${card.id}`}
                style={[
                  styles.ghostCard,
                  { top: index * TABLEAU_GAP, zIndex: index + 1 },
                ]}
              >
                <CardOLD card={card} cardsPerRow={7} />
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
  stockWasteRow: {
    flexDirection: "row",
    gap: 8,
  },
  cardSlot: {
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.25)",
    borderStyle: "dashed",
    borderRadius: 8,
    minWidth: 44,
    minHeight: 64,
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
  draggingSlot: {
    opacity: 0.7,
    borderColor: "#7c3aed",
    borderStyle: "solid",
    borderWidth: 2,
  },
  slotLabel: {
    color: "#334155",
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
  },
  tableauScrollContent: {
    paddingBottom: 20,
  },
  tableauPile: {
    width: 52,
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
  tableauCard: {
    position: "absolute",
    left: 0,
  },
  selectedCard: {
    transform: [{ translateY: -6 }],
  },
  ghostLayer: {
    position: "absolute",
    zIndex: 4000,
  },
  ghostNoPointerEvents: {
    pointerEvents: "none",
  },
  ghostCard: {
    position: "absolute",
    left: 0,
    opacity: 0.75,
  },
  hiddenDuringDrag: {
    opacity: 0,
    pointerEvents: "none",
  },
});
