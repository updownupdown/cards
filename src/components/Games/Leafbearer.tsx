import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { delay } from "@/utils/utils";
import { useMemo, useRef } from "react";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  zoneFanOffset,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { View } from "react-native";
import { Colors, rgba, transitionStyles } from "@/styles/styles";
import { Text } from "../common/Text";
import { useGameColors } from "@/hooks/useGameColors";
import { flexStyles } from "@/styles/flexStyles";

const ZONE_ROW_MULT = 1.1;
const LOCATION_COUNT = 9;
const STABLES_INDEX = 4;
const STABLES_ROW = 4 + 4 * (ZONE_ROW_MULT - 1);
const REALM_INDEXES = [0, 1, 2, 3, 5, 6, 7, 8];
const CREATURE_COL = 0.2;
const EATEN_COL_OFFSET = 0.2;
const fixedCols = 7;
const fixedRows = 9 + 8 * (ZONE_ROW_MULT - 1);

type Creature = {
  card: PlayingCard;
  healthy: boolean;
};

type HerbPhase = "chooseSource" | "distribute";

export type LeafbearerGameState = {
  creatures: (Creature | null)[];
  stables: PlayingCard[];
  herbStacks: PlayingCard[][];
  eatenHerbs: PlayingCard[][];
  noble: PlayingCard | null;
  nobleEaten: PlayingCard[];
  jester: PlayingCard | null;
  jesterEaten: PlayingCard[];
  carriedHerbs: PlayingCard[];
  nextLocation: number | null;
  phase: HerbPhase;
  openStables: boolean;
  ended: boolean;
  won: boolean;
  winLoseMessage: string;
};

const gameStateInitial: LeafbearerGameState = {
  creatures: Array.from({ length: LOCATION_COUNT }, () => null),
  stables: [],
  herbStacks: Array.from({ length: LOCATION_COUNT }, () => []),
  eatenHerbs: Array.from({ length: LOCATION_COUNT }, () => []),
  noble: null,
  nobleEaten: [],
  jester: null,
  jesterEaten: [],
  carriedHerbs: [],
  nextLocation: null,
  phase: "chooseSource",
  openStables: false,
  ended: false,
  won: false,
  winLoseMessage: "",
};

function herbValue(card: PlayingCard) {
  return rankValue(card);
}

function herbTotal(herbs: PlayingCard[]) {
  return herbs.reduce((sum, herb) => sum + herbValue(herb), 0);
}

function currentHealingRank(state: Readonly<LeafbearerGameState>) {
  const sick = state.creatures.filter(
    (creature): creature is Creature => creature !== null && !creature.healthy,
  );
  if (sick.some((creature) => creature.card.rank === "J")) return "J";
  if (sick.some((creature) => creature.card.rank === "Q")) return "Q";
  if (sick.some((creature) => creature.card.rank === "K")) return "K";
  return null;
}

function canHeal(creature: Creature, herbs: PlayingCard[]) {
  return (
    !creature.healthy &&
    herbTotal(herbs) === rankValue(creature.card) &&
    herbs.some((herb) => herb.suit === creature.card.suit)
  );
}

function eatMatchingHerbs(
  herbs: PlayingCard[],
  creature: PlayingCard,
  eaten: PlayingCard[],
) {
  const remaining = herbs.filter((herb) => herb.suit !== creature.suit);
  eaten.push(
    ...herbs.filter((herb) => herb.suit === creature.suit).map(flipToBack),
  );
  return remaining;
}

function resolveCreaturePhase(draft: LeafbearerGameState) {
  const rank = currentHealingRank(draft);
  if (rank) {
    for (const index of REALM_INDEXES) {
      const creature = draft.creatures[index];
      if (
        creature?.card.rank === rank &&
        canHeal(creature, draft.herbStacks[index])
      ) {
        creature.healthy = true;
      }
    }
  }

  for (const index of REALM_INDEXES) {
    const creature = draft.creatures[index];
    if (creature?.healthy) {
      draft.herbStacks[index] = eatMatchingHerbs(
        draft.herbStacks[index],
        creature.card,
        draft.eatenHerbs[index],
      );
    }
  }
  if (draft.openStables && draft.noble) {
    draft.herbStacks[STABLES_INDEX] = eatMatchingHerbs(
      draft.herbStacks[STABLES_INDEX],
      draft.noble,
      draft.nobleEaten,
    );
  }
}

function uneatenHerbCount(state: Readonly<LeafbearerGameState>) {
  return state.herbStacks.reduce((sum, herbs) => sum + herbs.length, 0);
}

function evaluateOutcome(draft: LeafbearerGameState) {
  const realmHealed = REALM_INDEXES.every(
    (index) => draft.creatures[index]?.healthy === true,
  );
  if (realmHealed) {
    draft.ended = true;
    draft.won = true;
    const score = uneatenHerbCount(draft);
    draft.winLoseMessage =
      score <= 7
        ? `Fair harvest: ${score} herbs remain.`
        : score <= 9
          ? `Good harvest: ${score} herbs remain.`
          : score <= 11
            ? `Excellent harvest: ${score} herbs remain.`
            : `Perfect harvest: ${score} herbs remain.`;
  } else if (uneatenHerbCount(draft) === 0 && draft.carriedHerbs.length === 0) {
    draft.ended = true;
    draft.won = false;
    draft.winLoseMessage = "No herbs remain to heal the realm.";
  }
}

function beginDistribution(draft: LeafbearerGameState, sourceIndex: number) {
  if (
    draft.ended ||
    draft.phase !== "chooseSource" ||
    sourceIndex < 0 ||
    sourceIndex >= LOCATION_COUNT ||
    draft.herbStacks[sourceIndex].length === 0
  ) {
    return false;
  }
  draft.carriedHerbs = draft.herbStacks[sourceIndex];
  draft.herbStacks[sourceIndex] = [];
  draft.nextLocation = (sourceIndex + 1) % LOCATION_COUNT;
  draft.phase = "distribute";
  return true;
}

function dropHerb(draft: LeafbearerGameState, herbId: string) {
  if (
    draft.ended ||
    draft.phase !== "distribute" ||
    draft.nextLocation === null
  ) {
    return false;
  }
  const herbIndex = draft.carriedHerbs.findIndex((herb) => herb.id === herbId);
  if (herbIndex === -1) return false;

  const [herb] = draft.carriedHerbs.splice(herbIndex, 1);
  const destination = draft.nextLocation;
  draft.herbStacks[destination].push(flipToFace(herb));
  draft.nextLocation = (destination + 1) % LOCATION_COUNT;

  if (
    draft.carriedHerbs.length === 0 &&
    draft.openStables &&
    destination === STABLES_INDEX &&
    draft.jester
  ) {
    const eaten = draft.herbStacks[STABLES_INDEX].shift();
    if (eaten) draft.jesterEaten.push(flipToBack(eaten));
  }

  if (draft.carriedHerbs.length === 0) {
    draft.nextLocation = null;
    draft.phase = "chooseSource";
    resolveCreaturePhase(draft);
    evaluateOutcome(draft);
  }
  return true;
}

function willReceiveHerbThisDistribution(
  state: Readonly<LeafbearerGameState>,
  location: number,
) {
  if (state.phase !== "distribute" || state.nextLocation === null) {
    return false;
  }
  const distance =
    (location - state.nextLocation + LOCATION_COUNT) % LOCATION_COUNT;
  return distance < state.carriedHerbs.length;
}

function createLeafbearerDecks() {
  const deck = createDeck({ faceUp: false });
  return {
    creatures: shuffle(
      deck.filter((card) => ["J", "Q", "K"].includes(card.rank)),
    ),
    herbs: shuffle(
      deck.filter((card) => ["A", "2", "3", "4", "5"].includes(card.rank)),
    ),
    jester: createDeck({ includeJokers: true }).find(
      (card) => card.rank === "Joker",
    )!,
  };
}

export const leafbearerRules = {
  herbValue,
  herbTotal,
  currentHealingRank,
  canHeal,
  eatMatchingHerbs,
  resolveCreaturePhase,
  uneatenHerbCount,
  evaluateOutcome,
  beginDistribution,
  dropHerb,
  willReceiveHerbThisDistribution,
  createDecks: createLeafbearerDecks,
};

export default function Leafbearer() {
  const { spacing } = useResponsiveMetrics();
  const { colorDark, colorPale } = useGameColors();
  const openStables = useGameSettingValue("leafbearerOpenStables");
  const openStablesRef = useRef(openStables);
  openStablesRef.current = openStables;

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetAndSetup: async () => {
        setGame((draft) => {
          const allCards = [
            ...draft.stables,
            ...draft.creatures.flatMap((creature) =>
              creature ? [creature.card] : [],
            ),
            ...draft.herbStacks.flat(),
            ...draft.eatenHerbs.flat(),
            ...(draft.noble ? [draft.noble] : []),
            ...draft.nobleEaten,
            ...(draft.jester ? [draft.jester] : []),
            ...draft.jesterEaten,
            ...draft.carriedHerbs,
          ];
          const initialDecks =
            allCards.length === 0 ? createLeafbearerDecks() : null;
          const jester =
            initialDecks?.jester ??
            (allCards.some((card) => card.rank === "Joker")
              ? null
              : createLeafbearerDecks().jester);

          draft.stables = shuffle(
            flipAllToBack(
              initialDecks
                ? [
                    ...initialDecks.creatures,
                    ...initialDecks.herbs,
                    ...(openStablesRef.current ? [initialDecks.jester] : []),
                  ]
                : [
                    ...allCards,
                    ...(openStablesRef.current && jester ? [jester] : []),
                  ],
            ),
          );
          draft.creatures = Array.from({ length: LOCATION_COUNT }, () => null);
          draft.eatenHerbs = Array.from({ length: LOCATION_COUNT }, () => []);
          draft.herbStacks = Array.from({ length: LOCATION_COUNT }, () => []);
          draft.noble = null;
          draft.nobleEaten = [];
          draft.jester = null;
          draft.jesterEaten = [];
          draft.carriedHerbs = [];
          draft.nextLocation = null;
          draft.phase = "chooseSource";
          draft.openStables = openStablesRef.current;
          draft.ended = false;
          draft.won = false;
          draft.winLoseMessage = "";
        });

        await delay();

        setGame((draft) => {
          const creatures = draft.stables.filter((card) =>
            ["J", "Q", "K"].includes(card.rank),
          );
          const herbs = draft.stables.filter((card) =>
            ["A", "2", "3", "4", "5"].includes(card.rank),
          );
          const jester = draft.stables.find((card) => card.rank === "Joker");

          draft.stables = creatures.splice(0, 4).map(flipToBack);
          for (const index of REALM_INDEXES) {
            const card = creatures.pop();
            if (card) {
              draft.creatures[index] = {
                card: flipToFace(card),
                healthy: false,
              };
            }
          }
          draft.herbStacks = Array.from(
            { length: LOCATION_COUNT },
            (_, index) =>
              herbs.splice(0, index === STABLES_INDEX ? 4 : 2).map(flipToFace),
          );
          draft.noble = openStablesRef.current
            ? flipToFace(draft.stables.pop()!)
            : null;
          draft.jester =
            openStablesRef.current && jester ? flipToFace(jester) : null;
        });
      },
    });

  function selectSource(index: number) {
    if (game.phase !== "chooseSource" || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      beginDistribution(draft, index);
    });
  }

  function placeHerb(herbId: string) {
    if (game.phase !== "distribute" || game.ended) return;
    saveUndoState(structuredClone(game));
    setGame((draft) => {
      dropHerb(draft, herbId);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    // ---------- Creatures ---------- //
    const creatureZones: MapZone[] = Array.from(
      { length: LOCATION_COUNT },
      (_, index) => {
        const creature = game.creatures[index];
        return {
          id: `creature-${index}`,
          name: "creature",
          pileIndex: index,
          cards: creature ? [creature.card] : undefined,
          col: CREATURE_COL,
          row: index * ZONE_ROW_MULT,
          rotation: creature && !creature.healthy ? 90 : 0,
          baseZIndex: 80,
        };
      },
    );

    // ---------- Herbs ---------- //
    const herbZones: MapZone[] = game.herbStacks.map((herbs, index) => ({
      id: `herbs-${index}`,
      name: "herbs",
      pileIndex: index,
      cards: herbs,
      col: 1.8,
      row: index * ZONE_ROW_MULT,
      baseZIndex: 20,
      fan: { direction: "right", offset: 0.4 },
      placeholder: {
        showCount: true,
        iconName: "herbs",
        iconOpacity: 0.4,
      },
    }));

    // ---------- Eaten Herbs ---------- //
    const eatenZones: MapZone[] = game.eatenHerbs.map((herbs, index) => ({
      id: `eaten-${index}`,
      name: "eaten",
      cards: herbs,
      col: CREATURE_COL - EATEN_COL_OFFSET,
      row: index * ZONE_ROW_MULT,
      baseZIndex: 1,
      fan: { maxVisible: 1 },
    }));

    const zones: MapZone[] = [
      ...creatureZones,
      ...herbZones,
      ...eatenZones,
      // ---------- Carried Herbs ---------- //
      {
        id: `carried`,
        name: "carried",
        cards: game.carriedHerbs,
        col: 5.6,
        row: 5.1 * ZONE_ROW_MULT,
        width: 1.4,
        height: 3.9 + 3 * (ZONE_ROW_MULT - 1),
        baseZIndex: 50,
        fan: {
          direction: "down",
          offset: zoneFanOffset(
            game.carriedHerbs.length,
            3.9 + 3 * (ZONE_ROW_MULT - 1) - 0.3,
            0.1,
            1.1,
          ),
        },
        placeholder: {
          iconName: "herbs-bowl",
          iconOpacity: 0.4,
          iconSize: 1.2,
        },
      },
      {
        id: "stablesPile",
        name: "stablesPile",
        cards: game.stables,
        col: CREATURE_COL,
        row: STABLES_ROW,
        baseZIndex: 1,
        fan: { maxVisible: 1 },
      },
    ];

    const openStablesZones: MapZone[] = [];

    if (game.noble) {
      openStablesZones.push({
        id: "noble",
        name: "noble",
        cards: [game.noble],
        col: CREATURE_COL,
        row: STABLES_ROW,
        baseZIndex: 10,
        placeholder: {
          text: "Noble",
          infoPos: "right",
          showCount: false,
        },
      });

      openStablesZones.push({
        id: "jester",
        name: "jester",
        cards: game.jester ? [game.jester] : [],
        col: fixedCols - 1 - EATEN_COL_OFFSET,
        row: STABLES_ROW,
        baseZIndex: 35,
        placeholder: {
          text: "Jester",
          infoPos: "left",
          showCount: false,
        },
      });

      openStablesZones.push({
        id: "nobleEaten",
        name: "nobleEaten",
        cards: game.nobleEaten,
        col: CREATURE_COL - EATEN_COL_OFFSET,
        row: STABLES_ROW,
        baseZIndex: 1,
        fan: { maxVisible: 1 },
      });

      openStablesZones.push({
        id: "jesterEaten",
        name: "jesterEaten",
        cards: game.jesterEaten,
        col: fixedCols - 1,
        row: STABLES_ROW,
        baseZIndex: 25,
        fan: { direction: "up", offset: 0.16, maxVisible: 3 },
      });
    }

    return [...zones, ...(game.noble ? openStablesZones : [])];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "herbs" && mappedCard.pileIndex !== undefined) {
      const canPickUp = game.phase === "chooseSource" && !game.ended;
      const isDistributeTarget = game.nextLocation === mappedCard.pileIndex;
      const willReceiveHerb = willReceiveHerbThisDistribution(
        game,
        mappedCard.pileIndex,
      );

      return {
        isDisabled: !canPickUp,
        selectColor: isDistributeTarget
          ? "purple"
          : willReceiveHerb
            ? "none"
            : "lightGrey",
        forceOverlayColor: game.phase === "distribute",
        onPress: () => selectSource(mappedCard.pileIndex!),
      };
    } else if (mappedCard.zoneName === "creature") {
      const isDistributeTarget = game.nextLocation === mappedCard.pileIndex;
      const willReceiveHerb = willReceiveHerbThisDistribution(
        game,
        mappedCard.pileIndex!,
      );
      return {
        selectColor: isDistributeTarget
          ? "purple"
          : willReceiveHerb
            ? "none"
            : "lightGrey",
        forceOverlayColor: game.phase === "distribute",
      };
    } else if (mappedCard.zoneName === "noble") {
      const isDistributeTarget = game.nextLocation === STABLES_INDEX;
      const willReceiveHerb = willReceiveHerbThisDistribution(
        game,
        STABLES_INDEX,
      );
      return {
        selectColor: isDistributeTarget
          ? "purple"
          : willReceiveHerb
            ? "none"
            : "lightGrey",
        forceOverlayColor: game.phase === "distribute",
      };
    } else if (mappedCard.zoneName === "carried") {
      return {
        onPress: () => placeHerb(mappedCard.card.id),
      };
    }
    return { isDisabled: true };
  };

  const { cardMap, cardWidth, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper: (zone) => {
      if (zone.name === "herbs") {
        const distributeTarget = game.nextLocation === zone.pileIndex;

        return {
          selectColor: distributeTarget ? Colors.cardSelectPurple : colorPale,
          forceOverlayColor: true,
          forceSelectColor: distributeTarget,
        };
      } else if (zone.name === "carried") {
        const isDistributing = game.phase === "distribute";

        return {
          selectColor: isDistributing ? Colors.cardSelectPurple : colorPale,
          forceOverlayColor: true,
          forceSelectColor: isDistributing,
        };
      }
    },
    cardSize: "small",
    gap: 0,
    fixedCols,
    fixedRows,
  });

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={uneatenHerbCount(game)}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
      winLoseMessage={game.winLoseMessage}
    >
      {cardMap}

      {game.herbStacks.map((herbs, index) => {
        const showStack = game.creatures[index]?.healthy === false;
        const creatureCard = game.creatures[index]?.card;

        if (!showStack || !creatureCard) return null;

        const creatureRank = rankValue(creatureCard);
        const total = herbTotal(herbs);
        const progress = total / creatureRank;
        const isDistributeTarget = game.nextLocation === index;
        const progressColor = isDistributeTarget
          ? rgba(Colors.cardSelectPurple, 0.6)
          : progress > 1
            ? rgba(Colors.cardSelectRed, 0.5)
            : rgba(colorPale, 0.3);

        return (
          <View
            key={`herbs-total-${index}`}
            style={[
              flexStyles.colCentered,
              getZoneStylesById(`creature-${index}`),
              {
                overflow: "hidden",
                marginTop: cardHeight * 0.49,
                marginLeft: cardWidth * -0.15,
                width: cardWidth * 1.3,
                height: cardWidth * 0.46,
                backgroundColor: colorDark,
                borderWidth: 1,
                borderRadius: spacing(6),
                borderColor: progressColor,
                zIndex: 100,
              },
            ]}
          >
            <Text
              size="sm"
              weight={500}
              color={Colors.white}
              style={{ zIndex: 2 }}
            >
              {total}
            </Text>

            <View
              style={[
                transitionStyles.all05sec,
                {
                  position: "absolute",
                  zIndex: 1,
                  bottom: 0,
                  left: 0,
                  top: 0,
                  height: "100%",
                  backgroundColor: progressColor,
                  width: `${progress * 100}%`,
                },
              ]}
            />
          </View>
        );
      })}
    </GameWrapper>
  );
}
