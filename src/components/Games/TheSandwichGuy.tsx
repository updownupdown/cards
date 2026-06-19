import { useGameLoading } from "@/hooks/useGameLoading";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { useZoneLayout, ZoneConfig } from "@/hooks/useZoneLayout";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCard } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  isRed,
  RANK_VALUE,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { CardSelectColor } from "../Cards/CardOLD";
import { CardPositionBuilder, getZoneGrid } from "../Cards/CardPositionBuilder";
import { ZoneBackgrounds } from "../Cards/ZoneBackgrounds";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";
import { produce } from "immer";
import { delay } from "@/utils/utils";

const cardSize = "regular";

type GameState = {
  deck: PlayingCard[];
  hand: (PlayingCard | null)[];
  discard: PlayingCard[];
  won: boolean;
  ended: boolean;
  dealFirstHand: boolean;
};

type GameSnapshot = {
  game: GameState;
};

function setup(dealFirstHand = true): GameState {
  const deck = shuffle(createDeck());

  return {
    hand: Array(8).fill(null),
    deck,
    discard: [],
    won: false,
    ended: false,
    dealFirstHand,
  };
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

export default function TheSandwichGuy() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();

  const [game, setGame] = useState<GameState>(setup(false));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  useEffect(() => {
    if (showIntro === false) {
      setGame((prev) => ({ ...prev, dealFirstHand: true }));
    }
  }, [showIntro]);

  useEffect(() => {
    if (!game.dealFirstHand) {
      return;
    }

    refillHand();
  }, [game.dealFirstHand]);

  function reset() {
    clearHistory();
    setGame(setup());
    setSelectedIds([]);
  }

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
    let refilledCount = 0;

    for (let i = 0; i < game.hand.length; i++) {
      if (refilledCount >= maxToRefill) break;

      let wasRefilled = false;

      setGame((prev) => {
        return produce(prev, (draft) => {
          if (draft.hand[i] === null) {
            const topOfDeck = draft.deck.pop();
            if (topOfDeck) {
              draft.hand[i] = flipToFace(topOfDeck);
              wasRefilled = true;
            }
          }

          if (draft.dealFirstHand) {
            draft.dealFirstHand = false;
          }
        });
      });

      if (wasRefilled) {
        refilledCount++;
      }

      await delay(100);
    }
  }

  async function commitSandwich() {
    if (selectedCards.length !== 3 || !isValidSandwich(selectedCards)) {
      return;
    }

    saveUndoState(structuredClone({ game }));

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

      await delay(100);
    }

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

  const { saveUndoState, undo, canUndo, clearHistory } =
    useUndoHistory<GameSnapshot>();
  const handleUndo = () => {
    const previousState = undo();
    if (previousState) {
      clearHistory();
      setGame(previousState.game);
    }
  };

  const layoutZones: ZoneConfig[] = [
    {
      id: "deck",
      col: 0.75,
      row: 0,
      fan: { maxVisible: 3 },
      placeholder: {
        show: true,
        showCount: true,
        text: "Draw",
        infoPos: "left",
      },
    },
    {
      id: "discard",
      col: 2.25,
      row: 0,
      fan: { maxVisible: 3 },
      placeholder: {
        show: true,
        showCount: true,
        text: "Discard",
        infoPos: "right",
      },
    },
    ...getZoneGrid({
      idPrefix: "hand",
      length: 8,
      cols: 4,
      rowOffset: 1.25,
      config: { placeholder: { show: true } },
    }),
    {
      id: "button",
      col: 0,
      row: 3.5,
      width: "full",
      height: 0.6,
    },
  ];

  const layoutManager = useZoneLayout({
    zones: layoutZones,
    targetRows: 4.725,
  });

  const { cardWidth, cardHeight, getCardPosition, getZoneStyles } =
    layoutManager;

  const cardPositions = useMemo(() => {
    const builder = new CardPositionBuilder(getCardPosition);

    builder.addDeck(game.deck, "deck", 100, "deck");
    builder.addDeck(game.discard, "discard", 1, "discard");

    game.hand.forEach((hand, handIndex) => {
      builder.add({
        card: hand,
        index: handIndex,
        total: 1,
        zoneId: `hand-${handIndex}`,
        startingZIndex: 50,
        type: "hand",
      });
    });

    return builder.build();
  }, [game, getCardPosition]);

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
      handleUndo={handleUndo}
    >
      <ZoneBackgrounds layoutManager={layoutManager} game={game} />

      {Object.values(cardPositions).map((target) => {
        let selectColor: CardSelectColor = "none";
        let isSelected = undefined;
        let isPlaceholder = false;
        let onPress: (() => void) | undefined = undefined;

        if (target.type === "hand") {
          isSelected = !!(target.card && selectedIds.includes(target.card.id));

          onPress = () => {
            if (target.card) {
              toggleSelect(target.card.id);
            }
          };

          isPlaceholder = !target.card;
          selectColor = target.card ? getSelectColor(isSelected) : "none";
        }

        return (
          <AnimatedCard
            key={target.card.id}
            targetState={target}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cardSize={cardSize}
            onPress={onPress}
            isSelected={isSelected}
            selectColor={selectColor}
            isPlaceholder={isPlaceholder}
          />
        );
      })}

      <View style={[getZoneStyles("button")]}>
        <Button
          onPress={commitSandwich}
          disabled={selectedCards.length !== 3 || invalidSandwichSelected}
          text="Serve Sandwich"
          size="large"
          fullWidth
          style={[{ height: "100%" }]}
        />
      </View>
    </GameWrapper>
  );
}
