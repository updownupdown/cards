import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useGamePath } from "./useGamePath";
import {
  isGamePath,
  loadLastGameSession,
  normalizeGamePath,
  saveLastGameSession,
} from "@/data/game-menu";
import { useImmer } from "use-immer";
import { useGlobalSettings } from "./useGlobalSettings";
import { isLocalDevEnvironment } from "@/utils/utils";
import { appendUndoState, popUndoState } from "./state-history";
import { AppState } from "react-native";

const SESSION_SAVE_DELAY_MS = 2000;

const activeGameSessionIds = new Map<string, string>();

function createGameSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getActiveGameSessionId(pathname: string) {
  return activeGameSessionIds.get(normalizeGamePath(pathname));
}

// —— Play clock ————————————————————————
// Active play time per game session, for the fastest-win stat. It runs from
// the end of the deal and pauses while the app is in the background. A session
// resumed from storage isn't timed, since its earlier play time wasn't saved.

type PlayClock = {
  sessionId: string;
  timed: boolean;
  started: boolean;
  elapsedMs: number;
  runningSince: number | null;
};

const playClocks = new Map<string, PlayClock>();
let playClockAppStateSubscription: { remove: () => void } | null = null;

function watchAppStateForPlayClocks() {
  if (playClockAppStateSubscription) return;

  playClockAppStateSubscription = AppState.addEventListener(
    "change",
    (state) => {
      const now = Date.now();
      for (const clock of playClocks.values()) {
        if (!clock.started) continue;
        if (state === "active") {
          clock.runningSince ??= now;
        } else if (clock.runningSince !== null) {
          clock.elapsedMs += now - clock.runningSince;
          clock.runningSince = null;
        }
      }
    },
  );
}

function createPlayClock(pathname: string, sessionId: string, timed: boolean) {
  playClocks.set(normalizeGamePath(pathname), {
    sessionId,
    timed,
    started: false,
    elapsedMs: 0,
    runningSince: null,
  });
}

function startPlayClock(pathname: string, sessionId: string | null) {
  const clock = playClocks.get(normalizeGamePath(pathname));
  if (!clock || clock.sessionId !== sessionId || clock.started) return;

  watchAppStateForPlayClocks();
  clock.started = true;
  clock.runningSince = AppState.currentState === "active" ? Date.now() : null;
}

/** Active play time of the game's current session, or null if not timed. */
export function getSessionPlayTimeMs(pathname: string): number | null {
  const clock = playClocks.get(normalizeGamePath(pathname));
  if (!clock?.timed || !clock.started) return null;

  const running =
    clock.runningSince === null ? 0 : Date.now() - clock.runningSince;
  return clock.elapsedMs + running;
}

/**
 * Guards against a persisted session saved under an older/incompatible state
 * shape (e.g. a mid-save write, or a schema change) crashing the game on
 * resume - only trust a saved session that has every top-level key the
 * current game's initial state expects.
 */
function hasExpectedShape<T>(state: unknown, initial: T): state is T {
  if (typeof state !== "object" || state === null) return false;
  if (typeof initial !== "object" || initial === null) return true;

  return Object.keys(initial).every((key) => key in state);
}

type Props<T> = {
  gameStateInitial: T;
  resetNonGameStates?: () => void;
  resetAndSetup: () => Promise<void>;
  postSetupAction?: () => Promise<void>;
};

export function useStateManager<T>({
  gameStateInitial,
  resetNonGameStates,
  resetAndSetup,
  postSetupAction,
}: Props<T>) {
  const pathname = useGamePath();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const launchMode = mode === "nodes" ? "nodes" : "standard";
  const { settings: globalSettings, isLoading: isGlobalSettingsLoading } =
    useGlobalSettings();

  // —— Game State ————————————————————————
  const [game, setGame] = useImmer<T>(gameStateInitial);

  // —— Game Loading ————————————————————————
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(true);

  useEffect(() => {
    // Let the UI mount and paint one frame before rendering heavy components
    // (a fixed 150ms wait here used to delay every game open).
    const frame = requestAnimationFrame(() => {
      setIsLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // —— Initiate First Deal ————————————————————————
  const hasDealtRef = useRef(false);
  const [isResumeHydrated, setIsResumeHydrated] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const isDev = isLocalDevEnvironment();

  const startSession = useCallback(
    (sessionId = createGameSessionId(), timed = true) => {
      sessionIdRef.current = sessionId;
      activeGameSessionIds.set(pathname, sessionId);
      createPlayClock(pathname, sessionId, timed);
    },
    [pathname],
  );

  useEffect(() => {
    if (isGlobalSettingsLoading) {
      return;
    }

    if (!isGamePath(pathname) || !globalSettings.resumeLastGame || isDev) {
      setIsResumeHydrated(true);
      return;
    }

    let active = true;

    (async () => {
      const session = await loadLastGameSession<T>();
      if (!active) return;

      if (
        session &&
        session.path === pathname &&
        session.launchMode === launchMode &&
        hasExpectedShape(session.state, gameStateInitial)
      ) {
        startSession(session.sessionId, false);
        setGame(session.state);
        hasDealtRef.current = true;
        setIsSettingUp(false);
      }

      setIsResumeHydrated(true);
    })();

    return () => {
      active = false;
    };
  }, [
    globalSettings.resumeLastGame,
    isGlobalSettingsLoading,
    launchMode,
    pathname,
    setGame,
    startSession,
  ]);

  async function firstDeal() {
    hasDealtRef.current = true;
    startSession();
    await resetAndSetup();
    await postSetupAction?.();
    setIsSettingUp(false);
    startPlayClock(pathname, sessionIdRef.current);
  }

  useEffect(() => {
    if (!isResumeHydrated || hasDealtRef.current) {
      return;
    }

    firstDeal();
  }, [isResumeHydrated, resetAndSetup]);

  // Each save serializes the whole game, so save once play pauses rather than
  // after every move, and right away when the app is backgrounded (where it
  // may be closed). Leaving the game doesn't save: that clears the session.
  const pendingSaveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isGamePath(pathname)) return;
    if (!globalSettings.resumeLastGame) return;
    if (isSettingUp) return;

    const save = () => {
      pendingSaveRef.current = null;
      const sessionId = sessionIdRef.current;
      if (sessionId) {
        void saveLastGameSession(pathname, game, sessionId, launchMode);
      }
    };
    pendingSaveRef.current = save;
    const timer = setTimeout(save, SESSION_SAVE_DELAY_MS);

    return () => {
      clearTimeout(timer);
      if (pendingSaveRef.current === save) pendingSaveRef.current = null;
    };
  }, [game, globalSettings.resumeLastGame, isSettingUp, launchMode, pathname]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") pendingSaveRef.current?.();
    });
    return () => subscription.remove();
  }, []);

  // —— Animation Lock ————————————————————————
  const isAnimatingRef = useRef(false);

  const withAnimation = useCallback(async (fn: () => Promise<void>) => {
    isAnimatingRef.current = true;
    try {
      await fn();
    } finally {
      isAnimatingRef.current = false;
    }
  }, []);

  // —— Undo ————————————————————————
  const [history, setHistory] = useState<T[]>([]);

  const saveUndoState = useCallback((stateToSave: T) => {
    setHistory((prevHistory) => appendUndoState(prevHistory, stateToSave));
  }, []);

  const prevState = useCallback((): T | undefined => {
    const { previousState, history: nextHistory } = popUndoState(history);
    if (previousState === undefined) return undefined;
    setHistory(nextHistory);
    return previousState;
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const undo = useCallback(() => {
    const previousState = prevState();
    if (previousState) {
      setGame(previousState);
      if (resetNonGameStates) {
        resetNonGameStates();
      }
    }
  }, [prevState, setGame, resetNonGameStates]);

  // —— Reset ————————————————————————
  async function reset() {
    isAnimatingRef.current = false;
    startSession();
    setIsSettingUp(true);
    clearHistory();
    resetNonGameStates?.();
    await resetAndSetup();
    await postSetupAction?.();
    setIsSettingUp(false);
    startPlayClock(pathname, sessionIdRef.current);
  }

  return {
    isSettingUp,
    reset,
    saveUndoState,
    undo,
    canUndo: history.length > 0,
    isLoaded,
    game,
    setGame,
    isAnimatingRef,
    withAnimation,
  };
}
