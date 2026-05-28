import { useGameLoading } from "@/hooks/useGameLoading";
import { cardStyles } from "@/styles/cardStyles";
import { flexStyles } from "@/styles/flexStyles";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import {
  RANK_VALUE,
  createDeck,
  isRed,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { Deck } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";
import { MessageBox } from "../common/MessageBox";
import { CardGrid, useCardSize } from "../Cards/Card";

const cardsPerRow = 4;

type SandwichState = {
  deck: PlayingCard[];
  hand: (PlayingCard | null)[];
  discard: PlayingCard[];
  wonByDeckingOut: boolean;
  ended: boolean;
};

function initState(): SandwichState {
  const deck = shuffle(createDeck({ faceUp: true }));

  return {
    hand: deck.slice(0, 8),
    deck: deck.slice(8),
    discard: [],
    wonByDeckingOut: false,
    ended: false,
  };
}

function mod13(value: number) {
  const n = value % 13;
  return n < 0 ? n + 13 : n;
}

function isValidSandwich(cards: PlayingCard[]) {
  if (cards.length !== 3) return false;

  const vals = cards.map((card) => RANK_VALUE[card.rank]);
  const perms = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];

  return perms.some(([a, b, c]) => {
    const step1 = mod13(vals[b] - vals[a]);
    const step2 = mod13(vals[c] - vals[b]);
    return step1 === step2;
  });
}

function hasAnyValidSandwich(hand: (PlayingCard | null)[]) {
  const nonNullHand = hand.filter((card) => card !== null);

  for (let i = 0; i < nonNullHand.length; i++) {
    for (let j = i + 1; j < nonNullHand.length; j++) {
      for (let k = j + 1; k < nonNullHand.length; k++) {
        if (isValidSandwich([nonNullHand[i], nonNullHand[j], nonNullHand[k]])) {
          return true;
        }
      }
    }
  }
  return false;
}

function replacementCount(cards: PlayingCard[]) {
  const [a, b, c] = cards;
  const sameSuit = a.suit === b.suit && b.suit === c.suit;
  if (sameSuit) return 4;

  const sameColor =
    isRed(a.suit) === isRed(b.suit) && isRed(b.suit) === isRed(c.suit);
  if (sameColor) return 3;

  return 2;
}

export default function TheSandwichGuy() {
  const isLoaded = useGameLoading();

  const [game, setGame] = useState<SandwichState>(initState);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [invalidSandwichSelected, setInvalidSandwichSelected] = useState(false);
  const [message, setMessage] = useState(
    "Pick three cards to make a sandwich.",
  );
  const { gridWidth, gridGap } = useCardSize(cardsPerRow, cardsPerRow);

  const selectedCards = useMemo(
    () =>
      game.hand
        .filter((card) => card !== null)
        .filter((card) => selectedIds.includes(card.id)),
    [game.hand, selectedIds],
  );

  useEffect(() => {
    if (selectedCards.length !== 3) {
      setInvalidSandwichSelected(false);
    } else {
      setInvalidSandwichSelected(!isValidSandwich(selectedCards));
    }
  }, [selectedCards]);

  const score = game.hand.length;

  function reset() {
    setGame(initState());
    setSelectedIds([]);
    setMessage("Pick three cards to make a sandwich.");
  }

  function toggleSelect(id: string) {
    if (game.ended) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((entry) => entry !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  function commitSandwich() {
    if (selectedCards.length !== 3) return;
    if (!isValidSandwich(selectedCards)) {
      setMessage(
        "Not a valid sandwich. Choose cards with equal step difference.",
      );
      return;
    }

    const replacement = replacementCount(selectedCards);

    setGame((prev) => {
      if (prev.ended) return prev;

      // Replace selected cards with null
      const hand = prev.hand.map((card) =>
        card && selectedIds.includes(card.id) ? null : card,
      );
      const discard = [...prev.discard, ...selectedCards];
      const deck = [...prev.deck];

      for (let i = 0; i < replacement; i += 1) {
        const drawn = deck.shift();
        const emptyIndex = hand.indexOf(null);
        if (!drawn || emptyIndex === -1) break;
        hand[emptyIndex] = drawn; // Replace null with the drawn card
      }

      const wonByDeckingOut = prev.wonByDeckingOut || deck.length === 0;
      const next = {
        ...prev,
        // Fill nulls with placeholders
        hand: hand.map((card) => card || null),
        deck,
        discard,
        wonByDeckingOut,
      };

      if (!hasAnyValidSandwich(next.hand)) {
        return { ...next, ended: true };
      }

      return next;
    });

    setSelectedIds([]);
    setMessage("Sandwich served (" + replacement + " new cards)");
  }

  const won = game.ended && game.wonByDeckingOut;

  function selectColor(selected: boolean) {
    if (selected && invalidSandwichSelected) {
      return "red";
    } else if (selectedIds.length === 3 && selected) {
      return "green";
    } else {
      return "blue";
    }
  }

  return (
    <GameWrapper
      ended={game.ended}
      won={won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        won
          ? `You won by drawing out the deck. Final score (lower is better):{" "}
            ${score}`
          : "No valid sandwich available. You lose."
      }
    >
      <MessageBox message={message} />

      <View style={[flexStyles.rowCentered]}>
        <Deck
          showCount
          limitFan
          cardsPerRow={cardsPerRow}
          countPosition="right"
          backCount={game.deck.length}
          iconName="draw"
        />
      </View>

      <CardGrid
        cardsPerRow={cardsPerRow}
        style={[
          {
            flexDirection: "row-reverse",
            justifyContent: "flex-end",
          },
        ]}
      >
        {game.hand.map((card, index) => {
          const selected = !!(card && selectedIds.includes(card.id));

          return (
            <CardButton
              key={card ? card.id : "placeholder" + index}
              onPress={() => {
                if (card) {
                  toggleSelect(card.id);
                }
              }}
              isSelected={selected}
              cardsPerRow={cardsPerRow}
              isPlaceholder={!card}
              suit={card?.suit}
              rank={card?.rank}
              // hasTopMargin={index > cardsPerRow - 1}
              selectColor={selectColor(selected)}
            />
          );
        })}
      </CardGrid>

      <Button
        onPress={commitSandwich}
        disabled={selectedCards.length !== 3 || invalidSandwichSelected}
        text="Serve Sandwich"
        size="large"
        fullWidth
      />
    </GameWrapper>
  );
}
