import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { i18n } from "@/i18n";
import { flexStyles } from "@/styles/flexStyles";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  rankValue,
  redealWith,
  shuffle,
  top,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { NEW_DECK_SIZE, solveNewDeck } from "./new-deck-solver";

// New Deck (an original game): the shuffled deck, dealt face up, is put back
// in the order it came out of the box. A card goes into its place in the new
// deck by itself once a neighbour of it is there; otherwise it starts a run,
// and only a few runs can be open at once. Every deal is checked winnable,
// and par is the shortest win the solver found.
const COLUMN_COUNT = 8;
const MAX_RUNS = 5;
/** New-deck order: a fresh pack's suits, each Ace to King. */
const DECK_SUITS: CardSuit[] = ["spades", "hearts", "diamonds", "clubs"];
const RANKS_PER_SUIT = 13;
const DECK_COL = 0.5;
/** Each place in the new deck overlaps the one before it, showing its index. */
const SPOT_STEP = 0.5;
const STATUS_ROW = 4.1;
const TABLEAU_ROW = 4.75;
/** Rows a column's fan may use below its first card. */
const TABLEAU_ROOM = 3.8;
const MAX_FAN_OFFSET = 0.42;
const DEAL_ATTEMPTS = 12;

export type NewDeckGameState = {
  /** Face down, while the cards are gathered between deals. */
  pack: PlayingCard[];
  /** Each column's last card is at its foot, the only one that can move. */
  columns: PlayingCard[][];
  /** The new deck's 52 places, in order. */
  deck: (PlayingCard | null)[];
  moves: number;
  /** The shortest win the solver found for this deal, in moves. */
  par: number | null;
};

// ========== Rules ========== //
/** A card's place in the new deck: 0 for the Ace of spades, 51 for the King of clubs. */
function deckIndex(card: PlayingCard) {
  return DECK_SUITS.indexOf(card.suit) * RANKS_PER_SUIT + rankValue(card) - 1;
}

function countRuns(state: NewDeckGameState) {
  return state.deck.filter(
    (card, index) => card !== null && (index === 0 || !state.deck[index - 1]),
  ).length;
}

function canStartRun(state: NewDeckGameState) {
  return countRuns(state) < MAX_RUNS;
}

/** Whether the card just before or after this one is in the new deck. */
function touchesDeck(state: NewDeckGameState, card: PlayingCard) {
  const index = deckIndex(card);
  return !!state.deck[index - 1] || !!state.deck[index + 1];
}

/** Puts every foot card that touches the new deck into it, one after another. */
function settle(state: NewDeckGameState) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const column of state.columns) {
      const card = top(column);
      if (card && touchesDeck(state, card)) {
        column.pop();
        state.deck[deckIndex(card)] = card;
        changed = true;
      }
    }
  }
}

export type NewDeckTargets = { deck: boolean; columns: number[] };

/** Where the foot card of a column can go. */
function targetsFor(state: NewDeckGameState, from: number): NewDeckTargets {
  const column = state.columns[from];
  const card = top(column);
  if (!card) return { deck: false, columns: [] };
  const columns: number[] = [];
  state.columns.forEach((target, to) => {
    if (to === from) return;
    const targetCard = top(target);
    if (targetCard) {
      if (deckIndex(targetCard) === deckIndex(card) + 1) columns.push(to);
    } else if (column.length > 1) {
      // A lone card gains nothing from moving to another empty column.
      columns.push(to);
    }
  });
  return { deck: canStartRun(state), columns };
}

/** Moves a column's foot card into the new deck, or onto another column. */
function moveCard(
  state: NewDeckGameState,
  from: number,
  to: number | "deck",
): boolean {
  const targets = targetsFor(state, from);
  if (to === "deck" ? !targets.deck : !targets.columns.includes(to)) {
    return false;
  }
  const card = state.columns[from].pop()!;
  if (to === "deck") state.deck[deckIndex(card)] = card;
  else state.columns[to].push(card);
  state.moves += 1;
  settle(state);
  return true;
}

function isWon(state: NewDeckGameState) {
  return state.deck.every((card) => card !== null);
}

function isLost(state: NewDeckGameState) {
  if (isWon(state) || state.pack.length > 0) return false;
  return !state.columns.some((_, from) => {
    const targets = targetsFor(state, from);
    return targets.deck || targets.columns.length > 0;
  });
}

// ========== Deal ========== //
function emptyState(pack: PlayingCard[]): NewDeckGameState {
  return {
    pack,
    columns: Array.from({ length: COLUMN_COUNT }, () => []),
    deck: Array.from({ length: NEW_DECK_SIZE }, () => null),
    moves: 0,
    par: null,
  };
}

/** A shuffled deal the solver can win, with its par. */
function createDeal(): NewDeckGameState {
  let state = emptyState([]);
  for (let attempt = 0; attempt < DEAL_ATTEMPTS; attempt += 1) {
    state = emptyState([]);
    shuffle(createDeck({ faceUp: true })).forEach((card, index) => {
      state.columns[index % COLUMN_COUNT].push(card);
    });
    const { moves } = solveNewDeck(
      state.columns.map((column) => column.map(deckIndex)),
      MAX_RUNS,
    );
    if (moves !== null) {
      state.par = moves;
      break;
    }
  }
  return state;
}

function gatherState(state: NewDeckGameState): NewDeckGameState {
  return emptyState(shuffle(flipAllToBack(collectCards(state))));
}

const gameStateInitial = emptyState(createDeck());

export const newDeckRules = {
  deckIndex,
  countRuns,
  canStartRun,
  touchesDeck,
  settle,
  targetsFor,
  moveCard,
  isWon,
  isLost,
  createDeal,
  MAX_RUNS,
};

// ========== Component ========== //
export default function NewDeck() {
  const { colorPale } = useGameColors();
  const [selected, setSelected] = useState<number | null>(null);

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<NewDeckGameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      // Gather every card into the pack, then deal the same cards afresh.
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) => redealWith(createDeal(), draft.pack));
    },
    resetNonGameStates: () => setSelected(null),
  });

  const won = isWon(game);
  const lost = isLost(game);
  const ended = won || lost;
  const busy = ended || isSettingUp;
  const runs = countRuns(game);

  const selectedCard =
    selected === null ? undefined : top(game.columns[selected]);
  const targets = useMemo(
    () =>
      selected === null
        ? { deck: false, columns: [] }
        : targetsFor(game, selected),
    [game, selected],
  );

  function move(to: number | "deck") {
    if (busy || selected === null) return;
    if (to === "deck" ? !targets.deck : !targets.columns.includes(to)) return;
    const from = selected;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      moveCard(draft, from, to);
    });
    setSelected(null);
  }

  function onColumnPress(index: number) {
    if (busy) return;
    if (selected !== null && targets.columns.includes(index)) {
      move(index);
      return;
    }
    if (!top(game.columns[index])) return;
    setSelected(selected === index ? null : index);
  }

  const zones: MapZone[] = useMemo(() => {
    const rowZones: MapZone[] = DECK_SUITS.map((suit, i) => ({
      id: `row-${suit}`,
      name: "row",
      pileIndex: i,
      cards: [],
      col: DECK_COL,
      row: i,
      width: SPOT_STEP * (RANKS_PER_SUIT - 1) + 1,
      height: 1,
      baseZIndex: 1,
      // Each row shows its suit, faintly, until its cards cover it.
      placeholder: { hideShadow: true, iconName: suit, iconSize: 0.5 },
    }));
    const spotZones: MapZone[] = game.deck.map((card, index) => ({
      id: `spot-${index}`,
      name: "spot",
      pileIndex: index,
      cards: card ? [card] : [],
      col: DECK_COL + SPOT_STEP * (index % RANKS_PER_SUIT),
      row: Math.floor(index / RANKS_PER_SUIT),
      baseZIndex: 10 + (index % RANKS_PER_SUIT) * 2,
      clickThroughCards: true,
    }));
    const columnZones: MapZone[] = game.columns.map((cards, i) => ({
      id: `column-${i}`,
      name: "column",
      pileIndex: i,
      cards,
      col: i,
      row: TABLEAU_ROW,
      baseZIndex: 60,
      // Long columns close up to stay on the board.
      fan: {
        direction: "down",
        offset:
          cards.length > 1
            ? Math.min(MAX_FAN_OFFSET, TABLEAU_ROOM / (cards.length - 1))
            : MAX_FAN_OFFSET,
      },
      placeholder: {},
    }));
    return [
      ...rowZones,
      ...spotZones,
      {
        id: "status",
        col: 0,
        row: STATUS_ROW,
        width: COLUMN_COUNT,
        height: 0.5,
      },
      ...columnZones,
      {
        id: "pack",
        name: "pack",
        cards: game.pack,
        col: (COLUMN_COUNT - 1) / 2,
        row: 1.5,
        baseZIndex: 200,
        fan: { maxVisible: 3 },
      },
    ];
  }, [game.columns, game.deck, game.pack]);

  const cardMapper = (mapped: MappedCard): AnimatedCardMapping | undefined => {
    const index = mapped.pileIndex;
    if (mapped.zoneName !== "column" || index === undefined) {
      return { isDisabled: true };
    }
    const isSelected = selected === index && mapped.topOfZone;
    const isTarget = targets.columns.includes(index) && mapped.topOfZone;
    return {
      onPress: () => onColumnPress(index),
      isDisabled:
        busy || (!mapped.topOfZone && !targets.columns.includes(index)),
      isSelected,
      selectColor: isSelected ? "blue" : isTarget ? "green" : "none",
      forceOverlayColor: isTarget,
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    const index = zone.pileIndex;
    if (index === undefined) return;
    if (zone.name === "row") {
      const isTarget =
        targets.deck &&
        !!selectedCard &&
        DECK_SUITS[index] === selectedCard.suit;
      return {
        onPress: () => move("deck"),
        isDisabled: busy || !isTarget,
        selectColor: isTarget ? "green" : "none",
      };
    }
    if (zone.name === "column") {
      const isTarget = targets.columns.includes(index);
      return {
        onPress: () => onColumnPress(index),
        isDisabled: busy || !isTarget,
        selectColor: isTarget ? "green" : "none",
      };
    }
    return;
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedCols: COLUMN_COUNT,
    fixedRows: TABLEAU_ROW + 1 + TABLEAU_ROOM,
  });

  const score = won && game.par !== null ? game.moves - game.par : undefined;

  return (
    <GameWrapper
      outcome={won ? "won" : lost ? "lost" : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={score}
      hideScore
      canUndo={canUndo}
      undo={() => {
        setSelected(null);
        undo();
      }}
      winLoseMessage={
        won
          ? game.par === null
            ? i18n.t("games:newDeck.won", { moves: game.moves })
            : i18n.t("games:newDeck.wonWithPar", {
                moves: game.moves,
                par: game.par,
              })
          : i18n.t("cards:noLegalMovesRemain")
      }
    >
      {cardMap}

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("status"),
          flexStyles.rowCentered,
        ]}
      >
        {[
          i18n.t("games:newDeck.runs", { value: runs, max: MAX_RUNS }),
          i18n.t("games:newDeck.moves", { value: game.moves }),
          game.par === null
            ? null
            : i18n.t("games:newDeck.par", { value: game.par }),
        ]
          .filter((line): line is string => line !== null)
          .map((line) => (
            <Text
              key={line}
              size="xs"
              weight={500}
              color={colorPale}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={{ flex: 1, textAlign: "center" }}
            >
              {line}
            </Text>
          ))}
      </View>
    </GameWrapper>
  );
}
