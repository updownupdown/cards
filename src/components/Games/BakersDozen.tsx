import { useStateManager } from "@/hooks/useStateManager";
import { DOUBLE_TAP_MS, delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  flipToFace,
  RANK_VALUE,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
const COLUMN_COUNT = 13;
const CARDS_PER_COLUMN = 4;

type BakersDozenState = {
  shuffleZone: PlayingCard[];
  tableau: PlayingCard[][];
  foundations: PlayingCard[][];
};

function moveKingsToBottom(column: PlayingCard[]) {
  return [
    ...column.filter((card) => card.rank === "K"),
    ...column.filter((card) => card.rank !== "K"),
  ];
}

function dealTableau(deck: PlayingCard[]) {
  const tableau: PlayingCard[][] = Array.from(
    { length: COLUMN_COUNT },
    () => [],
  );

  for (let columnIndex = 0; columnIndex < COLUMN_COUNT; columnIndex += 1) {
    for (let cardIndex = 0; cardIndex < CARDS_PER_COLUMN; cardIndex += 1) {
      const card = deck.pop();
      if (card) tableau[columnIndex].push(flipToFace(card));
    }
    tableau[columnIndex] = moveKingsToBottom(tableau[columnIndex]);
  }

  return tableau;
}

function canBuildOnTableau(
  movingCard: PlayingCard,
  destinationCard?: PlayingCard,
) {
  return (
    !!destinationCard &&
    RANK_VALUE[movingCard.rank] + 1 === RANK_VALUE[destinationCard.rank]
  );
}

function canBuildOnFoundation(
  movingCard: PlayingCard,
  destinationCard?: PlayingCard,
) {
  if (!destinationCard) return movingCard.rank === "A";
  return (
    movingCard.suit === destinationCard.suit &&
    RANK_VALUE[movingCard.rank] === RANK_VALUE[destinationCard.rank] + 1
  );
}

function getFoundationTarget(card: PlayingCard, foundations: PlayingCard[][]) {
  const matchingPile = foundations.findIndex((pile) =>
    canBuildOnFoundation(card, top(pile)),
  );
  return matchingPile >= 0 ? matchingPile : null;
}

function createInitialState(): BakersDozenState {
  return {
    shuffleZone: flipAllToBack(shuffle(createDeck())),
    tableau: [],
    foundations: Array.from({ length: 4 }, () => [] as PlayingCard[]),
  };
}

export const bakersDozenRules = {
  canBuildOnFoundation,
  canBuildOnTableau,
  dealTableau,
  getFoundationTarget,
  moveKingsToBottom,
};

const gameStateInitial = createInitialState();

export default function BakersDozen() {
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [lastTap, setLastTap] = useState<{ column: number; at: number } | null>(
    null,
  );

  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<BakersDozenState>({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedColumn(null);
        setLastTap(null);
      },
      resetAndSetup: async () => {
        setGame((draft) => {
          draft.shuffleZone = flipAllToBack(
            shuffle([
              ...draft.shuffleZone,
              ...draft.tableau.flat(),
              ...draft.foundations.flat(),
            ]),
          );
          draft.tableau = [];
          draft.foundations = Array.from(
            { length: 4 },
            () => [] as PlayingCard[],
          );
        });
      },
      postSetupAction: async () => {
        await delay();
        setGame((draft) => {
          draft.tableau = dealTableau(draft.shuffleZone);
          draft.shuffleZone = [];
        });
      },
    });

  const won = useMemo(
    () => game.foundations.every((pile) => pile.length === 13),
    [game.foundations],
  );

  function moveToFoundation(columnIndex: number) {
    const card = top(game.tableau[columnIndex]);
    if (!card) return false;

    const foundationIndex = getFoundationTarget(card, game.foundations);
    if (foundationIndex === null) return false;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const movingCard = draft.tableau[columnIndex]?.pop();
      if (!movingCard) return;
      draft.foundations[foundationIndex].push(movingCard);
      if (draft.tableau[columnIndex].length === 0) {
        draft.tableau.splice(columnIndex, 1);
      }
    });
    setSelectedColumn(null);
    return true;
  }

  function moveToColumn(sourceIndex: number, destinationIndex: number) {
    const movingCard = top(game.tableau[sourceIndex]);
    const destinationCard = top(game.tableau[destinationIndex]);
    if (
      !movingCard ||
      sourceIndex === destinationIndex ||
      !canBuildOnTableau(movingCard, destinationCard)
    ) {
      return false;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = draft.tableau[sourceIndex].pop();
      if (!card) return;
      draft.tableau[destinationIndex].push(card);
      if (draft.tableau[sourceIndex].length === 0) {
        draft.tableau.splice(sourceIndex, 1);
      }
    });
    setSelectedColumn(null);
    return true;
  }

  function onColumnPress(columnIndex: number) {
    if (won) return;

    const now = Date.now();
    if (lastTap?.column === columnIndex && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      if (moveToFoundation(columnIndex)) return;
    } else {
      setLastTap({ column: columnIndex, at: now });
    }

    if (selectedColumn === null) {
      setSelectedColumn(columnIndex);
      return;
    }

    if (selectedColumn === columnIndex) {
      setSelectedColumn(null);
      return;
    }

    if (!moveToColumn(selectedColumn, columnIndex)) {
      setSelectedColumn(columnIndex);
    }
  }

  const zones: MapZone[] = useMemo(() => {
    const foundationZones = game.foundations.map((pile, pileIndex) => ({
      id: `foundation-${pileIndex}`,
      name: "foundation",
      pileIndex,
      cards: pile,
      col: 4.5 + pileIndex,
      row: 0,
      baseZIndex: 40 + pileIndex,
      fan: { maxVisible: 1 },
      placeholder: {},
    }));

    const tableauZones = game.tableau.map((pile, columnIndex) => ({
      id: `tableau-${columnIndex}`,
      name: "tableau",
      pileIndex: columnIndex,
      cards: pile,
      col: columnIndex + (COLUMN_COUNT - game.tableau.length) / 2,
      row: 1.2,
      baseZIndex: 10 + columnIndex,
      fan: { direction: "down" as const, offset: cardDims.tableauOffset },
    }));

    return [
      {
        id: "shuffle",
        name: "shuffle",
        cards: game.shuffleZone,
        col: 0,
        row: 0,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
      },
      ...foundationZones,
      ...tableauZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (
      mappedCard.zoneName !== "tableau" ||
      mappedCard.pileIndex === undefined
    ) {
      return {};
    }

    return {
      isSelected:
        mappedCard.topOfZone && selectedColumn === mappedCard.pileIndex,
      selectColor: "blue",
      isDisabled: won,
      onPress: () => onColumnPress(mappedCard.pileIndex!),
    };
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "tableau",
    fixedCols: COLUMN_COUNT,
    fixedRows: 4.6,
    gap: 0.1,
  });

  return (
    <GameWrapper
      outcome={won ? "won" : "playing"}
      reset={() => {
        void reset();
      }}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={i18n.t("games:bakersDozen.allFourSuitsAreComplete")}
      showDeviceRotateHint
    >
      {cardMap}
    </GameWrapper>
  );
}
