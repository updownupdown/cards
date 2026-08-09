import { useStateManager } from "@/hooks/useStateManager";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useGameColors } from "@/hooks/useGameColors";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { flexStyles } from "@/styles/flexStyles";

const pileCount = 5;

type GameState = {
  piles: PlayingCard[][];
  draw: PlayingCard[];
  discard: PlayingCard[];
  ended: boolean;
  won: boolean;
};

export type BaronessGameState = GameState;

const gameStateInitial: GameState = {
  piles: Array.from({ length: pileCount }, () => []),
  draw: [],
  discard: [],
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const deck = shuffle(createDeck());
    const piles: PlayingCard[][] = Array.from({ length: pileCount }, () => []);

    // One card to each pile to start.
    for (let i = 0; i < pileCount; i += 1) {
      const card = deck.pop();
      if (card) piles[i].push(flipToFace(card));
    }

    draft.piles = piles;
    draft.draw = deck.map(flipToBack);
    draft.discard = [];
    draft.ended = false;
    draft.won = false;
  });

  await delay();
}

function evaluateEnd(
  state: GameState,
  allowMoveToEmptyPile: boolean,
  isSettingUp = false,
) {
  if (isSettingUp) return { ended: false, won: false };

  const cardsLeft =
    state.piles.reduce((sum, pile) => sum + pile.length, 0) + state.draw.length;
  if (cardsLeft === 0) return { ended: true, won: true };

  // While the stock has cards you can always deal, so never stuck.
  if (state.draw.length > 0) return { ended: false, won: false };

  const exposed = state.piles
    .map((pile) => top(pile))
    .filter((card): card is PlayingCard => !!card);

  const hasKing = exposed.some((card) => rankValue(card) === 13);
  let hasPair = false;
  for (let i = 0; i < exposed.length && !hasPair; i += 1) {
    for (let j = i + 1; j < exposed.length; j += 1) {
      if (rankValue(exposed[i]) + rankValue(exposed[j]) === 13) {
        hasPair = true;
        break;
      }
    }
  }

  if (!hasKing && !hasPair) {
    if (allowMoveToEmptyPile) {
      const hasEmptyPile = state.piles.some((pile) => pile.length === 0);
      const hasPileToExpose = state.piles.some((pile) => pile.length > 1);
      if (hasEmptyPile && hasPileToExpose) {
        return { ended: false, won: false };
      }
    }
    return { ended: true, won: false };
  }

  return { ended: false, won: false };
}

export const baronessRules = {
  evaluateEnd,
};

// ========== Main Component ========== //
export default function Baroness() {
  const { colorDark } = useGameColors();
  const difficulty = useGameSettingValue("difficulty");
  const allowMoveToEmptyPile = difficulty !== "difficult";
  const [selected, setSelected] = useState<number | undefined>(undefined);

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
    resetNonGameStates: () => setSelected(undefined),
  });

  useEffect(() => {
    const { ended, won } = evaluateEnd(game, allowMoveToEmptyPile, isSettingUp);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [allowMoveToEmptyPile, game, isSettingUp, setGame]);

  function dealRow() {
    if (game.ended || game.draw.length === 0) return;
    saveUndoState(structuredClone(game));
    setSelected(undefined);
    setGame((draft) => {
      const count = Math.min(pileCount, draft.draw.length);
      for (let i = 0; i < count; i += 1) {
        const card = draft.draw.pop();
        if (card) draft.piles[i].push(flipToFace(card));
      }
    });
  }

  function removeKing(pileIndex: number) {
    saveUndoState(structuredClone(game));
    setSelected(undefined);
    setGame((draft) => {
      const card = draft.piles[pileIndex].pop();
      if (card) draft.discard.push(flipToBack(card));
    });
  }

  function removePair(a: number, b: number) {
    saveUndoState(structuredClone(game));
    setSelected(undefined);
    setGame((draft) => {
      const cardA = draft.piles[a].pop();
      const cardB = draft.piles[b].pop();
      if (cardA) draft.discard.push(flipToBack(cardA));
      if (cardB) draft.discard.push(flipToBack(cardB));
    });
  }

  function moveTopToEmptyPile(fromPileIndex: number, toPileIndex: number) {
    saveUndoState(structuredClone(game));
    setSelected(undefined);
    setGame((draft) => {
      if (draft.piles[toPileIndex].length !== 0) return;
      const card = draft.piles[fromPileIndex].pop();
      if (!card) return;
      draft.piles[toPileIndex].push(card);
    });
  }

  function onPilePress(pileIndex: number) {
    if (game.ended) return;
    const card = top(game.piles[pileIndex]);
    if (!card) {
      if (
        !allowMoveToEmptyPile ||
        selected === undefined ||
        selected === pileIndex
      ) {
        return;
      }

      moveTopToEmptyPile(selected, pileIndex);
      return;
    }

    if (rankValue(card) === 13) {
      removeKing(pileIndex);
      return;
    }

    if (selected === undefined) {
      setSelected(pileIndex);
      return;
    }
    if (selected === pileIndex) {
      setSelected(undefined);
      return;
    }

    const first = top(game.piles[selected]);
    if (first && rankValue(first) + rankValue(card) === 13) {
      removePair(selected, pileIndex);
    } else {
      setSelected(pileIndex);
    }
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const pileZones: MapZone[] = game.piles.map((pile, i) => ({
      id: `pile-${i}`,
      name: "pile",
      pileIndex: i,
      cards: pile,
      col: i,
      row: 1.2,
      baseZIndex: 10 + i,
      fan: { direction: "down", offset: cardDims.tableauOffset, center: false },
      placeholder: {},
    }));

    return [
      {
        id: "draw",
        name: "draw",
        cards: game.draw,
        col: 0,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 60,
        placeholder: { text: "Stock", infoPos: "right", showCount: true },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 4,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 60,
        placeholder: { text: "Discard", infoPos: "left" },
      },
      ...pileZones,
      {
        id: "button",
        col: 0,
        row: 5.2,
        width: "full",
        height: 0.8,
      },
    ];
  }, [game]);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name !== "pile" || zone.pileIndex === undefined) return {};

    const pileIndex = zone.pileIndex;
    const isEmpty = game.piles[pileIndex].length === 0;
    const canMoveToEmpty =
      allowMoveToEmptyPile &&
      selected !== undefined &&
      selected !== pileIndex &&
      game.piles[selected].length > 0;

    return {
      isSelected: isEmpty && canMoveToEmpty,
      selectColor: "blue",
      isDisabled: game.ended || !isEmpty || !canMoveToEmpty,
      onPress: () => onPilePress(pileIndex),
    };
  };

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "draw" && mappedCard.topOfZone) {
      return {
        isDisabled: game.ended || game.draw.length === 0,
        onPress: dealRow,
      };
    }

    if (
      mappedCard.zoneName === "pile" &&
      mappedCard.pileIndex !== undefined &&
      mappedCard.topOfZone
    ) {
      return {
        isSelected: selected === mappedCard.pileIndex,
        selectColor: "blue",
        isDisabled: game.ended,
        onPress: () => onPilePress(mappedCard.pileIndex!),
      };
    }

    return {};
  };

  const { getZoneStylesById, cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    fixedRows: 6,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.won ? "All cleared!" : "No thirteen left to make."}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[flexStyles.colCentered, getZoneStylesById("button")]}>
        <Button
          text="Deal"
          size="md"
          onPress={dealRow}
          fullWidth
          halfTaller
          disabled={game.draw.length === 0 || game.ended}
          theme={"#80262e"}
        />
      </View>
    </GameWrapper>
  );
}
