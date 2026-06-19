import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { cardStyles } from "@/styles/cardStyles";
import { flexStyles } from "@/styles/flexStyles";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Button } from "../Button/Button";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import { Deck } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";
import { useZoneLayout, ZoneConfig } from "@/hooks/useZoneLayout";
import { CardPositionBuilder, getZoneGrid } from "../Cards/CardPositionBuilder";
import { AnimatedCard } from "../Cards/AnimatedCard";
import { CardSelectColor } from "../Cards/Card";
import { ZoneVisualizer } from "../Cards/ZoneVisualizer";
import { ZoneBackgrounds } from "../Cards/ZoneBackgrounds";
import { Colors } from "@/styles/styles";

const cardSize = "regular";
const cardsPerRow = 4;

type AcesUpState = {
  stock: PlayingCard[];
  piles: PlayingCard[][];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

type GameSnapshot = {
  game: AcesUpState;
};

function rankValueAcesHigh(card: PlayingCard) {
  if (card.rank === "A") return 14;
  if (card.rank === "K") return 13;
  if (card.rank === "Q") return 12;
  if (card.rank === "J") return 11;
  return Number(card.rank);
}

function topCard(pile: PlayingCard[]) {
  if (pile.length === 0) return null;
  return pile[pile.length - 1];
}

export const layoutZones: ZoneConfig[] = [
  {
    id: "stock",
    col: 0.75,
    row: 0,
    fan: { maxVisible: 3 },
    placeholder: { show: true, infoPos: "left", showCount: true, text: "Draw" },
  },
  {
    id: "discard",
    col: 2.25,
    row: 0,
    fan: { maxVisible: 3 },
    placeholder: {
      show: true,
      infoPos: "right",
      showCount: true,
      text: "Discard",
    },
  },
  ...getZoneGrid({
    idPrefix: "pile",
    length: 4,
    cols: 4,
    rowOffset: 3,
    config: {
      fan: { direction: "up", offset: 0.25 },
      placeholder: { show: true },
    },
  }),
  {
    id: "button",
    col: 0,
    row: 4.1,
    width: "full",
    height: 0.6,
  },
];

function setup(): AcesUpState {
  const stock = shuffle(createDeck({ faceUp: true }));
  const piles: PlayingCard[][] = [[], [], [], []];

  for (let i = 0; i < 4; i += 1) {
    const card = stock.shift();
    if (card) piles[i].push(card);
  }

  return {
    stock,
    piles,
    discard: [],
    ended: false,
    won: false,
  };
}

function getDiscardablePileIndexes(piles: PlayingCard[][]) {
  const tops = piles.map((pile) => topCard(pile));
  const discardable = new Set<number>();

  for (let i = 0; i < tops.length; i += 1) {
    const card = tops[i];
    if (!card) continue;

    for (let j = 0; j < tops.length; j += 1) {
      if (i === j) continue;
      const other = tops[j];
      if (!other) continue;
      if (
        other.suit === card.suit &&
        rankValueAcesHigh(other) > rankValueAcesHigh(card)
      ) {
        discardable.add(i);
      }
    }
  }

  return discardable;
}

function hasRelocateMove(piles: PlayingCard[][]) {
  const hasEmpty = piles.some((pile) => pile.length === 0);
  const nonEmptyCount = piles.filter((pile) => pile.length > 0).length;
  return hasEmpty && nonEmptyCount > 1;
}

function evaluateEndState(stock: PlayingCard[], piles: PlayingCard[][]) {
  if (stock.length > 0) return { ended: false, won: false };

  const discardable = getDiscardablePileIndexes(piles);
  const canRelocate = hasRelocateMove(piles);
  if (discardable.size > 0 || canRelocate) {
    return { ended: false, won: false };
  }

  const remainingCards = piles.flat();
  const won =
    remainingCards.length === 4 &&
    remainingCards.every((card) => card.rank === "A");
  return { ended: true, won };
}

export default function AcesUp() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const [game, setGame] = useState<AcesUpState>(setup);
  const [selectedPile, setSelectedPile] = useState<number | undefined>(
    undefined,
  );

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      setGame(previousState.game);
    }
  };

  const discardable = useMemo(
    () => getDiscardablePileIndexes(game.piles),
    [game.piles],
  );

  // Always allow dealing, for now.
  const canDeal = useMemo(() => {
    if (game.ended || game.stock.length < 4) return false;
    if (discardable.size > 0) return false;
    return true;
  }, [discardable, game.ended, game.piles, game.stock.length]);

  function reset() {
    clearHistory();
    setGame(setup());
    setSelectedPile(undefined);
  }

  async function dealFour() {
    if (game.ended || game.stock.length < 4) return;

    saveUndoState(structuredClone({ game }));

    setGame((prev) => {
      if (prev.ended || prev.stock.length < 4) return prev;

      // For now, always allow dealing
      // const blockedByDiscard = getDiscardablePileIndexes(prev.piles).size > 0;
      // if (blockedByDiscard) return prev;

      const stock = [...prev.stock];
      const piles = prev.piles.map((pile) => [...pile]);

      for (let i = 0; i < 4; i += 1) {
        const card = stock.shift();
        if (card) piles[i].push(card);
      }

      const { ended, won } = evaluateEndState(stock, piles);
      return { ...prev, stock, piles, ended, won };
    });

    setSelectedPile(undefined);
  }

  async function discardTop(pileIndex: number) {
    if (game.ended) return;
    const allowed = getDiscardablePileIndexes(game.piles);
    if (!allowed.has(pileIndex)) return;

    saveUndoState(structuredClone({ game }));

    setGame((prev) => {
      if (prev.ended) return prev;
      const allowed = getDiscardablePileIndexes(prev.piles);
      if (!allowed.has(pileIndex)) return prev;

      const piles = prev.piles.map((pile) => [...pile]);
      const discard = [...prev.discard];
      const card = piles[pileIndex].pop();
      if (!card) return prev;
      discard.push(card);

      const { ended, won } = evaluateEndState(prev.stock, piles);
      return { ...prev, piles, discard, ended, won };
    });

    setSelectedPile(undefined);
  }

  async function onPilePress(pileIndex: number) {
    if (game.ended) return;

    const piles = game.piles.map((pile) => [...pile]);
    const clickedEmptyPile = piles[pileIndex].length === 0;

    if (clickedEmptyPile) {
      if (selectedPile === undefined) return;
    } else {
      setSelectedPile(selectedPile === pileIndex ? undefined : pileIndex);
      return;
    }

    saveUndoState(structuredClone({ game }));

    setSelectedPile(undefined);

    setGame((prev) => {
      // Check if clicked an empty pile after having a card selected
      const source = piles[selectedPile];
      const target = piles[pileIndex];

      if (source.length === 0 || target.length !== 0) {
        return prev;
      }

      const moving = source.pop();
      if (!moving) return prev;
      target.push(moving);

      const { ended, won } = evaluateEndState(prev.stock, piles);
      setSelectedPile(undefined);

      return { ...prev, piles, ended, won };
    });
  }

  const hasEmptyPile = !!game.piles.find((p) => p.length === 0);

  const layoutManager = useZoneLayout({
    zones: layoutZones,
    targetRows: 5.45,
  });

  const {
    cardWidth,
    cardHeight,
    getCardPosition,
    layoutMetrics,
    getZoneStyles,
  } = layoutManager;

  // ========== Card Positions ========== //
  const cardPositions = useMemo(() => {
    const builder = new CardPositionBuilder(getCardPosition);

    builder.addDeck(game.stock, "stock", 20, "stock");
    builder.addDeck(game.discard, "discard", 1, "discard");
    game.piles.forEach((pile, pileIndex) => {
      builder.addDeck(pile, `pile-${pileIndex}`, 10, "pile");
    });
    return builder.build();
  }, [game, discardable, getCardPosition]);

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      <ZoneBackgrounds layoutManager={layoutManager} game={game} />
      {/* <ZoneVisualizer
        layoutManager={layoutManager}
        layoutMetrics={layoutMetrics}
      /> */}

      {Object.values(cardPositions).map((target) => {
        let selectColor: CardSelectColor = "none";
        let isSelected = undefined;
        // let forceOverlay = false;
        // let forceSelectColor = false;
        let isDisabled = false;
        // let isPlaceholder = false;
        let onPress: (() => void) | undefined = undefined;

        if (target.zoneId === "stock" && target.misc?.topOfDeck) {
          //  Stock pile
          onPress = dealFour;
          isDisabled = !canDeal;
        } else if (target.type === "pile" && target.misc?.topOfDeck) {
          // Piles
          const cardIndex: number | undefined = target.index;
          const pileIndex: number | undefined = Number(
            target.zoneId.split("-")[1],
          );

          if (cardIndex !== undefined && pileIndex !== undefined) {
            const pile = game.piles[pileIndex];

            isSelected = selectedPile === pileIndex;
            const canDiscard = discardable.has(pileIndex);

            onPress = () => {
              if (canDiscard) {
                discardTop(pileIndex);
              } else {
                onPilePress(pileIndex);
              }
            };

            selectColor =
              pile.length === 0 ? "blue" : canDiscard ? "green" : "blue";
            isDisabled =
              (!canDiscard && !hasEmptyPile) ||
              (pile.length === 0 && selectedPile === undefined);
          }
        }

        return (
          <AnimatedCard
            key={target.card.id}
            targetState={target}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize={cardSize}
            onPress={onPress}
            isSelected={isSelected}
            selectColor={selectColor}
            // forceOverlay={forceOverlay}
            // forceSelectColor={forceSelectColor}
            // isPlaceholder={isPlaceholder}
            isDisabled={isDisabled}
          />
        );
      })}

      {Array.from({ length: 4 }, (_, pileIndex) => {
        return (
          <Pressable
            key={`pile-${pileIndex}`}
            style={[
              getZoneStyles(`pile-${pileIndex}`),
              { zIndex: 1, borderWidth: 2, borderColor: Colors.accentBlue },
            ]}
            onPress={() => {
              onPilePress(pileIndex);
            }}
            disabled={
              game.piles[pileIndex].length !== 0 && selectedPile === undefined
            }
          />
        );
      })}

      <View style={[getZoneStyles("button")]}>
        <Button
          text="Deal"
          size="large"
          onPress={dealFour}
          fullWidth
          disabled={!canDeal}
          style={[{ height: "100%" }]}
        />
      </View>
    </GameWrapper>
  );
}
