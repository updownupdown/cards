import { useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import {
  createDeck,
  flipAllToBack,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";

import { i18n } from "@/i18n";
type AnchorIndex = 0 | 1 | 2 | 3;

type PileDefinition = {
  id: string;
  anchors: AnchorIndex[];
  capacity: number;
  col: number;
  row: number;
};

type GameState = {
  diamonds: PlayingCard[];
  diamondStock: PlayingCard[];
  blackStock: PlayingCard[];
  discard: PlayingCard[];
  hand: PlayingCard[];
  piles: PlayingCard[][];
  lost: boolean;
};

export type RedRedDiamondGameState = GameState;

const DIAMOND_POSITIONS = [
  { col: 2, row: 1 },
  { col: 3, row: 2 },
  { col: 2, row: 3 },
  { col: 1, row: 2 },
];

const PILE_DEFINITIONS: PileDefinition[] = [
  { id: "outside-north", anchors: [0], capacity: 3, col: 2, row: 0 },
  { id: "outside-east", anchors: [1], capacity: 3, col: 4, row: 2 },
  { id: "outside-south", anchors: [2], capacity: 3, col: 2, row: 4 },
  { id: "outside-west", anchors: [3], capacity: 3, col: 0, row: 2 },
  { id: "inside-ne", anchors: [0, 1], capacity: 4, col: 3, row: 1 },
  { id: "inside-se", anchors: [1, 2], capacity: 4, col: 3, row: 3 },
  { id: "inside-sw", anchors: [2, 3], capacity: 4, col: 1, row: 3 },
  { id: "inside-nw", anchors: [3, 0], capacity: 4, col: 1, row: 1 },
  { id: "center", anchors: [0, 1, 2, 3], capacity: 5, col: 2, row: 2 },
];

function createInitialState(): GameState {
  return {
    diamonds: [],
    diamondStock: [],
    blackStock: [],
    discard: flipAllToBack([
      ...createDeck({ forceSuit: "diamonds" }),
      ...createDeck({ forceSuit: "clubs" }),
      ...createDeck({ forceSuit: "spades" }),
    ]),
    hand: [],
    piles: PILE_DEFINITIONS.map(() => []),
    lost: false,
  };
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    draft.discard = flipAllToBack([
      ...draft.diamonds,
      ...draft.diamondStock,
      ...draft.blackStock,
      ...draft.hand,
      ...draft.piles.flat(),
      ...draft.discard,
    ]);

    draft.diamonds = [];
    draft.diamondStock = [];
    draft.blackStock = [];
    draft.hand = [];
    draft.piles = PILE_DEFINITIONS.map(() => []);
    draft.lost = false;
  });

  await delay();

  setGame((draft) => {
    const cards = shuffle(draft.discard);
    const diamonds = cards.filter((card) => card.suit === "diamonds");
    const blackCards = cards.filter((card) => card.suit !== "diamonds");

    draft.diamonds = diamonds.splice(-4).map((card) => ({
      ...card,
      faceUp: true,
    }));
    draft.diamondStock = diamonds;
    draft.hand = blackCards.splice(-2).map((card) => ({
      ...card,
      faceUp: true,
    }));
    draft.blackStock = blackCards;
    draft.discard = [];
  });
}

function isArithmeticMatch(value: number, first: number, second: number) {
  if (value === first || value === second) return true;
  if (value === first + second || value === Math.abs(first - second)) {
    return true;
  }
  if (value === first * second) return true;
  return (
    (second !== 0 && first / second === value) ||
    (first !== 0 && second / first === value)
  );
}

function canPlaceCard(
  card: PlayingCard,
  pile: PlayingCard[],
  definition: PileDefinition,
  diamonds: PlayingCard[],
) {
  if (pile.length >= definition.capacity) return false;

  const topCard = pile[pile.length - 1];
  if (topCard && topCard.suit === card.suit) return false;
  if (definition.anchors.length === 4) return true;

  const values = definition.anchors.map((index) => rankValue(diamonds[index]));
  const value = rankValue(card);
  if (values.length === 1) return value === values[0];
  return isArithmeticMatch(value, values[0], values[1]);
}

function canReplenish(definition: PileDefinition, diamondStockCount: number) {
  return diamondStockCount >= definition.anchors.length;
}

function hasLegalPlacement(
  card: PlayingCard,
  piles: PlayingCard[][],
  diamonds: PlayingCard[],
) {
  return PILE_DEFINITIONS.some((definition, index) =>
    canPlaceCard(card, piles[index], definition, diamonds),
  );
}

function replenishPile(draft: GameState, pileIndex: number) {
  const definition = PILE_DEFINITIONS[pileIndex];
  if (!definition || draft.piles[pileIndex].length === 0) return false;

  if (!canReplenish(definition, draft.diamondStock.length)) {
    draft.lost = true;
    return false;
  }

  draft.discard.push(...flipAllToBack(draft.piles[pileIndex]));
  draft.piles[pileIndex] = [];

  for (const anchorIndex of definition.anchors) {
    const replacement = draft.diamondStock.pop();
    const previous = draft.diamonds[anchorIndex];
    if (!replacement || !previous) {
      draft.lost = true;
      return false;
    }
    draft.discard.push(flipAllToBack([previous])[0]);
    draft.diamonds[anchorIndex] = { ...replacement, faceUp: true };
  }

  return true;
}

function refillHand(draft: GameState) {
  while (draft.hand.length < 2 && draft.blackStock.length > 0) {
    const card = draft.blackStock.pop();
    if (card) draft.hand.push({ ...card, faceUp: true });
  }
}

export const redDiamondRules = {
  isArithmeticMatch,
  canPlaceCard,
  canReplenish,
  hasLegalPlacement,
  pileDefinitions: PILE_DEFINITIONS,
};

export default function RedDiamond() {
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(
    null,
  );
  const [placingDiamond, setPlacingDiamond] = useState(false);

  const {
    isLoaded,
    isSettingUp,
    game,
    setGame,
    reset,
    undo,
    canUndo,
    saveUndoState,
  } = useStateManager<GameState>({
    gameStateInitial: createInitialState(),
    resetNonGameStates: () => {
      setSelectedHandIndex(null);
      setPlacingDiamond(false);
    },
    resetAndSetup: async () => {
      await resetAndSetup(setGame);
    },
  });

  const won =
    !isSettingUp &&
    !game.lost &&
    game.blackStock.length === 0 &&
    game.hand.length === 0;
  const ended = !isSettingUp && (won || game.lost);
  const hasBlockedCard = game.hand.some(
    (card) => !hasLegalPlacement(card, game.piles, game.diamonds),
  );

  function placeBlackCard(pileIndex: number) {
    if (ended || selectedHandIndex === null) return;

    const card = game.hand[selectedHandIndex];
    const definition = PILE_DEFINITIONS[pileIndex];
    if (
      !card ||
      !definition ||
      !canPlaceCard(card, game.piles[pileIndex], definition, game.diamonds)
    ) {
      return;
    }

    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const playedCard = draft.hand.splice(selectedHandIndex, 1)[0];
      if (!playedCard) return;

      draft.piles[pileIndex].push(playedCard);
      if (draft.piles[pileIndex].length === definition.capacity) {
        replenishPile(draft, pileIndex);
      }
      if (!draft.lost && draft.hand.length === 0) refillHand(draft);
    });
    setSelectedHandIndex(null);
  }

  function clearPile(pileIndex: number) {
    if (ended || !hasBlockedCard || game.piles[pileIndex].length === 0) {
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      replenishPile(draft, pileIndex);
    });
  }

  function replaceDiamond(anchorIndex: number) {
    if (
      ended ||
      !hasBlockedCard ||
      !placingDiamond ||
      game.diamondStock.length === 0
    ) {
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const replacement = draft.diamondStock.pop();
      const previous = draft.diamonds[anchorIndex];
      if (!replacement || !previous) return;
      draft.discard.push(flipAllToBack([previous])[0]);
      draft.diamonds[anchorIndex] = { ...replacement, faceUp: true };
    });
    setPlacingDiamond(false);
  }

  const zones: MapZone[] = useMemo(() => {
    const diamondZones: MapZone[] = DIAMOND_POSITIONS.map(
      (position, index) => ({
        id: `diamond-${index}`,
        name: "diamond",
        pileIndex: index,
        cards: game.diamonds[index] ? [game.diamonds[index]] : [],
        col: position.col,
        row: position.row,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
      }),
    );
    const pileZones: MapZone[] = PILE_DEFINITIONS.map((definition, index) => ({
      id: definition.id,
      name: "pile",
      pileIndex: index,
      cards: game.piles[index],
      col: definition.col,
      row: definition.row,
      baseZIndex: 30,
      fan: { maxVisible: 4 },
      placeholder: { showCount: false },
    }));

    return [
      ...diamondZones,
      ...pileZones,
      {
        id: "diamond-stock",
        name: "diamond-stock",
        cards: game.diamondStock,
        col: 4,
        row: 5.25,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:redDiamond.diamonds"),
          infoPos: "left",
        },
      },
      {
        id: "black-stock",
        name: "black-stock",
        cards: game.blackStock,
        col: 0,
        row: 5.25,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:black"), infoPos: "right" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 4,
        row: 0,
        baseZIndex: 150,
        fan: { maxVisible: 3 },
      },
      ...game.hand.map((card, index) => ({
        id: `hand-${index}`,
        name: "hand",
        pileIndex: index,
        cards: [card],
        col: game.hand.length === 1 ? 2 : 1.5 + index * 1,
        row: 5.25,
        baseZIndex: 60,
      })),
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand" && mappedCard.pileIndex !== undefined) {
      const handIndex = mappedCard.pileIndex;

      const playable = hasLegalPlacement(
        mappedCard.card,
        game.piles,
        game.diamonds,
      );

      return {
        onPress: () => {
          if (ended) return;
          setPlacingDiamond(false);
          setSelectedHandIndex((current) =>
            current === handIndex ? null : handIndex,
          );
        },
        isDisabled: ended || !playable,
        selectColor: !playable ? "grey" : "blue",
        forceOverlayColor: !playable,
        isSelected: selectedHandIndex === handIndex,
      };
    } else if (
      mappedCard.zoneName === "diamond" &&
      mappedCard.pileIndex !== undefined
    ) {
      return {
        onPress: () => replaceDiamond(mappedCard.pileIndex as AnchorIndex),
        isDisabled: ended || !placingDiamond,
        selectColor: placingDiamond ? "green" : "none",
      };
    } else if (mappedCard.zoneName === "pile") {
      return { clickThroughCards: true };
    } else if (mappedCard.zoneName === "diamond-stock") {
      const isSelected = placingDiamond && mappedCard.topOfZone;

      return {
        clickThroughCards: true,
        selectColor: "blue",
        isSelected,
      };
    }
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "pile" && zone.pileIndex !== undefined) {
      const pileIndex = zone.pileIndex;
      const card =
        selectedHandIndex === null ? undefined : game.hand[selectedHandIndex];
      const playable = card
        ? canPlaceCard(
            card,
            game.piles[pileIndex],
            PILE_DEFINITIONS[pileIndex],
            game.diamonds,
          )
        : false;

      return {
        onPress: () =>
          selectedHandIndex === null
            ? clearPile(pileIndex)
            : placeBlackCard(pileIndex),
        isDisabled:
          ended ||
          (selectedHandIndex === null
            ? !hasBlockedCard || game.piles[pileIndex].length === 0
            : !playable),
      };
    } else if (zone.name === "diamond-stock") {
      const isDisabled =
        ended || !hasBlockedCard || game.diamondStock.length === 0;

      return {
        onPress: () => {
          if (isDisabled) return;
          setSelectedHandIndex(null);
          setPlacingDiamond((current) => !current);
        },
        isDisabled,
      };
    }
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "small",
    gap: 0.14,
  });

  return (
    <GameWrapper
      isLoaded={isLoaded}
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      winLoseMessage={
        won
          ? i18n.t("games:redDiamond.allBlackCardsHaveBeen")
          : game.lost
            ? i18n.t("games:redDiamond.thereAreNotEnoughDiamond")
            : undefined
      }
      reset={reset}
      undo={undo}
      canUndo={canUndo}
    >
      {cardMap}
    </GameWrapper>
  );
}
