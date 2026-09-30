import { useEffect, useRef, useState } from "react";

/** The physics step, in milliseconds: 60 steps a second on every screen. */
export const STEP_MS = 1000 / 60;
/** Steps run at most per frame, so a stalled frame never snowballs. */
const MAX_STEPS_PER_FRAME = 4;

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

/**
 * Runs `step` at a fixed STEP_MS, as often as the frames allow, and redraws
 * after each frame that stepped. The game's state is mutable and read while
 * rendering, so components using this opt out of the compiler's memoizing
 * ("use no memo").
 */
export function useGameLoop(step: (dtMs: number) => void, running = true) {
  const [, setFrame] = useState(0);
  const stepRef = useRef(step);

  useEffect(() => {
    stepRef.current = step;
  });

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = now();
    let pending = 0;

    const tick = () => {
      const time = now();
      // A long pause (the app in the background) resumes where it left off.
      pending += Math.min(time - last, 100);
      last = time;
      let steps = 0;
      while (pending >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        stepRef.current(STEP_MS);
        pending -= STEP_MS;
        steps += 1;
      }
      if (steps === MAX_STEPS_PER_FRAME) pending = 0;
      if (steps > 0) setFrame((count) => (count + 1) % 1_000_000);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);
}

export { now };
