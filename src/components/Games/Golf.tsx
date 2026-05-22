import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../Cards/Card";
import InfoModal from "../Modals/InfoModal";
import {
  RANK_VALUE,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { flexStyles, layoutStyles } from "@/styles/layoutStyles";
import { textStyles } from "@/styles/textStyles";
import { Deck } from "../Cards/Deck";
import { cardStyles } from "@/styles/cardStyles";
import { buttonStyles } from "@/styles/buttonStyles";
import { GameHeader } from "../common/GameHeader";
import { MessageBox } from "../common/MessageBox";
import { CardButton } from "../Cards/CardButton";
import { Button } from "../Button/Button";

type GolfState = {
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  ended: boolean;
  won: boolean;
};

function value(card: PlayingCard) {
  return RANK_VALUE[card.rank];
}

function canPlayOnWaste(card: PlayingCard, wasteTop: PlayingCard | null) {
  if (!wasteTop) return true;
  const a = value(card);
  const b = value(wasteTop);
  const diff = Math.abs(a - b);
  return diff === 1;
}

function setup(): GolfState {
  const deck = shuffle(createDeck({ faceUp: true }));
  const tableau: PlayingCard[][] = [[], [], [], [], [], [], []];

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const card = deck.shift();
      if (card) tableau[col].push(card);
    }
  }

  const firstWaste = deck.shift();

  return {
    tableau,
    stock: deck,
    waste: firstWaste ? [firstWaste] : [],
    ended: false,
    won: false,
  };
}

function hasAnyMove(state: GolfState) {
  const wasteTop = state.waste[state.waste.length - 1] ?? null;
  return state.tableau.some((col) => {
    const top = col[col.length - 1] ?? null;
    return top ? canPlayOnWaste(top, wasteTop) : false;
  });
}

function evaluateEnd(state: GolfState) {
  const tableauCount = state.tableau.reduce((sum, col) => sum + col.length, 0);
  if (tableauCount === 0) return { ended: true, won: true };
  if (state.stock.length > 0) return { ended: false, won: false };
  if (hasAnyMove(state)) return { ended: false, won: false };
  return { ended: true, won: false };
}

export default function Golf() {
  const [game, setGame] = useState<GolfState>(setup);
  const [message, setMessage] = useState(
    "Tap a tableau card one rank above/below waste top. Draw from stock when blocked.",
  );

  const tableauCount = useMemo(
    () => game.tableau.reduce((sum, col) => sum + col.length, 0),
    [game.tableau],
  );

  function reset() {
    setGame(setup());
    setMessage(
      "Tap a tableau card one rank above/below waste top. Draw from stock when blocked.",
    );
  }

  function playCard(colIndex: number, cardIndex: number) {
    setGame((prev) => {
      if (prev.ended) return prev;
      const tableau = prev.tableau.map((col) => [...col]);
      const col = tableau[colIndex];
      const card = col?.[cardIndex];
      if (!card) return prev;
      if (cardIndex !== col.length - 1) return prev;

      const wasteTop = prev.waste[prev.waste.length - 1] ?? null;
      if (!canPlayOnWaste(card, wasteTop)) return prev;

      col.splice(cardIndex, 1);
      const waste = [...prev.waste, card];

      const next = { ...prev, tableau, waste };
      const end = evaluateEnd(next);
      return { ...next, ...end };
    });

    setMessage("Played to waste.");
  }

  function drawFromStock() {
    setGame((prev) => {
      if (prev.ended || prev.stock.length === 0) return prev;
      const stock = [...prev.stock];
      const nextCard = stock.shift();
      if (!nextCard) return prev;

      const waste = [...prev.waste, nextCard];
      const next = { ...prev, stock, waste };
      const end = evaluateEnd(next);
      return { ...next, ...end };
    });

    setMessage("Drew from stock.");
  }

  return (
    <>
      <GameHeader
        gameTitle="Golf Solitaire"
        ended={game.ended}
        won={game.won}
        reset={reset}
      />

      <View style={layoutStyles.gameArea}>
        <MessageBox message={message} />

        <View style={[cardStyles.cardsRows, flexStyles.flex1]}>
          {game.tableau.map((col, colIndex) => (
            <View key={`g-col-${colIndex}`} style={cardStyles.cardsCols}>
              {col.map((card, cardIndex) => (
                <CardButton
                  key={card.id}
                  onPress={() => playCard(colIndex, cardIndex)}
                  disabled={game.ended || cardIndex !== col.length - 1}
                  suit={card.suit}
                  rank={card.rank}
                  widthPerc={100 / 7}
                />
              ))}
            </View>
          ))}
        </View>

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.justifyEvenly,
          ]}
        >
          <View style={flexStyles.colCentered}>
            <Deck showCount widthPerc={100 / 7} backCount={game.stock.length} />
          </View>

          <View style={flexStyles.colCentered}>
            {game.waste.length > 0 ? (
              <Card
                suit={game.waste[game.waste.length - 1].suit}
                rank={game.waste[game.waste.length - 1].rank}
                widthPerc={100 / 4}
                cardSize="regular"
              />
            ) : (
              <Card isPlaceholder cardSize="regular" />
            )}
          </View>

          <View style={flexStyles.colCentered}>
            <Button
              onPress={drawFromStock}
              disabled={game.stock.length === 0 || game.ended}
              text="Draw"
            />
          </View>
        </View>

        {game.ended ? (
          <Text style={game.won ? textStyles.default : textStyles.default}>
            {game.won ? "You cleared the tableau." : "No more playable cards."}
          </Text>
        ) : null}
      </View>
    </>
  );
}
