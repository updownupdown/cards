import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  cardColor,
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { Colors, rgba } from "@/styles/styles";
import { i18n } from "@/i18n";
import { flexStyles } from "@/styles/flexStyles";
import { delay } from "@/utils/utils";

export type JailbreakDifficulty = "easy" | "normal" | "hard";
export type JailbreakSource =
  | { zone: "jail"; index: number }
  | { zone: "joker" };

export type JailbreakGameState = {
  piles: PlayingCard[][];
  remainder: PlayingCard[];
  jokerPile: PlayingCard[];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const WALL_INDICES = [0, 2, 4, 6];
const WALL_SIZE = 6;
const MAX_JOKER_CARDS = 3;
const JOKER: PlayingCard = {
  id: "jailbreak-joker",
  suit: "spades",
  rank: "Joker",
  faceUp: true,
};
const CORNER_CARDS: Record<JailbreakDifficulty, number> = {
  easy: 4,
  normal: 2,
  hard: 0,
};
const JAIL_GRID_START_COL = 1.35;
const JAIL_POSITIONS = [
  { col: JAIL_GRID_START_COL + 1, row: 0 },
  { col: JAIL_GRID_START_COL + 2, row: 0 },
  { col: JAIL_GRID_START_COL + 2, row: 1.2 },
  { col: JAIL_GRID_START_COL + 2, row: 2.4 },
  { col: JAIL_GRID_START_COL + 1, row: 2.4 },
  { col: JAIL_GRID_START_COL, row: 2.4 },
  { col: JAIL_GRID_START_COL, row: 1.2 },
  { col: JAIL_GRID_START_COL, row: 0 },
];

function createEmptyState(): JailbreakGameState {
  return {
    piles: Array.from({ length: 8 }, () => []),
    remainder: createDeck().map(flipToBack),
    jokerPile: [],
    discard: [],
    ended: false,
    won: false,
  };
}

function createJailbreakState(
  difficulty: JailbreakDifficulty,
  random: () => number = Math.random,
  deckCount = 1,
): JailbreakGameState {
  const deck = shuffle(createDeck({ deckCount }), random);
  const piles = dealJailbreakPiles(deck, difficulty);

  return {
    piles,
    remainder: deck.map(flipToBack),
    jokerPile: [],
    discard: [],
    ended: false,
    won: false,
  };
}

function dealJailbreakPiles(
  deck: PlayingCard[],
  difficulty: JailbreakDifficulty,
) {
  const piles = Array.from({ length: 8 }, (_, index) => {
    const size = WALL_INDICES.includes(index)
      ? WALL_SIZE
      : CORNER_CARDS[difficulty];
    const pile = deck.splice(0, size).map(flipToBack);
    if (pile.length > 0) pile[pile.length - 1] = flipToFace(pile.at(-1)!);
    return pile;
  });
  return piles;
}

async function resetAndSetup(
  setGame: (
    updater: JailbreakGameState | ((draft: JailbreakGameState) => void),
  ) => void,
  difficulty: JailbreakDifficulty,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.remainder,
      ...draft.discard,
      ...draft.jokerPile,
      ...draft.piles.flat(),
    ];
    draft.remainder = shuffle(allCards).map(flipToBack);
    draft.piles = Array.from({ length: 8 }, () => []);
    draft.jokerPile = [];
    draft.discard = [];
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    const drawPile = [...draft.remainder];
    draft.piles = dealJailbreakPiles(drawPile, difficulty);
    draft.remainder = drawPile;
  });
}

function getSourceCard(state: JailbreakGameState, source: JailbreakSource) {
  return source.zone === "joker"
    ? top(state.jokerPile)
    : top(state.piles[source.index]);
}

function selectionTotals(
  state: JailbreakGameState,
  selections: JailbreakSource[],
) {
  return selections.reduce(
    (totals, source) => {
      const card = getSourceCard(state, source);
      if (card) totals[cardColor(card)] += rankValue(card);
      return totals;
    },
    { red: 0, black: 0 },
  );
}

function isBalancedSelection(
  state: JailbreakGameState,
  selections: JailbreakSource[],
) {
  const totals = selectionTotals(state, selections);
  return totals.red > 0 && totals.red === totals.black;
}

function availableCards(state: JailbreakGameState) {
  return [...state.piles.map(top), top(state.jokerPile)].filter(
    (card): card is PlayingCard => !!card,
  );
}

function subsetSums(cards: PlayingCard[]) {
  const sums = new Set<number>();
  for (let mask = 1; mask < 1 << cards.length; mask += 1) {
    let sum = 0;
    for (let index = 0; index < cards.length; index += 1) {
      if (mask & (1 << index)) sum += rankValue(cards[index]);
    }
    sums.add(sum);
  }
  return sums;
}

function hasMatchingCards(state: JailbreakGameState) {
  const cards = availableCards(state);
  const redSums = subsetSums(cards.filter((card) => cardColor(card) === "red"));
  const blackSums = subsetSums(
    cards.filter((card) => cardColor(card) === "black"),
  );
  return [...redSums].some((sum) => blackSums.has(sum));
}

function hasAvailableMove(state: JailbreakGameState) {
  if (state.remainder.length > 0 && state.jokerPile.length < MAX_JOKER_CARDS) {
    return true;
  }
  return hasMatchingCards(state);
}

function isWon(state: JailbreakGameState) {
  return (
    state.jokerPile.length === 0 &&
    WALL_INDICES.some((index) => state.piles[index].length === 0)
  );
}

function removeSelections(
  state: JailbreakGameState,
  selections: JailbreakSource[],
) {
  const jailIndices = selections
    .filter(
      (source): source is Extract<JailbreakSource, { zone: "jail" }> =>
        source.zone === "jail",
    )
    .map((source) => source.index);

  for (const index of jailIndices) {
    const card = state.piles[index].pop();
    if (card) state.discard.push(flipToBack(card));
    const next = top(state.piles[index]);
    if (next)
      state.piles[index][state.piles[index].length - 1] = flipToFace(next);
  }

  if (selections.some((source) => source.zone === "joker")) {
    const card = state.jokerPile.pop();
    if (card) state.discard.push(flipToBack(card));
  }
}

export const jailbreakRules = {
  cornerCards: CORNER_CARDS,
  createInitialState: createJailbreakState,
  selectionTotals,
  isBalancedSelection,
  hasMatchingCards,
  hasAvailableMove,
  isWon,
  removeSelections,
  maxJokerCards: MAX_JOKER_CARDS,
  wallIndices: WALL_INDICES,
};

function sameSource(left: JailbreakSource, right: JailbreakSource) {
  return (
    left.zone === right.zone &&
    (left.zone === "joker" ||
      (right.zone === "jail" && left.index === right.index))
  );
}

export default function Jailbreak() {
  const difficulty = useGameSettingValue(
    "jailbreakDifficulty",
  ) as JailbreakDifficulty;
  const { spacing } = useResponsiveMetrics();
  const [selected, setSelected] = useState<JailbreakSource[]>([]);
  const {
    isSettingUp,
    isLoaded,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<JailbreakGameState>({
    gameStateInitial: createEmptyState(),
    resetNonGameStates: () => setSelected([]),
    resetAndSetup: async (): Promise<void> => {
      await resetAndSetup(setGame, difficulty);
    },
  });

  useEffect(() => {
    if (isSettingUp) return;
    const won = isWon(game);
    const ended = won || !hasAvailableMove(game);
    if (won !== game.won || ended !== game.ended) {
      setGame((draft) => {
        draft.won = won;
        draft.ended = ended;
      });
    }
  }, [game, isSettingUp, setGame]);

  const totals = selectionTotals(game, selected);

  function toggleSelection(source: JailbreakSource) {
    if (game.ended || !getSourceCard(game, source)) return;
    const exists = selected.some((entry) => sameSource(entry, source));
    const next = exists
      ? selected.filter((entry) => !sameSource(entry, source))
      : [...selected, source];

    if (isBalancedSelection(game, next)) {
      saveUndoState(structuredClone(game));
      setGame((draft) => removeSelections(draft, next));
      setSelected([]);
      return;
    }
    setSelected(next);
  }

  function drawRemainder() {
    if (
      game.ended ||
      game.remainder.length === 0 ||
      game.jokerPile.length >= MAX_JOKER_CARDS
    ) {
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.remainder.pop();
      if (card) draft.jokerPile.push(flipToFace(card));
    });
    setSelected([]);
  }

  const zones: MapZone[] = useMemo(
    () => [
      ...game.piles.map((pile, index) => ({
        id: `jail-${index}`,
        name: "jail",
        pileIndex: index,
        cards: pile,
        ...JAIL_POSITIONS[index],
        fan: { maxVisible: 4 },
        placeholder: {
          showCount: pile.length > 0,
          infoPos: "below" as const,
        },
      })),
      {
        id: "joker",
        name: "joker",
        cards: [JOKER, ...game.jokerPile],
        col: JAIL_GRID_START_COL + 1,
        row: 1.2,
        fan: { maxVisible: 4 },
        placeholder: {
          showCount: game.jokerPile.length > 1,
          infoPos: "below" as const,
        },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 0,
        row: 1.2,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:discard"),
          showCount: true,
          infoPos: "below",
        },
      },
      {
        id: "remainder",
        name: "remainder",
        cards: game.remainder,
        col: 0,
        row: 2.4,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:jailbreak.remainder"),
          showCount: true,
          infoPos: "below",
        },
      },
      {
        id: "hud",
        name: "hud",
        col: 0,
        row: 0,
      },
    ],
    [game],
  );

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    if (card.zoneName === "remainder" || card.zoneName === "discard") {
      return { clickThroughCards: true };
    }
    if (card.zoneName === "joker" && card.card.rank === "Joker") {
      return { forceOverlayColor: true, selectColor: "lightGrey" };
    }
    if (!card.topOfZone) return {};
    const source: JailbreakSource =
      card.zoneName === "joker"
        ? { zone: "joker" }
        : { zone: "jail", index: card.pileIndex! };
    return {
      onPress: () => toggleSelection(source),
      isDisabled: game.ended,
      isSelected: selected.some((entry) => sameSource(entry, source)),
      selectColor: "blue",
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined =>
    zone.name === "remainder"
      ? {
          onPress: drawRemainder,
          isDisabled:
            game.ended ||
            game.remainder.length === 0 ||
            game.jokerPile.length >= MAX_JOKER_CARDS,
        }
      : undefined;

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "regular",
    gap: 0.4,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      winLoseMessage={
        game.won
          ? i18n.t("games:jailbreak.theJokerEscaped")
          : i18n.t("cards:noMovesRemain")
      }
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("hud"),
          {
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
            borderRadius: 6,
            backgroundColor: Colors.white,
            paddingHorizontal: spacing(12),
            paddingVertical: spacing(6),
            gap: spacing(4),
            boxShadow: `${spacing(2)}px ${spacing(4)}px ${spacing(12)}px ${rgba(Colors.black, 0.7)}`,
          },
        ]}
      >
        <Text
          size="xxxl"
          weight="bold"
          color={rgba(Colors.buttonRed, totals.red === 0 ? 0.3 : 1)}
        >
          {totals.red}
        </Text>

        <Text
          size="xxxl"
          weight="bold"
          color={rgba(Colors.K900, totals.black === 0 ? 0.3 : 1)}
        >
          {totals.black}
        </Text>
      </View>
    </GameWrapper>
  );
}
