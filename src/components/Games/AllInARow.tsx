import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  flipToFace,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { adjacentWrap } from "./Singularity";

import { i18n } from "@/i18n";
export type AllInARowState = {
  piles: PlayingCard[][];
  foundation: PlayingCard[];
  ended: boolean;
  won: boolean;
};

const gameStateInitial: AllInARowState = {
  piles: [],
  foundation: createDeck({ faceUp: false }),
  ended: false,
  won: false,
};

function deal(deck: PlayingCard[]): AllInARowState {
  return {
    piles: Array.from({ length: 13 }, (_, index) =>
      deck.slice(index * 4, index * 4 + 4).map((card) => flipToFace(card)),
    ),
    foundation: [],
    ended: false,
    won: false,
  };
}

function createInitialState(): AllInARowState {
  return deal(shuffle(createDeck({ faceUp: false })));
}

async function resetAndSetup(
  setGame: (updater: (draft: AllInARowState) => void) => void,
) {
  setGame((draft) => {
    draft.foundation = flipAllToBack([
      ...draft.foundation,
      ...draft.piles.flat(),
    ]);
    draft.piles = [];
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    const next = deal(shuffle(draft.foundation));
    Object.assign(draft, next);
  });
}

function canPlay(card: PlayingCard, foundationTop?: PlayingCard) {
  return !foundationTop || adjacentWrap(card, foundationTop);
}

function evaluate(state: AllInARowState) {
  const cardsLeft = state.piles.reduce((sum, pile) => sum + pile.length, 0);
  if (cardsLeft === 0) return { ended: true, won: true };
  const foundationTop = top(state.foundation);
  const anyMove = state.piles.some((pile) => {
    const card = top(pile);
    return card && canPlay(card, foundationTop);
  });
  return { ended: !anyMove, won: false };
}

export const allInARowRules = { canPlay, createInitialState, evaluate };

export default function AllInARow() {
  const {
    isSettingUp,
    isLoaded,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<AllInARowState>({
    gameStateInitial,
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
  });

  useEffect(() => {
    if (isSettingUp) return;

    const result = evaluate(game);
    if (result.ended !== game.ended || result.won !== game.won) {
      setGame((draft) => {
        draft.ended = result.ended;
        draft.won = result.won;
      });
    }
  }, [game, setGame]);

  const foundationTop = top(game.foundation);

  function playCard(pileIndex: number) {
    const card = top(game.piles[pileIndex]);
    if (game.ended || !card || !canPlay(card, foundationTop)) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const moved = draft.piles[pileIndex].pop();
      if (moved) draft.foundation.push(moved);
    });
  }

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "foundation",
        name: "foundation",
        cards: game.foundation,
        col: 6,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 100,
      },
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
    ],
    [game],
  );

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    if (
      card.zoneName !== "pile" ||
      card.pileIndex === undefined ||
      !card.topOfZone
    )
      return {};
    const playable = canPlay(card.card, foundationTop);
    return {
      isDisabled: game.ended || !playable,
      selectColor: playable ? "green" : "none",
      onPress: () => playCard(card.pileIndex!),
    };
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    fixedCols: 13,
    fixedRows: 3.5,
    gap: 0.08,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={game.foundation.length}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        game.won
          ? i18n.t("games:allInARow.youClearedTheBoard")
          : i18n.t("games:allInARow.noAdjacentRankRemains")
      }
      showDeviceRotateHint="landscape"
    >
      {cardMap}
    </GameWrapper>
  );
}
