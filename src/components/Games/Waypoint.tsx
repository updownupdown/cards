import { Button } from "@/components/Button/Button";
import { MappedCard, MapZone, useCardMap } from "@/components/Cards/CardMap";
import { Text } from "@/components/common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { delay } from "@/utils/utils";
import { useMemo } from "react";
import { View } from "react-native";
import { AnimatedCardMapping, CardMapBGMapping } from "../Cards/AnimatedCard";
import {
  cardDims,
  createDeck,
  flipToBack,
  flipToFace,
  PlayingCard,
  rankValue,
  shuffle,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";
import { Colors } from "@/styles/styles";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { makeHint, pressHint, withNote, zoneTarget } from "@/hints/hint";
const cardSize = "tableau";

const topHugHeight = 1;
const gearRow = 6;

type GearName = "gearOne" | "gearTwo" | "gearThree";

type StageConfig = {
  sectors: number;
  gears: readonly [number, number, number];
  modifiers: number;
};

const STAGE_CONFIGS: Record<number, StageConfig> = {
  1: { sectors: 14, gears: [2, 4, 8], modifiers: 4 },
  2: { sectors: 12, gears: [2, 4, 6], modifiers: 3 },
  3: { sectors: 10, gears: [2, 3, 5], modifiers: 2 },
};

export type WaypointGameState = {
  stage: number;
  gearOne: PlayingCard[];
  gearTwo: PlayingCard[];
  gearThree: PlayingCard[];
  shuffle: PlayingCard[];
  sectors: PlayingCard[][];
  sectorRows: number[];
  boosts: PlayingCard[];
  brakes: PlayingCard[];
  completedSectors: number;
  bonuses: number;
  penalties: number;
  damage: number;
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

function waypointDeck() {
  return createDeck({ faceUp: false })
    .filter((card) => card.rank !== "K")
    .map(flipToBack);
}

function takeCards(
  shufflePile: PlayingCard[],
  count: number,
  predicate: (card: PlayingCard) => boolean,
) {
  const cards: PlayingCard[] = [];
  for (
    let index = shufflePile.length - 1;
    index >= 0 && cards.length < count;
    index -= 1
  ) {
    if (predicate(shufflePile[index])) {
      cards.push(shufflePile.splice(index, 1)[0]);
    }
  }
  return cards;
}

function collectCards(draft: WaypointGameState) {
  const cards = [
    ...draft.shuffle,
    ...draft.gearOne,
    ...draft.gearTwo,
    ...draft.gearThree,
    ...draft.sectors.flat(),
    ...draft.boosts,
    ...draft.brakes,
  ];
  return cards.length > 0 ? cards : waypointDeck();
}

function createLoopRows(sectors: number) {
  const topLaneLength = Math.ceil(sectors / 2);
  const bottomLaneLength = sectors - topLaneLength;
  const createLaneRows = (
    laneLength: number,
    edgeRow: number,
    middleShift: number,
  ) => {
    let wave = 0;
    return Array.from({ length: laneLength }, (_, index) => {
      const progress = laneLength <= 1 ? 0 : index / (laneLength - 1);
      const isTurn = index === 0 || index === laneLength - 1;

      if (isTurn) {
        wave = 0;
      } else {
        const delta = (Math.floor(Math.random() * 3) - 1) * 0.14;
        wave = Math.max(-0.24, Math.min(0.24, wave + delta));
      }

      return edgeRow + middleShift * Math.sin(Math.PI * progress) + wave;
    });
  };

  return [
    ...createLaneRows(topLaneLength, 0.45, -0.4),
    ...createLaneRows(bottomLaneLength, 1.6, 0.4),
  ];
}

function sectorColumn(index: number, sectors: number) {
  const topLaneLength = Math.ceil(sectors / 2);
  const isTopLane = index < topLaneLength;
  const laneIndex = isTopLane ? index : index - topLaneLength;
  const laneLength = isTopLane ? topLaneLength : sectors - topLaneLength;

  if (laneLength <= 1) return isTopLane ? 0 : 6;
  const progress = laneIndex / (laneLength - 1);
  return isTopLane ? progress * 6 : (1 - progress) * 6;
}

function setupStage(draft: WaypointGameState, stage: number) {
  const config = STAGE_CONFIGS[stage];
  draft.shuffle = shuffle(collectCards(draft).map(flipToBack));
  const groups = [
    takeCards(draft.shuffle, 12, (card) => rankValue(card) <= 3),
    takeCards(
      draft.shuffle,
      12,
      (card) => rankValue(card) >= 4 && rankValue(card) <= 6,
    ),
    takeCards(
      draft.shuffle,
      16,
      (card) => rankValue(card) >= 7 && rankValue(card) <= 10,
    ),
  ];
  const shuffledSectors = shuffle([
    ...groups[0].splice(0, config.gears[0]),
    ...groups[1].splice(0, config.gears[1]),
    ...groups[2].splice(0, config.gears[2]),
  ]).map(flipToBack);
  const startIndex = Math.floor(Math.random() * shuffledSectors.length);
  const sectorCards = [
    ...shuffledSectors.slice(startIndex),
    ...shuffledSectors.slice(0, startIndex),
  ].map((card) => [card]);
  const queens = takeCards(draft.shuffle, 4, (card) => card.rank === "Q");
  const jacks = takeCards(draft.shuffle, 4, (card) => card.rank === "J");
  const stackModifiers = (cards: PlayingCard[]) => [
    ...cards.slice(config.modifiers).map(flipToBack),
    ...cards.slice(0, config.modifiers).map(flipToFace),
  ];

  draft.stage = stage;
  draft.gearOne = groups[0].map(flipToBack);
  draft.gearTwo = groups[1].map(flipToBack);
  draft.gearThree = groups[2].map(flipToBack);
  draft.sectors = sectorCards;
  draft.boosts = stackModifiers(queens);
  draft.brakes = stackModifiers(jacks);
  draft.completedSectors = 0;
  draft.sectorRows = createLoopRows(sectorCards.length);
  draft.sectors[0][0] = flipToFace(draft.sectors[0][0]);
}

function createInitialState(): WaypointGameState {
  const game: WaypointGameState = {
    stage: 1,
    gearOne: [],
    gearTwo: [],
    gearThree: [],
    shuffle: [],
    sectors: [],
    sectorRows: [],
    boosts: [],
    brakes: [],
    completedSectors: 0,
    bonuses: 0,
    penalties: 0,
    damage: 0,
    ended: false,
    won: false,
    winLoseMessage: "",
  };
  setupStage(game, 1);
  return game;
}

/** Every card gathered face down into the shuffle pile, ready to deal. */
function gatherCards(draft: WaypointGameState) {
  draft.shuffle = shuffle(collectCards(draft).map(flipToBack));
  draft.gearOne = [];
  draft.gearTwo = [];
  draft.gearThree = [];
  draft.sectors = [];
  draft.sectorRows = [];
  draft.boosts = [];
  draft.brakes = [];
  draft.completedSectors = 0;
}

function resetGame(draft: WaypointGameState) {
  draft.bonuses = 0;
  draft.penalties = 0;
  draft.damage = 0;
  draft.ended = false;
  draft.won = false;
  draft.winLoseMessage = "";
  setupStage(draft, 1);
}

function currentTotal(game: WaypointGameState) {
  const currentSector = game.sectors[game.completedSectors] ?? [];
  return currentSector.slice(1).reduce((total, card) => {
    if (card.rank === "J") return total - 1;
    if (card.rank === "Q") return total + 1;
    return total + rankValue(card);
  }, 0);
}

function playCard(
  draft: WaypointGameState,
  source: GearName | "boosts" | "brakes",
) {
  if (draft.ended) return false;
  const card = draft[source].pop();

  const isFaceDownBoostOrBrake =
    (source === "boosts" || source === "brakes") && !card?.faceUp;

  if (!card || isFaceDownBoostOrBrake) {
    if (card) draft[source].push(card);
    return false;
  }

  draft.sectors[draft.completedSectors]?.push(flipToFace(card));
  return true;
}

function finishGame(draft: WaypointGameState) {
  const score = draft.bonuses - draft.penalties;
  draft.ended = true;
  draft.won = true;
  draft.winLoseMessage =
    score >= 1
      ? i18n.t("games:waypoint.ratingRecord", { score })
      : score >= -2
        ? i18n.t("games:waypoint.ratingPodium", { score })
        : score >= -6
          ? i18n.t("games:waypoint.ratingMiddle", { score })
          : i18n.t("games:waypoint.ratingBack", { score });
}

function finishSector(draft: WaypointGameState) {
  if (
    draft.ended ||
    (draft.sectors[draft.completedSectors]?.length ?? 0) <= 1 ||
    draft.completedSectors >= draft.sectors.length
  ) {
    return false;
  }

  const target = rankValue(draft.sectors[draft.completedSectors][0]);
  const total = currentTotal(draft);
  if (total === target && draft.sectors[draft.completedSectors].length === 2) {
    draft.bonuses = Math.min(16, draft.bonuses + 1);
  } else if (total > target) {
    draft.penalties = Math.min(16, draft.penalties + 1);
    draft.damage += 1;
    if (draft.damage > 2) {
      draft.ended = true;
      draft.won = false;
      draft.winLoseMessage = i18n.t("games:waypoint.dnf");
      return true;
    }
  } else if (total < target) {
    draft.penalties = Math.min(16, draft.penalties + target - total);
  }

  if (draft.penalties >= 16) {
    draft.ended = true;
    draft.won = false;
    draft.winLoseMessage = i18n.t("games:waypoint.dsq");
    return true;
  }

  draft.completedSectors += 1;

  if (draft.completedSectors < draft.sectors.length) {
    draft.sectors[draft.completedSectors][0] = flipToFace(
      draft.sectors[draft.completedSectors][0],
    );
  } else if (draft.stage < 3) {
    setupStage(draft, draft.stage + 1);
  } else {
    finishGame(draft);
  }
  return true;
}

// —— Hints ——

type WaypointMove = GearName | "boosts" | "brakes" | "finish";

const GEAR_RANGES: Record<GearName, readonly [number, number]> = {
  gearOne: [1, 3],
  gearTwo: [4, 6],
  gearThree: [7, 10],
};

const MOVE_ZONES: Record<Exclude<WaypointMove, "finish">, string> = {
  gearOne: "gear-one",
  gearTwo: "gear-two",
  gearThree: "gear-three",
  boosts: "boosts",
  brakes: "brakes",
};

// Losing the rally (a third crash, or 16 penalties) outweighs everything.
const RALLY_LOST = -100;

/**
 * What a gear may give, as value -> chance: its cards are face down, so from
 * the values of its range not yet seen face up (on the road or played).
 */
function gearOdds(game: WaypointGameState, gear: GearName) {
  const seen = new Map<number, number>();
  for (const card of game.sectors.flat()) {
    if (card.faceUp) {
      seen.set(rankValue(card), (seen.get(rankValue(card)) ?? 0) + 1);
    }
  }
  const [low, high] = GEAR_RANGES[gear];
  const counts: [number, number][] = [];
  for (let value = low; value <= high; value += 1) {
    counts.push([value, Math.max(0, 4 - (seen.get(value) ?? 0))]);
  }
  const total = counts.reduce((sum, [, count]) => sum + count, 0);
  return counts.map(([value, count]): [number, number] => [
    value,
    total ? count / total : 1 / counts.length,
  ]);
}

/**
 * How finishing the sector at this total scores. Penalties and crashes
 * draw on budgets for the whole rally (16 penalties, two crashes), so they
 * weigh more as the budgets run low against the sectors still to drive.
 */
function finishValue(
  game: WaypointGameState,
  target: number,
  total: number,
  played: number,
) {
  if (total === target) return played === 1 ? 1 : 0;
  const ahead =
    STAGE_CONFIGS[game.stage].sectors -
    game.completedSectors -
    1 +
    [2, 3].reduce(
      (sum, stage) =>
        sum + (stage > game.stage ? STAGE_CONFIGS[stage].sectors : 0),
      0,
    );
  const left = 15 - game.penalties;
  const perPenalty = Math.max(1, (0.6 * ahead) / Math.max(1, left));
  if (total > target) {
    // A crash: a penalty, and the car can only take two.
    if (game.damage >= 2 || left < 1) return RALLY_LOST;
    const crash = 3 * (game.damage + 1) * (ahead / 36 + 0.3);
    return -perPenalty - crash;
  }
  const penalty = target - total;
  return penalty > left ? RALLY_LOST : -penalty * perPenalty;
}

/**
 * What drawing from each gear costs the sectors still to come: each needs
 * a card from its own gear (the low ones especially, with nothing smaller
 * to make them up), and the gears are only just big enough. A gear with
 * cards to spare costs little; the stage's leftovers are shuffled away.
 */
function drawCosts(game: WaypointGameState): Record<GearName, number> {
  const config = STAGE_CONFIGS[game.stage];
  const shown = game.sectors
    .slice(0, game.completedSectors + 1)
    .map((sector) => rankValue(sector[0]));
  const gears = ["gearOne", "gearTwo", "gearThree"] as const;
  return Object.fromEntries(
    gears.map((gear, index) => {
      const [low, high] = GEAR_RANGES[gear];
      const ahead =
        config.gears[index] -
        shown.filter((value) => value >= low && value <= high).length;
      const spare = game[gear].length - ahead;
      return [gear, spare <= 0 ? 1.5 : spare <= 2 ? 0.6 : 0.15];
    }),
  ) as Record<GearName, number>;
}

/**
 * The best move for the current sector, weighing each draw over what the
 * gear may give; Gas and Brake cards are kept for later sectors unless they
 * pay for themselves now.
 */
function bestWaypointMove(game: WaypointGameState): WaypointMove | null {
  const sector = game.sectors[game.completedSectors];
  if (game.ended || !sector?.[0]?.faceUp) return null;
  const target = rankValue(sector[0]);
  const config = STAGE_CONFIGS[game.stage];
  // A Gas or Brake card is worth keeping while sectors remain to use it
  // in: it's what saves a sector when the gears have nothing that fits.
  const keep = game.completedSectors < config.sectors - 1 ? 1.2 : 0;
  const usable = (source: "boosts" | "brakes") =>
    game[source].filter((card) => card.faceUp).length;
  const gears = (["gearOne", "gearTwo", "gearThree"] as const).filter(
    (gear) => game[gear].length > 0,
  );
  const odds = new Map(gears.map((gear) => [gear, gearOdds(game, gear)]));
  const cost = drawCosts(game);
  const memo = new Map<string, number>();

  const best = (
    total: number,
    played: number,
    boosts: number,
    brakes: number,
  ): { value: number; move: WaypointMove | null } => {
    let choice: { value: number; move: WaypointMove | null } = {
      value: -Infinity,
      move: null,
    };
    const consider = (value: number, move: WaypointMove) => {
      if (value > choice.value) choice = { value, move };
    };
    if (played > 0) {
      consider(finishValue(game, target, total, played), "finish");
    }
    // Any gear card takes a total at the target past it.
    if (total < target) {
      for (const gear of gears) {
        consider(
          odds
            .get(gear)!
            .reduce(
              (sum, [value, chance]) =>
                sum + chance * worth(total + value, played + 1, boosts, brakes),
              0,
            ) - cost[gear],
          gear,
        );
      }
    }
    if (boosts > 0 && total < target) {
      consider(
        worth(total + 1, played + 1, boosts - 1, brakes) - keep,
        "boosts",
      );
    }
    // Even below zero: a sector short is better than a crash.
    if (brakes > 0) {
      consider(
        worth(total - 1, played + 1, boosts, brakes - 1) - keep,
        "brakes",
      );
    }
    return choice;
  };

  function worth(
    total: number,
    played: number,
    boosts: number,
    brakes: number,
  ): number {
    const key = `${total},${Math.min(played, 2)},${boosts},${brakes}`;
    let value = memo.get(key);
    if (value === undefined) {
      value = best(total, played, boosts, brakes).value;
      memo.set(key, value);
    }
    return value;
  }

  return best(
    currentTotal(game),
    sector.length - 1,
    usable("boosts"),
    usable("brakes"),
  ).move;
}

function findWaypointHint(game: WaypointGameState) {
  const move = bestWaypointMove(game);
  if (!move) return null;
  const sector = game.sectors[game.completedSectors];
  const total = currentTotal(game);
  const target = rankValue(sector[0]);
  if (move === "finish") {
    const hint = pressHint("actions", i18n.t("games:waypoint.finishSector"));
    if (total === target) return hint;
    if (total < target) {
      return withNote(hint, i18n.t("games:waypoint.hint.finishUnder"));
    }
    // A bust costs 1 penalty and 1 damage; Brakes could repair it, unless
    // there are too few, or they're worth more kept for later sectors.
    const brakes = game.brakes.filter((card) => card.faceUp).length;
    return withNote(
      hint,
      i18n.t(
        brakes < total - target
          ? "games:waypoint.hint.finishOver"
          : "games:waypoint.hint.finishOverKeep",
      ),
    );
  }
  const hint = makeHint("tapCard", zoneTarget(MOVE_ZONES[move]));
  if (move === "boosts") {
    return withNote(hint, i18n.t("games:waypoint.hint.boosts"));
  }
  // Braking is only worth it to repair a bust.
  if (move === "brakes" && total > target) {
    return withNote(hint, i18n.t("games:waypoint.hint.brakes"));
  }
  return hint;
}

export const waypointRules = {
  findHint: findWaypointHint,
  bestMove: bestWaypointMove,
  STAGE_CONFIGS,
  createInitialState,
  currentTotal,
  finishSector,
  playCard,
  setupStage,
};

// Starts with every card in the shuffle pile, to be dealt out from there.
const gameStateInitial = createInitialState();
gatherCards(gameStateInitial);

export default function Waypoint() {
  const { colorDark, colorPale } = useGameColors();
  const { spacing } = useResponsiveMetrics();
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager<WaypointGameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        // Gather every card into the shuffle pile, then deal them back out.
        setGame((draft) => gatherCards(draft));
        await delay();
        setGame((draft) => resetGame(draft));
        await delay(400);
      },
    });

  useHint(() => findWaypointHint(game), { game });

  function act(action: (draft: WaypointGameState) => boolean) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      action(draft);
    });
  }

  const score = game.bonuses - game.penalties;
  const total = currentTotal(game);
  const target = game.sectors[game.completedSectors]
    ? rankValue(game.sectors[game.completedSectors][0])
    : 0;

  const zones: MapZone[] = useMemo(() => {
    const sectorZones = game.sectors.map((sector, index): MapZone => {
      const current = index === game.completedSectors;

      return {
        id: `sector-${index}`,
        name: "sector",
        pileIndex: index,
        cards: sector,
        col: sectorColumn(index, game.sectors.length),
        row: game.sectorRows[index] + topHugHeight,
        baseZIndex: current ? 30 : 1,
        fan: {
          direction: "down",
          offset: current ? cardDims.tableauOffset : 0.05,
        },
        placeholder: {
          text: current ? i18n.t("games:waypoint.current") : undefined,
        },
      };
    });

    return [
      ...sectorZones,
      {
        id: "shuffle",
        name: "shuffle",
        cards: game.shuffle,
        col: 3,
        row: 1,
        fan: { maxVisible: 3 },
      },

      // HUDs
      {
        id: "hud-top-left",
        col: 0,
        row: 0,
        width: 2,
        height: topHugHeight,
      },
      {
        id: "hud-top-right",
        col: 4,
        row: 0,
        width: 3,
        height: topHugHeight,
      },
      {
        id: "hud-progress",
        col: 0,
        row: 4.5,
        width: 7,
        height: 1,
      },

      // Brake, Gas, Gears
      {
        id: "brakes",
        name: "brakes",
        cards: game.brakes,
        col: 0,
        row: gearRow,
        fan: {},
        placeholder: { text: i18n.t("games:waypoint.brake"), infoPos: "above" },
      },
      {
        id: "boosts",
        name: "boosts",
        cards: game.boosts,
        col: 1,
        row: gearRow,
        fan: {},
        placeholder: { text: i18n.t("games:waypoint.gas"), infoPos: "above" },
      },

      {
        id: "gear-one",
        name: "gearOne",
        cards: game.gearOne,
        col: 2.25,
        row: gearRow,
        fan: { maxVisible: 3 },
        placeholder: { text: "[1]", infoPos: "above" },
      },
      {
        id: "gear-two",
        name: "gearTwo",
        cards: game.gearTwo,
        col: 3.25,
        row: gearRow,
        fan: { maxVisible: 3 },
        placeholder: { text: "[2]", infoPos: "above" },
      },
      {
        id: "gear-three",
        name: "gearThree",
        cards: game.gearThree,
        col: 4.25,
        row: gearRow,
        fan: { maxVisible: 3 },
        placeholder: { text: "[3]", infoPos: "above" },
      },

      // Actions
      {
        id: "actions",
        col: 5.5,
        row: gearRow,
        width: 1.5,
      },
    ];
  }, [game]);

  const playSource = (source: GearName | "boosts" | "brakes") =>
    act((draft) => playCard(draft, source));

  const zoneMapper = (zone: MapZone): CardMapBGMapping => {
    if (zone.name === "sector" && zone.pileIndex !== undefined) {
      const isCompleted = zone.pileIndex < game.completedSectors;
      const isCurrent = zone.pileIndex === game.completedSectors;

      if (isCompleted || isCurrent) {
        return {
          forceOverlayColor: true,
          selectColor: isCompleted ? "grey" : "green",
        };
      }
    }
    if (
      ["gearOne", "gearTwo", "gearThree", "boosts", "brakes"].includes(
        zone.name ?? "",
      )
    ) {
      const source = zone.name as GearName | "boosts" | "brakes";
      const topCard = game[source][game[source].length - 1];
      const isFaceDownBoostOrBrake =
        (source === "boosts" || source === "brakes") && !topCard?.faceUp;

      return {
        onPress: () => playSource(source),
        isDisabled: game.ended || isFaceDownBoostOrBrake,
      };
    }
    return {};
  };

  const cardMapper = (mappedCard: MappedCard): AnimatedCardMapping => {
    if (mappedCard.zoneName === "sector") {
      const isCompleted = mappedCard.pileIndex! < game.completedSectors;
      const isCurrent = mappedCard.pileIndex === game.completedSectors;

      if (isCompleted || isCurrent) {
        return {
          clickThroughCards: true,
          isDisabled: true,
          forceOverlayColor: true,
          selectColor: isCompleted ? "grey" : "green",
          // yOffset: isCompleted ? 0.05 : 0.15,
        };
      }
    }

    return { clickThroughCards: true };
  };

  const { cardMap, cardHeight, cardWidth, getZoneStylesById } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    cardSize,
    gap: 0.1,
  });

  const HudText = ({
    label,
    value,
    leftAlign,
  }: {
    label: string;
    value: string;
    leftAlign?: boolean;
  }) => (
    <View
      style={[
        flexStyles.colStart,
        { alignItems: leftAlign ? "flex-start" : "flex-end" },
      ]}
    >
      <Text size="xs" color={colorPale} weight={300} textTransform="uppercase">
        {label}
      </Text>
      <Text size="xl" color={Colors.white} weight={600}>
        {value}
      </Text>
    </View>
  );

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      reset={reset}
      isLoaded={isLoaded}
      score={score}
      winLoseMessage={game.winLoseMessage}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {/* TOP LEFT */}
      <View
        style={[
          flexStyles.rowStart,
          getZoneStylesById("hud-top-left"),
          { justifyContent: "flex-start" },
        ]}
      >
        <HudText
          label={i18n.t("games:waypoint.time")}
          value={`${score >= 0 ? "+" : ""}${score}`}
          leftAlign
        />
      </View>

      {/* TOP RIGHT */}
      <View
        style={[
          flexStyles.rowStart,
          getZoneStylesById("hud-top-right"),
          { justifyContent: "flex-end", gap: spacing(20) },
        ]}
      >
        <HudText
          label={i18n.t("games:waypoint.penalty")}
          value={`${game.penalties}/16`}
        />
        <HudText
          label={i18n.t("games:waypoint.damage")}
          value={`${game.damage}/2`}
        />
      </View>

      {/* Progress */}
      <View
        style={[
          getZoneStylesById("hud-progress"),
          flexStyles.rowCentered,
          flexStyles.spaceBetween,
        ]}
      >
        <ProgressBar
          labelText={i18n.t("games:waypoint.stage")}
          progressValue={game.stage}
          totalValue={3}
          autoTallyText
          color={Colors.cardSelectOrange}
          style={{ width: cardWidth * 1.5 }}
          scaledHeight={cardHeight * 0.3}
        />

        <ProgressBar
          labelText={i18n.t("games:waypoint.sector")}
          progressValue={game.completedSectors}
          totalValue={STAGE_CONFIGS[game.stage].sectors}
          autoTallyText
          color={Colors.cardSelectPurple}
          style={{ width: cardWidth * 2.9 }}
          scaledHeight={cardHeight * 0.3}
        />

        <ProgressBar
          progressValue={total}
          totalValue={target}
          autoTallyText
          color={
            total === target
              ? Colors.cardSelectGreen
              : total > target
                ? Colors.cardSelectRed
                : Colors.cardSelectBlue
          }
          style={{ width: cardWidth * 2.9 }}
          scaledHeight={cardHeight * 0.3}
          labelText={i18n.t("games:waypoint.speed")}
        />
      </View>

      {/* ACTIONS */}
      <View style={[getZoneStylesById("actions"), flexStyles.rowCentered]}>
        <Button
          text={i18n.t("games:waypoint.finishSector")}
          size="sm"
          theme={
            total === target ? "green" : total > target ? "red" : colorDark
          }
          disabled={
            game.ended ||
            (game.sectors[game.completedSectors]?.length ?? 0) <= 1
          }
          onPress={() => act(finishSector)}
          style={{ width: "100%", height: "100%" }}
        />
      </View>
    </GameWrapper>
  );
}
