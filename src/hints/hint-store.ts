import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTOPILOT_SESSIONS_STORAGE_KEY } from "@/data/storage-keys";
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Hint, HintTarget } from "./hint";

/**
 * The open game's hint finder and the hint on screen. A game registers its
 * finder with useHint; the header's UFO asks it for a hint (requestHint), and
 * HintUfo shows it: beacons on the board, or the UFO flying out to play it.
 * The card map tells HintUfo where targets are on screen and taps them for it
 * (setHintBoard). Only one game is ever open, so one of each is enough, as
 * for the auto-complete offer.
 */

type HintFinder = () => Hint | null;

/** How a hint is shown: beacons only, or the UFO playing it (Autopilot). */
export type HintShowMode = "beacons" | "autopilot";

export type ActiveHint = {
  hint: Hint;
  /** New for every press, so pressing again replays the highlights. */
  id: number;
  mode: HintShowMode;
};

/** Where a hint target is on screen (window coordinates), and how big. */
export type HintSpot = { x: number; y: number; size: number };

/** The card map on screen, as HintUfo sees it. */
export type HintBoard = {
  /** Where a target is on screen now, or null if it isn't on the board. */
  locate: (target: HintTarget) => HintSpot | null;
  /** Taps a target as a player would; false when nothing takes the tap. */
  tap: (target: HintTarget, hint: Hint) => boolean;
  /** Measures the board again (it may have moved since it was laid out). */
  measure: () => Promise<void>;
};

let finder: HintFinder | null = null;
let activeHint: ActiveHint | null = null;
/** The last press of the header's UFO, found hint or not. */
let lastCall: { id: number; hint: Hint | null; mode: HintShowMode } | null =
  null;
let board: HintBoard | null = null;
let nextHintId = 1;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Clears the hint on screen (all of them, or only `id` if it's still up). */
export function clearActiveHint(id?: number) {
  if (!activeHint || (id !== undefined && activeHint.id !== id)) return;
  activeHint = null;
  notify();
}

/**
 * Finds a hint for the game on screen and shows it. Returns it, or null when
 * the game has no hint for this position (or no hints at all).
 */
export function requestHint(mode: HintShowMode = "beacons"): Hint | null {
  let hint: Hint | null = null;
  try {
    hint = finder?.() ?? null;
  } catch (error) {
    // A hint is a nicety: a bug in one must never break the game.
    if (__DEV__) console.warn("Hint finder failed", error);
  }
  if (hint && hint.steps.length === 0) hint = null;
  const id = nextHintId++;
  activeHint = hint ? { hint, id, mode } : null;
  lastCall = { id, hint, mode };
  notify();
  return hint;
}

export function getLastHintCall() {
  return lastCall;
}

/** The last press of the header's UFO, so HintUfo can answer it. */
export function useLastHintCall() {
  return useSyncExternalStore(subscribe, getLastHintCall, getLastHintCall);
}

/** The card map registers itself; returns a function that unregisters it. */
export function setHintBoard(next: HintBoard) {
  board = next;
  return () => {
    if (board === next) board = null;
  };
}

export function getHintBoard() {
  return board;
}

export function hasHintFinder() {
  return finder !== null;
}

/** Whether the game on screen has hints. */
export function useHasHintFinder() {
  return useSyncExternalStore(subscribe, hasHintFinder, hasHintFinder);
}

export function getActiveHint() {
  return activeHint;
}

/** The hint on screen, if any. */
export function useActiveHint() {
  return useSyncExternalStore(subscribe, getActiveHint, getActiveHint);
}

/**
 * Gives the game's hints to the header's UFO. `findHint` reads the game as it
 * is when the button is pressed, so nothing runs on ordinary moves. Return
 * null when there's no move worth showing. The hint on screen goes away as
 * soon as `game` changes (a move, undo or a new deal).
 */
export function useHint(
  findHint: () => Hint | null,
  { game, enabled = true }: { game: unknown; enabled?: boolean },
) {
  const findHintRef = useRef(findHint);
  findHintRef.current = findHint;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const ownFinder: HintFinder = () =>
      enabledRef.current ? findHintRef.current() : null;
    finder = ownFinder;
    notify();
    return () => {
      if (finder !== ownFinder) return;
      finder = null;
      activeHint = null;
      lastCall = null;
      notify();
    };
  }, []);

  useEffect(() => {
    clearActiveHint();
  }, [game]);
}

// —— The UFO's dock and flight ————————————————————————————————————————

let dockMeasurer: (() => Promise<HintSpot | null>) | null = null;
let ufoOut = false;
let ufoHovering = false;

/**
 * The header's UFO button registers how to find it on screen, so the flying
 * UFO can leave from it and come back to it.
 */
export function setHintDock(measure: () => Promise<HintSpot | null>) {
  dockMeasurer = measure;
  return () => {
    if (dockMeasurer === measure) dockMeasurer = null;
  };
}

export function measureHintDock() {
  return dockMeasurer?.() ?? Promise.resolve(null);
}

/** While the UFO is out flying, the header hides its button. */
export function setHintUfoOut(out: boolean) {
  if (ufoOut === out) return;
  ufoOut = out;
  notify();
}

function getHintUfoOut() {
  return ufoOut;
}

export function useHintUfoOut() {
  return useSyncExternalStore(subscribe, getHintUfoOut, getHintUfoOut);
}

/**
 * While beacons are lit, the UFO hovers over its button (Beacons mode): the
 * header hides the button's icon, but the button still takes presses.
 */
export function setHintUfoHovering(hovering: boolean) {
  if (ufoHovering === hovering) return;
  ufoHovering = hovering;
  notify();
}

function getHintUfoHovering() {
  return ufoHovering;
}

export function useHintUfoHovering() {
  return useSyncExternalStore(
    subscribe,
    getHintUfoHovering,
    getHintUfoHovering,
  );
}

// —— Autopilot wins ———————————————————————————————————————————————

/**
 * Game sessions (deals) Autopilot played a move in. A win in one doesn't
 * count: no stats, no daily win, no Odyssey progress. Saved, so a deal
 * resumed after the app was closed is still known; only the latest
 * AUTOPILOT_SESSIONS_KEPT are kept (an old deal can't be resumed anyway).
 */
export const AUTOPILOT_SESSIONS_KEPT = 50;
let autopilotSessions: string[] = [];

/** Reads the saved sessions; called once at startup. */
export async function loadAutopilotSessions() {
  try {
    const saved = JSON.parse(
      (await AsyncStorage.getItem(AUTOPILOT_SESSIONS_STORAGE_KEY)) ?? "[]",
    ) as unknown;
    const ids = Array.isArray(saved)
      ? saved.filter((id): id is string => typeof id === "string")
      : [];
    // Anything marked while loading stays marked.
    autopilotSessions = [...new Set([...ids, ...autopilotSessions])].slice(
      -AUTOPILOT_SESSIONS_KEPT,
    );
  } catch {
    // Unreadable: start afresh rather than block the game.
  }
  return autopilotSessions;
}

export async function markAutopilotSession(sessionId: string | undefined) {
  if (!sessionId || autopilotSessions.includes(sessionId)) return;
  autopilotSessions = [...autopilotSessions, sessionId].slice(
    -AUTOPILOT_SESSIONS_KEPT,
  );
  try {
    await AsyncStorage.setItem(
      AUTOPILOT_SESSIONS_STORAGE_KEY,
      JSON.stringify(autopilotSessions),
    );
  } catch {
    // Still known while the app runs.
  }
}

export function isAutopilotSession(sessionId: string | undefined) {
  return !!sessionId && autopilotSessions.includes(sessionId);
}
