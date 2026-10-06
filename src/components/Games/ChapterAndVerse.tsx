import { Button } from "@/components/Button/Button";
import { Text } from "@/components/common/Text";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { Colors, rgba } from "@/styles/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  CardRank,
  flipToBack,
  PlayingCard,
  shuffle,
  SUITS,
  top,
} from "../Cards/card-utils";
import {
  getGridColRows,
  MappedCard,
  MapZone,
  useCardMap,
} from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { delay } from "@/utils/utils";
import { flexStyles } from "@/styles/flexStyles";
import { useGameColors } from "@/hooks/useGameColors";
import { Icon } from "@/icons";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import {
  cardTarget,
  makeHint,
  pressHint,
  withNote,
  zoneTarget,
} from "@/hints/hint";
type GameState = {
  inventory: PlayingCard[];
  shelves: (PlayingCard | null)[];
  lockedShelves: boolean[];
  line: PlayingCard[];
  usedBooks: PlayingCard[];
  guildScore: number;
  discard: PlayingCard[];
  interactions: number;
  ended: boolean;
  won: boolean;
};

export type ChapterAndVerseGameState = GameState;

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
const SHELF_COUNT = 8;

export type ChapterAndVerseSettings = {
  loyalPatrons: boolean;
  checkBack: boolean;
  superExclusive: boolean;
  vandals: 0 | 1 | 2;
};

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

function isExclusiveOffer(
  book: PlayingCard,
  usedBook: PlayingCard | undefined,
  superExclusive = false,
) {
  return (
    usedBook?.suit === book.suit ||
    (superExclusive && usedBook?.rank === book.rank)
  );
}

function selectedOfferValue(
  selectedBooks: readonly PlayingCard[],
  usedBook: PlayingCard,
  aceAtOneIds: ReadonlySet<string>,
  superExclusive = false,
) {
  return selectedBooks.reduce((total, book) => {
    if (isExclusiveOffer(book, usedBook, superExclusive)) return total;
    return total + bookValue(book, aceAtOneIds.has(book.id));
  }, 0);
}

function outcomeMessage(score: number) {
  if (score < 10) return i18n.t("games:chapterAndVerse.terminated");
  if (score < 12) return i18n.t("games:chapterAndVerse.employeeOfTheMonth");
  if (score < 14) return i18n.t("games:chapterAndVerse.performanceBonus");
  if (score < 16)
    return i18n.t("games:chapterAndVerse.promotionToDistrictManager");
  if (score < 18)
    return i18n.t("games:chapterAndVerse.companyLivestockOptions");
  return i18n.t("games:chapterAndVerse.executiveLordshipProgram");
}

// —— Hints ——

/** A book's place in a trade: left out, sold, or (an Ace) sold for $1. */
type BookUse = "out" | "in" | "low";

/** The player's picks on screen, which a hint taps from. */
type TradePicks = { selectedIds: string[]; aceAtOneIds: string[] };

/** The books on offer: unlocked shelves, and the stock's top if allowed. */
function tradeableBooks(state: GameState, settings: ChapterAndVerseSettings) {
  const books = state.shelves.filter(
    (book, index): book is PlayingCard =>
      book !== null && book.faceUp && !state.lockedShelves[index],
  );
  const stockTop = top(state.inventory);
  return { books, stockTop: settings.checkBack ? stockTop : undefined };
}

/**
 * The best trade for the customer at the counter: books worth exactly the
 * offer, earning the most Guild points (books in the customer's suit, and a
 * loyal patron for more than three books) for the fewest books: every book
 * sold leaves the stock thinner for the customers to come, so a point is
 * worth selling two more books for, no more.
 */
function bestTrade(state: GameState, settings: ChapterAndVerseSettings) {
  const customer = top(state.line);
  const usedBook = top(state.usedBooks);
  if (!customer || !usedBook || customer.rank === "Joker") return null;
  const offer = customerMoney(customer) + bookValue(usedBook);
  const { books, stockTop } = tradeableBooks(state, settings);
  const candidates = [...books, ...(stockTop ? [stockTop] : [])];

  const options = candidates.map((book): BookUse[] => {
    const exclusive = isExclusiveOffer(book, usedBook, settings.superExclusive);
    // Only shelf Aces can be offered at $1.
    return book.rank === "A" && !exclusive && book !== stockTop
      ? ["out", "in", "low"]
      : ["out", "in"];
  });
  const worth = (book: PlayingCard, use: BookUse) =>
    use === "out" || isExclusiveOffer(book, usedBook, settings.superExclusive)
      ? 0
      : bookValue(book, use === "low");

  let best: { uses: BookUse[]; guild: number; value: number } | null = null;
  const uses: BookUse[] = [];
  const visit = (index: number, total: number) => {
    if (total > offer) return;
    if (index === candidates.length) {
      const sold = candidates.filter((_, i) => uses[i] !== "out");
      if (total !== offer || sold.length === 0) return;
      const guild =
        sold.filter((book) => book.suit === customer.suit).length +
        (settings.loyalPatrons && sold.length > 3 ? 1 : 0);
      const value = guild - 0.5 * sold.length;
      if (!best || value > best.value + 1e-9) {
        best = { uses: [...uses], guild, value };
      }
      return;
    }
    for (const use of options[index]) {
      uses[index] = use;
      visit(index + 1, total + worth(candidates[index], use));
    }
  };
  visit(0, 0);
  if (!best) return null;
  const { uses: chosen, guild } = best as { uses: BookUse[]; guild: number };
  return {
    offer,
    guild,
    picks: candidates.map((book, i) => ({
      book,
      use: chosen[i],
      onShelf: book !== stockTop,
    })),
  };
}

/** Taps that turn the picks on screen into the trade's. */
function pickTaps(
  picks: { book: PlayingCard; use: BookUse; onShelf: boolean }[],
  current: TradePicks,
  usedBook: PlayingCard,
  settings: ChapterAndVerseSettings,
) {
  return picks.flatMap(({ book, use, onShelf }) => {
    const now: BookUse = !current.selectedIds.includes(book.id)
      ? "out"
      : current.aceAtOneIds.includes(book.id)
        ? "low"
        : "in";
    // A shelf Ace goes out → $11 → $1 → out; any other book out ↔ in.
    const cycle: BookUse[] =
      onShelf &&
      book.rank === "A" &&
      !isExclusiveOffer(book, usedBook, settings.superExclusive)
        ? ["out", "in", "low"]
        : ["out", "in"];
    const taps =
      (cycle.indexOf(use) - cycle.indexOf(now) + cycle.length) % cycle.length;
    return Array.from({ length: taps }, () => cardTarget(book));
  });
}

function findChapterAndVerseHint(
  state: GameState,
  settings: ChapterAndVerseSettings,
  current: TradePicks,
) {
  const customer = top(state.line);
  const usedBook = top(state.usedBooks);
  if (state.ended || !customer || !usedBook || customer.rank === "Joker") {
    return null;
  }
  const trade = bestTrade(state, settings);
  if (!trade) {
    return withNote(
      pressHint("buttons", i18n.t("games:chapterAndVerse.pass")),
      i18n.t("games:chapterAndVerse.hint.pass"),
    );
  }
  const hint = makeHint(
    { key: "press", values: { label: i18n.t("games:chapterAndVerse.trade") } },
    pickTaps(trade.picks, current, usedBook, settings),
    zoneTarget("buttons"),
  );
  return withNote(
    hint,
    trade.guild > 0
      ? i18n.t("games:chapterAndVerse.hint.tradeGuild", {
          value: trade.offer,
          count: trade.guild,
        })
      : i18n.t("games:chapterAndVerse.hint.trade", { value: trade.offer }),
  );
}

export const chapterAndVerseRules = {
  findHint: findChapterAndVerseHint,
  bestTrade,
  createInitialState,
  dealFromDiscard,
  bookValue,
  customerMoney,
  customerPenalty,
  isExclusiveOffer,
  selectedOfferValue,
  outcomeMessage,
};

function createInitialState(): GameState {
  return {
    inventory: [],
    shelves: [],
    lockedShelves: Array.from({ length: SHELF_COUNT }, () => false),
    line: [],
    usedBooks: [],
    guildScore: 0,
    discard: shuffle([
      ...createCards(BOOK_RANKS, "book"),
      ...createCards(CUSTOMER_RANKS, "customer"),
    ]).map((card) => ({ ...card, faceUp: false })),
    interactions: 0,
    ended: false,
    won: false,
  };
}

const gameStateInitial = createInitialState();

function createJokers(count: number) {
  return SUITS.slice(0, count).map((suit, index) => ({
    id: `customer-joker-${index}-${Math.random().toString(36).slice(2, 8)}`,
    suit,
    rank: "Joker" as const,
    faceUp: false,
  }));
}

function dealFromDiscard(draft: GameState) {
  const shuffledDiscard = shuffle(draft.discard);
  const books = shuffledDiscard
    .filter((card) => BOOK_RANKS.includes(card.rank))
    .map((card) => ({ ...card, faceUp: true }));
  const customers = shuffledDiscard
    .filter(
      (card) => CUSTOMER_RANKS.includes(card.rank) || card.rank === "Joker",
    )
    .map((card) => ({ ...card, faceUp: true }));

  draft.usedBooks = books.splice(0, 12);
  draft.guildScore = 3;
  draft.shelves = books.splice(0, SHELF_COUNT);
  draft.lockedShelves = Array.from({ length: SHELF_COUNT }, () => false);
  draft.inventory = books;
  draft.line = customers;
  draft.discard = [];
  draft.interactions = 0;
  draft.ended = false;
  draft.won = false;
}

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
  settings: ChapterAndVerseSettings,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.inventory,
      ...draft.shelves.filter((card): card is PlayingCard => card !== null),
      ...draft.line,
      ...draft.usedBooks,
      ...draft.discard,
    ]
      .filter((card) => card.rank !== "Joker")
      .map((card) => ({ ...card, faceUp: false }));
    draft.discard = shuffle([...allCards, ...createJokers(settings.vandals)]);
    draft.inventory = [];
    draft.shelves = [];
    draft.lockedShelves = Array.from({ length: SHELF_COUNT }, () => false);
    draft.line = [];
    draft.usedBooks = [];
    draft.guildScore = 0;
    draft.interactions = 0;
    draft.ended = false;
    draft.won = false;
  });

  await delay();

  setGame((draft) => {
    dealFromDiscard(draft);
  });
}

export default function ChapterAndVerse() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale, colorDark } = useGameColors();
  const loyalPatrons = useGameSettingValue("chapterAndVerseLoyalPatrons");
  const checkBack = useGameSettingValue("chapterAndVerseCheckBack");
  const superExclusive = useGameSettingValue("chapterAndVerseSuperExclusive");
  const vandals = useGameSettingValue("chapterAndVerseVandals");
  const settingsRef = useRef<ChapterAndVerseSettings>({
    loyalPatrons,
    checkBack,
    superExclusive,
    vandals: vandals === "one" ? 1 : vandals === "two" ? 2 : 0,
  });
  settingsRef.current = {
    loyalPatrons,
    checkBack,
    superExclusive,
    vandals: vandals === "one" ? 1 : vandals === "two" ? 2 : 0,
  };
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
        await resetAndSetup(setGame, settingsRef.current);
      },
    });

  const customer = game.line[game.line.length - 1];
  const usedBook = game.usedBooks[game.usedBooks.length - 1];
  const vandalShown = customer?.rank === "Joker";

  useHint(
    () =>
      findChapterAndVerseHint(game, settingsRef.current, {
        selectedIds,
        aceAtOneIds,
      }),
    { game, enabled: !vandalShown },
  );

  useEffect(() => {
    if (!vandalShown) return;

    let cancelled = false;

    async function resolveVandal() {
      await delay(1200);
      if (cancelled) return;

      setGame((draft) => {
        if (draft.line[draft.line.length - 1]?.rank !== "Joker") return;
        const vandal = draft.line.pop();
        if (!vandal) return;

        draft.discard.push(flipToBack(vandal));
        const shelfIndex = draft.shelves.findIndex(
          (book, index) => book?.faceUp && !draft.lockedShelves[index],
        );
        if (shelfIndex === -1) return;
        const book = draft.shelves[shelfIndex];
        draft.lockedShelves[shelfIndex] = true;
        if (book) draft.shelves[shelfIndex] = flipToBack(book);
      });
    }

    void resolveVandal();

    return () => {
      cancelled = true;
    };
  }, [setGame, vandalShown]);

  const selectedBooks = game.shelves.filter(
    (book): book is PlayingCard =>
      book !== null && selectedIds.includes(book.id),
  );
  const inventoryBook = game.inventory[game.inventory.length - 1];
  if (
    settingsRef.current.checkBack &&
    inventoryBook &&
    selectedIds.includes(inventoryBook.id)
  ) {
    selectedBooks.push(inventoryBook);
  }
  const offerValue =
    customer && usedBook ? customerMoney(customer) + bookValue(usedBook) : 0;
  const selectionValue = usedBook
    ? selectedOfferValue(
        selectedBooks,
        usedBook,
        new Set(aceAtOneIds),
        settingsRef.current.superExclusive,
      )
    : 0;
  const canTrade = selectedBooks.length > 0 && selectionValue === offerValue;

  function toggleShelfBook(book: PlayingCard) {
    if (game.ended) return;

    if (!selectedIds.includes(book.id)) {
      setSelectedIds((ids) => [...ids, book.id]);
      return;
    }

    if (
      book.rank === "A" &&
      !aceAtOneIds.includes(book.id) &&
      !isExclusiveOffer(
        book,
        top(game.usedBooks),
        settingsRef.current.superExclusive,
      )
    ) {
      setAceAtOneIds((ids) => [...ids, book.id]);
      return;
    }

    setSelectedIds((ids) => ids.filter((id) => id !== book.id));
    setAceAtOneIds((ids) => ids.filter((id) => id !== book.id));
  }

  function toggleInventoryBook() {
    const book = game.inventory[game.inventory.length - 1];
    if (!book || game.ended || !settingsRef.current.checkBack) return;
    setSelectedIds((ids) =>
      ids.includes(book.id)
        ? ids.filter((id) => id !== book.id)
        : [...ids, book.id],
    );
  }

  function restock(draft: GameState) {
    draft.shelves = draft.shelves.map((book, index) => {
      if (book || draft.lockedShelves[index]) return book;
      return draft.inventory.pop() ?? null;
    });
  }

  function finishInteraction(draft: GameState) {
    draft.interactions += 1;
    if (draft.interactions === 12) {
      draft.ended = true;
      draft.won = true;
    }
  }

  async function trade() {
    if (!canTrade || !customer || !usedBook) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const activeCustomer = draft.line.pop();
      const activeUsedBook = draft.usedBooks.pop();
      if (!activeCustomer || !activeUsedBook) return;

      draft.shelves = draft.shelves.map((book) => {
        if (!book || !selectedIds.includes(book.id)) return book;
        if (book.suit === activeCustomer.suit) draft.guildScore += 1;
        draft.discard.push(flipToBack(book));
        return null;
      });
      if (
        selectedIds.includes(draft.inventory[draft.inventory.length - 1]?.id)
      ) {
        const inventoryBook = draft.inventory.pop();
        if (inventoryBook?.suit === activeCustomer.suit) {
          draft.guildScore += 1;
          draft.discard.push(flipToBack(inventoryBook));
        } else if (inventoryBook) {
          draft.discard.push(flipToBack(inventoryBook));
        }
      }
      draft.inventory.unshift(activeUsedBook);
      if (settingsRef.current.loyalPatrons && selectedBooks.length > 3) {
        draft.guildScore += 1;
        draft.discard.push(flipToBack(activeCustomer));
      } else {
        draft.discard.push(activeCustomer);
      }
      restock(draft);
      finishInteraction(draft);
    });
    setSelectedIds([]);
    setAceAtOneIds([]);
  }

  async function pass() {
    if (!customer || !usedBook || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const activeCustomer = draft.line.pop();
      const activeUsedBook = draft.usedBooks.pop();
      if (!activeCustomer || !activeUsedBook) return;

      const penalty = customerPenalty(activeCustomer);
      const fired = draft.guildScore < penalty;
      draft.guildScore = Math.max(0, draft.guildScore - penalty);
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
    const shelfZones: MapZone[] = getGridColRows({
      cols: 4,
      rows: 2,
      rowOffset: 2.1,
    }).map((position, index) => ({
      id: `shelf-${index}`,
      name: "shelf",
      pileIndex: index,
      cards: game.shelves[index] ? [game.shelves[index]] : [],
      col: position.c,
      row: position.r,
      baseZIndex: 20 + index,
      placeholder: {},
    }));

    return [
      // Top Row
      {
        id: "customer",
        name: "customer",
        cards: game.line,
        col: 0,
        row: 0.3,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:chapterAndVerse.line"),
          infoPos: "above",
        },
      },
      {
        id: "used-book",
        name: "used-book",
        cards: game.usedBooks,
        col: 1,
        row: 0.3,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("games:chapterAndVerse.used"),
          infoPos: "above",
        },
      },
      {
        id: "inventory",
        name: "inventory",
        cards: game.inventory,
        col: 2,
        row: 0.3,
        baseZIndex: 5,
        fan: { maxVisible: 3 },
        placeholder: { text: i18n.t("cards:stock"), infoPos: "above" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 3,
        row: 0.3,
        baseZIndex: 5,
        fan: { maxVisible: 3 },
        placeholder: {
          text: i18n.t("cards:discard"),
          infoPos: "above",
          showCount: false,
        },
      },

      // HUD
      {
        id: "hud",
        name: "hud",
        col: 0,
        row: 1.2,
        width: "full",
        height: 1,
        baseZIndex: 0,
      },

      // Shelves
      ...shelfZones,

      // Buttons
      {
        id: "buttons",
        name: "buttons",
        col: 0,
        row: 4.2,
        width: "full",
        height: 0.6,
        baseZIndex: 0,
      },
    ];
  }, [customer, game.discard, game.inventory, game.shelves, usedBook]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (
      mappedCard.zoneName === "customer" &&
      mappedCard.topOfZone &&
      vandalShown
    ) {
      return {
        forceOverlayColor: true,
        selectColor: "red",
      };
    } else if (mappedCard.zoneName === "inventory") {
      const book = top(game.inventory);
      const isSelected =
        mappedCard.topOfZone && book && selectedIds.includes(book.id);

      return {
        isSelected,
        selectColor: isSelected ? "blue" : undefined,
        onPress: mappedCard.topOfZone ? toggleInventoryBook : undefined,
        isDisabled:
          game.ended || !settingsRef.current.checkBack || !mappedCard.topOfZone,
      };
    }
    if (mappedCard.zoneName !== "shelf" || mappedCard.pileIndex === undefined)
      return { isDisabled: true };
    const book = game.shelves[mappedCard.pileIndex];
    if (!book) return undefined;
    const isSelected = selectedIds.includes(book.id);
    const aceAtOne = aceAtOneIds.includes(book.id);
    const exclusiveOffer = isExclusiveOffer(
      book,
      top(game.usedBooks),
      settingsRef.current.superExclusive,
    );

    return {
      isSelected,
      selectColor: exclusiveOffer ? "green" : aceAtOne ? "purple" : "blue",
      onPress: () => toggleShelfBook(book),
      isDisabled: game.ended || game.lockedShelves[mappedCard.pileIndex],
    };
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "regular",
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.guildScore}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={
        game.won
          ? outcomeMessage(game.guildScore)
          : i18n.t("games:chapterAndVerse.firedForLosingYourGuild")
      }
    >
      {cardMap}

      {/* ========== HUD ========== */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          getZoneStylesById("hud"),
          { alignItems: "center", gap: spacing(6), marginTop: spacing(2) },
        ]}
      >
        <ProgressBar
          progressValue={selectionValue}
          totalValue={offerValue}
          color={
            selectionValue > offerValue
              ? "red"
              : selectionValue === offerValue
                ? "green"
                : "blue"
          }
          backgroundColor={rgba(colorDark, 0.7)}
          tallyText={`$${selectionValue} / ${offerValue}`}
          scaledHeight={cardHeight * 0.4}
          style={{ flex: 3 }}
          labelText={i18n.t("games:chapterAndVerse.offer")}
        />

        <View style={[flexStyles.colCentered, { flex: 1 }]}>
          <Text size="sm" weight={400} color={colorPale}>
            {i18n.t("games:chapterAndVerse.guildPts")}
          </Text>
          <Text size="xxxl" weight={600} color={Colors.white}>
            {game.guildScore}
          </Text>
        </View>
      </View>

      {/* ========== Card Overlays ========== */}
      {game.shelves.map((book, index) => {
        if (!book) return null;

        const selected = selectedIds.includes(book.id);
        const limitedTimeOfferAvailable = book.rank === "A";
        const limitedTimeOfferOn = aceAtOneIds.includes(book.id);
        const exclusiveOffer = isExclusiveOffer(
          book,
          top(game.usedBooks),
          settingsRef.current.superExclusive,
        );

        const offerBadges: {
          text: string;
          color: string;
          position: {
            top?: number;
            right?: number;
            bottom?: number;
            left?: number;
          };
        }[] = [];

        if (exclusiveOffer) {
          // Exclusive offer ($0)
          offerBadges.push({
            text: "$0",
            color: Colors.buttonGreen,
            position: { bottom: cardWidth * 0.05, left: cardWidth * 0.05 },
          });
        } else if (limitedTimeOfferAvailable) {
          // Limited-time offer ($1/$11)
          offerBadges.push({
            text: selected ? (limitedTimeOfferOn ? "$1" : "$11") : "?",
            color: selected
              ? limitedTimeOfferOn
                ? Colors.buttonPurple
                : Colors.buttonBlue
              : rgba(Colors.buttonDisabled, 0.4),
            position: { top: cardWidth * 0.05, right: cardWidth * 0.05 },
          });
        }

        if (!offerBadges.length) return null;

        return (
          <View
            style={[
              getZoneStylesById(`shelf-${index}`),
              {
                zIndex: 80,
                pointerEvents: "none",
              },
            ]}
            key={book.id}
          >
            {offerBadges.map(({ text, color, position }) => (
              <View
                key={text}
                style={[
                  flexStyles.colCentered,
                  {
                    position: "absolute",
                    width: cardWidth * 0.4,
                    height: cardWidth * 0.4,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: cardWidth * 0.2,
                    ...position,
                  },
                ]}
              >
                <Icon
                  name="offer"
                  size={cardWidth * 0.6}
                  color={color}
                  shadow
                />
                <Text
                  size="xs"
                  weight={500}
                  color={Colors.white}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
                    textAlign: "center",
                  }}
                >
                  {text}
                </Text>
              </View>
            ))}
          </View>
        );
      })}

      {/* ========== Buttons ========== */}
      <View
        style={[
          flexStyles.rowCentered,
          flexStyles.fullWidth,
          getZoneStylesById("buttons"),
          { gap: spacing(12) },
        ]}
      >
        <Button
          text={i18n.t("games:chapterAndVerse.pass")}
          theme="red"
          onPress={pass}
          disabled={vandalShown || game.ended}
          style={{ flex: 1 }}
          taller
        />
        <Button
          text={i18n.t("games:chapterAndVerse.trade")}
          theme="green"
          onPress={trade}
          disabled={vandalShown || !canTrade || game.ended}
          style={{ flex: 1 }}
          taller
        />
      </View>
    </GameWrapper>
  );
}
