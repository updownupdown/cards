import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useGamePath } from "./useGamePath";
import {
  isCampaignModeParam,
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
import { useGameSettings } from "./useGameSettings";
import {
  getDefaultVariant,
  isVariantGamePath,
  pickVariant,
} from "@/data/game-variants";

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
// resumed from storage carries on from the play time saved with it; one saved
// without a play time isn't timed.

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

function createPlayClock(
  pathname: string,
  sessionId: string,
  timed: boolean,
  elapsedMs = 0,
) {
  playClocks.set(normalizeGamePath(pathname), {
    sessionId,
    timed,
    started: false,
    elapsedMs,
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
  const launchMode = isCampaignModeParam(mode) ? "campaign" : "standard";
  const { settings: globalSettings, isLoading: isGlobalSettingsLoading } =
    useGlobalSettings();
  // Games with classic variants mount once their settings have loaded, and
  // again when the variant changes, so the variant at mount is the one dealt.
  // Sessions remember it, and only resume under the same variant.
  const normalizedPath = normalizeGamePath(pathname);
  const { settings: gameSettings } = useGameSettings(pathname);
  const variantRef = useRef<string | undefined>(undefined);
  if (variantRef.current === undefined && isVariantGamePath(normalizedPath)) {
    variantRef.current = pickVariant(normalizedPath, gameSettings?.variant);
  }
  const variant = variantRef.current;

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
    (
      sessionId = createGameSessionId(),
      /** Play time already spent; null means the session isn't timed. */
      playTimeMs: number | null = 0,
    ) => {
      sessionIdRef.current = sessionId;
      activeGameSessionIds.set(pathname, sessionId);
      createPlayClock(
        pathname,
        sessionId,
        playTimeMs !== null,
        playTimeMs ?? 0,
      );
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
        (session.variant ?? getDefaultVariant(normalizedPath)) ===
          (variant ?? "") &&
        hasExpectedShape(session.state, gameStateInitial)
      ) {
        startSession(session.sessionId, session.playTimeMs);
        setGame(session.state);
        hasDealtRef.current = true;
        setIsSettingUp(false);
        startPlayClock(pathname, session.sessionId);
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
        void saveLastGameSession(
          pathname,
          game,
          sessionId,
          launchMode,
          getSessionPlayTimeMs(pathname),
          variant,
        );
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
    clearUndoHistory: clearHistory,
    undo,
    canUndo: history.length > 0,
    isLoaded,
    game,
    setGame,
    isAnimatingRef,
    withAnimation,
  };
}
