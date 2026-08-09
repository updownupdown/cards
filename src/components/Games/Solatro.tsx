import { Button } from "@/components/Button/Button";
import { MappedCard, MapZone, useCardMap } from "@/components/Cards/CardMap";
import { useGameColors } from "@/hooks/useGameColors";
import { useFade } from "@/hooks/useFade";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isJoker,
  RANKS,
  shuffle,
  sortCardsBySuit,
  SUITS,
  zoneFanOffset,
  type CardRank,
  type PlayingCard,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { ProgressBar } from "../Home/ProgressBar";
import { useToast } from "../common/Toast";
import { Icon } from "@/icons";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";

const BASE_HAND_LIMIT = 8;
const BASE_PLAYS = 3;
const BASE_DISCARDS = 3;

const HAND_POINTS = {
  "High Card": 5,
  Pair: 10,
  "Two Pair": 20,
  "Three of a Kind": 30,
  Straight: 40,
  Flush: 50,
  "Full House": 60,
  "Four of a Kind": 100,
  "Straight Flush": 125,
  "Royal Flush": 150,
} as const;

type HandName = keyof typeof HAND_POINTS;
type Phase = "dealing" | "playing" | "scoring" | "shop";
type BonusName =
  | "extraCard"
  | "extraDiscard"
  | "pocketPoints"
  | "extraHand"
  | "doubleScore"
  | "shield";

type BonusInventory = Record<BonusName, boolean>;

export type SolatroGameState = {
  deck: PlayingCard[];
  hand: PlayingCard[];
  discard: PlayingCard[];
  scoring: PlayingCard[];
  bankedJoker: boolean;
  bankedJokerCard: PlayingCard | null;
  round: number;
  roundScore: number;
  totalExcess: number;
  shopPoints: number;
  playsRemaining: number;
  discardsRemaining: number;
  handLimit: number;
  bonuses: BonusInventory;
  doubleNextPlay: boolean;
  usedShield: boolean;
  lastHandName: HandName | null;
  lastHandPoints: number;
  phase: Phase;
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

const BONUS_DETAILS: Record<
  BonusName,
  { label: string; cost: number; theme: string }
> = {
  extraCard: { label: "+ Card", cost: 10, theme: "#8d0000" },
  extraDiscard: { label: "+ Discard", cost: 25, theme: "#006391" },
  pocketPoints: { label: "+ 25 pts", cost: 50, theme: "#006636" },
  extraHand: { label: "+ Hand", cost: 75, theme: "#6500a8" },
  doubleScore: { label: "x2 Score", cost: 100, theme: "#ca5b00" },
  shield: { label: "Shield", cost: 150, theme: "#940063" },
};

const BONUS_NAMES = Object.keys(BONUS_DETAILS) as BonusName[];

const RANK_ORDER: Record<CardRank, number> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  "10": 10,
  "9": 9,
  "8": 8,
  "7": 7,
  "6": 6,
  "5": 5,
  "4": 4,
  "3": 3,
  "2": 2,
  Joker: 0,
};

const ALL_STANDARD_CARDS: PlayingCard[] = SUITS.flatMap((suit) =>
  RANKS.map((rank) => ({
    id: `solatro-wild-${suit}-${rank}`,
    suit,
    rank,
    faceUp: true,
  })),
);

function emptyBonuses(): BonusInventory {
  return {
    extraCard: false,
    extraDiscard: false,
    pocketPoints: false,
    extraHand: false,
    doubleScore: false,
    shield: false,
  };
}

export function createInitialSolatroState(): SolatroGameState {
  return {
    deck: flipAllToBack(createDeck({ includeJokers: true })),
    hand: [],
    discard: [],
    scoring: [],
    bankedJoker: false,
    bankedJokerCard: null,
    round: 1,
    roundScore: 0,
    totalExcess: 0,
    shopPoints: 0,
    playsRemaining: BASE_PLAYS,
    discardsRemaining: BASE_DISCARDS,
    handLimit: BASE_HAND_LIMIT,
    bonuses: emptyBonuses(),
    doubleNextPlay: false,
    usedShield: false,
    lastHandName: null,
    lastHandPoints: 0,
    phase: "playing",
    ended: false,
    won: false,
    winLoseMessage: "",
  };
}

function targetForRound(round: number) {
  return round * 25;
}

function ratingForRounds(rounds: number) {
  if (rounds >= 10) return "Ultra Mega Uber Giga-Dweeb";
  if (rounds >= 7) return "Official Dweeb";
  if (rounds >= 5) return "Little Dweeb";
  if (rounds >= 3) return "Cat Food";
  return null;
}

function progressColorForRound(round: number) {
  const rating = ratingForRounds(round);
  if (rating === "Ultra Mega Uber Giga-Dweeb") return "#c5104c";
  if (rating === "Official Dweeb") return "#e0610b";
  if (rating === "Little Dweeb") return "#750db1";
  if (rating === "Cat Food") return "#1378bb";
  return "#0f9674";
}

function concreteHandName(cards: PlayingCard[]): HandName {
  const values = cards.map((card) => RANK_ORDER[card.rank]);
  const counts = [...new Set(values)]
    .map((value) => values.filter((entry) => entry === value).length)
    .sort((left, right) => right - left);
  const uniqueValues = [...new Set(values)].sort((left, right) => right - left);
  const flush =
    cards.length === 5 && cards.every((card) => card.suit === cards[0].suit);
  const straight =
    cards.length === 5 &&
    uniqueValues.length === 5 &&
    (uniqueValues[0] - uniqueValues[4] === 4 ||
      uniqueValues.join(",") === "14,5,4,3,2");
  const royal =
    straight && flush && uniqueValues.join(",") === "14,13,12,11,10";

  if (royal) return "Royal Flush";
  if (straight && flush) return "Straight Flush";
  if (counts[0] === 4) return "Four of a Kind";
  if (cards.length === 5 && counts[0] === 3 && counts[1] === 2) {
    return "Full House";
  }
  if (flush) return "Flush";
  if (straight) return "Straight";
  if (counts[0] === 3) return "Three of a Kind";
  if (counts[0] === 2 && counts[1] === 2) return "Two Pair";
  if (counts[0] === 2) return "Pair";
  return "High Card";
}

function scorePokerHand(cards: PlayingCard[]): {
  name: HandName;
  points: number;
} {
  const jokerCount = cards.filter(isJoker).length;
  const concrete = cards.filter((card) => !isJoker(card));

  if (jokerCount === 0) {
    const name = concreteHandName(concrete);
    return { name, points: HAND_POINTS[name] };
  }

  const usedCards = new Set(
    concrete.map((card) => `${card.suit}-${card.rank}`),
  );
  let bestName: HandName = "High Card";
  let bestPoints: number = HAND_POINTS[bestName];

  function search(replacements: PlayingCard[], remaining: number) {
    if (remaining === 0) {
      const name = concreteHandName([...concrete, ...replacements]);
      const points = HAND_POINTS[name];
      if (points > bestPoints) {
        bestName = name;
        bestPoints = points;
      }
      return;
    }

    for (const candidate of ALL_STANDARD_CARDS) {
      const key = `${candidate.suit}-${candidate.rank}`;
      if (usedCards.has(key)) continue;
      usedCards.add(key);
      replacements.push(candidate);
      search(replacements, remaining - 1);
      replacements.pop();
      usedCards.delete(key);
    }
  }

  search([], jokerCount);
  return { name: bestName, points: bestPoints };
}

function drawToLimit(state: SolatroGameState, limit = state.handLimit) {
  while (state.hand.length < limit && state.deck.length > 0) {
    const next = state.deck.pop();
    if (!next) break;

    if (!isJoker(next)) {
      state.hand.push(flipToFace(next));
      continue;
    }

    if (!state.bankedJoker) {
      state.bankedJoker = true;
      state.bankedJokerCard = flipToFace(next);
      continue;
    }

    if (state.bankedJokerCard) {
      state.discard.push(flipToBack(state.bankedJokerCard));
    }
    state.discard.push(flipToBack(next));
    state.bankedJoker = false;
    state.bankedJokerCard = null;
  }
  state.hand = sortCardsBySuit(state.hand, 14);
}

function gatherToDiscard(state: SolatroGameState) {
  state.discard = flipAllToBack([
    ...state.deck,
    ...state.hand,
    ...state.discard,
    ...state.scoring,
    ...(state.bankedJokerCard ? [state.bankedJokerCard] : []),
  ]);
  state.deck = [];
  state.hand = [];
  state.scoring = [];
  state.bankedJoker = false;
  state.bankedJokerCard = null;
}

function dealFromDiscard(state: SolatroGameState) {
  if (state.deck.length === 0) {
    state.deck = state.discard;
    state.discard = [];
  }
  drawToLimit(state);
  state.phase = "playing";
}

function finishRound(state: SolatroGameState) {
  if (state.ended || state.phase === "shop") return false;

  const target = targetForRound(state.round);
  const excess = Math.max(0, state.roundScore - target);
  state.usedShield = false;

  if (state.roundScore < target) {
    if (!state.bonuses.shield) {
      const roundsSurvived = state.round - 1;
      const rating = ratingForRounds(roundsSurvived);
      state.ended = true;
      state.won = state.totalExcess >= 500;
      state.winLoseMessage = `${roundsSurvived} rounds survived${rating ? ` - ${rating}` : ""}. Final score: ${state.totalExcess}.`;
      return true;
    }
    state.bonuses.shield = false;
    state.usedShield = true;
  }

  state.shopPoints = excess;
  state.totalExcess += excess;
  state.phase = "shop";
  return true;
}

function buyBonus(state: SolatroGameState, bonus: BonusName) {
  const cost = BONUS_DETAILS[bonus].cost;
  if (
    state.phase !== "shop" ||
    state.bonuses[bonus] ||
    state.shopPoints < cost
  ) {
    return false;
  }
  state.shopPoints -= cost;
  state.bonuses[bonus] = true;
  return true;
}

function activateBonus(state: SolatroGameState, bonus: BonusName) {
  if (
    state.phase !== "playing" ||
    !state.bonuses[bonus] ||
    bonus === "shield"
  ) {
    return false;
  }

  state.bonuses[bonus] = false;
  if (bonus === "extraCard") {
    state.handLimit += 1;
    drawToLimit(state);
  } else if (bonus === "extraDiscard") {
    state.discardsRemaining += 1;
  } else if (bonus === "pocketPoints") {
    state.roundScore += 25;
  } else if (bonus === "extraHand") {
    state.playsRemaining += 1;
  } else if (bonus === "doubleScore") {
    state.doubleNextPlay = true;
  }
  return true;
}

function prepareNextRound(state: SolatroGameState) {
  if (state.phase !== "shop" || state.ended) return false;
  state.discard = flipAllToBack(
    shuffle([...state.deck, ...state.hand, ...state.discard, ...state.scoring]),
  );
  state.deck = [];
  state.hand = [];
  state.scoring = [];
  state.round += 1;
  state.roundScore = 0;
  state.shopPoints = 0;
  state.playsRemaining = BASE_PLAYS;
  state.discardsRemaining = BASE_DISCARDS;
  state.handLimit = BASE_HAND_LIMIT;
  state.doubleNextPlay = false;
  state.usedShield = false;
  state.lastHandName = null;
  state.lastHandPoints = 0;
  state.phase = "dealing";
  return true;
}

export const solatroRules = {
  scorePokerHand,
  targetForRound,
  ratingForRounds,
  drawToLimit,
  gatherToDiscard,
  dealFromDiscard,
  finishRound,
  buyBonus,
  activateBonus,
  prepareNextRound,
  handPoints: HAND_POINTS,
  bonusDetails: BONUS_DETAILS,
};

const gameStateInitial = createInitialSolatroState();

function ScoringPointsAnimation({
  points,
  zoneHeight,
  round,
}: {
  points: number;
  zoneHeight: number;
  round: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(zoneHeight * 0.2);

    const animation = Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.delay(500),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
      Animated.timing(translateY, {
        toValue: -zoneHeight * 0.4,
        duration: 1200,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [zoneHeight]);

  return (
    <Animated.View
      style={{
        position: "relative",
        alignItems: "center",
        pointerEvents: "none",
        opacity,
        transform: [{ translateY }],
      }}
    >
      <Text
        weight={600}
        style={{
          position: "relative",
          zIndex: 2,
          fontSize: zoneHeight * 0.6,
          lineHeight: zoneHeight * 0.6,
        }}
        color={progressColorForRound(round)}
      >
        {`+${points}`}
      </Text>
      <Text
        weight={600}
        style={{
          position: "absolute",
          zIndex: 1,
          fontSize: zoneHeight * 0.6,
          lineHeight: zoneHeight * 0.6,
          top: zoneHeight * 0.04,
          left: zoneHeight * 0.04,
        }}
        color={rgba(Colors.K950, 0.5)}
      >
        {`+${points}`}
      </Text>
    </Animated.View>
  );
}

export default function Solatro() {
  const { colorDark, colorPale } = useGameColors();
  const { spacing } = useResponsiveMetrics();
  const { width: windowWidth } = useViewportDimensions();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [useBankedJoker, setUseBankedJoker] = useState(false);
  const showToast = useToast();
  const previousUsedShield = useRef(false);
  const bankedJokerConsumedRef = useRef(false);
  const bankedJokerShadowScale = useRef(new Animated.Value(1)).current;
  const bankedJokerShadowOpacity = useRef(new Animated.Value(0)).current;
  const [bankedJokerShadowColor, setBankedJokerShadowColor] =
    useState<string>("");

  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager({
      gameStateInitial,
      resetNonGameStates: () => {
        setSelectedIds([]);
        setUseBankedJoker(false);
      },
      resetAndSetup: async () => {
        setGame((draft) => {
          gatherToDiscard(draft);
          draft.deck = shuffle(draft.discard);
          draft.discard = [];
          draft.round = 1;
          draft.roundScore = 0;
          draft.totalExcess = 0;
          draft.shopPoints = 0;
          draft.playsRemaining = BASE_PLAYS;
          draft.discardsRemaining = BASE_DISCARDS;
          draft.handLimit = BASE_HAND_LIMIT;
          draft.bonuses = emptyBonuses();
          draft.doubleNextPlay = false;
          draft.usedShield = false;
          draft.lastHandName = null;
          draft.lastHandPoints = 0;
          draft.phase = "dealing";
          draft.ended = false;
          draft.won = false;
          draft.winLoseMessage = "";
        });
        await delay(1000);
        setGame((draft) => dealFromDiscard(draft));
      },
    });
  const previousBankedJoker = useRef(game.bankedJoker);

  useEffect(() => {
    if (game.usedShield && !previousUsedShield.current) {
      showToast("Shielf has been used");
    }
    previousUsedShield.current = game.usedShield;
  }, [game.usedShield]);

  useEffect(() => {
    const wasBanked = previousBankedJoker.current;
    const wasConsumedForPlay = bankedJokerConsumedRef.current;
    const wasAdded = game.bankedJoker && !wasBanked;
    const wasRemovedDuringPlay =
      !game.bankedJoker &&
      wasBanked &&
      !wasConsumedForPlay &&
      game.phase === "playing";

    if (wasAdded || wasRemovedDuringPlay) {
      setBankedJokerShadowColor(
        wasAdded ? Colors.cardSelectGreen : Colors.cardSelectRed,
      );
      bankedJokerShadowScale.setValue(1);
      bankedJokerShadowOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(bankedJokerShadowScale, {
          toValue: 1.3,
          duration: 1800,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(bankedJokerShadowOpacity, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start();
    }

    bankedJokerConsumedRef.current = false;
    previousBankedJoker.current = game.bankedJoker;
  }, [game.bankedJoker]);

  const selectedCards = game.hand.filter((card) =>
    selectedIds.includes(card.id),
  );
  const selectedCount = selectedCards.length + (useBankedJoker ? 1 : 0);
  const preview =
    selectedCount > 0
      ? scorePokerHand([
          ...selectedCards,
          ...(useBankedJoker && game.bankedJokerCard
            ? [game.bankedJokerCard]
            : []),
        ])
      : null;

  function toggleCard(cardId: string) {
    if (game.phase !== "playing" || game.ended) return;
    setSelectedIds((current) => {
      if (current.includes(cardId)) {
        return current.filter((id) => id !== cardId);
      }
      if (current.length + (useBankedJoker ? 1 : 0) >= 5) return current;
      return [...current, cardId];
    });
  }

  function toggleJoker() {
    if (!game.bankedJoker || game.phase !== "playing") return;
    setUseBankedJoker((current) => (current ? false : selectedIds.length < 5));
  }

  function clearSelection() {
    setSelectedIds([]);
    setUseBankedJoker(false);
  }

  async function playHand() {
    if (!preview || game.playsRemaining <= 0 || selectedCount > 5) return;
    const selected = new Set(selectedIds);
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const playedCards = draft.hand.filter((card) => selected.has(card.id));
      draft.hand = draft.hand.filter((card) => !selected.has(card.id));
      draft.scoring = playedCards;

      let points = preview.points;
      if (draft.doubleNextPlay) {
        points *= 2;
        draft.doubleNextPlay = false;
      }
      if (useBankedJoker && draft.bankedJokerCard) {
        bankedJokerConsumedRef.current = true;
        draft.scoring.push(draft.bankedJokerCard);
        draft.bankedJoker = false;
        draft.bankedJokerCard = null;
      }

      draft.lastHandName = preview.name;
      draft.lastHandPoints = points;
      draft.playsRemaining -= 1;
      draft.phase = "scoring";
    });
    setSelectedIds([]);
    setUseBankedJoker(false);

    setGame((draft) => {
      draft.roundScore += draft.lastHandPoints;
    });

    await delay(2000);

    setGame((draft) => {
      draft.discard.push(...flipAllToBack(draft.scoring));
      draft.scoring = [];
      if (draft.phase === "scoring") {
        if (draft.playsRemaining === 0) {
          finishRound(draft);
        } else {
          draft.phase = "playing";
          drawToLimit(draft);
        }
      }
    });
  }

  function discardCards() {
    if (
      selectedIds.length < 1 ||
      selectedIds.length > 5 ||
      game.discardsRemaining <= 0
    ) {
      return;
    }
    const selected = new Set(selectedIds);
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      const discarded = draft.hand.filter((card) => selected.has(card.id));
      draft.hand = draft.hand.filter((card) => !selected.has(card.id));
      draft.discard.push(...flipAllToBack(discarded));
      draft.discardsRemaining -= 1;
      drawToLimit(draft);
    });
    setSelectedIds([]);
    setUseBankedJoker(false);
  }

  function activateOwnedBonus(bonus: BonusName) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      activateBonus(draft, bonus);
    });
  }

  function purchaseBonus(bonus: BonusName) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      buyBonus(draft, bonus);
    });
  }

  async function nextRound() {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      prepareNextRound(draft);
    });
    setSelectedIds([]);
    setUseBankedJoker(false);
    await delay(1000);
    setGame((draft) => dealFromDiscard(draft));
  }

  const zones: MapZone[] = useMemo(
    () => [
      { id: "hud", col: 1.4, row: 0.1, width: 3.2, height: 1.3 },
      {
        id: "top-background",
        col: 0,
        row: 0,
        width: 6,
        height: 1.5,
        placeholder: {},
      },
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0.1,
        row: 0.25,
        fan: { maxVisible: 3 },
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 4.9,
        row: 0.25,
        fan: { maxVisible: 3 },
      },
      {
        id: "scoring",
        name: "scoring",
        cards: game.scoring,
        col: 0,
        row: 1.6,
        width: 6,
        height: 1.2,
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.scoring.length, 5.7, 0.1, 0.9),
        },
      },
      {
        id: "items",
        col: 0,
        row: 1.6,
        width: 1.4,
        height: 2.4,
      },
      { id: "message", col: 1.5, row: 3, width: 3.4, height: 1 },
      {
        id: "banked-joker",
        name: "bankedJoker",
        cards: game.bankedJokerCard ? [game.bankedJokerCard] : [],
        col: 5,
        row: 3,
        placeholder: { iconName: "joker" },
      },
      {
        id: "hand",
        name: "hand",
        cards: game.hand,
        col: 0,
        row: 4.2,
        width: 6,
        height: 1.2,
        placeholder: {},
        fan: {
          direction: "right",
          offset: zoneFanOffset(game.hand.length, 5.7, 0.1, 0.95),
        },
      },
      { id: "controls", col: 0, row: 5.6, width: "full", height: 0.8 },
      { id: "shop", col: 0, row: 1.6, width: 6, height: 4.8 },
    ],
    [game],
  );

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const isDisabled = game.phase !== "playing" || game.ended;

    if (mappedCard.zoneName === "hand") {
      const selected = selectedIds.includes(mappedCard.card.id);
      return {
        onPress: () => toggleCard(mappedCard.card.id),
        isDisabled,
        isSelected: selected,
        selectColor: selected ? "green" : "none",
        yOffset: selected ? -0.1 : 0,
      };
    }

    if (mappedCard.zoneName === "bankedJoker") {
      return {
        onPress: toggleJoker,
        isDisabled,
        isSelected: useBankedJoker,
        selectColor: useBankedJoker ? "green" : "none",
      };
    }

    return {};
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    gap: 0,
    // visualizer: true,
  });

  const target = targetForRound(game.round);
  const ownedBonuses = BONUS_NAMES.filter((bonus) => game.bonuses[bonus]);
  const { isRendered: isShopRendered, opacity: shopOpacity } = useFade(
    game.phase === "shop",
  );

  return (
    <GameWrapper
      outcome={game.ended ? "lost" : "playing"}
      score={game.totalExcess}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={game.winLoseMessage}
    >
      {cardMap}

      <Animated.View
        style={[
          getZoneStylesById("banked-joker"),
          {
            boxShadow: `0 0 ${spacing(10)}px ${spacing(4)}px ${bankedJokerShadowColor}`,
            borderRadius: spacing(8),
            opacity: bankedJokerShadowOpacity,
            transform: [{ scale: bankedJokerShadowScale }],
            zIndex: 100,
            pointerEvents: "none",
          },
        ]}
      />

      {/* ---------- Score Animation ---------- */}
      {game.phase === "scoring" && (
        <View
          style={[
            getZoneStylesById("scoring"),
            {
              alignItems: "center",
              overflow: "visible",
              zIndex: 100,
              pointerEvents: "none",
            },
          ]}
        >
          <ScoringPointsAnimation
            points={game.lastHandPoints}
            zoneHeight={cardHeight}
            round={game.round}
          />
        </View>
      )}

      {/* ---------- HUD ---------- */}
      <View
        style={[
          flexStyles.colCentered,
          flexStyles.spaceAround,
          getZoneStylesById("hud"),
        ]}
      >
        <ProgressBar
          labelText={`Round ${game.round}`}
          progressValue={game.roundScore}
          totalValue={target}
          color={progressColorForRound(game.round)}
          autoTallyText
          scaledHeight={cardHeight * 0.42}
          backgroundColor={rgba(colorDark, 0.5)}
        />

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.spaceBetween,
            flexStyles.fullWidth,
            { paddingHorizontal: windowWidth > 400 ? spacing(12) : 0 },
          ]}
        >
          {[
            {
              label: "Discards",
              value: game.discardsRemaining,
              color: Colors.cardSelectRed,
            },
            {
              label: "Plays",
              value: game.playsRemaining,
              color: Colors.cardSelectGreen,
            },
            {
              label: "Bonus",
              value: `${Math.max(0, game.roundScore - target)}`,
              color: Colors.trophyGold,
            },
          ].map(({ label, value, color }) => (
            <View key={label} style={[flexStyles.colCentered]}>
              <Text size="sm" weight={400} color={color}>
                {label}
              </Text>
              <Text
                size="xxl"
                weight={600}
                color={rgba(color, Number(value) === 0 ? 0.4 : 1)}
              >
                {value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ---------- Owned Bonuses ---------- */}
      <View
        style={[
          flexStyles.colCentered,
          getZoneStylesById("items"),
          {
            justifyContent: "flex-end",
            gap: spacing(8),
          },
        ]}
      >
        {ownedBonuses.map((bonus) => (
          <Button
            key={bonus}
            text={bonus === "shield" ? "Shield" : BONUS_DETAILS[bonus].label}
            theme={BONUS_DETAILS[bonus].theme}
            size="xs"
            onPress={() => activateOwnedBonus(bonus)}
            disabled={bonus === "shield"}
            fullWidth
            style={{
              paddingHorizontal: 0,
              paddingVertical: 0,
              borderRadius: spacing(6),
              height: ownedBonuses.length === 6 ? "13%" : "16%",
            }}
            halfTaller
          />
        ))}
      </View>

      {/* ---------- Message ---------- */}
      <View style={[flexStyles.colCentered, getZoneStylesById("message")]}>
        {preview ? (
          <View style={[flexStyles.colCentered]}>
            <Text size="lg" weight={400} color={colorPale}>
              {preview.name}
            </Text>
            <Text size="xxxl" weight={600} color={colorPale}>
              {`${preview.points}${game.doubleNextPlay ? " x2" : ""}`}
            </Text>
          </View>
        ) : (
          <Text size="sm" weight={300} color={rgba(colorPale, 0.5)}>
            Choose up to 5 cards
          </Text>
        )}
      </View>

      {/* ---------- Buttons ---------- */}
      <View
        style={[
          getZoneStylesById("controls"),
          flexStyles.colCentered,
          { gap: spacing(10) },
        ]}
      >
        {(game.phase === "playing" || game.phase === "scoring") && (
          <View
            style={[
              flexStyles.rowCentered,
              { width: "100%", gap: spacing(12) },
            ]}
          >
            <Button
              text="Clear"
              theme="blue"
              size="md"
              onPress={clearSelection}
              disabled={
                game.phase === "scoring" ||
                (selectedIds.length === 0 && !useBankedJoker)
              }
              taller
            />
            <Button
              text="Discard"
              theme="red"
              size="md"
              onPress={discardCards}
              disabled={
                game.phase === "scoring" ||
                selectedIds.length < 1 ||
                game.discardsRemaining <= 0
              }
              style={{ flex: 1 }}
              taller
            />
            <Button
              text="Play"
              theme="green"
              size="md"
              onPress={playHand}
              disabled={
                game.phase === "scoring" || !preview || game.playsRemaining <= 0
              }
              style={{ flex: 1 }}
              taller
            />
          </View>
        )}
      </View>

      {/* ---------- Shoppe ---------- */}
      {isShopRendered && (
        <Animated.View
          style={[
            getZoneStylesById("shop"),
            flexStyles.colCentered,
            {
              gap: spacing(24),
              padding: spacing(24),
              backgroundColor: colorDark,
              borderRadius: spacing(24),
              zIndex: 90,
              opacity: shopOpacity,
              boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(8)}px ${rgba(colorDark, 0.4)}, ${spacing(2)}px ${spacing(4)}px ${spacing(20)}px ${rgba(colorDark, 0.4)}`,
            },
          ]}
        >
          <View style={[flexStyles.colCentered, { gap: spacing(4) }]}>
            <Text
              size="xl"
              weight={600}
              color={rgba(Colors.white, 0.7)}
              textTransform="uppercase"
            >
              Bonus Shoppe
            </Text>
            <View
              style={[
                flexStyles.rowCentered,
                { alignItems: "flex-end", gap: spacing(6) },
              ]}
            >
              <Text
                size="xxxl"
                weight={600}
                color={Colors.trophyGold}
                lineHeight={1}
              >
                {game.shopPoints}
              </Text>
              <Text
                size="lg"
                weight={400}
                color={Colors.trophyGold}
                lineHeight={1}
              >
                points
              </Text>
            </View>
          </View>

          <View
            style={[
              flexStyles.rowCentered,
              {
                width: "100%",
                flex: 1,
                flexWrap: "wrap",
                gap: "4%",
              },
            ]}
          >
            {BONUS_NAMES.map((bonus) => {
              const details = BONUS_DETAILS[bonus];
              return (
                <View
                  key={bonus}
                  style={[flexStyles.colCentered, { width: "48%" }]}
                >
                  <Button
                    text={details.label}
                    theme={
                      game.bonuses[bonus] || game.shopPoints < details.cost
                        ? Colors.K850
                        : details.theme
                    }
                    size="md"
                    onPress={() => purchaseBonus(bonus)}
                    disabled={
                      game.bonuses[bonus] || game.shopPoints < details.cost
                    }
                    fullWidth
                    taller
                    style={{
                      justifyContent: "flex-start",
                      paddingLeft: spacing(14),
                      borderRadius: spacing(10),
                      opacity:
                        game.bonuses[bonus] || game.shopPoints < details.cost
                          ? 0.4
                          : 1,
                    }}
                  />

                  <View
                    style={[
                      flexStyles.colCentered,
                      {
                        position: "absolute",
                        top: "50%",
                        right: spacing(8),
                        transform: [{ translateY: "-50%" }],
                        padding: spacing(4),
                        backgroundColor: rgba(Colors.K950, 0.8),
                        width: spacing(40),
                        height: spacing(40),
                        borderRadius: spacing(20),
                        boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(colorDark, 0.6)}`,
                      },
                    ]}
                  >
                    {game.bonuses[bonus] ? (
                      <Icon name="check-circle" size={26} color={Colors.K750} />
                    ) : (
                      <Text
                        size="md"
                        weight={700}
                        color={
                          game.shopPoints < details.cost
                            ? Colors.cardSelectRed
                            : Colors.trophyGold
                        }
                      >
                        {details.cost}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
          <Button
            text={`Start Round ${game.round + 1}`}
            theme={colorDark}
            size="md"
            onPress={nextRound}
            fullWidth
            halfTaller
          />
        </Animated.View>
      )}
    </GameWrapper>
  );
}
