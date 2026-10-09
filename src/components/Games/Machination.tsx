import { useGameColors } from "@/hooks/useGameColors";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useStateManager } from "@/hooks/useStateManager";
import { i18n } from "@/i18n";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  collectCards,
  createDeck,
  flipAllToBack,
  flipToFace,
  rankValue,
  redealWith,
  shuffle,
  top,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { ProgressBar } from "../Home/ProgressBar";
import { rgba } from "@/styles/styles";

// The whole stock is placed, one card at a time, on piles of the player's
// choosing; Aces go straight to the foundations. Only then are the piles
// unpacked onto the foundations. The order of that unpacking can't matter (a
// card that can be built stays buildable until it is), so it plays itself:
// the game is won or lost in the placing.
const NORMAL_PILES = 8;
const HARD_PILES = 7;
const BOARD_COLS = 8;
const BUILD_INTERVAL = 150;
const FOUNDATION_COUNT = 4;
const DECK_SIZE = 52;
const BOARD_GAP = 0.12;
/** The bar across the top that drains with the stock, in card heights. */
const BAR_HEIGHT = 0.12;
const TOP_ROW = BAR_HEIGHT + 0.5;
const PILE_ROW = TOP_ROW + 1.4;
/** The most a pile may fan down before its cards close up to fit. */
const PILE_SPAN = 3.4;
const FOUNDATION_COL = 3;
const BOARD_ROWS = PILE_ROW + 1 + PILE_SPAN;

export type MachinationGameState = {
  /** Face down; the top card is turned as it comes into play. */
  stock: PlayingCard[];
  piles: PlayingCard[][];
  /** In the order the Aces appeared. */
  foundations: PlayingCard[][];
};

// ========== Rules ========== //
/** The stock card in play: the top one, once turned. */
function turnedCard(state: MachinationGameState) {
  const card = top(state.stock);
  return card?.faceUp ? card : undefined;
}

function isPlacing(state: MachinationGameState) {
  return state.stock.length > 0;
}

/** Where a suit builds: the foundation its Ace started, or an empty one. */
function foundationFor(state: MachinationGameState, card: PlayingCard) {
  const own = state.foundations.findIndex(
    (pile) => pile[0]?.suit === card.suit,
  );
  if (own >= 0) return own;
  return state.foundations.findIndex((pile) => pile.length === 0);
}

/** A card builds when it is the next rank of its suit; an Ace starts a suit. */
function canBuild(state: MachinationGameState, card: PlayingCard | undefined) {
  if (!card) return false;
  const index = foundationFor(state, card);
  if (index < 0) return false;
  const pileTop = top(state.foundations[index]);
  return pileTop
    ? rankValue(card) === rankValue(pileTop) + 1
    : card.rank === "A";
}

/** Turns the top stock card; an Ace goes straight to a foundation. */
function turnStockCard(state: MachinationGameState) {
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
function placeCard(state: MachinationGameState, pileIndex: number) {
  const card = turnedCard(state);
  if (!card) return false;
  state.stock.pop();
  state.piles[pileIndex].push(card);
  return true;
}

/** Builds a pile's top card onto its foundation, once the stock is empty. */
function buildCard(state: MachinationGameState, pileIndex: number) {
  const card = top(state.piles[pileIndex]);
  if (isPlacing(state) || !canBuild(state, card)) return false;
  state.piles[pileIndex].pop();
  state.foundations[foundationFor(state, card!)].push(card!);
  return true;
}

function isWon(state: MachinationGameState) {
  return (
    state.foundations.reduce((sum, pile) => sum + pile.length, 0) === DECK_SIZE
  );
}

function isLost(state: MachinationGameState) {
  return (
    !isPlacing(state) &&
    !isWon(state) &&
    !state.piles.some((pile) => canBuild(state, top(pile)))
  );
}

// ========== Deal ========== //
/** The next pile top that builds, if any. */
function buildablePile(state: MachinationGameState) {
  return state.piles.findIndex((pile) => canBuild(state, top(pile)));
}

function createInitialState(
  pileCount: number = NORMAL_PILES,
): MachinationGameState {
  return {
    stock: shuffle(createDeck()),
    piles: Array.from({ length: pileCount }, () => []),
    foundations: Array.from({ length: FOUNDATION_COUNT }, () => []),
  };
}

function gatherState(state: MachinationGameState): MachinationGameState {
  return {
    stock: shuffle(flipAllToBack(collectCards(state))),
    piles: state.piles.map(() => []),
    foundations: Array.from({ length: FOUNDATION_COUNT }, () => []),
  };
}

const gameStateInitial = createInitialState();

export const machinationRules = {
  NORMAL_PILES,
  HARD_PILES,
  buildablePile,
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
export default function Machination() {
  const { colorAccent } = useGameColors();
  const pileCount =
    useGameSettingValue("difficulty") === "difficult"
      ? HARD_PILES
      : NORMAL_PILES;

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<MachinationGameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      // Gather every card into the stock, then deal the same cards afresh.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) =>
        redealWith(createInitialState(pileCount), draft.stock),
      );
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

  // Once the stock is empty, the piles build onto the foundations by
  // themselves, one card at a time.
  const nextBuild = placing || ended || isSettingUp ? -1 : buildablePile(game);
  useEffect(() => {
    if (nextBuild < 0) return;
    const timer = setTimeout(() => {
      setGame((draft) => {
        buildCard(draft, nextBuild);
      });
    }, BUILD_INTERVAL);
    return () => clearTimeout(timer);
  }, [game, nextBuild, setGame]);

  function onPilePress(pileIndex: number) {
    if (ended || isSettingUp || !placing || !turned) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      placeCard(draft, pileIndex);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((cards, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards,
      col: FOUNDATION_COL + i,
      row: TOP_ROW,
      baseZIndex: 30,
      fan: { maxVisible: 3 },
      placeholder: { iconName: "ace" },
    }));
    // Fewer piles sit in the middle of the board.
    const firstCol = (BOARD_COLS - game.piles.length) / 2;
    const pileZones: MapZone[] = game.piles.map((cards, i) => ({
      id: `pile-${i}`,
      name: "pile",
      pileIndex: i,
      cards,
      col: firstCol + i,
      row: PILE_ROW,
      baseZIndex: 10,
      fan: {
        direction: "down",
        offset: zoneFanOffset(
          cards.length,
          PILE_SPAN + 1,
          0.1,
          cardDims.tableauOffset,
        ),
      },
      placeholder: {},
    }));
    return [
      {
        id: "stock-bar",
        col: 0,
        row: 0,
        width: "full",
        height: BAR_HEIGHT,
        baseZIndex: 1,
      },
      // The bar above says how many cards are left, so the stock needs no label.
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: TOP_ROW,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: {
          text: "Stock",
          infoPos: "right",
        },
      },
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
    // While placing, a whole pile takes the turned card; every pile does, so
    // none is marked.
    const canPlay = placing && turned !== undefined;
    return {
      onPress: () => onPilePress(index),
      isDisabled: ended || !canPlay,
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    const index = zone.pileIndex;
    if (zone.name !== "pile" || index === undefined) return;
    const canPlay = placing && turned !== undefined;
    return {
      onPress: () => onPilePress(index),
      isDisabled: ended || !canPlay,
    };
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: BOARD_GAP,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    fixedCols: BOARD_COLS,
    fixedRows: BOARD_ROWS,
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
          ? i18n.t("games:machination.allBuilt")
          : i18n.t("games:machination.stuck", {
              value: game.piles.reduce((sum, pile) => sum + pile.length, 0),
            })
      }
    >
      {cardMap}

      {/* Cards still to place */}
      <View style={getZoneStylesById("stock-bar")}>
        <ProgressBar
          totalValue={DECK_SIZE}
          progressValue={game.stock.length}
          color={colorAccent}
          scaledHeight={cardHeight * BAR_HEIGHT}
          backgroundColor={rgba(colorAccent, 0.2)}
        />
      </View>
    </GameWrapper>
  );
}
