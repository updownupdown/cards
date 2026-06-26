import { MappedCard, MapZone, useCardMap } from "@/components/Cards/CardMap";
import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";
import { produce } from "immer";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipTopCardToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

type GameState = {
  piles: PlayingCard[][];
  nextPileIndex?: number;
  prevPileIndex?: number;
  revealedKings: number;
  revealedCards: number;
  ended: boolean;
  won: boolean;
};

type GameSnapshot = {
  game: GameState;
};

function setup(): GameState {
  const deck = shuffle(createDeck({ faceUp: false }));
  const piles: PlayingCard[][] = Array.from({ length: 13 }, () => []);

  let target = 0;
  while (deck.length > 0) {
    const card = deck.shift();
    if (card) piles[target].push(card);
    target = (target + 1) % 13;
  }

  return {
    piles,
    nextPileIndex: 0,
    prevPileIndex: undefined,
    revealedKings: 0,
    revealedCards: 0,
    ended: false,
    won: false,
  };
}

export default function Clock() {
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

  async function revealCardAtPileIndex(pileIndex: number) {
    if (game.ended || game.piles.length === 0) {
      return;
    }

    saveUndoState(structuredClone({ game }));

    setGame((prev) => {
      return produce(prev, (draft) => {
        const clickedCard = top(draft.piles[pileIndex]);

        if (!clickedCard) return;

        // Move prev top card to clicked pile
        if (draft.prevPileIndex !== undefined) {
          const cardToMove = draft.piles[draft.prevPileIndex].pop();

          if (!cardToMove) return;

          draft.piles[pileIndex].unshift(cardToMove);
        }

        // Flip over card on clicked pile
        draft.piles[pileIndex] = flipTopCardToFace(draft.piles[pileIndex]);

        // Update the next pile index
        const clickedCardRank = rankValue(clickedCard);
        let nextCardRank = clickedCardRank;

        if (pileIndex === draft.nextPileIndex) {
          const topOfSamePile = top(draft.piles[pileIndex]);
          if (!topOfSamePile) return;
          nextCardRank = rankValue(topOfSamePile);
        }

        draft.nextPileIndex = nextCardRank === 13 ? 0 : nextCardRank;
        draft.prevPileIndex = pileIndex;

        // Increment revealed kings
        draft.revealedKings += nextCardRank === 13 ? 1 : 0;

        draft.revealedCards += 1;
        draft.won = draft.revealedCards === 52;
        const lost = draft.revealedKings === 4;
        draft.ended = draft.won || lost;
      });
    });
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const clockRadius = 2.6;
    const pileZones = Array.from({ length: 13 }).map((_, i) => {
      let col, row;

      if (i === 0) {
        // Middle position
        col = clockRadius;
        row = clockRadius * cardDims.aspectRatio + 0.2;
      } else {
        // Clock positions: 12 is top, 3 is right, 6 is bottom, 9 is left
        // Formula: angle = (index - 3) * (2 * Math.PI / 12)
        // We adjust by -3 to align index 3 with 0 radians (right)
        const angle = (i - 3) * (Math.PI / 6);

        col = clockRadius + clockRadius * Math.cos(angle);
        row =
          clockRadius * cardDims.aspectRatio +
          0.2 +
          clockRadius * Math.sin(angle) * cardDims.aspectRatio;
      }

      return {
        id: `pile-${i}`,
        col: Math.round(col * 100) / 100,
        row: Math.round(row * 100) / 100,
        fan: { offset: 0.05 },
        pileIndex: i,
        cards: game.piles[i] ?? undefined,
        name: "pile",

        baseZIndex: 1,
        rotation: (i % 12) * 30,
      } as MapZone;
    });

    return [
      ...pileZones,
      {
        id: "gameInfo",
        col: 0,
        row: 0,
        width: "full",
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const pileIndex = mappedCard.pileIndex;

    if (pileIndex === undefined) return {};

    const pressable =
      mappedCard.topOfZone && pileIndex === game.nextPileIndex && !game.ended;

    return {
      selectColor: pressable ? "green" : "none",
      onPress: pressable ? () => revealCardAtPileIndex(pileIndex) : undefined,
    };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    paddingLeft: 0.8,
    paddingRight: 0.8,
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
        game.won
          ? "You revealed all 52 cards."
          : "The fourth king appeared before all cards were revealed."
      }
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      {cardMap}

      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.spaceBetween,
          getZoneStylesById("gameInfo"),
        ]}
      >
        <Text style={[textStyles.caps]}>
          Cards
          <br />
          {game.revealedCards} / 52
        </Text>
        <Text style={[textStyles.caps, { textAlign: "right" }]}>
          Kings
          <br />
          {game.revealedKings} /4
        </Text>
      </View>
    </GameWrapper>
  );
}
