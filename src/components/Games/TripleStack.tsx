import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import {
  AnimatedCardMapping,
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

import { i18n } from "@/i18n";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";
import { seededRandom, shuffledWith } from "@/hints/random";
type GameState = {
  deck: PlayingCard[];
  hand: (PlayingCard | null)[];
  discard: PlayingCard[];
  won: boolean;
  ended: boolean;
  dealFirstHand: boolean;
};

export type TripleStackGameState = GameState;

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
  return ((value % 13) + 13) % 13;
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

function handScore(hand: (PlayingCard | null)[]) {
  return hand.filter((card) => card !== null).length;
}

function sandwiches(cards: PlayingCard[]) {
  const found: PlayingCard[][] = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      for (let k = j + 1; k < cards.length; k++) {
        const triple = [cards[i], cards[j], cards[k]];
        if (isValidSandwich(triple)) found.push(triple);
      }
    }
  }
  return found;
}

/**
 * The sandwich to serve: the one that earns most cards back, and of those
 * the one most likely to leave a good sandwich in the next hand, over the
 * refills the deck could give.
 */
function bestSandwich(state: GameState) {
  const hand = state.hand.filter((card) => card !== null);
  const random = seededRandom(
    hand.map((card) => card.id).join(",") + state.deck.length,
  );
  const refills = Array.from({ length: 8 }, () =>
    shuffledWith(state.deck, random),
  );
  let best: PlayingCard[] | null = null;
  let bestWorth = -Infinity;
  for (const triple of sandwiches(hand)) {
    const earned = Math.min(
      replacementCount(triple),
      state.deck.length,
      hand.length,
    );
    const rest = hand.filter((card) => !triple.includes(card));
    let next = 0;
    for (const deck of refills) {
      const nextHand = [...rest, ...deck.slice(0, earned)];
      const options = sandwiches(nextHand);
      if (options.length > 0) {
        next +=
          20 + 5 * Math.max(...options.map(replacementCount)) + options.length;
      }
    }
    const worth =
      earned * 100 + (earned >= state.deck.length ? 1000 : next / 8);
    if (worth > bestWorth) {
      bestWorth = worth;
      best = triple;
    }
  }
  return best;
}

function findTripleStackHint(state: GameState, selectedIds: string[]) {
  if (state.ended) return null;
  const triple = bestSandwich(state);
  if (!triple) return null;
  const wrong = selectedIds.filter(
    (id) => !triple.some((card) => card.id === id),
  );
  if (wrong.length > 0) {
    return makeHint("tapCard", ...wrong.map((id) => cardTarget(id)));
  }
  return makeHint(
    {
      key: "removeCards",
      values: { label: i18n.t("games:tripleStack.serveSandwich") },
    },
    triple.filter((card) => !selectedIds.includes(card.id)).map(cardTarget),
    zoneTarget("button"),
  );
}

export const tripleStackRules = {
  mod13,
  isValidSandwich,
  hasAnyValidSandwich,
  replacementCount,
  handScore,
  findHint: findTripleStackHint,
};

// ================== Component =================== //
export default function TripleStack() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
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

  const score = handScore(game.hand);

  useHint(() => findTripleStackHint(game, selectedIds), {
    game,
    enabled: !game.ended && game.hand.some((card) => card !== null),
  });

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
        if (draft.hand.every((card) => card !== null)) return;
        const topOfDeck = draft.deck.pop();
        if (!topOfDeck) return;
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

    showToast(
      i18n.t("games:tripleStack.sandwichServedNewCards", {
        replacementsPossible,
      }),
    );

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
        placeholder: { text: i18n.t("cards:stock"), infoPos: "left" },
      },
      {
        id: "discard",
        name: "discard",

        cards: game.discard,
        col: 2.25,
        row: 0,
        fan: { maxVisible: 3 },
        baseZIndex: 1,
        placeholder: { text: i18n.t("cards:discard"), infoPos: "right" },
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
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        game.won
          ? i18n.t("games:tripleStack.youWonByDrawingOut", { score })
          : i18n.t("games:tripleStack.noValidSandwichAvailableYou")
      }
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View style={[getZoneStylesById("button"), flexStyles.colCentered]}>
        <Button
          onPress={commitSandwich}
          disabled={selectedCards.length !== 3 || invalidSandwichSelected}
          text={i18n.t("games:tripleStack.serveSandwich")}
          size="lg"
          halfTaller
          fullWidth
        />
      </View>
    </GameWrapper>
  );
}
