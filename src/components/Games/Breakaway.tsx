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

const bunchSize = {
  rows: 5,
  cols: 7,
};

type GameState = {
  draw: PlayingCard[];
  paceline: PlayingCard[];
  columns: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  draw: shuffle(createDeck()),
  paceline: [],
  columns: Array.from({ length: bunchSize.cols }, () => []),
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  // Gather every card back to the team car for a shuffle-and-deal animation.
  setGame((draft) => {
    const allCards = [
      ...draft.draw,
      ...draft.paceline,
      ...draft.columns.flat(),
    ].filter((card): card is PlayingCard => card !== null);

    draft.draw = shuffle(allCards);
    draft.paceline = [];
    draft.columns = Array.from({ length: bunchSize.cols }, () => []);
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  // Deal the bunch.
  setGame((draft) => {
    const deck = [...draft.draw];
    const columns: PlayingCard[][] = Array.from(
      { length: bunchSize.cols },
      () => [],
    );

    for (let row = 0; row < bunchSize.rows; row += 1) {
      for (let col = 0; col < bunchSize.cols; col += 1) {
        const card = deck.pop();
        if (card) columns[col].push(flipToFace(card));
      }
    }

    draft.columns = columns;
    draft.draw = deck;
  });

  await delay();

  // Turn the first rider to the front of the paceline.
  setGame((draft) => {
    const firstCard = draft.draw.pop();
    if (firstCard) draft.paceline.push(flipToFace(firstCard));
  });
}

// ========== Helper Functions ========== //
/** Ranks are adjacent on a 13-card loop: normal step of 1 OR the wrap (A<->K). */
function canChase(card: PlayingCard, front?: PlayingCard) {
  if (!front) return false;
  const diff = Math.abs(rankValue(card) - rankValue(front));
  return diff === 1 || diff === 12;
}

function hasAnyMove(state: GameState) {
  const front = top(state.paceline);
  return state.columns.some((column) => {
    const exposed = top(column);
    return exposed ? canChase(exposed, front) : false;
  });
}

function evaluateEnd(state: GameState) {
  const ridersLeft = state.columns.reduce((sum, col) => sum + col.length, 0);
  if (ridersLeft === 0) return { ended: true, won: true };
  if (state.draw.length > 0) return { ended: false, won: false };
  if (hasAnyMove(state)) return { ended: false, won: false };
  return { ended: true, won: false };
}

// ========== Main Component ========== //
export default function Breakaway() {
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

  function chaseRider(columnIndex: number) {
    if (game.ended) return;
    const exposed = top(game.columns[columnIndex]);
    if (!exposed || !canChase(exposed, top(game.paceline))) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const card = draft.columns[columnIndex].pop();
      if (card) draft.paceline.push(card);
    });
  }

  function pullFromTeamCar() {
    if (game.ended || game.draw.length === 0) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const nextCard = draft.draw.pop();
      if (nextCard) draft.paceline.push(flipToFace(nextCard));
    });
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const columnZones: MapZone[] = [];

    for (let columnIndex = 0; columnIndex < bunchSize.cols; columnIndex += 1) {
      const column = game.columns[columnIndex];

      for (let cardIndex = 0; cardIndex < column.length; cardIndex += 1) {
        columnZones.push({
          id: `column-${columnIndex}-${cardIndex}`,
          name: "column",
          cards: [game.columns[columnIndex][cardIndex]],
          pileIndex: columnIndex,
          refIndex: cardIndex,
          col: columnIndex,
          row: cardIndex * 0.55 + 1.25,
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
        placeholder: { text: "Team Car", infoPos: "left" },
      },
      {
        id: "paceline",
        name: "paceline",
        cards: game.paceline,
        col: 4,
        row: 0,
        fan: { maxVisible: 3, direction: "right", offset: 0.18 },
        baseZIndex: 50,
        placeholder: { text: "Paceline", infoPos: "right" },
      },
      ...columnZones,
      {
        id: "button",
        col: 0,
        row: 6.4,
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
      mappedCard.zoneName !== "column" ||
      mappedCard.pileIndex === undefined ||
      mappedCard.refIndex === undefined
    ) {
      return {};
    }

    const columnIndex = mappedCard.pileIndex;
    const isExposed =
      mappedCard.refIndex === game.columns[columnIndex].length - 1;
    const canPlay = isExposed && canChase(mappedCard.card, top(game.paceline));

    return {
      isDisabled: game.ended || !canPlay,
      onPress: () => chaseRider(columnIndex),
    };
  };

  const { getZoneStylesById, cardMap } = useCardMap({
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
        game.won ? "You reeled in the bunch!" : "The break stayed away."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[getZoneStylesById("button")]}>
        <Button
          onPress={pullFromTeamCar}
          disabled={game.draw.length === 0 || game.ended}
          text="Pull from Team Car"
          size="md"
          fullWidth
          taller
        />
      </View>
    </GameWrapper>
  );
}
