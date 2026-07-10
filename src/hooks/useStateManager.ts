import { useCallback, useEffect, useRef, useState } from "react";
import { useGameSettings } from "./useGameSettings";
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

const maxHistory = 10;

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
  const { settings: gameSettings } = useGameSettings(pathname);

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

  const [showIntro, setShowIntro] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (
      gameSettings?.showIntro === undefined ||
      globalSettings?.showIntros === undefined
    ) {
      return;
    }

    setShowIntro(gameSettings?.showIntro && globalSettings?.showIntros);
  }, [gameSettings, globalSettings?.showIntros]);

  // —— Initiate First Deal ————————————————————————
  const hasDealtRef = useRef(false);
  const [isResumeHydrated, setIsResumeHydrated] = useState(false);
  const isDev = isLocalDevEnvironment();

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
        setGame(session.state);
        hasDealtRef.current = true;
        setShowIntro(false);
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
  ]);

  async function firstDeal() {
    hasDealtRef.current = true;
    await resetAndSetup();
    await postSetupAction?.();
    setIsSettingUp(false);
  }

  useEffect(() => {
    if (
      !isResumeHydrated ||
      showIntro === undefined ||
      showIntro ||
      hasDealtRef.current
    ) {
      return;
    }

    firstDeal();
  }, [isResumeHydrated, showIntro, resetAndSetup]);

  useEffect(() => {
    if (!isGamePath(pathname)) return;
    if (!globalSettings.resumeLastGame) return;
    if (isSettingUp) return;

    const timer = setTimeout(() => {
      void saveLastGameSession(pathname, game);
    }, 350);

    return () => clearTimeout(timer);
  }, [game, globalSettings.resumeLastGame, isSettingUp, pathname]);

  // —— Undo ————————————————————————
  const [history, setHistory] = useState<T[]>([]);

  const saveUndoState = useCallback(
    (stateToSave: T) => {
      setHistory((prevHistory) => {
        const newHistory = [...prevHistory, stateToSave];
        return newHistory.slice(-maxHistory);
      });
    },
    [maxHistory],
  );

  const prevState = useCallback((): T | undefined => {
    if (history.length === 0) return undefined;

    const previousState = history[history.length - 1];

    setHistory((prevHistory) => prevHistory.slice(0, -1));

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
    showIntro,
    setShowIntro,
    game,
    setGame,
  };
}
