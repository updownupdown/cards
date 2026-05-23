import { cardStyles } from "@/styles/cardStyles";
import { flexStyles, layoutStyles } from "@/styles/layoutStyles";
import { textStyles } from "@/styles/textStyles";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "../Button/Button";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { Deck } from "../Cards/Deck";
import { GameHeader } from "../common/GameHeader";
import { MessageBox } from "../common/MessageBox";

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
  const [game, setGame] = useState<AcesUpState>(setup);
  const [selectedPile, setSelectedPile] = useState<number | null>(null);
  const [message, setMessage] = useState(
    "Discard lower cards of same suit, move cards to empty piles, then deal when blocked.",
  );

  const discardable = useMemo(
    () => getDiscardablePileIndexes(game.piles),
    [game.piles],
  );

  // For now, always allow dealing
  // const canDeal = useMemo(() => {
  //   if (game.ended || game.stock.length < 4) return false;
  //   if (discardable.size > 0) return false;
  //   return true;
  // }, [discardable, game.ended, game.piles, game.stock.length]);

  function reset() {
    setGame(setup());
    setSelectedPile(null);
    setMessage(
      "Discard lower cards of same suit, move cards to empty piles, then deal when blocked.",
    );
  }

  function dealFour() {
    setGame((prev) => {
      if (prev.ended || prev.stock.length < 4) return prev;

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

    setSelectedPile(null);
    setMessage("Dealt one card to each pile.");
  }

  function discardTop(pileIndex: number) {
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

    setSelectedPile(null);
    setMessage("Discarded top card.");
  }

  function onPilePress(pileIndex: number) {
    setGame((prev) => {
      if (prev.ended) return prev;

      const piles = prev.piles.map((pile) => [...pile]);
      const clicked = piles[pileIndex];

      if (selectedPile === null) {
        if (clicked.length > 0) {
          setSelectedPile(pileIndex);
          setMessage(
            "Selected a source pile. Tap an empty pile to move its top card.",
          );
        }
        return prev;
      }

      if (selectedPile === pileIndex) {
        setSelectedPile(null);
        setMessage("Selection cleared.");
        return prev;
      }

      const source = piles[selectedPile];
      const target = piles[pileIndex];
      if (source.length === 0 || target.length !== 0) {
        setSelectedPile(null);
        return prev;
      }

      const moving = source.pop();
      if (!moving) return prev;
      target.push(moving);

      const { ended, won } = evaluateEndState(prev.stock, piles);
      setSelectedPile(null);
      setMessage("Moved top card to an empty pile.");

      return { ...prev, piles, ended, won };
    });
  }

  const hasEmptyPile = !!game.piles.find((p) => p.length === 0);

  return (
    <>
      <GameHeader
        gameTitle="Aces Up"
        ended={game.ended}
        won={game.won}
        reset={reset}
      />

      <View style={layoutStyles.gameArea}>
        <MessageBox message={message} />

        {game.ended ? (
          <MessageBox
            messageType={game.won ? "win" : "lose"}
            message={
              game.won ? "You won!" : "No legal moves remain with stock empty."
            }
          />
        ) : null}

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.justifyEvenly,
          ]}
        >
          <Deck
            backCount={game.discard.length}
            cardsPerRow={4}
            fan="horizontalRight"
            title="Discard"
            showCount
          />

          <Deck
            backCount={game.stock.length}
            cardsPerRow={4}
            fan="horizontalRight"
            title="Stock"
            showCount
          />
        </View>

        <View style={[cardStyles.row, flexStyles.flex1]}>
          {game.piles.map((pile, idx) => {
            const top = topCard(pile);
            const isSelected = selectedPile === idx;
            const canDiscard = discardable.has(idx);

            const cardsBelowTop = pile.slice(0, -1).map((card) => {
              return { rank: card.rank, suit: card.suit };
            });

            return (
              <View
                key={`pile-${idx}`}
                style={[cardStyles.colUpwards, flexStyles.gap12]}
              >
                <Deck
                  cardsPerRow={4}
                  fan="verticalUp"
                  largeFan="progressive"
                  cards={cardsBelowTop}
                >
                  <CardButton
                    onPress={() => {
                      if (canDiscard) {
                        discardTop(idx);
                      } else {
                        onPilePress(idx);
                      }
                    }}
                    suit={top ? top.suit : undefined}
                    rank={top ? top.rank : undefined}
                    isPlaceholder={!top}
                    cardsPerRow={4}
                    isSelected={isSelected}
                    disabled={!canDiscard && !hasEmptyPile}
                  />
                </Deck>

                <Text style={textStyles.default}>{pile.length}</Text>
              </View>
            );
          })}
        </View>

        <Button
          onPress={dealFour}
          // For now, allow user to deal even if some cards can be removed
          // disabled={!canDeal}
          text="Deal"
        />
      </View>
    </>
  );
}
