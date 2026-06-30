import { useCallback, useEffect, useRef, useState } from "react";
import { useGameSettings } from "./useGameSettings";
import { usePathname } from "expo-router";
import { normalizeGamePath } from "@/data/game-menu";
import { useImmer } from "use-immer";

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

  const pathname = normalizeGamePath(usePathname());
  const { settings: gameSettings } = useGameSettings(pathname);

  useEffect(() => {
    if (gameSettings?.showIntro !== undefined) {
      setShowIntro(gameSettings?.showIntro);
    }
  }, [gameSettings]);

  // —— Initiate First Deal ————————————————————————
  const hasDealtRef = useRef(false);

  async function firstDeal() {
    hasDealtRef.current = true;
    await resetAndSetup();
    await postSetupAction?.();
    setIsSettingUp(false);
  }

  useEffect(() => {
    if (showIntro || hasDealtRef.current) return;
    firstDeal();
  }, [showIntro, resetAndSetup]);

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
    setGame((draft) => {
      if (
        typeof draft === "object" &&
        draft !== null &&
        "ended" in draft &&
        "won" in draft
      ) {
        draft.ended = false;
        draft.won = false;
      }
    });
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
