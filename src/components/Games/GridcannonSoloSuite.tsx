import { useStateManager } from "@/hooks/useStateManager";
import { useMemo } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardColor,
  createDeck,
  isFace,
  PlayingCard,
  rankValue,
  shuffle,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

type RoyalSlot = { cards: PlayingCard[]; armour: number; dead: boolean };
type Mode = "place" | "extract" | "reassign-source" | "reassign-target";
type GameState = {
  deck: PlayingCard[];
  discard: PlayingCard[];
  grid: PlayingCard[][];
  royals: RoyalSlot[];
  aces: PlayingCard[];
  jokers: PlayingCard[];
  pending: PlayingCard | null;
  mode: Mode;
  selectedStack: number | null;
  ended: boolean;
  won: boolean;
};

const BORDER_TO_GRID = [0, 1, 2, 0, 2, 3, 5, 6, 8, 6, 7, 8];
const ATTACKS: Record<number, [number, number, number][]> = {
  0: [
    [4, 1, 2],
    [9, 3, 6],
  ],
  1: [[10, 4, 7]],
  2: [
    [3, 1, 0],
    [11, 5, 8],
  ],
  3: [[6, 4, 5]],
  5: [[5, 4, 3]],
  6: [
    [0, 3, 0],
    [8, 7, 8],
  ],
  7: [[1, 4, 1]],
  8: [
    [2, 5, 2],
    [7, 7, 6],
  ],
};

function topCard(stack: PlayingCard[]) {
  return stack.at(-1);
}

function similarity(card: PlayingCard, target: PlayingCard) {
  const relation =
    card.suit === target.suit
      ? 2
      : cardColor(card) === cardColor(target)
        ? 1
        : 0;
  return relation * 100 + rankValue(card);
}

function bestRoyalSlot(state: GameState, royal: PlayingCard) {
  const available = state.royals
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slot.cards.length === 0);
  return available.sort((first, second) => {
    const firstCard = topCard(state.grid[BORDER_TO_GRID[first.index]]);
    const secondCard = topCard(state.grid[BORDER_TO_GRID[second.index]]);
    return (
      (secondCard ? similarity(secondCard, royal) : -1) -
      (firstCard ? similarity(firstCard, royal) : -1)
    );
  })[0]?.index;
}

function bestArmourSlot(state: GameState, card: PlayingCard) {
  return state.royals
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slot.cards.length > 0 && !slot.dead)
    .sort((first, second) => {
      const firstRoyal = first.slot.cards[0];
      const secondRoyal = second.slot.cards[0];
      const firstRelation =
        firstRoyal.suit === card.suit
          ? 2
          : cardColor(firstRoyal) === cardColor(card)
            ? 1
            : 0;
      const secondRelation =
        secondRoyal.suit === card.suit
          ? 2
          : cardColor(secondRoyal) === cardColor(card)
            ? 1
            : 0;
      return (
        secondRelation * 100 -
        rankValue(secondRoyal) -
        (firstRelation * 100 - rankValue(firstRoyal))
      );
    })[0]?.index;
}

function placeRoyal(state: GameState, royal: PlayingCard) {
  const slotIndex = bestRoyalSlot(state, royal);
  if (slotIndex === undefined) return false;
  state.royals[slotIndex] = {
    cards: [{ ...royal, faceUp: true }],
    armour: 0,
    dead: false,
  };
  return true;
}

function attackValue(royal: PlayingCard, attackers: PlayingCard[]) {
  return attackers.reduce((total, card) => {
    if (royal.rank === "Q" && cardColor(card) !== cardColor(royal))
      return total;
    if (royal.rank === "K" && card.suit !== royal.suit) return total;
    return total + rankValue(card);
  }, 0);
}

function resolveAttacks(state: GameState, gridIndex: number) {
  for (const [slotIndex, firstIndex, secondIndex] of ATTACKS[gridIndex] ?? []) {
    const slot = state.royals[slotIndex];
    const royal = slot.cards[0];
    const attackers = [
      topCard(state.grid[firstIndex]),
      topCard(state.grid[secondIndex]),
    ];
    if (!royal || slot.dead || attackers.some((card) => !card)) continue;
    if (
      attackValue(royal, attackers as PlayingCard[]) >=
      rankValue(royal) + slot.armour
    ) {
      slot.dead = true;
      slot.cards[0].faceUp = false;
    }
  }
  state.won = state.royals.every((slot) => slot.dead);
  state.ended = state.won;
}

function canPlaceNumber(
  state: GameState,
  card: PlayingCard,
  gridIndex: number,
) {
  const destination = topCard(state.grid[gridIndex]);
  return !destination || rankValue(card) >= rankValue(destination);
}

function processDraw(state: GameState) {
  if (state.pending || state.ended || state.mode !== "place") return;
  const card = state.deck.pop();
  if (!card) {
    state.ended = state.aces.length === 0 && state.jokers.length === 0;
    return;
  }
  card.faceUp = true;
  if (card.rank === "A") state.aces.push(card);
  else if (card.rank === "Joker") state.jokers.push(card);
  else if (isFace(card)) placeRoyal(state, card);
  else {
    const hasPlacement = state.grid.some((_, index) =>
      canPlaceNumber(state, card, index),
    );
    if (hasPlacement || state.aces.length || state.jokers.length) {
      state.pending = card;
    } else {
      const slotIndex = bestArmourSlot(state, card);
      if (slotIndex === undefined) {
        state.ended = true;
        return;
      }
      const slot = state.royals[slotIndex];
      slot.armour += rankValue(card);
      const health = rankValue(slot.cards[0]) + slot.armour;
      state.discard.push(card);
      state.ended = health >= (slot.cards[0].rank === "K" ? 19 : 20);
    }
  }
}

function createInitialState(): GameState {
  const state: GameState = {
    deck: shuffle(createDeck({ includeJokers: true })),
    discard: [],
    grid: Array.from({ length: 9 }, () => []),
    royals: Array.from({ length: 12 }, () => ({
      cards: [],
      armour: 0,
      dead: false,
    })),
    aces: [],
    jokers: [],
    pending: null,
    mode: "place",
    selectedStack: null,
    ended: false,
    won: false,
  };
  let gridIndex = 0;
  const setAsideRoyals: PlayingCard[] = [];
  while (gridIndex < 9 && state.deck.length) {
    const card = state.deck.pop()!;
    if (card.rank === "A") state.aces.push({ ...card, faceUp: true });
    else if (card.rank === "Joker")
      state.jokers.push({ ...card, faceUp: true });
    else if (isFace(card)) setAsideRoyals.push(card);
    else state.grid[gridIndex++].push({ ...card, faceUp: true });
  }
  setAsideRoyals.forEach((card) => placeRoyal(state, card));
  return state;
}

export const dynastyRules = {
  attackValue,
  canPlaceNumber,
  resolveAttacks,
  similarity,
};

const gameStateInitial = createInitialState();

export default function Dynasty() {
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        const next = createInitialState();
        setGame((draft) => void Object.assign(draft, next));
      },
    });

  function mutate(action: (draft: GameState) => void) {
    saveUndoState(structuredClone(game));
    setGame(action);
  }

  function selectGrid(index: number) {
    if (game.ended) return;
    mutate((draft) => {
      if (draft.mode === "extract") {
        const cards = draft.grid[index].map((card) => ({
          ...card,
          faceUp: false,
        }));
        if (!cards.length) return;
        draft.grid[index] = [];
        draft.deck.unshift(...cards);
        draft.aces.pop();
        draft.mode = "place";
        return;
      }
      if (draft.mode === "reassign-source") {
        if (!draft.grid[index].length) return;
        draft.selectedStack = index;
        draft.mode = "reassign-target";
        return;
      }
      if (draft.mode === "reassign-target") {
        const source = draft.selectedStack;
        const card = source === null ? undefined : topCard(draft.grid[source]);
        if (
          source === null ||
          source === index ||
          !card ||
          !canPlaceNumber(draft, card, index)
        )
          return;
        draft.grid[source].pop();
        draft.grid[index].push(card);
        draft.jokers.pop();
        draft.mode = "place";
        draft.selectedStack = null;
        resolveAttacks(draft, index);
        return;
      }
      const card = draft.pending;
      if (!card || !canPlaceNumber(draft, card, index)) return;
      draft.grid[index].push(card);
      draft.pending = null;
      resolveAttacks(draft, index);
    });
  }

  function selectPloy(type: "ace" | "joker") {
    if (game.ended) return;
    mutate((draft) => {
      if (type === "ace" && draft.aces.length)
        draft.mode = draft.mode === "extract" ? "place" : "extract";
      if (type === "joker" && draft.jokers.length) {
        draft.mode = draft.mode.startsWith("reassign")
          ? "place"
          : "reassign-source";
        draft.selectedStack = null;
      }
    });
  }

  const positions = [
    [1, 0],
    [2, 0],
    [3, 0],
    [0, 1],
    [4, 1],
    [0, 2],
    [4, 2],
    [0, 3],
    [4, 3],
    [1, 4],
    [2, 4],
    [3, 4],
  ];
  const zones = useMemo<MapZone[]>(
    () => [
      ...game.royals.map((slot, index) => ({
        id: `royal-${index}`,
        name: "royal",
        pileIndex: index,
        cards: slot.cards,
        col: positions[index][0],
        row: positions[index][1],
        baseZIndex: 10,
        placeholder: { showCount: false },
      })),
      ...game.grid.map((cards, index) => ({
        id: `grid-${index}`,
        name: "grid",
        pileIndex: index,
        cards,
        col: 1 + (index % 3),
        row: 1 + Math.floor(index / 3),
        baseZIndex: 20,
        fan: { maxVisible: 1 },
        placeholder: { showCount: cards.length > 1 },
      })),
      {
        id: "deck",
        name: "deck",
        cards: game.pending ? [game.pending] : game.deck,
        col: 5,
        row: 1,
        baseZIndex: 30,
        fan: { maxVisible: 1 },
        placeholder: { text: "Draw" },
      },
      {
        id: "aces",
        name: "aces",
        cards: game.aces,
        col: 5,
        row: 2,
        baseZIndex: 30,
        fan: { maxVisible: 1 },
        placeholder: { text: "Aces" },
      },
      {
        id: "jokers",
        name: "jokers",
        cards: game.jokers,
        col: 5,
        row: 3,
        baseZIndex: 30,
        fan: { maxVisible: 1 },
        placeholder: { text: "Jokers" },
      },
    ],
    [game],
  );

  const cardMapper = (mapped: MappedCard): AnimatedCardMapping => {
    if (mapped.zoneName === "grid") {
      const index = mapped.pileIndex ?? -1;
      const valid =
        game.mode === "extract" ||
        game.mode === "reassign-source" ||
        (game.mode === "reassign-target" &&
          game.selectedStack !== index &&
          !!topCard(game.grid[game.selectedStack ?? -1] ?? []) &&
          canPlaceNumber(
            game,
            topCard(game.grid[game.selectedStack ?? -1])!,
            index,
          )) ||
        (!!game.pending && canPlaceNumber(game, game.pending, index));
      return {
        onPress: () => selectGrid(index),
        isDisabled: !valid,
        isSelected: valid,
        selectColor: valid ? "green" : "none",
      };
    }
    if (mapped.zoneName === "deck")
      return {
        onPress: () => mutate(processDraw),
        isDisabled: !!game.pending || game.mode !== "place",
      };
    if (mapped.zoneName === "aces")
      return { onPress: () => selectPloy("ace"), isDisabled: game.ended };
    if (mapped.zoneName === "jokers")
      return { onPress: () => selectPloy("joker"), isDisabled: game.ended };
    return {};
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping => {
    if (zone.name === "grid" && zone.pileIndex !== undefined) {
      return { onPress: () => selectGrid(zone.pileIndex!) };
    }
    if (zone.name === "deck") return { onPress: () => mutate(processDraw) };
    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedCols: 6,
    fixedRows: 5,
    gap: 0.08,
  });
  const score = game.aces.length + game.jokers.length;

  return (
    <GameWrapper
      outcome={game.ended ? (game.won ? "won" : "lost") : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={score}
      winLoseMessage="All twelve royals are down."
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
