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
  top,
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
    throw new Error("Hide and Seek requires four Jacks, Queens, and Kings.");
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

  throw new Error("Unable to create valid Hide and Seek playmate columns.");
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

export type HideAndSeekGameState = GameState;

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
      ? `You scored ${score} (20 to win)`
      : state.winLoseMessage,
  };
}

export const hideAndSeekRules = {
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
export default function HideAndSeek() {
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
    });

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
        placeholder: { text: "Stock", infoPos: "left" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 3,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Discard", infoPos: "left" },
      },
      {
        id: "score",
        name: "score",
        cards: game.scorePile,
        col: 5,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Score", infoPos: "left" },
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
