import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { Text } from "../common/Text";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
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

const gridSize = 9;
const gridCols = 3;
const handLimit = 4;
const maxStackHeight = 3;

/** Orthogonal neighbours of a cell in the square grid. */
function adjacentCells(index: number) {
  const row = Math.floor(index / gridCols);
  const col = index % gridCols;
  const result: number[] = [];
  if (row > 0) result.push(index - gridCols);
  if (row < gridCols - 1) result.push(index + gridCols);
  if (col > 0) result.push(index - 1);
  if (col < gridCols - 1) result.push(index + 1);
  return result;
}

type GameState = {
  grid: PlayingCard[][];
  hand: PlayingCard[];
  deck: PlayingCard[];
  discard: PlayingCard[];
  flashovers: number;
  ended: boolean;
  won: boolean;
};

const gameStateInitial: GameState = {
  grid: Array.from({ length: gridSize }, () => []),
  hand: [],
  deck: shuffle(createDeck()),
  discard: [],
  flashovers: 0,
  ended: false,
  won: false,
};

/** A crew card douses a flame by matching suit or with an equal-or-higher rank (Aces high). */
function canDouse(
  crew: PlayingCard | undefined,
  flame: PlayingCard | undefined,
) {
  if (!crew || !flame) return false;
  if (crew.suit === flame.suit) return true;
  return rankValue(crew, 14) >= rankValue(flame, 14);
}

function hasLegalPlay(state: GameState) {
  return state.grid.some((cell) => {
    const flame = top(cell);
    if (!flame) return false;
    return state.hand.some((crew) => canDouse(crew, flame));
  });
}

function activeFires(state: GameState) {
  return state.grid.filter((cell) => cell.length > 0).length;
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.grid.flat(),
      ...draft.hand,
      ...draft.deck,
      ...draft.discard,
    ];

    draft.deck = shuffle(allCards);
    draft.grid = Array.from({ length: gridSize }, () => []);
    draft.hand = [];
    draft.discard = [];
    draft.flashovers = 0;
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    const deck = [...draft.deck];

    // Light one flame in every cell.
    const grid: PlayingCard[][] = Array.from({ length: gridSize }, () => {
      const card = deck.pop();
      return card ? [flipToFace(card)] : [];
    });

    // Fill the crew's hand.
    const hand: PlayingCard[] = [];
    for (let i = 0; i < handLimit; i += 1) {
      const card = deck.pop();
      if (card) hand.push(flipToFace(card));
    }

    draft.grid = grid;
    draft.hand = hand;
    draft.deck = deck.map(flipToBack);
  });
}

function evaluateEnd(state: GameState) {
  if (activeFires(state) === 0) return { ended: true, won: true };

  // No cards left to fight with and fire still burning.
  const canAdvance = state.deck.length > 0;
  if (!canAdvance && !hasLegalPlay(state)) return { ended: true, won: false };

  return { ended: false, won: false };
}

// ========== Main Component ========== //
export default function Wildfire() {
  const { cardBg, cardText } = useGameZoneBackground();
  const [selectedHand, setSelectedHand] = useState<number | undefined>(
    undefined,
  );

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
      resetNonGameStates: () => setSelectedHand(undefined),
    });

  useEffect(() => {
    const { ended, won } = evaluateEnd(game);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [game]);

  function selectHand(index: number) {
    if (game.ended) return;
    setSelectedHand((current) => (current === index ? undefined : index));
  }

  function fightFire(cellIndex: number) {
    if (game.ended || selectedHand === undefined) return;
    const crew = game.hand[selectedHand];
    const flame = top(game.grid[cellIndex]);
    if (!canDouse(crew, flame)) return;

    const handIndex = selectedHand;
    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const removedFlame = draft.grid[cellIndex].pop();
      if (removedFlame) draft.discard.push(removedFlame);
      const [usedCrew] = draft.hand.splice(handIndex, 1);
      if (usedCrew) draft.discard.push(usedCrew);
    });

    setSelectedHand(undefined);
  }

  function advanceFire() {
    if (game.ended) return;
    saveUndoState(structuredClone(game));
    setSelectedHand(undefined);

    setGame((draft) => {
      // Snapshot heights so a cell re-ignited this turn doesn't cascade again.
      const heights = draft.grid.map((cell) => cell.length);

      for (let i = 0; i < draft.grid.length; i += 1) {
        if (heights[i] === 0) continue; // contained cells stay safe

        if (heights[i] >= maxStackHeight) {
          // Flashover: the blaze can't grow here, so it erupts into the
          // adjacent cells instead — leave neighbours burning and it spreads.
          draft.flashovers += 1;
          for (const neighbour of adjacentCells(i)) {
            if (draft.deck.length === 0) break;
            const card = draft.deck.pop();
            if (card) draft.grid[neighbour].push(flipToFace(card));
          }
          continue;
        }

        // Normal spread: this cell gains a flame.
        if (draft.deck.length === 0) continue;
        const card = draft.deck.pop();
        if (card) draft.grid[i].push(flipToFace(card));
      }

      // Refill the crew's hand.
      while (draft.hand.length < handLimit && draft.deck.length > 0) {
        const card = draft.deck.pop();
        if (card) draft.hand.push(flipToFace(card));
      }
    });
  }

  const selectedCrew =
    selectedHand !== undefined ? game.hand[selectedHand] : undefined;
  const currentPhase = hasLegalPlay(game) ? "play" : "advance";

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const cellPositions = getGridColRows({
      cols: 3,
      rows: 3,
      colOffset: 0.3,
      rowOffset: 1.2,
      scaleY: 1.35,
    });

    const cellZones: MapZone[] = cellPositions.map((pos, i) => ({
      id: `cell-${i}`,
      name: "fire",
      pileIndex: i,
      cards: game.grid[i],
      col: pos.c,
      row: pos.r,
      baseZIndex: 1,
      fan: { direction: "up", offset: 0.14, maxVisible: maxStackHeight },
      placeholder: { text: "" },
    }));

    const handPositions = getGridColRows({
      cols: handLimit,
      rows: 1,
      colOffset: 0.75,
      rowOffset: 5.3,
    });

    const handZones: MapZone[] = handPositions.map((pos, i) => ({
      id: `hand-${i}`,
      name: "hand",
      pileIndex: i,
      cards: game.hand[i] ? [game.hand[i]] : [],
      col: pos.c,
      row: pos.r,
      baseZIndex: 5,
      placeholder: { text: "" },
    }));

    return [
      { id: "hud", col: 0, row: 0, width: "full", height: 0.7 },
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 3.5,
        row: 1.2,
        fan: { maxVisible: 3 },
        baseZIndex: 40,
        placeholder: { text: "Crew", infoPos: "right", showCount: true },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 3.5,
        row: 3.9,
        fan: { maxVisible: 3 },
        baseZIndex: 40,
        placeholder: { text: "Out", infoPos: "right" },
      },
      ...cellZones,
      ...handZones,
      { id: "button", col: 0, row: 6.5, width: "full", height: 0.75 },
    ];
  }, [game]);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name !== "fire" || zone.pileIndex === undefined) return {};
    // Allow tapping an empty (contained) cell background to do nothing gracefully.
    return {};
  };

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand" && mappedCard.pileIndex !== undefined) {
      const handIndex = mappedCard.pileIndex;
      return {
        isDisabled: game.ended,
        isSelected: selectedHand === handIndex,
        selectColor: "blue",
        onPress: () => selectHand(handIndex),
      };
    }

    if (
      mappedCard.zoneName === "fire" &&
      mappedCard.pileIndex !== undefined &&
      mappedCard.topOfZone
    ) {
      const cellIndex = mappedCard.pileIndex;
      const flame = top(game.grid[cellIndex]);
      const canFight = canDouse(selectedCrew, flame);
      return {
        isDisabled: game.ended || selectedHand === undefined || !canFight,
        selectColor: canFight ? "green" : "none",
        onPress: () => fightFire(cellIndex),
      };
    }

    return {};
  };

  const { getZoneStylesById, cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    gap: 0.12,
    cardSize: "small",
  });

  return (
    <GameWrapper
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      tipPhase={currentPhase}
      winLoseMessage={
        game.won ? "The blaze is contained!" : "The fire outran the crew."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("hud"),
          {
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
          },
        ]}
      >
        <Text size="sm" weight={600} color={cardText}>
          Fires {activeFires(game)}
        </Text>
        <Text size="sm" weight={600} color={cardText}>
          Flashovers {game.flashovers}
        </Text>
        <Text size="sm" weight={600} color={cardText}>
          Crew {game.deck.length}
        </Text>
      </View>

      <View style={[getZoneStylesById("button")]}>
        <Button
          text="Advance Fire"
          size="md"
          onPress={advanceFire}
          fullWidth
          taller
          disabled={game.ended}
          theme={cardBg}
        />
      </View>
    </GameWrapper>
  );
}
