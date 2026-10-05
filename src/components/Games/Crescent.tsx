import { useStateManager } from "@/hooks/useStateManager";
import { delay, DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  SUITS,
  top,
  type CardSuit,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  EXHAUSTED_PILE_PLACEHOLDER,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { Button } from "../Button/Button";
import { GameWrapper } from "../common/GameWrapper";
import { View } from "react-native";
import { useGameColors } from "@/hooks/useGameColors";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { findClassicHint } from "@/hints/classic";
const cardSize = "tableau";
const MAX_RESTACKS = 3;
type Direction = "ascending" | "descending";
type FoundationTarget = { direction: Direction; suitIndex: number };

export type CrescentGameState = {
  setupPile: PlayingCard[];
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
  return {
    setupPile: shuffle(createDeck({ deckCount: 2 })).map(flipToBack),
    tableau: Array.from({ length: 16 }, () => [] as PlayingCard[]),
    ascending: SUITS.map(() => [] as PlayingCard[]),
    descending: SUITS.map(() => [] as PlayingCard[]),
    restacksUsed: 0,
    ended: false,
    won: false,
  };
}

function dealCrescent(setupPile: PlayingCard[]) {
  const deck = shuffle(setupPile);
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
    setupPile: [],
    tableau,
    ascending,
    descending,
    restacksUsed: 0,
    ended: false,
    won: false,
  };
}

async function resetAndSetup(
  setGame: (updater: (draft: CrescentGameState) => void) => void,
) {
  setGame((draft) => {
    draft.setupPile = shuffle(
      flipAllToBack([
        ...draft.setupPile,
        ...draft.tableau.flat(),
        ...draft.ascending.flat(),
        ...draft.descending.flat(),
      ]),
    );
    draft.tableau = Array.from({ length: 16 }, () => [] as PlayingCard[]);
    draft.ascending = SUITS.map(() => [] as PlayingCard[]);
    draft.descending = SUITS.map(() => [] as PlayingCard[]);
    draft.restacksUsed = 0;
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    const next = dealCrescent(draft.setupPile);
    draft.setupPile = next.setupPile;
    draft.tableau = next.tableau;
    draft.ascending = next.ascending;
    draft.descending = next.descending;
    draft.restacksUsed = next.restacksUsed;
    draft.ended = next.ended;
    draft.won = next.won;
  });
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

/**
 * Ranks the moves on view (the cards under each pile's top are hidden);
 * restacks the piles only when nothing on the table helps.
 */
function findCrescentHint(state: CrescentGameState) {
  const directions = [
    ...SUITS.map(() => "ascending" as const),
    ...SUITS.map(() => "descending" as const),
  ];
  return findClassicHint(
    {
      tableau: state.tableau,
      foundations: [...state.ascending, ...state.descending],
    },
    {
      toFoundation: (card, pile, index) =>
        canBuildFoundation(
          card,
          top(pile),
          directions[index],
          SUITS[index % 4],
        ),
      toTableau: (cards, pile) =>
        cards.length === 1 && canBuildTableau(cards[0], top(pile)),
      canLift: (pile, index) => index === pile.length - 1,
    },
    {
      tableau: (pile) => `tableau-${pile}`,
      foundation: (pile) => `${directions[pile]}-${pile % 4}`,
    },
    {
      stock:
        state.restacksUsed < MAX_RESTACKS
          ? {
              zone: "restack",
              message: "press",
              label: i18n.t("games:crescent.restack", {
                value: MAX_RESTACKS - state.restacksUsed,
              }),
            }
          : null,
    },
  );
}

export const crescentRules = {
  findHint: findCrescentHint,
  canBuildFoundation,
  canBuildTableau,
  createInitialState,
  dealCrescent,
  hasMove,
  restackTableau,
};

export default function Crescent() {
  const { colorDark } = useGameColors();
  const [selectedPile, setSelectedPile] = useState<number | null>(null);
  const [lastTap, setLastTap] = useState<{ index: number; at: number } | null>(
    null,
  );
  const [selectedFoundation, setSelectedFoundation] =
    useState<FoundationTarget | null>(null);
  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<CrescentGameState>({
    gameStateInitial: createInitialState(),
    resetNonGameStates: () => {
      setSelectedPile(null);
      setSelectedFoundation(null);
      setLastTap(null);
    },
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
  });

  useHint(() => findCrescentHint(game), {
    game,
    enabled: !isSettingUp && !game.ended && !game.setupPile.length,
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
    const now = Date.now();
    if (lastTap?.index === index && now - lastTap.at < DOUBLE_TAP_MS) {
      setLastTap(null);
      const card = top(game.tableau[index]);
      const suitIndex = card ? SUITS.indexOf(card.suit) : -1;
      const target = (["ascending", "descending"] as const).find(
        (direction) =>
          card &&
          canBuildFoundation(
            card,
            top(game[direction][suitIndex]),
            direction,
            card.suit,
          ),
      );
      if (target && moveToFoundation({ direction: target, suitIndex })) return;
    } else {
      setLastTap({ index, at: now });
    }
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
      (direction, directionIndex) =>
        game[direction].map(
          (pile, suitIndex) =>
            ({
              id: `${direction}-${suitIndex}`,
              name: direction,
              pileIndex: suitIndex,
              cards: pile,
              col: suitIndex + directionIndex * 12,
              row: 0,
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
      col: index,
      row: 1.2,
      fan: { direction: "down" as const, offset: cardDims.tableauOffset },
      // Empty piles are never filled.
      placeholder: pile.length === 0 ? EXHAUSTED_PILE_PLACEHOLDER : {},
    }));
    return [
      {
        id: "setup",
        name: "setup",
        cards: game.setupPile,
        col: 0,
        row: 0.6,
        fan: { maxVisible: 3 },
      },
      ...foundations,
      {
        id: "restack",
        name: "restack",
        cards: [],
        col: 6,
        // Below the tableau piles (they end around row 3.9), not in the top
        // row: in portrait the small card size put it right where the
        // quick-start tip banner opens, clipping it.
        row: 4.5,
        width: 4,
        height: 0.7,
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
  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize,
    fixedCols: 16,
    fixedRows: 5.3,
    paddingTop: 0,
    gap: 0.1,
  });
  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        game.won
          ? i18n.t("games:crescent.theCrescentIsClear")
          : i18n.t("cards:noMovesRemain")
      }
      showDeviceRotateHint="landscape"
    >
      {cardMap}

      <View style={getZoneStylesById("restack")}>
        <Button
          text={i18n.t("games:crescent.restack", {
            value: MAX_RESTACKS - game.restacksUsed,
          })}
          size="xs"
          onPress={restack}
          disabled={game.ended || game.restacksUsed >= MAX_RESTACKS}
          style={{ flex: 1 }}
          theme={colorDark}
          taller
        />
      </View>
    </GameWrapper>
  );
}
