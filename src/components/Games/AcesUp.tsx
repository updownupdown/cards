import { useGameLoading } from "@/hooks/useGameLoading";
import { cardStyles } from "@/styles/cardStyles";
import { flexStyles } from "@/styles/flexStyles";
import { layoutStyles } from "@/styles/layoutStyles";
import { Colors } from "@/styles/styles";
import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useAnimations } from "../Animations/Animations";
import { Button } from "../Button/Button";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import { Deck } from "../Cards/Deck";
import { GameMenus } from "../common/GameMenus";

type AcesUpState = {
  stock: PlayingCard[];
  piles: PlayingCard[][];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
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

function setup(): AcesUpState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const piles: PlayingCard[][] = [[], [], [], []];

  for (let i = 0; i < 4; i += 1) {
    const card = deck.shift();
    if (card) piles[i].push(card);
  }

  return {
    stock: deck,
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
  const isLoaded = useGameLoading();
  const [game, setGame] = useState<AcesUpState>(setup);
  const [selectedPile, setSelectedPile] = useState<number | undefined>(
    undefined,
  );

  const { animateCards, measureRef, isAnimating, setIsAnimating } =
    useAnimations();
  const [isDiscarding, setIsDiscarding] = useState<number | undefined>(
    undefined,
  );

  const stockRef = useRef<View>(null);
  const discardRef = useRef<View>(null);
  const pileRefsCurrent = useRef<(View | null)[]>([]);
  const pileRefsNext = useRef<(View | null)[]>([]);

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
    setGame(setup());
    setSelectedPile(undefined);
  }

  async function dealFour() {
    if (game.ended || game.stock.length < 4 || isAnimating) return;
    setIsAnimating(true);

    const stockPos = await measureRef(stockRef);
    if (stockPos) {
      const stock = [...game.stock];
      const cardsToDeal = stock.slice(0, 4);
      const anims = [];

      for (let i = 0; i < 4; i += 1) {
        const pileEl = pileRefsNext.current[i];
        if (!pileEl) continue;
        const pilePos = await measureRef({ current: pileEl });
        if (pilePos) {
          anims.push({
            id: `deal-${i}`,
            cardInfo: {
              rank: cardsToDeal[i].rank,
              suit: cardsToDeal[i].suit,
              isBack: false,
              cardsPerRow: 4,
            },
            to: { ...pilePos, zIndex: 200 - i },
            from: { ...stockPos, zIndex: 200 - i },
            delay: i * 150,
            flip: "toFace" as const,
          });
        }
      }

      if (anims.length > 0) {
        await animateCards(anims);
      }
    }

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
    setIsAnimating(false);
  }

  async function discardTop(pileIndex: number) {
    if (game.ended || isAnimating) return;
    const allowed = getDiscardablePileIndexes(game.piles);
    if (!allowed.has(pileIndex)) return;

    setIsAnimating(true);

    // Avoid disappearing card flash; give animation time to kick in
    setTimeout(() => {
      setIsDiscarding(pileIndex);
    }, 10);

    const pileEl = pileRefsCurrent.current[pileIndex];
    if (pileEl) {
      const pilePos = await measureRef({ current: pileEl });
      const discardPos = await measureRef(discardRef);

      if (pilePos && discardPos) {
        const pile = game.piles[pileIndex];
        const cardToDiscard = pile[pile.length - 1];

        await animateCards([
          {
            id: `discard-${Date.now()}`,
            cardInfo: {
              rank: cardToDiscard.rank,
              suit: cardToDiscard.suit,
              isBack: false,
              cardsPerRow: 4,
            },
            flip: "toBack" as const,
            from: pilePos,
            to: discardPos,
          },
        ]);
      }
    }

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
    setIsAnimating(false);
    setIsDiscarding(undefined);
  }

  function onPilePress(pileIndex: number) {
    if (isAnimating) return;
    setGame((prev) => {
      if (prev.ended) return prev;

      const piles = prev.piles.map((pile) => [...pile]);
      const clickedEmptyPile = piles[pileIndex].length === 0;

      if (selectedPile === undefined) {
        // Select first source card
        if (!clickedEmptyPile) {
          setSelectedPile(pileIndex);
        }
        return prev;
      } else if (selectedPile === pileIndex) {
        // Unselect pile
        setSelectedPile(undefined);
        return prev;
      } else if (!clickedEmptyPile) {
        // Switch to another source card
        setSelectedPile(pileIndex);
        return prev;
      }

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

  return (
    <>
      <GameMenus
        ended={game.ended}
        won={game.won}
        reset={reset}
        isLoaded={isLoaded}
      />

      <View style={layoutStyles.gameArea}>
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.justifyEvenly,
          ]}
        >
          <Deck
            refTopNext={discardRef}
            backCount={game.discard.length}
            cardsPerRow={4}
            limitFan
            fan="horizontalRight"
            showCount
            countPosition="left"
            iconName="delete"
          />

          <Deck
            refTopCurrent={stockRef}
            backCount={game.stock.length}
            cardsPerRow={4}
            limitFan
            fan="horizontalRight"
            showCount
            countPosition="left"
            iconName="draw"
            onPress={dealFour}
            isDisabled={game.stock.length === 0 || !canDeal || isAnimating}
          />
        </View>

        <View
          style={[
            cardStyles.row,
            cardStyles.rowAlignDown,
            flexStyles.fullHeight,
            flexStyles.flex1,
          ]}
        >
          {game.piles.map((pile, idx) => {
            const isSelected = selectedPile === idx;
            const canDiscard = discardable.has(idx);

            return (
              <View key={`pile-${idx}`} style={[cardStyles.colUpwards]}>
                <Deck
                  cardsPerRow={4}
                  fan="verticalUp"
                  largeFan="progressive"
                  cards={pile}
                  hideTopCard={isDiscarding === idx}
                  refTopCurrent={(el) => {
                    pileRefsCurrent.current[idx] = el;
                  }}
                  refTopNext={(el) => {
                    pileRefsNext.current[idx] = el;
                  }}
                  onPress={() => {
                    if (canDiscard) {
                      discardTop(idx);
                    } else {
                      onPilePress(idx);
                    }
                  }}
                  selectColor={
                    pile.length === 0 ? "blue" : canDiscard ? "green" : "blue"
                  }
                  isSelected={isSelected}
                  isDisabled={
                    (!canDiscard && !hasEmptyPile) ||
                    isAnimating ||
                    (pile.length === 0 && selectedPile === undefined)
                  }
                />
              </View>
            );
          })}
        </View>

        <Button
          text="Deal"
          size="large"
          onPress={dealFour}
          fullWidth
          disabled={!canDeal || isAnimating}
        />
      </View>
    </>
  );
}
