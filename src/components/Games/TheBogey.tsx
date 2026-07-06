import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const MAX_COLUMNS = 12;
const HAND_SIZE = 5;

type GameState = {
  hand: (PlayingCard | null)[];
  columns: (PlayingCard[] | null)[];
  deck: PlayingCard[];
  discard: PlayingCard[];
  currentBogeyCard: PlayingCard | null;
  awaitingBogeyPlacement: boolean;
  selectedHandCardId: string | null;
  playerTurnEnded: boolean;
  ended: boolean;
  won: boolean;
  winLoseMessage?: string;
};

function getWinTier(columnCount: number) {
  switch (columnCount) {
    case 12:
      return "novice";
    case 11:
      return "normal";
    case 10:
      return "advanced";
    case 9:
      return "legendary";
    default:
      return "epic";
  }
}

function canPlayCard(
  card: PlayingCard,
  columns: (PlayingCard[] | null)[],
): number[] {
  const validColumns: number[] = [];

  for (let i = 0; i < columns.length; i += 1) {
    const column = columns[i];

    // Column is empty
    if (column === null) {
      validColumns.push(i);
      continue;
    }

    // Column can fit card
    const lastCard = top(column);
    if (
      lastCard &&
      lastCard.suit === card.suit &&
      rankValue(lastCard) > rankValue(card)
    ) {
      validColumns.push(i);
    }
  }

  return validColumns;
}

function allCardsPlaced(state: GameState) {
  return (
    state.hand.length === 0 &&
    state.deck.length === 0 &&
    state.discard.length === 0 &&
    state.currentBogeyCard === null
  );
}

function finishCompletedGame(draft: GameState) {
  const tier = getWinTier(draft.columns.length);

  draft.ended = true;
  draft.won = tier !== null;
  draft.playerTurnEnded = false;
  draft.awaitingBogeyPlacement = false;
  draft.selectedHandCardId = null;
  draft.currentBogeyCard = null;

  if (tier) {
    draft.winLoseMessage = `${draft.columns.length} columns used. ${tier.toUpperCase()} win.`;
  } else {
    draft.winLoseMessage = `All cards played in ${draft.columns.length} columns.`;
  }
}

function recycleDiscardIntoDeck(draft: GameState) {
  if (draft.deck.length > 0 || draft.discard.length === 0) return;

  draft.deck = shuffle(flipAllToBack(draft.discard));
  draft.discard = [];
}

function drawFromDeck(draft: GameState): PlayingCard | null {
  recycleDiscardIntoDeck(draft);
  return draft.deck.pop() ?? null;
}

function refillPlayerHand(draft: GameState) {
  for (let i = 0; i < HAND_SIZE; i += 1) {
    const hasCard = !!draft.hand[i];
    if (hasCard) continue;

    const next = drawFromDeck(draft);
    if (!next) break;

    draft.hand[i] = flipToFace(next);
  }
}

const gameStateInitial: GameState = {
  hand: [],
  columns: Array.from({ length: MAX_COLUMNS }, () => null),
  deck: createDeck(),
  discard: [],
  currentBogeyCard: null,
  awaitingBogeyPlacement: false,
  ended: false,
  won: false,
  playerTurnEnded: false,
  selectedHandCardId: null,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.hand.filter((c): c is PlayingCard => c !== null),
      ...draft.columns
        .filter((col): col is PlayingCard[] => col !== null)
        .flat(),
      ...draft.discard,
      ...draft.deck,
      ...(draft.currentBogeyCard ? [draft.currentBogeyCard] : []),
    ];

    draft.deck = shuffle(flipAllToBack(allCards));
    draft.discard = [];
    draft.hand = [];
    draft.columns = Array.from({ length: MAX_COLUMNS }, () => null);
    draft.currentBogeyCard = null;
    draft.awaitingBogeyPlacement = false;
    draft.ended = false;
    draft.won = false;
    draft.playerTurnEnded = false;
    draft.selectedHandCardId = null;
  });

  await delay();

  setGame((draft) => {
    while (draft.hand.length < HAND_SIZE) {
      const next = draft.deck.pop();
      if (!next) break;

      draft.hand.push(flipToFace(next));
    }
  });
}

export default function TheBogey() {
  const { zoneBg } = useGameZoneBackground();

  const {
    game,
    setGame,
    reset,
    isLoaded,
    showIntro,
    setShowIntro,
    canUndo,
    undo,
    saveUndoState,
  } = useStateManager({
    gameStateInitial,
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
  });

  const selectedHandCard = useMemo(
    () =>
      game.selectedHandCardId
        ? (game.hand.find(
            (card) => card && card.id === game.selectedHandCardId,
          ) ?? null)
        : null,
    [game.hand, game.selectedHandCardId],
  );

  const { validPlacementTargets } = useMemo(() => {
    const placementCard = game.awaitingBogeyPlacement
      ? game.currentBogeyCard
      : selectedHandCard;

    return {
      activePlacementCard: placementCard,
      validPlacementTargets: placementCard
        ? canPlayCard(placementCard, game.columns)
        : [],
    };
  }, [
    game.awaitingBogeyPlacement,
    game.columns,
    game.currentBogeyCard,
    selectedHandCard,
  ]);

  // Refill player hand to 5 when a player turn starts (including after Bogey placement).
  useEffect(() => {
    if (
      game.ended ||
      game.playerTurnEnded ||
      game.awaitingBogeyPlacement ||
      game.currentBogeyCard
    ) {
      return;
    }

    setGame((draft) => {
      refillPlayerHand(draft);
    });
  }, [
    game.awaitingBogeyPlacement,
    game.currentBogeyCard,
    game.ended,
    game.playerTurnEnded,
    setGame,
  ]);

  // Bogey turn: draw one card, then the player chooses where it goes.
  useEffect(() => {
    if (
      game.ended ||
      !game.playerTurnEnded ||
      game.awaitingBogeyPlacement ||
      game.currentBogeyCard
    ) {
      return;
    }

    setGame((draft) => {
      const bogeyCard = drawFromDeck(draft);

      if (!bogeyCard) {
        draft.playerTurnEnded = false;

        if (allCardsPlaced(draft)) {
          finishCompletedGame(draft);
        }

        return;
      }

      const validColumns = canPlayCard(bogeyCard, draft.columns);
      draft.currentBogeyCard = flipToFace(bogeyCard);

      if (validColumns.length === 0) {
        draft.awaitingBogeyPlacement = false;
        draft.ended = true;
        draft.won = false;
        draft.winLoseMessage = `Bogey card cannot be played.`;
        return;
      }

      draft.awaitingBogeyPlacement = true;
    });
  }, [
    game.awaitingBogeyPlacement,
    game.currentBogeyCard,
    game.ended,
    game.playerTurnEnded,
    setGame,
  ]);

  function handleSelectHandCard(cardId: string) {
    if (game.ended || game.playerTurnEnded || game.awaitingBogeyPlacement) {
      return;
    }

    setGame((draft) => {
      draft.selectedHandCardId =
        draft.selectedHandCardId === cardId ? null : cardId;
    });
  }

  function handleColumnSelection(columnIdx: number) {
    if (game.ended) return;

    const isBogeyPlacement =
      game.awaitingBogeyPlacement && !!game.currentBogeyCard;
    const sourceCard = isBogeyPlacement
      ? game.currentBogeyCard
      : selectedHandCard;

    if (!sourceCard) return;

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const playableCard = isBogeyPlacement
        ? draft.currentBogeyCard
        : draft.hand.find(
            (card) => card && card.id === draft.selectedHandCardId,
          );

      if (!playableCard) return;

      draft.columns[columnIdx]?.push(playableCard) ||
        (draft.columns[columnIdx] = [playableCard]);

      if (isBogeyPlacement) {
        draft.currentBogeyCard = null;
        draft.awaitingBogeyPlacement = false;
        draft.playerTurnEnded = false;
      } else {
        draft.hand = draft.hand.map((card) =>
          card && card.id === playableCard.id ? null : card,
        );
        draft.selectedHandCardId = null;
      }

      if (allCardsPlaced(draft)) {
        finishCompletedGame(draft);
      }
    });
  }

  function handleDiscardSelectedCard() {
    if (
      game.ended ||
      game.playerTurnEnded ||
      game.awaitingBogeyPlacement ||
      !selectedHandCard
    ) {
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const selected = draft.hand.find(
        (card) => card && card.id === draft.selectedHandCardId,
      );
      if (!selected) return;

      draft.hand = draft.hand.map((card) =>
        card && card.id === selected.id ? null : card,
      );
      draft.discard.push(flipToBack(selected));
      draft.selectedHandCardId = null;
    });
  }

  function handleEndTurn() {
    if (game.ended || game.playerTurnEnded || game.awaitingBogeyPlacement) {
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      draft.playerTurnEnded = true;
      draft.selectedHandCardId = null;
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const columnZones: MapZone[] = Array.from(
      { length: MAX_COLUMNS },
      (_, idx) => ({
        id: `column-${idx}`,
        name: "column",
        pileIndex: idx,
        cards: game.columns[idx] ?? [],
        col: idx % 6,
        row: 1.1 + Math.floor(idx / 6) * 1.5,
        height: 1.5,
        baseZIndex: 1,
        fan: {
          direction: "down",
          offset: 0.1,
          maxVisible: 6,
          center: false,
        },
        placeholder: {},
      }),
    );

    const handZones: MapZone[] = Array.from({ length: HAND_SIZE }).map(
      (_, idx) => {
        const card = game.hand[idx];
        return {
          id: `hand-${card?.id ?? idx}`,
          name: "hand",
          refIndex: idx,
          cards: card ? [card] : [],
          col: 0.5 + idx * 1,
          row: 5.2,
          baseZIndex: 30,
          placeholder: {},
        };
      },
    );

    return [
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Deck", infoPos: "right" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 1.5,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Discard", infoPos: "right" },
      },
      {
        id: "bogey",
        name: "bogey",
        cards: game.currentBogeyCard ? [game.currentBogeyCard] : [],
        col: 5,
        row: 0,
        baseZIndex: 50,
        placeholder: { text: "Bogey", infoPos: "left", showCount: false },
      },
      ...columnZones,
      ...handZones,
      {
        id: "actions",
        col: 0,
        row: 4.3,
        width: "full",
        height: 0.7,
        baseZIndex: 1,
      },
    ];
  }, [game.columns, game.currentBogeyCard, game.deck, game.discard, game.hand]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand") {
      const isSelected = mappedCard.card.id === game.selectedHandCardId;

      return {
        onPress: () => handleSelectHandCard(mappedCard.card.id),
        isDisabled:
          game.ended || game.playerTurnEnded || game.awaitingBogeyPlacement,
        selectColor: isSelected ? "blue" : "none",
        isSelected,
        forceSelectColor: isSelected,
      };
    } else if (
      mappedCard.zoneName === "column" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isTopCard = mappedCard.topOfZone;
      const isValidTarget = validPlacementTargets.includes(
        mappedCard.pileIndex,
      );

      return {
        onPress: () => {
          if (isTopCard) {
            handleColumnSelection(mappedCard.pileIndex!);
          }
        },
        isDisabled: !isTopCard || !isValidTarget,
        selectColor: isValidTarget && isTopCard ? "green" : "none",
        forceOverlayColor: isValidTarget && isTopCard,
      };
    } else if (mappedCard.zoneName === "discard") {
      return {
        clickThroughCards: true,
      };
    } else if (mappedCard.zoneName === "bogey") {
      return {
        isSelected: true,
        selectColor: "blue",
      };
    }

    return {};
  };

  const zoneMapper = (zone: MapZone) => {
    if (zone.name === "column") {
      const isValid =
        zone.pileIndex === undefined ||
        validPlacementTargets.includes(zone.pileIndex);

      return {
        onPress: () => handleColumnSelection(zone.pileIndex!),
        isDisabled: !isValid,
        // selectColor: isValid ? "green" : "none",
        // forceOverlayColor: isValid,
      };
    } else if (zone.name === "discard") {
      const isDisabled =
        game.ended ||
        game.playerTurnEnded ||
        game.awaitingBogeyPlacement ||
        !selectedHandCard;

      return {
        onPress: () => {
          if (game.awaitingBogeyPlacement) return;
          handleDiscardSelectedCard();
        },
        isDisabled,
        selectColor: isDisabled ? "none" : "orange",
        forceOverlayColor: !isDisabled,
      };
    }

    return;
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: 0.2,
    cardSize: "small",
    cardMapper,
    zoneMapper,
  });

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[getZoneStylesById("actions"), flexStyles.colCentered]}>
        <Button
          text="End Turn"
          theme="blue"
          size="sm"
          onPress={handleEndTurn}
          disabled={
            game.ended || game.playerTurnEnded || game.awaitingBogeyPlacement
          }
          fullWidth
          taller
        />
      </View>
    </GameWrapper>
  );
}
