import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { delay } from "@/utils/utils";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  collectCards,
  createDeck,
  flipAllToBack,
  flipAllToFace,
  redealWith,
  shuffle,
  top,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";

import { i18n } from "@/i18n";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";

// Water Sort with cards: 13 jars of four mixed cards, sorted into one rank per
// jar. Two spare jars and two one-card dishes give just enough room that
// careless play gets stuck but a little planning always gets through.
const JAR_SIZE = 4;
const FILLED_JARS = 13;
const SPARE_JARS = 2;
const JAR_COUNT = FILLED_JARS + SPARE_JARS;
const DISH_COUNT = 2;
const JARS_PER_ROW = 5;
const JAR_OFFSET = cardDims.tableauOffset;
const JAR_TOP_ROW = 1.2;
const JAR_ROW_SPAN = 1 + (JAR_SIZE - 1) * JAR_OFFSET + 0.05;
const SOLVER_NODE_LIMIT = 20000;
const DEAL_ATTEMPTS = 20;

export type ApothecaryGameState = {
  /** Jars first, then dishes. Each vessel lists its cards bottom to top. */
  vessels: PlayingCard[][];
  pours: number;
  /** Cards gathered up between deals. */
  deal: PlayingCard[];
};

// ========== Rules ========== //
function capacityOf(index: number) {
  return index < JAR_COUNT ? JAR_SIZE : 1;
}

function isDish(index: number) {
  return index >= JAR_COUNT;
}

/** A full jar of one rank is sealed: turned face down and out of play. */
function isSealed(vessel: PlayingCard[]) {
  return vessel.length === JAR_SIZE && vessel.every((card) => !card.faceUp);
}

/** How many cards of the top card's rank sit together at the top. */
function topRunLength(vessel: PlayingCard[]) {
  const rank = top(vessel)?.rank;
  let count = 0;
  for (let i = vessel.length - 1; i >= 0 && vessel[i].rank === rank; i--) {
    count++;
  }
  return count;
}

function canSelect(state: ApothecaryGameState, index: number) {
  const vessel = state.vessels[index];
  return vessel.length > 0 && !isSealed(vessel);
}

function canPour(state: ApothecaryGameState, from: number, to: number) {
  if (from === to || !canSelect(state, from)) return false;
  const target = state.vessels[to];
  if (target.length >= capacityOf(to)) return false;
  const targetTop = top(target);
  return !targetTop || targetTop.rank === top(state.vessels[from])?.rank;
}

function pour(state: ApothecaryGameState, from: number, to: number) {
  if (!canPour(state, from, to)) return false;
  const source = state.vessels[from];
  const target = state.vessels[to];
  const rank = top(source)!.rank;
  while (top(source)?.rank === rank && target.length < capacityOf(to)) {
    target.push(source.pop()!);
  }
  if (
    !isDish(to) &&
    target.length === JAR_SIZE &&
    target.every((card) => card.rank === rank)
  ) {
    state.vessels[to] = flipAllToBack(target);
  }
  state.pours++;
  return true;
}

function hasPour(state: ApothecaryGameState) {
  return state.vessels.some((_, from) =>
    state.vessels.some((__, to) => canPour(state, from, to)),
  );
}

function isWon(state: ApothecaryGameState) {
  return state.vessels.filter(isSealed).length === FILLED_JARS;
}

function isLost(state: ApothecaryGameState) {
  return state.deal.length === 0 && !isWon(state) && !hasPour(state);
}

// ========== Solver ========== //
// A depth-first search over ranks only, trying the pours that leave the fewest
// breaks between ranks first. Used to make sure every deal can be won.
type Racks = number[][];

function rackBreaks(racks: Racks) {
  let breaks = 0;
  for (const rack of racks) {
    for (let i = 0; i < rack.length; i++) {
      if (i === 0 || rack[i] !== rack[i - 1]) breaks++;
    }
  }
  return breaks;
}

function rackKey(racks: Racks) {
  const jars = racks.slice(0, JAR_COUNT).map((rack) => rack.join(","));
  const dishes = racks.slice(JAR_COUNT).map((rack) => rack.join(","));
  return `${jars.sort().join("|")}#${dishes.sort().join("|")}`;
}

function rackPours(racks: Racks) {
  const results: Racks[] = [];
  racks.forEach((source, from) => {
    const rank = source[source.length - 1];
    if (rank === undefined) return;
    let run = 0;
    while (source[source.length - 1 - run] === rank) run++;
    if (run === JAR_SIZE) return;

    racks.forEach((target, to) => {
      if (from === to || target.length >= capacityOf(to)) return;
      if (target.length > 0 && target[target.length - 1] !== rank) return;
      // Moving a whole vessel into an empty one of the same size changes nothing.
      if (
        target.length === 0 &&
        run === source.length &&
        capacityOf(to) >= capacityOf(from)
      ) {
        return;
      }
      const next = racks.map((rack) => rack.slice());
      while (
        next[from][next[from].length - 1] === rank &&
        next[to].length < capacityOf(to)
      ) {
        next[to].push(next[from].pop()!);
      }
      results.push(next);
    });
  });
  return results;
}

function isSolvable(racks: Racks) {
  const seen = new Set<string>();
  let nodes = 0;

  const search = (current: Racks): boolean => {
    if (rackBreaks(current) === FILLED_JARS) return true;
    if (++nodes > SOLVER_NODE_LIMIT) return false;
    const key = rackKey(current);
    if (seen.has(key)) return false;
    seen.add(key);
    const options = rackPours(current).sort(
      (a, b) => rackBreaks(a) - rackBreaks(b),
    );
    return options.some(search);
  };

  return search(racks);
}

function toRacks(vessels: PlayingCard[][]): Racks {
  const ranks = new Map<string, number>();
  return vessels.map((vessel) =>
    vessel.map((card) => {
      if (!ranks.has(card.rank)) ranks.set(card.rank, ranks.size);
      return ranks.get(card.rank)!;
    }),
  );
}

// ========== Deal ========== //
function dealVessels(cards: PlayingCard[]) {
  const shuffled = flipAllToFace(shuffle(cards));
  return Array.from({ length: JAR_COUNT + DISH_COUNT }, (_, index) =>
    index < FILLED_JARS
      ? shuffled.slice(index * JAR_SIZE, (index + 1) * JAR_SIZE)
      : [],
  );
}

function hasFullJar(vessels: PlayingCard[][]) {
  return vessels.some(
    (vessel) =>
      vessel.length === JAR_SIZE &&
      vessel.every((card) => card.rank === vessel[0].rank),
  );
}

function createInitialState(): ApothecaryGameState {
  const cards = createDeck();
  let vessels = dealVessels(cards);
  for (let attempt = 1; attempt < DEAL_ATTEMPTS; attempt++) {
    if (!hasFullJar(vessels) && isSolvable(toRacks(vessels))) break;
    vessels = dealVessels(cards);
  }
  return { vessels, pours: 0, deal: [] };
}

function gatherState(state: ApothecaryGameState): ApothecaryGameState {
  return {
    vessels: Array.from({ length: JAR_COUNT + DISH_COUNT }, () => []),
    pours: 0,
    deal: shuffle(flipAllToBack(collectCards(state))),
  };
}

const gameStateInitial = createInitialState();

export const apothecaryRules = {
  capacityOf,
  isSealed,
  topRunLength,
  canSelect,
  canPour,
  pour,
  hasPour,
  isWon,
  isLost,
  isSolvable,
  toRacks,
  createInitialState,
};

// ========== Component ========== //
export default function Apothecary() {
  const { colorPale } = useGameColors();
  const [selected, setSelected] = useState<number | null>(null);

  const { isLoaded, game, setGame, reset, undo, canUndo, saveUndoState } =
    useStateManager<ApothecaryGameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        // Gather every card into the deal pile, then deal them back out.
        setGame((draft) => gatherState(draft));
        await delay();
        setGame((draft) => redealWith(createInitialState(), draft.deal));
      },
      resetNonGameStates: () => setSelected(null),
    });

  const won = isWon(game);
  const lost = isLost(game);
  const ended = won || lost;
  const sealedCount = game.vessels.filter(isSealed).length;

  function onVesselPress(index: number) {
    if (ended) return;

    if (selected === null) {
      if (canSelect(game, index)) setSelected(index);
      return;
    }

    if (selected === index) {
      setSelected(null);
      return;
    }

    if (canPour(game, selected, index)) {
      saveUndoState(structuredClone(game));
      setGame((draft) => {
        pour(draft, selected, index);
      });
      setSelected(null);
      return;
    }

    setSelected(canSelect(game, index) ? index : null);
  }

  const selectedRun =
    selected === null ? 0 : topRunLength(game.vessels[selected]);

  const zones: MapZone[] = useMemo(() => {
    const dishZones: MapZone[] = Array.from({ length: DISH_COUNT }, (_, i) => ({
      id: `dish-${i}`,
      name: "vessel",
      pileIndex: JAR_COUNT + i,
      cards: game.vessels[JAR_COUNT + i],
      col: (JARS_PER_ROW - DISH_COUNT) / 2 + i,
      row: 0,
      baseZIndex: 10,
      placeholder: {
        text: i18n.t("games:apothecary.dish"),
        iconName: "free-cell",
        showCount: false,
      },
    }));

    const jarZones: MapZone[] = Array.from({ length: JAR_COUNT }, (_, i) => ({
      id: `jar-${i}`,
      name: "vessel",
      pileIndex: i,
      cards: game.vessels[i],
      col: i % JARS_PER_ROW,
      row: JAR_TOP_ROW + Math.floor(i / JARS_PER_ROW) * JAR_ROW_SPAN,
      baseZIndex: 10,
      fan: { direction: "down", offset: JAR_OFFSET, center: false },
      placeholder: { showCount: false },
    }));

    return [
      {
        id: "deal",
        name: "deal",
        cards: game.deal,
        col: 0,
        row: 0,
        baseZIndex: 50,
        fan: { maxVisible: 3 },
        placeholder: { hideBackground: true, hideShadow: true },
      },
      ...dishZones,
      ...jarZones,
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    const index = mappedCard.pileIndex;
    if (mappedCard.zoneName !== "vessel" || index === undefined) return {};

    const vessel = game.vessels[index];
    const isInSelectedRun =
      selected === index && mappedCard.cardIndex >= vessel.length - selectedRun;
    const isTarget =
      selected !== null &&
      mappedCard.topOfZone &&
      canPour(game, selected, index);

    return {
      onPress: () => onVesselPress(index),
      isDisabled: ended || isSealed(vessel),
      isSelected: isInSelectedRun,
      selectColor: isInSelectedRun ? "blue" : isTarget ? "green" : "none",
      forceOverlayColor: isTarget,
    };
  };

  const zoneMapper = (zone: MapZone): CardMapBGMapping | undefined => {
    const index = zone.pileIndex;
    if (zone.name !== "vessel" || index === undefined) return;
    const isTarget = selected !== null && canPour(game, selected, index);
    return {
      onPress: () => onVesselPress(index),
      isDisabled: ended,
      selectColor: isTarget ? "green" : "none",
    };
  };

  const { cardMap } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper,
    cardSize: "tableau",
    gap: 0.15,
    fixedRows: 7.35,
  });

  return (
    <GameWrapper
      outcome={won ? "won" : lost ? "lost" : "playing"}
      reset={() => void reset()}
      isLoaded={isLoaded}
      score={game.pours}
      canUndo={canUndo}
      undo={() => {
        setSelected(null);
        undo();
      }}
      winLoseMessage={
        won
          ? i18n.t("games:apothecary.allSealed", { count: game.pours })
          : i18n.t("games:apothecary.noPoursLeft")
      }
    >
      {cardMap}
    </GameWrapper>
  );
}
