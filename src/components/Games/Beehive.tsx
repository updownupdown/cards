import { i18n } from "@/i18n";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  PlayingCard,
  shuffle,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const TABLEAU_COUNT = 6;
const BEEHIVE_SIZE = 10;
const TABLEAU_CAPACITY = 4;

export type BeehiveGameState = {
  beehive: PlayingCard[];
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  waste: PlayingCard[];
  discard: PlayingCard[];
};

function topCard(pile: PlayingCard[]) {
  return pile[pile.length - 1];
}

function sameRank(
  left: PlayingCard | undefined,
  right: PlayingCard | undefined,
) {
  return !!left && !!right && left.rank === right.rank;
}

function revealTop(pile: PlayingCard[]) {
  const card = topCard(pile);
  if (card && !card.faceUp) pile[pile.length - 1] = flipToFace(card);
}

function popVisible(pile: PlayingCard[]) {
  const card = pile.pop();
  revealTop(pile);
  return card;
}

function dealFromDraw(state: BeehiveGameState) {
  const beehive = state.stock.splice(0, BEEHIVE_SIZE);
  revealTop(beehive);
  state.beehive = beehive;
  state.tableau = Array.from({ length: TABLEAU_COUNT }, () => {
    const card = state.stock.shift();
    return card ? [flipToFace(card)] : [];
  });
}

function createInitialState(): BeehiveGameState {
  const state: BeehiveGameState = {
    beehive: [],
    tableau: Array.from({ length: TABLEAU_COUNT }, () => []),
    stock: shuffle(createDeck({ faceUp: false })),
    waste: [],
    discard: [],
  };
  dealFromDraw(state);
  return state;
}

function normalizeState(state: BeehiveGameState) {
  for (const pile of state.tableau) {
    if (pile.length === TABLEAU_CAPACITY) {
      state.discard.push(...flipAllToBack(pile));
      pile.splice(0, pile.length);
    }
  }
}

function canMoveBeehiveToTableau(state: BeehiveGameState, index: number) {
  const source = topCard(state.beehive);
  const destination = state.tableau[index];
  return (
    !!source &&
    destination.length < TABLEAU_CAPACITY &&
    (destination.length === 0 || sameRank(source, topCard(destination)))
  );
}

function canMoveWasteToTableau(state: BeehiveGameState, index: number) {
  const source = topCard(state.waste);
  const destination = state.tableau[index];
  return (
    !!source &&
    destination.length < TABLEAU_CAPACITY &&
    (destination.length === 0 || sameRank(source, topCard(destination)))
  );
}

function canMoveTableauToTableau(
  state: BeehiveGameState,
  sourceIndex: number,
  destinationIndex: number,
) {
  const source = state.tableau[sourceIndex];
  const destination = state.tableau[destinationIndex];
  return (
    sourceIndex !== destinationIndex &&
    source.length > 0 &&
    destination.length > 0 &&
    source.length + destination.length <= TABLEAU_CAPACITY &&
    sameRank(topCard(source), topCard(destination))
  );
}

function findMatchingTableau(state: BeehiveGameState, card: PlayingCard) {
  return state.tableau.findIndex(
    (pile) =>
      pile.length > 0 &&
      pile.length < TABLEAU_CAPACITY &&
      sameRank(card, topCard(pile)),
  );
}

function findEmptyTableau(state: BeehiveGameState) {
  return state.tableau.findIndex((pile) => pile.length === 0);
}

function hasValidMove(state: BeehiveGameState) {
  if (
    state.beehive.length > 0 &&
    state.tableau.some((_, i) => canMoveBeehiveToTableau(state, i))
  )
    return true;
  if (
    state.waste.length > 0 &&
    state.tableau.some((_, i) => canMoveWasteToTableau(state, i))
  )
    return true;
  return state.tableau.some((_, sourceIndex) =>
    state.tableau.some((__, destinationIndex) =>
      canMoveTableauToTableau(state, sourceIndex, destinationIndex),
    ),
  );
}

function hasFutureDrawMove(state: BeehiveGameState) {
  const probe: BeehiveGameState = {
    ...state,
    beehive: [...state.beehive],
    tableau: state.tableau.map((pile) => [...pile]),
    stock: [...state.stock],
    waste: [...state.waste],
    discard: [...state.discard],
  };
  let recycled = false;

  while (probe.stock.length > 0 || probe.waste.length > 0) {
    if (probe.stock.length === 0) {
      if (recycled) return false;
      resetDraw(probe);
      recycled = true;
    }

    dealDraw(probe);
    if (
      probe.waste.length > 0 &&
      probe.tableau.some((_, index) => canMoveWasteToTableau(probe, index))
    ) {
      return true;
    }
  }

  return false;
}

function isWon(state: BeehiveGameState) {
  return (
    state.beehive.length === 0 &&
    state.stock.length === 0 &&
    state.waste.length === 0 &&
    state.tableau.every((pile) => pile.length === 0) &&
    state.discard.length === 52
  );
}

function isLost(state: BeehiveGameState) {
  return !hasValidMove(state) && !hasFutureDrawMove(state);
}

function dealDraw(state: BeehiveGameState) {
  for (let index = 0; index < Math.min(3, state.stock.length); index += 1) {
    const card = state.stock.pop();
    if (card) state.waste.push(flipToFace(card));
  }
}

function resetDraw(state: BeehiveGameState) {
  state.stock = state.waste.reverse().map(flipToBack);
  state.waste = [];
}

async function resetAndSetup(
  setGame: (updater: (draft: BeehiveGameState) => void) => void,
) {
  setGame((draft) => {
    draft.stock = shuffle(
      flipAllToBack([
        ...draft.stock,
        ...draft.beehive,
        ...draft.tableau.flat(),
        ...draft.waste,
        ...draft.discard,
      ]),
    );
    draft.beehive = [];
    draft.tableau = Array.from({ length: TABLEAU_COUNT }, () => []);
    draft.waste = [];
    draft.discard = [];
  });
  await delay();
  setGame((draft) => dealFromDraw(draft));
}

function moveSourceToTableau(
  state: BeehiveGameState,
  source: "beehive" | "waste",
) {
  const card =
    source === "beehive" ? topCard(state.beehive) : topCard(state.waste);
  if (!card) return false;
  const matchingIndex = findMatchingTableau(state, card);
  const destinationIndex =
    matchingIndex >= 0 ? matchingIndex : findEmptyTableau(state);
  if (destinationIndex < 0) return false;
  const moving =
    source === "beehive" ? popVisible(state.beehive) : state.waste.pop();
  if (!moving) return false;
  state.tableau[destinationIndex].push(moving);
  normalizeState(state);
  return true;
}

function moveTableauToValidTableau(
  state: BeehiveGameState,
  sourceIndex: number,
) {
  const source = state.tableau[sourceIndex];
  const destinationIndex = state.tableau.findIndex(
    (pile, index) =>
      index !== sourceIndex &&
      pile.length > 0 &&
      pile.length + source.length <= TABLEAU_CAPACITY &&
      sameRank(topCard(source), topCard(pile)),
  );
  if (source.length === 0 || destinationIndex < 0) return false;
  state.tableau[destinationIndex].push(...state.tableau[sourceIndex].splice(0));
  normalizeState(state);
  return true;
}

const gameStateInitial = createInitialState();

export const beehiveRules = {
  createInitialState,
  dealFromDraw,
  normalizeState,
  canMoveBeehiveToTableau,
  canMoveWasteToTableau,
  canMoveTableauToTableau,
  hasValidMove,
  hasFutureDrawMove,
  isWon,
  isLost,
  dealDraw,
  resetDraw,
  moveSourceToTableau,
  moveTableauToValidTableau,
};

export default function Beehive() {
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<BeehiveGameState>({
      gameStateInitial,
      resetAndSetup: async (): Promise<void> => resetAndSetup(setGame),
    });
  const won = isWon(game);
  const lost = !won && isLost(game);

  function commit(action: (draft: BeehiveGameState) => boolean) {
    if (won || lost) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (action(draft)) normalizeState(draft);
    });
  }

  function onSourcePress(source: "beehive" | "waste") {
    commit((draft) => moveSourceToTableau(draft, source));
  }

  function onTableauPress(index: number) {
    commit((draft) => moveTableauToValidTableau(draft, index));
  }

  function onDrawPress() {
    if (won || lost) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (draft.stock.length > 0) dealDraw(draft);
      else resetDraw(draft);
    });
  }

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 0,
        row: 0,
        baseZIndex: 5,
        fan: { maxVisible: 1 },
        placeholder: { text: i18n.t("cards:discard"), infoPos: "below" },
      },
      {
        id: "beehive",
        name: "beehive",
        cards: game.beehive,
        col: 0,
        row: 2.5,
        baseZIndex: 40,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:beehive.beehive"),
          infoPos: "above",
        },
      },
      {
        id: "waste",
        name: "waste",
        cards: game.waste,
        col: 1.5,
        row: 2.5,
        baseZIndex: 50,
        fan: {
          direction: "right",
          offset: cardDims.tableauOffsetHorizontalSuit,
          maxVisible: 3,
          shadowVisibleCount: 6,
        },
        placeholder: { text: i18n.t("cards:waste"), infoPos: "above" },
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 3.5,
        row: 2.5,
        baseZIndex: 30,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "above" },
      },
      ...game.tableau.map((pile, pileIndex) => ({
        id: `tableau-${pileIndex}`,
        name: "tableau",
        pileIndex,
        cards: pile,
        col: 1.5 + (pileIndex % 3),
        row: Math.floor(pileIndex / 3),
        baseZIndex: 10 + pileIndex,
        fan: { maxVisible: 4 },
        placeholder: { text: i18n.t("cards:tab") },
      })),
    ],
    [game],
  );

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "stock")
      return {
        clickThroughCards: true,
        isDisabled: won || lost,
        onPress: onDrawPress,
      };
    if (!mappedCard.topOfZone) return {};
    if (mappedCard.zoneName === "discard")
      return { clickThroughCards: true, isDisabled: true };
    if (mappedCard.zoneName === "beehive")
      return {
        isDisabled: won || lost,
        onPress: () => onSourcePress("beehive"),
      };
    if (mappedCard.zoneName === "waste")
      return {
        isDisabled: won || lost,
        onPress: () => onSourcePress("waste"),
      };
    if (mappedCard.zoneName === "tableau" && mappedCard.pileIndex !== undefined)
      return {
        isDisabled: won || lost,
        onPress: () => onTableauPress(mappedCard.pileIndex!),
      };
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock")
      return { onPress: onDrawPress, isDisabled: won || lost };
    if (zone.name === "waste")
      return {
        onPress: () => onSourcePress("waste"),
        isDisabled: game.waste.length === 0 || won || lost,
      };
    if (zone.name === "beehive")
      return {
        onPress: () => onSourcePress("beehive"),
        isDisabled: game.beehive.length === 0 || won || lost,
      };
    if (zone.name === "tableau" && zone.pileIndex !== undefined)
      return {
        onPress: () => onTableauPress(zone.pileIndex!),
        isDisabled: won || lost,
      };
    return undefined;
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "regular",
    gap: 0.25,
  });

  return (
    <GameWrapper
      outcome={won ? "won" : lost ? "lost" : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={i18n.t(
        lost
          ? "games:beehive.noFurtherMovesPossible"
          : "games:beehive.honeycombComplete",
      )}
    >
      {cardMap}
    </GameWrapper>
  );
}
