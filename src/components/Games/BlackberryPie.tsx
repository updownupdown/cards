import { useStateManager } from "@/hooks/useStateManager";
import { useMemo, useState } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  collectCards,
  createDeck,
  flipAllToBack,
  flipAllToFace,
  flipToFace,
  isFace,
  rankValue,
  shuffle,
  sortCardsByRank,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { delay } from "@/utils/utils";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";
const cardSize = "tableau";
const BERRY_COUNT = 10;
const HAND_LIMIT = 3;
const BOTTOM_ROW = 3.6;

type CardSource =
  | { type: "hand"; cardId: string }
  | { type: "retainer"; cardId: string };

export type BlackberryPieGameState = {
  queen: PlayingCard[];
  berries: (PlayingCard | null)[];
  piles: PlayingCard[][];
  hand: PlayingCard[];
  retainers: (PlayingCard | null)[];
  stock: PlayingCard[];
  lastColumn: number | null;
  canPlayAnywhere: boolean;
  ended: boolean;
  won: boolean;
};

const gameStateInitial: BlackberryPieGameState = {
  queen: [],
  berries: Array(BERRY_COUNT).fill(null),
  piles: Array.from({ length: BERRY_COUNT }, () => []),
  hand: [],
  retainers: [null, null],
  stock: [],
  lastColumn: null,
  canPlayAnywhere: true,
  ended: false,
  won: false,
};

/** The table cleared, with every card gathered face down into the stock. */
function gatherState(cards: PlayingCard[]): BlackberryPieGameState {
  return { ...gameStateInitial, stock: shuffle(flipAllToBack(cards)) };
}

// Starts with every card in the stock, to be dealt out from there.
const gatheredInitial = gatherState(createDeck({ includeJokers: true }));

function drawToHand(draft: BlackberryPieGameState) {
  while (draft.hand.length < HAND_LIMIT) {
    const card = draft.stock.pop();
    if (!card) break;
    draft.hand.push(flipToFace(card));
    draft.hand = sortCardsByRank(draft.hand);
  }
}

function isBerry(card: PlayingCard) {
  return card.suit === "clubs" && rankValue(card) <= BERRY_COUNT;
}

function createGame(cards = createDeck({ includeJokers: true })) {
  const deck = shuffle(cards);
  const queen = deck.find(
    (card) => card.suit === "hearts" && card.rank === "Q",
  );
  const berries = deck.filter(isBerry);
  const remaining = deck.filter(
    (card) => card.id !== queen?.id && !isBerry(card),
  );
  const retainers = [remaining.pop() ?? null, remaining.pop() ?? null].map(
    (card) => (card ? flipToFace(card) : null),
  );
  const state: BlackberryPieGameState = {
    ...gameStateInitial,
    queen: queen ? [flipToFace(queen)] : [],
    berries: shuffle(flipAllToFace(berries)),
    piles: Array.from({ length: BERRY_COUNT }, () => []),
    hand: [],
    retainers,
    stock: remaining,
  };
  drawToHand(state);
  return state;
}

function isRun(cards: readonly PlayingCard[]) {
  const values = cards
    .map((card) => rankValue(card))
    .sort((left, right) => left - right);
  return new Set(values).size === 3 && values[2] - values[0] === 2;
}

function hasBerrySet(berry: PlayingCard, pile: readonly PlayingCard[]) {
  for (let first = 0; first < pile.length - 2; first += 1) {
    for (let second = first + 1; second < pile.length - 1; second += 1) {
      for (let third = second + 1; third < pile.length; third += 1) {
        const cards = [pile[first], pile[second], pile[third]];
        if (
          cards.some((card) => card.rank === "Joker") ||
          !cards.some((card) => card.rank === berry.rank)
        ) {
          continue;
        }
        if (
          isRun(cards) ||
          cards.every((card) => card.suit === cards[0].suit) ||
          cards.every(isFace)
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function canPlaceInColumn(
  state: Readonly<BlackberryPieGameState>,
  column: number,
) {
  if (state.ended) return false;
  if (state.canPlayAnywhere || state.lastColumn === null) return true;
  return Math.abs(state.lastColumn - column) === 1;
}

function evaluateOutcome(draft: BlackberryPieGameState) {
  const collected = draft.berries.every((berry) => berry === null);
  if (collected) {
    draft.ended = true;
    draft.won = true;
  } else if (draft.hand.length === 0 && draft.stock.length === 0) {
    draft.ended = true;
    draft.won = false;
  }
}

function scoreGame(state: Readonly<BlackberryPieGameState>) {
  const berryScore = state.queen.slice(1).reduce((sum, berry) => {
    const value = rankValue(berry);
    return sum + Math.min(value, BERRY_COUNT);
  }, 0);
  return berryScore + (state.won ? 5 : 0) + state.hand.length;
}

/**
 * How far a pile is towards a set for its berry, 0 to 3: the most cards it
 * holds of one run or one suit that could take in the berry's rank.
 */
function berryProgress(berry: PlayingCard, pile: readonly PlayingCard[]) {
  if (hasBerrySet(berry, pile)) return 3;
  const rank = rankValue(berry);
  const cards = pile.filter((card) => card.rank !== "Joker");
  let best = 0;
  for (let low = rank - 2; low <= rank; low += 1) {
    if (low < 1 || low + 2 > 13) continue;
    const ranks = new Set(
      cards
        .map((card) => rankValue(card))
        .filter((value) => value >= low && value <= low + 2),
    );
    best = Math.max(best, ranks.size);
  }
  for (const suit of ["hearts", "diamonds", "spades"] as const) {
    const ofSuit = cards.filter((card) => card.suit === suit);
    const hasRank = ofSuit.some((card) => rankValue(card) === rank);
    const others = ofSuit.filter((card) => rankValue(card) !== rank).length;
    best = Math.max(best, (hasRank ? 1 : 0) + Math.min(2, others));
  }
  return Math.min(best, 2);
}

/** What putting this card under this berry is worth. */
function placementWorth(
  state: Readonly<BlackberryPieGameState>,
  card: PlayingCard,
  column: number,
) {
  const berry = state.berries[column];
  if (!berry) return 0;
  const pile = [...state.piles[column], card];
  if (hasBerrySet(berry, pile)) return 1000 + 10 * rankValue(berry);
  return (
    100 *
    (berryProgress(berry, pile) - berryProgress(berry, state.piles[column]))
  );
}

/**
 * The hint: the card and berry that best build towards sets, weighing what
 * the card could do elsewhere and what the cards on view can play next.
 */
function findBlackberryPieHint(
  state: Readonly<BlackberryPieGameState>,
  selected: CardSource | null,
) {
  if (state.ended) return null;
  const sources: { card: PlayingCard; source: CardSource }[] = [
    ...state.hand.map((card) => ({
      card,
      source: { type: "hand" as const, cardId: card.id },
    })),
    ...state.retainers.flatMap((card) =>
      card
        ? [{ card, source: { type: "retainer" as const, cardId: card.id } }]
        : [],
    ),
  ];
  const columns = state.piles.map((_, column) => column);
  let best: { card: PlayingCard; column: number; worth: number } | null = null;
  for (const { card, source } of sources) {
    const bestElsewhere = Math.max(
      0,
      ...columns.map((column) => placementWorth(state, card, column)),
    );
    for (const column of columns) {
      if (!canPlaceInColumn(state, column)) continue;
      const gain = placementWorth(state, card, column);
      const after = {
        ...state,
        piles: state.piles.map((pile, index) =>
          index === column ? [...pile, card] : pile,
        ),
        berries:
          gain >= 1000
            ? state.berries.map((berry, index) =>
                index === column ? null : berry,
              )
            : state.berries,
      };
      const nextColumns =
        card.rank === "Joker"
          ? columns
          : [column - 1, column + 1].filter(
              (next) => next >= 0 && next < columns.length,
            );
      const followUp = Math.max(
        0,
        ...sources
          .filter((other) => other.card.id !== card.id)
          .flatMap((other) =>
            nextColumns.map((next) => placementWorth(after, other.card, next)),
          ),
      );
      const worth =
        gain +
        0.8 * followUp -
        0.3 * Math.max(0, bestElsewhere - gain) -
        (source.type === "retainer" ? 5 : 0);
      if (!best || worth > best.worth) best = { card, column, worth };
    }
  }
  if (!best) return null;
  return makeHint(
    "moveCard",
    selected?.cardId === best.card.id ? [] : cardTarget(best.card),
    zoneTarget(
      state.berries[best.column]
        ? `berry-${best.column}`
        : `pile-${best.column}`,
    ),
  );
}

export const blackberryPieRules = {
  createGame,
  isRun,
  hasBerrySet,
  canPlaceInColumn,
  scoreGame,
  findHint: findBlackberryPieHint,
};

export default function BlackberryPie() {
  const [selected, setSelected] = useState<CardSource | null>(null);
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
      // Gather every card into the stock, then deal them back out.
      setGame((draft) => gatherState(collectCards(draft)));
      await delay();
      setGame((draft) => createGame(draft.stock));
    },
    gameStateInitial: gatheredInitial,
    resetNonGameStates: () => setSelected(null),
  });

  useHint(() => findBlackberryPieHint(game, selected), {
    game,
    enabled: !isSettingUp && !game.ended && game.hand.length > 0,
  });

  function selectCard(source: CardSource) {
    if (game.ended) return;
    setSelected((current) =>
      current?.type === source.type && current.cardId === source.cardId
        ? null
        : source,
    );
  }

  function placeSelectedCard(column: number) {
    if (!selected || !canPlaceInColumn(game, column)) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      if (!canPlaceInColumn(draft, column)) return;
      const cards = selected.type === "hand" ? draft.hand : draft.retainers;
      const cardIndex = cards.findIndex((card) => card?.id === selected.cardId);
      const card = cards[cardIndex];
      if (!card) return;

      if (selected.type === "hand") {
        draft.hand.splice(cardIndex, 1);
      } else {
        draft.retainers[cardIndex] = null;
      }
      draft.piles[column].push(card);
      draft.lastColumn = column;
      draft.canPlayAnywhere = card.rank === "Joker";

      const berry = draft.berries[column];
      if (berry && hasBerrySet(berry, draft.piles[column])) {
        draft.berries[column] = null;
        draft.queen.push(berry);
      }

      drawToHand(draft);
      evaluateOutcome(draft);
    });
    setSelected(null);
  }

  const zones = useMemo<MapZone[]>(() => {
    const berryZones = game.berries.flatMap((berry, column) =>
      berry
        ? [
            {
              id: `berry-${column}`,
              name: "berry",
              pileIndex: column,
              cards: [berry],
              col: column,
              row: 0,
              baseZIndex: 1,
            },
          ]
        : [],
    );
    const pileZones = game.piles.flatMap((pile, column) =>
      pile.length > 0
        ? [
            {
              id: `pile-${column}`,
              name: "pile",
              pileIndex: column,
              cards: pile,
              col: column,
              row: 0.6,
              fan: {
                direction: "down",
                offset: zoneFanOffset(
                  pile.length,
                  3,
                  0.1,
                  cardDims.tableauOffset,
                ),
              },
              baseZIndex: 20,
            },
          ]
        : [],
    );
    return [
      {
        id: "queen",
        cards: game.queen,
        col: 0,
        row: BOTTOM_ROW,
        fan: { maxVisible: 3 },
        baseZIndex: 30,
      },
      {
        id: "retainer-left",
        name: "retainer",
        pileIndex: 0,
        cards: game.retainers[0] ? [game.retainers[0]] : [],
        col: 1.7,
        row: BOTTOM_ROW,
      },
      {
        id: "retainer-right",
        name: "retainer",
        pileIndex: 1,
        cards: game.retainers[1] ? [game.retainers[1]] : [],
        col: 2.8,
        row: BOTTOM_ROW,
      },
      ...berryZones,
      ...pileZones,
      {
        id: "stock",
        cards: game.stock,
        col: 9,
        row: BOTTOM_ROW,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "left" },
      },
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 4.5,
        row: BOTTOM_ROW,
        width: 4,
        fan: { direction: "right", offset: 1.2, center: true },
        baseZIndex: 20,
      },
    ];
  }, [game]);

  const cardMapper = (mappedCard: MappedCard): AnimatedCardMapping => {
    if (mappedCard.zoneName === "berry" && mappedCard.pileIndex !== undefined) {
      const canPlace = canPlaceInColumn(game, mappedCard.pileIndex);
      const lastColumn = game.lastColumn === mappedCard.pileIndex;

      return {
        isDisabled: !selected || !canPlace,
        forceOverlayColor: canPlace || lastColumn,
        selectColor: lastColumn ? "blue" : "purple",
        yOffset: lastColumn ? -0.2 : canPlace ? -0.1 : 0,
        onPress: () => placeSelectedCard(mappedCard.pileIndex!),
      };
    } else if (mappedCard.zoneName === "hand") {
      const cardId = mappedCard.card.id;
      return {
        isDisabled: game.ended,
        isSelected: selected?.type === "hand" && selected.cardId === cardId,
        selectColor: "purple",
        onPress: () => selectCard({ type: "hand", cardId }),
      };
    } else if (
      mappedCard.zoneName === "retainer" &&
      mappedCard.pileIndex !== undefined
    ) {
      const cardId = mappedCard.card.id;

      return {
        isDisabled: game.ended,
        isSelected: selected?.type === "retainer" && selected.cardId === cardId,
        selectColor: "purple",
        onPress: () => selectCard({ type: "retainer", cardId }),
      };
    } else if (
      mappedCard.zoneName === "pile" &&
      mappedCard.pileIndex !== undefined
    ) {
      const canPlace = canPlaceInColumn(game, mappedCard.pileIndex);

      return {
        isDisabled: !selected || !canPlace,
        onPress: () => placeSelectedCard(mappedCard.pileIndex!),
        forceOverlayColor: true,
        selectColor: !canPlace ? "none" : "lightPurple",
      };
    }

    return { isDisabled: true };
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    fixedCols: 10,
    fixedRows: 4.6,
    gap: 0.08,
    cardSize,
  });

  const collectedCount = game.queen.length - 1;
  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={scoreGame(game)}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      showDeviceRotateHint="landscape"
      winLoseMessage={
        game.won
          ? i18n.t("games:blackberryPie.thePieIsReadyYou", { BERRY_COUNT })
          : i18n.t("games:blackberryPie.youCollectedOfBerries", {
              collectedCount,
              BERRY_COUNT,
            })
      }
    >
      {cardMap}
    </GameWrapper>
  );
}
