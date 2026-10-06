import { Button } from "@/components/Button/Button";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  flipToFace,
  isFace,
  isRed,
  rankValue,
  redealWith,
  shuffle,
  sortCardsBySuit,
  SUITS,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { ProgressBar } from "../Home/ProgressBar";
import { DeckPreviewModal } from "../Modals/DeckPreviewModal";

import { i18n } from "@/i18n";
import { cardTarget, makeHint, pressHint } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";

// Eleusis (Robert Abbott, 1956) for one: a hidden law decides which cards
// may follow the path. Tapping a card plays it; cards that break the law are
// turned away and lie greyed in the grid. Read the law well enough to make
// eight correct guesses in a row, playing a card that fits or declaring that none
// in hand does (a card that did fit is then played for you, in red).
const HAND_SIZE = 4;
const TARGET = 8;
const PATH_COLS = 6;
const PATH_ROWS = 4;
const BOARD_COLS = PATH_COLS;
const TOP_ROW = 0;
// Row units are card height + grid gap (0.1 card width); this widens the gap
// above and below the cells from that to 0.1 * card height.
const EDGE_GAP_EXTRA = 0.2;
const PATH_ROW = TOP_ROW + 1 + EDGE_GAP_EXTRA;
const CELL_ROWS = 1;
const PATH_SPAN = (PATH_ROWS - 1) * CELL_ROWS;
const HAND_ROW = PATH_ROW + CELL_ROWS * PATH_ROWS + EDGE_GAP_EXTRA;

export type Difficulty = "easy" | "difficult";

/** Whether `card` may follow the cards already on the path (oldest first). */
type LawTest = (path: PlayingCard[], card: PlayingCard) => boolean;

export type LawId =
  | "alternateColours"
  | "suitOrRank"
  | "oddEven"
  | "higherUntilCourt"
  | "withinTwo"
  | "colourSteers"
  | "suitCycle"
  | "evenRedOddBlack"
  | "colourTwoBack"
  | "blackClimbs"
  | "sameColourClimbs"
  | "sameColour"
  | "differentSuit"
  | "highLowAlternate"
  | "courtAlternate"
  | "lowerUntilAce"
  | "farApart"
  | "colourTwoBackDiffers"
  | "suitTwoBack"
  | "freshSuit"
  | "zigzag"
  | "afterRedLow"
  | "heartsWild"
  | "sumAtMost14"
  | "parityLock"
  | "withinTwoWrap"
  | "suitSequence"
  | "sameSuitAscender"
  | "redHighBlackLow"
  | "royalCommand"
  | "rangeFlip"
  | "suitSwitcher"
  | "suitSuperiority"
  | "rankSandwich"
  | "colourBalance"
  | "distanceMirroring";

type Law = { id: LawId; level: Difficulty; test: LawTest };

const last = (path: PlayingCard[]) => path[path.length - 1];
const isHigh = (card: PlayingCard) => rankValue(card) >= 8;
const SPADE_FIRST_CYCLE = ["spades", "hearts", "diamonds", "clubs"];
const SUIT_POWER = ["clubs", "diamonds", "hearts", "spades"];
const circularGap = (a: PlayingCard, b: PlayingCard) => {
  const gap = Math.abs(rankValue(a) - rankValue(b));
  return Math.min(gap, 13 - gap);
};
const isOdd = (card: PlayingCard) => rankValue(card) % 2 === 1;

export const LAWS: Law[] = [
  {
    id: "alternateColours",
    level: "easy",
    test: (path, card) => isRed(card.suit) !== isRed(last(path).suit),
  },
  {
    id: "suitOrRank",
    level: "easy",
    test: (path, card) =>
      card.suit === last(path).suit || card.rank === last(path).rank,
  },
  {
    id: "oddEven",
    level: "easy",
    test: (path, card) => isOdd(card) !== isOdd(last(path)),
  },
  {
    id: "higherUntilCourt",
    level: "easy",
    test: (path, card) =>
      isFace(last(path)) || rankValue(card) > rankValue(last(path)),
  },
  {
    id: "withinTwo",
    level: "easy",
    test: (path, card) =>
      Math.abs(rankValue(card) - rankValue(last(path))) <= 2,
  },
  {
    id: "colourSteers",
    level: "difficult",
    test: (path, card) => {
      const prev = rankValue(last(path));
      if (isRed(last(path).suit)) return prev === 13 || rankValue(card) > prev;
      return prev === 1 || rankValue(card) < prev;
    },
  },
  {
    id: "suitCycle",
    level: "difficult",
    test: (path, card) =>
      SUITS.indexOf(card.suit) ===
      (SUITS.indexOf(last(path).suit) + 1) % SUITS.length,
  },
  {
    id: "evenRedOddBlack",
    level: "difficult",
    test: (_path, card) => isRed(card.suit) !== isOdd(card),
  },
  {
    id: "colourTwoBack",
    level: "difficult",
    test: (path, card) =>
      path.length < 2 || isRed(card.suit) === isRed(path[path.length - 2].suit),
  },
  {
    id: "blackClimbs",
    level: "difficult",
    test: (path, card) =>
      isRed(card.suit) ||
      rankValue(last(path)) === 13 ||
      rankValue(card) > rankValue(last(path)),
  },
  {
    id: "sameColourClimbs",
    level: "difficult",
    test: (path, card) =>
      isRed(card.suit) !== isRed(last(path).suit) ||
      rankValue(last(path)) === 13 ||
      rankValue(card) > rankValue(last(path)),
  },
  {
    id: "sameColour",
    level: "easy",
    test: (path, card) => isRed(card.suit) === isRed(last(path).suit),
  },
  {
    id: "differentSuit",
    level: "easy",
    test: (path, card) => card.suit !== last(path).suit,
  },
  {
    id: "highLowAlternate",
    level: "easy",
    test: (path, card) => isHigh(card) !== isHigh(last(path)),
  },
  {
    id: "courtAlternate",
    level: "easy",
    test: (path, card) => isFace(card) !== isFace(last(path)),
  },
  {
    id: "lowerUntilAce",
    level: "easy",
    test: (path, card) =>
      rankValue(last(path)) === 1 || rankValue(card) < rankValue(last(path)),
  },
  {
    id: "farApart",
    level: "easy",
    test: (path, card) =>
      Math.abs(rankValue(card) - rankValue(last(path))) >= 3,
  },
  {
    id: "colourTwoBackDiffers",
    level: "difficult",
    test: (path, card) =>
      path.length < 2 || isRed(card.suit) !== isRed(path[path.length - 2].suit),
  },
  {
    id: "suitTwoBack",
    level: "difficult",
    test: (path, card) =>
      path.length < 2 || card.suit === path[path.length - 2].suit,
  },
  {
    id: "freshSuit",
    level: "difficult",
    test: (path, card) => path.slice(-2).every((p) => p.suit !== card.suit),
  },
  {
    id: "zigzag",
    level: "difficult",
    test: (path, card) => {
      if (path.length < 2) return true;
      const prev = rankValue(last(path));
      const before = rankValue(path[path.length - 2]);
      if (prev === before) return true;
      return prev > before ? rankValue(card) < prev : rankValue(card) > prev;
    },
  },
  {
    id: "afterRedLow",
    level: "difficult",
    test: (path, card) => isRed(last(path).suit) === rankValue(card) <= 7,
  },
  {
    id: "heartsWild",
    level: "difficult",
    test: (path, card) =>
      card.suit === "hearts" || rankValue(card) > rankValue(last(path)),
  },
  {
    id: "sumAtMost14",
    level: "difficult",
    test: (path, card) => rankValue(card) + rankValue(last(path)) <= 14,
  },
  {
    id: "parityLock",
    level: "easy",
    test: (path, card) => isOdd(card) === isOdd(last(path)),
  },
  {
    id: "withinTwoWrap",
    level: "easy",
    test: (path, card) => circularGap(card, last(path)) <= 2,
  },
  {
    id: "suitSequence",
    level: "easy",
    test: (path, card) =>
      SPADE_FIRST_CYCLE.indexOf(card.suit) ===
      (SPADE_FIRST_CYCLE.indexOf(last(path).suit) + 1) %
        SPADE_FIRST_CYCLE.length,
  },
  {
    id: "sameSuitAscender",
    level: "easy",
    test: (path, card) => {
      const prev = last(path);
      if (card.suit === prev.suit) return rankValue(card) > rankValue(prev);
      if (isRed(card.suit) === isRed(prev.suit))
        return rankValue(card) < rankValue(prev);
      return true;
    },
  },
  {
    id: "redHighBlackLow",
    level: "easy",
    test: (path, card) => isRed(card.suit) === rankValue(card) >= 8,
  },
  {
    id: "royalCommand",
    level: "difficult",
    test: (path, card) =>
      isFace(last(path)) === (card.suit === last(path).suit),
  },
  {
    id: "rangeFlip",
    level: "difficult",
    test: (path, card) =>
      isHigh(last(path))
        ? isRed(card.suit) !== isRed(last(path).suit)
        : isRed(card.suit) === isRed(last(path).suit),
  },
  {
    id: "suitSwitcher",
    level: "difficult",
    test: (path, card) =>
      card.suit !== last(path).suit &&
      isRed(card.suit) === isRed(last(path).suit),
  },
  {
    id: "suitSuperiority",
    level: "difficult",
    test: (path, card) =>
      SUIT_POWER.indexOf(card.suit) > SUIT_POWER.indexOf(last(path).suit) ||
      rankValue(card) > rankValue(last(path)) ||
      (last(path).suit === "spades" && rankValue(last(path)) === 13),
  },
  {
    id: "rankSandwich",
    level: "difficult",
    test: (path, card) => {
      if (path.length < 2) return true;
      const a = rankValue(last(path));
      const b = rankValue(path[path.length - 2]);
      const r = rankValue(card);
      return r >= Math.min(a, b) && r <= Math.max(a, b);
    },
  },
  {
    id: "colourBalance",
    level: "difficult",
    test: (path, card) =>
      path.length < 2 ||
      !path.slice(-2).every((p) => isRed(p.suit) === isRed(card.suit)),
  },
  {
    id: "distanceMirroring",
    level: "difficult",
    test: (path, card) => {
      if (path.length < 2) return true;
      const prev = last(path);
      const before = path[path.length - 2];
      if (rankValue(prev) > rankValue(before)) return card.suit === before.suit;
      if (rankValue(prev) < rankValue(before))
        return isRed(card.suit) === isRed(before.suit);
      return true;
    },
  },
];

type PathEntry = { card: PlayingCard; rejected: PlayingCard[] };

type GameState = {
  deck: PlayingCard[];
  hand: PlayingCard[];
  path: PathEntry[];
  /** Hands declared empty of fitting cards, set aside face down. */
  discard: PlayingCard[];
  lawId: LawId;
  streak: number;
  /** The card that would have fitted, after a wrong declaration. */
  missedId: string | null;
  ended: boolean;
  won: boolean;
};

export type AuguryGameState = GameState;

type Cell = { card: PlayingCard; kind: "played" | "rejected" | "missed" };

function lawOf(id: LawId) {
  return LAWS.find((law) => law.id === id) ?? LAWS[0];
}

function pathCards(state: GameState) {
  return state.path.map((entry) => entry.card);
}

function fitsLaw(state: GameState, card: PlayingCard) {
  return lawOf(state.lawId).test(pathCards(state), card);
}

function refill(state: GameState) {
  while (state.hand.length < HAND_SIZE && state.deck.length > 0) {
    state.hand.push(flipToFace(state.deck.pop()!));
  }
  sortCardsBySuit(state.hand);
}

function checkEnd(state: GameState) {
  if (state.streak >= TARGET) {
    state.ended = true;
    state.won = true;
  } else if (state.hand.length === 0) {
    state.ended = true;
  }
}

/** Play a card from hand onto the path; the law accepts or rejects it. */
function playCard(state: GameState, handIndex: number) {
  const card = state.hand[handIndex];
  if (!card || state.ended) return false;
  state.hand.splice(handIndex, 1);
  state.missedId = null;
  if (fitsLaw(state, card)) {
    state.path.push({ card, rejected: [] });
    state.streak += 1;
  } else {
    state.path[state.path.length - 1].rejected.push(card);
    state.streak = 0;
  }
  refill(state);
  checkEnd(state);
  return true;
}

/** Declare that no card in hand fits: a new hand if right, a lost streak if not. */
function declareNone(state: GameState) {
  if (state.ended || state.hand.length === 0) return false;
  const fitting = state.hand.find((card) => fitsLaw(state, card));
  if (fitting) {
    state.hand.splice(state.hand.indexOf(fitting), 1);
    state.path.push({ card: fitting, rejected: [] });
    state.streak = 0;
    state.missedId = fitting.id;
    refill(state);
  } else {
    state.streak += 1;
    state.missedId = null;
    state.discard.push(...flipAllToBack(state.hand));
    state.hand = [];
    refill(state);
  }
  checkEnd(state);
  return true;
}

function pickLaw(difficulty: Difficulty, random = Math.random) {
  const pool = LAWS.filter(
    (law) => difficulty === "difficult" || law.level === "easy",
  );
  return pool[Math.floor(random() * pool.length)].id;
}

function createInitialState(difficulty: Difficulty): GameState {
  const deck = shuffle(createDeck());
  const state: GameState = {
    deck,
    hand: [],
    path: [{ card: flipToFace(deck.pop()!), rejected: [] }],
    discard: [],
    lawId: pickLaw(difficulty),
    streak: 0,
    missedId: null,
    ended: false,
    won: false,
  };
  refill(state);
  return state;
}

function gatherState(state: GameState): GameState {
  return {
    ...state,
    deck: shuffle(flipAllToBack(collectCards(state))),
    hand: [],
    path: [],
    discard: [],
    streak: 0,
    missedId: null,
    ended: false,
    won: false,
  };
}

/**
 * The laws that agree with everything the path shows: each card played
 * fitted the cards before it, and each card turned away did not.
 */
function lawsInKeeping(state: GameState, difficulty: Difficulty) {
  const agrees = (law: Law) =>
    state.path.every((entry, index) => {
      const before = pathCards(state).slice(0, index);
      const upTo = pathCards(state).slice(0, index + 1);
      return (
        (index === 0 || law.test(before, entry.card)) &&
        entry.rejected.every((card) => !law.test(upTo, card))
      );
    });
  const pool = LAWS.filter(
    (law) => difficulty === "difficult" || law.level === "easy",
  ).filter(agrees);
  // The law may come from another setting than today's.
  return pool.length > 0 ? pool : LAWS.filter(agrees);
}

/**
 * The hint, reasoning as a player can, without knowing the law: of the laws
 * that still agree with the path, the guess most of them call right.
 */
function findAuguryHint(state: GameState, difficulty: Difficulty) {
  if (state.ended || state.hand.length === 0) return null;
  const laws = lawsInKeeping(state, difficulty);
  if (laws.length === 0) return null;
  const path = pathCards(state);
  const fits = state.hand.map(
    (card) => laws.filter((law) => law.test(path, card)).length,
  );
  const noneFit = laws.filter((law) =>
    state.hand.every((card) => !law.test(path, card)),
  ).length;
  const best = Math.max(...fits);
  if (noneFit > best) {
    return pressHint("buttons", i18n.t("games:augury.noneFit"));
  }
  return makeHint("tapCard", cardTarget(state.hand[fits.indexOf(best)]));
}

export const auguryRules = {
  HAND_SIZE,
  TARGET,
  LAWS,
  lawOf,
  fitsLaw,
  playCard,
  declareNone,
  pickLaw,
  createInitialState,
  findHint: findAuguryHint,
};

const gameStateInitial = createInitialState("easy");

export default function Augury() {
  const { colorDark, colorAccent } = useGameColors();
  const difficulty = useGameSettingValue("difficulty");
  const [showDiscard, setShowDiscard] = useState(false);

  const { isLoaded, game, setGame, reset } = useStateManager<GameState>({
    gameStateInitial,
    resetNonGameStates: () => setShowDiscard(false),
    resetAndSetup: async () => {
      setGame((draft) => gatherState(draft));
      await delay();
      setGame((draft) =>
        redealWith(createInitialState(difficulty), draft.deck),
      );
    },
  });

  useHint(() => findAuguryHint(game, difficulty), {
    game,
    enabled: !game.ended && game.path.length > 0,
  });

  function play(handIndex: number) {
    if (game.ended || !game.hand[handIndex]) return;
    setGame((draft) => {
      playCard(draft, handIndex);
    });
  }

  // Every card played lies in one grid cell, in order. When the grid gets
  // taller than its space, the rows close up instead of dropping cards.
  const cells = useMemo<Cell[]>(
    () =>
      game.path.flatMap((entry) => [
        {
          card: entry.card,
          kind: entry.card.id === game.missedId ? "missed" : "played",
        } as Cell,
        ...entry.rejected.map((card) => ({ card, kind: "rejected" }) as Cell),
      ]),
    [game.path, game.missedId],
  );
  const pathRows = Math.ceil(cells.length / PATH_COLS);
  const rowPitch =
    pathRows > PATH_ROWS ? PATH_SPAN / (pathRows - 1) : CELL_ROWS;
  const discard = game.discard;

  const zones: MapZone[] = useMemo(() => {
    const cellZones: MapZone[] = cells.map((cell, i) => ({
      id: `cell-${i}`,
      name: "cell",
      pileIndex: i,
      cards: [cell.card],
      col: i % PATH_COLS,
      row: PATH_ROW + Math.floor(i / PATH_COLS) * rowPitch,
      baseZIndex: 10 + i,
    }));

    const handZones: MapZone[] = game.hand.map((card, i) => ({
      id: `hand-${i}`,
      name: "hand",
      pileIndex: i,
      cards: [card],
      col: i + 2,
      row: HAND_ROW,
      baseZIndex: 80,
    }));
    return [
      {
        id: "hud",
        col: 1.6,
        row: TOP_ROW,
        width: BOARD_COLS - 3.2,
        height: 1,
      },
      ...cellZones,
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: TOP_ROW,
        baseZIndex: 60,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "right" },
      },
      ...handZones,
      {
        id: "discard",
        name: "discard",
        cards: discard,
        col: BOARD_COLS - 1,
        row: TOP_ROW,
        baseZIndex: 60,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:discard"), infoPos: "left" },
      },
      {
        id: "buttons",
        col: 0,
        row: HAND_ROW,
        width: 1.75,
        height: 1,
      },
    ];
  }, [game.deck, game.hand, cells, discard, rowPitch]);

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    if (card.zoneName === "hand") {
      return {
        onPress: () => play(card.pileIndex ?? 0),
        isDisabled: game.ended,
      };
    }
    if (card.zoneName === "cell") {
      // Turned-away cards are greyed, a card missed by "None Fit" is red.
      const kind = cells[card.pileIndex ?? 0]?.kind;
      return {
        isDisabled: true,
        forceOverlayColor: kind !== "played",
        selectColor: kind === "missed" ? "red" : "grey",
      };
    }
    return { isDisabled: true };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "discard") {
      return {
        onPress: () => setShowDiscard(true),
        isDisabled: discard.length === 0,
      };
    }
    return {};
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedCols: BOARD_COLS,
    fixedRows: HAND_ROW + 1,
    gap: 0.1,
  });

  const lawText = i18n.t(`games:augury.law.${game.lawId}`);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:augury.won", { law: lawText })
          : i18n.t("games:augury.lost", { law: lawText })
      }
    >
      <DeckPreviewModal
        visible={showDiscard}
        cards={discard}
        onClose={() => setShowDiscard(false)}
        title={i18n.t("cards:discard")}
      />

      {cardMap}

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("hud"),
          flexStyles.rowCentered,
        ]}
      >
        <ProgressBar
          progressValue={game.streak}
          totalValue={TARGET}
          color={colorAccent}
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:augury.streak")}
          tallyText={`${game.streak}/${TARGET}`}
          scaledHeight={cardHeight * 0.4}
          style={{ flex: 1 }}
        />
      </View>

      <View style={[getZoneStylesById("buttons"), flexStyles.rowCentered]}>
        <Button
          text={i18n.t("games:augury.noneFit")}
          size="md"
          onPress={() =>
            setGame((draft) => {
              declareNone(draft);
            })
          }
          disabled={game.ended || game.hand.length === 0}
          theme={colorAccent}
          style={{
            flex: 1,
            height: cardHeight,
            borderRadius: cardHeight * 0.1,
          }}
        />
      </View>
    </GameWrapper>
  );
}
