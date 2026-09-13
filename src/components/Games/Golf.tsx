import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { flexStyles } from "@/styles/flexStyles";

const tableauSize = {
  rows: 5,
  cols: 7,
};

type GameState = {
  draw: PlayingCard[];
  discard: PlayingCard[];
  piles: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

export type GolfGameState = GameState;

const gameStateInitial: GameState = {
  draw: shuffle(createDeck()),
  discard: [],
  piles: Array.from({ length: tableauSize.cols }, () => []),
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  // Gather all cards to draw
  setGame((draft) => {
    const allCards = [
      ...draft.draw,
      ...draft.discard,
      ...draft.piles.flat(),
    ].filter((card): card is PlayingCard => card !== null);

    draft.draw = shuffle(allCards);
    draft.discard = [];
    draft.piles = Array.from({ length: tableauSize.cols }, () => []);
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  // Set up piles
  setGame((draft) => {
    const deck = [...draft.draw];
    const tableau: PlayingCard[][] = Array.from(
      { length: tableauSize.cols },
      () => [],
    );

    for (let row = 0; row < tableauSize.rows; row += 1) {
      for (let col = 0; col < tableauSize.cols; col += 1) {
        const card = deck.pop();
        if (card) tableau[col].push(flipToFace(card));
      }
    }

    draft.piles = tableau;
    draft.draw = deck;
  });

  await delay();

  // Flip first card to discard
  setGame((draft) => {
    const firstDiscard = draft.draw.pop();
    if (firstDiscard) {
      draft.discard.push(flipToFace(firstDiscard));
    }
  });
}

// ========== Helper Functions ========== //
type GolfDifficulty = "easy" | "hard";

function canDiscard(
  card: PlayingCard,
  discardTop?: PlayingCard,
  difficulty: GolfDifficulty = "hard",
) {
  if (!discardTop) return false;

  const a = rankValue(card);
  const b = rankValue(discardTop);
  const diff = Math.abs(a - b);
  return diff === 1 || (difficulty === "easy" && diff === 12);
}

function hasAnyMove(state: GameState, difficulty: GolfDifficulty = "hard") {
  const wasteTop = state.discard[state.discard.length - 1] ?? null;
  return state.piles.some((col) => {
    const top = col[col.length - 1] ?? null;
    return top ? canDiscard(top, wasteTop, difficulty) : false;
  });
}

function evaluateEnd(
  state: GameState,
  isSettingUp = false,
  difficulty: GolfDifficulty = "hard",
) {
  if (isSettingUp) return { ended: false, won: false };

  const tableauCount = state.piles.reduce((sum, col) => sum + col.length, 0);
  if (tableauCount === 0) return { ended: true, won: true };
  if (state.draw.length > 0) return { ended: false, won: false };
  if (hasAnyMove(state, difficulty)) return { ended: false, won: false };
  return { ended: true, won: false };
}

export const golfRules = {
  canDiscard,
  hasAnyMove,
  evaluateEnd,
};

// ========== Main Component ========== //
export default function Golf() {
  const difficulty = useGameSettingValue("golfDifficulty");
  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    undo,
    canUndo,
    saveUndoState,
    reset,
  } = useStateManager({
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
    gameStateInitial,
  });

  useEffect(() => {
    if (game.ended) return;

    const result = evaluateEnd(game, isSettingUp, difficulty);
    if (!result.ended) return;

    setGame((draft) => {
      draft.ended = result.ended;
      draft.won = result.won;
    });
  }, [difficulty, game, isSettingUp, setGame]);

  async function playCard(pileIndex: number, cardIndex: number) {
    if (game.ended) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const currentDiscard = top(draft.discard);
      const cardToDiscard = draft.piles[pileIndex][cardIndex];

      if (!currentDiscard || !cardToDiscard) {
        return;
      }

      draft.piles[pileIndex].pop();
      draft.discard.push(cardToDiscard);
    });
  }

  async function drawCard() {
    saveUndoState(structuredClone(game));

    setGame((draft) => {
      if (draft.ended || draft.draw.length === 0) return;

      const nextCard = draft.draw.pop();

      if (!nextCard) return;

      draft.discard.push(flipToFace(nextCard));
    });
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    let pileZones: MapZone[] = [];

    for (let pileIndex = 0; pileIndex < tableauSize.cols; pileIndex++) {
      const pile = game.piles[pileIndex];

      for (let cardIndex = 0; cardIndex < pile.length; cardIndex++) {
        pileZones.push({
          id: `pile-${pileIndex}-${cardIndex}`,
          cards: [game.piles[pileIndex][cardIndex]],
          pileIndex,
          refIndex: cardIndex,
          name: "pile",

          col: pileIndex,
          row: cardIndex + 1.25,
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
        placeholder: { text: "Stock", infoPos: "left" },
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
        row: 6.5,
        width: "full",
        height: 0.8,
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
    ) {
      return {};
    }

    const isBottomCard =
      mappedCard.refIndex === game.piles[mappedCard.pileIndex].length - 1;
    const canPlay =
      isBottomCard &&
      canDiscard(mappedCard.card, top(game.discard), difficulty);

    return {
      isDisabled: game.ended || !isBottomCard || !canPlay,
      onPress: () => playCard(mappedCard.pileIndex!, mappedCard.refIndex!),
    };
  };

  const { getZoneStylesById, cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    gap: 0.14,
    fixedRows: 7.3,
    fixedCols: 7,
    cardSize: "small",
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won ? "You cleared the tableau!" : "No more playable cards."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[flexStyles.colCentered, getZoneStylesById("button")]}>
        <Button
          onPress={drawCard}
          disabled={game.draw.length === 0 || game.ended}
          text="Draw"
          size="lg"
          fullWidth
          halfTaller
          theme={"#37611f"}
        />
      </View>
    </GameWrapper>
  );
}
