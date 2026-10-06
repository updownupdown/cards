import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
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
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import {
  cardTarget,
  makeHint,
  pressHint,
  withNote,
  zoneTarget,
} from "@/hints/hint";
const MAX_COLUMNS = 12;
const HAND_SIZE_BY_DIFFICULTY = {
  easy: 5,
  hard: 4,
} as const;

export type GremlinDifficulty = keyof typeof HAND_SIZE_BY_DIFFICULTY;

export function getGremlinHandSize(difficulty: GremlinDifficulty) {
  return HAND_SIZE_BY_DIFFICULTY[difficulty];
}

type GameState = {
  hand: (PlayingCard | null)[];
  columns: (PlayingCard[] | null)[];
  deck: PlayingCard[];
  discard: PlayingCard[];
  currentHelperCard: PlayingCard | null;
  awaitingHelperPlacement: boolean;
  selectedHandCardId: string | null;
  playerTurnEnded: boolean;
  ended: boolean;
  won: boolean;
  winLoseMessage?: string;
};

export type GremlinGameState = GameState;

const WIN_TIER_NAMES = {
  novice: "games:gremlin.tierNovice",
  normal: "games:gremlin.tierNormal",
  advanced: "games:gremlin.tierAdvanced",
  legendary: "games:gremlin.tierLegendary",
  epic: "games:gremlin.tierEpic",
} as const;

function getWinTier(columnCount: number): keyof typeof WIN_TIER_NAMES | null {
  switch (columnCount) {
    case 12:
      return "novice";
    case 11:
      return "normal";
    case 10:
      return "advanced";
    case 9:
      return "legendary";
    default:
      return "epic";
  }
}

function canPlayCard(
  card: PlayingCard,
  columns: (PlayingCard[] | null)[],
): number[] {
  const validColumns: number[] = [];

  for (let i = 0; i < columns.length; i += 1) {
    const column = columns[i];

    // Column is empty
    if (column === null) {
      validColumns.push(i);
      continue;
    }

    // Column can fit card
    const lastCard = top(column);
    if (
      lastCard &&
      lastCard.suit === card.suit &&
      rankValue(lastCard) > rankValue(card)
    ) {
      validColumns.push(i);
    }
  }

  return validColumns;
}

function allCardsPlaced(state: GameState) {
  return (
    state.hand.every((card) => card === null) &&
    state.deck.length === 0 &&
    state.discard.length === 0 &&
    state.currentHelperCard === null
  );
}

function usedColumnCount(columns: (PlayingCard[] | null)[]) {
  return columns.filter((column) => column !== null && column.length > 0)
    .length;
}

function finishCompletedGame(draft: GameState) {
  const columnCount = usedColumnCount(draft.columns);
  const tier = getWinTier(columnCount);

  draft.ended = true;
  draft.won = tier !== null;
  draft.playerTurnEnded = false;
  draft.awaitingHelperPlacement = false;
  draft.selectedHandCardId = null;
  draft.currentHelperCard = null;

  if (tier) {
    draft.winLoseMessage = i18n.t("games:gremlin.columnsUsedWin", {
      count: columnCount,
      tier: i18n.t(WIN_TIER_NAMES[tier]),
    });
  } else {
    draft.winLoseMessage = i18n.t("games:gremlin.allCardsPlayedInColumns", {
      count: columnCount,
    });
  }
}

// —— Hints ——

/**
 * The columns the game will end with, as things stand: those in use, one
 * for each King still to come (a King only ever starts one), and one for
 * each suit with cards that no column of theirs could take (a column the
 * highest of them starts takes the rest, if they come in order).
 */
function expectedColumns(columns: (PlayingCard[] | null)[]) {
  // By suit and rank: every deck has its own card ids.
  const key = (card: PlayingCard) => `${card.suit}-${card.rank}`;
  const placed = new Set(columns.flatMap((column) => column ?? []).map(key));
  const tops = columns.flatMap((column) =>
    column && column.length > 0 ? [top(column)!] : [],
  );
  let total = usedColumnCount(columns);
  const homeless = new Map<string, number>();
  for (const card of createDeck()) {
    if (placed.has(key(card))) continue;
    if (card.rank === "K") {
      total += 1;
      continue;
    }
    const home = tops.some(
      (t) => t.suit === card.suit && rankValue(t) > rankValue(card),
    );
    if (!home) homeless.set(card.suit, (homeless.get(card.suit) ?? 0) + 1);
  }
  homeless.forEach((count) => {
    total += 1 + 0.05 * count;
  });
  return total;
}

/**
 * What the gremlin's next card costs on average, placed as well as it can
 * be: it's any card not yet seen in a column or the hand.
 */
function helperRisk(
  columns: (PlayingCard[] | null)[],
  unseen: PlayingCard[],
): number {
  if (unseen.length === 0) return 0;
  return (
    unseen.reduce(
      (sum, card) => sum + (bestFit(card, columns)?.cost ?? 12),
      0,
    ) / unseen.length
  );
}

/** Where a card does least harm, and how many columns that costs. */
function bestFit(card: PlayingCard, columns: (PlayingCard[] | null)[]) {
  let best: { column: number; cost: number } | null = null;
  const before = expectedColumns(columns);
  for (const column of canPlayCard(card, columns)) {
    // Empty columns are all alike: try the first.
    if (!columns[column]?.length && best && !columns[best.column]?.length) {
      continue;
    }
    const next = columns.map((pile, index) =>
      index === column ? [...(pile ?? []), card] : pile,
    );
    const cost = expectedColumns(next) - before;
    if (!best || cost < best.cost) best = { column, cost };
  }
  return best;
}

function findGremlinHint(state: GameState) {
  if (state.ended) return null;
  if (state.awaitingHelperPlacement && state.currentHelperCard) {
    const fit = bestFit(state.currentHelperCard, state.columns);
    return fit
      ? withNote(
          makeHint("moveCard", zoneTarget(`column-${fit.column}`)),
          i18n.t("games:gremlin.hint.helper"),
        )
      : null;
  }
  if (state.playerTurnEnded || state.currentHelperCard) return null;

  const hand = state.hand.filter((card): card is PlayingCard => !!card);
  const unseen = [...state.deck, ...state.discard];
  // A move also changes what the gremlin's next card will cost.
  const risk = helperRisk(state.columns, unseen);
  const fits = hand.map((card) => {
    const fit = bestFit(card, state.columns);
    if (!fit) return { card, fit };
    const next = state.columns.map((pile, index) =>
      index === fit.column ? [...(pile ?? []), card] : pile,
    );
    return {
      card,
      fit: {
        ...fit,
        cost: fit.cost + helperRisk(next, unseen) - risk,
      },
    };
  });
  const select = (card: PlayingCard) =>
    state.selectedHandCardId === card.id ? [] : cardTarget(card);

  // A card that costs no column, Kings (which only ever start one)
  // included. Any other card is better discarded, to come round again,
  // than held: a full hand draws nothing new.
  const play = fits
    .filter(({ fit }) => fit && fit.cost <= 0)
    .sort((a, b) => a.fit!.cost - b.fit!.cost)[0];
  if (play?.fit) {
    const hint = makeHint(
      "moveCard",
      select(play.card),
      zoneTarget(`column-${play.fit.column}`),
    );
    return play.card.rank === "K" && !state.columns[play.fit.column]?.length
      ? withNote(hint, i18n.t("games:gremlin.hint.king"))
      : hint;
  }

  const discard = fits.sort(
    (a, b) => (b.fit?.cost ?? 99) - (a.fit?.cost ?? 99),
  )[0];
  if (discard) {
    return withNote(
      makeHint(
        { key: "press", values: { label: i18n.t("cards:discard") } },
        select(discard.card),
        zoneTarget("actions"),
      ),
      i18n.t("games:gremlin.hint.discard"),
    );
  }
  return pressHint("actions", i18n.t("games:gremlin.endTurn"));
}

export const gremlinRules = {
  findHint: findGremlinHint,
  bestFit,
  getWinTier,
  canPlayCard,
  allCardsPlaced,
  usedColumnCount,
  finishCompletedGame,
  maxColumns: MAX_COLUMNS,
  handSize: getGremlinHandSize("easy"),
  getHandSize: getGremlinHandSize,
};

function recycleDiscardIntoDeck(draft: GameState) {
  if (draft.deck.length > 0 || draft.discard.length === 0) return;

  draft.deck = shuffle(flipAllToBack(draft.discard));
  draft.discard = [];
}

function drawFromDeck(draft: GameState): PlayingCard | null {
  recycleDiscardIntoDeck(draft);
  return draft.deck.pop() ?? null;
}

function refillPlayerHand(draft: GameState, handSize: number) {
  for (let i = 0; i < handSize; i += 1) {
    const hasCard = !!draft.hand[i];
    if (hasCard) continue;

    const next = drawFromDeck(draft);
    if (!next) break;

    draft.hand[i] = flipToFace(next);
  }
}

const gameStateInitial: GameState = {
  hand: [],
  columns: Array.from({ length: MAX_COLUMNS }, () => null),
  deck: createDeck(),
  discard: [],
  currentHelperCard: null,
  awaitingHelperPlacement: false,
  ended: false,
  won: false,
  playerTurnEnded: false,
  selectedHandCardId: null,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
  handSize: number,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.hand.filter((c): c is PlayingCard => c !== null),
      ...draft.columns
        .filter((col): col is PlayingCard[] => col !== null)
        .flat(),
      ...draft.discard,
      ...draft.deck,
      ...(draft.currentHelperCard ? [draft.currentHelperCard] : []),
    ];

    draft.deck = shuffle(flipAllToBack(allCards));
    draft.discard = [];
    draft.hand = [];
    draft.columns = Array.from({ length: MAX_COLUMNS }, () => null);
    draft.currentHelperCard = null;
    draft.awaitingHelperPlacement = false;
    draft.ended = false;
    draft.won = false;
    draft.playerTurnEnded = false;
    draft.selectedHandCardId = null;
  });

  await delay();

  setGame((draft) => {
    while (draft.hand.length < handSize) {
      const next = draft.deck.pop();
      if (!next) break;

      draft.hand.push(flipToFace(next));
    }
  });
}

export default function Gremlin() {
  const { spacing } = useResponsiveMetrics();
  const difficulty = useGameSettingValue("gremlinDifficulty");
  const handSize = getGremlinHandSize(difficulty);

  const { game, setGame, reset, isLoaded, canUndo, undo, saveUndoState } =
    useStateManager({
      gameStateInitial,
      resetAndSetup: async () => {
        await resetAndSetup(setGame, handSize);
      },
    });

  const selectedHandCard = useMemo(
    () =>
      game.selectedHandCardId
        ? (game.hand.find(
            (card) => card && card.id === game.selectedHandCardId,
          ) ?? null)
        : null,
    [game.hand, game.selectedHandCardId],
  );

  const canDiscard =
    !game.ended &&
    !game.playerTurnEnded &&
    !game.awaitingHelperPlacement &&
    !!selectedHandCard;

  const { validPlacementTargets } = useMemo(() => {
    const placementCard = game.awaitingHelperPlacement
      ? game.currentHelperCard
      : selectedHandCard;

    return {
      activePlacementCard: placementCard,
      validPlacementTargets: placementCard
        ? canPlayCard(placementCard, game.columns)
        : [],
    };
  }, [
    game.awaitingHelperPlacement,
    game.columns,
    game.currentHelperCard,
    selectedHandCard,
  ]);

  // Refill the player hand when a turn starts (including after Helper placement).
  useEffect(() => {
    if (
      game.ended ||
      game.playerTurnEnded ||
      game.awaitingHelperPlacement ||
      game.currentHelperCard
    ) {
      return;
    }

    setGame((draft) => {
      refillPlayerHand(draft, handSize);
    });
  }, [
    game.awaitingHelperPlacement,
    game.currentHelperCard,
    game.ended,
    game.playerTurnEnded,
    handSize,
    setGame,
  ]);

  // Helper turn: draw one card, then the player chooses where it goes.
  useEffect(() => {
    if (
      game.ended ||
      !game.playerTurnEnded ||
      game.awaitingHelperPlacement ||
      game.currentHelperCard
    ) {
      return;
    }

    setGame((draft) => {
      const helperCard = drawFromDeck(draft);

      if (!helperCard) {
        draft.playerTurnEnded = false;

        if (allCardsPlaced(draft)) {
          finishCompletedGame(draft);
        }

        return;
      }

      const validColumns = canPlayCard(helperCard, draft.columns);
      draft.currentHelperCard = flipToFace(helperCard);

      // As in The Bogey: you lose when a card can't be placed and all
      // 12 columns are already in use.
      if (
        validColumns.length === 0 &&
        usedColumnCount(draft.columns) >= MAX_COLUMNS
      ) {
        draft.awaitingHelperPlacement = false;
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = i18n.t("games:gremlin.noRoomForHelper", {
          count: MAX_COLUMNS,
        });
        return;
      }

      draft.awaitingHelperPlacement = true;
    });
  }, [
    game.awaitingHelperPlacement,
    game.currentHelperCard,
    game.ended,
    game.playerTurnEnded,
    setGame,
  ]);

  useHint(() => findGremlinHint(game), { game });

  function handleSelectHandCard(cardId: string) {
    if (game.ended || game.playerTurnEnded || game.awaitingHelperPlacement) {
      return;
    }

    setGame((draft) => {
      draft.selectedHandCardId =
        draft.selectedHandCardId === cardId ? null : cardId;
    });
  }

  function handleColumnSelection(columnIdx: number) {
    if (game.ended) return;

    const isHelperPlacement =
      game.awaitingHelperPlacement && !!game.currentHelperCard;
    const sourceCard = isHelperPlacement
      ? game.currentHelperCard
      : selectedHandCard;

    if (!sourceCard) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const playableCard = isHelperPlacement
        ? draft.currentHelperCard
        : draft.hand.find(
            (card) => card && card.id === draft.selectedHandCardId,
          );

      if (!playableCard) return;

      draft.columns[columnIdx]?.push(playableCard) ||
        (draft.columns[columnIdx] = [playableCard]);

      if (isHelperPlacement) {
        draft.currentHelperCard = null;
        draft.awaitingHelperPlacement = false;
        draft.playerTurnEnded = false;
      } else {
        draft.hand = draft.hand.map((card) =>
          card && card.id === playableCard.id ? null : card,
        );
        draft.selectedHandCardId = null;
      }

      if (allCardsPlaced(draft)) {
        finishCompletedGame(draft);
      }
    });
  }

  function handleDiscardSelectedCard() {
    if (
      game.ended ||
      game.playerTurnEnded ||
      game.awaitingHelperPlacement ||
      !selectedHandCard
    ) {
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const selected = draft.hand.find(
        (card) => card && card.id === draft.selectedHandCardId,
      );
      if (!selected) return;

      draft.hand = draft.hand.map((card) =>
        card && card.id === selected.id ? null : card,
      );
      draft.discard.push(flipToBack(selected));
      draft.selectedHandCardId = null;
    });
  }

  function handleEndTurn() {
    if (game.ended || game.playerTurnEnded || game.awaitingHelperPlacement) {
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      draft.playerTurnEnded = true;
      draft.selectedHandCardId = null;
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const columnZones: MapZone[] = Array.from(
      { length: MAX_COLUMNS },
      (_, idx) => ({
        id: `column-${idx}`,
        name: "column",
        pileIndex: idx,
        cards: game.columns[idx] ?? [],
        col: idx % 6,
        row: 1.1 + Math.floor(idx / 6) * 1.5,
        height: 1.5,
        baseZIndex: 1,
        fan: {
          direction: "down",
          offset: 0.1,
          maxVisible: 6,
          center: false,
        },
        placeholder: {},
      }),
    );

    const handZones: MapZone[] = Array.from({ length: handSize }).map(
      (_, idx) => {
        const card = game.hand[idx];
        return {
          id: `hand-${card?.id ?? idx}`,
          name: "hand",
          refIndex: idx,
          cards: card ? [card] : [],
          col: 0.5 + idx * 1,
          row: 5.2,
          baseZIndex: 30,
          placeholder: {},
        };
      },
    );

    return [
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: i18n.t("cards:stock"), infoPos: "right" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 5,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: i18n.t("cards:discard"), infoPos: "left" },
      },
      {
        id: "helper",
        name: "helper",
        cards: game.currentHelperCard ? [game.currentHelperCard] : [],
        col: 2.5,
        row: 0,
        baseZIndex: 50,
        placeholder: {
          text: i18n.t("games:gremlin.helper"),
          infoPos: "left",
          showCount: false,
        },
      },
      ...columnZones,
      ...handZones,
      {
        id: "actions",
        col: 0,
        row: 4.3,
        width: "full",
        height: 0.7,
        baseZIndex: 1,
      },
    ];
  }, [
    game.columns,
    game.currentHelperCard,
    game.deck,
    game.discard,
    game.hand,
    handSize,
  ]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand") {
      const isSelected = mappedCard.card.id === game.selectedHandCardId;

      return {
        onPress: () => handleSelectHandCard(mappedCard.card.id),
        isDisabled:
          game.ended || game.playerTurnEnded || game.awaitingHelperPlacement,
        selectColor: game.awaitingHelperPlacement
          ? "lightGrey"
          : isSelected
            ? "blue"
            : "none",
        isSelected,
        forceSelectColor: isSelected,
        forceOverlayColor: game.awaitingHelperPlacement,
      };
    } else if (
      mappedCard.zoneName === "column" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isTopCard = mappedCard.topOfZone;
      const isValidTarget = validPlacementTargets.includes(
        mappedCard.pileIndex,
      );

      return {
        onPress: () => {
          if (isTopCard) {
            handleColumnSelection(mappedCard.pileIndex!);
          }
        },
        isDisabled: !isTopCard || !isValidTarget,
        selectColor: isValidTarget && isTopCard ? "green" : "none",
        forceOverlayColor: isValidTarget && isTopCard,
      };
    } else if (mappedCard.zoneName === "helper") {
      return {
        isSelected: true,
        selectColor: "purple",
      };
    }

    return {};
  };

  const zoneMapper = (zone: MapZone) => {
    if (zone.name === "column") {
      const isValid =
        zone.pileIndex === undefined ||
        validPlacementTargets.includes(zone.pileIndex);

      return {
        onPress: () => handleColumnSelection(zone.pileIndex!),
        isDisabled: !isValid,
      };
    }

    return;
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: 0.2,
    cardSize: "small",
    cardMapper,
    zoneMapper,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("actions"),
          flexStyles.rowCentered,
          { gap: spacing(12) },
        ]}
      >
        <Button
          text={i18n.t("cards:discard")}
          theme="orange"
          onPress={handleDiscardSelectedCard}
          disabled={!canDiscard}
          halfTaller
        />
        <Button
          text={i18n.t("games:gremlin.endTurn")}
          theme="blue"
          onPress={handleEndTurn}
          disabled={
            game.ended || game.playerTurnEnded || game.awaitingHelperPlacement
          }
          style={{ flex: 1 }}
          halfTaller
        />
      </View>
    </GameWrapper>
  );
}
