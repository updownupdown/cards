import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { Button } from "../Button/Button";
import {
  createDeck,
  flipToBack,
  flipToFace,
  isRed,
  RANK_VALUE,
  shuffle,
  top,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { flexStyles } from "@/styles/flexStyles";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";

const cardSize = "tableau";
const HAND_SIZE = 6;

type GameState = {
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  hand: PlayingCard[];
  jokers: PlayingCard[];
  discard: PlayingCard[];
  jokerPenalty: number;
  stockReshuffles: number;
  ended: boolean;
  won: boolean;
};

function canBeat(trickCard: PlayingCard, tableauCard?: PlayingCard) {
  if (!tableauCard || trickCard.suit !== tableauCard.suit) return false;

  return (
    (trickCard.rank === "A" && tableauCard.rank === "K") ||
    RANK_VALUE[trickCard.rank] > RANK_VALUE[tableauCard.rank]
  );
}

function canBuild(card: PlayingCard, tableauCard?: PlayingCard) {
  if (!tableauCard) return card.rank === "K";

  return (
    isRed(card.suit) !== isRed(tableauCard.suit) &&
    RANK_VALUE[card.rank] + 1 === RANK_VALUE[tableauCard.rank]
  );
}

function revealLastIfNeeded(pile: PlayingCard[]) {
  const last = top(pile);
  if (!last || last.faceUp) return pile;

  return [...pile.slice(0, -1), flipToFace(last)];
}

function createInitialState(): GameState {
  return {
    tableau: Array.from({ length: 7 }, () => [] as PlayingCard[]),
    hand: [],
    stock: [],
    jokers: createDeck({ includeJokers: true })
      .filter((card) => card.rank === "Joker")
      .map(flipToFace),
    discard: shuffle(createDeck()).map(flipToBack),
    jokerPenalty: 0,
    stockReshuffles: 0,
    ended: false,
    won: false,
  };
}

function dealFromDiscard(discard: PlayingCard[]): GameState {
  const deck = [...discard];
  const tableau = Array.from({ length: 7 }, () => [] as PlayingCard[]);
  let cursor = 0;

  for (let pileIndex = 0; pileIndex < tableau.length; pileIndex += 1) {
    for (let cardIndex = 0; cardIndex <= pileIndex; cardIndex += 1) {
      const card = deck[cursor++];
      tableau[pileIndex].push({
        ...card,
        faceUp: cardIndex === pileIndex,
      });
    }
  }

  // The front is the final array item so it remains the visible top card.
  const hand = deck
    .slice(cursor, cursor + HAND_SIZE)
    .map(flipToFace)
    .reverse();

  return {
    tableau,
    hand,
    stock: deck.slice(cursor + HAND_SIZE),
    discard: [],
    jokers: createDeck({ includeJokers: true })
      .filter((card) => card.rank === "Joker")
      .map(flipToFace),
    jokerPenalty: 0,
    stockReshuffles: 0,
    ended: false,
    won: false,
  };
}

function refillHand(state: GameState) {
  while (state.hand.length < HAND_SIZE) {
    if (state.stock.length === 0 && state.discard.length > 0) {
      state.stock = shuffle(state.discard.map(flipToBack));
      state.discard = [];
      state.stockReshuffles += 1;
    }

    const replacement = state.stock.pop();
    if (!replacement) return;

    state.hand.unshift(flipToFace(replacement));
  }
}

function hasLegalMove(state: GameState) {
  const handCard = top(state.hand);
  if (!handCard) return false;

  return state.tableau.some((pile) => {
    const tableauCard = top(pile);
    return (
      canBeat(handCard, tableauCard) ||
      (state.stock.length + state.discard.length > 0 &&
        canBuild(handCard, tableauCard))
    );
  });
}

const gameStateInitial = createInitialState();

export const trickKlondikeRules = {
  canBeat,
  canBuild,
  hasLegalMove,
  revealLastIfNeeded,
  refillHand,
};

export default function TrickKlondike() {
  const { spacing } = useResponsiveMetrics();
  const hasInitializedRef = useRef(false);
  const [selectedHandIds, setSelectedHandIds] = useState<string[]>([]);
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager<GameState>({
      gameStateInitial,
      resetNonGameStates: () => setSelectedHandIds([]),
      resetAndSetup: async () => {
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          setGame((draft) => {
            Object.assign(draft, dealFromDiscard(draft.discard));
          });
          return;
        }

        setGame((draft) => {
          const cards = [
            ...draft.tableau.flat(),
            ...draft.stock,
            ...draft.hand,
            ...draft.discard,
          ];

          draft.tableau = Array.from({ length: 7 }, () => [] as PlayingCard[]);
          draft.stock = [];
          draft.hand = [];
          draft.jokers = [];
          draft.discard = shuffle(cards.map(flipToBack));
          draft.jokerPenalty = 0;
          draft.stockReshuffles = 0;
          draft.ended = false;
          draft.won = false;
        });

        await delay(1000);

        setGame((draft) => {
          Object.assign(draft, dealFromDiscard(draft.discard));
        });
      },
    });

  const handCard = top(game.hand);
  const topJoker = top(game.jokers);
  const selectedHandCards = useMemo(
    () => game.hand.filter((card) => selectedHandIds.includes(card.id)),
    [game.hand, selectedHandIds],
  );
  const hasOnlyTopCardSelected =
    selectedHandCards.length === 1 && selectedHandCards[0]?.id === handCard?.id;
  const hasFullHand = game.hand.length === HAND_SIZE;

  useEffect(() => {
    setSelectedHandIds((current) => {
      const selected = current.filter((id) =>
        game.hand.some((card) => card.id === id),
      );
      if (selected.length > 0 || !handCard) return selected;
      return [handCard.id];
    });
  }, [game.hand, handCard]);

  function toggleHandSelection(cardId: string) {
    if (game.ended) return;

    setSelectedHandIds((current) => {
      if (current.includes(cardId)) {
        return current.length === 1
          ? current
          : current.filter((id) => id !== cardId);
      }
      if (current.length === 3) return current;
      return [...current, cardId];
    });
  }

  async function discardSelectedHandCards() {
    if (game.ended || selectedHandCards.length !== 3) return;

    const selectedIds = new Set(selectedHandCards.map((card) => card.id));
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const cardsToDiscard = draft.hand.filter((card) =>
        selectedIds.has(card.id),
      );
      if (cardsToDiscard.length !== 3) return;

      draft.hand = draft.hand.filter((card) => !selectedIds.has(card.id));
      draft.discard.push(...cardsToDiscard.map(flipToBack));
    });
    setSelectedHandIds([]);

    await delay();

    setGame((draft) => {
      refillHand(draft);
    });
  }

  function useJoker() {
    if (game.ended || !topJoker?.faceUp || !handCard) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const joker = draft.jokers.pop();
      const card = draft.hand.pop();
      if (!joker || !card) return;

      draft.jokers.unshift(flipToBack(joker));
      draft.discard.push(flipToBack(card));
      draft.jokerPenalty += 2;
      refillHand(draft);
    });
  }

  function playToTableau(pileIndex: number) {
    if (game.ended || !handCard) return;

    const tableauCard = top(game.tableau[pileIndex]);
    const beatsTableau = canBeat(handCard, tableauCard);
    const buildsTableau =
      game.stock.length + game.discard.length > 0 &&
      canBuild(handCard, tableauCard);
    if (!beatsTableau && !buildsTableau) return;

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const cardToPlay = draft.hand.pop();
      if (!cardToPlay) return;

      const targetPile = draft.tableau[pileIndex];
      const targetCard = top(targetPile);

      if (canBeat(cardToPlay, targetCard)) {
        const beatenCard = targetPile.pop();
        if (!beatenCard) return;

        draft.hand.unshift(flipToFace(beatenCard));
        draft.discard.push(flipToBack(cardToPlay));
        draft.tableau[pileIndex] = revealLastIfNeeded(targetPile);
        return;
      }

      if (!canBuild(cardToPlay, targetCard)) {
        return;
      }

      targetPile.push(flipToFace(cardToPlay));
      refillHand(draft);
    });
  }

  useEffect(() => {
    if (game.hand.length === 0) return;

    const won = game.tableau.every((pile) => pile.length === 0);
    const ended = won;
    if (won !== game.won || ended !== game.ended) {
      setGame((draft) => {
        draft.won = won;
        draft.ended = ended;
      });
    }
  }, [game, setGame]);

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 1,
        row: 6,
        width: 4,
        baseZIndex: 30,
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.hand.length, 4.1, 0.1, 2),
        },
        placeholder: { text: "Hand", infoPos: "above" },
      },
      {
        id: "jokers",
        name: "jokers",
        cards: game.jokers,
        col: 5,
        row: 6,
        baseZIndex: 25,
        fan: {},
        placeholder: { text: "Jokers", infoPos: "above", showCount: false },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 6,
        row: 6,
        baseZIndex: 20,
        fan: { maxVisible: 3 },
        placeholder: { text: "Discard", infoPos: "above" },
      },
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: 6,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: { text: "Stock", infoPos: "above" },
      },
      {
        id: "actions",
        col: 1,
        row: 5,
        width: 5,
        height: 0.65,
      },
      ...game.tableau.map(
        (pile, pileIndex) =>
          ({
            id: `tableau-${pileIndex}`,
            name: "tableau",
            pileIndex,
            cards: pile,
            col: pileIndex,
            row: 0,
            baseZIndex: pileIndex,
            fan: { offset: 0.34, direction: "down" },
            placeholder: {},
          }) as MapZone,
      ),
    ],
    [game],
  );

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand") {
      return {
        isSelected: selectedHandIds.includes(mappedCard.card.id),
        selectColor: hasOnlyTopCardSelected
          ? "blue"
          : selectedHandCards.length === 3
            ? "red"
            : "orange",
        onPress: () => toggleHandSelection(mappedCard.card.id),
        isDisabled: game.ended,
      };
    }

    if (mappedCard.zoneName === "jokers") {
      const isTopJoker = mappedCard.topOfZone;
      return {
        onPress: isTopJoker ? useJoker : undefined,
        isDisabled: !isTopJoker || game.ended || !topJoker?.faceUp || !handCard,
      };
    }

    if (
      mappedCard.zoneName === "tableau" &&
      mappedCard.pileIndex !== undefined
    ) {
      const isTopCard = mappedCard.topOfZone && mappedCard.card.faceUp;
      return {
        onPress: isTopCard
          ? () => playToTableau(mappedCard.pileIndex!)
          : undefined,
        isDisabled: !isTopCard || game.ended,
        forceOverlayColor: !hasOnlyTopCardSelected,
        selectColor: !hasOnlyTopCardSelected ? "grey" : undefined,
      };
    }

    return undefined;
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "jokers") {
      return {
        onPress: useJoker,
        isDisabled: game.ended || !topJoker?.faceUp || !handCard,
      };
    }

    if (zone.name !== "tableau" || zone.pileIndex === undefined) return {};

    return {
      onPress: () => playToTableau(zone.pileIndex!),
      isDisabled: game.ended || !handCard,
    };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize,
    fixedCols: 7,
    fixedRows: 7,
    gap: 0.1,
    // visualizer: true,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={12 - game.jokerPenalty - game.stockReshuffles}
      winLoseMessage={game.won ? "Tableau cleared." : "No legal play remains."}
      reset={() => {
        void reset();
      }}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          getZoneStylesById("actions"),
          flexStyles.rowCentered,
          {
            gap: spacing(20),
          },
        ]}
      >
        {hasFullHand &&
          !hasOnlyTopCardSelected &&
          selectedHandCards.length > 0 && (
            <>
              <Button
                text="Reset"
                theme="blue"
                onPress={() => {
                  setSelectedHandIds(handCard ? [handCard.id] : []);
                }}
                style={{ flex: 1 }}
                taller
              />
              <Button
                text="Discard"
                theme="red"
                onPress={discardSelectedHandCards}
                style={{ flex: 1 }}
                disabled={selectedHandCards.length !== 3}
                taller
              />
            </>
          )}
      </View>
    </GameWrapper>
  );
}
