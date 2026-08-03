import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { Colors, rgba } from "@/styles/styles";
import { useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  type CardRank,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

type MerchantSettings = {
  loyalPatrons: boolean;
  checkBack: boolean;
  superExclusive: boolean;
  vandals: 0 | 1 | 2;
};

export type MerchantsSolitaireGameState = {
  line: PlayingCard[];
  usedItems: PlayingCard[];
  inventory: PlayingCard[];
  shop: (PlayingCard | null)[];
  lockedShelves: boolean[];
  guildStanding: PlayingCard[];
  discard: PlayingCard[];
  currentCustomer: PlayingCard | null;
  currentUsedItem: PlayingCard | null;
  turnsCompleted: number;
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

type TradeSelection = {
  shopIndexes: number[];
  includeInventory: boolean;
  lowAceIds: string[];
};

const SHOP_SIZE = 8;
const ITEM_RANKS: CardRank[] = [
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

const gameStateInitial: MerchantsSolitaireGameState = {
  line: [],
  usedItems: [],
  inventory: [],
  shop: Array.from({ length: SHOP_SIZE }, () => null),
  lockedShelves: Array.from({ length: SHOP_SIZE }, () => false),
  guildStanding: [],
  discard: [],
  currentCustomer: null,
  currentUsedItem: null,
  turnsCompleted: 0,
  ended: false,
  won: false,
  winLoseMessage: "",
};

function itemValue(card: PlayingCard, lowAceIds: readonly string[] = []) {
  if (card.rank === "A") return lowAceIds.includes(card.id) ? 1 : 11;
  return rankValue(card);
}

function customerValue(card: PlayingCard) {
  return rankValue(card);
}

function customerPenalty(card: PlayingCard) {
  if (card.rank === "J") return 1;
  if (card.rank === "Q") return 2;
  return 3;
}

function createMerchantDecks(vandals: number) {
  const deck = createDeck({ faceUp: false });
  const items = deck.filter((card) => ITEM_RANKS.includes(card.rank));
  const customers = deck.filter((card) => CUSTOMER_RANKS.includes(card.rank));
  const jokers = createDeck({ includeJokers: true }).filter(
    (card) => card.rank === "Joker",
  );
  return {
    items: shuffle(items),
    customers: shuffle([
      ...customers,
      ...jokers.slice(0, vandals).map(flipToFace),
    ]),
  };
}

function selectedCards(
  state: Readonly<MerchantsSolitaireGameState>,
  selection: TradeSelection,
) {
  const fromShop = selection.shopIndexes
    .map((index) => state.shop[index])
    .filter((card): card is PlayingCard => card !== null);
  const inventoryTop = state.inventory[state.inventory.length - 1];
  return selection.includeInventory && inventoryTop
    ? [...fromShop, inventoryTop]
    : fromShop;
}

function isExclusive(
  card: PlayingCard,
  usedItem: PlayingCard,
  superExclusive: boolean,
) {
  return (
    card.suit === usedItem.suit ||
    (superExclusive && card.rank === usedItem.rank)
  );
}

function offerTotal(
  cards: PlayingCard[],
  usedItem: PlayingCard,
  settings: Pick<MerchantSettings, "superExclusive">,
  lowAceIds: readonly string[],
) {
  return cards.reduce(
    (sum, card) =>
      sum +
      (isExclusive(card, usedItem, settings.superExclusive)
        ? 0
        : itemValue(card, lowAceIds)),
    0,
  );
}

function targetValue(customer: PlayingCard, usedItem: PlayingCard) {
  return customerValue(customer) + itemValue(usedItem);
}

function restockShop(draft: MerchantsSolitaireGameState) {
  for (let index = 0; index < SHOP_SIZE; index += 1) {
    if (draft.lockedShelves[index] || draft.shop[index] !== null) continue;
    const card = draft.inventory.pop();
    if (!card) break;
    draft.shop[index] = flipToFace(card);
  }
}

function promotionMessage(standing: number) {
  if (standing >= 18) return "Promoted to Guildmaster!";
  if (standing >= 16) return "Promoted to Elder!";
  if (standing >= 14) return "Promoted to Master!";
  if (standing >= 12) return "Promoted to Journeyman!";
  if (standing >= 10) return "Promoted to Novice!";
  return "Removed from the Guild.";
}

function finishIfLineEmpty(draft: MerchantsSolitaireGameState) {
  if (draft.line.length > 0) return false;
  draft.ended = true;
  draft.won = draft.guildStanding.length >= 10;
  draft.winLoseMessage = promotionMessage(draft.guildStanding.length);
  return true;
}

function advanceToCustomer(draft: MerchantsSolitaireGameState) {
  while (draft.line.length > 0) {
    const customer = draft.line.pop()!;
    if (customer.rank === "Joker") {
      draft.discard.push(flipToFace(customer));
      const shelf = draft.shop.findIndex(
        (card, index) => card !== null && !draft.lockedShelves[index],
      );
      if (shelf !== -1) {
        draft.lockedShelves[shelf] = true;
        draft.shop[shelf] = draft.shop[shelf]
          ? flipToBack(draft.shop[shelf]!)
          : null;
      }
      continue;
    }

    const usedItem = draft.usedItems.pop();
    if (!usedItem) break;
    draft.currentCustomer = flipToFace(customer);
    draft.currentUsedItem = flipToFace(usedItem);
    return;
  }

  finishIfLineEmpty(draft);
}

function resolveTrade(
  draft: MerchantsSolitaireGameState,
  selection: TradeSelection,
  settings: MerchantSettings,
) {
  const customer = draft.currentCustomer;
  const usedItem = draft.currentUsedItem;
  if (!customer || !usedItem || draft.ended) return false;

  const cards = selectedCards(draft, selection);
  if (
    cards.length === 0 ||
    offerTotal(cards, usedItem, settings, selection.lowAceIds) !==
      targetValue(customer, usedItem)
  ) {
    return false;
  }

  const selectedIds = new Set(cards.map((card) => card.id));
  draft.shop = draft.shop.map((card) =>
    card && selectedIds.has(card.id) ? null : card,
  );
  if (selection.includeInventory) draft.inventory.pop();
  draft.inventory.unshift(flipToFace(usedItem));

  for (const card of cards) {
    if (card.suit === customer.suit) draft.guildStanding.push(flipToBack(card));
    else draft.discard.push(flipToFace(card));
  }
  if (settings.loyalPatrons && cards.length >= 4) {
    draft.guildStanding.push(flipToBack(customer));
  } else {
    draft.discard.push(customer);
  }

  draft.currentCustomer = null;
  draft.currentUsedItem = null;
  draft.turnsCompleted += 1;
  restockShop(draft);
  if (!finishIfLineEmpty(draft)) advanceToCustomer(draft);
  return true;
}

function passCustomer(draft: MerchantsSolitaireGameState) {
  const customer = draft.currentCustomer;
  const usedItem = draft.currentUsedItem;
  if (!customer || !usedItem || draft.ended) return false;

  const penalty = customerPenalty(customer);
  const paid = draft.guildStanding.splice(
    Math.max(0, draft.guildStanding.length - penalty),
  );
  draft.discard.push(...paid, customer, usedItem);
  draft.currentCustomer = null;
  draft.currentUsedItem = null;
  draft.turnsCompleted += 1;

  if (paid.length < penalty) {
    draft.ended = true;
    draft.won = false;
    draft.winLoseMessage = "Your Guild Standing could not cover the penalty.";
    return true;
  }

  restockShop(draft);
  if (!finishIfLineEmpty(draft)) advanceToCustomer(draft);
  return true;
}

export const merchantsSolitaireRules = {
  itemValue,
  customerPenalty,
  createMerchantDecks,
  isExclusive,
  offerTotal,
  targetValue,
  restockShop,
  advanceToCustomer,
  resolveTrade,
  passCustomer,
};

export default function MerchantsSolitaire() {
  const { spacing } = useResponsiveMetrics();
  const loyalPatrons = useGameSettingValue("merchantLoyalPatrons");
  const checkBack = useGameSettingValue("merchantCheckBack");
  const superExclusive = useGameSettingValue("merchantSuperExclusive");
  const vandals = useGameSettingValue("merchantVandals");
  const settingsRef = useRef<MerchantSettings>({
    loyalPatrons,
    checkBack,
    superExclusive,
    vandals,
  });
  settingsRef.current = { loyalPatrons, checkBack, superExclusive, vandals };

  const [selection, setSelection] = useState<TradeSelection>({
    shopIndexes: [],
    includeInventory: false,
    lowAceIds: [],
  });

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () =>
        setSelection({
          shopIndexes: [],
          includeInventory: false,
          lowAceIds: [],
        }),
      resetAndSetup: async () => {
        setGame((draft) => {
          const decks = createMerchantDecks(settingsRef.current.vandals);
          draft.shop = decks.items.splice(0, SHOP_SIZE).map(flipToFace);
          draft.line = decks.customers.map(flipToFace);
          draft.usedItems = decks.items.splice(0, 12).map(flipToBack);
          draft.guildStanding = decks.items.splice(0, 3).map(flipToBack);
          draft.inventory = decks.items.map(flipToFace);
          draft.lockedShelves = Array.from({ length: SHOP_SIZE }, () => false);
          draft.discard = [];
          draft.currentCustomer = null;
          draft.currentUsedItem = null;
          draft.turnsCompleted = 0;
          draft.ended = false;
          draft.won = false;
          draft.winLoseMessage = "";
          advanceToCustomer(draft);
        });
      },
    });

  const selected = useMemo(
    () => selectedCards(game, selection),
    [game, selection],
  );
  const offer =
    game.currentUsedItem && game.currentCustomer
      ? offerTotal(
          selected,
          game.currentUsedItem,
          settingsRef.current,
          selection.lowAceIds,
        )
      : 0;
  const target =
    game.currentUsedItem && game.currentCustomer
      ? targetValue(game.currentCustomer, game.currentUsedItem)
      : 0;

  function toggleShop(index: number) {
    if (game.ended || !game.shop[index] || game.lockedShelves[index]) return;
    setSelection((current) => ({
      ...current,
      shopIndexes: current.shopIndexes.includes(index)
        ? current.shopIndexes.filter((value) => value !== index)
        : [...current.shopIndexes, index],
    }));
  }

  function toggleInventory() {
    if (!checkBack || game.ended || game.inventory.length === 0) return;
    setSelection((current) => ({
      ...current,
      includeInventory: !current.includeInventory,
    }));
  }

  function toggleAceValue(card: PlayingCard) {
    setSelection((current) => ({
      ...current,
      lowAceIds: current.lowAceIds.includes(card.id)
        ? current.lowAceIds.filter((id) => id !== card.id)
        : [...current.lowAceIds, card.id],
    }));
  }

  function trade() {
    if (game.ended || offer !== target) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      resolveTrade(draft, selection, settingsRef.current);
    });
    setSelection({ shopIndexes: [], includeInventory: false, lowAceIds: [] });
  }

  function pass() {
    if (game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      passCustomer(draft);
    });
    setSelection({ shopIndexes: [], includeInventory: false, lowAceIds: [] });
  }

  const zones: MapZone[] = useMemo(() => {
    const shopZones = game.shop.map((card, index) => ({
      id: `shop-${index}`,
      name: "shop",
      pileIndex: index,
      cards: card ? [card] : undefined,
      col: 2 + (index % 4),
      row: 1.55 + Math.floor(index / 4),
      baseZIndex: 20,
      placeholder: {},
    }));
    return [
      { id: "hud", col: 0, row: 0, width: 3.8, height: 1 },
      {
        id: "line",
        name: "line",
        cards: game.line,
        col: 4,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Line", infoPos: "above" },
      },
      {
        id: "used",
        name: "used",
        cards: game.usedItems,
        col: 5.25,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Used", infoPos: "above" },
      },
      {
        id: "inventory",
        name: "inventory",
        cards: game.inventory,
        col: 6.5,
        row: 0,
        fan: { maxVisible: 3 },
        placeholder: { text: "Stock", infoPos: "above" },
      },
      {
        id: "customer",
        name: "customer",
        cards: game.currentCustomer ? [game.currentCustomer] : undefined,
        col: 0,
        row: 1.55,
        placeholder: { text: "Customer", infoPos: "below" },
      },
      {
        id: "usedItem",
        name: "usedItem",
        cards: game.currentUsedItem ? [game.currentUsedItem] : undefined,
        col: 0,
        row: 2.8,
        placeholder: { text: "Used Item", infoPos: "below" },
      },
      ...shopZones,
      {
        id: "guild",
        name: "guild",
        cards: game.guildStanding,
        col: 0,
        row: 4.3,
        fan: { maxVisible: 3 },
        placeholder: { text: "Guild", infoPos: "below" },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 1.25,
        row: 4.3,
        fan: { maxVisible: 3 },
        placeholder: { text: "Discard", infoPos: "below" },
      },
      { id: "controls", col: 2.5, row: 4.25, width: 5, height: 1.5 },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "shop" && mappedCard.pileIndex !== undefined) {
      const index = mappedCard.pileIndex;
      const isSelected = selection.shopIndexes.includes(index);
      const isLocked = game.lockedShelves[index];
      return {
        isSelected,
        isDisabled: game.ended || isLocked,
        selectColor: isSelected ? "green" : "none",
        onPress: () => toggleShop(index),
      };
    }
    if (mappedCard.zoneName === "inventory") {
      return {
        isSelected: selection.includeInventory,
        isDisabled: game.ended || !checkBack || !mappedCard.topOfZone,
        selectColor: selection.includeInventory ? "green" : "none",
        onPress: toggleInventory,
      };
    }
    return { isDisabled: true };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    fixedCols: 7.5,
    fixedRows: 6.1,
    paddingTop: 0.25,
    paddingBottom: 0.25,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.guildStanding.length}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={game.winLoseMessage}
    >
      {cardMap}
      <View style={[getZoneStylesById("hud"), { justifyContent: "center" }]}>
        <Text size="xs" color={rgba(Colors.white, 0.72)}>
          TURN {Math.min(game.turnsCompleted + 1, 12)} OF 12
        </Text>
        <Text size="lg" weight="bold" color="#f1e5c6">
          Guild Standing: {game.guildStanding.length}
        </Text>
        <Text size="sm" color={rgba(Colors.white, 0.85)}>
          Offer: {offer} / {target}
        </Text>
      </View>

      <View style={[getZoneStylesById("controls"), { gap: spacing(7) }]}>
        <Text size="xs" color={rgba(Colors.white, 0.8)}>
          Match the exact offer. Used Item type is free.
        </Text>
        {selected.filter((card) => card.rank === "A").length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing(6) }}
          >
            {selected
              .filter((card) => card.rank === "A")
              .map((card) => (
                <Button
                  key={card.id}
                  text={`Ace $${selection.lowAceIds.includes(card.id) ? 1 : 11}`}
                  size="xs"
                  theme="blue"
                  onPress={() => toggleAceValue(card)}
                />
              ))}
          </ScrollView>
        )}
        <View style={{ flexDirection: "row", gap: spacing(8) }}>
          <Button
            text="Trade"
            theme="green"
            onPress={trade}
            disabled={game.ended || offer !== target}
            style={{ flex: 1 }}
          />
          <Button
            text={`Pass (-${game.currentCustomer ? customerPenalty(game.currentCustomer) : 0})`}
            theme="red"
            onPress={pass}
            disabled={game.ended || !game.currentCustomer}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </GameWrapper>
  );
}
