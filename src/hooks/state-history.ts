export const MAX_UNDO_HISTORY = 10;

export function appendUndoState<T>(
  history: readonly T[],
  state: T,
  maxHistory = MAX_UNDO_HISTORY,
) {
  return [...history, state].slice(-maxHistory);
}

export function popUndoState<T>(history: readonly T[]) {
  if (history.length === 0) {
    return { previousState: undefined, history: [] as T[] };
  }

  return {
    previousState: history[history.length - 1],
    history: history.slice(0, -1),
  };
}
