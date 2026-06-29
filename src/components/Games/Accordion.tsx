import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { produce } from "immer";
import { useMemo, useState } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

type AccordionState = {
  line: PlayingCard[];
  ended: boolean;
  won: boolean;
};

type GameSnapshot = {
  game: AccordionState;
};

function setup(): AccordionState {
  return {
    line: shuffle(createDeck({ faceUp: true })),
    ended: false,
    won: false,
  };
}

function canMerge(source: PlayingCard, target: PlayingCard) {
  return source.rank === target.rank || source.suit === target.suit;
}

function hasAnyMove(line: PlayingCard[]) {
  for (let i = 0; i < line.length; i += 1) {
    const oneLeft = i - 1;
    const threeLeft = i - 3;
    if (oneLeft >= 0 && canMerge(line[i], line[oneLeft])) return true;
    if (threeLeft >= 0 && canMerge(line[i], line[threeLeft])) return true;
  }
  return false;
}

export default function Accordion() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const [game, setGame] = useState<AccordionState>(setup);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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
    setSelectedIndex(null);
  }

  function onCardPress(index: number) {
    if (game.ended) return;

    if (selectedIndex === null) {
      setSelectedIndex(index);
      return;
    }

    if (selectedIndex === index) {
      setSelectedIndex(null);
      return;
    }

    const source = selectedIndex;
    const target = index;
    const validDistance = source - target === 1 || source - target === 3;
    if (!validDistance) {
      setSelectedIndex(index);
      return;
    }

    const srcCard = game.line[source];
    const targetCard = game.line[target];
    if (!srcCard || !targetCard || !canMerge(srcCard, targetCard)) {
      setSelectedIndex(index);
      return;
    }

    performMergeAnimation(source, target, srcCard);
  }

  async function performMergeAnimation(
    source: number,
    target: number,
    srcCard: PlayingCard,
  ) {
    saveUndoState(structuredClone({ game }));

    setGame((prev) => {
      return produce(prev, (draft) => {
        draft.line[target] = srcCard;
        draft.line.splice(source, 1);

        draft.won = draft.line.length === 1;
        draft.ended = draft.won || !hasAnyMove(draft.line);
      });
    });

    setSelectedIndex(null);
  }

  function selectColor(idx: number): string {
    if (selectedIndex === idx) {
      // Current card
      return "green";
    } else if (
      selectedIndex &&
      (idx === selectedIndex - 3 ||
        (selectedIndex && idx === selectedIndex - 1))
    ) {
      // Card 1 or 3 to the left
      return canMerge(game.line[idx], game.line[selectedIndex])
        ? "green"
        : "purple";
    } else {
      // Other cards
      return "none";
    }
  }

  // ========== Card Mapping ========== //
  const colNums = 7;
  const zones: MapZone[] = useMemo(() => {
    return getGridColRows({
      cols: colNums,
      rows: Math.ceil(game.line.length / colNums),
    }).map((pos, i) => ({
      id: `line-${i}`,
      name: "line",
      pileIndex: i,
      cards: game.line[i] ? [game.line[i]] : undefined,

      col: pos.c,
      row: pos.r,
      baseZIndex: i,
    }));
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const index = mappedCard.pileIndex;
    if (index === undefined) return {};

    return {
      onPress: () => onCardPress(index),
      isSelected: selectedIndex === index,
      selectColor: selectColor(index),
      forceOverlayColor: true,
    };
  };

  const { cardMap } = useCardMap({
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
        game.won
          ? "You compressed the deck to one card."
          : "No legal moves remain."
      }
      canUndo={canUndo}
      undo={handleUndo}
    >
      {cardMap}
    </GameWrapper>
  );
}
