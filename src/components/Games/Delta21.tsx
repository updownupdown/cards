import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToFace,
  RANK_VALUE,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

import { i18n } from "@/i18n";
import { cardTarget, makeHint, zoneTarget } from "@/hints/hint";
import { useHint } from "@/hints/hint-store";
import { planMove } from "@/hints/lookahead";
const cardSize = "regular";

const layout = {
  fishermanRowOffset: 0.1,
  estuaryHeight: 5,
  firstEstuaryCol: 1.3,
  colGap: 0.46,
  totalsHeight: 0.5,
  handRowTopOffset: 0.4,
  estuaryWidthInset: 0.1,
  estuaryHeightInset: 0.08,
};

const params = {
  columnCount: 4,
  handSize: 4,
  targetFish: 21,
  collapseFish: 25,
};

type SchoolEntry = { school: PlayingCard; fisherman: PlayingCard | null };

export type Delta21SchoolEntry = SchoolEntry;

type GameState = {
  station: PlayingCard[];
  discard: PlayingCard[];
  segments: SchoolEntry[][];
  hand: PlayingCard[];
  studyCount: number;
  breakthroughs: string[];
  ended: boolean;
};

export type Delta21GameState = GameState;

type Selection = { hand: number } | { transfer: number; target?: number };

const BREAKTHROUGH_LABELS: Record<string, string> = {
  specialization: "🐟 ♠♠♠", // Species Specialization (all same suit)
  diversity: "🐟 ♠♥♦♣", // Species Diversity (uses all suits)
  dense: "🐟🐟 5+", // Dense Shoals (5+ schools)
  clusters: "🐟# 🐟#", // Population Clusters (2+ schools same rank)
  harvesting: "🐟♠ 🎣♠", // Selective Harvesting (fisher and fish same suit)
  pressure: "🎣 2+", // Fishing Pressure (2+ fishers)
};

const gameStateInitial: GameState = {
  station: shuffle(createDeck()),
  segments: Array.from({ length: params.columnCount }, () => []),
  hand: [],
  discard: [],
  studyCount: 0,
  breakthroughs: [],
  ended: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    // Gather all cards to station
    const allCards = flipAllToBack([
      ...draft.station,
      ...draft.discard,
      ...draft.hand,
      ...draft.segments.flatMap((col) =>
        col.flatMap(
          (entry) =>
            [entry.school, entry.fisherman].filter(
              (c) => c !== null,
            ) as PlayingCard[],
        ),
      ),
    ]);

    draft.station = shuffle(allCards);
    draft.segments = Array.from({ length: params.columnCount }, () => []);
    draft.hand = [];
    draft.discard = [];
    draft.studyCount = 0;
    draft.breakthroughs = [];
    draft.ended = false;
  });

  await delay(800);

  setGame((draft) => {
    // Reveal four Schools of Fish for the river; shuffle drawn Fishermen back.
    const setAside: PlayingCard[] = [];
    for (let i = 0; i < params.columnCount; i += 1) {
      const school = revealSchool(draft, setAside);
      if (school) draft.segments[i] = [{ school, fisherman: null }];
    }

    if (setAside.length > 0) {
      draft.station = shuffle([...draft.station, ...setAside]);
    }
  });

  await delay();

  setGame((draft) => {
    // Opening draw phase.
    drawPhase(draft);
  });
}

// ========== Pure helpers ========== //
function isFisherman(card: PlayingCard) {
  return card.rank === "J" || card.rank === "Q" || card.rank === "K";
}
function isSchool(card: PlayingCard) {
  return !isFisherman(card);
}
function schoolFish(card: PlayingCard) {
  return RANK_VALUE[card.rank];
}
function fishermanCatch(card: PlayingCard) {
  return card.rank === "J" ? 1 : card.rank === "Q" ? 2 : 3;
}
function entryFish(entry: SchoolEntry) {
  const reduction = entry.fisherman ? fishermanCatch(entry.fisherman) : 0;
  return Math.max(0, schoolFish(entry.school) - reduction);
}
function columnTotal(column: SchoolEntry[]) {
  return column.reduce((sum, entry) => sum + entryFish(entry), 0);
}
function bottomEntry(column: SchoolEntry[]) {
  return column[column.length - 1];
}

function addBreakthrough(list: string[], key: string) {
  if (!list.includes(key)) list.push(key);
}

function evaluateStudy(entries: SchoolEntry[], list: string[]) {
  const schools = entries.map((e) => e.school);
  const suits = new Set(schools.map((s) => s.suit));
  const fishermen = entries.filter((e) => e.fisherman);

  if (suits.size === 1) addBreakthrough(list, "specialization");
  if (suits.size === 4) addBreakthrough(list, "diversity");
  if (schools.length >= 5) addBreakthrough(list, "dense");

  const rankCounts = new Map<string, number>();
  for (const s of schools) {
    rankCounts.set(s.rank, (rankCounts.get(s.rank) ?? 0) + 1);
  }
  if ([...rankCounts.values()].some((c) => c >= 2)) {
    addBreakthrough(list, "clusters");
  }
  if (entries.some((e) => e.fisherman?.suit === e.school.suit)) {
    addBreakthrough(list, "harvesting");
  }
  if (fishermen.length >= 2) addBreakthrough(list, "pressure");
}

// ========== Phase logic (mutating immer draft) ========== //
function revealSchool(draft: GameState, setAside: PlayingCard[]) {
  while (draft.station.length > 0) {
    const card = draft.station.pop()!;
    if (isSchool(card)) return flipToFace(card);
    setAside.push(card);
  }
  return undefined;
}

function studyPhase(draft: GameState) {
  for (let i = 0; i < draft.segments.length; i += 1) {
    if (columnTotal(draft.segments[i]) === params.targetFish) {
      evaluateStudy(draft.segments[i], draft.breakthroughs);
      draft.studyCount += 1;
      draft.segments[i] = [];
    }
  }

  const setAside: PlayingCard[] = [];
  for (let i = 0; i < draft.segments.length; i += 1) {
    if (draft.segments[i].length === 0) {
      const school = revealSchool(draft, setAside);
      if (school) draft.segments[i] = [{ school, fisherman: null }];
    }
  }
  if (setAside.length > 0) {
    draft.station = shuffle([...draft.station, ...setAside]);
  }
}

function drawPhase(draft: GameState) {
  while (draft.hand.length < params.handSize && draft.station.length > 0) {
    const card = draft.station.pop();
    if (card) draft.hand.push(flipToFace(card));
  }
}

function resolveTurn(draft: GameState) {
  if (draft.segments.some((c) => columnTotal(c) >= params.collapseFish)) {
    draft.ended = true;
    return;
  }
  if (draft.hand.length === 0) {
    studyPhase(draft);
    drawPhase(draft);
  }
  if (draft.segments.some((c) => columnTotal(c) >= params.collapseFish)) {
    draft.ended = true;
    return;
  }
  if (draft.station.length === 0 && draft.hand.length === 0) {
    draft.ended = true;
  }
}

function scoreTier(score: number) {
  if (score >= 18) return i18n.t("games:delta21.ratingReshapes");
  if (score >= 14) return i18n.t("games:delta21.ratingAdvances");
  if (score >= 9) return i18n.t("games:delta21.ratingAids");
  return i18n.t("games:delta21.ratingLittle");
}

type RiverMove =
  | { kind: "release"; card: string; col: number }
  | { kind: "catch"; card: string; col: number; entry: number }
  | { kind: "transfer"; discard: string; from: number; to: number };

type River = {
  segments: SchoolEntry[][];
  hand: PlayingCard[];
  breakthroughs: string[];
  flooded: boolean;
};

function riverMoves(river: River) {
  const moves: RiverMove[] = [];
  if (river.flooded) return moves;
  for (const card of river.hand) {
    river.segments.forEach((column, col) => {
      if (isSchool(card)) {
        moves.push({ kind: "release", card: card.id, col });
        return;
      }
      column.forEach((entry, index) => {
        if (!entry.fisherman && schoolFish(entry.school) > 0) {
          moves.push({ kind: "catch", card: card.id, col, entry: index });
        }
      });
    });
  }
  // Moving a school costs a card: which one hardly matters, so the least
  // useful (the lowest school, else the smallest fisher).
  const spare = [...river.hand].sort(
    (a, b) =>
      Number(isFisherman(a)) - Number(isFisherman(b)) ||
      RANK_VALUE[a.rank] - RANK_VALUE[b.rank],
  )[0];
  if (spare) {
    river.segments.forEach((column, from) => {
      if (column.length < 2 || bottomEntry(column).fisherman) return;
      river.segments.forEach((_, to) => {
        if (to !== from) {
          moves.push({ kind: "transfer", discard: spare.id, from, to });
        }
      });
    });
  }
  return moves;
}

function applyRiverMove(river: River, move: RiverMove): River {
  const segments = river.segments.map((column) => [...column]);
  const used = move.kind === "transfer" ? move.discard : move.card;
  const card = river.hand.find((entry) => entry.id === used)!;
  const hand = river.hand.filter((entry) => entry.id !== used);
  if (move.kind === "release") {
    segments[move.col].push({ school: card, fisherman: null });
  } else if (move.kind === "catch") {
    segments[move.col][move.entry] = {
      ...segments[move.col][move.entry],
      fisherman: card,
    };
  } else {
    segments[move.to].push(segments[move.from].pop()!);
  }
  return {
    segments,
    hand,
    breakthroughs: river.breakthroughs,
    flooded: segments.some(
      (column) => columnTotal(column) >= params.collapseFish,
    ),
  };
}

function riverKey(river: River) {
  return (
    river.hand
      .map((card) => card.id)
      .sort()
      .join(",") +
    "|" +
    river.segments
      .map((column) =>
        column
          .map((entry) => `${entry.school.id}+${entry.fisherman?.id ?? ""}`)
          .join(","),
      )
      .join("|")
  );
}

/**
 * How good the river is once the hand is spent: studies of 21 (and the
 * breakthroughs they bring) first, then columns a single school completes,
 * and never a flood.
 */
function riverWorth(river: River) {
  if (river.flooded) return -1e6;
  if (river.hand.length > 0) return -1e5 - river.hand.length;
  const breakthroughs = [...river.breakthroughs];
  let worth = 0;
  for (const column of river.segments) {
    const total = columnTotal(column);
    if (total === params.targetFish) {
      const before = breakthroughs.length;
      evaluateStudy(column, breakthroughs);
      worth += 100 + 40 * (breakthroughs.length - before);
    } else if (total > params.targetFish) {
      worth += 5 - 10 * (total - params.targetFish);
    } else if (total >= params.targetFish - 10) {
      worth += 15 + total - (params.targetFish - 10);
    } else {
      worth += total;
    }
  }
  return worth;
}

/**
 * The hint: the next card of the best way to spend the whole hand (every
 * card it touches is on view), shown as the taps it takes from what's
 * selected.
 */
function findDelta21Hint(state: GameState, selection: Selection | null) {
  if (state.ended || state.hand.length === 0) return null;
  const river: River = {
    segments: state.segments,
    hand: state.hand,
    breakthroughs: state.breakthroughs,
    flooded: false,
  };
  const move =
    planMove(river, {
      moves: riverMoves,
      apply: applyRiverMove,
      score: riverWorth,
      key: riverKey,
      positionKey: riverKey,
      budget: 5000,
      maxDepth: state.hand.length,
    }) ?? riverMoves(river)[0];
  if (!move) return null;

  const transferring = selection && "transfer" in selection;
  if (move.kind === "transfer") {
    const lifted =
      transferring && selection.transfer === move.from ? selection : null;
    if (transferring && !lifted) {
      const column = state.segments[selection.transfer];
      return makeHint("tapCard", cardTarget(bottomEntry(column).school));
    }
    return makeHint(
      "moveCard",
      lifted ? [] : cardTarget(bottomEntry(state.segments[move.from]).school),
      lifted?.target === move.to ? [] : zoneTarget(`estuary-${move.to}`),
      cardTarget(move.discard),
    );
  }

  if (transferring) {
    // Put the lifted school back first.
    const column = state.segments[selection.transfer];
    return makeHint("tapCard", cardTarget(bottomEntry(column).school));
  }
  const chosen =
    selection &&
    "hand" in selection &&
    state.hand[selection.hand]?.id === move.card;
  return makeHint(
    "moveCard",
    chosen ? [] : cardTarget(move.card),
    move.kind === "release"
      ? zoneTarget(`estuary-${move.col}`)
      : cardTarget(state.segments[move.col][move.entry].school),
  );
}

export const delta21Rules = {
  isFisherman,
  isSchool,
  schoolFish,
  fishermanCatch,
  entryFish,
  columnTotal,
  evaluateStudy,
  studyPhase,
  drawPhase,
  resolveTurn,
  scoreTier,
  targetFish: params.targetFish,
  collapseFish: params.collapseFish,
  findHint: findDelta21Hint,
};

// ========== Component ========== //
export default function Delta21() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();
  const [selection, setSelection] = useState<Selection | null>(null);

  const {
    isLoaded,
    isSettingUp,
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
      setSelection(null);
    },
  });

  useHint(() => findDelta21Hint(game, selection), {
    game,
    enabled: !isSettingUp && !game.ended,
  });

  const score = game.studyCount + 2 * game.breakthroughs.length;

  const selectedHandCard =
    selection && "hand" in selection ? game.hand[selection.hand] : undefined;

  // ── Actions (each ends by resolving the turn) ──────────────────────────────
  function mutate(fn: (draft: GameState) => void) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      fn(draft);
      resolveTurn(draft);
    });
    setSelection(null);
  }

  function releaseSchool(handIndex: number, colIndex: number) {
    if (game.ended) return;
    const card = game.hand[handIndex];
    if (!card || !isSchool(card)) return;
    mutate((draft) => {
      const [played] = draft.hand.splice(handIndex, 1);
      draft.segments[colIndex].push({ school: played, fisherman: null });
    });
  }

  function catchFish(handIndex: number, colIndex: number, entryIndex: number) {
    if (game.ended) return;
    const card = game.hand[handIndex];
    const entry = game.segments[colIndex]?.[entryIndex];
    if (!card || !isFisherman(card) || !entry || entry.fisherman) return;
    mutate((draft) => {
      const [played] = draft.hand.splice(handIndex, 1);
      const target = draft.segments[colIndex][entryIndex];
      target.fisherman = played;
    });
  }

  function transfer(
    sourceCol: number,
    targetCol: number,
    discardIndex: number,
  ) {
    if (game.ended) return;
    const source = game.segments[sourceCol];
    if (!source || source.length < 2) return;
    const moving = bottomEntry(source);
    if (!moving || moving.fisherman) return;
    if (sourceCol === targetCol) return;
    mutate((draft) => {
      const [discarded] = draft.hand.splice(discardIndex, 1);
      if (discarded) draft.discard.push(discarded);
      const entry = draft.segments[sourceCol].pop();
      if (entry) draft.segments[targetCol].push(entry);
    });
  }

  // ── Tap routing ────────────────────────────────────────────────────────────
  function isMovableBottom(colIndex: number, entryIndex: number) {
    const column = game.segments[colIndex];
    return (
      column.length >= 2 &&
      entryIndex === column.length - 1 &&
      !column[entryIndex].fisherman
    );
  }

  function onHandPress(index: number) {
    if (game.ended) return;

    // Complete a transfer by choosing this card as the discard.
    if (
      selection &&
      "transfer" in selection &&
      selection.target !== undefined
    ) {
      transfer(selection.transfer, selection.target, index);
      return;
    }

    setSelection((current) =>
      current && "hand" in current && current.hand === index
        ? null
        : { hand: index },
    );
  }

  function onColumnPress(colIndex: number) {
    if (game.ended) return;

    if (selection && "hand" in selection) {
      const card = game.hand[selection.hand];
      if (card && isSchool(card)) releaseSchool(selection.hand, colIndex);
      return;
    }

    if (
      selection &&
      "transfer" in selection &&
      selection.target === undefined
    ) {
      if (colIndex !== selection.transfer) {
        setSelection({ transfer: selection.transfer, target: colIndex });
      }
    }
  }

  function onSchoolPress(colIndex: number, entryIndex: number) {
    if (game.ended) return;

    if (selection && "hand" in selection) {
      const card = game.hand[selection.hand];
      if (!card) return;
      if (isFisherman(card)) {
        catchFish(selection.hand, colIndex, entryIndex);
      } else {
        releaseSchool(selection.hand, colIndex);
      }
      return;
    }

    if (selection && "transfer" in selection) {
      // Tapping the lifted source again cancels; tapping another column targets.
      if (selection.target === undefined && colIndex !== selection.transfer) {
        setSelection({ transfer: selection.transfer, target: colIndex });
      } else {
        setSelection(null);
      }
      return;
    }

    // No selection: lift a movable bottom school for transfer.
    if (isMovableBottom(colIndex, entryIndex)) {
      setSelection({ transfer: colIndex });
    }
  }

  // ── Zones ────────────────────────────────
  const waterBackground = rgba("#1a5b6e", 0.45);

  const zones: MapZone[] = useMemo(() => {
    const colZones: MapZone[] = [];

    for (let i = 0; i < params.columnCount; i += 1) {
      const col = (i + layout.firstEstuaryCol) * (layout.colGap + 1);

      // Totals
      colZones.push({
        id: `total-${i}`,
        col,
        baseZIndex: 2,
        row: layout.estuaryHeight - layout.totalsHeight + 0.05,
        height: layout.totalsHeight,
      });

      // Estuary backgrounds
      colZones.push({
        id: `estuary-${i}`,
        name: "estuary",
        pileIndex: i,
        col: col - layout.estuaryWidthInset,
        row: -layout.estuaryHeightInset,
        width: 1 + 2 * layout.estuaryWidthInset,
        height: layout.estuaryHeight + 2 * layout.estuaryHeightInset,
        baseZIndex: 1,
        placeholder: { backgroundColor: waterBackground },
      });

      const column = game.segments[i];

      const cardOverflow =
        column.length - layout.estuaryHeight + layout.totalsHeight;
      const rowOffset =
        cardOverflow > 0 ? 1 + (cardOverflow / (column.length - 1)) * -1 : 1.08;

      column.forEach((entry, j) => {
        // Ensure that all cards in a column fit within the river height
        const row = j * rowOffset;

        colZones.push({
          id: `sch-${i}-${j}`,
          name: "school",
          pileIndex: i,
          refIndex: j,
          col,
          row,
          baseZIndex: 5 + j,
          cards: [entry.school],
        });

        if (entry.fisherman) {
          colZones.push({
            id: `fish-${i}-${j}`,
            name: "fisher",
            pileIndex: i,
            refIndex: j,
            col,
            row: row + layout.fishermanRowOffset,
            rotation: 90,
            baseZIndex: 6 + j,
            cards: [entry.fisherman],
          });
        }
      });
    }

    // Source
    const sourceZone: MapZone = {
      id: `source`,
      name: "source",
      col: 0,
      row: 0,
      baseZIndex: 90,
      cards: game.station,
      placeholder: { text: i18n.t("games:delta21.fldSt"), infoPos: "below" },
      fan: { maxVisible: 3 },
    };

    const statsZone: MapZone = {
      id: "stats",
      col: 0,
      row: 1.5,
      width: 1.4,
      height: layout.estuaryHeight - 1.8,
    };

    // Discard
    const discardZone: MapZone = {
      id: `discard`,
      name: "discard",
      col: 0,
      row: layout.estuaryHeight + layout.handRowTopOffset,
      baseZIndex: 90,
      cards: game.discard,
      placeholder: { text: i18n.t("cards:discard"), infoPos: "above" },
      fan: { maxVisible: 3 },
    };

    // Hand
    const handZone: MapZone = {
      id: `hand`,
      name: "hand",
      col: layout.firstEstuaryCol + layout.colGap,
      row: layout.estuaryHeight + layout.handRowTopOffset,
      baseZIndex: 1,
      cards: game.hand,
      // Manually calculated width, since gaps are a pain
      width: 5.65,
      fan: { direction: "right", offset: 1.2 },
    };

    return [...colZones, statsZone, sourceZone, discardZone, handZone];
  }, [game]);

  // ─────────────────────────────── Card / Zone Mappers ───────────────────────────────
  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "hand") {
      // Hand
      const isSelected =
        !!selection &&
        "hand" in selection &&
        selection.hand === mappedCard.cardIndex;
      const isDiscardStep =
        !!selection &&
        "transfer" in selection &&
        selection.target !== undefined;
      return {
        isSelected,
        selectColor: isDiscardStep ? "red" : "blue",
        forceOverlayColor: isDiscardStep,
        isDisabled: game.ended,
        onPress: () => onHandPress(mappedCard.cardIndex),
      };
    } else if (
      mappedCard.zoneName === "school" &&
      mappedCard.pileIndex !== undefined &&
      mappedCard.refIndex !== undefined
    ) {
      // Schools of fish
      const colIndex = mappedCard.pileIndex;
      const entryIndex = mappedCard.refIndex;
      const entry = game.segments[colIndex]?.[entryIndex];
      const catchable =
        !!selectedHandCard &&
        isFisherman(selectedHandCard) &&
        !!entry &&
        !entry.fisherman;
      const isTransferSource =
        !!selection &&
        "transfer" in selection &&
        selection.transfer === colIndex &&
        entryIndex === game.segments[colIndex].length - 1;
      return {
        isSelected: isTransferSource,
        selectColor: catchable ? "blue" : isTransferSource ? "purple" : "none",
        isDisabled: game.ended,
        onPress: () => onSchoolPress(colIndex, entryIndex),
      };
    } else if (mappedCard.zoneName === "fisher") {
      // Fishermen
      return { isDisabled: true };
    }
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "estuary" && zone.pileIndex !== undefined) {
      const colIndex = zone.pileIndex;
      const releasing = !!selectedHandCard && isSchool(selectedHandCard);
      const targeting =
        !!selection &&
        "transfer" in selection &&
        selection.target === undefined &&
        selection.transfer !== colIndex;
      const isSelectedTarget =
        !!selection && "transfer" in selection && selection.target === colIndex;

      return {
        onPress: () => onColumnPress(colIndex),
        isDisabled: game.ended || (!releasing && !targeting),
        selectColor: releasing
          ? "blue"
          : targeting || isSelectedTarget
            ? "purple"
            : "none",
        forceOverlayColor: isSelectedTarget,
        forceSelectColor: isSelectedTarget,
      };
    }
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize,
    gap: 0,
    paddingTop: 0.2,
  });

  useEffect(() => {
    // Keep selection valid if the hand shrinks under it.
    if (selection && "hand" in selection && !game.hand[selection.hand]) {
      setSelection(null);
    }
  }, [game.hand, selection]);

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : score >= 9 ? "won" : "lost"}
      score={score}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={scoreTier(score)}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      <View
        style={[
          flexStyles.colStart,
          getZoneStylesById("stats"),
          {
            gap: spacing(10),
          },
        ]}
      >
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.spaceBetween,
          ]}
        >
          <Text size="sm" color={colorPale}>
            {i18n.t("games:delta21.score")}
          </Text>
          <Text size="sm" weight={500} color={colorPale}>
            {score}
          </Text>
        </View>

        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.spaceBetween,
          ]}
        >
          <Text size="sm" color={colorPale}>
            {i18n.t("games:delta21.studies")}
          </Text>
          <Text size="sm" weight={500} color={colorPale}>
            {game.studyCount}
          </Text>
        </View>

        {Object.keys(BREAKTHROUGH_LABELS).map((key) => {
          const achieved = game.breakthroughs.includes(key);
          return (
            <Text
              key={key}
              size="sm"
              weight={500}
              color={Colors.accentGreen}
              lineHeight={1.1}
              style={{
                filter: achieved ? undefined : "grayscale(100%)",
              }}
            >
              {BREAKTHROUGH_LABELS[key]}
            </Text>
          );
        })}
      </View>

      {game.segments.map((column, i) => {
        const total = columnTotal(column);
        const near = total === params.targetFish;
        const danger = total >= params.collapseFish - 1;
        return (
          <View
            key={`total-${i}`}
            style={[
              getZoneStylesById(`total-${i}`),
              {
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              },
            ]}
          >
            <Text
              size="md"
              weight={500}
              color={
                near
                  ? Colors.accentGreen
                  : danger
                    ? Colors.accentRed
                    : colorPale
              }
            >
              {total}
            </Text>
          </View>
        );
      })}
    </GameWrapper>
  );
}
