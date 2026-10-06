import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
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

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
const carpetCols = 5;
const carpetRows = 4;
const carpetSize = carpetCols * carpetRows;
const carpetRow = 1.2;
const carpetRowStep = 1;
// Bottom row for the stock and waste, leaving room for their labels above.
const stockRow = carpetRow + (carpetRows - 1) * carpetRowStep + 1.25;

type GameState = {
  stock: PlayingCard[];
  waste: PlayingCard[];
  carpet: (PlayingCard | null)[];
  foundations: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

export type CarpetGameState = GameState;

const gameStateInitial: GameState = {
  stock: shuffle(createDeck()).map(flipToBack),
  waste: [],
  carpet: Array(carpetSize).fill(null),
  foundations: SUITS.map(() => []),
  ended: false,
  won: false,
};

/** The foundation this card builds on (same suit, one rank up), else -1. */
function foundationFor(state: GameState, card: PlayingCard) {
  return state.foundations.findIndex((pile) => {
    const pileTop = top(pile);
    return (
      !!pileTop &&
      pileTop.suit === card.suit &&
      rankValue(card) === rankValue(pileTop) + 1
    );
  });
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  const playing = { ended: false, won: false };
  if (isSettingUp) return playing;

  const placed = state.foundations.reduce((sum, pile) => sum + pile.length, 0);
  if (placed === 52) return { ended: true, won: true };
  if (state.stock.length > 0) return playing;

  const exposed = [...state.carpet, top(state.waste)];
  if (exposed.some((card) => card && foundationFor(state, card) >= 0))
    return playing;
  return { ended: true, won: false };
}

/**
 * Carpet cards go home first: each gap takes the waste's top card, which
 * brings the next waste card into play. Then the waste, then the stock.
 */
function findCarpetHint(state: GameState) {
  const playable = [...state.carpet, top(state.waste)].find(
    (card) => card && foundationFor(state, card) >= 0,
  );
  if (playable) {
    return makeHint(
      "toFoundation",
      cardTarget(playable),
      zoneTarget(`foundation-${foundationFor(state, playable)}`),
    );
  }
  return state.stock.length > 0 ? makeHint("draw", zoneTarget("stock")) : null;
}

export const carpetRules = {
  findHint: findCarpetHint,
  foundationFor,
  evaluateEnd,
};

export default function Carpet() {
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
          ...draft.waste,
          ...draft.carpet.filter((card): card is PlayingCard => !!card),
          ...draft.foundations.flat(),
        ];
        draft.stock = shuffle(cards).map(flipToBack);
        draft.waste = [];
        draft.carpet = Array(carpetSize).fill(null);
        draft.foundations = SUITS.map(() => []);
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        const rest: PlayingCard[] = [];
        draft.stock.forEach((card) => {
          if (card.rank === "A") {
            draft.foundations[SUITS.indexOf(card.suit)].push(flipToFace(card));
          } else {
            rest.push(card);
          }
        });
        draft.carpet = rest.splice(rest.length - carpetSize).map(flipToFace);
        draft.stock = rest;
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

  useHint(() => findCarpetHint(game), {
    game,
    enabled: !isSettingUp && !game.ended,
  });

  function playFromCarpet(index: number) {
    const card = game.carpet[index];
    if (game.ended || !card) return;
    const target = foundationFor(game, card);
    if (target < 0) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.carpet[index];
      if (!moved) return;
      draft.foundations[target].push(moved);
      // Gaps refill from the waste, or from the stock once the waste is empty.
      const refill = draft.waste.pop() ?? draft.stock.pop();
      draft.carpet[index] = refill ? flipToFace(refill) : null;
    });
  }

  function playFromWaste() {
    const card = top(game.waste);
    if (game.ended || !card) return;
    const target = foundationFor(game, card);
    if (target < 0) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.waste.pop();
      if (moved) draft.foundations[target].push(moved);
    });
  }

  function drawStock() {
    if (game.ended || game.stock.length === 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.stock.pop();
      if (card) draft.waste.push(flipToFace(card));
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: 0.5 + i,
      row: 0,
      fan: { maxVisible: 3 },
      placeholder: { iconName: "ace" },
    }));

    const carpetZones: MapZone[] = game.carpet.map((card, i) => ({
      id: `carpet-${i}`,
      name: "carpet",
      pileIndex: i,
      cards: card ? [card] : [],
      col: i % carpetCols,
      row: carpetRow + Math.floor(i / carpetCols) * carpetRowStep,
      placeholder: {},
    }));

    return [
      ...foundationZones,
      ...carpetZones,
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: carpetCols - 2.5,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:waste"),
          infoPos: "left",
          showCount: true,
        },
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: carpetCols - 1,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "left",
          showCount: true,
        },
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (!mappedCard.topOfZone) return {};
    if (
      mappedCard.zoneName === "carpet" &&
      mappedCard.pileIndex !== undefined
    ) {
      const index = mappedCard.pileIndex;
      return { isDisabled: game.ended, onPress: () => playFromCarpet(index) };
    }
    if (mappedCard.zoneName === "waste") {
      return { isDisabled: game.ended, onPress: playFromWaste };
    }
    if (mappedCard.zoneName === "stock") {
      return { isDisabled: game.ended, onPress: drawStock };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return {
        onPress: drawStock,
        isDisabled: game.ended || game.stock.length === 0,
      };
    }
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "regular",
    fixedRows: stockRow + 1,
    gap: 0.14,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:carpet.theCarpetIsRolledUp")
          : i18n.t("cards:noMovesRemain")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
