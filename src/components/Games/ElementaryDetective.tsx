import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipAllToFace,
  isFace,
  shuffle,
  SUITS,
  top,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  ColRows,
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, withNote, zoneTarget } from "@/hints/hint";
const gridCols = 4;
const gridRows = 3;

const guessZonesColRows: ColRows[] = [
  { c: 1, r: 1 },
  { c: 2, r: 1 },
  { c: 3, r: 1 },
  { c: 4, r: 1 },
  { c: 5, r: 2 },
  { c: 5, r: 3 },
  { c: 5, r: 4 },
  { c: 4, r: 5 },
  { c: 3, r: 5 },
  { c: 2, r: 5 },
  { c: 1, r: 5 },
  { c: 0, r: 4 },
  { c: 0, r: 3 },
  { c: 0, r: 2 },
];

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(
      (rest) => [item, ...rest],
    ),
  );
}

function dealPlaymates(faceCards: PlayingCard[]) {
  const jacks = shuffle(faceCards.filter((c) => c.rank === "J"));
  const queens = shuffle(faceCards.filter((c) => c.rank === "Q"));
  const kings = shuffle(faceCards.filter((c) => c.rank === "K"));

  if (
    jacks.length !== gridCols ||
    queens.length !== gridCols ||
    kings.length !== gridCols
  ) {
    throw new Error(
      "Elementary Detective requires four Jacks, Queens, and Kings.",
    );
  }

  for (const qPool of permutations(queens)) {
    for (const kPool of permutations(kings)) {
      const cols = jacks.map(
        (jack, column) =>
          [jack, qPool[column], kPool[column]] as [
            PlayingCard,
            PlayingCard,
            PlayingCard,
          ],
      );
      if (
        !cols.every(
          (column) => new Set(column.map(({ suit }) => suit)).size === 3,
        )
      ) {
        continue;
      }

      const shuffledColumns = shuffle(cols).map((column) => shuffle(column));
      return Array.from({ length: gridRows }, (_, row) =>
        shuffledColumns.map((column) => column[row]),
      ).flat();
    }
  }

  throw new Error(
    "Unable to create valid Elementary Detective playmate columns.",
  );
}

function getScoreIndexes(playmateIndex: number) {
  let indexes: number[] = [];

  // Top and bottom rows of guesses
  if (playmateIndex % 4 === 0) indexes.push(0, 10);
  if (playmateIndex % 4 === 1) indexes.push(1, 9);
  if (playmateIndex % 4 === 2) indexes.push(2, 8);
  if (playmateIndex % 4 === 3) indexes.push(3, 7);

  // Left and right columns of guesses
  if (Math.floor(playmateIndex / 4) === 0) indexes.push(13, 4);
  if (Math.floor(playmateIndex / 4) === 1) indexes.push(12, 5);
  if (Math.floor(playmateIndex / 4) === 2) indexes.push(11, 6);

  return indexes;
}

type GameState = {
  playmates: PlayingCard[];
  guesses: (PlayingCard | null)[];
  draw: PlayingCard[];
  discard: PlayingCard[];
  scorePile: PlayingCard[];
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

export type ElementaryDetectiveGameState = GameState;

function resolvePlaymateReveal(
  state: GameState,
  playmateIndex: number,
): GameState {
  const playmate = state.playmates[playmateIndex];
  if (state.ended || !playmate) return state;

  const playmates = state.playmates.map((candidate, index) =>
    index === playmateIndex ? { ...candidate, faceUp: true } : candidate,
  );
  const guesses = [...state.guesses];
  const scorePile = [...state.scorePile];

  getScoreIndexes(playmateIndex).forEach((index) => {
    const guess = state.guesses[index];
    if (guess?.suit === playmate.suit) {
      scorePile.push({ ...guess, faceUp: false });
      guesses[index] = null;
    }
  });

  const ended = playmates.every(({ faceUp }) => faceUp);
  const score = scorePile.length;
  return {
    ...state,
    playmates,
    guesses,
    scorePile,
    ended,
    won: ended ? score >= 20 : state.won,
    winLoseMessage: ended
      ? i18n.t("games:elementaryDetective.youScored20ToWin", { score })
      : state.winLoseMessage,
  };
}

// —— Hints ——

const GUESS_COUNT = guessZonesColRows.length;
const PLAYMATE_COUNT = gridCols * gridRows;

/** The playmates each guess space scores against (its row or column). */
const GUESS_LINES: number[][] = Array.from(
  { length: GUESS_COUNT },
  (_, guess) =>
    Array.from({ length: PLAYMATE_COUNT }, (_, index) => index).filter(
      (index) => getScoreIndexes(index).includes(guess),
    ),
);

/** Ways to choose `pick` of `from`. */
function choose(from: number, pick: number) {
  if (pick < 0 || pick > from) return 0;
  let ways = 1;
  for (let index = 0; index < pick; index += 1) {
    ways = (ways * (from - index)) / (index + 1);
  }
  return ways;
}

/**
 * What the player knows of the hidden playmates: they are the Jacks, Queens
 * and Kings not yet revealed, in any order. How many of each suit are left
 * to find, and how many are hidden.
 */
function hiddenSuits(state: GameState) {
  const left = Object.fromEntries(SUITS.map((suit) => [suit, 3])) as Record<
    CardSuit,
    number
  >;
  let hidden = 0;
  for (const playmate of state.playmates) {
    if (playmate.faceUp) left[playmate.suit] -= 1;
    else hidden += 1;
  }
  return { left, hidden };
}

/**
 * The chance a guess of this suit in this space scores: that one of the
 * hidden playmates in its line has the suit.
 */
function guessChance(state: GameState, guess: number, suit: CardSuit) {
  const { left, hidden } = hiddenSuits(state);
  const inLine = GUESS_LINES[guess].filter(
    (index) => !state.playmates[index].faceUp,
  ).length;
  if (inLine === 0 || hidden === 0) return 0;
  return 1 - choose(hidden - left[suit], inLine) / choose(hidden, inLine);
}

/** How many guesses revealing this playmate should score. */
function revealWorth(state: GameState, playmate: number) {
  const { left, hidden } = hiddenSuits(state);
  if (hidden === 0) return 0;
  return getScoreIndexes(playmate).reduce((sum, guess) => {
    const card = state.guesses[guess];
    return card ? sum + left[card.suit] / hidden : sum;
  }, 0);
}

type DetectiveMove =
  | { type: "place"; guess: number; chance: number }
  | { type: "reveal"; playmate: number; worth: number }
  | { type: "withdraw"; guess: number };

// A guess this likely to score is worth its space; below, the card is
// better used to clear a dead guess, or a reveal comes first.
const GOOD_CHANCE = 0.3;
const POOR_CHANCE = 0.15;

/**
 * Fill the guess spaces where the top card most likely scores. Reveal a
 * playmate only once the card has no good space left, the one whose guesses
 * should score most (best with all its spaces filled): a guess scores
 * whenever its line is revealed, so revealing early gives up guesses for
 * no more than freed spaces and a better idea of the others. Clear a guess
 * that can't score any more when the top card has no better use.
 */
function bestDetectiveMove(state: GameState): DetectiveMove | null {
  if (state.ended) return null;
  const hidden = state.playmates.flatMap((playmate, index) =>
    playmate.faceUp ? [] : [index],
  );
  if (hidden.length === 0) return null;
  const reveal = (candidates: number[]) => {
    let best: { type: "reveal"; playmate: number; worth: number } | null = null;
    for (const playmate of candidates) {
      const worth = revealWorth(state, playmate);
      if (!best || worth > best.worth + 1e-9) {
        best = { type: "reveal", playmate, worth };
      }
    }
    return best;
  };

  const card = top(state.draw);
  if (!card) return reveal(hidden);

  const empty = state.guesses.flatMap((guess, index) => (guess ? [] : [index]));
  let place: { type: "place"; guess: number; chance: number } | null = null;
  for (const guess of empty) {
    const chance = guessChance(state, guess, card.suit);
    if (!place || chance > place.chance + 1e-9) {
      place = { type: "place", guess, chance };
    }
  }
  if (place && place.chance >= GOOD_CHANCE) return place;

  // A space whose line is all revealed takes a useless card for free.
  const spent = empty.find((guess) =>
    GUESS_LINES[guess].every((playmate) => state.playmates[playmate].faceUp),
  );
  if (place && place.chance === 0 && spent !== undefined) {
    return { type: "place", guess: spent, chance: 0 };
  }
  // Guesses that can't score any more, in a line still to be revealed.
  const dead = state.guesses.flatMap((guess, index) =>
    guess &&
    guessChance(state, index, guess.suit) === 0 &&
    GUESS_LINES[index].some((playmate) => !state.playmates[playmate].faceUp)
      ? [index]
      : [],
  );
  if (dead.length > 0 && (!place || place.chance < POOR_CHANCE)) {
    return { type: "withdraw", guess: dead[0] };
  }
  const ready = reveal(
    hidden.filter((playmate) =>
      getScoreIndexes(playmate).every((guess) => state.guesses[guess]),
    ),
  );
  if (ready && ready.worth > 0) return ready;
  if (place) return place;
  const any = reveal(hidden);
  if (any && any.worth === 0 && dead.length > 0) {
    return { type: "withdraw", guess: dead[0] };
  }
  return any;
}

function findDetectiveHint(state: GameState) {
  const move = bestDetectiveMove(state);
  if (!move) return null;
  if (move.type === "reveal") {
    const count = Math.round(move.worth);
    return withNote(
      makeHint("tapCard", cardTarget(state.playmates[move.playmate])),
      count > 0
        ? i18n.t("games:elementaryDetective.hint.reveal", { count })
        : i18n.t("games:elementaryDetective.hint.revealInfo"),
    );
  }
  if (move.type === "withdraw") {
    return withNote(
      makeHint("removeCard", cardTarget(state.guesses[move.guess]!)),
      i18n.t("games:elementaryDetective.hint.withdraw"),
    );
  }
  const hint = makeHint(
    "moveCard",
    cardTarget(top(state.draw)!),
    zoneTarget(`guess-${move.guess}`),
  );
  if (move.chance > 0) {
    return withNote(
      hint,
      i18n.t("games:elementaryDetective.hint.place", {
        chance: Math.round(move.chance * 100),
      }),
    );
  }
  const spent = GUESS_LINES[move.guess].every(
    (playmate) => state.playmates[playmate].faceUp,
  );
  return spent
    ? withNote(hint, i18n.t("games:elementaryDetective.hint.discard"))
    : hint;
}

export const elementaryDetectiveRules = {
  findHint: findDetectiveHint,
  bestMove: bestDetectiveMove,
  dealPlaymates,
  getScoreIndexes,
  resolvePlaymateReveal,
  gridCols,
  gridRows,
};

const gameStateInitial: GameState = {
  playmates: [],
  guesses: Array.from({ length: 14 }, () => null),
  draw: shuffle(createDeck()),
  discard: [],
  scorePile: [],
  ended: false,
  won: false,
  winLoseMessage: "",
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.draw,
      ...draft.guesses,
      ...draft.playmates,
      ...draft.discard,
      ...draft.scorePile,
    ].filter((card): card is PlayingCard => card !== null);

    draft.playmates = [];
    draft.guesses = Array.from({ length: 14 }, () => null);
    draft.draw = flipAllToBack(allCards);
    draft.discard = [];
    draft.scorePile = [];
    draft.winLoseMessage = "";
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    draft.playmates = dealPlaymates(draft.draw.filter((c) => isFace(c)));
    draft.draw = flipAllToFace(shuffle(draft.draw.filter((c) => !isFace(c))));
  });

  await delay();
}

// ── Main Component ─────────────────────────────────────────
export default function ElementaryDetective() {
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
    });

  useHint(() => findDetectiveHint(game), { game });

  // ── Game logic ────────────────────────────────────────────
  function placeGuess(guessIndex: number) {
    const newDrawPile = [...game.draw];
    const topDrawCard = top(newDrawPile);
    if (game.ended || !topDrawCard) return;

    saveUndoState(structuredClone(game));

    setGame({
      ...game,
      guesses: game.guesses.map((g, i) => (i === guessIndex ? topDrawCard : g)),
      draw: newDrawPile.slice(0, -1),
    });
  }

  function widthdrawGuess(guessIndex: number) {
    const newDrawPile = [...game.draw];
    const topDrawCard = top(newDrawPile);
    const guessCard = game.guesses[guessIndex];
    if (game.ended || !topDrawCard || !guessCard) return;

    saveUndoState(structuredClone(game));
    setGame({
      ...game,
      guesses: game.guesses.map((g, i) => (i === guessIndex ? null : g)),
      draw: newDrawPile.slice(0, -1),
      discard: [
        ...game.discard,
        { ...topDrawCard, faceUp: false },
        { ...guessCard, faceUp: false },
      ],
    });
  }

  function revealPlaymate(playmateIndex: number) {
    const playmate = game.playmates[playmateIndex];
    if (game.ended || !playmate) return;

    saveUndoState(structuredClone(game));
    setGame(resolvePlaymateReveal(game, playmateIndex));
  }

  // ── Card Mapping ─────────────────────────────────────────
  const zones: MapZone[] = useMemo(() => {
    const guessZones: MapZone[] = guessZonesColRows.map((pos, i) => ({
      id: `guess-${i}`,
      pileIndex: i,
      cards: game.guesses[i] ? [game.guesses[i]] : undefined,
      name: "guess",
      col: pos.c,
      row: pos.r + 0.25,
      baseZIndex: 20,
      placeholder: {},
    }));

    const playmatesZones: MapZone[] = getGridColRows({
      cols: 4,
      rows: 3,
      colOffset: 1,
      rowOffset: 2.25,
    }).map((pos, i) => ({
      id: `playmate-${i}`,
      pileIndex: i,
      cards: game.playmates[i] ? [game.playmates[i]] : undefined,
      name: "playmate",
      col: pos.c,
      row: pos.r,
      baseZIndex: 1,
      fan: { maxVisible: 3 },
    }));

    return [
      {
        id: "draw",
        name: "draw",
        cards: game.draw,
        col: 1,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: i18n.t("cards:stock"), infoPos: "left" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 3,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: i18n.t("cards:discard"), infoPos: "left" },
      },
      {
        id: "score",
        name: "score",
        cards: game.scorePile,
        col: 5,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: {
          text: i18n.t("games:elementaryDetective.score"),
          infoPos: "left",
        },
      },
      ...guessZones,
      ...playmatesZones,
    ];
  }, [game]);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "guess" && zone.pileIndex !== undefined) {
      return {
        onPress: () => placeGuess(zone.pileIndex!),
        isDisabled: game.guesses[zone.pileIndex] !== null,
      };
    }
    return {};
  };

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "guess") {
      // ===== Guess ===== //
      if (mappedCard.pileIndex === undefined) return {};
      const guess = game.guesses[mappedCard.pileIndex];
      return {
        onPress: () => {
          if (guess) {
            widthdrawGuess(mappedCard.pileIndex!);
          }
        },
        isPlaceholder: guess === null,
        selectColor: "none",
      };
    } else if (mappedCard.zoneName === "playmate") {
      // ===== Playmate ===== //
      if (mappedCard.pileIndex === undefined || mappedCard.card === undefined)
        return {};
      return {
        selectColor: "none",
        onPress: () => revealPlaymate(mappedCard.pileIndex!),
        isDisabled: !!mappedCard.card.faceUp,
      };
    }

    return {};
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      winLoseMessage={game.winLoseMessage}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}
    </GameWrapper>
  );
}
