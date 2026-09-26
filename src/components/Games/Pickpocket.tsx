import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  flipToFace,
  redealWith,
  shuffle,
  type CardRank,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { Icon } from "@/icons";

// A logic grid in cards (Voltorb Flip): 25 face-down cards, with each
// row's and column's coin total and court count shown beside it. Aces, Twos
// and Threes multiply the purse; a court card loses it.
const GRID = 5;
const CELLS = GRID * GRID;
const RANKS_USED: CardRank[] = ["A", "2", "3", "J", "Q", "K"];
const COURTS: CardRank[] = ["J", "Q", "K"];

// Each round picks one of its mixes; the rest of the cards are Aces. Six
// treasure cards a round, with courts rising: denser boards leave fewer lines
// without courts, so guessing pays off less than reading the hints.
type RoundMix = { courts: number; twos: number; threes: number };
const ROUNDS: RoundMix[][] = [
  [{ courts: 6, twos: 4, threes: 2 }],
  [{ courts: 7, twos: 3, threes: 3 }],
  [{ courts: 8, twos: 3, threes: 3 }],
  [{ courts: 9, twos: 3, threes: 3 }],
  [{ courts: 10, twos: 3, threes: 3 }],
];
// A fresh deal always offers this many cards that are provably not courts.
const MIN_SAFE_CELLS = 2;
const DEAL_ATTEMPTS = 200;
const WIN_SCORE = 750;

const TIERS = [
  { min: 950, key: "games:pickpocket.tierPrinceOfThieves" },
  { min: 850, key: "games:pickpocket.tierCutpurse" },
  { min: WIN_SCORE, key: "games:pickpocket.tierLightFingers" },
] as const;

// Rows first, then columns.
const LINES: number[][] = [
  ...Array.from({ length: GRID }, (_, r) =>
    Array.from({ length: GRID }, (_, c) => r * GRID + c),
  ),
  ...Array.from({ length: GRID }, (_, c) =>
    Array.from({ length: GRID }, (_, r) => r * GRID + c),
  ),
];

type RoundEnd = "clean" | "walked" | "caught";
type LineHint = { coins: number; courts: number };

export type PickpocketGameState = {
  round: number;
  /** 25 cards, row by row. Empty while the cards are gathered. */
  grid: PlayingCard[];
  deck: PlayingCard[];
  /** Cards turned up by the end of the round rather than by the player. */
  shown: boolean[];
  purse: number;
  /** The purse kept from each finished round (0 when caught). */
  banked: number[];
  roundEnd: RoundEnd | null;
  caughtAt: number | null;
};

// ========== Rules ========== //
const COIN_VALUES: Partial<Record<CardRank, number>> = { A: 1, "2": 2, "3": 3 };

/** Aces 1, Twos 2, Threes 3; court cards are 0. */
function cardValue(card: PlayingCard) {
  return COIN_VALUES[card.rank] ?? 0;
}

function hintsOf(grid: PlayingCard[]): LineHint[] {
  return LINES.map((cells) => ({
    coins: cells.reduce((sum, i) => sum + cardValue(grid[i]), 0),
    courts: cells.filter((i) => cardValue(grid[i]) === 0).length,
  }));
}

function treasureLeft(grid: PlayingCard[]) {
  return grid.filter((card) => !card.faceUp && cardValue(card) >= 2).length;
}

/**
 * Face-down cards that are not a court in any arrangement matching the hints
 * and the face-up cards.
 */
function safeCells(grid: PlayingCard[]) {
  const hints = hintsOf(grid);
  const rowOptions = Array.from({ length: GRID }, (_, r) => {
    const options: number[][] = [];
    const values: number[] = [];
    const build = (c: number, coins: number, courts: number) => {
      const { coins: wantCoins, courts: wantCourts } = hints[r];
      if (coins > wantCoins || courts > wantCourts) return;
      if (c === GRID) {
        if (coins === wantCoins && courts === wantCourts) {
          options.push([...values]);
        }
        return;
      }
      const card = grid[r * GRID + c];
      for (const v of card.faceUp ? [cardValue(card)] : [0, 1, 2, 3]) {
        values[c] = v;
        build(c + 1, coins + v, courts + (v === 0 ? 1 : 0));
      }
    };
    build(0, 0, 0);
    return options;
  });

  const courtPossible = new Array(CELLS).fill(false);
  const colCoins = new Array(GRID).fill(0);
  const colCourts = new Array(GRID).fill(0);
  const chosen: number[][] = [];
  const place = (r: number) => {
    if (r === GRID) {
      chosen.forEach((row, rr) =>
        row.forEach((v, c) => {
          if (v === 0) courtPossible[rr * GRID + c] = true;
        }),
      );
      return;
    }
    const rowsLeft = GRID - r - 1;
    for (const row of rowOptions[r]) {
      // Every column must still be able to reach its hint.
      const fits = row.every((v, c) => {
        const { coins, courts } = hints[GRID + c];
        const courtsLeft = courts - colCourts[c] - (v === 0 ? 1 : 0);
        const coinsLeft = coins - colCoins[c] - v;
        const coinCards = rowsLeft - courtsLeft;
        return (
          courtsLeft >= 0 &&
          coinCards >= 0 &&
          coinsLeft >= coinCards &&
          coinsLeft <= coinCards * 3
        );
      });
      if (!fits) continue;
      row.forEach((v, c) => {
        colCoins[c] += v;
        colCourts[c] += v === 0 ? 1 : 0;
      });
      chosen[r] = row;
      place(r + 1);
      row.forEach((v, c) => {
        colCoins[c] -= v;
        colCourts[c] -= v === 0 ? 1 : 0;
      });
    }
  };
  place(0);

  return grid.flatMap((card, i) =>
    !card.faceUp && !courtPossible[i] ? [i] : [],
  );
}

function flipCard(state: PickpocketGameState, index: number) {
  const card = state.grid[index];
  if (!card || card.faceUp || state.roundEnd) return false;
  state.grid[index] = flipToFace(card);
  const value = cardValue(card);
  if (value === 0) {
    state.caughtAt = index;
    endRound(state, "caught");
    return true;
  }
  state.purse = state.purse === 0 ? value : state.purse * value;
  if (treasureLeft(state.grid) === 0) endRound(state, "clean");
  return true;
}

function walkAway(state: PickpocketGameState) {
  if (state.roundEnd || state.purse === 0) return false;
  endRound(state, "walked");
  return true;
}

/** Bank the purse (unless caught) and turn up the rest of the cards. */
function endRound(state: PickpocketGameState, end: RoundEnd) {
  state.roundEnd = end;
  state.banked.push(end === "caught" ? 0 : state.purse);
  state.shown = state.grid.map((card) => !card.faceUp);
  state.grid = state.grid.map(flipToFace);
}

function totalOf(state: PickpocketGameState) {
  return state.banked.reduce((sum, purse) => sum + purse, 0);
}

function isOver(state: PickpocketGameState) {
  return state.roundEnd !== null && state.round === ROUNDS.length - 1;
}

function isWon(state: PickpocketGameState) {
  return isOver(state) && totalOf(state) >= WIN_SCORE;
}

function getTier(score: number) {
  return TIERS.find((tier) => score >= tier.min);
}

// ========== Deal ========== //
// Dealt from a shoe: up to 13 Aces a round need the Aces of four decks; the
// other ranks come from two.
function createPool() {
  return [
    ...createDeck({ deckCount: 4 }).filter((card) => card.rank === "A"),
    ...createDeck({ deckCount: 2 }).filter(
      (card) => card.rank !== "A" && RANKS_USED.includes(card.rank),
    ),
  ];
}

/** The round's face-down cards, with at least two safe opening flips. */
function dealRound(round: number) {
  const mixes = ROUNDS[round];
  const mix = mixes[Math.floor(Math.random() * mixes.length)];
  let grid: PlayingCard[] = [];
  let deck: PlayingCard[] = [];

  for (let attempt = 0; attempt < DEAL_ATTEMPTS; attempt++) {
    deck = shuffle(createPool());
    const take = (ranks: CardRank[], count: number) => {
      const taken: PlayingCard[] = [];
      deck = deck.filter((card) => {
        if (taken.length < count && ranks.includes(card.rank)) {
          taken.push(card);
          return false;
        }
        return true;
      });
      return taken;
    };
    grid = shuffle([
      ...take(COURTS, mix.courts),
      ...take(["2"], mix.twos),
      ...take(["3"], mix.threes),
      ...take(["A"], CELLS - mix.courts - mix.twos - mix.threes),
    ]);
    if (safeCells(grid).length >= MIN_SAFE_CELLS) break;
  }
  return { grid, deck };
}

function createRoundState(
  round: number,
  banked: number[],
): PickpocketGameState {
  const { grid, deck } = dealRound(round);
  return {
    round,
    grid,
    deck,
    shown: grid.map(() => false),
    purse: 0,
    banked,
    roundEnd: null,
    caughtAt: null,
  };
}

function createInitialState() {
  return createRoundState(0, []);
}

function gatherState(state: PickpocketGameState): PickpocketGameState {
  return {
    ...state,
    grid: [],
    shown: [],
    deck: shuffle(flipAllToBack(collectCards(state))),
  };
}

const gameStateInitial = createInitialState();

export const pickpocketRules = {
  GRID,
  ROUNDS,
  WIN_SCORE,
  LINES,
  cardValue,
  hintsOf,
  treasureLeft,
  safeCells,
  flipCard,
  walkAway,
  totalOf,
  isOver,
  isWon,
  createPool,
  createRoundState,
  createInitialState,
};

// ========== Layout ========== //
const GAP = 0.12;
const HUD_ROW = 0;
const HUD_HEIGHT = 0.36;
const GRID_ROW = HUD_ROW + 0.55;
// Row hints sit right of the grid, column hints below it; the deck takes the
// corner between them.
const HINT_COL = GRID;
const COL_HINT_ROW = GRID_ROW + GRID;
const COL_HINT_HEIGHT = 0.5;
const STATUS_ROW = COL_HINT_ROW + COL_HINT_HEIGHT + 0.05;
const STATUS_HEIGHT = 0.4;
const BUTTON_ROW = COL_HINT_ROW + 1.1;
const BUTTON_HEIGHT = 0.45;
const DEAL_DELAY = 300;

// ========== Component ========== //
export default function Pickpocket() {
  const { colorPale, colorDark } = useGameColors();
  const [busy, setBusy] = useState(false);

  const { isLoaded, game, setGame, reset } =
    useStateManager<PickpocketGameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        // Gather every card into the deck, then deal the first round.
        setGame((draft) => gatherState(draft));
        await delay();
        setGame((draft) => redealWith(createInitialState(), draft.deck));
      },
      resetNonGameStates: () => {
        setBusy(false);
      },
    });

  const ended = isOver(game);
  const won = isWon(game);
  const total = totalOf(game);
  const dealt = game.grid.length === CELLS;
  const hints = useMemo(
    () => (dealt ? hintsOf(game.grid) : []),
    [dealt, game.grid],
  );

  function onCardPress(index: number) {
    if (busy || game.roundEnd) return;
    setGame((draft) => {
      flipCard(draft, index);
    });
  }

  async function nextRound() {
    if (busy || !game.roundEnd || ended) return;
    setBusy(true);
    setGame((draft) => gatherState(draft));
    await delay(DEAL_DELAY);
    setGame((draft) =>
      redealWith(createRoundState(draft.round + 1, draft.banked), draft.deck),
    );
    setBusy(false);
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const cellZones: MapZone[] = Array.from({ length: CELLS }, (_, i) => {
      const card = game.grid[i];
      return {
        id: `cell-${i}`,
        name: "cell",
        pileIndex: i,
        cards: card ? [card] : [],
        col: i % GRID,
        row: GRID_ROW + Math.floor(i / GRID),
        baseZIndex: 10,
        placeholder: { showCount: false },
      };
    });

    const hintZones: MapZone[] = LINES.map((_, line) =>
      line < GRID
        ? {
            id: `hint-${line}`,
            col: HINT_COL,
            row: GRID_ROW + line,
          }
        : {
            id: `hint-${line}`,
            col: line - GRID,
            row: COL_HINT_ROW,
            height: COL_HINT_HEIGHT,
          },
    );

    return [
      {
        id: "hudBars",
        col: 0,
        row: HUD_ROW,
        width: "full",
        height: HUD_HEIGHT,
      },
      ...cellZones,
      ...hintZones,
      {
        id: "status",
        col: 0,
        row: STATUS_ROW,
        width: GRID,
        height: STATUS_HEIGHT,
      },
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: HINT_COL,
        row: COL_HINT_ROW,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: { showCount: false },
      },
      {
        id: "buttons",
        col: 0,
        row: BUTTON_ROW,
        width: "full",
        height: BUTTON_HEIGHT,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const index = mappedCard.pileIndex;
    if (mappedCard.zoneName !== "cell" || index === undefined) {
      return { isDisabled: true };
    }
    const card = game.grid[index];
    const caught = game.caughtAt === index;
    // Cards turned up at the end of the round fade, so the player's own
    // flips stand out.
    const shown = game.shown[index];
    return {
      onPress: () => onCardPress(index),
      isDisabled: busy || !!game.roundEnd || !card || card.faceUp,
      selectColor: caught ? "red" : shown ? "grey" : "none",
      forceSelectColor: caught,
      forceOverlayColor: shown && !caught,
    };
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: GAP,
    cardSize: "small",
    cardMapper,
  });

  const tier = getTier(total);

  const status = !game.roundEnd
    ? game.purse > 0
      ? i18n.t("games:pickpocket.statusPurse", { purse: game.purse })
      : i18n.t("games:pickpocket.statusStart")
    : game.roundEnd === "clean"
      ? i18n.t("games:pickpocket.cleanSweep", { purse: game.purse })
      : game.roundEnd === "walked"
        ? i18n.t("games:pickpocket.walkedAway", { purse: game.purse })
        : game.purse > 0
          ? i18n.t("games:pickpocket.caught", { purse: game.purse })
          : i18n.t("games:pickpocket.caughtEmpty");

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={total}
      hideScore
      winLoseMessage={
        won && tier
          ? i18n.t("games:pickpocket.wonWithTier", {
              score: total,
              tier: i18n.t(tier.key),
            })
          : i18n.t("games:pickpocket.lostShortOfTarget", {
              score: total,
              target: WIN_SCORE,
            })
      }
    >
      {cardMap}

      {hints.map((hint, line) => (
        <View
          key={`hint-${line}`}
          style={[
            pointerEventsStyles.none,
            getZoneStylesById(`hint-${line}`),
            flexStyles.colCentered,
            {
              backgroundColor: rgba(colorDark, 0.75),
              borderRadius: cardWidth * 0.08,
            },
          ]}
        >
          <Text size="lg" weight={700} color={colorPale}>
            {hint.coins}
          </Text>
          <View style={[flexStyles.rowCentered, { gap: cardWidth * 0.04 }]}>
            <Icon
              name="royal"
              size={cardWidth * 0.25}
              color={rgba(colorPale, 0.8)}
            />
            <Text size="xs" weight={600} color={rgba(colorPale, 0.8)}>
              {hint.courts}
            </Text>
          </View>
        </View>
      ))}

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("status"),
          flexStyles.colCentered,
        ]}
      >
        <Text size="sm" weight={600} color={colorPale} numberOfLines={1}>
          {status}
        </Text>
      </View>

      <View
        style={[
          getZoneStylesById("buttons"),
          flexStyles.rowCentered,
          { gap: cardWidth * 0.15 },
        ]}
      >
        {game.roundEnd ? (
          !ended && (
            <Button
              text={i18n.t("games:pickpocket.nextRound")}
              size="md"
              onPress={() => void nextRound()}
              fullWidth
              halfTaller
              disabled={busy}
              theme="green"
            />
          )
        ) : (
          <Button
            text={i18n.t("games:pickpocket.walkAway")}
            size="md"
            onPress={() => setGame((draft) => void walkAway(draft))}
            fullWidth
            halfTaller
            disabled={busy || game.purse === 0}
            theme="blue"
          />
        )}
      </View>

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("hudBars"),
          flexStyles.rowCentered,
          { gap: cardHeight * 0.15 },
        ]}
      >
        <ProgressBar
          progressValue={game.round + (game.roundEnd ? 1 : 0)}
          totalValue={ROUNDS.length}
          color="blue"
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:pickpocket.round")}
          tallyText={`${game.round + 1}/${ROUNDS.length}`}
          scaledHeight={cardHeight * 0.38}
          style={{ flex: 1.2 }}
        />
        <ProgressBar
          progressValue={total}
          totalValue={WIN_SCORE}
          color={total >= WIN_SCORE ? "green" : "orange"}
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:pickpocket.score")}
          tallyText={`${total} / ${WIN_SCORE}`}
          scaledHeight={cardHeight * 0.38}
          style={{ flex: 1.8 }}
        />
      </View>
    </GameWrapper>
  );
}
