import { useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  createDeck,
  flipAllToBack,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, withNote, zoneTarget } from "@/hints/hint";
import { seededRandom, shuffledWith } from "@/hints/random";
type AnchorIndex = 0 | 1 | 2 | 3;

type PileDefinition = {
  id: string;
  anchors: AnchorIndex[];
  capacity: number;
  col: number;
  row: number;
};

type GameState = {
  diamonds: PlayingCard[];
  diamondStock: PlayingCard[];
  blackStock: PlayingCard[];
  discard: PlayingCard[];
  hand: PlayingCard[];
  piles: PlayingCard[][];
  lost: boolean;
};

export type RedRedDiamondGameState = GameState;

const DIAMOND_POSITIONS = [
  { col: 2, row: 1 },
  { col: 3, row: 2 },
  { col: 2, row: 3 },
  { col: 1, row: 2 },
];

const PILE_DEFINITIONS: PileDefinition[] = [
  { id: "outside-north", anchors: [0], capacity: 3, col: 2, row: 0 },
  { id: "outside-east", anchors: [1], capacity: 3, col: 4, row: 2 },
  { id: "outside-south", anchors: [2], capacity: 3, col: 2, row: 4 },
  { id: "outside-west", anchors: [3], capacity: 3, col: 0, row: 2 },
  { id: "inside-ne", anchors: [0, 1], capacity: 4, col: 3, row: 1 },
  { id: "inside-se", anchors: [1, 2], capacity: 4, col: 3, row: 3 },
  { id: "inside-sw", anchors: [2, 3], capacity: 4, col: 1, row: 3 },
  { id: "inside-nw", anchors: [3, 0], capacity: 4, col: 1, row: 1 },
  { id: "center", anchors: [0, 1, 2, 3], capacity: 5, col: 2, row: 2 },
];

function createInitialState(): GameState {
  return {
    diamonds: [],
    diamondStock: [],
    blackStock: [],
    discard: flipAllToBack([
      ...createDeck({ forceSuit: "diamonds" }),
      ...createDeck({ forceSuit: "clubs" }),
      ...createDeck({ forceSuit: "spades" }),
    ]),
    hand: [],
    piles: PILE_DEFINITIONS.map(() => []),
    lost: false,
  };
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    draft.discard = flipAllToBack([
      ...draft.diamonds,
      ...draft.diamondStock,
      ...draft.blackStock,
      ...draft.hand,
      ...draft.piles.flat(),
      ...draft.discard,
    ]);

    draft.diamonds = [];
    draft.diamondStock = [];
    draft.blackStock = [];
    draft.hand = [];
    draft.piles = PILE_DEFINITIONS.map(() => []);
    draft.lost = false;
  });

  await delay();

  setGame((draft) => {
    const cards = shuffle(draft.discard);
    const diamonds = cards.filter((card) => card.suit === "diamonds");
    const blackCards = cards.filter((card) => card.suit !== "diamonds");

    draft.diamonds = diamonds.splice(-4).map((card) => ({
      ...card,
      faceUp: true,
    }));
    draft.diamondStock = diamonds;
    draft.hand = blackCards.splice(-2).map((card) => ({
      ...card,
      faceUp: true,
    }));
    draft.blackStock = blackCards;
    draft.discard = [];
  });
}

function isArithmeticMatch(value: number, first: number, second: number) {
  if (value === first || value === second) return true;
  if (value === first + second || value === Math.abs(first - second)) {
    return true;
  }
  if (value === first * second) return true;
  return (
    (second !== 0 && first / second === value) ||
    (first !== 0 && second / first === value)
  );
}

function canPlaceCard(
  card: PlayingCard,
  pile: PlayingCard[],
  definition: PileDefinition,
  diamonds: PlayingCard[],
) {
  if (pile.length >= definition.capacity) return false;

  const topCard = pile[pile.length - 1];
  if (topCard && topCard.suit === card.suit) return false;
  if (definition.anchors.length === 4) return true;

  const values = definition.anchors.map((index) => rankValue(diamonds[index]));
  const value = rankValue(card);
  if (values.length === 1) return value === values[0];
  return isArithmeticMatch(value, values[0], values[1]);
}

function canReplenish(definition: PileDefinition, diamondStockCount: number) {
  return diamondStockCount >= definition.anchors.length;
}

function hasLegalPlacement(
  card: PlayingCard,
  piles: PlayingCard[][],
  diamonds: PlayingCard[],
) {
  return PILE_DEFINITIONS.some((definition, index) =>
    canPlaceCard(card, piles[index], definition, diamonds),
  );
}

function replenishPile(draft: GameState, pileIndex: number) {
  const definition = PILE_DEFINITIONS[pileIndex];
  if (!definition || draft.piles[pileIndex].length === 0) return false;

  if (!canReplenish(definition, draft.diamondStock.length)) {
    draft.lost = true;
    return false;
  }

  draft.discard.push(...flipAllToBack(draft.piles[pileIndex]));
  draft.piles[pileIndex] = [];

  for (const anchorIndex of definition.anchors) {
    const replacement = draft.diamondStock.pop();
    const previous = draft.diamonds[anchorIndex];
    if (!replacement || !previous) {
      draft.lost = true;
      return false;
    }
    draft.discard.push(flipAllToBack([previous])[0]);
    draft.diamonds[anchorIndex] = { ...replacement, faceUp: true };
  }

  return true;
}

function refillHand(draft: GameState) {
  while (draft.hand.length < 2 && draft.blackStock.length > 0) {
    const card = draft.blackStock.pop();
    if (card) draft.hand.push({ ...card, faceUp: true });
  }
}

// —— Hints ——

type RedDiamondMove =
  | { kind: "place"; hand: number; pile: number }
  | { kind: "clear"; pile: number }
  | { kind: "replace"; anchor: AnchorIndex };

// Diamond stocks tried for a move that draws new diamonds (the stock is
// face down: its order is unknown).
const DIAMOND_SAMPLES = 8;

function legalPiles(card: PlayingCard, state: GameState) {
  return PILE_DEFINITIONS.filter((definition, index) =>
    canPlaceCard(card, state.piles[index], definition, state.diamonds),
  ).length;
}

/**
 * How well placed the game is: the hand's other card and the black cards
 * still to come (in no known order) want piles to go on, and every diamond
 * in stock is a pile cleared later.
 */
function positionValue(state: GameState) {
  if (state.lost) return -1e6;
  const waiting = [...state.hand, ...state.blackStock];
  if (waiting.length === 0) return 1e6;
  const open =
    waiting.reduce(
      (sum, card) => sum + Math.min(legalPiles(card, state), 3),
      0,
    ) / waiting.length;
  const handStuck = state.hand.filter((card) => legalPiles(card, state) === 0);
  const room = state.piles.reduce(
    (sum, pile, index) => sum + PILE_DEFINITIONS[index].capacity - pile.length,
    0,
  );
  return (
    6 * open - 8 * handStuck.length + 2 * state.diamondStock.length + 0.5 * room
  );
}

function applyRedDiamondMove(state: GameState, move: RedDiamondMove) {
  const next = structuredClone(state);
  if (move.kind === "place") {
    const [card] = next.hand.splice(move.hand, 1);
    next.piles[move.pile].push(card);
    if (next.piles[move.pile].length === PILE_DEFINITIONS[move.pile].capacity) {
      replenishPile(next, move.pile);
    }
    // The next hand comes from the face-down stock: judge by what's left.
  } else if (move.kind === "clear") {
    replenishPile(next, move.pile);
  } else {
    const replacement = next.diamondStock.pop();
    if (!replacement) next.lost = true;
    else {
      next.discard.push(next.diamonds[move.anchor]);
      next.diamonds[move.anchor] = { ...replacement, faceUp: true };
    }
  }
  return next;
}

function moveValue(state: GameState, move: RedDiamondMove) {
  const random = seededRandom(
    [
      move.kind,
      ...state.diamondStock.map((card) => card.id),
      ...state.hand.map((card) => card.id),
    ].join(","),
  );
  let total = 0;
  for (let sample = 0; sample < DIAMOND_SAMPLES; sample += 1) {
    const shuffled = {
      ...state,
      diamondStock: shuffledWith(state.diamondStock, random),
    };
    total += positionValue(applyRedDiamondMove(shuffled, move));
  }
  return total / DIAMOND_SAMPLES;
}

function redDiamondMoves(state: GameState): RedDiamondMove[] {
  const places = state.hand.flatMap((card, hand) =>
    PILE_DEFINITIONS.flatMap((definition, pile) =>
      canPlaceCard(card, state.piles[pile], definition, state.diamonds)
        ? [{ kind: "place" as const, hand, pile }]
        : [],
    ),
  );
  const blocked = state.hand.some(
    (card) => !hasLegalPlacement(card, state.piles, state.diamonds),
  );
  if (!blocked) return places;
  const clears = PILE_DEFINITIONS.flatMap((definition, pile) =>
    state.piles[pile].length > 0 &&
    canReplenish(definition, state.diamondStock.length)
      ? [{ kind: "clear" as const, pile }]
      : [],
  );
  const replaces =
    state.diamondStock.length > 0
      ? ([0, 1, 2, 3] as AnchorIndex[]).map((anchor) => ({
          kind: "replace" as const,
          anchor,
        }))
      : [];
  return [...places, ...clears, ...replaces];
}

function bestRedDiamondMove(state: GameState) {
  let best: { move: RedDiamondMove; value: number } | null = null;
  for (const move of redDiamondMoves(state)) {
    const value = moveValue(state, move);
    if (!best || value > best.value) best = { move, value };
  }
  return best?.move ?? null;
}

function findRedDiamondHint(
  state: GameState,
  selectedHand: number | null,
  placingDiamond: boolean,
) {
  const move = bestRedDiamondMove(state);
  if (!move) return null;
  if (move.kind === "place") {
    const pile = PILE_DEFINITIONS[move.pile];
    const hint = makeHint(
      "moveCard",
      selectedHand === move.hand ? [] : cardTarget(state.hand[move.hand]),
      zoneTarget(pile.id),
    );
    return state.piles[move.pile].length + 1 === pile.capacity
      ? withNote(hint, i18n.t("games:redDiamond.hint.fillPile"))
      : hint;
  }
  // Clearing and replacing want no hand card picked.
  const unpick =
    selectedHand !== null ? cardTarget(state.hand[selectedHand]) : [];
  if (move.kind === "clear") {
    return withNote(
      makeHint("tapCard", unpick, zoneTarget(PILE_DEFINITIONS[move.pile].id)),
      i18n.t("games:redDiamond.hint.clearPile"),
    );
  }
  return withNote(
    makeHint(
      "tapCard",
      unpick,
      placingDiamond ? [] : zoneTarget("diamond-stock"),
      cardTarget(state.diamonds[move.anchor]),
    ),
    i18n.t("games:redDiamond.hint.replaceDiamond"),
  );
}

export const redDiamondRules = {
  findHint: findRedDiamondHint,
  bestMove: bestRedDiamondMove,
  replenishPile,
  refillHand,
  isArithmeticMatch,
  canPlaceCard,
  canReplenish,
  hasLegalPlacement,
  pileDefinitions: PILE_DEFINITIONS,
};

export default function RedDiamond() {
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(
    null,
  );
  const [placingDiamond, setPlacingDiamond] = useState(false);

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<GameState>({
    gameStateInitial: createInitialState(),
    resetNonGameStates: () => {
      setSelectedHandIndex(null);
      setPlacingDiamond(false);
    },
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
  });

  const won =
    !isSettingUp &&
    !game.lost &&
    game.blackStock.length === 0 &&
    game.hand.length === 0;
  const ended = !isSettingUp && (won || game.lost);
  const hasBlockedCard = game.hand.some(
    (card) => !hasLegalPlacement(card, game.piles, game.diamonds),
  );

  useHint(() => findRedDiamondHint(game, selectedHandIndex, placingDiamond), {
    game,
    enabled: !ended && !isSettingUp,
  });

  function placeBlackCard(pileIndex: number) {
    if (ended || selectedHandIndex === null) return;

    const card = game.hand[selectedHandIndex];
    const definition = PILE_DEFINITIONS[pileIndex];
    if (
      !card ||
      !definition ||
      !canPlaceCard(card, game.piles[pileIndex], definition, game.diamonds)
    ) {
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const playedCard = draft.hand.splice(selectedHandIndex, 1)[0];
      if (!playedCard) return;

      draft.piles[pileIndex].push(playedCard);
      if (draft.piles[pileIndex].length === definition.capacity) {
        replenishPile(draft, pileIndex);
      }
      if (!draft.lost && draft.hand.length === 0) refillHand(draft);
    });
    setSelectedHandIndex(null);
  }

  function clearPile(pileIndex: number) {
    if (ended || !hasBlockedCard || game.piles[pileIndex].length === 0) {
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      replenishPile(draft, pileIndex);
    });
  }

  function replaceDiamond(anchorIndex: number) {
    if (
      ended ||
      !hasBlockedCard ||
      !placingDiamond ||
      game.diamondStock.length === 0
    ) {
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const replacement = draft.diamondStock.pop();
      const previous = draft.diamonds[anchorIndex];
      if (!replacement || !previous) return;
      draft.discard.push(flipAllToBack([previous])[0]);
      draft.diamonds[anchorIndex] = { ...replacement, faceUp: true };
    });
    setPlacingDiamond(false);
  }

  const zones: MapZone[] = useMemo(() => {
    const diamondZones: MapZone[] = DIAMOND_POSITIONS.map(
      (position, index) => ({
        id: `diamond-${index}`,
        name: "diamond",
        pileIndex: index,
        cards: game.diamonds[index] ? [game.diamonds[index]] : [],
        col: position.col,
        row: position.row,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
      }),
    );
    const pileZones: MapZone[] = PILE_DEFINITIONS.map((definition, index) => ({
      id: definition.id,
      name: "pile",
      pileIndex: index,
      cards: game.piles[index],
      col: definition.col,
      row: definition.row,
      baseZIndex: 30,
      fan: { maxVisible: 4 },
      placeholder: { showCount: false },
    }));

    return [
      ...diamondZones,
      ...pileZones,
      {
        id: "diamond-stock",
        name: "diamond-stock",
        cards: game.diamondStock,
        col: 4,
        row: 5.25,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:redDiamond.diamonds"),
          infoPos: "left",
        },
      },
      {
        id: "black-stock",
        name: "black-stock",
        cards: game.blackStock,
        col: 0,
        row: 5.25,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:black"), infoPos: "right" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 4,
        row: 0,
        baseZIndex: 150,
        fan: { maxVisible: 3 },
      },
      ...game.hand.map((card, index) => ({
        id: `hand-${index}`,
        name: "hand",
        pileIndex: index,
        cards: [card],
        col: game.hand.length === 1 ? 2 : 1.5 + index * 1,
        row: 5.25,
        baseZIndex: 60,
      })),
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand" && mappedCard.pileIndex !== undefined) {
      const handIndex = mappedCard.pileIndex;

      const playable = hasLegalPlacement(
        mappedCard.card,
        game.piles,
        game.diamonds,
      );

      return {
        onPress: () => {
          if (ended) return;
          setPlacingDiamond(false);
          setSelectedHandIndex((current) =>
            current === handIndex ? null : handIndex,
          );
        },
        isDisabled: ended || !playable,
        selectColor: !playable ? "grey" : "blue",
        forceOverlayColor: !playable,
        isSelected: selectedHandIndex === handIndex,
      };
    } else if (
      mappedCard.zoneName === "diamond" &&
      mappedCard.pileIndex !== undefined
    ) {
      return {
        onPress: () => replaceDiamond(mappedCard.pileIndex as AnchorIndex),
        isDisabled: ended || !placingDiamond,
        selectColor: placingDiamond ? "green" : "none",
      };
    } else if (mappedCard.zoneName === "pile") {
      return { clickThroughCards: true };
    } else if (mappedCard.zoneName === "diamond-stock") {
      const isSelected = placingDiamond && mappedCard.topOfZone;

      return {
        clickThroughCards: true,
        selectColor: "blue",
        isSelected,
      };
    }
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "pile" && zone.pileIndex !== undefined) {
      const pileIndex = zone.pileIndex;
      const card =
        selectedHandIndex === null ? undefined : game.hand[selectedHandIndex];
      const playable = card
        ? canPlaceCard(
            card,
            game.piles[pileIndex],
            PILE_DEFINITIONS[pileIndex],
            game.diamonds,
          )
        : false;

      return {
        onPress: () =>
          selectedHandIndex === null
            ? clearPile(pileIndex)
            : placeBlackCard(pileIndex),
        isDisabled:
          ended ||
          (selectedHandIndex === null
            ? !hasBlockedCard || game.piles[pileIndex].length === 0
            : !playable),
      };
    } else if (zone.name === "diamond-stock") {
      const isDisabled =
        ended || !hasBlockedCard || game.diamondStock.length === 0;

      return {
        onPress: () => {
          if (isDisabled) return;
          setSelectedHandIndex(null);
          setPlacingDiamond((current) => !current);
        },
        isDisabled,
      };
    }
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    gap: 0.14,
  });

  return (
    <GameWrapper
      isLoaded={isLoaded}
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      winLoseMessage={
        won
          ? i18n.t("games:redDiamond.allBlackCardsHaveBeen")
          : game.lost
            ? i18n.t("games:redDiamond.thereAreNotEnoughDiamond")
            : undefined
      }
      reset={reset}
      undo={undo}
      canUndo={canUndo}
    >
      {cardMap}
    </GameWrapper>
  );
}
