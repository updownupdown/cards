import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, pressHint, zoneTarget } from "@/hints/hint";
import { planMove } from "@/hints/lookahead";
const numberOfPiles = 4;

type GameState = {
  draw: PlayingCard[];
  piles: PlayingCard[][];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

export type AcesUpGameState = GameState;

const gameStateInitial: GameState = {
  draw: shuffle(createDeck()),
  piles: Array.from({ length: numberOfPiles }, () => []),
  discard: [],
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.draw,
      ...draft.piles.flat(),
      ...draft.discard,
    ].filter((card): card is PlayingCard => card !== null);

    draft.draw = flipAllToBack(shuffle(allCards));
    draft.piles = Array.from({ length: numberOfPiles }, () => []);
    draft.discard = [];
    draft.ended = false;
    draft.won = false;
  });

  await delay();
}

function getDiscardablePileIndexes(piles: PlayingCard[][]) {
  const tops = piles.map((pile) => top(pile));
  const discardable = new Set<number>();

  for (let i = 0; i < tops.length; i += 1) {
    const card = tops[i];
    if (!card) continue;

    for (let j = 0; j < tops.length; j += 1) {
      if (i === j) continue;
      const other = tops[j];
      if (!other) continue;
      if (
        other.suit === card.suit &&
        rankValue(other, 14) > rankValue(card, 14)
      ) {
        discardable.add(i);
      }
    }
  }

  return discardable;
}

function hasRelocateMove(piles: PlayingCard[][]) {
  const hasEmpty = piles.some((pile) => pile.length === 0);
  const nonEmptyCount = piles.filter((pile) => pile.length > 0).length;
  return hasEmpty && nonEmptyCount > 1;
}

function evaluateEndState(draw: PlayingCard[], piles: PlayingCard[][]) {
  if (draw.length > 0) return { ended: false, won: false };

  const discardable = getDiscardablePileIndexes(piles);
  const canRelocate = hasRelocateMove(piles);
  if (discardable.size > 0 || canRelocate) {
    return { ended: false, won: false };
  }

  const remainingCards = piles.flat();
  const won =
    remainingCards.length === 4 &&
    remainingCards.every((card) => card.rank === "A");
  return { ended: true, won };
}

type AcesUpMove = { discard: number } | { from: number; to: number };

/**
 * Looks through the cards on view for the line that discards the most,
 * moving cards into empty piles where that uncovers a discard (an Ace
 * belongs at the bottom of its own pile); deals when nothing helps.
 */
function findAcesUpHint(state: GameState) {
  const move = planMove<PlayingCard[][], AcesUpMove>(state.piles, {
    key: (piles) =>
      `aces-up:${piles.map((pile) => pile.map((card) => card.id).join(".")).join("|")}`,
    moves: (piles) => {
      const discards = [...getDiscardablePileIndexes(piles)].map((pile) => ({
        discard: pile,
      }));
      const empty = piles.findIndex((pile) => pile.length === 0);
      const relocations =
        empty < 0
          ? []
          : piles.flatMap((pile, from) =>
              // A lone card gains nothing from a gap.
              pile.length > 1 ? [{ from, to: empty }] : [],
            );
      return [...discards, ...relocations];
    },
    apply: (piles, move) =>
      piles.map((pile, index) => {
        if ("discard" in move) {
          return index === move.discard ? pile.slice(0, -1) : pile;
        }
        if (index === move.from) return pile.slice(0, -1);
        if (index === move.to) return [...pile, top(piles[move.from])!];
        return pile;
      }),
    score: (piles, depth) =>
      -piles.reduce((sum, pile) => sum + pile.length, 0) * 100 -
      depth -
      // Aces buried under other cards hold the game up.
      piles.reduce(
        (sum, pile) =>
          sum +
          pile.filter((card, index) => card.rank === "A" && index > 0).length,
        0,
      ) *
        20,
    budget: 2000,
    maxDepth: 16,
  });
  if (move && "discard" in move) {
    return makeHint(
      "removeCard",
      cardTarget(top(state.piles[move.discard])!),
      zoneTarget("discard"),
    );
  }
  if (move) {
    return makeHint(
      "moveCard",
      cardTarget(top(state.piles[move.from])!),
      zoneTarget(`pile-${move.to}`),
    );
  }
  return state.draw.length > 0
    ? pressHint("button", i18n.t("cards:deal"))
    : null;
}

export const acesUpRules = {
  findHint: findAcesUpHint,
  getDiscardablePileIndexes,
  hasRelocateMove,
  evaluateEndState,
};

// ========== Main Component ========== //
export default function AcesUp() {
  const [selectedPile, setSelectedPile] = useState<number | undefined>(
    undefined,
  );

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
    resetNonGameStates: () => {
      setSelectedPile(undefined);
    },
    postSetupAction: async () => {
      await dealCards();
    },
  });

  const discardable = useMemo(
    () => getDiscardablePileIndexes(game.piles),
    [game.piles],
  );

  useHint(() => findAcesUpHint(game), {
    game,
    enabled: !isSettingUp && !game.ended,
  });

  async function dealCards() {
    setSelectedPile(undefined);
    saveUndoState(structuredClone(game));

    setGame((draft) => {
      if (draft.draw.length === 0) return;

      const cardsToDeal = Math.min(draft.draw.length, numberOfPiles);

      for (let i = 0; i < cardsToDeal; i += 1) {
        const card = draft.draw.pop();
        if (card) draft.piles[i].push(flipToFace(card));
      }
    });
  }

  async function discardTop(pileIndex: number) {
    if (game.ended) return;
    const allowed = getDiscardablePileIndexes(game.piles);
    if (!allowed.has(pileIndex)) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const allowed = getDiscardablePileIndexes(draft.piles);
      if (!allowed.has(pileIndex)) return;

      const card = draft.piles[pileIndex].pop();
      if (!card) return;
      draft.discard.push(flipToBack(card));
    });

    setSelectedPile(undefined);
  }

  async function onPilePress(pileIndex: number) {
    if (game.ended) return;

    const piles = game.piles.map((pile) => [...pile]);
    const clickedEmptyPile = piles[pileIndex].length === 0;

    if (clickedEmptyPile) {
      if (selectedPile === undefined) return;
    } else {
      setSelectedPile(selectedPile === pileIndex ? undefined : pileIndex);
      return;
    }

    saveUndoState(structuredClone(game));

    setSelectedPile(undefined);

    // Move selected card to the empty pile
    setGame((draft) => {
      if (piles[pileIndex].length !== 0) {
        return;
      }

      const cardToMove = draft.piles[selectedPile].pop();
      if (!cardToMove) return;
      draft.piles[pileIndex].push(cardToMove);
    });
  }

  const hasEmptyPile = !!game.piles.find((p) => p.length === 0);

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const pileZones: MapZone[] = getGridColRows({
      cols: 4,
      rows: 1,
      rowOffset: 3,
    }).map((pos, i) => ({
      id: `pile-${i}`,
      name: "pile",
      pileIndex: i,
      cards: game.piles[i],
      col: pos.c,
      row: pos.r,
      baseZIndex: 1,
      fan: { maxVisible: 10, direction: "up", offset: 0.25 },
      placeholder: {},
    }));

    return [
      {
        id: "draw",
        name: "draw",
        cards: game.draw,
        col: 0.75,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: {
          infoPos: "left",
          text: i18n.t("cards:stock"),
        },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 2.25,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: {
          infoPos: "right",
          text: i18n.t("cards:discard"),
        },
      },
      ...pileZones,
      {
        id: "button",
        col: 0,
        row: 4.1,
        width: "full",
        height: 0.6,
      },
    ];
  }, [game, discardable]);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name !== "pile" || zone.pileIndex === undefined) return {};

    const isDisabled =
      game.piles[zone.pileIndex!].length !== 0 && selectedPile === undefined;

    return {
      selectColor: selectedPile !== undefined ? "blue" : "none",
      onPress: () => {
        onPilePress(zone.pileIndex!);
      },
      isDisabled,
    };
  };

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "draw" && mappedCard.topOfZone) {
      //  Stock pile
      return {
        onPress: dealCards,
      };
    } else if (mappedCard.zoneName === "pile" && mappedCard.topOfZone) {
      // Piles
      const pileIndex = mappedCard.pileIndex;

      if (pileIndex === undefined) return {};

      const canDiscard = discardable.has(pileIndex);

      return {
        onPress: () => {
          if (canDiscard) {
            discardTop(pileIndex);
          } else {
            onPilePress(pileIndex);
          }
        },
        isSelected: selectedPile === pileIndex,
        selectColor: canDiscard ? "none" : "blue",
        isDisabled: !canDiscard && !hasEmptyPile,
      };
    }
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "regular",
  });

  // Evaluate game end state whenever draw or piles change
  useEffect(() => {
    const { ended, won } = evaluateEndState(game.draw, game.piles);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [game]);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[getZoneStylesById("button")]}>
        <Button
          text={i18n.t("cards:deal")}
          size="lg"
          onPress={dealCards}
          fullWidth
          taller
          disabled={game.draw.length === 0 || game.ended}
          theme={"#80262e"}
        />
      </View>
    </GameWrapper>
  );
}
