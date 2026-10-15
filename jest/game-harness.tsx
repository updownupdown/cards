import { getAutoCompleteOffer } from "@/hooks/auto-complete-offer";
import { jest } from "@jest/globals";
// Test harness for game screens. Games render for real, but:
// - useStateManager can start from a fixture position instead of dealing,
// - useCardMap records each game's zones and card handlers instead of laying
//   out cards, so tests press cards through the game's own onPress handlers,
// - GameWrapper records its props (outcome, score) instead of rendering chrome.
// Import "./game-mocks" at the top of a test file to install the mocks.
import type { MappedCard, MapZone } from "@/components/Cards/CardMap";
import type {
  CardRank,
  CardSuit,
  PlayingCard,
} from "@/components/Cards/card-utils";
import type { GameSettings } from "@/data/game-menu";
import { useGameSettings } from "@/hooks/useGameSettings";
import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";

type WrapperProps = {
  outcome?: "playing" | "won" | "lost";
  score?: number | string;
  [key: string]: unknown;
};

type CardMapping = {
  onPress?: () => void;
  isSelected?: boolean;
  clickThroughCards?: boolean;
};

type MapConfig = {
  zones: MapZone[];
  cardMapper: (card: MappedCard) => CardMapping | undefined;
  zoneMapper?: (zone: MapZone) => { onPress?: () => void } | undefined;
};

type DragOptions = {
  canDropOnTarget: (source: unknown, target: unknown) => boolean;
  onSuccessfulDrop: (source: unknown, target: unknown) => void | Promise<void>;
  getDropHitAreas?: () => { target: unknown }[];
  getTapHandler?: (source: unknown) => (() => void) | undefined;
};

type MakeDragHandlers = (source: unknown, ...rest: unknown[]) => unknown;

export const harness = {
  path: "/",
  fixture: undefined as unknown,
  wrapperProps: null as WrapperProps | null,
  mapConfig: null as MapConfig | null,
  dragOptions: null as DragOptions | null,
  /** Sources the latest render passed to makeDragHandlers: what can be dragged now. */
  dragSources: [] as unknown[],
  renderer: null as ReactTestRenderer | null,
  /** The game's state manager from its latest render: its state and setters. */
  stateManager: null as {
    game: unknown;
    setGame: (next: unknown) => void;
    reset: () => Promise<void>;
  } | null,
};

const noopSetup = async () => {};

// ── Module mocks (used from game-mocks.ts) ─────────────────────────────────

export function mockGameWrapperModule() {
  return {
    GameWrapper: (props: WrapperProps & { children?: React.ReactNode }) => {
      harness.wrapperProps = props;
      // Like the real wrapper, marks the game's board for its buttons.
      const { BoardButtonsContext } = jest.requireActual<
        typeof import("@/components/Button/Button")
      >("@/components/Button/Button");
      return (
        <BoardButtonsContext.Provider value={true}>
          {props.children}
        </BoardButtonsContext.Provider>
      );
    },
  };
}

export function mockCardMapModule() {
  const actual = jest.requireActual<object>("@/components/Cards/CardMap");
  return {
    ...actual,
    useCardMap: (config: MapConfig) => {
      harness.mapConfig = config;
      return {
        cardMap: null,
        getZoneStyles: () => ({}),
        getZoneStylesById: () => ({}),
        getZoneBasePos: () => ({ x: 0, y: 0, width: 50, height: 70 }),
        getCardPos: () => ({ x: 0, y: 0 }),
        cardWidth: 50,
        cardHeight: 70,
        cardBackPath: harness.path,
      };
    },
  };
}

export function mockStateManagerModule() {
  const actual = jest.requireActual<{
    useStateManager: (props: Record<string, unknown>) => unknown;
  }>("@/hooks/useStateManager");
  return {
    ...actual,
    useStateManager: (props: Record<string, unknown>) => {
      const manager = actual.useStateManager(
        harness.fixture === undefined
          ? props
          : {
              ...props,
              gameStateInitial: harness.fixture,
              resetAndSetup: noopSetup,
              postSetupAction: undefined,
            },
      );
      harness.stateManager = manager as typeof harness.stateManager;
      return manager;
    },
  };
}

export function mockDragDropModule() {
  const actual = jest.requireActual<{
    useDragDrop: (options: DragOptions) => {
      makeDragHandlers?: MakeDragHandlers;
    };
  }>("@/hooks/useDragDrop");
  let renderCount = 0;
  let recordedRender = -1;
  return {
    ...actual,
    useDragDrop: (options: DragOptions) => {
      harness.dragOptions = options;
      const result = actual.useDragDrop(options);
      const render = ++renderCount;
      const { makeDragHandlers } = result;
      if (!makeDragHandlers) return result;
      // A fresh wrapper each render makes games rebuild their handlers, so the
      // recorded sources always match the cards on the table.
      return {
        ...result,
        makeDragHandlers: (source: unknown, ...rest: unknown[]) => {
          if (recordedRender !== render) {
            harness.dragSources = [];
            recordedRender = render;
          }
          harness.dragSources.push(source);
          return makeDragHandlers(source, ...rest);
        },
      };
    },
  };
}

export function mockExpoRouterModule() {
  return {
    usePathname: () => harness.path,
    useLocalSearchParams: () => ({}),
    useNavigation: () => ({ setOptions: () => {} }),
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      dismissTo: jest.fn(),
      canGoBack: () => false,
    },
    Link: ({ children }: { children?: React.ReactNode }) => children ?? null,
  };
}

// ── Rendering and time ─────────────────────────────────────────────────────

/** Let deals, animations and delays finish (fake timers must be on). */
export async function settle(rounds = 40) {
  for (let round = 0; round < rounds; round += 1) {
    await act(async () => {
      jest.advanceTimersByTime(250);
    });
  }
}

/**
 * Render a game. With a fixture it starts from that position (no deal);
 * without one it deals normally.
 */
export async function renderGame(
  path: string,
  Game: React.ComponentType,
  fixture?: unknown,
) {
  // The previous test's game would otherwise stay mounted, and games that
  // remount when a setting changes would pick up this test's fixture.
  if (harness.renderer) {
    const previous = harness.renderer;
    harness.renderer = null;
    await act(async () => previous.unmount());
  }
  harness.path = path;
  harness.fixture = fixture;
  harness.wrapperProps = null;
  harness.mapConfig = null;
  harness.dragOptions = null;
  harness.dragSources = [];
  harness.stateManager = null;

  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<Game />);
  });
  harness.renderer = renderer;
  await settle();
  return renderer;
}

/**
 * Renders a game that bundles classic variants (see GAME_VARIANTS) as the
 * given variant. The setting is saved first, as the game menu would.
 */
export async function renderVariant(
  path: string,
  variant: string,
  Game: React.ComponentType,
  fixture?: unknown,
) {
  await setGameSettings(path, { variant });
  return renderGame(path, Game, fixture);
}

/** Taps "Auto-complete" on the offer panel, which must be showing. */
export async function acceptAutoCompleteOffer() {
  const offer = getAutoCompleteOffer();
  if (!offer) throw new Error("No auto-complete offer is showing");
  await act(async () => offer.start());
  await settle();
}

export function outcome() {
  return harness.wrapperProps?.outcome;
}

// ── Interacting ────────────────────────────────────────────────────────────

/** Every card as CardMap would map it, in zone order. */
export function mappedCards(): MappedCard[] {
  const zones = harness.mapConfig?.zones ?? [];
  return zones.flatMap((zone) =>
    (zone.cards ?? []).map((card, cardIndex, cards) => ({
      card,
      cardIndex,
      zoneId: zone.id,
      zoneName: zone.name,
      pileIndex: zone.pileIndex,
      refIndex: zone.refIndex,
      x: 0,
      y: 0,
      zIndex: 0,
      rotation: zone.rotation,
      clickThroughCards: zone.clickThroughCards,
      topOfZone: cardIndex === cards.length - 1,
    })),
  );
}

function describeCard(card: MappedCard) {
  return `${card.card.rank} of ${card.card.suit} (${card.zoneId} #${card.cardIndex})`;
}

type PressOptions = {
  /**
   * Let timers run after the press (default). Pass false for the first tap of
   * a double-tap, which must land before the double-tap window passes.
   */
  settle?: boolean;
};

/** Press the first card matching `match`, through the game's handler. */
export async function pressCard(
  match: (card: MappedCard) => boolean,
  { settle: shouldSettle = true }: PressOptions = {},
) {
  const target = mappedCards().find(match);
  if (!target) throw new Error("No card matches");
  const onPress = harness.mapConfig?.cardMapper(target)?.onPress;
  if (!onPress) throw new Error(`${describeCard(target)} has no press handler`);
  await act(async () => {
    onPress();
  });
  if (shouldSettle) await settle();
}

/** Press the card with this id. */
export function pressCardId(id: string, options?: PressOptions) {
  return pressCard((card) => card.card.id === id, options);
}

/** Double-tap the card with this id. */
export async function doubleTapCardId(id: string) {
  await pressCardId(id, { settle: false });
  await pressCardId(id);
}

/** Press a zone's background (e.g. an empty pile or the stock). */
export async function pressZone(match: (zone: MapZone) => boolean) {
  const zone = harness.mapConfig?.zones.find(match);
  if (!zone) throw new Error("No zone matches");
  const onPress = harness.mapConfig?.zoneMapper?.(zone)?.onPress;
  if (!onPress) throw new Error(`Zone ${zone.id} has no press handler`);
  await act(async () => {
    onPress();
  });
  await settle();
}

/**
 * Change a game's settings as the game menu does: saved, and broadcast to the
 * game on screen (if any), which picks them up without a reset.
 */
export async function setGameSettings(
  path: string,
  updates: Partial<GameSettings>,
) {
  let updateSettings!: (updates: Partial<GameSettings>) => Promise<void>;
  function SettingsMenu() {
    updateSettings = useGameSettings(path).updateSettings;
    return null;
  }
  let menu!: ReactTestRenderer;
  await act(async () => {
    menu = create(<SettingsMenu />);
  });
  await act(async () => {
    await updateSettings(updates);
  });
  await act(async () => {
    menu.unmount();
  });
  await settle();
}

/**
 * Tap a zone where a finger would: on its top card when that card takes the
 * tap, or through to the zone when the cards let taps through. Fails when the
 * top card swallows the tap (no handler, not click-through), as on a device.
 */
export async function tapZone(match: (zone: MapZone) => boolean) {
  const zone = harness.mapConfig?.zones.find(match);
  if (!zone) throw new Error("No zone matches");
  const topCard = mappedCards().find(
    (card) => card.zoneId === zone.id && card.topOfZone,
  );
  if (topCard) {
    const mapping = harness.mapConfig?.cardMapper(topCard);
    if (mapping?.onPress) {
      await pressCard((card) => card === topCard);
      return;
    }
    if (!mapping?.clickThroughCards && !topCard.clickThroughCards) {
      throw new Error(`${describeCard(topCard)} blocks taps on ${zone.id}`);
    }
  }
  await pressZone((candidate) => candidate === zone);
}

/**
 * Tap a draggable card (a drag source, as the game passes it to
 * makeDragHandlers) through the game's tap handler, as a tap on its drag
 * handle does.
 */
export async function tapSource(
  source: unknown,
  { settle: shouldSettle = true }: PressOptions = {},
) {
  const onTap = harness.dragOptions?.getTapHandler?.(source);
  if (!onTap) throw new Error(`${JSON.stringify(source)} has no tap handler`);
  await act(async () => {
    onTap();
  });
  if (shouldSettle) await settle();
}

/** Ids of the cards currently drawn as selected. */
export function selectedCardIds() {
  return mappedCards()
    .filter((card) => harness.mapConfig?.cardMapper(card)?.isSelected)
    .map((card) => card.card.id);
}

/**
 * Complete a drag from `source` to `target`: the game's own drop rule must
 * allow it, then its drop handler runs, as when a real drag is released.
 */
export async function dropMove(source: unknown, target: unknown) {
  const options = harness.dragOptions;
  if (!options) throw new Error("This game has no drag and drop");
  if (!options.canDropOnTarget(source, target)) {
    throw new Error(
      `Drop not allowed: ${JSON.stringify(source)} -> ${JSON.stringify(target)}`,
    );
  }
  await act(async () => {
    await options.onSuccessfulDrop(source, target);
  });
  await settle();
}

function findPressable(renderer: ReactTestRenderer, label: string) {
  return renderer.root.findAll(
    (node: ReactTestInstance) =>
      typeof node.props.onPress === "function" &&
      ((typeof node.props.text === "string" &&
        node.props.text.split("\n")[0] === label) ||
        node.props.accessibilityLabel === label),
  )[0];
}

/**
 * Press a Button (or labelled pressable) by its accessibility label or the
 * first line of its text, e.g. "Search" for "Search\n(Draw 2)".
 */
export async function pressButton(renderer: ReactTestRenderer, label: string) {
  const button = findPressable(renderer, label);
  if (!button) throw new Error(`No button labelled "${label}"`);
  await act(async () => {
    button.props.onPress();
  });
  await settle();
}

// ── Fixtures ───────────────────────────────────────────────────────────────

let cardCount = 0;

/** A card for fixtures, e.g. card("Q", "hearts"). */
export function card(
  rank: CardRank,
  suit: CardSuit,
  faceUp = true,
): PlayingCard {
  cardCount += 1;
  return { id: `${suit}-${rank}-t${cardCount}`, rank, suit, faceUp };
}

const RUN_RANKS: CardRank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

/** Cards of one suit from `from` to `to` inclusive, e.g. a foundation A–Q. */
export function run(
  suit: CardSuit,
  from: CardRank = "A",
  to: CardRank = "K",
  faceUp = true,
): PlayingCard[] {
  const start = RUN_RANKS.indexOf(from);
  const end = RUN_RANKS.indexOf(to);
  const step = start <= end ? 1 : -1;
  const cards: PlayingCard[] = [];
  for (let index = start; index !== end + step; index += step) {
    cards.push(card(RUN_RANKS[index], suit, faceUp));
  }
  return cards;
}
