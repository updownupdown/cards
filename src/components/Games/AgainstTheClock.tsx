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
  createDeck,
  flipToBack,
  flipToFace,
  PlayingCard,
  rankValue,
  shuffle,
} from "../Cards/card-utils";
import { GameWrapper } from "../common/GameWrapper";

type StagePhase = "chooseStart" | "racing";
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

export type AgainstTheClockGameState = {
  stage: number;
  phase: StagePhase;
  gearOne: PlayingCard[];
  gearTwo: PlayingCard[];
  gearThree: PlayingCard[];
  sectors: PlayingCard[];
  currentPlays: PlayingCard[];
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

function numberedDeck() {
  return createDeck({ faceUp: false })
    .filter((card) => rankValue(card) <= 10)
    .map(flipToBack);
}

function modifierCards(rank: "J" | "Q", count: number) {
  return createDeck({ faceUp: true })
    .filter((card) => card.rank === rank)
    .slice(0, count)
    .map(flipToFace);
}

function setupStage(draft: AgainstTheClockGameState, stage: number) {
  const config = STAGE_CONFIGS[stage];
  const groups = [
    shuffle(numberedDeck().filter((card) => rankValue(card) <= 3)),
    shuffle(
      numberedDeck().filter(
        (card) => rankValue(card) >= 4 && rankValue(card) <= 6,
      ),
    ),
    shuffle(numberedDeck().filter((card) => rankValue(card) >= 7)),
  ];
  const sectorCards = shuffle([
    ...groups[0].splice(0, config.gears[0]),
    ...groups[1].splice(0, config.gears[1]),
    ...groups[2].splice(0, config.gears[2]),
  ]).map(flipToBack);

  draft.stage = stage;
  draft.phase = "chooseStart";
  draft.gearOne = groups[0].map(flipToBack);
  draft.gearTwo = groups[1].map(flipToBack);
  draft.gearThree = groups[2].map(flipToBack);
  draft.sectors = sectorCards;
  draft.currentPlays = [];
  draft.boosts = modifierCards("Q", config.modifiers);
  draft.brakes = modifierCards("J", config.modifiers);
  draft.completedSectors = 0;
}

function createInitialState(): AgainstTheClockGameState {
  const game: AgainstTheClockGameState = {
    stage: 1,
    phase: "chooseStart",
    gearOne: [],
    gearTwo: [],
    gearThree: [],
    sectors: [],
    currentPlays: [],
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

function chooseStart(draft: AgainstTheClockGameState, fromRight: boolean) {
  if (
    draft.ended ||
    draft.phase !== "chooseStart" ||
    draft.sectors.length === 0
  ) {
    return false;
  }
  if (fromRight) draft.sectors.reverse();
  draft.sectors[0] = flipToFace(draft.sectors[0]);
  draft.phase = "racing";
  return true;
}

function currentTotal(game: AgainstTheClockGameState) {
  return game.currentPlays.reduce((total, card) => {
    if (card.rank === "J") return total - 1;
    if (card.rank === "Q") return total + 1;
    return total + rankValue(card);
  }, 0);
}

function playCard(
  draft: AgainstTheClockGameState,
  source: GearName | "boosts" | "brakes",
) {
  if (draft.ended || draft.phase !== "racing") return false;
  const card = draft[source].pop();
  if (!card) return false;
  draft.currentPlays.push({
    ...flipToFace(card),
    id: `${card.id}-stage-${draft.stage}-sector-${draft.completedSectors}-play-${draft.currentPlays.length}`,
  });
  return true;
}

function finishGame(draft: AgainstTheClockGameState) {
  const score = draft.bonuses - draft.penalties;
  draft.ended = true;
  draft.won = true;
  draft.winLoseMessage =
    score >= 1
      ? `New rally record: +${score}.`
      : score >= -2
        ? `Podium finish: ${score}.`
        : score >= -6
          ? `Middle of the pack: ${score}.`
          : `Back of the pack: ${score}.`;
}

function finishSector(draft: AgainstTheClockGameState) {
  if (
    draft.ended ||
    draft.phase !== "racing" ||
    draft.currentPlays.length === 0 ||
    draft.sectors.length === 0
  ) {
    return false;
  }

  const target = rankValue(draft.sectors[0]);
  const total = currentTotal(draft);
  if (total === target && draft.currentPlays.length === 1) {
    draft.bonuses = Math.min(16, draft.bonuses + 1);
  } else if (total > target) {
    draft.penalties = Math.min(16, draft.penalties + 1);
    draft.damage += 1;
    if (draft.damage > 2) {
      draft.ended = true;
      draft.won = false;
      draft.winLoseMessage = "DNF: the car took too much damage.";
      return true;
    }
  } else if (total < target) {
    draft.penalties = Math.min(16, draft.penalties + target - total);
  }

  if (draft.penalties >= 16) {
    draft.ended = true;
    draft.won = false;
    draft.winLoseMessage = "DSQ: the clock reached 16 time penalties.";
    return true;
  }

  draft.sectors.shift();
  draft.currentPlays = [];
  draft.completedSectors += 1;

  if (draft.sectors.length > 0) {
    draft.sectors[0] = flipToFace(draft.sectors[0]);
  } else if (draft.stage < 3) {
    setupStage(draft, draft.stage + 1);
  } else {
    finishGame(draft);
  }
  return true;
}

function jokerCard(index: number, damage: number): PlayingCard {
  return {
    id: `damage-joker-${index}`,
    suit: index === 0 ? "spades" : "hearts",
    rank: "Joker",
    faceUp: damage <= index,
  };
}

export const againstTheClockRules = {
  STAGE_CONFIGS,
  chooseStart,
  createInitialState,
  currentTotal,
  finishSector,
  playCard,
  setupStage,
};

const gameStateInitial = createInitialState();

export default function AgainstTheClock() {
  const { colorDark, colorPale } = useGameColors();
  const { spacing } = useResponsiveMetrics();
  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager<AgainstTheClockGameState>({
      gameStateInitial,
      resetAndSetup: async () => {
        setGame((draft) => Object.assign(draft, createInitialState()));
        await delay(400);
      },
    });

  function act(action: (draft: AgainstTheClockGameState) => boolean) {
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      action(draft);
    });
  }

  const score = game.bonuses - game.penalties;
  const total = currentTotal(game);
  const target = game.sectors[0] ? rankValue(game.sectors[0]) : 0;

  const clockReadings = useMemo(
    () =>
      [
        {
          id: "bonus-a",
          total: game.bonuses,
          offset: 0,
          suit: "hearts" as const,
          col: 0,
        },
        {
          id: "bonus-b",
          total: game.bonuses,
          offset: 8,
          suit: "diamonds" as const,
          col: 1,
        },
        {
          id: "penalty-a",
          total: game.penalties,
          offset: 0,
          suit: "clubs" as const,
          col: 0,
        },
        {
          id: "penalty-b",
          total: game.penalties,
          offset: 8,
          suit: "spades" as const,
          col: 1,
        },
      ].map((entry) => ({
        ...entry,
        ticks: Math.max(0, Math.min(8, entry.total - entry.offset)),
      })),
    [game.bonuses, game.penalties],
  );

  const clockZones = useMemo(
    () =>
      clockReadings.map((entry, index): MapZone => {
        const ticks = Math.max(0, Math.min(8, entry.total - entry.offset));
        return {
          id: entry.id,
          name: "clock",
          cards: [],
          col: entry.col,
          row: index < 2 ? 3.05 : 4.1,
          placeholder: { text: ticks === 8 ? "Done" : undefined },
        };
      }),
    [clockReadings],
  );

  const zones: MapZone[] = useMemo(() => {
    const sectorZones = game.sectors.map(
      (sector, index): MapZone => ({
        id: `sector-${index}`,
        name: "sector",
        pileIndex: index,
        cards: index === 0 ? [sector, ...game.currentPlays] : [sector],
        col: index % 7,
        row: Math.floor(index / 7),
        baseZIndex: 20,
        fan:
          index === 0
            ? { direction: "down", offset: 0.2, maxVisible: 5 }
            : undefined,
        placeholder: { text: index === 0 ? "Current" : undefined },
      }),
    );

    return [
      ...sectorZones,
      ...clockZones,
      {
        id: "gear-one",
        name: "gearOne",
        cards: game.gearOne,
        col: 2.3,
        row: 3.2,
        fan: { maxVisible: 3 },
        placeholder: { text: "Gear 1", showCount: true },
      },
      {
        id: "gear-two",
        name: "gearTwo",
        cards: game.gearTwo,
        col: 3.3,
        row: 3.2,
        fan: { maxVisible: 3 },
        placeholder: { text: "Gear 2", showCount: true },
      },
      {
        id: "gear-three",
        name: "gearThree",
        cards: game.gearThree,
        col: 4.3,
        row: 3.2,
        fan: { maxVisible: 3 },
        placeholder: { text: "Gear 3", showCount: true },
      },
      {
        id: "boosts",
        name: "boosts",
        cards: game.boosts,
        col: 5.4,
        row: 3.2,
        fan: { direction: "right", offset: 0.12, maxVisible: 4 },
        placeholder: { text: "Boost +1", showCount: true },
      },
      {
        id: "brakes",
        name: "brakes",
        cards: game.brakes,
        col: 5.4,
        row: 4.25,
        fan: { direction: "right", offset: 0.12, maxVisible: 4 },
        placeholder: { text: "Brake -1", showCount: true },
      },
      {
        id: "damage-one",
        name: "damage",
        cards: [jokerCard(0, game.damage)],
        col: 2.6,
        row: 4.25,
      },
      {
        id: "damage-two",
        name: "damage",
        cards: [jokerCard(1, game.damage)],
        col: 3.6,
        row: 4.25,
      },
      { id: "actions", col: 0, row: 5.45, width: 7, height: 0.65 },
    ];
  }, [clockZones, game]);

  const playSource = (source: GearName | "boosts" | "brakes") =>
    act((draft) => playCard(draft, source));

  const zoneMapper = (zone: MapZone): CardMapBGMapping => {
    if (
      zone.name === "sector" &&
      game.phase === "chooseStart" &&
      zone.pileIndex !== undefined
    ) {
      const isEnd =
        zone.pileIndex === 0 || zone.pileIndex === game.sectors.length - 1;
      return {
        onPress: () =>
          isEnd && act((draft) => chooseStart(draft, zone.pileIndex !== 0)),
        isDisabled: !isEnd,
        isSelected: isEnd,
        selectColor: "green",
      };
    }
    if (
      ["gearOne", "gearTwo", "gearThree", "boosts", "brakes"].includes(
        zone.name ?? "",
      )
    ) {
      return {
        onPress: () => playSource(zone.name as GearName | "boosts" | "brakes"),
        isDisabled: game.phase !== "racing" || game.ended,
      };
    }
    return {};
  };

  const cardMapper = (mappedCard: MappedCard): AnimatedCardMapping => {
    if (mappedCard.zoneName === "sector" && game.phase === "chooseStart") {
      const isEnd =
        mappedCard.pileIndex === 0 ||
        mappedCard.pileIndex === game.sectors.length - 1;
      return {
        onPress: () =>
          isEnd &&
          act((draft) => chooseStart(draft, mappedCard.pileIndex !== 0)),
        isDisabled: !isEnd,
        forceOverlayColor: isEnd,
        selectColor: "green",
        animDuration: 0,
      };
    }
    if (
      ["gearOne", "gearTwo", "gearThree", "boosts", "brakes"].includes(
        mappedCard.zoneName ?? "",
      )
    ) {
      return {
        onPress: () =>
          playSource(mappedCard.zoneName as GearName | "boosts" | "brakes"),
        isDisabled:
          !mappedCard.topOfZone || game.phase !== "racing" || game.ended,
        animDuration: 0,
      };
    }
    return { isDisabled: true, animDuration: 0 };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    zoneMapper,
    cardMapper,
    cardSize: "small-colored",
    fixedCols: 7,
    fixedRows: 6.2,
    gap: 0.08,
  });

  const prompt =
    game.phase === "chooseStart"
      ? `Stage ${game.stage}: choose either highlighted end`
      : `Stage ${game.stage} · Sector ${game.completedSectors + 1}/${STAGE_CONFIGS[game.stage].sectors} · ${total}/${target}`;

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
      {clockReadings.map((entry) => (
        <View
          key={`${entry.id}-ticks`}
          style={[
            getZoneStylesById(entry.id),
            {
              zIndex: 70,
              justifyContent: "center",
              alignItems: "center",
              pointerEvents: "none",
            },
          ]}
        >
          <Text
            size="xxs"
            color={colorPale}
            style={{
              backgroundColor: colorDark,
              paddingHorizontal: spacing(3),
              textAlign: "center",
            }}
          >
            {entry.suit === "hearts"
              ? "K♥"
              : entry.suit === "diamonds"
                ? "K♦"
                : entry.suit === "clubs"
                  ? "K♣"
                  : "K♠"}
            {"\n"}
            {entry.ticks}/8
          </Text>
        </View>
      ))}
      <View
        style={[
          getZoneStylesById("actions"),
          flexStyles.colCentered,
          { gap: spacing(4) },
        ]}
      >
        <Text size="xs" color={colorPale} style={{ textAlign: "center" }}>
          {prompt} · Bonus {game.bonuses} · Penalty {game.penalties} · Damage{" "}
          {Math.min(game.damage, 2)}/2
        </Text>
        {game.phase === "racing" && !game.ended && (
          <Button
            text="Finish sector"
            size="xs"
            theme={
              total === target ? "green" : total > target ? "red" : colorDark
            }
            disabled={game.currentPlays.length === 0}
            onPress={() => act(finishSector)}
          />
        )}
      </View>
    </GameWrapper>
  );
}
