import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";

import { Card } from "../Cards/Card";
import InfoModal from "../Modals/InfoModal";
import {
  RANK_VALUE,
  createDeck,
  isRed,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { layoutStyles } from "@/styles/layoutStyles";
import { textStyles } from "@/styles/textStyles";
import { buttonStyles } from "@/styles/buttonStyles";
import { cardStyles } from "@/styles/cardStyles";
import { Deck } from "../Cards/Deck";
import { GameMenus } from "../common/GameMenus";
import { MessageBox } from "../common/MessageBox";
import { CardButton } from "../Cards/CardButton";
import { Button } from "../Button/Button";

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
  const [game, setGame] = useState<SandwichState>(initState);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [invalidSandwichSelected, setInvalidSandwichSelected] = useState(false);
  const [message, setMessage] = useState(
    "Pick three cards to make a sandwich.",
  );

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

      const hand = prev.hand.map((card) =>
        card && selectedIds.includes(card.id) ? null : card,
      ); // Replace selected cards with null
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
        hand: hand.map((card) => card || null), // Fill nulls with placeholders
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
  const lost = game.ended && !game.wonByDeckingOut;

  return (
    <>
      {/* <GameMenus
        gameTitle="The Sandwich Guy"
        ended={game.ended}
        won={won}
        reset={reset}
      /> */}

      <View style={layoutStyles.gameArea}>
        <MessageBox message={message} />

        {game.ended && (
          <MessageBox
            message={
              won
                ? `You won by drawing out the deck. Final score (lower is better):{" "}
            ${score}`
                : "No valid sandwich available. You lose."
            }
            messageType={won ? "win" : "lose"}
          />
        )}

        <Deck showCount cardsPerRow={4} backCount={game.deck.length} />

        <View style={[cardStyles.row, cardStyles.rowGap4]}>
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
                isSelectedInvalid={selected && invalidSandwichSelected}
                cardsPerRow={4}
                isPlaceholder={!card}
                suit={card?.suit}
                rank={card?.rank}
              />
            );
          })}
        </View>

        <Button
          onPress={commitSandwich}
          disabled={selectedCards.length !== 3 || invalidSandwichSelected}
          text="Serve Sandwich"
        />
      </View>
    </>
  );
}
