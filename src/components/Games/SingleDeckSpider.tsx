import { useStateManager } from "@/hooks/useStateManager";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

export type SingleDeckSpiderVariant = "simple-simon" | "spiderette";
export type SingleDeckSpiderState = {
  tableau: PlayingCard[][];
  stock: PlayingCard[];
  completed: PlayingCard[][];
  ended: boolean;
  won: boolean;
};
type Selection = { pile: number; card: number } | null;

const CONFIGS = {
  "simple-simon": {
    sizes: [8, 8, 8, 7, 6, 5, 4, 3, 2, 1],
    faceUp: "all" as const,
  },
  spiderette: {
    sizes: [1, 2, 3, 4, 5, 6, 7],
    faceUp: "top" as const,
  },
};

function isSuitedRun(cards: PlayingCard[]) {
  return (
    cards.length > 0 &&
    cards.every(
      (card, index) =>
        card.faceUp &&
        (index === 0 ||
          (card.suit === cards[index - 1].suit &&
            rankValue(card) === rankValue(cards[index - 1]) - 1)),
    )
  );
}

function canBuild(card: PlayingCard, destination?: PlayingCard) {
  return !destination || rankValue(card) === rankValue(destination) - 1;
}

function isComplete(cards: PlayingCard[]) {
  return (
    cards.length === 13 &&
    cards[0].rank === "K" &&
    cards[12].rank === "A" &&
    isSuitedRun(cards)
  );
}

function settle(state: SingleDeckSpiderState) {
  state.tableau.forEach((pile, index) => {
    const tail = pile.slice(-13);
    if (isComplete(tail)) {
      state.completed.push(...[tail]);
      pile.splice(-13);
    }
    const exposed = top(pile);
    if (exposed && !exposed.faceUp) pile[pile.length - 1] = flipToFace(exposed);
    state.tableau[index] = pile;
  });
  state.won = state.completed.length === 4;
  state.ended = state.won;
}

function createInitialState(
  variant: SingleDeckSpiderVariant,
): SingleDeckSpiderState {
  const config = CONFIGS[variant];
  const deck = shuffle(createDeck());
  let offset = 0;
  const tableau = config.sizes.map((size) => {
    const cards = deck.slice(offset, offset + size);
    offset += size;
    return cards.map((card, index) =>
      config.faceUp === "all" || index === cards.length - 1
        ? flipToFace(card)
        : flipToBack(card),
    );
  });
  return {
    tableau,
    stock: deck.slice(offset).map(flipToBack),
    completed: [],
    ended: false,
    won: false,
  };
}

export const singleDeckSpiderRules = {
  canBuild,
  createInitialState,
  isComplete,
  isSuitedRun,
  settle,
};

export function SingleDeckSpider({
  variant,
}: {
  variant: SingleDeckSpiderVariant;
}) {
  const initial = useMemo(() => createInitialState(variant), [variant]);
  const [selected, setSelected] = useState<Selection>(null);
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<SingleDeckSpiderState>({
      gameStateInitial: initial,
      resetNonGameStates: () => setSelected(null),
      resetAndSetup: async () => {
        setGame(createInitialState(variant));
      },
    });

  useEffect(() => {
    if (game.won && !game.ended) {
      setGame((draft) => {
        draft.ended = true;
      });
    }
  }, [game.ended, game.won, setGame]);

  const selectedCards = selected
    ? game.tableau[selected.pile].slice(selected.card)
    : [];

  function move(destination: number) {
    if (
      !selected ||
      selected.pile === destination ||
      !isSuitedRun(selectedCards) ||
      !canBuild(selectedCards[0], top(game.tableau[destination]))
    ) {
      return false;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const cards = draft.tableau[selected.pile].splice(selected.card);
      draft.tableau[destination].push(...cards);
      settle(draft);
    });
    setSelected(null);
    return true;
  }

  function onCardPress(pile: number, card: number) {
    if (game.ended || !game.tableau[pile][card].faceUp) return;
    const next = { pile, card };
    if (!selected) {
      if (isSuitedRun(game.tableau[pile].slice(card))) setSelected(next);
      return;
    }
    if (selected.pile === pile && selected.card === card)
      return setSelected(null);
    if (!move(pile) && isSuitedRun(game.tableau[pile].slice(card)))
      setSelected(next);
  }

  function dealRow() {
    if (
      game.ended ||
      game.stock.length === 0 ||
      game.tableau.some((pile) => pile.length === 0)
    ) {
      return;
    }
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      draft.tableau.forEach((pile) => {
        const card = draft.stock.pop();
        if (card) pile.push(flipToFace(card));
      });
      settle(draft);
    });
    setSelected(null);
  }

  const zones: MapZone[] = useMemo(
    () => [
      {
        id: "stock",
        name: "stock",
        cards: game.stock,
        col: 0,
        row: 0,
        fan: { maxVisible: 1 },
        placeholder: { text: "Stock", showCount: true },
      },
      ...game.completed.map(
        (pile, index) =>
          ({
            id: `completed-${index}`,
            name: "completed",
            cards: pile,
            col: game.tableau.length - 4 + index,
            row: 0,
            fan: { maxVisible: 1 },
          }) as MapZone,
      ),
      ...game.tableau.map((pile, index) => ({
        id: `tableau-${index}`,
        name: "tableau",
        pileIndex: index,
        cards: pile,
        col: index,
        row: 1.2,
        fan: { direction: "down" as const, offset: cardDims.tableauOffset },
        placeholder: {},
      })),
    ],
    [game],
  );

  const cardMapper = (card: MappedCard): AnimatedCardMapping | undefined => {
    if (card.zoneName === "stock" && card.topOfZone)
      return { onPress: dealRow, isDisabled: game.stock.length === 0 };
    if (card.zoneName !== "tableau" || card.pileIndex === undefined) return {};
    const highlighted =
      selected?.pile === card.pileIndex && card.cardIndex >= selected.card;
    return {
      isDisabled: game.ended || !card.card.faceUp,
      isSelected: highlighted,
      selectColor: "blue",
      onPress: () => onCardPress(card.pileIndex!, card.cardIndex),
    };
  };
  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "stock")
      return { onPress: dealRow, isDisabled: game.stock.length === 0 };
    if (zone.name === "tableau" && zone.pileIndex !== undefined)
      return { onPress: () => move(zone.pileIndex!), isDisabled: !selected };
    return {};
  };
  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    fixedCols: game.tableau.length,
    fixedRows: 7,
    gap: 0.1,
  });
  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={game.completed.length}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage="Four complete suits!"
      showDeviceRotateHint
    >
      {cardMap}
    </GameWrapper>
  );
}
