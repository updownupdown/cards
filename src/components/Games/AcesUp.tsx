import { useGameColors } from "@/hooks/useGameColors";
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

export const acesUpRules = {
  getDiscardablePileIndexes,
  hasRelocateMove,
  evaluateEndState,
};

// ========== Main Component ========== //
export default function AcesUp() {
  const { colorDark } = useGameColors();

  const [selectedPile, setSelectedPile] = useState<number | undefined>(
    undefined,
  );

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
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
          text: "Draw",
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
          text: "Discard",
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
      //  Draw pile
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
          text="Deal"
          size="lg"
          onPress={dealCards}
          fullWidth
          taller
          disabled={game.draw.length === 0 || game.ended}
          theme={colorDark}
        />
      </View>
    </GameWrapper>
  );
}
