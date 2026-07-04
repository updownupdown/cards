import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { FontWeight, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import {
  AnimatedCardMapping,
  bufferedDefaultAnimDuration,
} from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToFace,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { Button } from "../Button/Button";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

const MAX_COLUMNS = 12;
const HAND_SIZE = 5;

const WIN_COLUMNS = {
  novice: 12,
  normal: 11,
  advanced: 10,
  legendary: 9,
  epic: 8,
} as const;

type WinTier = keyof typeof WIN_COLUMNS;

const WIN_TIER_ORDER: WinTier[] = [
  "epic",
  "legendary",
  "advanced",
  "normal",
  "novice",
];

type GameState = {
  hand: PlayingCard[];
  columns: PlayingCard[][];
  deck: PlayingCard[];
  discard: PlayingCard[];
  currentBogeyCard: PlayingCard | null;
  awaitingBogeyPlacement: boolean;
  gameEnded: boolean;
  won: boolean;
  achievedTier: WinTier | null;
  lastAction: string;
  playerTurnEnded: boolean;
  selectedHandCardId: string | null;
};

function cardLabel(card: PlayingCard) {
  return `${card.rank} of ${card.suit}`;
}

function getWinTier(columnCount: number): WinTier | null {
  return WIN_TIER_ORDER.find((tier) => columnCount <= WIN_COLUMNS[tier]) ?? null;
}

function canPlayCard(card: PlayingCard, columns: PlayingCard[][]): number[] {
  const validColumns: number[] = [];

  for (let i = 0; i < columns.length; i += 1) {
    const column = columns[i];
    const lastCard = column[column.length - 1];

    if (!lastCard) continue;

    if (lastCard.suit === card.suit && rankValue(lastCard) > rankValue(card)) {
      validColumns.push(i);
    }
  }

  if (columns.length < MAX_COLUMNS) {
    validColumns.push(-1);
  }

  return validColumns;
}

function playCardToColumn(
  card: PlayingCard,
  columnIndex: number,
  columns: PlayingCard[][],
): PlayingCard[][] {
  const nextColumns = columns.map((col) => [...col]);

  if (columnIndex === -1) {
    nextColumns.push([card]);
  } else {
    nextColumns[columnIndex] = [...nextColumns[columnIndex], card];
  }

  return nextColumns;
}

function drawRawCardFromDeck(state: Pick<GameState, "deck" | "discard">) {
  if (state.deck.length === 0 && state.discard.length > 0) {
    state.deck = shuffle(flipAllToBack(state.discard));
    state.discard = [];
  }

  return state.deck.pop() ?? null;
}

function drawCardToHand(state: Pick<GameState, "deck" | "discard" | "hand">) {
  const next = drawRawCardFromDeck(state);
  if (!next) return false;

  state.hand.push(flipToFace(next));
  return true;
}

function drawBogeyCard(
  state: Pick<GameState, "deck" | "discard">,
): PlayingCard | null {
  const next = drawRawCardFromDeck(state);
  return next ? flipToFace(next) : null;
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

  draft.gameEnded = true;
  draft.won = tier !== null;
  draft.achievedTier = tier;
  draft.playerTurnEnded = false;
  draft.awaitingBogeyPlacement = false;
  draft.selectedHandCardId = null;
  draft.currentBogeyCard = null;

  if (tier) {
    draft.lastAction = `All cards played in ${draft.columns.length} columns. Tier: ${tier}.`;
  } else {
    draft.lastAction = `All cards played in ${draft.columns.length} columns.`;
  }
}

const gameStateInitial: GameState = {
  hand: [],
  columns: [],
  deck: createDeck(),
  discard: [],
  currentBogeyCard: null,
  awaitingBogeyPlacement: false,
  gameEnded: false,
  won: false,
  achievedTier: null,
  lastAction: "Game started",
  playerTurnEnded: false,
  selectedHandCardId: null,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.hand,
      ...draft.columns.flat(),
      ...draft.discard,
      ...draft.deck,
      ...(draft.currentBogeyCard ? [draft.currentBogeyCard] : []),
    ];

    draft.deck = shuffle(flipAllToBack(allCards));
    draft.discard = [];
    draft.hand = [];
    draft.columns = [];
    draft.currentBogeyCard = null;
    draft.awaitingBogeyPlacement = false;
    draft.gameEnded = false;
    draft.won = false;
    draft.achievedTier = null;
    draft.lastAction = "Your turn: play, discard, or hold cards.";
    draft.playerTurnEnded = false;
    draft.selectedHandCardId = null;
  });

  await delay();

  setGame((draft) => {
    while (draft.hand.length < HAND_SIZE) {
      const drew = drawCardToHand(draft);
      if (!drew) break;
    }
  });
}

export default function TheBogey() {
  const { zoneBg, cardText } = useGameZoneBackground();

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
        ? game.hand.find((card) => card.id === game.selectedHandCardId) ?? null
        : null,
    [game.hand, game.selectedHandCardId],
  );

  const activePlacementCard = game.awaitingBogeyPlacement
    ? game.currentBogeyCard
    : selectedHandCard;

  const validPlacementTargets = useMemo(
    () =>
      activePlacementCard ? canPlayCard(activePlacementCard, game.columns) : [],
    [activePlacementCard, game.columns],
  );

  // Refill player hand to 5 at the start of each player turn.
  useEffect(() => {
    if (game.gameEnded || game.playerTurnEnded || game.awaitingBogeyPlacement) {
      return;
    }

    if (game.hand.length >= HAND_SIZE) {
      return;
    }

    if (game.deck.length + game.discard.length === 0) {
      return;
    }

    setGame((draft) => {
      while (draft.hand.length < HAND_SIZE) {
        const drew = drawCardToHand(draft);
        if (!drew) break;
      }
    });
  }, [
    game.awaitingBogeyPlacement,
    game.deck.length,
    game.discard.length,
    game.gameEnded,
    game.hand.length,
    game.playerTurnEnded,
    setGame,
  ]);

  // Bogey turn: draw one card, then the player chooses where it goes.
  useEffect(() => {
    if (game.gameEnded || !game.playerTurnEnded || game.awaitingBogeyPlacement) {
      return;
    }

    if (game.currentBogeyCard) {
      return;
    }

    const timer = setTimeout(() => {
      setGame((draft) => {
        const bogeyCard = drawBogeyCard(draft);

        if (!bogeyCard) {
          draft.playerTurnEnded = false;
          draft.lastAction = "Bogey cannot draw. Your turn continues.";

          if (allCardsPlaced(draft)) {
            finishCompletedGame(draft);
          }

          return;
        }

        const validColumns = canPlayCard(bogeyCard, draft.columns);

        if (validColumns.length === 0) {
          draft.currentBogeyCard = bogeyCard;
          draft.awaitingBogeyPlacement = false;
          draft.gameEnded = true;
          draft.won = false;
          draft.lastAction = `Bogey drew ${cardLabel(bogeyCard)} and it cannot be played. You lose.`;
          return;
        }

        draft.currentBogeyCard = bogeyCard;
        draft.awaitingBogeyPlacement = true;
        draft.lastAction = `Bogey drew ${cardLabel(bogeyCard)}. Choose a column.`;
      });
    }, bufferedDefaultAnimDuration * 2);

    return () => clearTimeout(timer);
  }, [
    game.awaitingBogeyPlacement,
    game.currentBogeyCard,
    game.gameEnded,
    game.playerTurnEnded,
    setGame,
  ]);

  function handleSelectHandCard(cardId: string) {
    if (game.gameEnded || game.playerTurnEnded || game.awaitingBogeyPlacement) {
      return;
    }

    setGame((draft) => {
      draft.selectedHandCardId =
        draft.selectedHandCardId === cardId ? null : cardId;

      const selected = draft.hand.find((card) => card.id === draft.selectedHandCardId);
      draft.lastAction = selected
        ? `Selected ${cardLabel(selected)}. Choose a column, new column, or discard.`
        : "Selection cleared.";
    });
  }

  function handleColumnSelection(columnIdx: number) {
    if (game.gameEnded) return;

    const isBogeyPlacement = game.awaitingBogeyPlacement && !!game.currentBogeyCard;
    const sourceCard = isBogeyPlacement ? game.currentBogeyCard : selectedHandCard;

    if (!sourceCard) return;

    const validColumns = canPlayCard(sourceCard, game.columns);
    if (!validColumns.includes(columnIdx)) {
      setGame((draft) => {
        draft.lastAction = "That column is not a legal target.";
      });
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const playableCard = isBogeyPlacement
        ? draft.currentBogeyCard
        : draft.hand.find((card) => card.id === draft.selectedHandCardId);

      if (!playableCard) return;

      draft.columns = playCardToColumn(playableCard, columnIdx, draft.columns);

      if (isBogeyPlacement) {
        draft.currentBogeyCard = null;
        draft.awaitingBogeyPlacement = false;
        draft.playerTurnEnded = false;
        draft.lastAction = `Bogey card played to column ${columnIdx + 1}. Your turn.`;
      } else {
        draft.hand = draft.hand.filter((card) => card.id !== playableCard.id);
        draft.selectedHandCardId = null;
        draft.lastAction = `Played ${cardLabel(playableCard)} to column ${columnIdx + 1}.`;
      }

      if (allCardsPlaced(draft)) {
        finishCompletedGame(draft);
      }
    });
  }

  function handleNewColumn() {
    handleColumnSelection(-1);
  }

  function handleDiscardSelectedCard() {
    if (
      game.gameEnded ||
      game.playerTurnEnded ||
      game.awaitingBogeyPlacement ||
      !selectedHandCard
    ) {
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      const selected = draft.hand.find((card) => card.id === draft.selectedHandCardId);
      if (!selected) return;

      draft.hand = draft.hand.filter((card) => card.id !== selected.id);
      draft.discard.push(selected);
      draft.selectedHandCardId = null;
      draft.lastAction = `Discarded ${cardLabel(selected)}.`;
    });
  }

  function handleEndTurn() {
    if (game.gameEnded || game.playerTurnEnded || game.awaitingBogeyPlacement) {
      return;
    }

    saveUndoState(structuredClone(game));

    setGame((draft) => {
      draft.playerTurnEnded = true;
      draft.selectedHandCardId = null;
      draft.lastAction = "Bogey's turn...";
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const columnZones: MapZone[] = Array.from({ length: MAX_COLUMNS }, (_, idx) => ({
      id: `column-${idx}`,
      name: "column",
      pileIndex: idx,
      cards: game.columns[idx] ?? [],
      col: idx % 6,
      row: 1.8 + Math.floor(idx / 6) * 2.35,
      height: 2.05,
      baseZIndex: 5,
      fan: {
        direction: "down",
        offset: 0.24,
        maxVisible: 6,
      },
      placeholder: {
        text: `Column ${idx + 1}`,
        infoPos: "above",
        showCount: false,
      },
    }));

    const handZones: MapZone[] = game.hand.map((card, idx) => ({
      id: `hand-${card.id}`,
      name: "hand",
      refIndex: idx,
      cards: [card],
      col: 0.5 + idx * 1.02,
      row: 6.4,
      baseZIndex: 40,
    }));

    return [
      {
        id: "info",
        col: 0,
        row: 0,
        width: "full",
        height: 0.8,
        baseZIndex: 30,
      },
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: 0.9,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Deck", infoPos: "right" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 1.2,
        row: 0.9,
        fan: { maxVisible: 3 },
        baseZIndex: 50,
        placeholder: { text: "Discard", infoPos: "right" },
      },
      {
        id: "bogey",
        name: "bogey",
        cards: game.currentBogeyCard ? [game.currentBogeyCard] : [],
        col: 4.7,
        row: 0.9,
        baseZIndex: 50,
        placeholder: { text: "Bogey", infoPos: "left" },
      },
      {
        id: "new-column",
        col: 3.2,
        row: 0.9,
        baseZIndex: 20,
        placeholder: {
          text: "New Column",
          infoPos: "above",
          showCount: false,
        },
      },
      ...columnZones,
      ...handZones,
      {
        id: "actions",
        col: 0,
        row: 7.5,
        width: "full",
        height: 0.7,
        baseZIndex: 30,
      },
    ];
  }, [game.columns, game.currentBogeyCard, game.deck, game.discard, game.hand]);

  const cardMapper = (mappedCard: MappedCard): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand") {
      const selected = mappedCard.card.id === game.selectedHandCardId;

      return {
        onPress: () => handleSelectHandCard(mappedCard.card.id),
        isDisabled:
          game.gameEnded || game.playerTurnEnded || game.awaitingBogeyPlacement,
        selectColor: selected ? "blue" : "none",
        forceSelectColor: selected,
      };
    }

    if (mappedCard.zoneName === "column" && mappedCard.pileIndex !== undefined) {
      const isTopCard = mappedCard.topOfZone;
      const isValidTarget = validPlacementTargets.includes(mappedCard.pileIndex);

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
    }

    return {};
  };

  const zoneMapper = (zone: MapZone) => {
    if (zone.name === "column" && zone.pileIndex !== undefined) {
      const isValid = validPlacementTargets.includes(zone.pileIndex);

      return {
        onPress: () => handleColumnSelection(zone.pileIndex!),
        isDisabled: !isValid,
        selectColor: isValid ? "green" : "none",
        forceSelectColor: isValid,
        forceOverlayColor: isValid,
      };
    }

    if (zone.id === "new-column") {
      const isValid = validPlacementTargets.includes(-1);

      return {
        onPress: handleNewColumn,
        isDisabled: !isValid,
        selectColor: isValid ? "green" : "none",
        forceSelectColor: isValid,
        forceOverlayColor: isValid,
      };
    }

    return {};
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: 0.2,
    fixedCols: 6,
    fixedRows: 8.5,
    cardSize: "small",
    cardMapper,
    zoneMapper,
  });

  const tierText = game.achievedTier ? `Tier: ${game.achievedTier}` : "";

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.gameEnded}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? `All cards played in ${game.columns.length} columns. ${tierText}`
          : "Bogey drew an unplayable card."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("info"),
          flexStyles.rowCentered,
          {
            borderRadius: 12,
            paddingHorizontal: 16,
            backgroundColor: zoneBg,
          },
        ]}
      >
        <Text
          size="sm"
          style={[
            flexStyles.flex1,
            {
              color: cardText,
              fontFamily: FontWeight[400],
            },
          ]}
        >
          Columns: {game.columns.length} / {MAX_COLUMNS} | Targets N:{WIN_COLUMNS.novice} NR:{WIN_COLUMNS.normal} A:{WIN_COLUMNS.advanced} L:{WIN_COLUMNS.legendary} E:{WIN_COLUMNS.epic}
        </Text>
      </View>

      <View
        style={[
          getZoneStylesById("actions"),
          {
            ...flexStyles.rowCentered,
            justifyContent: "space-between",
            backgroundColor: rgba(zoneBg, 0.96),
            borderRadius: 12,
            gap: 10,
            paddingHorizontal: 10,
          },
        ]}
      >
        <Text size="xs" style={[flexStyles.flex1, { color: cardText }]}> 
          {game.lastAction}
        </Text>

        {!game.awaitingBogeyPlacement && !game.playerTurnEnded && selectedHandCard && (
          <>
            <Button text="Discard" theme="orange" onPress={handleDiscardSelectedCard} />
            <Button
              text="Cancel"
              theme="blue"
              onPress={() => {
                setGame((draft) => {
                  draft.selectedHandCardId = null;
                  draft.lastAction = "Selection cleared.";
                });
              }}
            />
          </>
        )}

        {!game.awaitingBogeyPlacement &&
          !game.playerTurnEnded &&
          !selectedHandCard &&
          !game.gameEnded && (
            <Button text="End Turn" theme="blue" onPress={handleEndTurn} />
          )}
      </View>
    </GameWrapper>
  );
}
