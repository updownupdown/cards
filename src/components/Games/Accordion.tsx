import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { useZoneLayout, ZoneConfig } from "@/hooks/useZoneLayout";
import { produce } from "immer";
import { useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";
import { AnimatedCard } from "../Cards/AnimatedCard";
import { createDeck, shuffle, type PlayingCard } from "../Cards/card-utils";
import { CardSelectColor } from "../Cards/CardOLD";
import { CardPositionBuilder, getZoneGrid } from "../Cards/CardPositionBuilder";
import { GameWrapper } from "../common/GameWrapper";

const cardSize = "small";

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

  // ========== Layouts ========== //
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const windowAspectRatio = windowWidth / windowHeight;
  const zoneCols =
    game.line.length < 30
      ? 5
      : windowAspectRatio < 0.6
        ? 6
        : windowAspectRatio < 0.8
          ? 7
          : 8;

  const layoutZones: ZoneConfig[] = [
    ...getZoneGrid({
      idPrefix: "zone",
      length: game.line.length,
      cols: zoneCols,
    }),
  ];

  const layoutManager = useZoneLayout({
    zones: layoutZones,
    gapPc: 0.35,
  });

  const { cardWidth, cardHeight, getCardPosition, layoutMetrics } =
    layoutManager;

  // ========== Card Positions ========== //
  const cardPositions = useMemo(() => {
    const builder = new CardPositionBuilder(getCardPosition);
    builder.addCollection(game.line, "zone", 0, (_, i) => ({
      type: "zone",
      cardIndex: i,
    }));
    return builder.build();
  }, [game, layoutManager, zoneCols, getCardPosition]);

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
      handleUndo={handleUndo}
    >
      {Object.values(cardPositions).map((target) => {
        const index = target.misc?.cardIndex;
        if (index === undefined) return null;

        return (
          <AnimatedCard
            key={target.card.id}
            targetState={target}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize={cardSize}
            onPress={() => onCardPress(index)}
            isSelected={selectedIndex === index}
            selectColor={selectColor(index) as CardSelectColor}
            forceOverlay={true}
          />
        );
      })}
    </GameWrapper>
  );
}
