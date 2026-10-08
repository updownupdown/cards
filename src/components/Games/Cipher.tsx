import { Button } from "@/components/Button/Button";
import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipAllToFace,
  RANKS,
  shuffle,
  type CardRank,
  type StandardRank,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

import { i18n } from "@/i18n";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";

// Cipher: three clubs lie face down, in an order to be found. Each guess
// is three cards of different ranks from the other suits; once checked,
// each is marked green (right rank, right place), amber (a rank in the
// cipher, elsewhere) or left plain, and the row moves down to stay in
// view. A limited number of guesses to crack it.

type Mark = "exact" | "near" | "none";

/** A checked guess, each card in its place; a card picked up again is a gap. */
type Guess = {
  cards: (PlayingCard | null)[];
  marks: (Mark | null)[];
};

type GameState = {
  /** The cipher, face down until the end. */
  code: PlayingCard[];
  /** The clubs not in the cipher, set aside face down. */
  spare: PlayingCard[];
  /** The cards to guess with, a pile a rank, three each. */
  pool: PlayingCard[][];
  /** The guess being laid, a card a place. */
  guess: (PlayingCard | null)[];
  guesses: Guess[];
  solved: boolean;
};

export type CipherGameState = GameState;

const CODE_SIZE = 3;
const GUESSES = 8;
const BOARD_WIDTH = 7;
/** A pool pile's place along the row, in card widths. */
const SLOT = 0.5;
/** How many codes the hint weighs as guesses. */
const OPTIONS = 150;
/** Where the cipher's places start, in card widths. */
const PLACES_COL = (BOARD_WIDTH - CODE_SIZE * 1.05) / 2;

// —— Rules ———————————————————————————————————————————————————

function markRanks(code: CardRank[], guess: CardRank[]): Mark[] {
  return guess.map((rank, index) =>
    code[index] === rank ? "exact" : code.includes(rank) ? "near" : "none",
  );
}

/** What the guesses so far say about a rank: its best mark, if any. */
function knownMark(state: GameState, rank: StandardRank): Mark | null {
  let best: Mark | null = null;
  const see = (mark: Mark) => {
    if (mark === "exact" || (mark === "near" && best !== "exact")) best = mark;
    else if (!best) best = mark;
  };
  for (const guess of state.guesses) {
    guess.cards.forEach((card, index) => {
      if (card?.rank === rank) see(guess.marks[index]!);
    });
  }
  return best;
}

// —— Moves ————————————————————————————————————————————————————

function allCards(state: GameState) {
  const present = (card: PlayingCard | null): card is PlayingCard =>
    card !== null;
  return [
    ...state.code,
    ...state.spare,
    ...state.pool.flat(),
    ...state.guess.filter(present),
    ...state.guesses.flatMap((guess) => guess.cards.filter(present)),
  ];
}

function emptyGuess(): (PlayingCard | null)[] {
  return Array.from({ length: CODE_SIZE }, () => null);
}

function gather(draft: GameState) {
  const cards = shuffle(allCards(draft));
  draft.code = [];
  draft.spare = [];
  draft.guess = emptyGuess();
  draft.guesses = [];
  draft.solved = false;
  // The pool holds every card until the deal.
  draft.pool = [flipAllToBack(cards)];
}

/** Three clubs, face down, make the cipher; the other suits are the pool. */
function deal(draft: GameState, random: () => number = Math.random) {
  const cards = draft.pool.flat();
  const clubs = shuffle(
    cards.filter((card) => card.suit === "clubs"),
    random,
  );
  draft.code = flipAllToBack(clubs.slice(0, CODE_SIZE));
  draft.spare = flipAllToBack(clubs.slice(CODE_SIZE));
  const rest = cards.filter((card) => card.suit !== "clubs");
  draft.pool = RANKS.map((rank) =>
    flipAllToFace(rest.filter((card) => card.rank === rank)),
  );
  draft.guess = emptyGuess();
  draft.guesses = [];
  draft.solved = false;
}

function rankInGuess(state: GameState, rank: CardRank) {
  return state.guess.some((card) => card?.rank === rank);
}

function isReady(state: GameState) {
  return state.guess.every((card) => card !== null);
}

/** Lays the top card of a pool pile in the first empty place. */
function pick(draft: GameState, rankIndex: number) {
  const place = draft.guess.indexOf(null);
  if (place === -1) return false;
  const pile = draft.pool[rankIndex];
  const card = pile[pile.length - 1];
  if (!card || rankInGuess(draft, card.rank)) return false;
  pile.pop();
  draft.guess[place] = card;
  return true;
}

/** Takes a checked card back from its row, when its rank's pile is bare. */
function pickBack(draft: GameState, cardId: string) {
  const place = draft.guess.indexOf(null);
  if (place === -1) return false;
  for (const guess of draft.guesses) {
    const index = guess.cards.findIndex((card) => card?.id === cardId);
    const card = guess.cards[index];
    if (!card) continue;
    if (rankInGuess(draft, card.rank)) return false;
    guess.cards[index] = null;
    guess.marks[index] = null;
    draft.guess[place] = card;
    return true;
  }
  return false;
}

/** Puts a card of the guess back on its pile. */
function unpick(draft: GameState, cardId: string) {
  const place = draft.guess.findIndex((card) => card?.id === cardId);
  if (place === -1) return false;
  const card = draft.guess[place]!;
  draft.guess[place] = null;
  draft.pool[RANKS.indexOf(card.rank as StandardRank)].push(card);
  return true;
}

function check(draft: GameState) {
  if (!isReady(draft) || draft.guesses.length >= GUESSES) return;
  const cards = draft.guess as PlayingCard[];
  const marks = markRanks(
    draft.code.map((card) => card.rank),
    cards.map((card) => card.rank),
  );
  draft.guesses.push({ cards, marks });
  draft.guess = emptyGuess();
  if (marks.every((mark) => mark === "exact")) draft.solved = true;
  if (draft.solved || draft.guesses.length >= GUESSES) {
    draft.code = flipAllToFace(draft.code);
  }
}

function isOver(state: GameState) {
  return state.solved || state.guesses.length >= GUESSES;
}

// —— Hints ————————————————————————————————————————————————————

/** Every cipher: different ranks, in order. */
let allCodes: StandardRank[][] | null = null;
function codes() {
  if (allCodes) return allCodes;
  const result: StandardRank[][] = [];
  const build = (prefix: StandardRank[]) => {
    if (prefix.length === CODE_SIZE) {
      result.push(prefix);
      return;
    }
    for (const rank of RANKS) {
      if (!prefix.includes(rank)) build([...prefix, rank]);
    }
  };
  build([]);
  allCodes = result;
  return result;
}

/** Whether a rank's card can still be laid: on its pile, or in a row. */
function hasCard(state: GameState, rank: StandardRank) {
  return (
    state.pool[RANKS.indexOf(rank)].length > 0 ||
    state.guesses.some((guess) => guess.cards.some((c) => c?.rank === rank))
  );
}

/**
 * The guess that tells the most: of the codes that can still be laid,
 * the one whose marks would leave the fewest codes that fit every guess so
 * far, however they came out. A code that could itself be the cipher wins
 * a tie, so the last guess cracks it.
 */
function suggestedGuess(state: GameState): StandardRank[] {
  const past = state.guesses.map((guess) => ({
    ranks: guess.cards.map((card) => card?.rank as StandardRank | undefined),
    marks: guess.marks,
  }));
  const consistent = (code: StandardRank[]) =>
    past.every(({ ranks, marks }) =>
      ranks.every(
        (rank, index) =>
          rank === undefined ||
          (code[index] === rank
            ? "exact"
            : code.includes(rank)
              ? "near"
              : "none") === marks[index],
      ),
    );
  const canLay = (code: StandardRank[]) =>
    code.every(
      (rank, index) =>
        state.guess[index]?.rank === rank || hasCard(state, rank),
    );
  const all = codes();
  if (past.length === 0) return all[0];
  const candidates = all.filter(consistent);
  const possible = candidates.filter(canLay);
  if (possible.length > 0 && possible.length <= 2) return possible[0];
  // Weighing every code would be slow, so every few are tried, and the
  // ones that could be the cipher.
  const stride = Math.ceil(all.length / OPTIONS);
  const options = [
    ...possible,
    ...all.filter((_, index) => index % stride === 0 && canLay(all[index])),
  ];
  if (options.length === 0) return all.find(canLay) ?? all[0];
  let best = options[0];
  let bestScore = Infinity;
  for (const option of options) {
    const buckets = new Map<string, number>();
    let worst = 0;
    for (const code of candidates) {
      const key = markRanks(code, option).join("");
      const size = (buckets.get(key) ?? 0) + 1;
      buckets.set(key, size);
      if (size > worst) worst = size;
      if (worst >= bestScore) break;
    }
    const score = worst - (consistent(option) ? 0.5 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = option;
    }
  }
  return best;
}

function findCipherHint(state: GameState) {
  if (isOver(state)) return null;
  const wanted = suggestedGuess(state);
  // A card laid in the wrong place is taken back first.
  const stray = state.guess.find(
    (card, index) => card && card.rank !== wanted[index],
  );
  if (stray) return makeHint("tapCard", cardTarget(stray));
  const place = state.guess.indexOf(null);
  if (place !== -1) {
    const rank = wanted[place];
    const pile = state.pool[RANKS.indexOf(rank)];
    const top = pile[pile.length - 1];
    if (top) return makeHint("tapCard", cardTarget(top));
    for (const guess of state.guesses) {
      const card = guess.cards.find((c) => c?.rank === rank);
      if (card) return makeHint("tapCard", cardTarget(card));
    }
    return null;
  }
  return makeHint(
    { key: "press", values: { label: i18n.t("games:cipher.check") } },
    zoneTarget("check"),
  );
}

export const cipherRules = {
  CODE_SIZE,
  GUESSES,
  markRanks,
  gather,
  deal,
  pick,
  pickBack,
  unpick,
  check,
  isReady,
  isOver,
  suggestedGuess,
  findHint: findCipherHint,
};

// —— Component ————————————————————————————————————————————————

const gameStateInitial: GameState = {
  code: [],
  spare: [],
  pool: [createDeck()],
  guess: emptyGuess(),
  guesses: [],
  solved: false,
};

const MARK_COLORS: Record<Mark, string> = {
  exact: "green",
  near: "orange",
  none: "grey",
};

const ROW_GAP = 0.55;
const HISTORY_ROW = 1.15;
const GUESS_ROW = HISTORY_ROW + (GUESSES - 1) * ROW_GAP + 1.2;
const POOL_ROW = GUESS_ROW + 1.3;
const CHECK_ROW = POOL_ROW + 1.15;

export default function Cipher() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();

  const {
    isSettingUp,
    isLoaded,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
    clearUndoHistory,
  } = useStateManager<GameState>({
    gameStateInitial,
    resetAndSetup: async () => {
      setGame(gather);
      await delay();
      setGame((draft) => deal(draft));
    },
  });

  const over = !isSettingUp && isOver(game);
  const ready = isReady(game);

  useHint(() => findCipherHint(game), {
    game,
    enabled: !isSettingUp && !over,
  });

  function onPoolPress(rankIndex: number) {
    if (over || ready) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      pick(draft, rankIndex);
    });
  }

  function onHistoryPress(cardId: string) {
    if (over || ready) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      pickBack(draft, cardId);
    });
  }

  function onGuessPress(cardId: string) {
    if (over) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      unpick(draft, cardId);
    });
  }

  function onCheck() {
    if (over || !ready) return;
    // A check tells you something: there's no undoing back past it.
    clearUndoHistory();
    setGame(check);
  }

  const zones: MapZone[] = useMemo(() => {
    const placeCol = (place: number) => PLACES_COL + place * 1.05;
    const historyRows: MapZone[] = Array.from(
      { length: GUESSES * CODE_SIZE },
      (_, index) => {
        const row = Math.floor(index / CODE_SIZE);
        const place = index % CODE_SIZE;
        const card = game.guesses[row]?.cards[place] ?? null;
        return {
          id: `history-${row}-${place}`,
          name: "history",
          pileIndex: row,
          cards: card ? [card] : [],
          col: placeCol(place),
          row: HISTORY_ROW + row * ROW_GAP,
          baseZIndex: 10 + row,
          placeholder: { hideShadow: true, hideBackground: true },
        };
      },
    );
    const guessPlaces: MapZone[] = Array.from(
      { length: CODE_SIZE },
      (_, place) => ({
        id: `guess-${place}`,
        name: "guess",
        pileIndex: place,
        cards: game.guess[place] ? [game.guess[place]!] : [],
        col: placeCol(place),
        row: GUESS_ROW,
        baseZIndex: 30,
        placeholder: { hideShadow: true },
      }),
    );
    const poolPiles: MapZone[] = RANKS.map((rank, index) => ({
      id: `pool-${rank}`,
      name: "pool",
      pileIndex: index,
      cards: game.pool[index] ?? [],
      col: index * SLOT,
      row: POOL_ROW,
      baseZIndex: 40 + index,
      fan: { maxVisible: 1 },
      placeholder: { showCount: false, hideShadow: true },
    }));
    return [
      {
        id: "code",
        name: "code",
        cards: game.code,
        col: PLACES_COL,
        row: 0,
        width: CODE_SIZE * 1.05,
        baseZIndex: 10,
        fan: { direction: "right", offset: 1.05 },
      },
      ...historyRows,
      ...guessPlaces,
      ...poolPiles,
      {
        id: "check",
        col: 0,
        row: CHECK_ROW,
        width: BOARD_WIDTH,
        height: 0.7,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const id = mappedCard.card.id;
    if (mappedCard.zoneName === "pool") {
      const index = mappedCard.pileIndex ?? 0;
      const rank = RANKS[index];
      const known = knownMark(game, rank);
      return {
        onPress: () => onPoolPress(index),
        isDisabled:
          !mappedCard.topOfZone || over || ready || rankInGuess(game, rank),
        // Ranks the guesses have placed are tinted the way they were marked.
        ...(known && mappedCard.topOfZone
          ? { selectColor: MARK_COLORS[known], forceOverlayColor: true }
          : {}),
      };
    }
    if (mappedCard.zoneName === "guess") {
      return { onPress: () => onGuessPress(id), isDisabled: over };
    }
    if (mappedCard.zoneName === "history") {
      const guess = game.guesses[mappedCard.pileIndex ?? 0];
      const at = guess?.cards.findIndex((card) => card?.id === id) ?? -1;
      const mark = guess?.marks[at];
      const rank = mappedCard.card.rank as StandardRank;
      // A card whose pile is bare can be picked up again.
      const bare = game.pool[RANKS.indexOf(rank)].length === 0;
      return {
        onPress: () => onHistoryPress(id),
        isDisabled: over || ready || !bare || rankInGuess(game, rank),
        ...(mark && mark !== "none"
          ? { selectColor: MARK_COLORS[mark], forceOverlayColor: true }
          : {}),
      };
    }
    return { isDisabled: true };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    gap: 0,
  });

  const left = GUESSES - game.guesses.length;

  return (
    <GameWrapper
      outcome={!over ? "playing" : game.solved ? "won" : "lost"}
      score={game.solved ? game.guesses.length : 0}
      winLoseMessage={
        over
          ? game.solved
            ? i18n.t("games:cipher.solved", { count: game.guesses.length })
            : i18n.t("games:cipher.unsolved")
          : undefined
      }
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("check"),
          flexStyles.rowCentered,
          { gap: spacing(14) },
        ]}
      >
        {ready && !over ? (
          <Button
            onPress={onCheck}
            text={i18n.t("games:cipher.check")}
            size="sm"
            theme="green"
          />
        ) : (
          <Text size="xs" weight={300} color={rgba(colorPale, 0.7)}>
            {over
              ? i18n.t("games:cipher.cipherShown")
              : i18n.t("games:cipher.guessesLeft", { count: left })}
          </Text>
        )}
      </View>
    </GameWrapper>
  );
}
