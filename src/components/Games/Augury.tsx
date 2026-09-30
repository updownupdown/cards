import { Text } from "@/components/common/Text";
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
  SUITS,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { ProgressBar } from "../Home/ProgressBar";
import { DeckPreviewModal } from "../Modals/DeckPreviewModal";

import { i18n } from "@/i18n";

// Eleusis (Robert Abbott, 1956) for one: a hidden law decides which cards
// may follow the path. Tapping a card plays it; cards that break the law are
// turned away and lie greyed in the grid. Read the law well enough to make
// eight right calls in a row, playing a card that fits or declaring that none
// in hand does (a card that did fit is then played for you, in purple).
const HAND_SIZE = 4;
const TARGET = 8;
const PATH_COLS = 6;
const PATH_ROWS = 4;
const SHOWN_CELLS = PATH_COLS * PATH_ROWS;
const GROUP_GAP = 0.15;
const BOARD_COLS = PATH_COLS + 2 * GROUP_GAP;
const STATUS_ROW = 0;
const STATUS_HEIGHT = 0.36;
const HUD_ROW = STATUS_ROW + STATUS_HEIGHT + 0.05;
const HUD_HEIGHT = 0.42;
const PATH_ROW = HUD_ROW + HUD_HEIGHT + 0.2;
const CELL_ROWS = 1.1;
const HAND_ROW = PATH_ROW + CELL_ROWS * PATH_ROWS + 0.1;
const BUTTON_ROW = HAND_ROW + 1.08;

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
  | "sameColourClimbs";

type Law = { id: LawId; level: Difficulty; test: LawTest };

const last = (path: PlayingCard[]) => path[path.length - 1];
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
];

type PathEntry = { card: PlayingCard; rejected: PlayingCard[] };

type Verdict = "accepted" | "rejected" | "noneRight" | "noneWrong";

type GameState = {
  deck: PlayingCard[];
  hand: PlayingCard[];
  path: PathEntry[];
  /** Hands declared empty of fitting cards, set aside face down. */
  discard: PlayingCard[];
  lawId: LawId;
  streak: number;
  verdict: Verdict | null;
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
    state.verdict = "accepted";
  } else {
    state.path[state.path.length - 1].rejected.push(card);
    state.streak = 0;
    state.verdict = "rejected";
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
    state.verdict = "noneWrong";
    state.missedId = fitting.id;
    refill(state);
  } else {
    state.streak += 1;
    state.verdict = "noneRight";
    state.missedId = null;
    state.discard.push(...flipAllToBack(state.hand));
    state.hand = [];
    refill(state);
  }
  checkEnd(state);
  return true;
}

function pickLaw(difficulty: Difficulty, random = Math.random) {
  const pool = LAWS.filter((law) => law.level === difficulty);
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
    verdict: null,
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
    verdict: null,
    missedId: null,
    ended: false,
    won: false,
  };
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
};

const gameStateInitial = createInitialState("easy");

export default function Augury() {
  const { colorPale, colorDark } = useGameColors();
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

  function play(handIndex: number) {
    if (game.ended || !game.hand[handIndex]) return;
    setGame((draft) => {
      playCard(draft, handIndex);
    });
  }

  // Every card played lies in one grid cell, in order. The latest cells are
  // shown; older ones go face down to the discard pile.
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
  const shownStart = Math.max(0, cells.length - SHOWN_CELLS);
  const discard = useMemo(
    () => [
      ...game.discard,
      ...flipAllToBack(cells.slice(0, shownStart).map((cell) => cell.card)),
    ],
    [game.discard, cells, shownStart],
  );

  const zones: MapZone[] = useMemo(() => {
    const cellZones: MapZone[] = cells.slice(shownStart).map((cell, i) => ({
      id: `cell-${i}`,
      name: "cell",
      pileIndex: shownStart + i,
      cards: [cell.card],
      col: GROUP_GAP + (i % PATH_COLS),
      row: PATH_ROW + Math.floor(i / PATH_COLS) * CELL_ROWS,
      baseZIndex: 10 + i,
    }));
    const handStart = 1 + GROUP_GAP + (HAND_SIZE - game.hand.length) / 2;
    const handZones: MapZone[] = game.hand.map((card, i) => ({
      id: `hand-${i}`,
      name: "hand",
      pileIndex: i,
      cards: [card],
      col: handStart + i,
      row: HAND_ROW,
      baseZIndex: 80,
    }));
    return [
      {
        id: "status",
        col: 0,
        row: STATUS_ROW,
        width: "full",
        height: STATUS_HEIGHT,
      },
      { id: "hud", col: 0, row: HUD_ROW, width: "full", height: HUD_HEIGHT },
      ...cellZones,
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: HAND_ROW,
        baseZIndex: 60,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "above" },
      },
      ...handZones,
      {
        id: "discard",
        name: "discard",
        cards: discard,
        col: BOARD_COLS - 1,
        row: HAND_ROW,
        baseZIndex: 60,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:discard"), infoPos: "above" },
      },
      { id: "buttons", col: 0, row: BUTTON_ROW, width: "full", height: 0.5 },
    ];
  }, [game.deck, game.hand, cells, shownStart, discard]);

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    if (card.zoneName === "hand") {
      return {
        onPress: () => play(card.pileIndex ?? 0),
        isDisabled: game.ended,
      };
    }
    if (card.zoneName === "cell") {
      // Turned-away cards are greyed, a card missed by "None Fit" is purple.
      const kind = cells[card.pileIndex ?? 0]?.kind;
      return {
        isDisabled: true,
        forceOverlayColor: kind !== "played",
        selectColor: kind === "missed" ? "purple" : "grey",
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
    fixedRows: BUTTON_ROW + 0.5,
    gap: 0.1,
  });

  const lawText = i18n.t(`games:augury.law.${game.lawId}`);
  const status = game.verdict
    ? i18n.t(`games:augury.verdict.${game.verdict}`)
    : i18n.t("games:augury.start");

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
          getZoneStylesById("status"),
          flexStyles.colCentered,
        ]}
      >
        <Text size="sm" weight={400} color={colorPale} numberOfLines={1}>
          {status}
        </Text>
      </View>

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
          color={game.streak > 0 ? "green" : "blue"}
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:augury.streak")}
          tallyText={`${game.streak}/${TARGET}`}
          scaledHeight={cardHeight * 0.36}
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
          theme="blue"
          style={{ flex: 1 }}
        />
      </View>
    </GameWrapper>
  );
}
