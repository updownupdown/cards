import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Animated, Easing, Platform, View } from "react-native";

const pileCount = 17;

type GameState = {
  piles: PlayingCard[][];
  hole: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  piles: Array.from({ length: pileCount }, () => []),
  hole: [],
  ended: false,
  won: false,
};

/** Rank is adjacent on a 13-rank loop: a step of 1, or the wrap between Ace and King. */
function adjacentWrap(a: PlayingCard, b: PlayingCard) {
  const diff = Math.abs(rankValue(a) - rankValue(b));
  return diff === 1 || diff === 12;
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const deck = shuffle(createDeck({ faceUp: true }));

    // The Ace of Spades opens the black hole.
    const startIndex = deck.findIndex(
      (card) => card.rank === "A" && card.suit === "spades",
    );
    const [start] = deck.splice(startIndex, 1);

    const piles: PlayingCard[][] = Array.from({ length: pileCount }, () => []);
    deck.forEach((card, i) => piles[i % pileCount].push(flipToFace(card)));

    draft.piles = piles;
    draft.hole = start ? [flipToFace(start)] : [];
    draft.ended = false;
    draft.won = false;
  });

  await delay();
}

function evaluateEnd(state: GameState) {
  const cardsLeft = state.piles.reduce((sum, pile) => sum + pile.length, 0);
  if (cardsLeft === 0) return { ended: true, won: true };

  const holeTop = top(state.hole);
  const anyMove = state.piles.some((pile) => {
    const exposed = top(pile);
    return exposed && holeTop ? adjacentWrap(exposed, holeTop) : false;
  });

  if (!anyMove) return { ended: true, won: false };
  return { ended: false, won: false };
}

// ========== Main Component ========== //
export default function BlackHole() {
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
    });

  useEffect(() => {
    const { ended, won } = evaluateEnd(game);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [game]);

  const holeTop = top(game.hole);

  function absorb(pileIndex: number) {
    if (game.ended) return;
    const exposed = top(game.piles[pileIndex]);
    if (!exposed || !holeTop || !adjacentWrap(exposed, holeTop)) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const card = draft.piles[pileIndex].pop();
      if (card) draft.hole.push(card);
    });
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const pilePositions = getGridColRows({
      cols: 6,
      rows: 3,
      rowOffset: 1.3,
      scaleY: 2,
    });

    const pileZones: MapZone[] = [];
    for (let i = 0; i < pileCount; i += 1) {
      const pos = pilePositions[i];
      pileZones.push({
        id: `pile-${i}`,
        name: "pile",
        pileIndex: i,
        cards: game.piles[i],
        col: pos.c,
        row: pos.r,
        baseZIndex: 1,
        height: 2,
        fan: { direction: "down", offset: 0.46, maxVisible: 3, center: false },
      });
    }

    return [
      {
        id: "hole",
        name: "hole",
        cards: game.hole,
        col: 2.5,
        row: 0,
        baseZIndex: 60,
      },
      {
        id: "hole-graphic",
        name: "hole-graphic",
        col: 2.5,
        row: 0,
        baseZIndex: 1,
      },
      ...pileZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (
      mappedCard.zoneName !== "pile" ||
      mappedCard.pileIndex === undefined ||
      !mappedCard.topOfZone
    ) {
      return {};
    }

    const canPlay = !!holeTop && adjacentWrap(mappedCard.card, holeTop);
    return {
      isDisabled: game.ended || !canPlay,
      selectColor: canPlay ? "green" : "none",
      onPress: () => absorb(mappedCard.pileIndex!),
    };
  };

  const rotationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 2. Configure and start a looping animation
    Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    ).start();
  }, [rotationAnim]);

  // 3. Interpolate the 0-1 values to degrees
  const spin = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const { cardMap, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0.14,
    cardSize: "small",
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won ? "Every star collapsed in!" : "No card can reach the hole."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[getZoneStylesById("hole-graphic")]}>
        <Animated.View
          style={[
            {
              position: "absolute",
              zIndex: 2,
              top: "50%",
              left: "50%",
              width: cardWidth * 2,
              height: cardWidth * 2,
              aspectRatio: 1,
              borderRadius: cardWidth * 1.5,
              backgroundColor: "black",
              transform: [
                { translateY: "-50%" },
                { translateX: "-50%" },
                { rotate: spin },
              ],
              boxShadow: `${cardWidth / -16}px ${cardWidth / -16}px ${cardWidth / 4}px #ff01dd`,
            },
          ]}
        />

        <Animated.View
          style={[
            {
              position: "absolute",
              zIndex: 2,
              top: "50%",
              left: "50%",
              width: cardWidth * 2,
              height: cardWidth * 2,
              aspectRatio: 1,
              borderRadius: cardWidth * 1.2,
              backgroundColor: "black",
              transform: [
                { translateY: "-50%" },
                { translateX: "-50%" },
                { rotate: spin },
              ],
              boxShadow: `${cardWidth / 6}px ${cardWidth / 6}px ${cardWidth / 1}px #00b7ff`,
            },
          ]}
        />
      </View>
    </GameWrapper>
  );
}
