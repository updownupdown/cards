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

export const waypointRules = {
  STAGE_CONFIGS,
  createInitialState,
  currentTotal,
  finishSector,
  playCard,
  setupStage,
};

const gameStateInitial = createInitialState();

export default function Waypoint() {
  const { colorDark, colorPale } = useGameColors();
  const { spacing } = useResponsiveMetrics();
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager<WaypointGameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        setGame((draft) => resetGame(draft));
        await delay(400);
      },
    });

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
