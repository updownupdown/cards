import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  SUITS,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
const reserveCount = 20;
const reserveCols = 5;
const dealSize = 20;
const reserveCol = 1.2;
const rowStep = 1;
const kingCol = reserveCol + reserveCols + 0.2;
const dealingCol = 0;
const progressBarWidth = 3.5;
const progressBarCol = (dealingCol + kingCol + 1 - progressBarWidth) / 2;
// Keep the stock, dealing pile, and deal progress together above the tableau.
const stockRow = 0;
const tableauRowOffset = 1.5;

/**
 * "opening": reserve gaps refill from the stock.
 * "dealing": each stock card must be placed on a reserve pile (or played up).
 * "play": reserve cards go up; gaps stay empty until the next deal.
 */
type Phase = "opening" | "dealing" | "play";

type GameState = {
  stock: PlayingCard[];
  dealing: PlayingCard[];
  reserves: PlayingCard[][];
  /** 0-3 build up from the Aces by suit; 4-7 down from the Kings. */
  foundations: PlayingCard[][];
  phase: Phase;
  /** Cards still to place on the reserves in the current deal. */
  toPlace: number;
  ended: boolean;
  won: boolean;
};

export type SlyFoxGameState = GameState;

const gameStateInitial: GameState = {
  stock: shuffle(createDeck({ deckCount: 2 })).map(flipToBack),
  dealing: [],
  reserves: Array.from({ length: reserveCount }, () => []),
  foundations: Array.from({ length: 8 }, () => []),
  phase: "opening",
  toPlace: 0,
  ended: false,
  won: false,
};

function foundationFor(state: GameState, card: PlayingCard) {
  return state.foundations.findIndex((pile, index) => {
    const pileTop = top(pile);
    return (
      !!pileTop &&
      pileTop.suit === card.suit &&
      rankValue(card) === rankValue(pileTop) + (index < 4 ? 1 : -1)
    );
  });
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  const playing = { ended: false, won: false };
  if (isSettingUp) return playing;

  const placed = state.foundations.reduce((sum, pile) => sum + pile.length, 0);
  if (placed === 104) return { ended: true, won: true };
  if (state.phase === "dealing" || state.stock.length > 0) return playing;

  const hasMove = state.reserves.some((pile) => {
    const card = top(pile);
    return !!card && foundationFor(state, card) >= 0;
  });
  return hasMove ? playing : { ended: true, won: false };
}

/** Ends the deal once every batch card is placed. */
function settleDeal(draft: GameState) {
  const dealingTop = top(draft.dealing);
  if (draft.toPlace > 0 && dealingTop) {
    draft.dealing[draft.dealing.length - 1] = flipToFace(dealingTop);
    return;
  }
  draft.phase = "play";
  draft.toPlace = 0;
}

/**
 * Playing: reserve cards go home, else deal the next batch. Dealing: a card
 * that can go home goes home; else it goes on the reserve whose top card the
 * foundations will want after it, as soon after as possible, so the piles
 * come back off in order.
 */
function findSlyFoxHint(state: GameState) {
  const home = (card: PlayingCard) =>
    makeHint(
      "toFoundation",
      cardTarget(card),
      zoneTarget(`foundation-${foundationFor(state, card)}`),
    );
  if (state.phase !== "dealing") {
    const playable = state.reserves
      .map((pile) => top(pile))
      .find((card) => card && foundationFor(state, card) >= 0);
    if (playable) return home(playable);
    return state.stock.length > 0
      ? makeHint("draw", zoneTarget("stock"))
      : null;
  }

  const card = top(state.dealing);
  if (!card) return null;
  if (foundationFor(state, card) >= 0) return home(card);
  // How many cards of its suit must go up before this one is wanted.
  const wait = (candidate: PlayingCard) =>
    Math.min(
      ...state.foundations.map((pile, index) => {
        const pileTop = top(pile);
        if (!pileTop || pileTop.suit !== candidate.suit) return 26;
        const steps =
          (rankValue(candidate) - rankValue(pileTop)) * (index < 4 ? 1 : -1);
        return steps > 0 ? steps : 26;
      }),
    );
  const fit = (pile: PlayingCard[]) => {
    const pileTop = top(pile);
    if (!pileTop) return 50;
    const gap = wait(pileTop) - wait(card);
    return gap >= 0 ? 100 - gap : gap * 4;
  };
  const best = state.reserves.reduce(
    (pick, pile, index) =>
      fit(pile) > fit(state.reserves[pick]) ? index : pick,
    0,
  );
  return makeHint("moveCard", cardTarget(card), zoneTarget(`reserve-${best}`));
}

export const slyFoxRules = {
  findHint: findSlyFoxHint,
  foundationFor,
  evaluateEnd,
};

export default function SlyFox() {
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
    gameStateInitial,
    resetAndSetup: async () => {
      setGame((draft) => {
        const cards = [
          ...draft.stock,
          ...draft.dealing,
          ...draft.reserves.flat(),
          ...draft.foundations.flat(),
        ];
        draft.stock = shuffle(cards).map(flipToBack);
        draft.dealing = [];
        draft.reserves = Array.from({ length: reserveCount }, () => []);
        draft.foundations = Array.from({ length: 8 }, () => []);
        draft.phase = "opening";
        draft.toPlace = 0;
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        const deck = [...draft.stock];
        const take = (rank: "A" | "K", suit: PlayingCard["suit"]) =>
          flipToFace(
            deck.splice(
              deck.findIndex(
                (card) => card.rank === rank && card.suit === suit,
              ),
              1,
            )[0],
          );
        SUITS.forEach((suit, index) => {
          draft.foundations[index] = [take("A", suit)];
          draft.foundations[4 + index] = [take("K", suit)];
        });
        draft.reserves = Array.from({ length: reserveCount }, () => {
          const card = deck.pop();
          return card ? [flipToFace(card)] : [];
        });
        draft.stock = deck;
      });
    },
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

  useHint(() => findSlyFoxHint(game), {
    game,
    enabled: !isSettingUp && !game.ended,
  });

  function onReservePress(index: number) {
    if (game.ended) return;

    if (game.phase === "dealing") {
      if (!top(game.dealing)) return;
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        const card = draft.dealing.pop();
        if (card) draft.reserves[index].push(flipToFace(card));
        draft.toPlace -= 1;
        settleDeal(draft);
      });
      return;
    }

    const card = top(game.reserves[index]);
    if (!card) return;
    const target = foundationFor(game, card);
    if (target < 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.reserves[index].pop();
      if (moved) draft.foundations[target].push(moved);
      if (draft.phase === "opening" && draft.reserves[index].length === 0) {
        const refill = draft.stock.pop();
        if (refill) draft.reserves[index].push(flipToFace(refill));
      }
    });
  }

  function onStockPress() {
    if (game.ended || game.stock.length === 0) return;

    if (game.phase === "dealing") {
      // A dealt card may go straight up without counting towards the deal.
      const card = top(game.dealing);
      if (!card) return;
      const target = foundationFor(game, card);
      if (target < 0) return;
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        const moved = draft.dealing.pop();
        if (moved) draft.foundations[target].push(flipToFace(moved));
        draft.toPlace -= 1;
        settleDeal(draft);
      });
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.phase = "dealing";
      draft.dealing = draft.stock.splice(
        Math.max(0, draft.stock.length - dealSize),
      );
      draft.toPlace = draft.dealing.length;
      settleDeal(draft);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: i < 4 ? 0 : kingCol,
      row: tableauRowOffset + (i % 4) * rowStep,
      fan: { maxVisible: 3 },
      placeholder: { iconName: i < 4 ? "ace" : "king" },
    }));

    const reserveZones: MapZone[] = game.reserves.map((pile, i) => ({
      id: `reserve-${i}`,
      name: "reserve",
      pileIndex: i,
      cards: pile,
      col: reserveCol + (i % reserveCols),
      row: tableauRowOffset + Math.floor(i / reserveCols) * rowStep,
      fan: { maxVisible: 3 },
      placeholder: {},
    }));

    return [
      ...foundationZones,
      ...reserveZones,
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: kingCol,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "left",
        },
      },
      {
        id: "dealing",
        name: "dealing",
        cards: game.dealing,
        col: dealingCol,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder:
          game.phase === "dealing"
            ? {
                text: i18n.t("games:slyFox.dealing"),
                infoPos: "right",
                showCount: false,
              }
            : undefined,
      },
      {
        id: "dealing-progress",
        col: progressBarCol,
        row: stockRow,
        width: progressBarWidth,
      },
    ];
  }, [game]);

  const isDealing = game.phase === "dealing";

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (!mappedCard.topOfZone) return {};
    if (
      mappedCard.zoneName === "reserve" &&
      mappedCard.pileIndex !== undefined
    ) {
      const index = mappedCard.pileIndex;
      return {
        isDisabled: game.ended,
        selectColor: isDealing ? "green" : "none",
        onPress: () => onReservePress(index),
      };
    }
    if (mappedCard.zoneName === "stock") {
      return { isDisabled: game.ended, onPress: onStockPress };
    }
    if (mappedCard.zoneName === "dealing") {
      const card = top(game.dealing);
      if (!card) return {};
      return {
        isDisabled: game.ended,
        onPress: () => {
          const target = foundationFor(game, card);
          if (target < 0) return;
          saveUndoState(structuredClone(game));
          setGame((draft) => {
            const moved = draft.dealing.pop();
            if (moved) draft.foundations[target].push(flipToFace(moved));
            draft.toPlace -= 1;
            settleDeal(draft);
          });
        },
      };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "reserve" && zone.pileIndex !== undefined) {
      const index = zone.pileIndex;
      return {
        onPress: () => onReservePress(index),
        isDisabled: game.ended || !isDealing,
        isSelected: isDealing,
        selectColor: "green",
      };
    }
    if (zone.name === "stock") {
      return {
        onPress: onStockPress,
        isDisabled: game.ended || game.stock.length === 0,
      };
    }
    if (zone.name === "dealing") {
      return {
        onPress: () => {
          const card = top(game.dealing);
          if (!card) return;
          const target = foundationFor(game, card);
          if (target < 0) return;
          saveUndoState(structuredClone(game));
          setGame((draft) => {
            const moved = draft.dealing.pop();
            if (moved) draft.foundations[target].push(flipToFace(moved));
            draft.toPlace -= 1;
            settleDeal(draft);
          });
        },
        isDisabled: game.ended || game.phase !== "dealing",
      };
    }
    return {};
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    fixedRows: tableauRowOffset + 4 * rowStep + 0.5,
    gap: 0.14,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:slyFox.outfoxedTheDeck")
          : i18n.t("cards:noMovesRemain")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {game.phase === "dealing" && (
        <View
          style={[
            getZoneStylesById("dealing-progress"),
            { alignItems: "center", justifyContent: "center" },
          ]}
        >
          <ProgressBar
            progressValue={game.toPlace}
            totalValue={dealSize}
            color="green"
            autoTallyText
            scaledHeight={cardHeight * 0.5}
          />
        </View>
      )}
    </GameWrapper>
  );
}
