import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "expo-router";
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

const activeGameSessionIds = new Map<string, string>();

function createGameSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getActiveGameSessionId(pathname: string) {
  return activeGameSessionIds.get(normalizeGamePath(pathname));
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
  const pathname = normalizeGamePath(usePathname());
  const { settings: globalSettings, isLoading: isGlobalSettingsLoading } =
    useGlobalSettings();

  // —— Game State ————————————————————————
  const [game, setGame] = useImmer<T>(gameStateInitial);

  // —— Game Loading ————————————————————————
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(true);

  useEffect(() => {
    // Delay rendering heavy components so the UI can mount and fade in first.
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // —— Initiate First Deal ————————————————————————
  const hasDealtRef = useRef(false);
  const [isResumeHydrated, setIsResumeHydrated] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const isDev = isLocalDevEnvironment();

  const startSession = useCallback(
    (sessionId = createGameSessionId()) => {
      sessionIdRef.current = sessionId;
      activeGameSessionIds.set(pathname, sessionId);
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

      if (session && session.path === pathname) {
        startSession(session.sessionId);
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
  }

  useEffect(() => {
    if (!isResumeHydrated || hasDealtRef.current) {
      return;
    }

    firstDeal();
  }, [isResumeHydrated, resetAndSetup]);

  useEffect(() => {
    if (!isGamePath(pathname)) return;
    if (!globalSettings.resumeLastGame) return;
    if (isSettingUp) return;

    const timer = setTimeout(() => {
      const sessionId = sessionIdRef.current;
      if (sessionId) {
        void saveLastGameSession(pathname, game, sessionId);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [game, globalSettings.resumeLastGame, isSettingUp, pathname]);

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
