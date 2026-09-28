/**
 * The shared rhythm of the full-screen reward reveals after a Campaign win
 * (a Tao chapter, a quote): each has its own animation, but the same pause
 * before it opens, the same fades in and out, and the same hold once its
 * last animation has finished.
 */
export const REVEAL_TIMING = {
  /** The win box shows alone this long before the reveal starts. */
  delayMs: 2000,
  /** The reveal's backdrop fades in over this. */
  fadeInMs: 1500,
  /** Everything stays up this long after the last animation ends. */
  holdMs: 4000,
  /** And fades out over this. */
  fadeOutMs: 2400,
} as const;
