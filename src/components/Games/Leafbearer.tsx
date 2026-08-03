import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { Colors, rgba } from "@/styles/styles";
import { useMemo, useRef } from "react";
import { View } from "react-native";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  createDeck,
  flipToBack,
  flipToFace,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";

const LOCATION_COUNT = 9;
const STABLES_INDEX = 4;
const REALM_INDEXES = [0, 1, 2, 3, 5, 6, 7, 8];

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
  draft.herbStacks[destination].unshift(flipToFace(herb));
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
  createDecks: createLeafbearerDecks,
};

export default function Leafbearer() {
  const { spacing } = useResponsiveMetrics();
  const openStables = useGameSettingValue("leafbearerOpenStables");
  const openStablesRef = useRef(openStables);
  openStablesRef.current = openStables;

  const { isLoaded, game, setGame, undo, canUndo, saveUndoState, reset } =
    useStateManager({
      gameStateInitial,
      resetAndSetup: async () => {
        setGame((draft) => {
          const decks = createLeafbearerDecks();
          draft.stables = decks.creatures.splice(0, 4).map(flipToBack);
          draft.creatures = Array.from({ length: LOCATION_COUNT }, () => null);
          for (const index of REALM_INDEXES) {
            const card = decks.creatures.pop();
            if (card)
              draft.creatures[index] = {
                card: flipToFace(card),
                healthy: false,
              };
          }
          draft.herbStacks = Array.from(
            { length: LOCATION_COUNT },
            (_, index) =>
              decks.herbs
                .splice(0, index === STABLES_INDEX ? 4 : 2)
                .map(flipToFace),
          );
          draft.eatenHerbs = Array.from({ length: LOCATION_COUNT }, () => []);
          draft.noble = openStablesRef.current
            ? flipToFace(draft.stables.pop()!)
            : null;
          draft.nobleEaten = [];
          draft.jester = openStablesRef.current
            ? flipToFace(decks.jester)
            : null;
          draft.jesterEaten = [];
          draft.carriedHerbs = [];
          draft.nextLocation = null;
          draft.phase = "chooseSource";
          draft.openStables = openStablesRef.current;
          draft.ended = false;
          draft.won = false;
          draft.winLoseMessage = "";
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
    setGame((draft) => {
      dropHerb(draft, herbId);
    });
  }

  const zones: MapZone[] = useMemo(() => {
    const creatureZones: MapZone[] = Array.from(
      { length: LOCATION_COUNT },
      (_, index) => {
        const creature = game.creatures[index];
        return {
          id: `creature-${index}`,
          name: "creature",
          pileIndex: index,
          cards: creature ? [creature.card] : undefined,
          col: index,
          row: 0.75,
          rotation: creature && !creature.healthy ? 90 : 0,
          baseZIndex: 20,
          placeholder:
            index === STABLES_INDEX
              ? { text: "Stables", infoPos: "above" }
              : {},
        };
      },
    );
    const herbZones: MapZone[] = game.herbStacks.map((herbs, index) => ({
      id: `herbs-${index}`,
      name: "herbs",
      pileIndex: index,
      cards: herbs,
      col: index,
      row: 2.05,
      baseZIndex: 10,
      fan: { direction: "down", offset: 0.26, maxVisible: 5 },
      placeholder: { showCount: true },
    }));
    const eatenZones: MapZone[] = game.eatenHerbs.flatMap((herbs, index) =>
      herbs.length > 0
        ? [
            {
              id: `eaten-${index}`,
              name: "eaten",
              cards: herbs,
              col: index,
              row: 1.05,
              baseZIndex: 5,
              fan: { direction: "down", offset: 0.16, maxVisible: 3 },
            },
          ]
        : [],
    );
    return [
      ...creatureZones,
      {
        id: "stablesPile",
        name: "stablesPile",
        cards: game.stables,
        col: STABLES_INDEX,
        row: 0.75,
        baseZIndex: 15,
        fan: { maxVisible: 3 },
      },
      ...(game.noble
        ? [
            {
              id: "noble",
              name: "noble",
              cards: [game.noble],
              col: STABLES_INDEX,
              row: 0.75,
              baseZIndex: 30,
            },
          ]
        : []),
      ...(game.jester
        ? [
            {
              id: "jester",
              name: "jester",
              cards: [game.jester],
              col: STABLES_INDEX,
              row: 0,
              baseZIndex: 35,
            },
          ]
        : []),
      ...(game.nobleEaten.length > 0
        ? [
            {
              id: "nobleEaten",
              name: "nobleEaten",
              cards: game.nobleEaten,
              col: STABLES_INDEX,
              row: 1.05,
              baseZIndex: 25,
              fan: { direction: "down" as const, offset: 0.16, maxVisible: 3 },
            },
          ]
        : []),
      ...(game.jesterEaten.length > 0
        ? [
            {
              id: "jesterEaten",
              name: "jesterEaten",
              cards: game.jesterEaten,
              col: STABLES_INDEX,
              row: 0.3,
              baseZIndex: 25,
              fan: { direction: "down" as const, offset: 0.16, maxVisible: 3 },
            },
          ]
        : []),
      ...herbZones,
      ...eatenZones,
      {
        id: "carried",
        name: "carried",
        cards: game.carriedHerbs,
        col: 1,
        row: 4.15,
        width: 7,
        baseZIndex: 40,
        fan: { direction: "right", offset: 0.7, center: true },
        placeholder: { text: "Herbs in hand", infoPos: "above" },
      },
      {
        id: "status",
        col: 0,
        row: 5.35,
        width: "full",
        height: 0.8,
        baseZIndex: 40,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "herbs" && mappedCard.pileIndex !== undefined) {
      const canPickUp = game.phase === "chooseSource" && !game.ended;
      return {
        isDisabled: !canPickUp,
        selectColor: canPickUp ? "blue" : "none",
        forceSelectColor: canPickUp,
        onPress: () => selectSource(mappedCard.pileIndex!),
      };
    }
    if (mappedCard.zoneName === "carried") {
      return {
        isDisabled: game.phase !== "distribute" || game.ended,
        selectColor: "green",
        forceSelectColor: true,
        onPress: () => placeHerb(mappedCard.card.id),
      };
    }
    return { isDisabled: true };
  };

  const { cardMap, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    cardSize: "small",
    fixedCols: 9,
    fixedRows: 6.5,
    paddingTop: 0.2,
    paddingBottom: 0.2,
  });

  const nextLocationLabel =
    game.nextLocation === null ? null : game.nextLocation + 1;
  const healingRank = currentHealingRank(game);

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
      <View style={[getZoneStylesById("status"), { gap: spacing(4) }]}>
        <Text size="sm" weight="bold" color="#e5f0c7">
          {game.phase === "chooseSource"
            ? "Choose a herb stack to sow."
            : `Drop any herb into Location ${nextLocationLabel}.`}
        </Text>
        <Text size="xs" color={rgba(Colors.white, 0.82)}>
          {healingRank
            ? `Healing order: ${healingRank}s`
            : "All creatures healed."}{" "}
          Uneaten herbs: {uneatenHerbCount(game)}
        </Text>
      </View>
    </GameWrapper>
  );
}
