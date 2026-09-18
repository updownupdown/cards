import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo, useRef, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
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
import { Text } from "../common/Text";
import { Pressable, View } from "react-native";
import { flexStyles } from "@/styles/flexStyles";
import { useGameColors } from "@/hooks/useGameColors";

import { i18n } from "@/i18n";
const GRID_CONFIG = {
  veryeasy: { cols: 4, rows: 3 },
  easy: { cols: 5, rows: 4 },
  medium: { cols: 6, rows: 5 },
  hard: { cols: 7, rows: 6 },
  veryhard: { cols: 8, rows: 7 },
  extreme: { cols: 8, rows: 9 },
} as const;

type MemoryDifficulty = keyof typeof GRID_CONFIG;

export type MemoryGameDifficulty = MemoryDifficulty;

const DIFFICULTY_LABELS = {
  veryeasy: "games:memory.difficultyVeryEasy",
  easy: "games:memory.difficultyEasy",
  medium: "games:memory.difficultyMedium",
  hard: "games:memory.difficultyHard",
  veryhard: "games:memory.difficultyVeryHard",
  extreme: "games:memory.difficultyExtreme",
} as const satisfies Record<MemoryDifficulty, string>;

type GameState = {
  grid: (PlayingCard | null)[];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

export type MemoryGameState = GameState;

type PendingPair = {
  firstIndex: number;
  secondIndex: number;
  firstCard: PlayingCard;
  secondCard: PlayingCard;
};

type MatchedPair = {
  firstIndex: number;
  secondIndex: number;
};

const gameStateInitial: GameState = {
  grid: [],
  discard: [],
  ended: false,
  won: false,
};

function createMemoryDeck(pairCount: number) {
  const uniqueCards = Array.from(
    new Map(
      shuffle(createDeck()).map((card) => [`${card.rank}-${card.suit}`, card]),
    ).values(),
  );

  if (uniqueCards.length < pairCount) {
    throw new Error("Not enough unique cards to create the Memory board.");
  }

  const pairs = uniqueCards.slice(0, pairCount);
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

export const memoryRules = {
  createMemoryDeck,
  cardsMatch,
  gridConfig: GRID_CONFIG,
  difficultyLabels: DIFFICULTY_LABELS,
};

export default function Memory() {
  const difficulty = useGameSettingValue(
    "memoryDifficulty",
  ) as MemoryDifficulty;
  const { cols, rows } = GRID_CONFIG[difficulty];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [guesses, setGuesses] = useState(0);
  const [matchedPair, setMatchedPair] = useState<MatchedPair | null>(null);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const pendingPair = useRef<PendingPair | null>(null);
  const { colorPale } = useGameColors();

  const { isLoaded, game, setGame, reset } = useStateManager({
    resetAndSetup: async () => {
      await resetAndSetup(setGame, difficulty);
    },
    gameStateInitial,
    resetNonGameStates: () => {
      pendingPair.current = null;
      setSelectedIndex(null);
      setIsResolving(false);
      setGuesses(0);
      setMatchedPair(null);
    },
  });

  async function selectCard(index: number) {
    if (game.ended || !game.grid[index]) return;

    if (isResolving) {
      const pair = pendingPair.current;
      if (!pair || cardsMatch(pair.firstCard, pair.secondCard)) return;

      pendingPair.current = null;
      setGame((draft) => {
        const first = draft.grid[pair.firstIndex];
        const second = draft.grid[pair.secondIndex];
        if (first) draft.grid[pair.firstIndex] = flipToBack(first);
        if (second) draft.grid[pair.secondIndex] = flipToBack(second);
      });
      setIsResolving(false);
      setSelectedIndex(index);
      setGame((draft) => {
        const card = draft.grid[index];
        if (card) draft.grid[index] = flipToFace(card);
      });
      return;
    }

    if (selectedIndex === null) {
      setSelectedIndex(index);
      setGame((draft) => {
        const card = draft.grid[index];
        if (card) draft.grid[index] = flipToFace(card);
      });
      return;
    }

    if (selectedIndex === index) {
      return;
    }

    const firstIndex = selectedIndex;
    const firstCard = game.grid[firstIndex];
    const secondCard = game.grid[index];
    if (!firstCard || !secondCard || !firstCard.faceUp || secondCard.faceUp) {
      return;
    }

    setGuesses((prev) => prev + 1);

    const pair: PendingPair = {
      firstIndex,
      secondIndex: index,
      firstCard,
      secondCard,
    };
    pendingPair.current = pair;
    setIsResolving(true);
    setSelectedIndex(null);

    setGame((draft) => {
      const second = draft.grid[index];
      if (second) draft.grid[index] = flipToFace(second);
    });

    if (cardsMatch(firstCard, secondCard)) {
      setMatchedPair({ firstIndex, secondIndex: index });
    }

    await delay(cardsMatch(firstCard, secondCard) ? 1000 : 2500);

    if (pendingPair.current !== pair) return;
    pendingPair.current = null;

    if (cardsMatch(firstCard, secondCard)) {
      setMatchedPair(null);
    }

    setGame((draft) => {
      const first = draft.grid[firstIndex];
      const second = draft.grid[index];
      if (!first || !second) return;

      if (cardsMatch(firstCard, secondCard)) {
        draft.discard.push(flipToBack(first), flipToBack(second));
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
      row: position.r + 1,
      baseZIndex: 5,
    }));

    return [
      {
        id: "hud",
        name: "hud",
        col: 2,
        row: 0,
        width: cols - 2,
        baseZIndex: 1,
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 0,
        row: 0,
        baseZIndex: 40,
        fan: { maxVisible: 1 },
        placeholder: { text: i18n.t("games:memory.matched"), infoPos: "right" },
      },
      ...gridZones,
    ];
  }, [cols, game, rows]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName !== "grid" || mappedCard.pileIndex === undefined) {
      return {};
    }

    const index = mappedCard.pileIndex;
    const isMatched =
      matchedPair?.firstIndex === index || matchedPair?.secondIndex === index;
    return {
      onPress: () => selectCard(index),
      isDisabled: game.ended || mappedCard.card.faceUp,
      forceOverlayColor: isMatched,
      forceSelectColor: isMatched,
      selectColor: isMatched ? "green" : "none",
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "discard") return {};
    return {};
  };

  const { cardMap, getZoneStylesById } = useCardMap({
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
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={guesses}
      winLoseMessage={i18n.t("games:memory.youFoundEveryPair")}
      openMenu={isGameModalOpen}
      onMenuClose={() => setIsGameModalOpen(false)}
    >
      <View style={[getZoneStylesById("hud"), flexStyles.rowCentered]}>
        <View style={[flexStyles.colCentered, flexStyles.flex1]}>
          <Text size="sm" weight={300} color={colorPale}>
            {i18n.t("games:memory.guesses")}
          </Text>
          <Text size="xl" weight={500} color={colorPale}>
            {guesses}
          </Text>
        </View>

        <View style={[flexStyles.colCentered, flexStyles.flex1]}>
          <Text size="sm" weight={300} color={colorPale}>
            {i18n.t("games:memory.difficulty")}
          </Text>
          <Pressable onPress={() => setIsGameModalOpen(true)}>
            <Text size="xl" weight={500} color={colorPale}>
              {i18n.t(DIFFICULTY_LABELS[difficulty])}
            </Text>
          </Pressable>
        </View>
      </View>

      {cardMap}
    </GameWrapper>
  );
}
