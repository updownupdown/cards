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
  outcome,
  pressButton,
  renderGame,
  renderVariant,
  selectedCardIds,
  settle,
} from "../../../jest/game-harness";
import { getGameComponentByPath } from "@/data/games-router";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import { GAME_VARIANTS } from "@/data/game-variants";
import { hasHintFinder, requestHint } from "@/hints/hint-store";
import type { Hint, HintTarget } from "@/hints/hint";
import { act } from "react-test-renderer";

// Drag-and-drop games play by tapping too, and a hint can be played the same
// way: tap each target in turn. A {card} target is tapped through that card's
// onPress (from the game's cardMapper); a {zone} target through the onPress
// of the zone's top card when it has one, else the zone's own onPress. Drag
// handles are not used here, so every move a hint shows must be playable
// through the card map's press handlers alone.

const STEPS = Number(process.env.HINT_TAP_STEPS ?? 25);
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

function zoneOfCard(id: string) {
  return mappedCards().find((entry) => entry.card.id === id)?.zoneId;
}

function boardSnapshot() {
  return JSON.stringify(
    (harness.mapConfig?.zones ?? []).map((zone) => [
      zone.id,
      (zone.cards ?? []).map((card) => `${card.id}${card.faceUp ? "" : "?"}`),
    ]),
  );
}

type DragOptions = {
  getDroppedCardIds?: (source: unknown) => string[];
  getTapHandler?: (source: unknown) => (() => void) | undefined;
};

/** A card's tap: its card map onPress, else its drag handle's tap handler. */
function cardTap(id: string) {
  const card = mappedCards().find((entry) => entry.card.id === id);
  const onPress = card && harness.mapConfig?.cardMapper(card)?.onPress;
  if (onPress) return onPress;
  const drag = harness.dragOptions as DragOptions | null;
  const source = harness.dragSources.find(
    (candidate) => drag?.getDroppedCardIds?.(candidate)[0] === id,
  );
  return source ? drag?.getTapHandler?.(source) : undefined;
}

/** Taps a hint target the way hint auto-play does; false if nothing takes it. */
async function tapTarget(target: HintTarget, hint: Hint) {
  let onPress: (() => void) | undefined;
  if ("card" in target) {
    onPress = cardTap(target.card);
  } else {
    const zone = harness.mapConfig?.zones.find(
      (entry) => entry.id === target.zone,
    );
    if (!zone) return false;
    const top = mappedCards()
      .filter((entry) => entry.zoneId === zone.id)
      .at(-1);
    onPress =
      (top && cardTap(top.card.id)) ??
      harness.mapConfig?.zoneMapper?.(zone)?.onPress;
    // Buttons drawn in a zone (a stock's "Deal") have no card map handler.
    const label = hint.message.values?.label;
    if (!onPress && typeof label === "string" && harness.renderer) {
      await pressButton(harness.renderer, label);
      return true;
    }
  }
  if (!onPress) return false;
  const press = onPress;
  await act(async () => press());
  // Auto-play waits between taps longer than a double tap takes.
  await settle(4);
  return true;
}

const games: [string, string][] = [
  ...GAME_DEFINITIONS.map(({ path }) => [path, ""] as [string, string]),
  ...Object.entries(GAME_VARIANTS).flatMap(([path, variants]) =>
    variants.slice(1).map((variant) => [path, variant] as [string, string]),
  ),
];

describe.each(games)("%s %s", (path, variant) => {
  test("hints play by tapping their targets", async () => {
    const Game = getGameComponentByPath(path)!;
    const renderer = variant
      ? await renderVariant(path, variant, Game)
      : await renderGame(path, Game);

    // Only drag-and-drop games: the others play by tapping already.
    if (!harness.dragOptions || !hasHintFinder()) {
      await act(async () => renderer.unmount());
      return;
    }

    for (let step = 0; step < STEPS && outcome() === "playing"; step += 1) {
      let hint: Hint | null = null;
      await act(async () => {
        hint = requestHint();
      });
      if (!hint) break;
      const shown: Hint = hint;
      const before = boardSnapshot();
      const [from, to] = shown.steps;
      const moving =
        from?.length === 1 && "card" in from[0] ? from[0].card : null;
      const destination =
        to?.length === 1 && "zone" in to[0] ? to[0].zone : null;
      const origin = moving ? zoneOfCard(moving) : undefined;

      const untapped: string[] = [];
      for (const target of shown.steps.flat()) {
        if (!(await tapTarget(target, shown))) {
          untapped.push(JSON.stringify(target));
        }
      }
      await settle(8);

      let changed = boardSnapshot() !== before;
      // A button that changes no cards (a setting, a choice) moves the game
      // on all the same: the next hint is a different one.
      if (!changed && shown.message.key === "press") {
        changed = JSON.stringify(requestHint()) !== JSON.stringify(shown);
      }
      expect({ step, hint: shown, untapped, changed }).toEqual({
        step,
        hint: shown,
        untapped: [],
        changed: true,
      });
      if (moving && destination && shown.steps.length === 2) {
        // The card went where the hint pointed (and maybe on to a
        // foundation, by auto-play).
        const now = zoneOfCard(moving);
        const landed =
          now === destination ||
          (now !== origin && !!now?.startsWith("foundation"));
        expect({ step, hint: shown, landed }).toEqual({
          step,
          hint: shown,
          landed: true,
        });
      }
      expect({ step, selected: selectedCardIds() }).toEqual({
        step,
        selected: [],
      });
    }

    await act(async () => renderer.unmount());
  });
});
