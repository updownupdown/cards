import {
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
  renderGame,
  renderVariant,
  settle,
} from "../../../jest/game-harness";
import { getGameComponentByPath } from "@/data/games-router";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import { GAME_VARIANTS } from "@/data/game-variants";
import {
  clearLastGameSession,
  loadGlobalSettings,
  saveGlobalSettings,
} from "@/data/game-menu";
import { act } from "react-test-renderer";
import type React from "react";
import { Button } from "@/components/Button/Button";

// No game may deal a position that is already lost: every deal must offer at
// least two moves in a row (a stock draw counts, since it changes what can be
// played). A move is anything that changes where the cards are or which way
// up they lie. Set PLAYABLE_DEAL_SEEDS to check more deals per game.

const SEEDS = Number(process.env.PLAYABLE_DEAL_SEEDS ?? 4);
const MIN_MOVES = 2;

/**
 * Games whose opening isn't made of card moves, so this test can't count
 * them. Each needs its reason.
 */
const NOT_COUNTED: Record<string, string> = {
  "/cafe-queue":
    "a move places a customer through the game's own queue controls",
  "/chain-of-command": "a move picks a member, then a candidate, then promotes",
  "/field-command": "turns are commands chosen from the game's own panel",
  "/fight-clubs": "a turn picks a Club, then the cards it clears",
  "/infiltrator":
    "turns are recruit and mission choices in the game's own panel",
  "/invaders": "attacks pick an attacker and a defender, then confirm",
  "/ouroboros":
    "hasSafeLoopStart guarantees a viable second turn; later turns pick a path, then act",
  "/triple-stack": "a move picks three cards",
  "/fortress":
    "a tap picks a column first, which a leftover pick can turn into another move; castle-deals.test.tsx checks its deals with the game's own rules",
};

/** Where every card is, and which way up. */
function fingerprint() {
  return JSON.stringify(
    (harness.mapConfig?.zones ?? []).map((zone) => [
      zone.id,
      (zone.cards ?? []).map((card) => `${card.id}${card.faceUp ? "^" : "v"}`),
    ]),
  );
}

type Case = { path: string; variant?: string; seed: number };

/** The same numbers every run, so a failing deal can be dealt again. */
function seededRandom(text: string) {
  let seed = 2166136261;
  for (const char of text) {
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  }
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

async function deal({ path, variant, seed }: Case) {
  jest
    .spyOn(Math, "random")
    .mockImplementation(seededRandom(`${path}/${variant ?? ""}/${seed}`));
  // Every deal fresh, never the session the last one saved.
  await saveGlobalSettings({
    ...(await loadGlobalSettings()),
    resumeLastGame: false,
  });
  await clearLastGameSession();
  const Game = getGameComponentByPath(path)!;
  const renderer = variant
    ? await renderVariant(path, variant, Game)
    : await renderGame(path, Game);
  // Every other deal is a New Game on top of the first, which deals through
  // a different path in some games.
  if (seed % 2 === 1) {
    // The first deal finishes first, as it would before a player could tap.
    await settle(120);
    // Not awaited: the deal waits on timers, which settle() runs.
    await act(async () => {
      void (harness.wrapperProps?.reset as (() => unknown) | undefined)?.();
    });
    await settle(120);
  }
  return renderer;
}

/** Taps and presses available at the deal, as names to find them again by. */
function tapsAndPresses() {
  const config = harness.mapConfig!;
  const cards = mappedCards()
    .filter((card) => {
      const mapping = config.cardMapper(card) as
        { onPress?: () => void; isDisabled?: boolean } | undefined;
      return mapping?.onPress && !mapping.isDisabled;
    })
    .map((card) => ({ kind: "card" as const, id: card.card.id }));
  const zones = config.zones
    .filter((zone) => {
      const mapping = config.zoneMapper?.(zone) as
        { onPress?: () => void; isDisabled?: boolean } | undefined;
      return mapping?.onPress && !mapping.isDisabled;
    })
    .map((zone) => ({ kind: "zone" as const, id: zone.id }));
  // The game's own buttons (Deal, Run, Fight…); the header isn't rendered.
  const buttons = harness
    .renderer!.root.findAllByType(Button as React.ComponentType)
    .filter((button) => !button.props.disabled && button.props.onPress)
    .map((_, index) => ({ kind: "button" as const, id: String(index) }));
  // Zones first: a stock or a deal button is the likeliest move.
  return [...zones, ...buttons, ...cards];
}

type CardMapping = {
  onPress?: () => void;
  isDisabled?: boolean;
  isSelected?: boolean;
};

function cardMapping(id: string) {
  const card = mappedCards().find((c) => c.card.id === id);
  return card
    ? (harness.mapConfig!.cardMapper(card) as CardMapping | undefined)
    : undefined;
}

async function perform(action: {
  kind: "card" | "zone" | "button";
  id: string;
}) {
  const config = harness.mapConfig!;
  if (action.kind === "button") {
    const button = harness
      .renderer!.root.findAllByType(Button as React.ComponentType)
      .filter(
        (candidate) => !candidate.props.disabled && candidate.props.onPress,
      )[Number(action.id)];
    if (!button) return;
    await act(async () => {
      button.props.onPress();
    });
  } else if (action.kind === "zone") {
    const zone = config.zones.find((candidate) => candidate.id === action.id);
    if (!zone) return;
    await act(async () => {
      config.zoneMapper?.(zone)?.onPress?.();
    });
  } else {
    const mapping = cardMapping(action.id);
    if (!mapping?.onPress || mapping.isDisabled) return;
    await act(async () => {
      mapping.onPress!();
    });
  }
  await settle(10);
}

/** Makes one move, if there is one: a legal drop, a tap or press, or a card
 *  picked up and then played by a tap or press somewhere else. */
async function makeAMove(skip = 0) {
  const before = fingerprint();
  let budget = ACTION_BUDGET;
  const act1 = async (action: Parameters<typeof perform>[0]) => {
    budget -= 1;
    await perform(action);
  };
  let skipped = 0;
  const undo = harness.wrapperProps?.undo as (() => void) | undefined;
  // A move was made: keep it, or take it back to look further.
  const moved = async () => {
    if (fingerprint() === before) return false;
    if (skipped === skip || !undo) return true;
    skipped += 1;
    await act(async () => undo());
    await settle(10);
    return false;
  };

  // Mapping every card records what can be dragged, as laying out the board
  // does.
  for (const card of mappedCards()) harness.mapConfig!.cardMapper(card);
  const options = harness.dragOptions;
  const targets = options?.getDropHitAreas?.().map((area) => area.target) ?? [];
  for (const source of options ? harness.dragSources : []) {
    const target = targets.find((t) => options!.canDropOnTarget(source, t));
    if (target === undefined) continue;
    await act(async () => {
      await options!.onSuccessfulDrop(source, target);
    });
    await settle(10);
    if (await moved()) return true;
  }

  for (const action of tapsAndPresses()) {
    if (budget <= 0) return false;
    await act1(action);
    if (await moved()) return true;
  }

  for (const picked of tapsAndPresses().filter((a) => a.kind === "card")) {
    for (const action of tapsAndPresses()) {
      if (action.id === picked.id) continue;
      if (budget <= 0) return false;
      if (!cardMapping(picked.id)?.isSelected) await act1(picked);
      if (await moved()) return true;
      if (!cardMapping(picked.id)?.isSelected) break;
      if (budget <= 0) return false;
      await act1(action);
      if (await moved()) return true;
    }
  }
  return false;
}

/** First moves tried in turn, undoing each, while looking for a second. */
const MAX_FIRST_MOVES = 4;
/** Taps and presses one search may make, so a big board can't run away. */
const ACTION_BUDGET = 1500;

/** How many moves in a row can be made from the deal, up to MIN_MOVES. */
async function countMoves(dealt: Case) {
  const renderer = await deal(dealt);
  let moves = 0;
  for (let first = 0; first < MAX_FIRST_MOVES; first += 1) {
    if (!(await makeAMove(first))) break;
    moves = 1;
    if (await makeAMove()) {
      moves = 2;
      break;
    }
    const undo = harness.wrapperProps?.undo as (() => void) | undefined;
    if (!undo) break;
    await act(async () => undo());
    await settle(10);
  }
  await act(async () => renderer.unmount());
  harness.renderer = null;
  return moves;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const variantCases = Object.entries(GAME_VARIANTS).flatMap(([path, variants]) =>
  variants.slice(1).map((variant: string) => ({ path, variant })),
);
const cases: [string, Case][] = [
  ...GAME_DEFINITIONS.map(({ path }) => ({ path, variant: undefined })),
  ...variantCases,
]
  .filter(({ path }) => !NOT_COUNTED[path])
  .flatMap((game) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const dealt: Case = { ...game, seed };
      const name = `${game.path}${game.variant ? ` (${game.variant})` : ""} deal ${seed}`;
      return [name, dealt] as [string, Case];
    }),
  );

describe("Playable deals", () => {
  test.each(cases)(
    "%s offers at least two moves",
    async (_, dealt) => {
      expect(await countMoves(dealt)).toBeGreaterThanOrEqual(MIN_MOVES);
    },
    60000,
  );
});
