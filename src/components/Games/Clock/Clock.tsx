import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { useZoneLayout } from "@/hooks/useZoneLayout";
import { flexStyles } from "@/styles/flexStyles";
import { textStyles } from "@/styles/textStyles";
import { produce } from "immer";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { AnimatedCard } from "../../Cards/AnimatedCard";
import { cardAspectRatio } from "../../Cards/CardOLD";
import { CardPositionBuilder } from "../../Cards/CardPositionBuilder";
import { ZoneBackgrounds } from "../../Cards/ZoneBackgrounds";
import {
  createDeck,
  flipTopCardToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../../Cards/card-utils";
import { GameWrapper } from "../../common/GameWrapper";
import { layoutZones, targetCols } from "./ClockSetup";

const cardSize = "small";

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

  const layoutManager = useZoneLayout({
    zones: layoutZones,
    targetCols,
    targetRows: targetCols * cardAspectRatio + 0.5,
    gapPc: 0.1,
  });

  const {
    cardWidth,
    cardHeight,
    getCardPosition,
    getZoneStyles,
    layoutMetrics,
  } = layoutManager;

  const cardPositions = useMemo(() => {
    const builder = new CardPositionBuilder(getCardPosition);

    game.piles.forEach((pile, pileIndex) => {
      builder.addDeck(pile, `pile-${pileIndex}`, 10, "pile");
    });

    return builder.build();
  }, [game, getCardPosition]);

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
      <ZoneBackgrounds layoutManager={layoutManager} game={game} />

      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.spaceBetween,
          getZoneStyles("gameInfo"),
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

      {Object.values(cardPositions).map((target) => {
        const pileIndex = Number(target.zoneId.split("-")[1]);
        const pressable = !!(
          target.misc?.topOfDeck &&
          pileIndex === game.nextPileIndex &&
          !game.ended
        );

        return (
          <AnimatedCard
            key={target.card.id}
            targetState={{ ...target, rotation: (pileIndex % 12) * 30 }}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize={cardSize}
            selectColor={pressable ? "green" : "none"}
            onPress={
              pressable ? () => revealCardAtPileIndex(pileIndex) : undefined
            }
          />
        );
      })}
    </GameWrapper>
  );
}
