import { useStateManager } from "@/hooks/useStateManager";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  SUITS,
  top,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const MAX_RESTACKS = 3;
type Direction = "ascending" | "descending";
type FoundationTarget = { direction: Direction; suitIndex: number };

export type CrescentGameState = {
  tableau: PlayingCard[][];
  ascending: PlayingCard[][];
  descending: PlayingCard[][];
  restacksUsed: number;
  ended: boolean;
  won: boolean;
};

function canBuildTableau(card: PlayingCard, destination?: PlayingCard) {
  if (!destination || card.suit !== destination.suit) return false;
  const distance = Math.abs(rankValue(card) - rankValue(destination));
  return distance === 1 || distance === 12;
}

function canBuildFoundation(
  card: PlayingCard,
  destination: PlayingCard | undefined,
  direction: Direction,
  suit: CardSuit,
) {
  if (!destination || card.suit !== suit) return false;
  const step = direction === "ascending" ? 1 : -1;
  return rankValue(card) === rankValue(destination) + step;
}

function createInitialState(): CrescentGameState {
  const deck = shuffle(createDeck({ deckCount: 2 }));
  const ascending = SUITS.map((suit) => {
    const index = deck.findIndex(
      (card) => card.suit === suit && card.rank === "A",
    );
    const [card] = deck.splice(index, 1);
    return card ? [flipToFace(card)] : [];
  });
  const descending = SUITS.map((suit) => {
    const index = deck.findIndex(
      (card) => card.suit === suit && card.rank === "K",
    );
    const [card] = deck.splice(index, 1);
    return card ? [flipToFace(card)] : [];
  });
  const tableau = Array.from({ length: 16 }, (_, pileIndex) =>
    deck
      .slice(pileIndex * 6, pileIndex * 6 + 6)
      .map((card, cardIndex) =>
        cardIndex === 5 ? flipToFace(card) : flipToBack(card),
      ),
  );
  return {
    tableau,
    ascending,
    descending,
    restacksUsed: 0,
    ended: false,
    won: false,
  };
}

function hasMove(state: CrescentGameState) {
  if (state.restacksUsed < MAX_RESTACKS) return true;
  return state.tableau.some((pile, sourceIndex) => {
    const card = top(pile);
    if (!card) return false;
    const suitIndex = SUITS.indexOf(card.suit);
    if (
      canBuildFoundation(
        card,
        top(state.ascending[suitIndex]),
        "ascending",
        card.suit,
      ) ||
      canBuildFoundation(
        card,
        top(state.descending[suitIndex]),
        "descending",
        card.suit,
      )
    )
      return true;
    return state.tableau.some(
      (destination, destinationIndex) =>
        destinationIndex !== sourceIndex &&
        canBuildTableau(card, top(destination)),
    );
  });
}

function restackTableau(tableau: PlayingCard[][]) {
  return tableau.map((pile) => {
    if (pile.length < 2) return pile;
    const [bottom, ...rest] = pile;
    return [...rest.map(flipToBack), flipToFace(bottom)];
  });
}

export const crescentRules = {
  canBuildFoundation,
  canBuildTableau,
  createInitialState,
  hasMove,
  restackTableau,
};

export default function Crescent() {
  const [selectedPile, setSelectedPile] = useState<number | null>(null);
  const [selectedFoundation, setSelectedFoundation] =
    useState<FoundationTarget | null>(null);
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<CrescentGameState>({
      gameStateInitial: createInitialState(),
      resetNonGameStates: () => {
        setSelectedPile(null);
        setSelectedFoundation(null);
      },
      resetAndSetup: async () => {
        setGame(createInitialState());
      },
    });

  useEffect(() => {
    const won = [...game.ascending, ...game.descending].every(
      (pile) => pile.length === 13,
    );
    const ended = won || !hasMove(game);
    if (won !== game.won || ended !== game.ended) {
      setGame((draft) => {
        draft.won = won;
        draft.ended = ended;
      });
    }
  }, [game, setGame]);

  const selectedCard = selectedFoundation
    ? top(game[selectedFoundation.direction][selectedFoundation.suitIndex])
    : selectedPile === null
      ? undefined
      : top(game.tableau[selectedPile]);

  function removeSelected(draft: CrescentGameState) {
    if (selectedPile === null) return undefined;
    const card = draft.tableau[selectedPile].pop();
    const exposed = top(draft.tableau[selectedPile]);
    if (exposed)
      draft.tableau[selectedPile][draft.tableau[selectedPile].length - 1] =
        flipToFace(exposed);
    return card;
  }

  function moveToTableau(destination: number) {
    if (
      selectedPile === null ||
      selectedPile === destination ||
      !selectedCard ||
      !canBuildTableau(selectedCard, top(game.tableau[destination]))
    )
      return false;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const covered = top(draft.tableau[destination]);
      if (covered)
        draft.tableau[destination][draft.tableau[destination].length - 1] =
          flipToBack(covered);
      const card = removeSelected(draft);
      if (card) draft.tableau[destination].push(flipToFace(card));
    });
    setSelectedPile(null);
    return true;
  }

  function moveToFoundation(target: FoundationTarget) {
    if (!selectedCard) return false;
    if (
      selectedFoundation?.direction === target.direction &&
      selectedFoundation.suitIndex === target.suitIndex
    )
      return false;
    const pile = game[target.direction][target.suitIndex];
    if (
      !canBuildFoundation(
        selectedCard,
        top(pile),
        target.direction,
        SUITS[target.suitIndex],
      )
    )
      return false;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const card = selectedFoundation
        ? draft[selectedFoundation.direction][
            selectedFoundation.suitIndex
          ].pop()
        : removeSelected(draft);
      if (card) draft[target.direction][target.suitIndex].push(card);
    });
    setSelectedPile(null);
    setSelectedFoundation(null);
    return true;
  }

  function onFoundationPress(target: FoundationTarget) {
    if (game.ended) return;
    if (selectedCard && moveToFoundation(target)) return;
    const pile = game[target.direction][target.suitIndex];
    if (pile.length > 1) {
      setSelectedPile(null);
      setSelectedFoundation(target);
    } else {
      setSelectedFoundation(null);
    }
  }

  function onTableauPress(index: number) {
    if (game.ended || game.tableau[index].length === 0) return;
    setSelectedFoundation(null);
    if (selectedPile === null) return setSelectedPile(index);
    if (selectedPile === index) return setSelectedPile(null);
    if (!moveToTableau(index)) setSelectedPile(index);
  }

  function restack() {
    if (game.ended || game.restacksUsed >= MAX_RESTACKS) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.tableau = restackTableau(draft.tableau);
      draft.restacksUsed += 1;
    });
    setSelectedPile(null);
    setSelectedFoundation(null);
  }

  const zones: MapZone[] = useMemo(() => {
    const foundations = (["ascending", "descending"] as const).flatMap(
      (direction, row) =>
        game[direction].map(
          (pile, suitIndex) =>
            ({
              id: `${direction}-${suitIndex}`,
              name: direction,
              pileIndex: suitIndex,
              cards: pile,
              col: 2 + suitIndex,
              row: row * 1.1,
              fan: { maxVisible: 1 },
              placeholder: {},
            }) as MapZone,
        ),
    );
    const tableau = game.tableau.map((pile, index) => ({
      id: `tableau-${index}`,
      name: "tableau",
      pileIndex: index,
      cards: pile,
      col: index % 8,
      row: 2.4 + Math.floor(index / 8) * 2.2,
      fan: { direction: "down" as const, offset: 0.25 },
      placeholder: { hideBackground: pile.length === 0 },
    }));
    return [
      ...foundations,
      {
        id: "restack",
        name: "restack",
        cards: [],
        col: 6.5,
        row: 0.55,
        placeholder: {
          text: `Restack ${MAX_RESTACKS - game.restacksUsed}`,
          hideBackground: game.restacksUsed >= MAX_RESTACKS,
        },
      },
      ...tableau,
    ];
  }, [game]);

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    if (card.zoneName === "tableau" && card.pileIndex !== undefined)
      return {
        isDisabled: game.ended || !card.topOfZone,
        isSelected: card.topOfZone && selectedPile === card.pileIndex,
        selectColor: "blue",
        onPress: () => onTableauPress(card.pileIndex!),
      };
    if (
      (card.zoneName === "ascending" || card.zoneName === "descending") &&
      card.pileIndex !== undefined
    )
      return {
        isDisabled: game.ended || !card.topOfZone,
        isSelected:
          card.topOfZone &&
          selectedFoundation?.direction === card.zoneName &&
          selectedFoundation.suitIndex === card.pileIndex,
        selectColor: "blue",
        onPress: () =>
          onFoundationPress({
            direction: card.zoneName as Direction,
            suitIndex: card.pileIndex!,
          }),
      };
    return {};
  };
  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "restack")
      return {
        onPress: restack,
        isDisabled: game.restacksUsed >= MAX_RESTACKS,
      };
    if (
      (zone.name === "ascending" || zone.name === "descending") &&
      zone.pileIndex !== undefined
    )
      return {
        onPress: () =>
          onFoundationPress({
            direction: zone.name as Direction,
            suitIndex: zone.pileIndex!,
          }),
        isDisabled: game.ended,
      };
    if (zone.name === "tableau" && zone.pileIndex !== undefined)
      return {
        onPress: () => moveToTableau(zone.pileIndex!),
        isDisabled:
          selectedPile === null || game.tableau[zone.pileIndex].length === 0,
      };
    return {};
  };
  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    fixedCols: 8,
    fixedRows: 7.2,
    gap: 0.1,
  });
  const score = [...game.ascending, ...game.descending].reduce(
    (sum, pile) => sum + pile.length,
    0,
  );
  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={score}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={game.won ? "The crescent is clear!" : "No moves remain."}
      showDeviceRotateHint
    >
      {cardMap}
    </GameWrapper>
  );
}
