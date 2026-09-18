import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  top,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
const pileCount = 8;
const tableauRow = 1.2;
// Rows of height each King's pile may fan into.
const pileRows = 5.2;
// Bottom row for the stock and Queens, leaving room for their labels above.
const stockRow = tableauRow + pileRows + 0.35;
const jackValue = 11;

type GameState = {
  stock: PlayingCard[];
  /** Each pile starts with a King; the newest pile takes every dealt card. */
  tableau: PlayingCard[][];
  /** Queens are set aside as they are dealt and take no further part. */
  queens: PlayingCard[];
  /** Built up from the Aces to Jacks, regardless of suit. */
  foundations: PlayingCard[][];
  ended: boolean;
  won: boolean;
};

export type SalicLawGameState = GameState;

const gameStateInitial: GameState = {
  stock: shuffle(createDeck({ deckCount: 2 })).map(flipToBack),
  tableau: [],
  queens: [],
  foundations: Array.from({ length: pileCount }, () => []),
  ended: false,
  won: false,
};

function foundationFor(state: GameState, card: PlayingCard) {
  return state.foundations.findIndex((pile) => {
    const pileTop = top(pile);
    return (
      !!pileTop &&
      rankValue(card) <= jackValue &&
      rankValue(card) === rankValue(pileTop) + 1
    );
  });
}

/** A pile down to its King accepts any single card. */
function isExposedKing(pile: PlayingCard[]) {
  return pile.length === 1;
}

function hasMove(state: GameState) {
  return state.tableau.some((pile, source) => {
    if (pile.length < 2) return false;
    if (foundationFor(state, top(pile)!) >= 0) return true;
    // Moving a card onto a bare King only helps if it uncovers a card.
    return (
      pile.length >= 3 &&
      state.tableau.some(
        (other, target) => target !== source && isExposedKing(other),
      )
    );
  });
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  const playing = { ended: false, won: false };
  if (isSettingUp) return playing;
  if (state.foundations.every((pile) => pile.length === jackValue))
    return { ended: true, won: true };
  if (state.stock.length > 0 || hasMove(state)) return playing;
  return { ended: true, won: false };
}

function pileOffset(count: number) {
  return zoneFanOffset(count, pileRows, 0.1, cardDims.tableauOffset);
}

export const salicLawRules = { foundationFor, hasMove, evaluateEnd };

export default function SalicLaw() {
  const [selected, setSelected] = useState<number | null>(null);
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
    resetNonGameStates: () => setSelected(null),
    resetAndSetup: async () => {
      setGame((draft) => {
        const cards = [
          ...draft.stock,
          ...draft.tableau.flat(),
          ...draft.queens,
          ...draft.foundations.flat(),
        ];
        draft.stock = shuffle(cards).map(flipToBack);
        draft.tableau = [];
        draft.queens = [];
        draft.foundations = Array.from({ length: pileCount }, () => []);
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        const kingIndex = draft.stock.findIndex((card) => card.rank === "K");
        const [king] = draft.stock.splice(kingIndex, 1);
        draft.tableau = [[flipToFace(king)]];
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

  function dealCard() {
    if (game.ended || game.stock.length === 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const dealt = draft.stock.pop();
      if (!dealt) return;
      const card = flipToFace(dealt);
      if (card.rank === "Q") draft.queens.push(card);
      else if (card.rank === "A")
        draft.foundations[
          draft.foundations.findIndex((pile) => pile.length === 0)
        ].push(card);
      else if (card.rank === "K") draft.tableau.push([card]);
      else draft.tableau[draft.tableau.length - 1].push(card);
    });
    setSelected(null);
  }

  function moveToKing(source: number, target: number) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.tableau[source].pop();
      if (card) draft.tableau[target].push(card);
    });
    setSelected(null);
  }

  function onPilePress(pile: number) {
    const cards = game.tableau[pile];
    if (game.ended || !cards) return;

    if (selected !== null && selected !== pile && isExposedKing(cards)) {
      moveToKing(selected, pile);
      return;
    }
    if (cards.length < 2 || selected === pile) {
      setSelected(null);
      return;
    }

    // A playable card goes straight up; anything else is picked up to move
    // onto a bare King.
    const target = foundationFor(game, top(cards)!);
    if (target < 0) {
      setSelected(pile);
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.tableau[pile].pop();
      if (card) draft.foundations[target].push(card);
    });
    setSelected(null);
  }

  const zones: MapZone[] = useMemo(() => {
    const foundationZones: MapZone[] = game.foundations.map((pile, i) => ({
      id: `foundation-${i}`,
      name: "foundation",
      pileIndex: i,
      cards: pile,
      col: i,
      row: 0,
      fan: { maxVisible: 3 },
      placeholder: {},
    }));

    const pileZones: MapZone[] = Array.from({ length: pileCount }, (_, i) => {
      const cards = game.tableau[i] ?? [];
      return {
        id: `tableau-${i}`,
        name: "tableau",
        pileIndex: i,
        cards,
        col: i,
        row: tableauRow,
        fan: { direction: "down", offset: pileOffset(cards.length) },
        placeholder: {},
      };
    });

    return [
      ...foundationZones,
      ...pileZones,
      {
        id: "queens",
        name: "queens",
        cards: game.queens,
        col: pileCount - 2.25,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:salicLaw.queens"),
          infoPos: "above",
          showCount: true,
        },
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: pileCount - 1,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:stock"),
          infoPos: "above",
          showCount: true,
        },
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (
      mappedCard.zoneName === "tableau" &&
      mappedCard.pileIndex !== undefined
    ) {
      const pile = mappedCard.pileIndex;
      const isTarget =
        selected !== null &&
        selected !== pile &&
        isExposedKing(game.tableau[pile] ?? []);
      return {
        isDisabled: game.ended,
        isSelected: (selected === pile && mappedCard.topOfZone) || isTarget,
        selectColor: isTarget ? "green" : "blue",
        onPress: () => onPilePress(pile),
      };
    }
    if (mappedCard.zoneName === "stock" && mappedCard.topOfZone) {
      return { isDisabled: game.ended, onPress: dealCard };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock") {
      return {
        onPress: dealCard,
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
    cardSize: "tableau",
    fixedCols: pileCount,
    fixedRows: stockRow + 1,
    gap: 0.14,
  });

  const placed = game.foundations.reduce((sum, pile) => sum + pile.length, 0);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={placed}
      winLoseMessage={
        game.won
          ? i18n.t("games:salicLaw.theKingsStandAlone")
          : i18n.t("cards:noMovesRemain")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
