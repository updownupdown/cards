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

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import { cardTarget, makeHint, withNote, zoneTarget } from "@/hints/hint";
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

export type HerbalistGameState = {
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

const gameStateInitial: HerbalistGameState = {
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

function currentHealingRank(state: Readonly<HerbalistGameState>) {
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

function resolveCreaturePhase(draft: HerbalistGameState) {
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

function uneatenHerbCount(state: Readonly<HerbalistGameState>) {
  return state.herbStacks.reduce((sum, herbs) => sum + herbs.length, 0);
}

function evaluateOutcome(draft: HerbalistGameState) {
  const realmHealed = REALM_INDEXES.every(
    (index) => draft.creatures[index]?.healthy === true,
  );
  if (realmHealed) {
    draft.ended = true;
    draft.won = true;
    const score = uneatenHerbCount(draft);
    draft.winLoseMessage =
      score <= 7
        ? i18n.t("games:herbalist.harvestFair", { count: score })
        : score <= 9
          ? i18n.t("games:herbalist.harvestGood", { count: score })
          : score <= 11
            ? i18n.t("games:herbalist.harvestExcellent", { count: score })
            : i18n.t("games:herbalist.harvestPerfect", { count: score });
  } else if (uneatenHerbCount(draft) === 0 && draft.carriedHerbs.length === 0) {
    draft.ended = true;
    draft.won = false;
    draft.winLoseMessage = i18n.t("games:herbalist.noHerbsRemain");
  }
}

function beginDistribution(draft: HerbalistGameState, sourceIndex: number) {
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

function dropHerb(draft: HerbalistGameState, herbId: string) {
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
  state: Readonly<HerbalistGameState>,
  location: number,
) {
  if (state.phase !== "distribute" || state.nextLocation === null) {
    return false;
  }
  const distance =
    (location - state.nextLocation + LOCATION_COUNT) % LOCATION_COUNT;
  return distance < state.carriedHerbs.length;
}

function createHerbalistDecks() {
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

// —— Hints ——

// A creature healed is the aim; a herb eaten is gone for good.
const HEAL_WORTH = 60;
const HERB_WORTH = 2;
const RANK_ORDER = ["J", "Q", "K"] as const;

/**
 * How close a sick creature's herbs are to healing it: their total against
 * its rank, and one of its suit among them. Creatures that heal first (the
 * Jacks, then the Queens) count most.
 */
function sickWorth(
  creature: Creature,
  herbs: PlayingCard[],
  healingRank: string | null,
) {
  const need = rankValue(creature.card);
  const total = herbTotal(herbs);
  const suited = herbs.some((herb) => herb.suit === creature.card.suit);
  const order =
    RANK_ORDER.indexOf(creature.card.rank as (typeof RANK_ORDER)[number]) -
    RANK_ORDER.indexOf((healingRank ?? "J") as (typeof RANK_ORDER)[number]);
  const weight = order <= 0 ? 1 : order === 1 ? 0.5 : 0.25;
  // Short of its rank, a point per point missing; over it, twice that and
  // more: the stack must be picked up again to fix it.
  let worth = total <= need ? total - need : 2 * (need - total) - 3;
  if (suited) worth += 3;
  if (suited && total === need) worth += 5;
  return worth * weight;
}

/**
 * How many of these herbs are eaten at a location once the creatures have
 * healed (a creature healed now eats too), with the jester's share.
 */
function herbsEaten(
  state: Readonly<HerbalistGameState>,
  index: number,
  herbs: PlayingCard[],
  healingRank: string | null,
  jesterEats: boolean,
) {
  const eats = (suit: string | undefined) =>
    herbs.filter((herb) => herb.suit === suit).length;
  if (index === STABLES_INDEX) {
    if (!state.openStables) return 0;
    return eats(state.noble?.suit) + (jesterEats && herbs.length ? 1 : 0);
  }
  const creature = state.creatures[index];
  if (!creature) return 0;
  const heals = creature.card.rank === healingRank && canHeal(creature, herbs);
  return creature.healthy || heals ? eats(creature.card.suit) : 0;
}

/**
 * What a location is worth once these herbs lie there and the creatures
 * have healed and eaten: a creature healed, a sick one's progress, less the
 * herbs eaten.
 */
function locationWorth(
  state: Readonly<HerbalistGameState>,
  index: number,
  herbs: PlayingCard[],
  healingRank: string | null,
  jesterEats: boolean,
) {
  const lost =
    herbsEaten(state, index, herbs, healingRank, jesterEats) * HERB_WORTH;
  const creature = state.creatures[index];
  if (!creature || creature.healthy) return -lost;
  if (creature.card.rank === healingRank && canHeal(creature, herbs)) {
    return HEAL_WORTH - lost;
  }
  return sickWorth(creature, herbs, healingRank);
}

/** How good a position is between turns. */
function positionWorth(state: Readonly<HerbalistGameState>) {
  if (state.ended) return state.won ? 10000 : -10000;
  const healingRank = currentHealingRank(state);
  let worth = uneatenHerbCount(state) * HERB_WORTH;
  state.creatures.forEach((creature, index) => {
    if (!creature) return;
    worth += creature.healthy
      ? HEAL_WORTH
      : sickWorth(creature, state.herbStacks[index], healingRank);
  });
  return worth;
}

/**
 * The order to sow the carried herbs in, best first: each lands one place
 * further on, so the order says which herb goes where. With no more herbs
 * than places it's an assignment, solved exactly over the subsets of herbs
 * placed; a bigger handful wraps round, and is sown greedily.
 */
function sowingOrder(state: Readonly<HerbalistGameState>): PlayingCard[] {
  const carried = state.carriedHerbs;
  const start = state.nextLocation;
  if (start === null || carried.length === 0) return [];
  const healingRank = currentHealingRank(state);
  const count = carried.length;
  // With no cure left, herbs are sown to be eaten: that ends the game.
  const judge = isHopeless(state) ? herbsEaten : locationWorth;
  const place = (step: number) => (start + step) % LOCATION_COUNT;
  const worthAt = (step: number, herbs: PlayingCard[]) =>
    judge(
      state,
      place(step),
      [...state.herbStacks[place(step)], ...herbs],
      healingRank,
      // The jester takes a herb when the last lands in the stables.
      step === count - 1,
    );

  if (count > LOCATION_COUNT) {
    const order: PlayingCard[] = [];
    const left = [...carried];
    const added = new Map<number, PlayingCard[]>();
    for (let step = 0; step < count; step += 1) {
      const here = added.get(place(step)) ?? [];
      let best = 0;
      for (let index = 1; index < left.length; index += 1) {
        if (
          worthAt(step, [...here, left[index]]) >
          worthAt(step, [...here, left[best]])
        ) {
          best = index;
        }
      }
      const [herb] = left.splice(best, 1);
      order.push(herb);
      added.set(place(step), [...here, herb]);
    }
    return order;
  }

  // worth[step][herb]: that herb sown at that step.
  const worth = Array.from({ length: count }, (_, step) =>
    carried.map((herb) => worthAt(step, [herb])),
  );
  const memo = new Map<number, number>();
  const bestFrom = (mask: number, step: number): number => {
    if (step === count) return 0;
    let value = memo.get(mask);
    if (value !== undefined) return value;
    value = -Infinity;
    for (let herb = 0; herb < count; herb += 1) {
      if (mask & (1 << herb)) continue;
      value = Math.max(
        value,
        worth[step][herb] + bestFrom(mask | (1 << herb), step + 1),
      );
    }
    memo.set(mask, value);
    return value;
  };
  const order: PlayingCard[] = [];
  let mask = 0;
  for (let step = 0; step < count; step += 1) {
    let choice = -1;
    let choiceValue = -Infinity;
    for (let herb = 0; herb < count; herb += 1) {
      if (mask & (1 << herb)) continue;
      const value = worth[step][herb] + bestFrom(mask | (1 << herb), step + 1);
      if (value > choiceValue + 1e-9) {
        choice = herb;
        choiceValue = value;
      }
    }
    order.push(carried[choice]);
    mask |= 1 << choice;
  }
  return order;
}

/** The position after picking up a stack and sowing it in the best order. */
function playTurn(state: Readonly<HerbalistGameState>, source: number) {
  const next = structuredClone(state) as HerbalistGameState;
  if (!beginDistribution(next, source)) return null;
  for (const herb of sowingOrder(next)) dropHerb(next, herb.id);
  return next;
}

function sources(state: Readonly<HerbalistGameState>) {
  return state.herbStacks.flatMap((herbs, index) =>
    herbs.length ? [index] : [],
  );
}

// Turns played out per hint, at most: few stacks left means few choices,
// so the search reaches further then.
const SEARCH_BUDGET = 800;

type Search = { budget: number; seen: Map<string, number> };

/** The best position reachable within `turns` turns (this one included). */
function lookAhead(
  state: Readonly<HerbalistGameState>,
  turns: number,
  search: Search,
): number {
  let best = positionWorth(state);
  if (turns === 0 || state.ended) return best;
  const key = `${turns}:${state.herbStacks.map((herbs) => herbs.map((herb) => herb.id).join()).join("|")}`;
  const known = search.seen.get(key);
  if (known !== undefined) return known;
  for (const source of sources(state)) {
    if (search.budget <= 0) break;
    search.budget -= 1;
    const after = playTurn(state, source);
    // Sooner is better: a turn later is worth a little less.
    if (after) best = Math.max(best, lookAhead(after, turns - 1, search) - 1);
  }
  search.seen.set(key, best);
  return best;
}

/**
 * Whether some sick creature can no longer be healed: all the herbs left
 * don't add up to its rank.
 */
function isHopeless(state: Readonly<HerbalistGameState>) {
  const left = herbTotal([...state.herbStacks.flat(), ...state.carriedHerbs]);
  return state.creatures.some(
    (creature) =>
      creature && !creature.healthy && rankValue(creature.card) > left,
  );
}

/**
 * The stack to sow: each is tried with its best sowing, and judged by the
 * best that can follow it in a turn more (a heal often takes two turns to
 * set up), or further when that shows no way forward. Once the realm can't
 * be healed, the herbs are sown to be eaten, to end the game.
 */
function bestSource(state: Readonly<HerbalistGameState>) {
  return bestSourcePlan(state).source;
}

/** bestSource, with what its look-ahead found against the position now. */
function bestSourcePlan(state: Readonly<HerbalistGameState>) {
  const hopeless = isHopeless(state);
  const search: Search = { budget: SEARCH_BUDGET, seen: new Map() };
  const pick = (turns: number) => {
    let best: { source: number; value: number } | null = null;
    for (const source of sources(state)) {
      const after = playTurn(state, source);
      if (!after) continue;
      const value = hopeless
        ? -uneatenHerbCount(after) - after.carriedHerbs.length
        : lookAhead(after, turns, search);
      if (!best || value > best.value) best = { source, value };
    }
    return best;
  };
  const here = positionWorth(state);
  let best = pick(1);
  // Nothing better in sight: look further, while the budget lasts.
  for (
    let turns = 2;
    !hopeless && best && best.value <= here && search.budget > 0 && turns <= 8;
    turns += 1
  ) {
    const further = pick(turns);
    if (search.budget <= 0) break;
    best = further ?? best;
  }
  return {
    source: best?.source ?? null,
    hopeless,
    // The look-ahead found a better position than this one.
    improves: !!best && best.value > here,
  };
}

/**
 * Pick up the stack whose sowing does most for the creatures, then sow its
 * herbs where they heal, build toward healing, or at least aren't eaten.
 */
function findHerbalistHint(state: Readonly<HerbalistGameState>) {
  if (state.ended) return null;
  if (state.phase === "distribute") {
    const [herb] = sowingOrder(state);
    if (!herb || state.nextLocation === null) return null;
    return makeHint(
      "moveCard",
      cardTarget(herb),
      zoneTarget(`herbs-${state.nextLocation}`),
    );
  }
  const { source, hopeless, improves } = bestSourcePlan(state);
  if (source === null) return null;
  const healed = (position: Readonly<HerbalistGameState> | null) =>
    position?.creatures.filter((creature) => creature?.healthy).length ?? 0;
  const heals = healed(playTurn(state, source)) > healed(state);
  const hint = makeHint(
    "tapCard",
    cardTarget(state.herbStacks[source].at(-1)!),
  );
  if (hopeless) return withNote(hint, i18n.t("games:herbalist.hint.noCure"));
  if (heals) return withNote(hint, i18n.t("games:herbalist.hint.heal"));
  return improves ? withNote(hint, i18n.t("games:herbalist.hint.setUp")) : hint;
}

export const herbalistRules = {
  findHint: findHerbalistHint,
  sowingOrder,
  bestSource,
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
  createDecks: createHerbalistDecks,
};

export default function Herbalist() {
  const { spacing } = useResponsiveMetrics();
  const { colorDark, colorPale } = useGameColors();
  const openStables = useGameSettingValue("herbalistOpenStables");
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
            allCards.length === 0 ? createHerbalistDecks() : null;
          const jester =
            initialDecks?.jester ??
            (allCards.some((card) => card.rank === "Joker")
              ? null
              : createHerbalistDecks().jester);

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

  useHint(() => findHerbalistHint(game), { game });

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
          text: i18n.t("games:herbalist.noble"),
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
          text: i18n.t("games:herbalist.jester"),
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
