import { useGameLoading } from "@/hooks/useGameLoading";
import { cardStyles } from "@/styles/cardStyles";
import { flexStyles } from "@/styles/flexStyles";
import { layoutStyles } from "@/styles/layoutStyles";
import { textStyles } from "@/styles/textStyles";
import { useState, useRef, useEffect } from "react";
import { Text, View } from "react-native";
import { useAnimations } from "../Animations/Animations";
import { Button } from "../Button/Button";
import {
  RANK_VALUE,
  StandardRank,
  areRanksConsecutive,
  createDeck,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButton";
import { Deck } from "../Cards/Deck";
import { GameMenus } from "../common/GameMenus";
import { CardSelectColor } from "../Cards/Card";
import { GameWrapper } from "../common/GameWrapper";

const localCardPerRowSmall = 7;
const localCardPerRowMedium = 5;

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
  const isLoaded = useGameLoading();
  const [game, setGame] = useState<GolfState>(setup);
  const { animateCards, measureRef, isAnimating, setIsAnimating } =
    useAnimations();
  const [animatingCard, setAnimatingCard] = useState<{
    col: number;
    row: number;
  } | null>(null);

  const tableauRefs = useRef<(View | null)[][]>([[], [], [], [], [], [], []]);
  const wasteRef = useRef<View>(null);
  const stockRef = useRef<View>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  function reset() {
    setGame(setup());
  }

  async function playCard(colIndex: number, cardIndex: number) {
    if (game.ended || isAnimating) return;

    const col = game.tableau[colIndex];
    const card = col?.[cardIndex];
    if (!card) return;
    if (cardIndex !== col.length - 1) return;

    const wasteTop = game.waste[game.waste.length - 1] ?? null;
    if (!canPlayOnWaste(card, wasteTop)) return;

    setIsAnimating(true);

    // Avoid disappearing card flash; give animation time to kick in
    setTimeout(() => {
      setAnimatingCard({ col: colIndex, row: cardIndex });
    }, 10);

    const cardEl = tableauRefs.current[colIndex][cardIndex];
    if (cardEl) {
      const cardPos = await measureRef({ current: cardEl });
      const wastePos = await measureRef(wasteRef);

      if (cardPos && wastePos) {
        await animateCards([
          {
            id: `play-${Date.now()}`,
            cardInfo: {
              rank: card.rank,
              suit: card.suit,
              isBack: false,
              cardsPerRow: localCardPerRowSmall,
              cardSize: "small",
            },
            from: cardPos,
            to: wastePos,
            duration: 350,
          },
        ]);
      }
    }

    setGame((prev) => {
      if (prev.ended) return prev;
      const tableau = prev.tableau.map((col) => [...col]);
      const prevCol = tableau[colIndex];
      const prevCard = prevCol?.[cardIndex];
      if (!prevCard) return prev;
      if (cardIndex !== prevCol.length - 1) return prev;

      const prevWasteTop = prev.waste[prev.waste.length - 1] ?? null;
      if (!canPlayOnWaste(prevCard, prevWasteTop)) return prev;

      prevCol.splice(cardIndex, 1);
      const waste = [...prev.waste, prevCard];

      const next = { ...prev, tableau, waste };
      const end = evaluateEnd(next);
      return { ...next, ...end };
    });

    setAnimatingCard(null);
    setIsAnimating(false);
  }

  async function drawFromStock() {
    if (game.ended || game.stock.length === 0 || isAnimating) return;
    setIsAnimating(true);

    setTimeout(() => {
      setIsDrawing(true);
    }, 10);

    const stockPos = await measureRef(stockRef);
    const wastePos = await measureRef(wasteRef);

    if (stockPos && wastePos) {
      const nextCard = game.stock[0];
      await animateCards([
        {
          id: `draw-${Date.now()}`,
          cardInfo: {
            rank: nextCard.rank,
            suit: nextCard.suit,
            isBack: false,
            cardsPerRow: localCardPerRowMedium,
            cardSize: "small",
          },
          from: stockPos,
          to: wastePos,
          flip: "toFace",
          duration: 350,
        },
      ]);
    }

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

    setIsDrawing(false);
    setIsAnimating(false);
  }

  const [rankToMatch, setRankToMatch] = useState<number | undefined>(undefined);
  const rankToMatchRef = useRef(rankToMatch);
  rankToMatchRef.current = rankToMatch;

  useEffect(() => {
    setRankToMatch(RANK_VALUE[game.waste[game.waste.length - 1].rank]);
  }, [game.waste]);

  function selectColor(rank: StandardRank) {
    const wasteRank = RANK_VALUE[game.waste[game.waste.length - 1].rank];
    const currentRank = RANK_VALUE[rank];

    return areRanksConsecutive(wasteRank, currentRank, false)
      ? "green"
      : "none";
  }

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won ? "You cleared the tableau!" : "No more playable cards."
      }
    >
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          flexStyles.justifyEvenly,
        ]}
      >
        <Deck
          refTopCurrent={stockRef}
          iconName="draw"
          cardsPerRow={localCardPerRowMedium}
          backCount={game.stock.length}
          hideTopCard={isDrawing}
          limitFan
          showCount
          countPosition="left"
          fan="horizontalRight"
        />

        <Deck
          refTopNext={wasteRef}
          iconName="delete"
          cards={Array.from({ length: game.waste.length }, (_, i) => {
            return {
              suit: game.waste[i].suit,
              rank: game.waste[i].rank,
            };
          })}
          cardsPerRow={localCardPerRowMedium}
          limitFan
          showCount
          countPosition="right"
          fan="horizontalLeft"
          cardSize="small"
        />
      </View>

      <View style={[cardStyles.row]}>
        {game.tableau.map((col, colIndex) => (
          <View key={`g-col-${colIndex}`} style={cardStyles.colDownwards}>
            {col.map((card, cardIndex) => {
              const isBottomCard = cardIndex !== col.length - 1;

              return (
                <CardButton
                  key={card.id}
                  ref={(el) => {
                    tableauRefs.current[colIndex][cardIndex] = el;
                  }}
                  style={[
                    animatingCard?.col === colIndex &&
                      animatingCard?.row === cardIndex && { opacity: 0 },
                  ]}
                  onPress={() => playCard(colIndex, cardIndex)}
                  disabled={game.ended || isBottomCard || isAnimating}
                  suit={card.suit}
                  rank={card.rank}
                  cardsPerRow={localCardPerRowSmall}
                  hasTopMargin={cardIndex > 0}
                  selectColor={
                    isBottomCard || rankToMatch === undefined
                      ? "none"
                      : (selectColor(card.rank) as CardSelectColor)
                  }
                  cardSize="small"
                />
              );
            })}
          </View>
        ))}
      </View>

      <View style={[flexStyles.rowCentered, flexStyles.fullWidth]}>
        <Button
          onPress={drawFromStock}
          disabled={game.stock.length === 0 || game.ended || isAnimating}
          text="Draw"
          size="large"
          fullWidth
        />
      </View>
    </GameWrapper>
  );
}
