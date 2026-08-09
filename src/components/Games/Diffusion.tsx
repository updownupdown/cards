import { useStateManager } from "@/hooks/useStateManager";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  cardLabel,
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  RANK_VALUE,
  shuffle,
  sortCardsByRank,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { View } from "react-native";
import { Text } from "../common/Text";
import { flexStyles } from "@/styles/flexStyles";
import { useGameColors } from "@/hooks/useGameColors";

const reserveCount = 4;
const reserveSize = 4;

type GameState = {
  baseCard: PlayingCard | null;
  reserves: PlayingCard[][];
  foundations: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  ended: boolean;
  won: boolean;
};

export type DiffusionGameState = GameState;

const gameStateInitial: GameState = {
  baseCard: null,
  reserves: Array.from({ length: reserveCount }, () => []),
  foundations: Array.from({ length: 4 }, () => []),
  stock: flipAllToBack(shuffle(createDeck())),
  waste: [],
  ended: false,
  won: false,
};

/** Which foundation row (if any) a card may join right now; -1 if none. */
function foundationTarget(state: GameState, card: PlayingCard): number {
  const base = state.baseCard;
  if (!base) return -1;

  const suitRow = state.foundations.findIndex(
    (row) => row.length > 0 && row[0].suit === card.suit,
  );

  if (suitRow !== -1) {
    if (suitRow === 0) return 0; // first row: any card of its suit
    const above = state.foundations[suitRow - 1];
    return above.some((c) => c.rank === card.rank) ? suitRow : -1;
  }

  // Starting a fresh row: must match the key rank.
  if (card.rank === base.rank) {
    const empty = state.foundations.findIndex(
      (row, i) => i > 0 && row.length === 0,
    );
    if (empty !== -1) return empty;
  }
  return -1;
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.foundations.flat(),
      ...draft.reserves.flat(),
      ...draft.stock,
      ...draft.waste,
    ];

    draft.stock = flipAllToBack(shuffle(allCards));

    draft.baseCard = null;
    draft.foundations = Array.from({ length: 4 }, () => []);
    draft.reserves = [];
    draft.waste = [];

    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    for (let i = 0; i < reserveCount; i += 1) {
      draft.reserves.push(draft.stock.splice(0, reserveSize).map(flipToFace));
    }
  });

  await delay();

  setGame((draft) => {
    const baseCard = draft.stock.pop();
    if (!baseCard) return;

    draft.baseCard = flipToFace(baseCard);
    draft.foundations[0].push(draft.baseCard);
  });
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  if (isSettingUp) return { ended: false, won: false };

  const placed = state.foundations.reduce((sum, row) => sum + row.length, 0);
  if (placed === 52) return { ended: true, won: true };

  if (state.stock.length > 0) return { ended: false, won: false };

  const reservePlayable = state.reserves.some((r) => {
    const card = top(r);
    return card ? foundationTarget(state, card) !== -1 : false;
  });
  const wastePlayable = state.waste.some(
    (card) => foundationTarget(state, card) !== -1,
  );

  if (!reservePlayable && !wastePlayable) return { ended: true, won: false };
  return { ended: false, won: false };
}

export const diffusionRules = {
  foundationTarget,
  evaluateEnd,
};

// ========== Main Component ========== //
export default function Diffusion() {
  const { colorPale } = useGameColors();
  const configuredDrawCount = useGameSettingValue("drawCount");

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
    const { ended, won } = evaluateEnd(game, isSettingUp);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [game, isSettingUp, setGame]);

  function playFromReserve(index: number) {
    if (game.ended) return;
    const card = top(game.reserves[index]);
    if (!card) return;
    const target = foundationTarget(game, card);
    if (target === -1) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.reserves[index].pop();
      if (moved) draft.foundations[target].push(moved);
      sortCardsByRank(draft.foundations[target]);
    });
  }

  function playFromWaste() {
    if (game.ended) return;
    const card = top(game.waste);
    if (!card) return;
    const target = foundationTarget(game, card);
    if (target === -1) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.waste.pop();
      if (moved) draft.foundations[target].push(moved);
      sortCardsByRank(draft.foundations[target]);
    });
  }

  function onStockPress() {
    if (game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (draft.stock.length > 0) {
        const drawTotal = Math.min(configuredDrawCount, draft.stock.length);
        for (let i = 0; i < drawTotal; i += 1) {
          const card = draft.stock.pop();
          if (card) draft.waste.push(flipToFace(card));
        }
      } else if (draft.waste.length > 0) {
        draft.stock = draft.waste.reverse().map(flipToBack);
        draft.waste = [];
      }
    });
  }

  const wasteTop = top(game.waste);
  const wastePlayable = !!wasteTop && foundationTarget(game, wasteTop) !== -1;

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const reserveZones: MapZone[] = game.reserves.map((pile, i) => ({
      id: `reserve-${i}`,
      name: "reserve",
      pileIndex: i,
      cards: pile,
      col: 0,
      row: i * 1.15,
      baseZIndex: 10,
      fan: { maxVisible: 3 },
    }));

    const foundationZones: MapZone[] = game.foundations.flatMap((row, i) =>
      row.map((card) => ({
        id: `foundation-${i}-${card.id}`,
        name: "foundation",
        pileIndex: i,
        cards: [card],
        col: 1.2 + (RANK_VALUE[card.rank] - 1) * 0.3,
        row: i * 1.15,
        baseZIndex: 20,
      })),
    );

    const foundationBackgrounds: MapZone[] = Array.from(
      { length: 4 },
      (_, i) => ({
        id: `foundation-bg-${i}`,
        name: "foundation-bg",
        pileIndex: i,
        col: 1.1,
        row: i * 1.15 - 0.08,
        baseZIndex: 1,
        width: 4.8,
        height: 1.16,
        placeholder: {},
      }),
    );

    return [
      ...foundationBackgrounds,
      ...reserveZones,
      ...foundationZones,
      {
        id: "base-card",
        name: "base-card",
        cards: [],
        col: 0,
        row: 4.7,
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 2.3,
        row: 4.7,
        fan: { maxVisible: 3 },
        baseZIndex: 60,
        placeholder: { text: "Stock", infoPos: "left" },
      },
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: 3.6,
        row: 4.7,
        fan: { maxVisible: 3 },
        baseZIndex: 60,
        placeholder: { text: "Waste", infoPos: "right" },
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (!mappedCard.topOfZone) return {};

    if (
      mappedCard.zoneName === "reserve" &&
      mappedCard.pileIndex !== undefined
    ) {
      const index = mappedCard.pileIndex;
      const playable = foundationTarget(game, mappedCard.card) !== -1;
      return {
        isDisabled: game.ended,
        selectColor: playable ? "green" : "none",
        onPress: () => playFromReserve(index),
      };
    }

    if (mappedCard.zoneName === "waste") {
      return {
        isDisabled: game.ended,
        selectColor: wastePlayable ? "green" : "none",
        onPress: playFromWaste,
      };
    }

    if (mappedCard.zoneName === "stock") {
      return {
        isDisabled: game.ended,
        onPress: onStockPress,
      };
    }

    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      // Allow redeal when the stock has emptied.
      return {
        onPress: onStockPress,
        isDisabled: game.ended || game.waste.length === 0,
      };
    }
    return {};
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    gap: 0.14,
    cardSize: "small",
  });

  const placed = game.foundations.reduce((sum, row) => sum + row.length, 0);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={placed}
      winLoseMessage={
        game.won ? "Every suit soaked through!" : "Nothing left to play."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[getZoneStylesById("base-card"), flexStyles.colCentered]}>
        <Text size="sm" weight={500}>
          Key
        </Text>
        <Text size="xxxl" weight={500} color={colorPale}>
          {game.baseCard ? cardLabel(game.baseCard) : `\u0020`}
        </Text>
      </View>
    </GameWrapper>
  );
}
