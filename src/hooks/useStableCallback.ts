import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * A function with a stable identity that always calls the latest `fn`, so it
 * can be passed to a memoized child without re-rendering it on every change.
 * Only call it from event handlers, not during render.
 */
export function useStableCallback<A extends unknown[], R>(
  fn: (...args: A) => R,
) {
  const fnRef = useRef(fn);

  useLayoutEffect(() => {
    fnRef.current = fn;
  });

  return useCallback((...args: A) => fnRef.current(...args), []);
}
