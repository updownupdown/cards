import { useGameColors } from "@/hooks/useGameColors";
import { useGameSettingValue } from "@/hooks/useGameSettingValue";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useStateManager } from "@/hooks/useStateManager";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba } from "@/styles/styles";
import { delay } from "@/utils/utils";
import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { Button } from "../Button/Button";
import { AnimatedCardMapping } from "../Cards/AnimatedCard";
import {
  cardLabel,
  createDeck,
  flipAllToBack,
  flipToBack,
  flipToFace,
  isAce,
  isFace,
  isJoker,
  rankValue,
  shuffle,
  type PlayingCard,
} from "../Cards/card-utils";
import { MappedCard, MapZone, useCardMap } from "../Cards/CardMap";
import { GameWrapper } from "../common/GameWrapper";
import { Text } from "../common/Text";
import { ProgressBar } from "../Home/ProgressBar";

import { i18n } from "@/i18n";
import { useHint } from "@/hints/hint-store";
import {
  makeHint,
  pressHint,
  withNote,
  zoneTarget,
  type Hint,
} from "@/hints/hint";
import { seededRandom, shuffledWith } from "@/hints/random";
export type NightVigilDifficulty = "street" | "kingpin" | "city";
export type NightVigilPlayMode = "standard" | "smoke" | "grapple";

export type NightVigilThreat = {
  card: PlayingCard;
  responses: PlayingCard[];
  smoked: boolean;
};

export type NightVigilGameState = {
  encounterDeck: PlayingCard[];
  playDeck: PlayingCard[];
  discard: PlayingCard[];
  trackers: PlayingCard[];
  currentEncounter: PlayingCard | null;
  threats: NightVigilThreat[];
  currentResponse: PlayingCard | null;
  responsesDrawn: number;
  smokeUsed: boolean;
  grapplePair: [number, number] | null;
  grappleResponses: PlayingCard[];
  grappleAnchor: number | null;
  armor: number;
  health: number;
  encounterNumber: number;
  difficulty: NightVigilDifficulty;
  ended: boolean;
  won: boolean;
  score?: number;
};

const MAX_TRACK = 10;

function createNightVigilDeck() {
  return createDeck({ includeJokers: true, faceUp: false });
}

function highestNumberThreat(threats: NightVigilThreat[]) {
  const values = threats
    .filter(({ card }) => !isAce(card) && !isJoker(card))
    .map(({ card }) => rankValue(card));
  return Math.max(1, ...values);
}

function lowestNumberThreat(threats: NightVigilThreat[]) {
  const values = threats
    .filter(({ card }) => !isAce(card) && !isJoker(card))
    .map(({ card }) => rankValue(card));
  return Math.min(10, ...values);
}

function threatValue(threat: NightVigilThreat, threats: NightVigilThreat[]) {
  if (isAce(threat.card) || isJoker(threat.card)) {
    return highestNumberThreat(threats);
  }
  return rankValue(threat.card);
}

function responseValue(card: PlayingCard, threats: NightVigilThreat[]) {
  return isAce(card) ? lowestNumberThreat(threats) : rankValue(card);
}

function standardThreatCleared(
  threat: NightVigilThreat,
  threats: NightVigilThreat[],
) {
  if (threat.smoked) return true;
  if (threat.responses.length === 0) return false;
  const target = threatValue(threat, threats);
  const responseTotal = threat.responses.reduce(
    (sum, card) => sum + responseValue(card, threats),
    0,
  );
  return responseTotal >= target && responseTotal <= target + 3;
}

function grappleCleared(game: NightVigilGameState) {
  if (!game.grapplePair || game.grappleResponses.length === 0) return false;
  const target = game.grapplePair.reduce(
    (sum, index) => sum + threatValue(game.threats[index], game.threats),
    0,
  );
  const responseTotal = game.grappleResponses.reduce(
    (sum, card) => sum + responseValue(card, game.threats),
    0,
  );
  return responseTotal >= target && responseTotal <= target + 3;
}

function difficultyDamage(
  difficulty: NightVigilDifficulty,
  encounter: PlayingCard,
) {
  if (difficulty === "street") return encounter.rank === "K" ? 1 : 0;
  if (difficulty === "kingpin") {
    return encounter.rank === "Q" || encounter.rank === "K" ? 1 : 0;
  }
  if (encounter.rank === "Q") return 1;
  return encounter.rank === "K" ? 2 : 0;
}

function calculateRound(game: NightVigilGameState) {
  const grappleIndexes = new Set(game.grapplePair ?? []);
  const grappleSuccess = grappleCleared(game);
  let damage = 0;

  game.threats.forEach((threat, index) => {
    if (grappleIndexes.has(index)) return;
    if (!standardThreatCleared(threat, game.threats)) damage += 1;
  });

  if (game.grapplePair && !grappleSuccess) damage += 2;
  if (damage > 0 && game.currentEncounter) {
    damage += difficultyDamage(game.difficulty, game.currentEncounter);
  }

  const healing =
    !game.smokeUsed || game.responsesDrawn < game.threats.length ? 1 : 0;
  return { damage, healing, netDamage: damage - healing, grappleSuccess };
}

function applyTrackChange(game: NightVigilGameState, netDamage: number) {
  if (netDamage > 0) {
    const armorDamage = Math.min(game.armor, netDamage);
    game.armor -= armorDamage;
    game.health = Math.max(0, game.health - (netDamage - armorDamage));
    return;
  }

  if (netDamage < 0) {
    let healing = -netDamage;
    const healthHeal = Math.min(MAX_TRACK - game.health, healing);
    game.health += healthHeal;
    healing -= healthHeal;
    game.armor = Math.min(MAX_TRACK, game.armor + healing);
  }
}

function drawPlayCard(game: NightVigilGameState) {
  if (game.playDeck.length === 0 && game.discard.length > 0) {
    game.playDeck = shuffle(flipAllToBack(game.discard));
    game.discard = [];
  }
  return game.playDeck.pop();
}

function dealThreats(game: NightVigilGameState, finalEncounter: boolean) {
  const threats: NightVigilThreat[] = [];
  let targetCount = finalEncounter ? 6 : 4;

  while (threats.length < targetCount && threats.length < 6) {
    const card = drawPlayCard(game);
    if (!card) break;
    const faceCard = flipToFace(card);
    threats.push({ card: faceCard, responses: [], smoked: false });
    if (!finalEncounter && isJoker(faceCard)) {
      targetCount = Math.min(6, targetCount + 1);
    }
  }

  game.threats = threats;
}

function buildEncounterDeck(cards: PlayingCard[]) {
  const courts = cards.filter(isFace);
  const jesterKing = courts.find(
    (card) => card.rank === "K" && card.suit === "diamonds",
  );
  if (!jesterKing) return [];

  const jacks = shuffle(courts.filter((card) => card.rank === "J"));
  const queens = shuffle(courts.filter((card) => card.rank === "Q"));
  const kings = shuffle(
    courts.filter((card) => card.rank === "K" && card.id !== jesterKing.id),
  );
  return [
    flipToBack(jesterKing),
    ...flipAllToBack(kings),
    ...flipAllToBack(queens),
    ...flipAllToBack(jacks),
  ];
}

function setupFromDiscard(game: NightVigilGameState) {
  const cards = shuffle(flipAllToBack(game.discard));
  game.encounterDeck = buildEncounterDeck(cards);
  game.playDeck = shuffle(
    cards.filter(
      (card) =>
        !isFace(card) &&
        !(card.rank === "10" && ["hearts", "spades"].includes(card.suit)),
    ),
  );
  game.trackers = cards.filter(
    (card) => card.rank === "10" && ["hearts", "spades"].includes(card.suit),
  );
  game.discard = [];
  game.currentEncounter = flipToFace(game.encounterDeck.pop()!);
  game.encounterNumber = 1;
  game.armor = MAX_TRACK;
  game.health = MAX_TRACK;
  game.currentResponse = null;
  game.responsesDrawn = 0;
  game.smokeUsed = false;
  game.grapplePair = null;
  game.grappleResponses = [];
  game.grappleAnchor = null;
  game.ended = false;
  game.won = false;
  game.score = undefined;
  dealThreats(game, false);
}

const gameStateInitial: NightVigilGameState = {
  encounterDeck: [],
  playDeck: [],
  discard: createNightVigilDeck(),
  trackers: [],
  currentEncounter: null,
  threats: [],
  currentResponse: null,
  responsesDrawn: 0,
  smokeUsed: false,
  grapplePair: null,
  grappleResponses: [],
  grappleAnchor: null,
  armor: MAX_TRACK,
  health: MAX_TRACK,
  encounterNumber: 0,
  difficulty: "kingpin",
  ended: false,
  won: false,
};

async function resetAndSetup(
  setGame: (updater: (draft: NightVigilGameState) => void) => void,
  difficulty: NightVigilDifficulty,
) {
  setGame((draft) => {
    const allCards = [
      ...draft.encounterDeck,
      ...draft.playDeck,
      ...draft.discard,
      ...draft.trackers,
      ...(draft.currentEncounter ? [draft.currentEncounter] : []),
      ...(draft.currentResponse ? [draft.currentResponse] : []),
      ...draft.threats.flatMap((threat) => [threat.card, ...threat.responses]),
      ...draft.grappleResponses,
    ];
    draft.discard = shuffle(flipAllToBack(allCards));
    draft.encounterDeck = [];
    draft.playDeck = [];
    draft.trackers = [];
    draft.currentEncounter = null;
    draft.currentResponse = null;
    draft.threats = [];
    draft.grappleResponses = [];
    draft.grapplePair = null;
    draft.grappleAnchor = null;
    draft.encounterNumber = 0;
    draft.difficulty = difficulty;
    draft.ended = false;
    draft.won = false;
  });

  await delay();
  setGame((draft) => setupFromDiscard(draft));
}

function addResponseJoker(game: NightVigilGameState, joker: PlayingCard) {
  if (game.threats.length < 6) {
    game.threats.push({ card: joker, responses: [], smoked: false });
    return;
  }

  const grappleIndexes = new Set(game.grapplePair ?? []);
  const candidates = game.threats
    .map((threat, index) => ({ threat, index }))
    .filter(
      ({ threat, index }) =>
        !grappleIndexes.has(index) &&
        !standardThreatCleared(threat, game.threats),
    )
    .sort(
      (a, b) =>
        threatValue(a.threat, game.threats) -
        threatValue(b.threat, game.threats),
    );
  const replaced = candidates[0];
  if (!replaced) {
    game.discard.push(flipToBack(joker));
    return;
  }
  game.discard.push(
    flipToBack(replaced.threat.card),
    ...flipAllToBack(replaced.threat.responses),
  );
  game.threats[replaced.index] = {
    card: joker,
    responses: [],
    smoked: false,
  };
}

function scoreFor(game: NightVigilGameState) {
  const difficultyBonus =
    game.difficulty === "city" ? 10 : game.difficulty === "kingpin" ? 5 : 0;
  return game.armor + game.health + difficultyBonus;
}

// —— Hints ——

type VigilMove =
  | { type: "standard"; index: number }
  | { type: "smoke"; index: number }
  | { type: "grapple"; index: number }
  | { type: "grappleAdd" };

/** The round as numbers, for trying out what responses may come. */
type VigilSim = {
  targets: number[];
  totals: number[];
  counts: number[];
  smoked: boolean[];
  smokeable: boolean[];
  /** The first of the grappled pair. */
  pair: number | null;
  pairTotal: number;
  pairCount: number;
  smokeUsed: boolean;
  drawn: number;
};

type VigilContext = {
  /** What an Ace response is worth (the lowest Threat). */
  lowest: number;
  /** What a Joker Threat is worth (the highest Threat). */
  highest: number;
  extraDamage: number;
  /** Health and Armor that healing can still restore. */
  healRoom: number;
  life: number;
  /** Chance one response clears a Threat short by d (index d). */
  oneCard: number[];
  /** Chance two responses do. */
  twoCards: number[];
};

// Deals of the unseen responses tried for each choice.
const VIGIL_SAMPLES = 32;

function vigilSim(game: NightVigilGameState): VigilSim {
  const pair = game.grapplePair?.[0] ?? null;
  return {
    targets: game.threats.map((threat) => threatValue(threat, game.threats)),
    totals: game.threats.map((threat) =>
      threat.responses.reduce(
        (sum, card) => sum + responseValue(card, game.threats),
        0,
      ),
    ),
    counts: game.threats.map((threat) => threat.responses.length),
    smoked: game.threats.map((threat) => threat.smoked),
    smokeable: game.threats.map(
      (threat) =>
        !isJoker(threat.card) &&
        threat.card.suit !== game.currentEncounter?.suit,
    ),
    pair,
    pairTotal: game.grappleResponses.reduce(
      (sum, card) => sum + responseValue(card, game.threats),
      0,
    ),
    pairCount: game.grappleResponses.length,
    smokeUsed: game.smokeUsed,
    drawn: game.responsesDrawn,
  };
}

function inPair(sim: VigilSim, index: number) {
  return sim.pair !== null && (index === sim.pair || index === sim.pair + 1);
}

/** Each Threat (and the grappled pair) as cleared, busted or still open. */
function vigilItems(sim: VigilSim) {
  const items: {
    weight: number;
    state: "cleared" | "busted" | "open";
    short: number;
    smokeable: boolean;
  }[] = [];
  const judge = (total: number, count: number, target: number) =>
    count === 0 || total < target
      ? { state: "open" as const, short: target - total }
      : total <= target + 3
        ? { state: "cleared" as const, short: 0 }
        : { state: "busted" as const, short: 0 };
  sim.targets.forEach((target, index) => {
    if (inPair(sim, index)) return;
    if (sim.smoked[index]) {
      items.push({ weight: 1, state: "cleared", short: 0, smokeable: false });
      return;
    }
    items.push({
      weight: 1,
      ...judge(sim.totals[index], sim.counts[index], target),
      smokeable: sim.smokeable[index],
    });
  });
  if (sim.pair !== null) {
    const target = sim.targets[sim.pair] + sim.targets[sim.pair + 1];
    items.push({
      weight: 2,
      ...judge(sim.pairTotal, sim.pairCount, target),
      smokeable: false,
    });
  }
  return items;
}

/** What resolving now is worth: minus the damage taken (net of healing). */
function vigilResolveValue(sim: VigilSim, context: VigilContext) {
  let damage = vigilItems(sim)
    .filter((item) => item.state !== "cleared")
    .reduce((sum, item) => sum + item.weight, 0);
  if (damage > 0) damage += context.extraDamage;
  const healing = !sim.smokeUsed || sim.drawn < sim.targets.length ? 1 : 0;
  const net = Math.max(damage - healing, -context.healRoom);
  return net >= context.life ? -100 - net : -net;
}

/** A quick guess at the round's worth, with `draws` responses to come. */
function vigilOutlook(sim: VigilSim, context: VigilContext, draws: number) {
  let damage = 0;
  for (const item of vigilItems(sim)) {
    if (item.state === "busted") damage += item.weight;
    if (item.state !== "open") continue;
    const short = Math.min(item.short, context.oneCard.length - 1);
    const one = draws >= 1 ? context.oneCard[short] : 0;
    const two = draws >= 2 ? (1 - one) * context.twoCards[short] : 0;
    damage += item.weight * (1 - 0.9 * (one + two));
  }
  const healing = !sim.smokeUsed ? 1 : sim.drawn < sim.targets.length ? 0.5 : 0;
  return -(damage + context.extraDamage * Math.min(1, damage) - healing);
}

function vigilMoves(sim: VigilSim): VigilMove[] {
  const moves: VigilMove[] = [];
  sim.targets.forEach((_, index) => {
    if (!inPair(sim, index) && !sim.smoked[index]) {
      moves.push({ type: "standard", index });
    }
  });
  if (sim.pair !== null) moves.push({ type: "grappleAdd" });
  sim.targets.forEach((_, index) => {
    if (!sim.smokeUsed && sim.smokeable[index] && !inPair(sim, index)) {
      moves.push({ type: "smoke", index });
    }
  });
  if (sim.pair === null) {
    for (let index = 0; index + 1 < sim.targets.length; index += 1) {
      const free = (i: number) => sim.counts[i] === 0 && !sim.smoked[i];
      if (free(index) && free(index + 1))
        moves.push({ type: "grapple", index });
    }
  }
  return moves;
}

function applyVigilMove(sim: VigilSim, move: VigilMove, value: number) {
  const next: VigilSim = {
    ...sim,
    totals: [...sim.totals],
    counts: [...sim.counts],
    smoked: [...sim.smoked],
  };
  if (move.type === "standard") {
    next.totals[move.index] += value;
    next.counts[move.index] += 1;
  } else if (move.type === "smoke") {
    next.smoked[move.index] = true;
    next.counts[move.index] += 1;
    next.smokeUsed = true;
  } else if (move.type === "grapple") {
    next.pair = move.index;
    next.pairTotal = value;
    next.pairCount = 1;
  } else {
    next.pairTotal += value;
    next.pairCount += 1;
  }
  return next;
}

/** A Joker drawn as a response: a new Threat (see addResponseJoker). */
function addVigilJoker(sim: VigilSim, context: VigilContext): VigilSim {
  const next: VigilSim = {
    ...sim,
    targets: [...sim.targets],
    totals: [...sim.totals],
    counts: [...sim.counts],
    smoked: [...sim.smoked],
    smokeable: [...sim.smokeable],
  };
  let index = next.targets.length;
  if (index >= 6) {
    const items = sim.targets.map((target, i) => ({ target, i }));
    const replaced = items
      .filter(
        ({ i }) =>
          !inPair(sim, i) &&
          !sim.smoked[i] &&
          !(
            sim.counts[i] > 0 &&
            sim.totals[i] >= sim.targets[i] &&
            sim.totals[i] <= sim.targets[i] + 3
          ),
      )
      .sort((a, b) => a.target - b.target)[0];
    if (!replaced) return sim;
    index = replaced.i;
  }
  next.targets[index] = context.highest;
  next.totals[index] = 0;
  next.counts[index] = 0;
  next.smoked[index] = false;
  next.smokeable[index] = false;
  return next;
}

/** The move whose outlook is best for a response worth `value`. */
function greedyVigilMove(sim: VigilSim, context: VigilContext, value: number) {
  const draws = sim.targets.length - sim.drawn;
  let best: { move: VigilMove; value: number } | null = null;
  for (const move of vigilMoves(sim)) {
    const outlook = vigilOutlook(
      applyVigilMove(sim, move, value),
      context,
      draws,
    );
    if (!best || outlook > best.value) best = { move, value: outlook };
  }
  return best?.move ?? null;
}

/**
 * Plays the rest of the round with the responses in this order: each placed
 * where it looks best, drawing while a Threat is still open (and the last
 * draw, which costs the heal after a Smoke Bomb, only when likely to pay).
 */
function playOutVigil(
  start: VigilSim,
  context: VigilContext,
  order: PlayingCard[],
  from: number,
) {
  let sim = start;
  for (let next = from; next < order.length; next += 1) {
    const threats = sim.targets.length;
    if (sim.drawn >= threats) break;
    const open = vigilItems(sim).filter((item) => item.state === "open");
    if (open.length === 0) break;
    if (sim.smokeUsed && sim.drawn === threats - 1 && context.healRoom > 0) {
      const chance = Math.max(
        ...open.map(
          (item) =>
            context.oneCard[Math.min(item.short, context.oneCard.length - 1)],
        ),
      );
      if (chance < 0.5) break;
    }
    const card = order[next];
    if (isJoker(card)) {
      sim = addVigilJoker(sim, context);
      continue;
    }
    const value = isAce(card) ? context.lowest : rankValue(card);
    sim = { ...sim, drawn: sim.drawn + 1 };
    const move = greedyVigilMove(sim, context, value);
    if (!move) break;
    sim = applyVigilMove(sim, move, value);
  }
  return vigilResolveValue(sim, context);
}

function faceKey(card: PlayingCard) {
  return `${card.rank}${card.suit[0]}`;
}

function vigilContext(
  game: NightVigilGameState,
  unseen: PlayingCard[],
): VigilContext {
  const lowest = lowestNumberThreat(game.threats);
  const values = unseen
    .filter((card) => !isJoker(card))
    .map((card) => (isAce(card) ? lowest : rankValue(card)));
  const chance = (low: number, high: number) =>
    values.length
      ? values.filter((value) => value >= low && value <= high).length /
        values.length
      : 0;
  const oneCard = Array.from({ length: 41 }, (_, short) =>
    short <= 0 ? 1 : chance(short, short + 3),
  );
  const twoCards = oneCard.map((_, short) =>
    short <= 1
      ? 0
      : Array.from(
          { length: Math.min(short - 1, 10) },
          (__, i) => i + 1,
        ).reduce(
          (sum, first) => sum + chance(first, first) * oneCard[short - first],
          0,
        ),
  );
  return {
    lowest,
    highest: highestNumberThreat(game.threats),
    extraDamage: game.currentEncounter
      ? difficultyDamage(game.difficulty, game.currentEncounter)
      : 0,
    healRoom: 2 * MAX_TRACK - game.armor - game.health,
    life: game.armor + game.health,
    oneCard,
    twoCards,
  };
}

/**
 * The best play for the round: where the response on hand does most good
 * (a Threat it clears or builds towards, the Smoke Bomb on a Threat nothing
 * will fit, a Grapple Line on two Threats it fits better together), or
 * whether drawing another is worth more than resolving now. Each choice is
 * played out over the unseen responses (the deck, as a set), dealt a few
 * ways.
 */
function bestVigilPlay(
  game: NightVigilGameState,
): VigilMove | "draw" | "resolve" | null {
  if (game.ended || !game.currentEncounter) return null;
  const unseen = [...game.playDeck, ...game.discard].sort((a, b) =>
    faceKey(a).localeCompare(faceKey(b)),
  );
  // The deck runs out into the discard, reshuffled: the deck's cards first.
  const deck = unseen.filter((card) => game.playDeck.includes(card));
  const rest = unseen.filter((card) => !game.playDeck.includes(card));
  const context = vigilContext(game, deck.length ? deck : rest);
  const key = [
    game.encounterNumber,
    ...game.threats.map(
      (threat) =>
        `${faceKey(threat.card)}${threat.smoked ? "s" : ""}:${threat.responses.map(faceKey).join("+")}`,
    ),
    game.grappleResponses.map(faceKey).join("+"),
    game.currentResponse ? faceKey(game.currentResponse) : "-",
    game.responsesDrawn,
  ].join(",");
  const orders = Array.from({ length: VIGIL_SAMPLES }, (_, sample) => {
    const random = seededRandom(`${key}:${sample}`);
    return [...shuffledWith(deck, random), ...shuffledWith(rest, random)];
  });
  const sim = vigilSim(game);
  const average = (play: (order: PlayingCard[]) => number) =>
    orders.reduce((sum, order) => sum + play(order), 0) / orders.length;

  if (game.currentResponse) {
    const card = game.currentResponse;
    const value = responseValue(card, game.threats);
    let best: { move: VigilMove; value: number } | null = null;
    for (const move of vigilMoves(sim)) {
      const after = applyVigilMove(sim, move, value);
      const worth = average((order) => playOutVigil(after, context, order, 0));
      if (!best || worth > best.value + 1e-9) best = { move, value: worth };
    }
    return best?.move ?? null;
  }

  const resolve = vigilResolveValue(sim, context);
  const canDraw =
    game.responsesDrawn < game.threats.length && unseen.length > 0;
  if (!canDraw) return "resolve";
  const draw = average((order) => {
    // Deal the first response by hand, then play on.
    const card = order[0];
    if (isJoker(card)) {
      return playOutVigil(addVigilJoker(sim, context), context, order, 1);
    }
    const value = isAce(card) ? context.lowest : rankValue(card);
    const drawn = { ...sim, drawn: sim.drawn + 1 };
    const move = greedyVigilMove(drawn, context, value);
    if (!move) return vigilResolveValue(drawn, context);
    return playOutVigil(applyVigilMove(drawn, move, value), context, order, 1);
  });
  return draw > resolve + 0.01 ? "draw" : "resolve";
}

function smokeLabel(threat: NightVigilThreat) {
  return i18n.t("games:nightVigil.smokeThreat", {
    card: cardLabel(threat.card),
  });
}

function grappleLabel(first: NightVigilThreat, second: NightVigilThreat) {
  return i18n.t("games:nightVigil.grappleThreats", {
    first: cardLabel(first.card),
    second: cardLabel(second.card),
  });
}

function findNightVigilHint(game: NightVigilGameState): Hint | null {
  const play = bestVigilPlay(game);
  if (!play) return null;
  if (play === "draw") return makeHint("draw", zoneTarget("play-deck"));
  if (play === "resolve") {
    const hint = pressHint("controls", i18n.t("cards:resolve"));
    const open =
      game.responsesDrawn < game.threats.length &&
      calculateRound(game).damage > 0;
    return open
      ? withNote(hint, i18n.t("games:nightVigil.hint.resolve"))
      : hint;
  }
  switch (play.type) {
    case "smoke":
      return pressHint(
        `smoke-${play.index}`,
        smokeLabel(game.threats[play.index]),
      );
    case "grapple":
      return pressHint(
        `grapple-hook-${play.index}`,
        grappleLabel(game.threats[play.index], game.threats[play.index + 1]),
      );
    case "grappleAdd":
      return makeHint(
        "tapCard",
        zoneTarget(`grapple-${game.grappleResponses.length - 1}`),
      );
    default: {
      const threat = game.threats[play.index];
      const hint = makeHint("tapCard", zoneTarget(`threat-${play.index}`));
      // A Threat already settled (cleared, or over the mark for good) is a
      // safe place for a response that fits nowhere, unless the response
      // pushes a cleared Threat over the mark.
      const total = threat.responses.reduce(
        (sum, card) => sum + responseValue(card, game.threats),
        0,
      );
      const settled =
        threat.responses.length > 0 &&
        total >= threatValue(threat, game.threats);
      const response = game.currentResponse;
      const harmless =
        !!response &&
        (!standardThreatCleared(threat, game.threats) ||
          standardThreatCleared(
            { ...threat, responses: [...threat.responses, response] },
            game.threats,
          ));
      return settled && harmless
        ? withNote(hint, i18n.t("games:nightVigil.hint.dump"))
        : hint;
    }
  }
}

export const nightVigilRules = {
  findHint: findNightVigilHint,
  bestPlay: bestVigilPlay,
  createDeck: createNightVigilDeck,
  buildEncounterDeck,
  setupFromDiscard,
  threatValue,
  responseValue,
  standardThreatCleared,
  grappleCleared,
  difficultyDamage,
  calculateRound,
  applyTrackChange,
  addResponseJoker,
};

const trackerHeight = 0.36;
const responseRow = 3.5;

export default function NightVigil() {
  const { spacing } = useResponsiveMetrics();
  const { colorPale } = useGameColors();
  const difficulty = useGameSettingValue(
    "nightVigilDifficulty",
  ) as NightVigilDifficulty;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const [playMode, setPlayMode] = useState<NightVigilPlayMode>("standard");
  const {
    game,
    setGame,
    reset,
    isLoaded,
    isSettingUp,
    canUndo,
    undo,
    saveUndoState,
  } = useStateManager({
    gameStateInitial,
    resetAndSetup: async () => {
      await resetAndSetup(setGame, difficultyRef.current);
    },
    resetNonGameStates: async () => setPlayMode("standard"),
  });

  const roundResult = useMemo(() => calculateRound(game), [game]);

  useHint(() => findNightVigilHint(game), { game, enabled: !isSettingUp });

  function drawResponse() {
    if (
      isSettingUp ||
      game.ended ||
      game.currentResponse ||
      game.responsesDrawn >= game.threats.length
    ) {
      return;
    }
    saveUndoState(game);
    setGame((draft) => {
      const card = drawPlayCard(draft);
      if (!card) {
        return;
      }
      const faceCard = flipToFace(card);
      if (isJoker(faceCard)) {
        addResponseJoker(draft, faceCard);
      } else {
        draft.currentResponse = faceCard;
        draft.responsesDrawn += 1;
      }
    });
  }

  function canSmokeThreat(index: number) {
    const threat = game.threats[index];
    return (
      !isSettingUp &&
      !!game.currentResponse &&
      !game.ended &&
      !game.smokeUsed &&
      !!threat &&
      !isJoker(threat.card) &&
      threat.card.suit !== game.currentEncounter?.suit &&
      !game.grapplePair?.includes(index)
    );
  }

  function smokeThreat(index: number) {
    if (!canSmokeThreat(index)) return;
    saveUndoState(game);
    setGame((draft) => {
      const response = draft.currentResponse;
      const threat = draft.threats[index];
      if (!response || !threat) return;
      threat.responses.push(flipToBack(response));
      threat.smoked = true;
      draft.currentResponse = null;
      draft.smokeUsed = true;
    });
    setPlayMode("standard");
  }

  function canGrappleThreat(index: number) {
    const threat = game.threats[index];
    return !!threat && !threat.smoked && threat.responses.length === 0;
  }

  function canGrapplePair(index: number) {
    return (
      !isSettingUp &&
      !!game.currentResponse &&
      !game.ended &&
      !game.grapplePair &&
      index >= 0 &&
      index + 1 < game.threats.length &&
      canGrappleThreat(index) &&
      canGrappleThreat(index + 1)
    );
  }

  function grappleThreatPair(index: number) {
    if (!canGrapplePair(index)) return;
    saveUndoState(game);
    setGame((draft) => {
      if (!draft.currentResponse || draft.grapplePair) return;
      draft.grapplePair = [index, index + 1];
      draft.grappleResponses.push(draft.currentResponse);
      draft.currentResponse = null;
      draft.grappleAnchor = null;
    });
    setPlayMode("standard");
  }

  function canAddGrappleResponse() {
    return (
      !isSettingUp &&
      !!game.currentResponse &&
      !game.ended &&
      !!game.grapplePair
    );
  }

  function addGrappleResponse() {
    if (!canAddGrappleResponse()) return;
    saveUndoState(game);
    setGame((draft) => {
      if (!draft.currentResponse || !draft.grapplePair) return;
      draft.grappleResponses.push(draft.currentResponse);
      draft.currentResponse = null;
    });
  }

  function isThreatNeutralized(index: number) {
    if (game.grapplePair?.includes(index)) return grappleCleared(game);
    const threat = game.threats[index];
    return !!threat && standardThreatCleared(threat, game.threats);
  }

  function playOnThreat(index: number) {
    if (!game.currentResponse || game.ended) return;
    const threat = game.threats[index];
    if (!threat) return;

    if (playMode === "smoke") {
      smokeThreat(index);
      return;
    }

    if (playMode === "grapple") {
      if (game.grapplePair) {
        if (!game.grapplePair.includes(index)) return;
        addGrappleResponse();
        return;
      }

      if (game.grappleAnchor === null) {
        if (!canGrappleThreat(index)) return;
        setGame((draft) => {
          draft.grappleAnchor = index;
        });
        return;
      }

      if (Math.abs(game.grappleAnchor - index) !== 1) return;
      const pairStartIndex = Math.min(game.grappleAnchor, index);
      if (!canGrapplePair(pairStartIndex)) return;
      saveUndoState(game);
      setGame((draft) => {
        if (!draft.currentResponse || draft.grappleAnchor === null) return;
        draft.grapplePair = [draft.grappleAnchor, index].sort(
          (a, b) => a - b,
        ) as [number, number];
        draft.grappleResponses.push(draft.currentResponse);
        draft.currentResponse = null;
        draft.grappleAnchor = null;
      });
      return;
    }

    if (game.grapplePair?.includes(index) || threat.smoked) return;
    saveUndoState(game);
    setGame((draft) => {
      if (!draft.currentResponse) return;
      draft.threats[index].responses.push(draft.currentResponse);
      draft.currentResponse = null;
    });
  }

  function resolveEncounter() {
    if (game.ended || game.currentResponse || !game.currentEncounter) return;
    saveUndoState(game);
    setGame((draft) => {
      if (!draft.currentEncounter) return;
      const result = calculateRound(draft);
      applyTrackChange(draft, result.netDamage);
      const completedEncounter = draft.currentEncounter;
      draft.discard.push(
        flipToBack(completedEncounter),
        ...draft.threats.flatMap((threat) => [
          flipToBack(threat.card),
          ...flipAllToBack(threat.responses),
        ]),
        ...flipAllToBack(draft.grappleResponses),
      );
      // The grappled responses went to the discard with the rest: none stay
      // on the board, even when the game ends here.
      draft.grapplePair = null;
      draft.grappleResponses = [];
      draft.grappleAnchor = null;

      if (draft.health <= 0) {
        draft.ended = true;
        draft.won = false;
        draft.currentEncounter = null;
        draft.threats = [];
        return;
      }

      if (draft.encounterDeck.length === 0) {
        draft.ended = true;
        draft.won = true;
        draft.score = scoreFor(draft);
        draft.currentEncounter = null;
        draft.threats = [];
        return;
      }

      draft.currentEncounter = flipToFace(draft.encounterDeck.pop()!);
      draft.encounterNumber += 1;
      draft.currentResponse = null;
      draft.responsesDrawn = 0;
      draft.smokeUsed = false;
      dealThreats(
        draft,
        draft.currentEncounter.rank === "K" &&
          draft.currentEncounter.suit === "diamonds",
      );
    });
    setPlayMode("standard");
  }

  const zones: MapZone[] = useMemo(() => {
    const threatStartCol =
      game.threats.length > 5 ? 0.5 : game.threats.length > 4 ? 0.75 : 1;

    const threatZones = game.threats.map(
      (threat, index): MapZone => ({
        id: `threat-${index}`,
        name: "threat",
        pileIndex: index,
        cards: [threat.card, ...threat.responses],
        col: index + threatStartCol,
        row: 1.5,
        fan: { direction: "down", offset: 0.22 },
        placeholder: {},
        baseZIndex: index,
      }),
    );

    const smokeZones = game.threats.map(
      (_, index): MapZone => ({
        id: `smoke-${index}`,
        col: index + threatStartCol,
        row: 1,
        baseZIndex: 50,
        height: 0.6,
      }),
    );
    const grappleHookZones = game.threats.slice(0, -1).map(
      (_, index): MapZone => ({
        id: `grapple-hook-${index}`,
        col: index + threatStartCol + 0.5,
        row: 2.4,
        width: 1,
        height: 0.6,
        baseZIndex: 50,
      }),
    );

    const grappleZones = game.grappleResponses.map(
      (card, index): MapZone => ({
        id: `grapple-${index}`,
        name: "grapple",
        cards: [card],
        col: threatStartCol + (game.grapplePair?.[0] ?? 0) + 0.52,
        row: 1.8 + index * 0.3,
        rotation: 90,
        baseZIndex: 50 + index,
      }),
    );

    return [
      {
        id: "bars",
        col: 3.2,
        row: 0,
        width: 2.8,
      },
      {
        id: "encounter-deck",
        name: "encounter-deck",
        cards: game.encounterDeck,
        col: 0,
        row: 0,
        fan: { maxVisible: 2 },
        placeholder: {
          text: i18n.t("games:nightVigil.city"),
          showCount: true,
          infoPos: "right",
        },
      },
      {
        id: "encounter",
        name: "encounter",
        cards: game.currentEncounter ? [game.currentEncounter] : [],
        col: 1.5,
        row: 0,
        placeholder: {
          text: i18n.t("games:nightVigil.villain"),
          showCount: false,
          infoPos: "right",
        },
        baseZIndex: 10,
      },
      {
        id: "play-deck",
        name: "play-deck",
        cards: game.playDeck,
        col: 0,
        row: responseRow,
        fan: { maxVisible: 2 },
        placeholder: {},
        baseZIndex: 10,
      },
      {
        id: "discard",
        name: "discard",
        cards: game.discard,
        col: 5,
        row: responseRow,
        fan: { maxVisible: 2 },
        placeholder: {},
      },
      ...threatZones,
      ...smokeZones,
      ...grappleHookZones,
      ...grappleZones,
      {
        id: "current-response",
        name: "current-response",
        cards: game.currentResponse ? [game.currentResponse] : [],
        col: 1.5,
        row: responseRow,
        placeholder: { text: i18n.t("games:nightVigil.response") },
        baseZIndex: 1,
      },
      {
        id: "controls",
        col: 0,
        row: 4.5,
        width: "full",
        height: 1.28,
      },
    ];
  }, [game]);

  const cardMapper = (
    mappedCard: MappedCard,
  ): AnimatedCardMapping | undefined => {
    if (mappedCard.zoneName === "threat") {
      const threatIndex = mappedCard.pileIndex ?? -1;
      const neutralized =
        mappedCard.cardIndex === 0 && isThreatNeutralized(threatIndex);
      return {
        onPress: () => playOnThreat(threatIndex),
        selectColor: neutralized
          ? "grey"
          : game.grappleAnchor === threatIndex
            ? Colors.buttonOrange
            : undefined,
        isSelected: game.grappleAnchor === threatIndex,
        forceOverlayColor: neutralized,
      };
    }
    if (mappedCard.zoneName === "grapple") {
      return {
        onPress: addGrappleResponse,
        isDisabled: !canAddGrappleResponse(),
      };
    }
    if (mappedCard.zoneName === "play-deck") {
      return { clickThroughCards: true };
    }
  };

  const { cardMap, cardHeight, getZoneStylesById } = useCardMap({
    game,
    zones,
    cardMapper,
    zoneMapper: (zone) => {
      if (zone.id.startsWith("threat-")) {
        const index = zone.pileIndex ?? -1;
        return { onPress: () => playOnThreat(index) };
      }
      if (zone.id === "play-deck") {
        return { onPress: drawResponse, isDisabled: !!game.currentResponse };
      }
    },
    cardSize: "small",
    gap: 0.14,
  });

  const canDraw =
    !game.currentResponse &&
    !game.ended &&
    game.responsesDrawn < game.threats.length;

  return (
    <GameWrapper
      outcome={!game.ended ? "playing" : game.won ? "won" : "lost"}
      score={game.score}
      reset={reset}
      isLoaded={isLoaded}
      canUndo={canUndo}
      undo={undo}
    >
      {cardMap}

      {game.threats.map((_, index) => (
        <View
          key={`smoke-${index}`}
          style={[getZoneStylesById(`smoke-${index}`), flexStyles.rowCentered]}
        >
          {canSmokeThreat(index) && (
            <Button
              accessibilityLabel={smokeLabel(game.threats[index])}
              iconName="smoke-bomb"
              iconSize={30}
              size="xs"
              theme="orange"
              onPress={() => smokeThreat(index)}
              style={{
                paddingHorizontal: 0,
                paddingVertical: 0,
                width: spacing(40),
                height: spacing(40),
                borderRadius: spacing(20),
              }}
            />
          )}
        </View>
      ))}

      {game.threats.slice(0, -1).map((_, index) => (
        <View
          key={`grapple-hook-${index}`}
          style={[
            getZoneStylesById(`grapple-hook-${index}`),
            flexStyles.rowCentered,
          ]}
        >
          {canGrapplePair(index) && (
            <Button
              accessibilityLabel={grappleLabel(
                game.threats[index],
                game.threats[index + 1],
              )}
              iconName="grapple-hook"
              iconSize={30}
              size="sm"
              theme="purple"
              halfTaller
              onPress={() => grappleThreatPair(index)}
              style={{
                paddingHorizontal: 0,
                paddingVertical: 0,
                width: spacing(60),
                height: spacing(40),
                borderRadius: spacing(20),
              }}
            />
          )}
        </View>
      ))}

      <View
        style={[
          flexStyles.colCentered,
          flexStyles.spaceAround,
          getZoneStylesById("bars"),
        ]}
      >
        <ProgressBar
          totalValue={MAX_TRACK}
          progressValue={game.armor}
          color="blue"
          autoTallyText
          scaledHeight={cardHeight * trackerHeight}
          iconName="shield"
        />
        <ProgressBar
          totalValue={MAX_TRACK}
          progressValue={game.health}
          color="red"
          autoTallyText
          scaledHeight={cardHeight * trackerHeight}
          iconName="heart"
        />
      </View>

      <View
        style={[
          getZoneStylesById("controls"),
          flexStyles.rowCentered,
          {
            gap: spacing(12),
          },
        ]}
      >
        {/* Resolve */}
        <View style={[flexStyles.colCentered, { gap: spacing(12), flex: 1 }]}>
          <View
            style={[
              flexStyles.rowCentered,
              flexStyles.fullWidth,
              flexStyles.spaceBetween,
              {
                height: spacing(30),
                gap: spacing(4),
                paddingHorizontal: spacing(20),
              },
            ]}
          >
            <Text>
              {i18n.t("games:nightVigil.damage")} {roundResult.damage}
            </Text>
            <Text>
              {i18n.t("games:nightVigil.heal")} {roundResult.healing}
            </Text>
          </View>

          <Button
            text={i18n.t("cards:resolve")}
            size="md"
            theme="green"
            disabled={!!game.currentResponse || game.ended}
            onPress={resolveEncounter}
            taller
            fullWidth
          />
        </View>

        {/* Draw */}
        <View style={[flexStyles.colCentered, { gap: spacing(12), flex: 1 }]}>
          <View
            style={[
              flexStyles.rowCentered,
              { gap: spacing(4), height: spacing(30) },
            ]}
          >
            {game.threats.map((_threat, index) => (
              <View
                key={`draw-dot-${index}`}
                style={{
                  width: spacing(10),
                  height: spacing(10),
                  borderRadius: spacing(5),
                  backgroundColor: rgba(
                    colorPale,
                    index < game.responsesDrawn ? 1 : 0.3,
                  ),
                }}
              />
            ))}
          </View>

          <Button
            text={i18n.t("cards:draw")}
            size="md"
            theme="blue"
            disabled={!canDraw}
            onPress={drawResponse}
            taller
            fullWidth
          />
        </View>
      </View>
    </GameWrapper>
  );
}
