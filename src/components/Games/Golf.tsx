import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  areRanksConsecutive,
  CardRank,
  createDeck,
  flipToFace,
  RANK_VALUE,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { produce } from "immer";
import { CardColor } from "../Cards/CardStyles";

type GameState = {
  draw: PlayingCard[];
  discard: PlayingCard[];
  piles: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

type GameSnapshot = {
  game: GameState;
};

function canPlayOnDiscard(card: PlayingCard, discardTop: PlayingCard) {
  const a = rankValue(card);
  const b = rankValue(discardTop);
  const diff = Math.abs(a - b);
  return diff === 1;
}

function setup(): GameState {
  const deck = shuffle(createDeck());
  const tableau: PlayingCard[][] = [[], [], [], [], [], [], []];

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const card = deck.pop();
      if (card) tableau[col].push(flipToFace(card));
    }
  }

  const firstDiscard = deck.pop();

  return {
    piles: tableau,
    draw: deck,
    discard: firstDiscard ? [flipToFace(firstDiscard)] : [],
    ended: false,
    won: false,
  };
}

function hasAnyMove(state: GameState) {
  const wasteTop = state.discard[state.discard.length - 1] ?? null;
  return state.piles.some((col) => {
    const top = col[col.length - 1] ?? null;
    return top ? canPlayOnDiscard(top, wasteTop) : false;
  });
}

function evaluateEnd(state: GameState) {
  const tableauCount = state.piles.reduce((sum, col) => sum + col.length, 0);
  if (tableauCount === 0) return { ended: true, won: true };
  if (state.draw.length > 0) return { ended: false, won: false };
  if (hasAnyMove(state)) return { ended: false, won: false };
  return { ended: true, won: false };
}

export default function Golf() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const [game, setGame] = useState<GameState>(setup);

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      setGame(previousState.game);
    }
  };

  function reset() {
    clearHistory();
    setGame(setup());
  }

  useEffect(() => {
    if (!game.ended) evaluateEnd(game);
  }, [game]);

  async function playCard(pileIndex: number, cardIndex: number) {
    if (game.ended) return;

    saveUndoState(structuredClone({ game }));

    setGame((prev) => {
      return produce(prev, (draft) => {
        const currentDiscard = top(draft.discard);
        const cardToDiscard = draft.piles[pileIndex][cardIndex];

        if (
          !currentDiscard ||
          !cardToDiscard ||
          !canPlayOnDiscard(cardToDiscard, currentDiscard)
        ) {
          return;
        }

        draft.piles[pileIndex].pop();
        draft.discard.push(cardToDiscard);
      });
    });
  }

  async function drawCard() {
    setGame((prev) => {
      return produce(prev, (draft) => {
        if (draft.ended || draft.draw.length === 0) return;

        const nextCard = draft.draw.pop();

        if (!nextCard) return;

        draft.discard.push(flipToFace(nextCard));
      });
    });
  }

  const rankToMatch = useMemo(() => {
    return RANK_VALUE[game.discard[game.discard.length - 1].rank];
  }, [game.discard]);

  function selectCardColor(
    rank: CardRank,
    isBottomCard: boolean,
    rankValueToMatch: number | undefined,
  ): CardColor {
    if (!isBottomCard || rankValueToMatch === undefined) return "none";

    const wasteRank = rankValueToMatch;
    const currentRank = RANK_VALUE[rank];

    if (areRanksConsecutive(wasteRank, currentRank, false)) return "green";

    return "none";
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    let pileZones: MapZone[] = [];

    for (let pileIndex = 0; pileIndex < game.piles.length; pileIndex++) {
      const pile = game.piles[pileIndex];

      for (let cardIndex = 0; cardIndex < pile.length; cardIndex++) {
        pileZones.push({
          id: `pile-${pileIndex}-${cardIndex}`,
          cards: [game.piles[pileIndex][cardIndex]],
          pileIndex,
          refIndex: cardIndex,
          name: "pile",

          col: pileIndex,
          row: cardIndex + 1,
          baseZIndex: 1 + cardIndex,
        });
      }
    }

    return [
      {
        id: "draw",
        name: "draw",

        cards: game.draw,
        col: 2,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Draw", infoPos: "left" },
      },
      {
        id: "discard",
        name: "discard",

        cards: game.discard,
        col: 4,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Discard", infoPos: "right" },
      },
      ...pileZones,
      {
        id: "button",

        col: 0,
        row: 6.25,
        width: "full",
        baseZIndex: 10,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (
      mappedCard.zoneName !== "pile" ||
      mappedCard.pileIndex === undefined ||
      mappedCard.refIndex === undefined ||
      mappedCard.card === undefined
    )
      return {};

    const isBottomCard =
      mappedCard.refIndex === game.piles[mappedCard.pileIndex].length - 1;
    const selectColor = selectCardColor(
      mappedCard.card.rank,
      isBottomCard,
      rankToMatch,
    );

    return {
      selectColor,
      forceOverlayColor: selectColor !== "none",
      isDisabled: game.ended || !isBottomCard,
      onPress: () => playCard(mappedCard.pileIndex!, mappedCard.refIndex!),
    };
  };

  const { getZoneStylesById, cardWidth, cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
  });

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won ? "You cleared the tableau!" : "No more playable cards."
      }
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      {cardMap}

      <View style={[getZoneStylesById("button")]}>
        <Button
          onPress={drawCard}
          disabled={hasAnyMove(game) || game.draw.length === 0 || game.ended}
          text="Draw"
          size="large"
          fullWidth
          style={[{ height: "100%" }]}
          cardWidth={cardWidth}
        />
      </View>
    </GameWrapper>
  );
}
