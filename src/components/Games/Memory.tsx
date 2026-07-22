import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import {
  AnimatedCardMapping,
  CardMapBGMapping,
  defaultAnimDuration,
} from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const GRID_CONFIG = {
  easy: { cols: 4, rows: 5 },
  medium: { cols: 5, rows: 6 },
  hard: { cols: 6, rows: 7 },
} as const;

type MemoryDifficulty = keyof typeof GRID_CONFIG;

type GameState = {
  grid: (PlayingCard | null)[];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  grid: [],
  discard: [],
  ended: false,
  won: false,
};

function createMemoryDeck(pairCount: number) {
  const pairs = shuffle(createDeck()).slice(0, pairCount);
  const cards = pairs.flatMap((card) => [
    { ...card, id: `${card.id}-a`, faceUp: false },
    { ...card, id: `${card.id}-b`, faceUp: false },
  ]);

  return shuffle(cards);
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
  difficulty: MemoryDifficulty,
) {
  const { cols, rows } = GRID_CONFIG[difficulty];
  const cardCount = cols * rows;

  setGame((draft) => {
    draft.grid = createMemoryDeck(cardCount / 2);
    draft.discard = [];
    draft.ended = false;
    draft.won = false;
  });

  await delay();
}

function cardsMatch(first: PlayingCard, second: PlayingCard) {
  return first.rank === second.rank && first.suit === second.suit;
}

export default function Memory() {
  const difficulty = useGameSettingValue(
    "memoryDifficulty",
  ) as MemoryDifficulty;
  const { cols, rows } = GRID_CONFIG[difficulty];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame, difficulty);
      },
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedIndex(null);
        setIsResolving(false);
      },
    });

  async function selectCard(index: number) {
    if (game.ended || isResolving || !game.grid[index]) return;

    if (selectedIndex === null) {
      setSelectedIndex(index);
      return;
    }

    if (selectedIndex === index) {
      setSelectedIndex(null);
      return;
    }

    const firstIndex = selectedIndex;
    const firstCard = game.grid[firstIndex];
    const secondCard = game.grid[index];
    if (!firstCard || !secondCard || firstCard.faceUp || secondCard.faceUp) {
      return;
    }

    saveUndoState(structuredClone(game));
    setIsResolving(true);
    setSelectedIndex(null);

    setGame((draft) => {
      const first = draft.grid[firstIndex];
      const second = draft.grid[index];
      if (first) draft.grid[firstIndex] = flipToFace(first);
      if (second) draft.grid[index] = flipToFace(second);
    });

    await delay(defaultAnimDuration);

    setGame((draft) => {
      const first = draft.grid[firstIndex];
      const second = draft.grid[index];
      if (!first || !second) return;

      if (cardsMatch(firstCard, secondCard)) {
        draft.discard.push(first, second);
        draft.grid[firstIndex] = null;
        draft.grid[index] = null;
        draft.won = draft.grid.every((card) => card === null);
        draft.ended = draft.won;
      } else {
        draft.grid[firstIndex] = flipToBack(first);
        draft.grid[index] = flipToBack(second);
      }
    });

    setIsResolving(false);
  }

  const zones: MapZone[] = useMemo(() => {
    const gridZones = getGridColRows({ cols, rows }).map((position, index) => ({
      id: `grid-${index}`,
      name: "grid",
      pileIndex: index,
      cards: game.grid[index] ? [game.grid[index]!] : undefined,
      col: position.c,
      row: position.r,
      baseZIndex: 5,
    }));

    return [
      ...gridZones,
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 0,
        row: rows,
        baseZIndex: 40,
        fan: { maxVisible: 1 },
        placeholder: { text: "Matched", infoPos: "right" },
      },
    ];
  }, [cols, game, rows]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName !== "grid" || mappedCard.pileIndex === undefined) {
      return {};
    }

    const index = mappedCard.pileIndex;
    return {
      onPress: () => selectCard(index),
      isSelected: selectedIndex === index,
      selectColor: selectedIndex === index ? "blue" : "none",
      isDisabled: game.ended || isResolving || mappedCard.card.faceUp,
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "discard") return {};
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    gap: 0.12,
    fixedCols: cols,
    fixedRows: rows + 1,
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      score={game.discard.length}
      winLoseMessage="You found every pair!"
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
