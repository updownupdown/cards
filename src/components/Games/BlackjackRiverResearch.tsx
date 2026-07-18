import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { useStateManager } from "@/hooks/useStateManager";
import { delay, DOUBLE_TAP_MS } from "@/utils/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "../common/Text";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToFace,
  RANK_VALUE,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

const cardSize = "regular";

const layout = {
  rowOffset: 0.3,
  handSize: 4,
  handRow: 5.85,
  colTopRow: 1.4,
  fishermanRowOffset: 0.1,
};

const params = {
  columnCount: 4,
  handSize: 4,
  targetFish: 21,
  collapseFish: 25,
};

type SchoolEntry = { school: PlayingCard; fisherman: PlayingCard | null };

type GameState = {
  station: PlayingCard[];
  discard: PlayingCard[];
  segments: SchoolEntry[][];
  hand: PlayingCard[];
  studyCount: number;
  breakthroughs: string[];
  ended: boolean;
};

type Selection = { hand: number } | { transfer: number; target?: number };

const BREAKTHROUGH_LABELS: Record<string, string> = {
  specialization: "Species Specialization",
  diversity: "Species Diversity",
  dense: "Dense Shoals",
  clusters: "Population Clusters",
  harvesting: "Selective Harvesting",
  pressure: "Fishing Pressure",
};
const breakthroughTotal = Object.keys(BREAKTHROUGH_LABELS).length;

const gameStateInitial: GameState = {
  station: [],
  segments: Array.from({ length: params.columnCount }, () => []),
  hand: [],
  discard: [],
  studyCount: 0,
  breakthroughs: [],
  ended: false,
};

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

async function resetAndSetup(
  setGame: (updater: (draft: GameState) => void) => void,
) {
  setGame((draft) => {
    draft.station = shuffle(createDeck());
    draft.segments = Array.from({ length: params.columnCount }, () => []);
    draft.hand = [];
    draft.discard = [];
    draft.studyCount = 0;
    draft.breakthroughs = [];
    draft.ended = false;

    // Reveal four Schools of Fish for the river; shuffle drawn Fishermen back.
    const setAside: PlayingCard[] = [];
    for (let i = 0; i < params.columnCount; i += 1) {
      const school = revealSchool(draft, setAside);
      if (school) draft.segments[i] = [{ school, fisherman: null }];
    }
    if (setAside.length > 0) {
      draft.station = shuffle([...draft.station, ...setAside]);
    }

    // Opening draw phase.
    drawPhase(draft);
  });

  await delay();
}

function scoreTier(score: number) {
  if (score >= 18)
    return "Your work reshapes the science of freshwater ecology!";
  if (score >= 14)
    return "Your research advances knowledge of river ecosystems.";
  if (score >= 9) return "Your findings aid local study of fish populations.";
  return "Your records add little to the understanding of the river.";
}

// ========== Component ========== //
export default function BlackjackRiverResearch() {
  const { cardText } = useGameZoneBackground();
  const [selection, setSelection] = useState<Selection | null>(null);
  const lastHandTap = useRef<{ index: number; at: number } | null>(null);

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      resetAndSetup: async () => {
        await resetAndSetup(setGame);
      },
      gameStateInitial,
      resetNonGameStates: () => {
        setSelection(null);
        lastHandTap.current = null;
      },
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
      if (played.suit === target.school.suit) {
        addBreakthrough(draft.breakthroughs, "harvesting");
      }
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

  function discardCard(handIndex: number) {
    if (game.ended) return;
    mutate((draft) => {
      const [discarded] = draft.hand.splice(handIndex, 1);
      if (discarded) draft.discard.push(discarded);
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

    const now = Date.now();
    const prev = lastHandTap.current;
    if (prev && prev.index === index && now - prev.at < DOUBLE_TAP_MS) {
      lastHandTap.current = null;
      discardCard(index);
      return;
    }
    lastHandTap.current = { index, at: now };

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
  const zones: MapZone[] = useMemo(() => {
    const result: MapZone[] = [
      { id: "hud", col: 0, row: 0, width: "full", height: 0.6 },
    ];

    for (let i = 0; i < params.columnCount; i += 1) {
      const colX = (i + 1) * (1 + layout.rowOffset);
      result.push({
        id: `total-${i}`,
        col: colX,
        row: 0.5,
        width: 1,
        height: 0.55,
      });

      // Background drop area (used to release onto empty / general column).
      result.push({
        id: `drop-${i}`,
        name: "coldrop",
        pileIndex: i,
        col: colX,
        row: layout.colTopRow,
        width: 1,
        height: 4,
        baseZIndex: 0,
        placeholder: {},
      });

      const column = game.segments[i];
      column.forEach((entry, j) => {
        const row = layout.colTopRow + j * 1;

        result.push({
          id: `sch-${i}-${j}`,
          name: "school",
          pileIndex: i,
          refIndex: j,
          col: colX,
          row,
          baseZIndex: 5 + j,
          cards: [entry.school],
          placeholder: {},
        });

        if (entry.fisherman) {
          result.push({
            id: `fish-${i}-${j}`,
            name: "fisher",
            pileIndex: i,
            refIndex: j,
            col: colX,
            row: row + layout.fishermanRowOffset,
            rotation: 90,
            baseZIndex: 60 + j,
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
      row: layout.colTopRow,
      baseZIndex: 90,
      cards: game.station,
      placeholder: { text: "Source", infoPos: "below" },
      fan: { maxVisible: 3 },
    };

    // Discard
    const discardZone: MapZone = {
      id: `discard`,
      name: "discard",
      col: 0,
      row: layout.colTopRow + 1.5,
      baseZIndex: 90,
      cards: game.discard,
      placeholder: { text: "Discard", infoPos: "below" },
      fan: { maxVisible: 3 },
    };

    // Hand
    const handZone: MapZone = {
      id: `hand`,
      name: "hand",
      col: 0,
      row: layout.handRow,
      baseZIndex: 90,
      cards: game.hand,
      width: 5,
      placeholder: {},
      fan: { direction: "right", offset: 1.2 },
    };

    return [...result, sourceZone, discardZone, handZone];
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
        selectColor: isDiscardStep ? "orange" : "blue",
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
        selectColor: catchable ? "green" : isTransferSource ? "orange" : "none",
        isDisabled: game.ended,
        onPress: () => onSchoolPress(colIndex, entryIndex),
      };
    } else if (mappedCard.zoneName === "fisher") {
      // Fishermen
      return { isDisabled: true };
    }
  };

  console.log(game);

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    if (zone.name === "coldrop" && zone.pileIndex !== undefined) {
      const colIndex = zone.pileIndex;
      const releasing = !!selectedHandCard && isSchool(selectedHandCard);
      const targeting =
        !!selection &&
        "transfer" in selection &&
        selection.target === undefined &&
        selection.transfer !== colIndex;
      return {
        onPress: () => onColumnPress(colIndex),
        isDisabled: game.ended || (!releasing && !targeting),
        selectColor: releasing || targeting ? "green" : "none",
      };
    }
    return {};
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    // gap: 0.14,
    cardSize,
    fixedRows: 7.2,
    visualizer: true,
  });

  useEffect(() => {
    // Keep selection valid if the hand shrinks under it.
    if (selection && "hand" in selection && !game.hand[selection.hand]) {
      setSelection(null);
    }
  }, [game.hand, selection]);

  return (
    <GameWrapper
      ended={game.ended}
      won={score >= 9}
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
          getZoneStylesById("hud"),
          {
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
          },
        ]}
      >
        <Text size="xs" weight={600} color={cardText}>
          Score {score}
        </Text>
        <Text size="xs" weight={600} color={cardText}>
          Studies {game.studyCount}
        </Text>
        <Text size="xs" weight={600} color={cardText}>
          Breaks {game.breakthroughs.length}/{breakthroughTotal}
        </Text>
        <Text size="xs" weight={600} color={cardText}>
          River {game.station.length}
        </Text>
      </View>

      {game.segments.map((column, i) => {
        const totalStyle = getZoneStylesById(`total-${i}`);
        const total = columnTotal(column);
        const near = total === params.targetFish;
        const danger = total >= params.collapseFish - 1;
        return (
          <View
            key={`total-${i}`}
            style={[
              totalStyle,
              { alignItems: "center", justifyContent: "center" },
            ]}
          >
            <Text
              size="md"
              weight={700}
              color={near ? "#7CFC98" : danger ? "#FF9C8A" : cardText}
            >
              {total}
            </Text>
          </View>
        );
      })}
    </GameWrapper>
  );
}
