import { useGameLoading } from "@/hooks/useGameLoading";
import { flexStyles } from "@/styles/flexStyles";
import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { CardAnimationParams, useAnimations } from "../Animations/Animations";
import { Button } from "../Button/Button";
import { CardGrid } from "../Cards/CardOLD";
import {
  RANK_VALUE,
  createDeck,
  isRed,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { CardButton } from "../Cards/CardButtonOLD";
import { Deck } from "../Cards/Deck";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { useLayoutManager } from "@/hooks/useLayoutManager";

const cardsPerRow = 4;

type GameState = {
  deck: PlayingCard[];
  hand: (PlayingCard | null)[];
  discard: PlayingCard[];
  wonByDeckingOut: boolean;
  ended: boolean;
};

type GameSnapshot = {
  game: GameState;
};

function initState(): GameState {
  const deck = shuffle(createDeck({ faceUp: true }));

  return {
    hand: deck.slice(0, 8),
    deck: deck.slice(8),
    discard: [],
    wonByDeckingOut: false,
    ended: false,
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

  const [game, setGame] = useState<GameState>(initState);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { getLayout, setRef } = useLayoutManager(["deck", "discard", "hand"]);

  const { animateCards, isAnimating, animatingCardIds } = useAnimations();

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

  function reset() {
    clearHistory();
    setGame(initState());
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

  async function commitSandwich() {
    if (
      selectedCards.length !== 3 ||
      isAnimating ||
      !isValidSandwich(selectedCards)
    ) {
      return;
    }

    saveUndoState(structuredClone({ game }));

    const replacement = replacementCount(selectedCards);

    const deckPos = getLayout("deck");

    let currentState = { ...game };

    // Discard Phase: move cards 1 by 1, updating state each time to increment the discard pile count
    for (let i = 0; i < currentState.hand.length; i++) {
      const card = currentState.hand[i];
      if (card && selectedIds.includes(card.id)) {
        const handPos = getLayout("hand", i);

        const newHand = [...currentState.hand];
        newHand[i] = null;

        const discardPos = getLayout("discard");

        // Updated hand
        currentState = {
          ...currentState,
          hand: newHand,
        };
        setGame(currentState);

        // Animate hand to discard
        if (handPos && discardPos) {
          await animateCards([
            {
              card,
              from: handPos,
              to: discardPos,
              flip: "toBack",
              cardsPerRow,
            },
          ]);
        }

        // Updated discard
        currentState = {
          ...currentState,
          discard: [...currentState.discard, card],
        };

        setGame(currentState);
      }
    }

    const deckCards = [...currentState.deck];
    const newlyDrawn: PlayingCard[] = [];
    const slotsToFill: number[] = [];

    for (let i = 0; i < currentState.hand.length; i++) {
      if (currentState.hand[i] === null) {
        slotsToFill.push(i);
      }
    }

    const actuallyReplaced = Math.min(
      replacement,
      deckCards.length,
      slotsToFill.length,
    );

    if (actuallyReplaced > 0) {
      showToast(`Sandwich served (${actuallyReplaced} new cards)`);

      const anims: CardAnimationParams[] = [];

      for (let i = 0; i < actuallyReplaced; i++) {
        const drawn = deckCards.shift();
        if (!drawn) break;

        newlyDrawn.push(drawn);
        const slotIndex = slotsToFill[i];
        const handPos = getLayout("hand", slotIndex);

        // Shrink the deck 1 by 1 visually
        currentState = {
          ...currentState,
          deck: [...deckCards],
        };
        setGame(currentState);

        if (deckPos && handPos) {
          anims.push({
            card: drawn,
            from: deckPos,
            to: handPos,
            flip: "toFace",
            cardsPerRow,
            delay: 100 * i,
            keepAlive: true,
          });
        }
      }

      // await all draw animations
      if (anims.length > 0) {
        await animateCards(anims);
      }
    }

    // Populate final hand slots
    const finalHand = [...currentState.hand];
    let drawIndex = 0;
    for (let i = 0; i < finalHand.length; i++) {
      if (finalHand[i] === null && drawIndex < newlyDrawn.length) {
        finalHand[i] = newlyDrawn[drawIndex];
        drawIndex++;
      }
    }

    const wonByDeckingOut =
      currentState.wonByDeckingOut || deckCards.length === 0;
    const nextState = {
      ...currentState,
      hand: finalHand,
      deck: deckCards,
      wonByDeckingOut,
    };

    if (!hasAnyValidSandwich(nextState.hand)) {
      nextState.ended = true;
    }

    setGame(nextState);
    setSelectedIds([]);
  }

  const won = game.ended && game.wonByDeckingOut;

  function selectColor(selected: boolean) {
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
      setGame(previousState.game);
    }
  };

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={
        won
          ? `You won by drawing out the deck. Final score (lower is better):{" "}
            ${score}`
          : "No valid sandwich available. You lose."
      }
      canUndo={canUndo}
      handleUndo={handleUndo}
    >
      <View
        style={[flexStyles.rowCentered, flexStyles.fullWidth, flexStyles.gap40]}
      >
        <Deck
          refTop={setRef("deck")}
          showCount
          limitFan
          cardsPerRow={cardsPerRow}
          countPosition="left"
          backCount={game.deck.length}
          iconName="draw"
          fan="horizontalRight"
        />
        <Deck
          refNext={setRef("discard")}
          showCount
          limitFan
          cardsPerRow={cardsPerRow}
          countPosition="right"
          backCount={game.discard.length}
          iconName="delete"
          fan="horizontalLeft"
        />
      </View>

      <CardGrid
        cardsPerRow={cardsPerRow}
        style={[
          {
            flexDirection: "row-reverse",
            justifyContent: "flex-end",
          },
        ]}
      >
        {game.hand.map((card, index) => {
          const isSelected = !!(card && selectedIds.includes(card.id));

          return (
            <CardButton
              ref={setRef("hand", index)}
              key={card ? card.id : "placeholder" + index}
              onPress={() => {
                if (card) {
                  toggleSelect(card.id);
                }
              }}
              isSelected={isSelected}
              cardsPerRow={cardsPerRow}
              isPlaceholder={!card || animatingCardIds.includes(card.id)}
              card={card}
              selectColor={card ? selectColor(isSelected) : "none"}
            />
          );
        })}
      </CardGrid>

      <Button
        onPress={commitSandwich}
        disabled={
          selectedCards.length !== 3 || invalidSandwichSelected || isAnimating
        }
        text="Serve Sandwich"
        size="large"
        fullWidth
      />
    </GameWrapper>
  );
}
