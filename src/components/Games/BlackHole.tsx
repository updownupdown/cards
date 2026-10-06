import { useStateManager } from "@/hooks/useStateManager";
import { useGameVariant } from "@/hooks/useGameVariant";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  flipToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { View } from "react-native";
import { BlackHoleGraphic } from "./BlackHoleGraphic";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
import { planMove } from "@/hints/lookahead";

/**
 * Black Hole: seventeen fans of three around the Ace of Spades.
 * All in a Row: thirteen columns of four, laid out in one landscape row, and
 * the first card played may be any exposed card.
 */
const VARIANTS = {
  "black-hole": { pileCount: 17, pileSize: 3, startWithAceOfSpades: true },
  "all-in-a-row": { pileCount: 13, pileSize: 4, startWithAceOfSpades: false },
} as const;

type BlackHoleVariant = keyof typeof VARIANTS;

/** A deal must offer at least this many absorptions in a row to be playable. */
const MINIMUM_OPENING_MOVES = 2;
const DEAL_ATTEMPTS = 200;

type GameState = {
  piles: PlayingCard[][];
  hole: PlayingCard[];
  ended: boolean;
  won: boolean;
};

export type BlackHoleGameState = GameState;

// Every card starts in the black hole, face down, and is dealt out from it.
function createGatheredState(variant: BlackHoleVariant): GameState {
  return {
    piles: Array.from({ length: VARIANTS[variant].pileCount }, () => []),
    hole: createDeck(),
    ended: false,
    won: false,
  };
}

/** Rank is adjacent on a 13-rank loop: a step of 1, or the wrap between Ace and King. */
export function adjacentWrap(a: PlayingCard, b: PlayingCard) {
  const diff = Math.abs(rankValue(a) - rankValue(b));
  return diff === 1 || diff === 12;
}

/** Any card may start an empty hole; after that, ranks must be adjacent. */
function canAbsorb(card: PlayingCard, holeTop: PlayingCard | undefined) {
  return !holeTop || adjacentWrap(card, holeTop);
}

/**
 * How many absorptions can be made one after another from this position,
 * counted no further than `limit` so the search stays cheap. Piles are popped
 * and pushed back as it goes, so they are left exactly as they were found.
 */
export function playableRun(
  piles: PlayingCard[][],
  holeTop: PlayingCard | undefined,
  limit: number,
): number {
  if (limit <= 0) return 0;

  let best = 0;
  for (const pile of piles) {
    const exposed = top(pile);
    if (!exposed || !canAbsorb(exposed, holeTop)) continue;

    pile.pop();
    const run = 1 + playableRun(piles, exposed, limit - 1);
    pile.push(exposed);

    if (run > best) best = run;
    if (best >= limit) break;
  }
  return best;
}

/**
 * A deal the player can actually open with. About one Black Hole shuffle in
 * 35 leaves no King or Two on top of any pile, which strands the Ace of
 * Spades and ends the game before the first tap; redealing costs nothing and
 * spares the player a game that was lost on arrival. The same cards are
 * reshuffled for each attempt, so they are dealt from wherever they were
 * gathered.
 */
export function dealPiles(
  cards: PlayingCard[] = createDeck(),
  variant: BlackHoleVariant = "black-hole",
) {
  const { pileCount, pileSize, startWithAceOfSpades } = VARIANTS[variant];
  let piles: PlayingCard[][] = [];
  let hole: PlayingCard[] = [];

  for (let attempt = 0; attempt < DEAL_ATTEMPTS; attempt += 1) {
    const deck = shuffle(cards);
    hole = [];

    // The Ace of Spades opens the black hole.
    if (startWithAceOfSpades) {
      const startIndex = deck.findIndex(
        (card) => card.rank === "A" && card.suit === "spades",
      );
      const [start] = deck.splice(startIndex, 1);
      if (start) hole = [flipToFace(start)];
    }

    piles = Array.from({ length: pileCount }, (_, index) =>
      deck.slice(index * pileSize, index * pileSize + pileSize).map(flipToFace),
    );

    if (
      playableRun(piles, top(hole), MINIMUM_OPENING_MOVES) >=
      MINIMUM_OPENING_MOVES
    ) {
      break;
    }
  }

  return { piles, hole };
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
  variant: BlackHoleVariant,
) {
  // Gather every card into the black hole, face down.
  setGame((draft) => {
    draft.hole = shuffle(flipAllToBack([...draft.hole, ...draft.piles.flat()]));
    draft.piles = Array.from({ length: VARIANTS[variant].pileCount }, () => []);
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  // Deal them back out, leaving the Ace of Spades behind in Black Hole.
  setGame((draft) => {
    const { piles, hole } = dealPiles(draft.hole, variant);
    draft.piles = piles;
    draft.hole = hole;
  });

  await delay();
}

function evaluateEnd(state: GameState, isSettingUp = false) {
  if (isSettingUp) return { ended: false, won: false };

  const cardsLeft = state.piles.reduce((sum, pile) => sum + pile.length, 0);
  if (cardsLeft === 0) return { ended: true, won: true };

  const holeTop = top(state.hole);
  const anyMove = state.piles.some((pile) => {
    const exposed = top(pile);
    return exposed ? canAbsorb(exposed, holeTop) : false;
  });

  if (!anyMove) return { ended: true, won: false };
  return { ended: false, won: false };
}

/**
 * Every card is on view: the hint looks deep for the longest run into the
 * hole, keeping the fans even so no card ends up buried.
 */
function findBlackHoleHint(state: GameState) {
  const move = planMove<GameState, number>(state, {
    key: (current) =>
      `hole:${current.piles.map((pile) => pile.length).join(",")}:${top(current.hole)?.id}`,
    moves: (current) =>
      current.piles.flatMap((pile, index) => {
        const card = top(pile);
        return card && canAbsorb(card, top(current.hole)) ? [index] : [];
      }),
    apply: (current, index) => ({
      ...current,
      piles: current.piles.map((pile, at) =>
        at === index ? pile.slice(0, -1) : pile,
      ),
      hole: [...current.hole, top(current.piles[index])!],
    }),
    score: (current, depth) =>
      depth * 100 -
      current.piles.reduce((sum, pile) => sum + pile.length ** 2, 0) / 4,
    budget: 6000,
  });
  return move === null
    ? null
    : makeHint(
        "toFoundation",
        cardTarget(top(state.piles[move])!),
        zoneTarget("hole"),
      );
}

export const blackHoleRules = {
  findHint: findBlackHoleHint,
  adjacentWrap,
  canAbsorb,
  evaluateEnd,
  playableRun,
  dealPiles,
  MINIMUM_OPENING_MOVES,
};

/** Black Hole's fans sit in a 6 x 3 grid under the hole. */
function fanZones(game: GameState): MapZone[] {
  const pilePositions = getGridColRows({
    cols: 6,
    rows: 3,
    rowOffset: 1.3,
    scaleY: 2,
  });

  return [
    {
      id: "hole",
      name: "hole",
      cards: game.hole,
      col: 2.5,
      row: 0,
      baseZIndex: 60,
      fan: { maxVisible: 2, offset: 0 },
    },
    {
      id: "hole-graphic",
      name: "hole-graphic",
      col: 2.5,
      row: 0,
      baseZIndex: 1,
    },
    ...game.piles.map((pile, i) => ({
      id: `pile-${i}`,
      name: "pile",
      pileIndex: i,
      cards: pile,
      col: pilePositions[i].c,
      row: pilePositions[i].r,
      baseZIndex: 1,
      height: 2,
      fan: {
        direction: "down" as const,
        offset: 0.46,
        maxVisible: 3,
        center: false,
      },
    })),
  ];
}

/** All in a Row's thirteen columns sit in one landscape row under the hole. */
function rowZones(game: GameState): MapZone[] {
  return [
    {
      id: "hole",
      name: "hole",
      cards: game.hole,
      col: 6,
      row: 0,
      baseZIndex: 60,
      fan: { maxVisible: 2, offset: 0 },
    },
    { id: "hole-graphic", name: "hole-graphic", col: 6, row: 0, baseZIndex: 1 },
    ...game.piles.map((pile, index) => ({
      id: `pile-${index}`,
      name: "pile",
      pileIndex: index,
      cards: pile,
      col: index,
      row: 1.1,
      fan: {
        direction: "down" as const,
        offset: cardDims.smallCardOffset,
      },
    })),
  ];
}

// ========== Main Component ========== //
export default function BlackHole() {
  const variant = useGameVariant("/black-hole");
  if (!variant) return null;
  return <BlackHoleBoard key={variant} variant={variant} />;
}

function BlackHoleBoard({ variant }: { variant: BlackHoleVariant }) {
  const inRow = variant === "all-in-a-row";
  const gameStateInitial = useMemo(
    () => createGatheredState(variant),
    [variant],
  );
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
      await resetAndSetup(setGame, variant);
    },
    gameStateInitial,
  });

  useHint(() => findBlackHoleHint(game), {
    game,
    enabled: !isSettingUp && !game.ended,
  });

  useEffect(() => {
    const { ended, won } = evaluateEnd(game, isSettingUp);
    if (ended !== game.ended || won !== game.won) {
      setGame((draft) => {
        draft.ended = ended;
        draft.won = won;
      });
    }
  }, [game, isSettingUp, setGame]);

  const holeTop = top(game.hole);

  function absorb(pileIndex: number) {
    if (game.ended) return;
    const exposed = top(game.piles[pileIndex]);
    if (!exposed || !canAbsorb(exposed, holeTop)) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const card = draft.piles[pileIndex].pop();
      if (card) draft.hole.push(card);
    });
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(
    () => (inRow ? rowZones(game) : fanZones(game)),
    [game, inRow],
  );

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (
      mappedCard.zoneName !== "pile" ||
      mappedCard.pileIndex === undefined ||
      !mappedCard.topOfZone
    ) {
      return {};
    }

    const canPlay = canAbsorb(mappedCard.card, holeTop);
    return {
      isDisabled: game.ended || !canPlay,
      selectColor: canPlay ? "green" : "none",
      onPress: () => absorb(mappedCard.pileIndex!),
    };
  };

  const { cardMap, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    ...(inRow ? { fixedCols: 13, fixedRows: 3.5, gap: 0.08 } : { gap: 0.14 }),
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        inRow
          ? game.won
            ? i18n.t("games:allInARow.youClearedTheBoard")
            : i18n.t("games:allInARow.noAdjacentRankRemains")
          : game.won
            ? i18n.t("games:blackHole.everyStarCollapsedIn")
            : i18n.t("games:blackHole.noCardCanReachThe")
      }
      canUndo={canUndo}
      undo={undo}
      showDeviceRotateHint={inRow ? "landscape" : undefined}
    >
      {cardMap}

      <View style={[getZoneStylesById("hole-graphic")]}>
        {/* Only cards swallowed in play count: a gathered deck waits in the
            hole face down. */}
        <BlackHoleGraphic
          size={cardWidth}
          absorbed={game.hole.filter((card) => card.faceUp).length}
        />
      </View>
    </GameWrapper>
  );
}
