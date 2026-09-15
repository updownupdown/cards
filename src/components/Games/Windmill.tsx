import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
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
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const colStep = 1.15;
const rowStep = 1.1;
// Grid cells as [col, row] in a 5x5 cross: two sails on each side of the
// centre, with the corner foundations between them.
const centerCell: [number, number] = [2, 2];
const sailCells: [number, number][] = [
  [2, 1],
  [2, 0],
  [3, 2],
  [4, 2],
  [2, 3],
  [2, 4],
  [1, 2],
  [0, 2],
];
const cornerCells: [number, number][] = [
  [1, 1],
  [3, 1],
  [3, 3],
  [1, 3],
];
// Bottom row for the stock and waste, leaving room for their labels above.
const stockRow = 4 * rowStep + 1.35;
const centerTotal = 52;
const cornerTotal = 13;

type Source =
  | { zone: "sail"; index: number }
  | { zone: "waste" }
  | { zone: "corner"; index: number };
type Destination = { zone: "center" } | { zone: "corner"; index: number };

type GameState = {
  /** Four Ace-to-King runs, one after another, regardless of suit. */
  center: PlayingCard[];
  /** Each starts with a King and builds down to an Ace, regardless of suit. */
  corners: PlayingCard[][];
  sails: (PlayingCard | null)[];
  stock: PlayingCard[];
  waste: PlayingCard[];
  /** After a corner card goes to the centre, the next must not. */
  cornerPlayedToCenter: boolean;
  ended: boolean;
  won: boolean;
};

export type WindmillGameState = GameState;

const gameStateInitial: GameState = {
  center: [],
  corners: cornerCells.map(() => []),
  sails: sailCells.map(() => null),
  stock: shuffle(createDeck({ deckCount: 2 })).map(flipToBack),
  waste: [],
  cornerPlayedToCenter: false,
  ended: false,
  won: false,
};

const cellPosition = ([col, row]: [number, number]) => ({
  col: col * colStep,
  row: row * rowStep,
});

function canBuildCenter(card: PlayingCard, center: PlayingCard[]) {
  const centerTop = top(center);
  return (
    !!centerTop &&
    center.length < centerTotal &&
    rankValue(card) === (rankValue(centerTop) % 13) + 1
  );
}

function canBuildCorner(card: PlayingCard, pile: PlayingCard[]) {
  const pileTop = top(pile);
  if (!pileTop) return card.rank === "K";
  return (
    pile.length < cornerTotal && rankValue(card) === rankValue(pileTop) - 1
  );
}

function sourceCard(state: GameState, source: Source) {
  if (source.zone === "sail") return state.sails[source.index] ?? undefined;
  if (source.zone === "waste") return top(state.waste);
  return top(state.corners[source.index]);
}

function destinationsFor(state: GameState, source: Source): Destination[] {
  const card = sourceCard(state, source);
  if (!card) return [];

  const destinations: Destination[] = [];
  if (
    (source.zone !== "corner" || !state.cornerPlayedToCenter) &&
    canBuildCenter(card, state.center)
  ) {
    destinations.push({ zone: "center" });
  }
  if (source.zone !== "corner") {
    // Every empty corner is the same choice, so only offer the first.
    let offeredEmpty = false;
    state.corners.forEach((pile, index) => {
      if (!canBuildCorner(card, pile)) return;
      if (pile.length === 0) {
        if (offeredEmpty) return;
        offeredEmpty = true;
      }
      destinations.push({ zone: "corner", index });
    });
  }
  return destinations;
}

function allSources(state: GameState): Source[] {
  return [
    ...state.sails.map((_, index) => ({ zone: "sail", index }) as Source),
    { zone: "waste" },
    ...state.corners.map((_, index) => ({ zone: "corner", index }) as Source),
  ];
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  const playing = { ended: false, won: false };
  if (isSettingUp) return playing;
  if (
    state.center.length === centerTotal &&
    state.corners.every((pile) => pile.length === cornerTotal)
  ) {
    return { ended: true, won: true };
  }
  if (state.stock.length > 0) return playing;
  const hasMove = allSources(state).some(
    (source) => destinationsFor(state, source).length > 0,
  );
  return hasMove ? playing : { ended: true, won: false };
}

const sourceKey = (source: Source) =>
  source.zone === "waste" ? "waste" : `${source.zone}-${source.index}`;
const destinationKey = (destination: Destination) =>
  destination.zone === "center" ? "center" : `corner-${destination.index}`;

export const windmillRules = {
  canBuildCenter,
  canBuildCorner,
  destinationsFor,
  evaluateEnd,
};

export default function Windmill() {
  const [selected, setSelected] = useState<Source | null>(null);
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
          ...draft.center,
          ...draft.corners.flat(),
          ...draft.sails.filter((card): card is PlayingCard => !!card),
          ...draft.stock,
          ...draft.waste,
        ];
        draft.stock = shuffle(cards).map(flipToBack);
        draft.center = [];
        draft.corners = cornerCells.map(() => []);
        draft.sails = sailCells.map(() => null);
        draft.waste = [];
        draft.cornerPlayedToCenter = false;
        draft.ended = false;
        draft.won = false;
      });

      await delay();

      setGame((draft) => {
        const aceIndex = draft.stock.findIndex((card) => card.rank === "A");
        const [ace] = draft.stock.splice(aceIndex, 1);
        draft.center = [flipToFace(ace)];
        draft.sails = sailCells.map(() => {
          const card = draft.stock.pop();
          return card ? flipToFace(card) : null;
        });
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

  const selectedDestinations = selected
    ? destinationsFor(game, selected).map(destinationKey)
    : [];

  function move(source: Source, destination: Destination) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      let card: PlayingCard | null | undefined;
      if (source.zone === "sail") {
        card = draft.sails[source.index];
        // Sails refill at once from the waste, or from the stock.
        const refill = draft.waste.pop() ?? draft.stock.pop();
        draft.sails[source.index] = refill ? flipToFace(refill) : null;
      } else if (source.zone === "waste") {
        card = draft.waste.pop();
      } else {
        card = draft.corners[source.index].pop();
      }
      if (!card) return;

      if (destination.zone === "center") {
        draft.center.push(card);
        draft.cornerPlayedToCenter = source.zone === "corner";
      } else {
        draft.corners[destination.index].push(card);
      }
    });
    setSelected(null);
  }

  function onSourcePress(source: Source) {
    if (game.ended) return;
    const destinations = destinationsFor(game, source);
    if (destinations.length === 0) return setSelected(null);
    if (destinations.length === 1) return move(source, destinations[0]);
    // Several places to go: pick the card up and wait for a destination.
    if (selected && sourceKey(selected) === sourceKey(source))
      return setSelected(null);
    setSelected(source);
  }

  function onDestinationPress(destination: Destination) {
    if (
      !selected ||
      !selectedDestinations.includes(destinationKey(destination))
    ) {
      return false;
    }
    move(selected, destination);
    return true;
  }

  function drawStock() {
    if (game.ended || game.stock.length === 0) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.stock.pop();
      if (card) draft.waste.push(flipToFace(card));
    });
    setSelected(null);
  }

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "center",
        name: "center",
        cards: game.center,
        ...cellPosition(centerCell),
        fan: { maxVisible: 3 },
        placeholder: {},
      },
      ...game.corners.map((pile, index) => ({
        id: `corner-${index}`,
        name: "corner",
        pileIndex: index,
        cards: pile,
        ...cellPosition(cornerCells[index]),
        fan: { maxVisible: 3 },
        placeholder: {},
      })),
      ...game.sails.map((card, index) => ({
        id: `sail-${index}`,
        name: "sail",
        pileIndex: index,
        cards: card ? [card] : [],
        ...cellPosition(sailCells[index]),
        placeholder: {},
      })),
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: 4 * colStep - 1.25,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: { text: "Waste", infoPos: "above", showCount: true },
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 4 * colStep,
        row: stockRow,
        fan: { maxVisible: 3 },
        placeholder: { text: "Stock", infoPos: "above", showCount: true },
      },
    ],
    [game],
  );

  const isSelectedSource = (source: Source) =>
    !!selected && sourceKey(selected) === sourceKey(source);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (!mappedCard.topOfZone) return {};
    const index = mappedCard.pileIndex ?? 0;

    if (mappedCard.zoneName === "sail" || mappedCard.zoneName === "waste") {
      const source: Source =
        mappedCard.zoneName === "sail"
          ? { zone: "sail", index }
          : { zone: "waste" };
      return {
        isDisabled: game.ended,
        isSelected: isSelectedSource(source),
        selectColor: "blue",
        onPress: () => onSourcePress(source),
      };
    }
    if (mappedCard.zoneName === "corner") {
      const isDestination = selectedDestinations.includes(`corner-${index}`);
      return {
        isDisabled: game.ended,
        isSelected: isDestination || isSelectedSource({ zone: "corner", index }),
        selectColor: isDestination ? "green" : "blue",
        onPress: () => {
          if (!onDestinationPress({ zone: "corner", index }))
            onSourcePress({ zone: "corner", index });
        },
      };
    }
    if (mappedCard.zoneName === "center") {
      const isDestination = selectedDestinations.includes("center");
      return {
        isDisabled: game.ended,
        isSelected: isDestination,
        selectColor: "green",
        onPress: () => onDestinationPress({ zone: "center" }),
      };
    }
    if (mappedCard.zoneName === "stock") {
      return { isDisabled: game.ended, onPress: drawStock };
    }
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "corner" && zone.pileIndex !== undefined) {
      const destination: Destination = {
        zone: "corner",
        index: zone.pileIndex,
      };
      const isDestination = selectedDestinations.includes(
        destinationKey(destination),
      );
      return {
        onPress: () => onDestinationPress(destination),
        isDisabled: !isDestination,
        isSelected: isDestination,
        selectColor: "green",
      };
    }
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

  const placed =
    game.center.length +
    game.corners.reduce((sum, pile) => sum + pile.length, 0);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={placed}
      winLoseMessage={game.won ? "The sails turn freely!" : "No moves remain."}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
