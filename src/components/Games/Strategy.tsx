import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { i18n } from "@/i18n";
import { flexStyles } from "@/styles/flexStyles";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  flipToFace,
  rankValue,
  redealWith,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

// Strategy (Morehead & Mott-Smith): the whole stock is placed, one card at a
// time, on eight piles of the player's choosing; Aces go straight to the
// foundations. Only then are the piles unpacked onto the foundations, so the
// game is won or lost in the placing.
const PILE_COUNT = 8;
const FOUNDATION_COUNT = 4;
const DECK_SIZE = 52;
const PILE_ROW = 1.4;
const PILE_OFFSET = 0.22;
const FOUNDATION_COL = 3;

export type StrategyGameState = {
  /** Face down; the top card is turned as it comes into play. */
  stock: PlayingCard[];
  piles: PlayingCard[][];
  /** In the order the Aces appeared. */
  foundations: PlayingCard[][];
};

// ========== Rules ========== //
/** The stock card in play: the top one, once turned. */
function turnedCard(state: StrategyGameState) {
  const card = top(state.stock);
  return card?.faceUp ? card : undefined;
}

function isPlacing(state: StrategyGameState) {
  return state.stock.length > 0;
}

/** Where a suit builds: the foundation its Ace started, or an empty one. */
function foundationFor(state: StrategyGameState, card: PlayingCard) {
  const own = state.foundations.findIndex(
    (pile) => pile[0]?.suit === card.suit,
  );
  if (own >= 0) return own;
  return state.foundations.findIndex((pile) => pile.length === 0);
}

/** A card builds when it is the next rank of its suit; an Ace starts a suit. */
function canBuild(state: StrategyGameState, card: PlayingCard | undefined) {
  if (!card) return false;
  const index = foundationFor(state, card);
  if (index < 0) return false;
  const pileTop = top(state.foundations[index]);
  return pileTop
    ? rankValue(card) === rankValue(pileTop) + 1
    : card.rank === "A";
}

/** Turns the top stock card; an Ace goes straight to a foundation. */
function turnStockCard(state: StrategyGameState) {
  const card = top(state.stock);
  if (!card || card.faceUp) return false;
  if (card.rank === "A") {
    state.stock.pop();
    state.foundations[foundationFor(state, card)].push(flipToFace(card));
  } else {
    state.stock[state.stock.length - 1] = flipToFace(card);
  }
  return true;
}

/** Places the turned stock card on a pile. */
function placeCard(state: StrategyGameState, pileIndex: number) {
  const card = turnedCard(state);
  if (!card) return false;
  state.stock.pop();
  state.piles[pileIndex].push(card);
  return true;
}

/** Builds a pile's top card onto its foundation, once the stock is empty. */
function buildCard(state: StrategyGameState, pileIndex: number) {
  const card = top(state.piles[pileIndex]);
  if (isPlacing(state) || !canBuild(state, card)) return false;
  state.piles[pileIndex].pop();
  state.foundations[foundationFor(state, card!)].push(card!);
  return true;
}

function isWon(state: StrategyGameState) {
  return (
    state.foundations.reduce((sum, pile) => sum + pile.length, 0) === DECK_SIZE
  );
}

function isLost(state: StrategyGameState) {
  return (
    !isPlacing(state) &&
    !isWon(state) &&
    !state.piles.some((pile) => canBuild(state, top(pile)))
  );
}

// ========== Deal ========== //
function createInitialState(): StrategyGameState {
  return {
    stock: shuffle(createDeck()),
    piles: Array.from({ length: PILE_COUNT }, () => []),
    foundations: Array.from({ length: FOUNDATION_COUNT }, () => []),
  };
}

function gatherState(state: StrategyGameState): StrategyGameState {
  return {
    stock: shuffle(flipAllToBack(collectCards(state))),
    piles: Array.from({ length: PILE_COUNT }, () => []),
    foundations: Array.from({ length: FOUNDATION_COUNT }, () => []),
  };
}

const gameStateInitial = createInitialState();

export const strategyRules = {
  turnedCard,
  isPlacing,
  foundationFor,
  canBuild,
  turnStockCard,
  placeCard,
  buildCard,
  isWon,
  isLost,
  createInitialState,
};

// ========== Component ========== //
export default function Strategy() {
  const { colorPale } = useGameColors();

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<StrategyGameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      // Gather every card into the stock, then deal the same cards afresh.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) => redealWith(createInitialState(), draft.stock));
    },
  });

  const won = isWon(game);
  const lost = isLost(game);
  const ended = won || lost;
  const placing = isPlacing(game);
  const turned = turnedCard(game);

  // Turn the next stock card as it comes into play; an Ace needs no choice.
  useEffect(() => {
    if (isSettingUp || !placing || turned) return;
    setGame((draft) => {
      turnStockCard(draft);
    });
  }, [game, isSettingUp, placing, turned, setGame]);

  function onPilePress(pileIndex: number) {
    if (ended || isSettingUp) return;
    if (placing ? !turned : !canBuild(game, top(game.piles[pileIndex]))) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (placing) placeCard(draft, pileIndex);
      else buildCard(draft, pileIndex);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((cards, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards,
      col: FOUNDATION_COL + i,
      row: 0,
      baseZIndex: 30,
      fan: { maxVisible: 3 },
      placeholder: {},
    }));
    const pileZones: MapZone[] = game.piles.map((cards, i) => ({
      id: `pile-${i}`,
      name: "pile",
      pileIndex: i,
      cards,
      col: i,
      row: PILE_ROW,
      baseZIndex: 10,
      fan: { direction: "down", offset: PILE_OFFSET },
      placeholder: {},
    }));
    return [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: 0,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          showCount: true,
          infoPos: "below",
        },
      },
      { id: "status", col: 1, row: 0, width: 2, height: 1 },
      ...foundationZones,
      ...pileZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const index = mappedCard.pileIndex;
    if (mappedCard.zoneName !== "pile" || index === undefined) {
      return { isDisabled: true };
    }
    // While placing, a whole pile takes the turned card; after, only a top
    // card that builds can be played.
    const canPlay = placing
      ? turned !== undefined
      : mappedCard.topOfZone && canBuild(game, mappedCard.card);
    const lit = canPlay && mappedCard.topOfZone;
    return {
      onPress: () => onPilePress(index),
      isDisabled: ended || !canPlay,
      selectColor: lit ? "green" : "none",
      forceOverlayColor: lit,
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    const index = zone.pileIndex;
    if (zone.name !== "pile" || index === undefined) return;
    const canPlay = placing && turned !== undefined;
    return {
      onPress: () => onPilePress(index),
      isDisabled: ended || !canPlay,
      selectColor: canPlay ? "green" : "none",
    };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedCols: PILE_COUNT,
    fixedRows: 5.2,
  });

  return (
    <GameWrapper
      outcome={won ? "won" : lost ? "lost" : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      hideScore
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        won
          ? i18n.t("games:strategy.allBuilt")
          : i18n.t("cards:noLegalMovesRemain")
      }
    >
      {cardMap}

      <View
        style={[
          pointerEventsStyles.none,
          flexStyles.colCentered,
          getZoneStylesById("status"),
        ]}
      >
        <Text
          size="xs"
          weight={500}
          color={colorPale}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {placing
            ? i18n.t("games:strategy.status.place")
            : i18n.t("games:strategy.status.build")}
        </Text>
      </View>
    </GameWrapper>
  );
}
