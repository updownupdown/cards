import { useState, useCallback } from "react";

export function useUndoHistory<T>(maxHistory: number = 10) {
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

  const undo = useCallback((): T | undefined => {
    if (history.length === 0) return undefined;

    const previousState = history[history.length - 1];

    setHistory((prevHistory) => prevHistory.slice(0, -1));

    return previousState;
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    saveUndoState,
    undo,
    canUndo: history.length > 0,
    clearHistory,
  };
}
