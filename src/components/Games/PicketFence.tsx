import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { produce } from "immer";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  collectCards,
  createDeck,
  flipAllToBack,
  flipToFace,
  rankValue,
  redealWith,
  shuffle,
  SUIT_SYMBOLS,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { useToast } from "../common/Toast";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { Icon } from "@/icons";

// A flip-and-write in cards (Welcome To...): each turn one card is built as a
// house, whose number must rise along its street, and another card's suit
// gives an effect. Two cards a turn use the deck in 26 turns.
const STREET_LENGTHS = [6, 7, 8];
const HAND_SIZE = 3;
// Points for 0, 1, 2... parks on each street; extra parks score nothing.
const PARK_POINTS = [
  [0, 2, 4, 10],
  [0, 2, 4, 6, 14],
  [0, 2, 4, 6, 8, 18],
];
const POOL_LOTS = [
  [1, 4],
  [2, 5],
  [1, 4, 6],
];
const POOL_POINTS = [0, 3, 6, 9, 13, 17, 21, 26];
// Points for a completed estate of 1 to 6 houses; longer estates score nothing.
const ESTATE_POINTS = [0, 1, 3, 5, 7, 9, 11];
const MAX_ESTATE = ESTATE_POINTS.length - 1;
const WIN_SCORE = 60;

const TIERS = [
  { min: 80, key: "games:picketFence.tierPicturePerfect" },
  { min: 70, key: "games:picketFence.tierModelSuburb" },
  { min: WIN_SCORE, key: "games:picketFence.tierGoodNeighbours" },
  { min: 45, key: "games:picketFence.tierQuietStreet" },
  { min: -Infinity, key: "games:picketFence.tierVacantLots" },
] as const;

type Street = {
  houses: (PlayingCard | null)[];
  /** The effect card tucked under each house: a park or a pool. */
  tucked: (PlayingCard | null)[];
  /** fences[g] stands between lot g and lot g + 1. */
  fences: boolean[];
};

type Lot = { street: number; lot: number };
type FenceSpot = { street: number; gap: number };

export type PicketFenceGameState = {
  deck: PlayingCard[];
  hand: PlayingCard[];
  streets: Street[];
  discard: PlayingCard[];
  /** The house built this turn, waiting for its effect card. */
  pending: Lot | null;
};

function emptyStreets(): Street[] {
  return STREET_LENGTHS.map((length) => ({
    houses: Array.from({ length }, () => null),
    tucked: Array.from({ length }, () => null),
    fences: Array.from({ length: length - 1 }, () => false),
  }));
}

// ========== Rules ========== //
function houseNumber(card: PlayingCard) {
  return rankValue(card);
}

/** The built numbers either side of a lot, or 0 and 14 at the street ends. */
function neighbours(houses: (PlayingCard | null)[], lot: number) {
  let low = 0;
  let high = 14;
  for (let i = lot - 1; i >= 0; i--) {
    const house = houses[i];
    if (house) {
      low = houseNumber(house);
      break;
    }
  }
  for (let i = lot + 1; i < houses.length; i++) {
    const house = houses[i];
    if (house) {
      high = houseNumber(house);
      break;
    }
  }
  return { low, high };
}

function canBuild(street: Street, lot: number, value: number) {
  if (street.houses[lot]) return false;
  const { low, high } = neighbours(street.houses, lot);
  return value > low && value < high;
}

function legalLots(streets: Street[], value: number): Lot[] {
  return streets.flatMap((street, s) =>
    street.houses.flatMap((_, lot) =>
      canBuild(street, lot, value) ? [{ street: s, lot }] : [],
    ),
  );
}

/** An empty lot no number can ever fill: its neighbours are consecutive. */
function isDeadLot(street: Street, lot: number) {
  if (street.houses[lot]) return false;
  const { low, high } = neighbours(street.houses, lot);
  return high - low <= 1;
}

function openFences(streets: Street[]): FenceSpot[] {
  return streets.flatMap((street, s) =>
    street.fences.flatMap((fence, gap) => (fence ? [] : [{ street: s, gap }])),
  );
}

/** The estates of a street as [first lot, last lot], split by its fences. */
function estates(street: Street): [number, number][] {
  const result: [number, number][] = [];
  let start = 0;
  for (let lot = 0; lot < street.houses.length; lot++) {
    if (lot === street.houses.length - 1 || street.fences[lot]) {
      result.push([start, lot]);
      start = lot + 1;
    }
  }
  return result;
}

type EstateStatus = "complete" | "open" | "blocked";

/**
 * Whether an estate is built, can still be built, or never can: it is too
 * long, or a gap in it has more empty lots than numbers left to fill them.
 */
function estateStatus(street: Street, [first, last]: [number, number]) {
  const size = last - first + 1;
  if (size > MAX_ESTATE) return "blocked";

  const houses = street.houses;
  if (houses.slice(first, last + 1).every(Boolean)) return "complete";

  let lot = first;
  while (lot <= last) {
    if (houses[lot]) {
      lot++;
      continue;
    }
    let end = lot;
    while (end + 1 <= last && !houses[end + 1]) end++;
    // Empty lots just outside the estate don't need filling, but the numbers
    // either side of the gap still bound it.
    const { low, high } = neighbours(houses, lot);
    if (high - low - 1 < end - lot + 1) return "blocked";
    lot = end + 1;
  }
  return "open";
}

function parkCount(street: Street) {
  return street.tucked.filter((card) => card?.suit === "hearts").length;
}

function parkScore(street: Street, s: number) {
  const points = PARK_POINTS[s];
  return points[Math.min(parkCount(street), points.length - 1)];
}

function poolCount(streets: Street[]) {
  return streets.reduce(
    (sum, street) =>
      sum + street.tucked.filter((card) => card?.suit === "diamonds").length,
    0,
  );
}

function estateScore(street: Street) {
  return estates(street).reduce((sum, estate) => {
    if (estateStatus(street, estate) !== "complete") return sum;
    return sum + ESTATE_POINTS[estate[1] - estate[0] + 1];
  }, 0);
}

function scoreOf(streets: Street[]) {
  const parks = streets.reduce((sum, st, s) => sum + parkScore(st, s), 0);
  const pools =
    POOL_POINTS[Math.min(poolCount(streets), POOL_POINTS.length - 1)];
  const estatePoints = streets.reduce((sum, st) => sum + estateScore(st), 0);
  return {
    parks,
    pools,
    estates: estatePoints,
    total: parks + pools + estatePoints,
  };
}

function isFull(streets: Street[]) {
  return streets.every((street) => street.houses.every(Boolean));
}

function canBuildAny(state: PicketFenceGameState) {
  return state.hand.some(
    (card) => legalLots(state.streets, houseNumber(card)).length > 0,
  );
}

function isOver(state: PicketFenceGameState) {
  if (state.pending) return false;
  return isFull(state.streets) || !canBuildAny(state);
}

function getTier(score: number) {
  return TIERS.find((tier) => score >= tier.min)!;
}

function drawHand(state: PicketFenceGameState) {
  while (state.hand.length < HAND_SIZE && state.deck.length > 0) {
    state.hand.push(flipToFace(state.deck.pop()!));
  }
}

function finishTurn(state: PicketFenceGameState) {
  state.pending = null;
  drawHand(state);
}

function buildHouse(state: PicketFenceGameState, handIndex: number, at: Lot) {
  const card = state.hand[handIndex];
  const street = state.streets[at.street];
  if (!card || state.pending || !canBuild(street, at.lot, houseNumber(card))) {
    return false;
  }
  state.hand.splice(handIndex, 1);
  street.houses[at.lot] = card;
  state.pending = at;
  // The deck's last card is built without an effect.
  if (state.hand.length === 0) finishTurn(state);
  return true;
}

type EffectResult = "park" | "pool" | "fence" | "house" | "wasted";

/**
 * Uses a hand card's suit on this turn's house: hearts make a park, diamonds
 * a pool (on a pool lot), spades a fence at `target`, and clubs are built as
 * a second house at `target`. Without a usable target the card is discarded.
 */
function applyEffect(
  state: PicketFenceGameState,
  handIndex: number,
  target?: Lot | FenceSpot,
): EffectResult | null {
  const pending = state.pending;
  const card = state.hand[handIndex];
  if (!pending || !card) return null;

  const street = state.streets[pending.street];
  let result: EffectResult = "wasted";

  if (card.suit === "hearts") {
    result = "park";
  } else if (card.suit === "diamonds") {
    if (POOL_LOTS[pending.street].includes(pending.lot)) result = "pool";
  } else if (card.suit === "spades") {
    if (target && "gap" in target) {
      const fences = state.streets[target.street].fences;
      if (fences[target.gap]) return null;
      fences[target.gap] = true;
      result = "fence";
    }
  } else if (target && "lot" in target) {
    const other = state.streets[target.street];
    if (!canBuild(other, target.lot, houseNumber(card))) return null;
    result = "house";
  }

  state.hand.splice(handIndex, 1);
  if (result === "park" || result === "pool") {
    street.tucked[pending.lot] = card;
  } else if (result === "house" && target && "lot" in target) {
    state.streets[target.street].houses[target.lot] = card;
  } else {
    state.discard.push(card);
  }
  finishTurn(state);
  return result;
}

/** Where a spade or club effect card could go this turn. */
function effectTargets(
  state: PicketFenceGameState,
  card: PlayingCard,
): (Lot | FenceSpot)[] {
  if (card.suit === "spades") return openFences(state.streets);
  if (card.suit === "clubs") {
    return legalLots(state.streets, houseNumber(card));
  }
  return [];
}

function createInitialState(): PicketFenceGameState {
  const state: PicketFenceGameState = {
    deck: shuffle(createDeck()),
    hand: [],
    streets: emptyStreets(),
    discard: [],
    pending: null,
  };
  drawHand(state);
  return state;
}

function gatherState(state: PicketFenceGameState): PicketFenceGameState {
  return {
    deck: shuffle(flipAllToBack(collectCards(state))),
    hand: [],
    streets: emptyStreets(),
    discard: [],
    pending: null,
  };
}

const gameStateInitial = createInitialState();

export const picketFenceRules = {
  STREET_LENGTHS,
  POOL_LOTS,
  WIN_SCORE,
  emptyStreets,
  canBuild,
  legalLots,
  isDeadLot,
  estates,
  estateStatus,
  parkScore,
  scoreOf,
  isFull,
  isOver,
  getTier,
  buildHouse,
  applyEffect,
  effectTargets,
  createInitialState,
};

// ========== Layout ========== //
const GAP = 0.15;
const COLS = Math.max(...STREET_LENGTHS);
const HUD_ROW = 0;
const STREETS_ROW = 0.6;
const STREET_SPACING = 2.3;
const LABEL_HEIGHT = 0.36;
// The effect card tucked under a house shows above it.
const TUCK_PEEK = 0.4;
const STATUS_ROW = STREETS_ROW + STREET_SPACING * STREET_LENGTHS.length;
const HAND_ROW = STATUS_ROW + 0.5;
const HAND_COL = (COLS - HAND_SIZE) / 2;
const POST_WIDTH = 0.45;
const POST_HEIGHT = 0.6;
const FENCE_WIDTH = 0.2;
const FENCE_OVERHANG = 0.05;

function streetCol(s: number) {
  return (COLS - STREET_LENGTHS[s]) / 2;
}

function estateLabelRow(s: number) {
  return STREETS_ROW + s * STREET_SPACING;
}

function lotRow(s: number) {
  return estateLabelRow(s) + LABEL_HEIGHT + 0.02 + TUCK_PEEK;
}

function parkLabelRow(s: number) {
  return lotRow(s) + 1.05;
}

// Zone widths include the gaps they span, so a zone of width w centred on
// the gap after lot g starts at col g + 1 - w / 2.
function gapCol(s: number, gap: number, width: number) {
  return streetCol(s) + gap + 1 - width / 2;
}

type Phase =
  | { kind: "house" }
  | { kind: "effect"; pending: Lot }
  | { kind: "fence"; pending: Lot; card: number }
  | { kind: "secondHouse"; pending: Lot; card: number };

// ========== Component ========== //
export default function PicketFence() {
  const { colorPale, colorDark } = useGameColors();
  const showToast = useToast();
  const [selectedHouse, setSelectedHouse] = useState<number | null>(null);
  const [selectedEffect, setSelectedEffect] = useState<number | null>(null);

  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<PicketFenceGameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        // Gather every card into the deck, then deal a fresh hand.
        setGame((draft) => gatherState(draft));
        await delay();
        setGame((draft) => redealWith(createInitialState(), draft.deck));
      },
      resetNonGameStates: () => {
        setSelectedHouse(null);
        setSelectedEffect(null);
      },
    });

  const ended = isOver(game);
  const score = useMemo(() => scoreOf(game.streets), [game.streets]);
  const won = ended && score.total >= WIN_SCORE;

  const effectCard =
    selectedEffect !== null ? game.hand[selectedEffect] : undefined;
  const phase: Phase = !game.pending
    ? { kind: "house" }
    : effectCard?.suit === "spades"
      ? { kind: "fence", pending: game.pending, card: selectedEffect! }
      : effectCard?.suit === "clubs"
        ? { kind: "secondHouse", pending: game.pending, card: selectedEffect! }
        : { kind: "effect", pending: game.pending };

  const houseCard =
    phase.kind === "house" && selectedHouse !== null
      ? game.hand[selectedHouse]
      : undefined;

  // Lots that the selected card can be built on.
  const targetLots = useMemo(() => {
    const card =
      houseCard ?? (phase.kind === "secondHouse" ? effectCard : null);
    return card ? legalLots(game.streets, houseNumber(card)) : [];
  }, [houseCard, effectCard, phase.kind, game.streets]);

  const isTargetLot = (s: number, lot: number) =>
    targetLots.some((target) => target.street === s && target.lot === lot);

  function commit(update: (draft: PicketFenceGameState) => void) {
    saveUndoState(structuredClone(game));
    setSelectedHouse(null);
    setSelectedEffect(null);
    setGame(produce(game, update));
  }

  function playEffectCard(handIndex: number, target?: Lot | FenceSpot) {
    let result: EffectResult | null = null;
    commit((draft) => {
      result = applyEffect(draft, handIndex, target);
    });
    if (result === "wasted") {
      showToast(i18n.t("games:picketFence.effectWasted"));
    }
  }

  function onHandPress(handIndex: number) {
    if (ended) return;
    const card = game.hand[handIndex];
    if (!card) return;

    if (phase.kind === "house") {
      if (selectedHouse === handIndex) {
        setSelectedHouse(null);
        return;
      }
      if (legalLots(game.streets, houseNumber(card)).length === 0) {
        showToast(i18n.t("games:picketFence.noLotFits"));
      }
      setSelectedHouse(handIndex);
      return;
    }

    // Choosing the effect: a spade or club first needs a target, and tapping
    // it again puts it back.
    if (selectedEffect === handIndex) {
      setSelectedEffect(null);
      return;
    }
    if (card.suit === "spades" || card.suit === "clubs") {
      if (effectTargets(game, card).length > 0) {
        setSelectedEffect(handIndex);
        return;
      }
    }
    playEffectCard(handIndex);
  }

  function onLotPress(s: number, lot: number) {
    if (ended || !isTargetLot(s, lot)) return;
    if (phase.kind === "house" && selectedHouse !== null) {
      const handIndex = selectedHouse;
      commit((draft) => {
        buildHouse(draft, handIndex, { street: s, lot });
      });
    } else if (phase.kind === "secondHouse") {
      playEffectCard(phase.card, { street: s, lot });
    }
  }

  function onFencePress(s: number, gap: number) {
    if (phase.kind !== "fence" || game.streets[s].fences[gap]) return;
    playEffectCard(phase.card, { street: s, gap });
  }

  // ========== Card Mapping ========== //
  const zones: MapZone[] = useMemo(() => {
    const streetZones: MapZone[] = game.streets.flatMap((street, s) => {
      const lotZones: MapZone[] = street.houses.flatMap((house, lot) => {
        const tucked = street.tucked[lot];
        const isPool = POOL_LOTS[s].includes(lot);
        const dead = isDeadLot(street, lot);
        return [
          {
            id: `tuck-${s}-${lot}`,
            name: "tuck",
            pileIndex: s,
            refIndex: lot,
            cards: tucked ? [tucked] : [],
            col: streetCol(s) + lot,
            row: lotRow(s) - TUCK_PEEK,
            baseZIndex: 5,
          },
          {
            id: `lot-${s}-${lot}`,
            name: "lot",
            pileIndex: s,
            refIndex: lot,
            cards: house ? [house] : [],
            col: streetCol(s) + lot,
            row: lotRow(s),
            baseZIndex: 10,
            placeholder: {
              showCount: false,
              iconName: dead ? "cancel" : isPool ? "diamonds" : undefined,
              iconSize: 0.5,
            },
          },
        ];
      });

      const fenceZones: MapZone[] = street.fences.flatMap((fence, gap) => {
        if (fence) {
          return [
            {
              id: `fence-${s}-${gap}`,
              col: gapCol(s, gap, FENCE_WIDTH),
              row: lotRow(s) - FENCE_OVERHANG,
              width: FENCE_WIDTH,
              height: 1 + FENCE_OVERHANG * 2,
            },
          ];
        }
        if (phase.kind !== "fence") return [];
        return [
          {
            id: `post-${s}-${gap}`,
            name: "post",
            pileIndex: s,
            refIndex: gap,
            col: gapCol(s, gap, POST_WIDTH),
            row: lotRow(s) + (1 - POST_HEIGHT) / 2,
            width: POST_WIDTH,
            height: POST_HEIGHT,
            baseZIndex: 40,
            placeholder: { showCount: false, hideShadow: true },
          },
        ];
      });

      const estateZones: MapZone[] = estates(street).map(([first, last]) => ({
        id: `estate-${s}-${first}`,
        col: streetCol(s) + first,
        row: estateLabelRow(s),
        width: last - first + 1,
        height: LABEL_HEIGHT,
      }));

      return [
        ...lotZones,
        ...fenceZones,
        ...estateZones,
        {
          id: `parks-${s}`,
          col: streetCol(s),
          row: parkLabelRow(s),
          width: STREET_LENGTHS[s],
          height: LABEL_HEIGHT,
        },
      ];
    });

    const handZones: MapZone[] = Array.from({ length: HAND_SIZE }, (_, i) => ({
      id: `hand-${i}`,
      name: "hand",
      pileIndex: i,
      cards: game.hand[i] ? [game.hand[i]] : [],
      col: HAND_COL + i,
      row: HAND_ROW,
      baseZIndex: 10,
    }));

    return [
      {
        id: "hudBars",
        col: 0,
        row: HUD_ROW,
        width: "full",
        height: 0.45,
      },
      ...streetZones,
      {
        id: "status",
        col: 0,
        row: STATUS_ROW,
        width: COLS,
        height: 0.4,
      },
      {
        id: "deck",
        name: "deck",
        cards: game.deck,
        col: 0,
        row: HAND_ROW,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: {},
      },
      ...handZones,
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: COLS - 1,
        row: HAND_ROW,
        baseZIndex: 10,
        fan: { maxVisible: 3 },
        placeholder: { showCount: false },
      },
    ];
  }, [game, phase.kind]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const { zoneName, pileIndex, refIndex } = mappedCard;

    if (zoneName === "hand" && pileIndex !== undefined) {
      const isSelected =
        phase.kind === "house"
          ? selectedHouse === pileIndex
          : selectedEffect === pileIndex;
      const choosingEffect = phase.kind !== "house" && !isSelected;
      return {
        onPress: () => onHandPress(pileIndex),
        isDisabled: ended,
        isSelected,
        selectColor: isSelected ? "blue" : choosingEffect ? "orange" : "none",
        forceSelectColor: isSelected,
        forceOverlayColor: choosingEffect,
      };
    }

    if (zoneName === "lot" && pileIndex !== undefined) {
      const isPending =
        !!game.pending &&
        game.pending.street === pileIndex &&
        game.pending.lot === refIndex;
      return {
        isDisabled: true,
        selectColor: isPending ? "purple" : "none",
        forceSelectColor: isPending,
      };
    }

    return { isDisabled: true };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    const { name, pileIndex: s, refIndex } = zone;
    if (s === undefined || refIndex === undefined) return;

    if (name === "lot") {
      const isTarget = !ended && isTargetLot(s, refIndex);
      return {
        onPress: () => onLotPress(s, refIndex),
        isDisabled: !isTarget,
        selectColor: isTarget ? "green" : "none",
      };
    }

    if (name === "post") {
      return {
        onPress: () => onFencePress(s, refIndex),
        isDisabled: phase.kind !== "fence",
        selectColor: "green",
        forceOverlayColor: true,
      };
    }

    return;
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    gap: GAP,
    cardSize: "small",
    cardMapper,
    zoneMapper,
  });

  const tier = getTier(score.total);
  const pools = poolCount(game.streets);

  const statusKey = ended
    ? null
    : phase.kind === "house"
      ? houseCard
        ? "games:picketFence.statusChooseLot"
        : "games:picketFence.statusChooseHouse"
      : phase.kind === "effect"
        ? "games:picketFence.statusChooseEffect"
        : phase.kind === "fence"
          ? "games:picketFence.statusChooseFence"
          : "games:picketFence.statusChooseSecondHouse";

  return (
    <GameWrapper
      outcome={!ended ? "playing" : won ? "won" : "lost"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={score.total}
      hideScore
      winLoseMessage={
        won
          ? i18n.t("games:picketFence.wonWithTier", {
              score: score.total,
              tier: i18n.t(tier.key),
            })
          : i18n.t("games:picketFence.lostShortOfTarget", {
              score: score.total,
              tier: i18n.t(tier.key),
              target: WIN_SCORE,
            })
      }
      canUndo={canUndo}
      undo={() => {
        setSelectedHouse(null);
        setSelectedEffect(null);
        undo();
      }}
    >
      {cardMap}

      {game.streets.flatMap((street, s) =>
        street.fences.map((fence, gap) =>
          fence ? (
            <View
              key={`fence-${s}-${gap}`}
              style={[
                pointerEventsStyles.none,
                getZoneStylesById(`fence-${s}-${gap}`),
                {
                  zIndex: 30,
                  backgroundColor: colorPale,
                  borderRadius: cardWidth * 0.03,
                  borderTopLeftRadius: cardWidth * 0.05,
                  borderTopRightRadius: cardWidth * 0.05,
                },
              ]}
            />
          ) : null,
        ),
      )}

      {/* Parks and pools are both red: mark the suit on the part that shows. */}
      {game.streets.flatMap((street, s) =>
        street.tucked.map((card, lot) =>
          card ? (
            <View
              key={`tuckSuit-${s}-${lot}`}
              style={[
                pointerEventsStyles.none,
                getZoneStylesById(`tuck-${s}-${lot}`),
                {
                  zIndex: 8,
                  alignItems: "flex-end",
                  padding: cardWidth * 0.08,
                },
              ]}
            >
              <Icon
                name={card.suit}
                size={cardWidth * 0.26}
                color={Colors.suitsRed}
              />
            </View>
          ) : null,
        ),
      )}

      {game.streets.flatMap((street, s) =>
        estates(street).map((estate) => {
          const status = estateStatus(street, estate);
          const points = ESTATE_POINTS[estate[1] - estate[0] + 1] ?? 0;
          return (
            <View
              key={`estate-${s}-${estate[0]}`}
              style={[
                pointerEventsStyles.none,
                getZoneStylesById(`estate-${s}-${estate[0]}`),
                {
                  justifyContent: "flex-end",
                  alignItems: "center",
                  borderBottomWidth: 1,
                  borderColor: rgba(
                    colorPale,
                    status === "complete" ? 0.7 : 0.25,
                  ),
                  marginHorizontal: cardWidth * 0.05,
                },
              ]}
            >
              <Text
                size="xs"
                weight={status === "complete" ? 700 : 500}
                color={rgba(
                  colorPale,
                  status === "open" ? 0.6 : status === "complete" ? 1 : 0.35,
                )}
              >
                {status === "complete"
                  ? `+${points}`
                  : status === "blocked"
                    ? i18n.t("games:picketFence.estateBlocked")
                    : `${points}`}
              </Text>
            </View>
          );
        }),
      )}

      {game.streets.map((street, s) => (
        <View
          key={`parks-${s}`}
          style={[
            pointerEventsStyles.none,
            getZoneStylesById(`parks-${s}`),
            flexStyles.colCentered,
          ]}
        >
          <Text size="xs" weight={500} color={rgba(colorPale, 0.8)}>
            {i18n.t("games:picketFence.parks", {
              count: Math.min(parkCount(street), PARK_POINTS[s].length - 1),
              max: PARK_POINTS[s].length - 1,
              points: parkScore(street, s),
            })}
          </Text>
        </View>
      ))}

      {statusKey && (
        <View
          style={[
            pointerEventsStyles.none,
            getZoneStylesById("status"),
            flexStyles.colCentered,
          ]}
        >
          <Text size="xs" weight={500} color={colorPale} numberOfLines={1}>
            {i18n.t(statusKey, {
              hearts: SUIT_SYMBOLS.hearts,
              diamonds: SUIT_SYMBOLS.diamonds,
              spades: SUIT_SYMBOLS.spades,
              clubs: SUIT_SYMBOLS.clubs,
            })}
          </Text>
        </View>
      )}

      <View
        style={[
          pointerEventsStyles.none,
          getZoneStylesById("hudBars"),
          flexStyles.rowCentered,
          { gap: cardHeight * 0.15 },
        ]}
      >
        <ProgressBar
          progressValue={pools}
          totalValue={POOL_POINTS.length - 1}
          color="blue"
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:picketFence.pools")}
          tallyText={`${pools}/${POOL_POINTS.length - 1} · ${score.pools}`}
          scaledHeight={cardHeight * 0.42}
          style={{ flex: 1 }}
        />
        <ProgressBar
          progressValue={score.total}
          totalValue={WIN_SCORE}
          color={score.total >= WIN_SCORE ? "green" : "orange"}
          backgroundColor={rgba(colorDark, 0.7)}
          labelText={i18n.t("games:picketFence.score")}
          tallyText={`${score.total} / ${WIN_SCORE}`}
          scaledHeight={cardHeight * 0.42}
          style={{ flex: 2 }}
        />
      </View>
    </GameWrapper>
  );
}
