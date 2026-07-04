import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import {
  AnimatedCardMapping,
  bufferedDefaultAnimDuration,
  defaultAnimDuration,
} from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isRed,
  RANK_VALUE,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";

type GameState = {
  deck: PlayingCard[];
  hand: (PlayingCard | null)[];
  discard: PlayingCard[];
  won: boolean;
  ended: boolean;
  dealFirstHand: boolean;
};

const gameStateInitial: GameState = {
  hand: Array(8).fill(null),
  deck: shuffle(createDeck()),
  discard: [],
  won: false,
  ended: false,
  dealFirstHand: true,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    const allCards = [...draft.deck, ...draft.hand, ...draft.discard].filter(
      (card): card is PlayingCard => card !== null,
    );

    draft.hand = Array(8).fill(null);
    draft.deck = flipAllToBack(allCards);
    draft.discard = [];
    draft.won = false;
    draft.ended = false;
  });

  await delay();

  setGame((draft) => {
    draft.dealFirstHand = true;
  });
}

function mod13(value: number) {
  const n = value % 13;
  return n < 0 ? n + 13 : n;
}

function isValidSandwich(cards: PlayingCard[]) {
  if (cards.length !== 3) return false;

  const vals = cards.map((card) => RANK_VALUE[card.rank]);
  const perms = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];

  return perms.some(([a, b, c]) => {
    const step1 = mod13(vals[b] - vals[a]);
    const step2 = mod13(vals[c] - vals[b]);
    return step1 === step2;
  });
}

function hasAnyValidSandwich(hand: (PlayingCard | null)[]) {
  const nonNullHand = hand.filter((card) => card !== null);

  for (let i = 0; i < nonNullHand.length; i++) {
    for (let j = i + 1; j < nonNullHand.length; j++) {
      for (let k = j + 1; k < nonNullHand.length; k++) {
        if (isValidSandwich([nonNullHand[i], nonNullHand[j], nonNullHand[k]])) {
          return true;
        }
      }
    }
  }
  return false;
}

function replacementCount(cards: PlayingCard[]) {
  const [a, b, c] = cards;
  const sameSuit = a.suit === b.suit && b.suit === c.suit;
  if (sameSuit) return 4;

  const sameColor =
    isRed(a.suit) === isRed(b.suit) && isRed(b.suit) === isRed(c.suit);
  if (sameColor) return 3;

  return 2;
}

// ================== Component =================== //
export default function TheSandwichGuy() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    isLoaded,
    showIntro,
    setShowIntro,
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
    resetNonGameStates: () => {
      setSelectedIds([]);
    },
    postSetupAction: async () => {
      await refillHand();
    },
  });

  const selectedCards = useMemo(
    () =>
      game.hand
        .filter((card) => card !== null)
        .filter((card) => selectedIds.includes(card.id)),
    [game.hand, selectedIds],
  );

  const invalidSandwichSelected = useMemo(() => {
    if (selectedCards.length !== 3) {
      return false;
    } else {
      return !isValidSandwich(selectedCards);
    }
  }, [selectedCards]);

  const score = game.hand.length;

  function toggleSelect(id: string) {
    if (game.ended) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((entry) => entry !== id);
      }
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function refillHand(maxToRefill = 8) {
    for (let i = 0; i < maxToRefill; i++) {
      setGame((draft) => {
        const topOfDeck = draft.deck.pop();
        if (!topOfDeck || draft.hand.every((card) => card !== null)) {
          return;
        }
        const emptyIndex = draft.hand.findIndex((card) => card === null);
        draft.hand[emptyIndex] = flipToFace(topOfDeck);

        if (draft.dealFirstHand) draft.dealFirstHand = false;
      });

      await delay(defaultAnimDuration / 2);
    }
  }

  async function commitSandwich() {
    if (selectedCards.length !== 3 || !isValidSandwich(selectedCards)) {
      return;
    }

    saveUndoState(structuredClone(game));

    const replacementsEarned = replacementCount(selectedCards);
    const replacementsPossible = Math.min(
      replacementsEarned,
      game.deck.length,
      game.hand.filter((c) => c !== null).length,
    );

    // Discard
    for (let i = 0; i < game.hand.length; i++) {
      setGame((prev) => {
        return produce(prev, (draft) => {
          const cardToDiscard = draft.hand[i];
          if (cardToDiscard && selectedIds.includes(cardToDiscard.id)) {
            draft.hand[i] = null;
            draft.discard.push(flipToBack(cardToDiscard));
          }
        });
      });
    }

    await delay();

    setSelectedIds([]);

    // Refill
    await refillHand(replacementsPossible);

    showToast(`Sandwich served (${replacementsPossible} new cards)`);

    setGame((prev) => {
      return produce(prev, (draft) => {
        if (draft.deck.length === 0) {
          draft.won = true;
          draft.ended = true;
        } else if (!hasAnyValidSandwich(draft.hand)) {
          draft.ended = true;
        }
      });
    });
  }

  function getSelectColor(selected: boolean) {
    if (selected && invalidSandwichSelected) {
      return "red";
    } else if (selectedIds.length === 3 && selected) {
      return "green";
    } else {
      return "blue";
    }
  }

  const showToast = useToast();

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const handZones: MapZone[] = getGridColRows({
      cols: 4,
      rows: 2,
      rowOffset: 1.25,
    }).map((pos, i) => ({
      id: `hand-${i}`,
      pileIndex: i,
      cards: game.hand[i] ? [game.hand[i]] : undefined,
      name: "hand",

      col: pos.c,
      row: pos.r,
      baseZIndex: 1,
      fan: { maxVisible: 3 },
      placeholder: {},
    }));

    return [
      {
        id: "deck",
        name: "deck",

        cards: game.deck,
        col: 0.75,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 1,
        placeholder: { text: "Draw", infoPos: "left" },
      },
      {
        id: "discard",
        name: "discard",

        cards: game.discard,
        col: 2.25,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 1,
        placeholder: { text: "Discard", infoPos: "right" },
      },
      ...handZones,
      {
        id: "button",

        col: 0,
        row: 3.5,
        width: "full",
        height: 0.6,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand") {
      const isSelected = !!(
        mappedCard.card && selectedIds.includes(mappedCard.card.id)
      );

      return {
        isSelected,

        onPress: () => {
          if (mappedCard.card) {
            toggleSelect(mappedCard.card.id);
          }
        },

        isPlaceholder: !mappedCard.card,
        selectColor: mappedCard.card ? getSelectColor(isSelected) : "none",
      };
    }
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "regular",
  });

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? `You won by drawing out the deck. Final score (lower is better):{" "}
            ${score}`
          : "No valid sandwich available. You lose."
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[getZoneStylesById("button"), flexStyles.colCentered]}>
        <Button
          onPress={commitSandwich}
          disabled={selectedCards.length !== 3 || invalidSandwichSelected}
          text="Serve Sandwich"
          size="lg"
          fullWidth
        />
      </View>
    </GameWrapper>
  );
}
