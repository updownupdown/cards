import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
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
import { SingularityGraphic } from "./SingularityGraphic";

import { i18n } from "@/i18n";
const pileCount = 17;
/** A deal must offer at least this many absorptions in a row to be playable. */
const MINIMUM_OPENING_MOVES = 2;
const DEAL_ATTEMPTS = 200;

type GameState = {
  piles: PlayingCard[][];
  hole: PlayingCard[];
  ended: boolean;
  won: boolean;
};

export type SingularityGameState = GameState;

const gameStateInitial: GameState = {
  piles: Array.from({ length: pileCount }, () => []),
  hole: [],
  ended: false,
  won: false,
};

/** Rank is adjacent on a 13-rank loop: a step of 1, or the wrap between Ace and King. */
export function adjacentWrap(a: PlayingCard, b: PlayingCard) {
  const diff = Math.abs(rankValue(a) - rankValue(b));
  return diff === 1 || diff === 12;
}

/**
 * How many absorptions can be made one after another from this position,
 * counted no further than `limit` so the search stays cheap. Piles are popped
 * and pushed back as it goes, so they are left exactly as they were found.
 */
export function playableRun(
  piles: PlayingCard[][],
  holeTop: PlayingCard,
  limit: number,
): number {
  if (limit <= 0) return 0;

  let best = 0;
  for (const pile of piles) {
    const exposed = top(pile);
    if (!exposed || !adjacentWrap(exposed, holeTop)) continue;

    pile.pop();
    const run = 1 + playableRun(piles, exposed, limit - 1);
    pile.push(exposed);

    if (run > best) best = run;
    if (best >= limit) break;
  }
  return best;
}

/**
 * A deal the player can actually open with. About one shuffle in 35 leaves no
 * King or Two on top of any pile, which strands the Ace of Spades and ends the
 * game before the first tap; redealing costs nothing and spares the player a
 * game that was lost on arrival.
 */
export function dealPiles() {
  let piles: PlayingCard[][] = [];
  let hole: PlayingCard[] = [];

  for (let attempt = 0; attempt < DEAL_ATTEMPTS; attempt += 1) {
    const deck = shuffle(createDeck({ faceUp: true }));

    // The Ace of Spades opens the singularity.
    const startIndex = deck.findIndex(
      (card) => card.rank === "A" && card.suit === "spades",
    );
    const [start] = deck.splice(startIndex, 1);

    piles = Array.from({ length: pileCount }, () => []);
    deck.forEach((card, i) => piles[i % pileCount].push(flipToFace(card)));
    hole = start ? [flipToFace(start)] : [];

    const holeTop = top(hole);
    if (
      holeTop &&
      playableRun(piles, holeTop, MINIMUM_OPENING_MOVES) >=
        MINIMUM_OPENING_MOVES
    ) {
      break;
    }
  }

  return { piles, hole };
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  const { piles, hole } = dealPiles();

  setGame((draft) => {
    draft.piles = piles;
    draft.hole = hole;
    draft.ended = false;
    draft.won = false;
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
    return exposed && holeTop ? adjacentWrap(exposed, holeTop) : false;
  });

  if (!anyMove) return { ended: true, won: false };
  return { ended: false, won: false };
}

export const singularityRules = {
  adjacentWrap,
  evaluateEnd,
  playableRun,
  dealPiles,
  MINIMUM_OPENING_MOVES,
};

// ========== Main Component ========== //
export default function Singularity() {
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
      await resetAndSetup(setGame);
    },
    gameStateInitial,
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
    if (!exposed || !holeTop || !adjacentWrap(exposed, holeTop)) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const card = draft.piles[pileIndex].pop();
      if (card) draft.hole.push(card);
    });
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const pilePositions = getGridColRows({
      cols: 6,
      rows: 3,
      rowOffset: 1.3,
      scaleY: 2,
    });

    const pileZones: MapZone[] = [];
    for (let i = 0; i < pileCount; i += 1) {
      const pos = pilePositions[i];
      pileZones.push({
        id: `pile-${i}`,
        name: "pile",
        pileIndex: i,
        cards: game.piles[i],
        col: pos.c,
        row: pos.r,
        baseZIndex: 1,
        height: 2,
        fan: { direction: "down", offset: 0.46, maxVisible: 3, center: false },
      });
    }

    return [
      {
        id: "hole",
        name: "hole",
        cards: game.hole,
        col: 2.5,
        row: 0,
        baseZIndex: 60,
      },
      {
        id: "hole-graphic",
        name: "hole-graphic",
        col: 2.5,
        row: 0,
        baseZIndex: 1,
      },
      ...pileZones,
    ];
  }, [game]);

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

    const canPlay = !!holeTop && adjacentWrap(mappedCard.card, holeTop);
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
    gap: 0.14,
    cardSize: "small",
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:singularity.everyStarCollapsedIn")
          : i18n.t("games:singularity.noCardCanReachThe")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[getZoneStylesById("hole-graphic")]}>
        <SingularityGraphic size={cardWidth} />
      </View>
    </GameWrapper>
  );
}
