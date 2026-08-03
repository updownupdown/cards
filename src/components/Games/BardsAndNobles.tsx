import { Button } from "@/components/Button/Button";
import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { Colors } from "@/styles/styles";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import { CardRank, PlayingCard, shuffle, SUITS } from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

type GameState = {
  inventory: PlayingCard[];
  shelves: (PlayingCard | null)[];
  line: PlayingCard[];
  usedBooks: PlayingCard[];
  guildStanding: PlayingCard[];
  discard: PlayingCard[];
  interactions: number;
  ended: boolean;
  won: boolean;
};

const BOOK_RANKS: CardRank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
];
const CUSTOMER_RANKS: CardRank[] = ["J", "Q", "K"];

function createCards(ranks: CardRank[], prefix: string) {
  return SUITS.flatMap((suit) =>
    ranks.map((rank) => ({
      id: `${prefix}-${suit}-${rank}-${Math.random().toString(36).slice(2, 8)}`,
      suit,
      rank,
      faceUp: true,
    })),
  );
}

function bookValue(card: PlayingCard, aceIsOne = false) {
  if (card.rank === "A") return aceIsOne ? 1 : 11;
  return Number(card.rank);
}

function customerMoney(card: PlayingCard) {
  return card.rank === "J" ? 11 : card.rank === "Q" ? 12 : 13;
}

function customerPenalty(card: PlayingCard) {
  return card.rank === "J" ? 1 : card.rank === "Q" ? 2 : 3;
}

function selectedOfferValue(
  selectedBooks: readonly PlayingCard[],
  usedBook: PlayingCard,
  aceAtOneIds: ReadonlySet<string>,
) {
  return selectedBooks.reduce((total, book) => {
    if (book.suit === usedBook.suit) return total;
    return total + bookValue(book, aceAtOneIds.has(book.id));
  }, 0);
}

function outcomeMessage(score: number) {
  if (score < 10) return "Terminated";
  if (score < 12) return "Employee of the Month";
  if (score < 14) return "Performance Bonus";
  if (score < 16) return "Promotion to District Manager";
  if (score < 18) return "Company Livestock Options";
  return "Executive Lordship Program";
}

export const bardsAndNoblesRules = {
  bookValue,
  customerMoney,
  customerPenalty,
  selectedOfferValue,
  outcomeMessage,
};

function createInitialState(): GameState {
  const books = shuffle(createCards(BOOK_RANKS, "book"));
  const customers = shuffle(createCards(CUSTOMER_RANKS, "customer"));
  const usedBooks = books
    .splice(0, 12)
    .map((card) => ({ ...card, faceUp: true }));
  const guildStanding = books.splice(0, 3);
  const shelves = books.splice(0, 8);

  return {
    inventory: books,
    shelves,
    line: customers,
    usedBooks,
    guildStanding,
    discard: [],
    interactions: 0,
    ended: false,
    won: false,
  };
}

const gameStateInitial = createInitialState();

export default function BardsAndNobles() {
  const { spacing } = useResponsiveMetrics();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [aceAtOneIds, setAceAtOneIds] = useState<string[]>([]);
  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<GameState>({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedIds([]);
        setAceAtOneIds([]);
      },
      resetAndSetup: async (): Promise<void> => {
        setGame(createInitialState());
      },
    });

  const customer = game.line[game.line.length - 1];
  const usedBook = game.usedBooks[game.usedBooks.length - 1];
  const selectedBooks = game.shelves.filter(
    (book): book is PlayingCard =>
      book !== null && selectedIds.includes(book.id),
  );
  const offerValue =
    customer && usedBook ? customerMoney(customer) + bookValue(usedBook) : 0;
  const selectionValue = usedBook
    ? selectedOfferValue(selectedBooks, usedBook, new Set(aceAtOneIds))
    : 0;
  const canTrade = selectedBooks.length > 0 && selectionValue === offerValue;

  function toggleShelfBook(book: PlayingCard) {
    if (game.ended) return;

    if (!selectedIds.includes(book.id)) {
      setSelectedIds((ids) => [...ids, book.id]);
      return;
    }

    if (book.rank === "A" && !aceAtOneIds.includes(book.id)) {
      setAceAtOneIds((ids) => [...ids, book.id]);
      return;
    }

    setSelectedIds((ids) => ids.filter((id) => id !== book.id));
    setAceAtOneIds((ids) => ids.filter((id) => id !== book.id));
  }

  function restock(draft: GameState) {
    draft.shelves = draft.shelves.map(
      (book) => book ?? draft.inventory.pop() ?? null,
    );
  }

  function finishInteraction(draft: GameState) {
    draft.interactions += 1;
    if (draft.interactions === 12) {
      draft.ended = true;
      draft.won = true;
    }
  }

  function trade() {
    if (!canTrade || !customer || !usedBook) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const activeCustomer = draft.line.pop();
      const activeUsedBook = draft.usedBooks.pop();
      if (!activeCustomer || !activeUsedBook) return;

      draft.inventory.unshift(activeUsedBook);
      draft.shelves = draft.shelves.map((book) => {
        if (!book || !selectedIds.includes(book.id)) return book;
        if (book.suit === activeCustomer.suit) draft.guildStanding.push(book);
        else draft.discard.push(book);
        return null;
      });
      draft.discard.push(activeCustomer);
      restock(draft);
      finishInteraction(draft);
    });
    setSelectedIds([]);
    setAceAtOneIds([]);
  }

  function pass() {
    if (!customer || !usedBook || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const activeCustomer = draft.line.pop();
      const activeUsedBook = draft.usedBooks.pop();
      if (!activeCustomer || !activeUsedBook) return;

      const penalty = customerPenalty(activeCustomer);
      const fired = draft.guildStanding.length < penalty;
      draft.guildStanding.splice(
        Math.max(0, draft.guildStanding.length - penalty),
      );
      draft.discard.push(activeCustomer, activeUsedBook);
      if (fired) {
        draft.ended = true;
        draft.won = false;
        return;
      }
      restock(draft);
      finishInteraction(draft);
    });
    setSelectedIds([]);
    setAceAtOneIds([]);
  }

  const zones: MapZone[] = useMemo(() => {
    const shelfZones = game.shelves.map((book, index) => ({
      id: `shelf-${index}`,
      name: "shelf",
      pileIndex: index,
      cards: book ? [book] : [],
      col: index % 4,
      row: 1.5 + Math.floor(index / 4) * 1.15,
      baseZIndex: 20 + index,
      placeholder: { hideShadow: true },
    }));

    return [
      {
        id: "customer",
        name: "customer",
        cards: customer ? [customer] : [],
        col: 0,
        row: 0,
        baseZIndex: 10,
        placeholder: { text: "Line", infoPos: "below" },
      },
      {
        id: "used-book",
        name: "used-book",
        cards: usedBook ? [usedBook] : [],
        col: 1,
        row: 0,
        baseZIndex: 10,
        placeholder: { text: "Used", infoPos: "below" },
      },
      {
        id: "inventory",
        name: "inventory",
        cards: game.inventory,
        col: 2,
        row: 0,
        baseZIndex: 5,
        fan: { maxVisible: 3 },
        placeholder: { text: "Stock", infoPos: "below" },
      },
      {
        id: "guild",
        name: "guild",
        cards: game.guildStanding,
        col: 3,
        row: 0,
        baseZIndex: 5,
        fan: { maxVisible: 3 },
        placeholder: { text: "Guild", infoPos: "below" },
      },
      ...shelfZones,
    ];
  }, [customer, game.guildStanding, game.inventory, game.shelves, usedBook]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName !== "shelf" || mappedCard.pileIndex === undefined)
      return { isDisabled: true };
    const book = game.shelves[mappedCard.pileIndex];
    if (!book) return undefined;
    const isSelected = selectedIds.includes(book.id);
    const aceAtOne = aceAtOneIds.includes(book.id);
    return {
      isSelected,
      selectColor: aceAtOne ? "orange" : "blue",
      onPress: () => toggleShelfBook(book),
      isDisabled: game.ended,
    };
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "regular",
    fixedCols: 4,
    fixedRows: 3.5,
    paddingTop: 0.2,
    paddingBottom: 0.1,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.guildStanding.length}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        game.won
          ? outcomeMessage(game.guildStanding.length)
          : "Fired for losing your Guild Standing."
      }
    >
      {cardMap}
      <View
        style={{ alignItems: "center", gap: spacing(6), marginTop: spacing(2) }}
      >
        <Text size="sm" weight={600} color={Colors.white}>
          Offer {offerValue} | Selected {selectionValue} | Guild{" "}
          {game.guildStanding.length}
        </Text>
        <Text size="xs" color={Colors.K200}>
          Matching genre is free. Tap a selected Ace again to price it at 1.
        </Text>
        <View style={{ flexDirection: "row", gap: spacing(8) }}>
          <Button
            text="Pass"
            theme="red"
            onPress={pass}
            disabled={game.ended}
          />
          <Button
            text="Trade"
            theme="green"
            onPress={trade}
            disabled={!canTrade || game.ended}
          />
        </View>
      </View>
    </GameWrapper>
  );
}
