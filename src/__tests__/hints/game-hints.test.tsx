import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from "@jest/globals";
import "../../../jest/game-mocks";
import {
  harness,
  mappedCards,
  outcome,
  pressButton,
  renderGame,
  renderVariant,
  settle,
} from "../../../jest/game-harness";
import { getGameComponentByPath } from "@/data/games-router";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import { GAME_VARIANTS } from "@/data/game-variants";
import { hasHintFinder, requestHint } from "@/hints/hint-store";
import type { Hint, HintTarget } from "@/hints/hint";
import { act } from "react-test-renderer";

// Every game with hints, played by following them: each hint must point at
// cards and zones on the board, doing what it shows must change the game,
// and following hints must never go round in circles. A hint is played the
// way a player would: tap the cards it lights, then the places, until
// something moves. Drag-and-drop games too: hint auto-play taps, so their
// hints must play by taps alone (see followHint).

const STEPS = Number(process.env.HINT_STEPS ?? 40);

type DragOptions = {
  canDropOnTarget: (source: unknown, target: unknown) => boolean;
  onSuccessfulDrop: (source: unknown, target: unknown) => unknown;
  getDropHitAreas?: () => { target: unknown }[];
  getDroppedCardIds?: (source: unknown) => string[];
  getTapHandler?: (source: unknown) => (() => void) | undefined;
};

function boardSnapshot() {
  // A card the game hides stays in its zone (Cabin Siege's dead zombies):
  // hiding it is a change too.
  const hidden = new Set(
    mappedCards().flatMap((card) =>
      (harness.mapConfig?.cardMapper(card) as { isVisible?: boolean } | null)
        ?.isVisible === false
        ? [card.card.id]
        : [],
    ),
  );
  return JSON.stringify(
    // Cards only: zones that appear empty (where a picked card may go) are
    // no change to the game.
    (harness.mapConfig?.zones ?? []).flatMap((zone) =>
      zone.cards?.length
        ? [
            [
              // Ouroboros turns its loop to where the player stands.
              zone.rotation === undefined
                ? zone.id
                : `${zone.id}@${Math.round(zone.rotation)}`,
              zone.cards.map(
                (card) =>
                  `${card.id}${card.faceUp ? "" : "?"}${hidden.has(card.id) ? "!" : ""}`,
              ),
            ],
          ]
        : [],
    ),
  );
}

function zoneExists(id: string) {
  return (harness.mapConfig?.zones ?? []).some((zone) => zone.id === id);
}

function cardExists(id: string) {
  return mappedCards().some((card) => card.card.id === id);
}

/**
 * Problems with where the hint's first step points, if any. Later steps may
 * point at places that only appear once the first is tapped (where a picked
 * card can go); playing the hint checks those.
 */
function badTargets(hint: Hint) {
  return hint.steps[0].flatMap((target) =>
    "card" in target
      ? cardExists(target.card)
        ? []
        : [`card ${target.card}`]
      : zoneExists(target.zone)
        ? []
        : [`zone ${target.zone}`],
  );
}

/** Does the drop target sit in the zone with this id ("cascade-3")? */
function targetInZone(target: unknown, zoneId: string) {
  const record = target as Record<string, unknown>;
  const zone = typeof record.zone === "string" ? record.zone : undefined;
  const values = Object.entries(record)
    .filter(([key]) => key !== "zone")
    .map(([, value]) => String(value));
  if (zone === zoneId) return true;
  const prefix = zone !== undefined ? `${zone}-` : "";
  if (!zoneId.startsWith(prefix)) return false;
  const rest = zoneId.slice(prefix.length);
  // "tableau-3" names pile 3; a zone without a name ({ pile: 3 }) as well.
  const suffix =
    zone === undefined ? (/-(\w+)$/.exec(zoneId)?.[1] ?? "") : rest;
  return values.includes(suffix);
}

async function tapCard(id: string) {
  const card = mappedCards().find((candidate) => candidate.card.id === id);
  const onPress = card ? harness.mapConfig?.cardMapper(card)?.onPress : null;
  if (onPress) {
    await act(async () => onPress());
    return true;
  }
  const drag = harness.dragOptions as DragOptions | null;
  const source = harness.dragSources.find(
    (candidate) => drag?.getDroppedCardIds?.(candidate)[0] === id,
  );
  const onTap = source ? drag?.getTapHandler?.(source) : undefined;
  if (onTap) {
    await act(async () => onTap());
    return true;
  }
  return false;
}

async function tapZoneTarget(id: string, hint: Hint) {
  const zone = harness.mapConfig?.zones.find(
    (candidate) => candidate.id === id,
  );
  if (!zone) return false;
  const topCard = mappedCards()
    .filter((card) => card.zoneId === id)
    .at(-1);
  if (topCard && (await tapCard(topCard.card.id))) return true;
  const onPress = harness.mapConfig?.zoneMapper?.(zone)?.onPress;
  if (onPress) {
    await act(async () => onPress());
    return true;
  }
  const label = hint.message.values?.label;
  if (typeof label === "string" && harness.renderer) {
    await pressButton(harness.renderer, label);
    return true;
  }
  return false;
}

async function tapTarget(target: HintTarget, hint: Hint) {
  return "card" in target
    ? tapCard(target.card)
    : tapZoneTarget(target.zone, hint);
}

/** Plays the hint as a drag, when the game drags and the hint is a move. */
async function dropHint(hint: Hint) {
  const drag = harness.dragOptions as DragOptions | null;
  const [from, to] = hint.steps;
  if (!drag?.getDroppedCardIds || !from || !to || to.length !== 1) return false;
  const card = from[0];
  const zone = to[0];
  if (!("card" in card) || !("zone" in zone)) return false;
  const source = harness.dragSources.find(
    (candidate) => drag.getDroppedCardIds!(candidate)[0] === card.card,
  );
  if (!source) return false;
  const target = drag
    .getDropHitAreas?.()
    .map((area) => area.target)
    .find(
      (candidate) =>
        targetInZone(candidate, zone.zone) &&
        drag.canDropOnTarget(source, candidate),
    );
  if (target === undefined) return false;
  await act(async () => {
    await drag.onSuccessfulDrop(source, target);
  });
  return true;
}

/**
 * Lets a move play out: some games move cards one at a time (Accordion
 * closes up its line pile by pile), so wait until the board is still.
 */
async function settleMove() {
  for (let round = 0; round < 40; round += 1) {
    const before = boardSnapshot();
    await settle(8);
    if (boardSnapshot() === before) return;
  }
}

/**
 * Hint auto-play taps a hint's targets, so drag-and-drop games must play
 * every hint by taps too. HINT_ALLOW_DROP=1 lets a hint that taps can't play
 * fall back to a drag (to see what else fails while fixing one).
 */
const ALLOW_DROP = process.env.HINT_ALLOW_DROP === "1";

/**
 * Does what the hint shows, by tapping its targets (and, if allowed, by a
 * drag when taps do nothing); returns whether the board changed.
 */
async function followHint(hint: Hint) {
  const before = boardSnapshot();
  const tapped = await tapHint(hint, before);
  if (tapped || !ALLOW_DROP) return tapped;
  if (await dropHint(hint)) {
    await settleMove();
  }
  return boardSnapshot() !== before;
}

async function tapHint(hint: Hint, before: string) {
  for (const step of hint.steps) {
    for (const target of step) {
      await tapTarget(target, hint);
      await settleMove();
      if (boardSnapshot() !== before) return true;
    }
  }
  // Some games send a card home with a double tap.
  const first = hint.steps[0]?.[0];
  if (first && "card" in first) {
    await tapCard(first.card);
    await tapCard(first.card);
    await settle(8);
  }
  return boardSnapshot() !== before;
}

const coverage: Record<string, string> = {};

// Deals are seeded, so a failure replays; HINT_SEED tries other deals.
const SEED = Number(process.env.HINT_SEED ?? 1);

beforeEach(() => {
  jest.useFakeTimers();
  let state = SEED;
  jest.spyOn(Math, "random").mockImplementation(() => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

afterAll(() => {
  if (process.env.HINT_REPORT) {
    console.log(
      Object.entries(coverage)
        .map(([name, result]) => `${name}: ${result}`)
        .join("\n"),
    );
  }
});

const games: [string, string][] = [
  ...GAME_DEFINITIONS.map(({ path }) => [path, ""] as [string, string]),
  ...Object.entries(GAME_VARIANTS).flatMap(([path, variants]) =>
    variants.slice(1).map((variant) => [path, variant] as [string, string]),
  ),
];

describe.each(games)("%s %s", (path, variant) => {
  test("hints point at the board and their moves play", async () => {
    const name = `${path}${variant ? ` (${variant})` : ""}`;
    const Game = getGameComponentByPath(path)!;
    const renderer = variant
      ? await renderVariant(path, variant, Game)
      : await renderGame(path, Game);

    if (!hasHintFinder()) {
      coverage[name] = "no hints";
      await act(async () => renderer.unmount());
      return;
    }

    let followed = 0;
    let result = "";
    // Following hints may come back to a position once (a plan can take a
    // step back to get a card out), but never go round in circles.
    const visits = new Map([[boardSnapshot(), 1]]);
    for (let step = 0; step < STEPS && outcome() === "playing"; step += 1) {
      let hint: Hint | null = null;
      await act(async () => {
        hint = requestHint();
      });
      if (!hint) {
        result = `no hint after ${followed} moves`;
        break;
      }
      const shown: Hint = hint;
      expect({ step, bad: badTargets(shown) }).toEqual({ step, bad: [] });
      // The same position always gets the same hint.
      expect(requestHint()).toEqual(shown);
      if (process.env.HINT_DEBUG && name.includes(process.env.HINT_DEBUG)) {
        console.log(step, JSON.stringify(shown));
      }
      let changed = await followHint(shown);
      // A button that changes no cards (a setting, a choice) moves the game
      // on all the same: the next hint is a different one.
      if (!changed && shown.message.key === "press") {
        changed = JSON.stringify(requestHint()) !== JSON.stringify(shown);
      }
      expect({ step, hint: shown, changed }).toEqual({
        step,
        hint: shown,
        changed: true,
      });
      followed += 1;
      const position = boardSnapshot();
      // Going through a stock again comes back round; that's no loop.
      const cyclesStock = ["draw", "redeal"].includes(shown.message.key);
      const times = (visits.get(position) ?? 0) + 1;
      visits.set(position, times);
      const circles = times > 2 && !cyclesStock;
      expect({ step, hint: shown, circles }).toEqual({
        step,
        hint: shown,
        circles: false,
      });
    }
    coverage[name] =
      result || `${followed} moves, ${outcome() ?? "no outcome"}`;

    await act(async () => renderer.unmount());
  });
});
