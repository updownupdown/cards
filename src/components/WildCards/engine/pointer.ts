/** How long a pointer's past positions are kept. */
const HISTORY_MS = 400;

export type PointerSample = { x: number; y: number; t: number };

/**
 * A finger's recent path, in world units, for reading a flick: its speed
 * and direction over the last moments, and how steady they were.
 */
export class PointerTrack {
  samples: PointerSample[] = [];

  constructor(x: number, y: number, t: number) {
    this.samples.push({ x, y, t });
  }

  add(x: number, y: number, t: number) {
    // A finger lifted where it last moved adds nothing: the lift often comes
    // a moment after the last move, which would read as a sudden stop.
    const last = this.last;
    if (last.x === x && last.y === y) return;
    this.samples.push({ x, y, t });
    while (this.samples.length > 2 && t - this.samples[0].t > HISTORY_MS) {
      this.samples.shift();
    }
  }

  get last() {
    return this.samples[this.samples.length - 1];
  }

  /** Whether the finger had stopped by `t`: held still, not flicked. */
  stoppedBy(t: number, ms = 90) {
    return t - this.last.t > ms;
  }

  /** The samples within the last `windowMs`, with at least two kept. */
  recent(windowMs: number) {
    const end = this.last.t;
    const kept = this.samples.filter((sample) => end - sample.t <= windowMs);
    return kept.length >= 2 ? kept : this.samples.slice(-2);
  }

  /** Average velocity over the last `windowMs`, in units per millisecond. */
  velocity(windowMs = 90) {
    const kept = this.recent(windowMs);
    const first = kept[0];
    const last = kept[kept.length - 1];
    const dt = Math.max(1, last.t - first.t);
    return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
  }

  /** Where the finger was at time `t`, between the samples around it. */
  positionAt(t: number) {
    const samples = this.samples;
    if (t <= samples[0].t) return samples[0];
    for (let i = 1; i < samples.length; i++) {
      const b = samples[i];
      if (b.t >= t) {
        const a = samples[i - 1];
        const k = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1;
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, t };
      }
    }
    return this.last;
  }

  /**
   * How steady the motion was over the last `windowMs`: the speeds of its
   * parts vary this much (a coefficient of variation; 0 is perfectly even),
   * and its heading turns this far (radians, summed). The path is cut into
   * equal slices of time, so touch events arriving in bursts (as they do)
   * don't look like jerks.
   */
  steadiness(windowMs = 260, slices = 5) {
    const end = this.last.t;
    const start = Math.max(this.samples[0].t, end - windowMs);
    const duration = end - start;
    if (duration <= 0) {
      return { meanSpeed: 0, variation: 0, turn: 0, duration: 0 };
    }
    const points = Array.from({ length: slices + 1 }, (_, i) =>
      this.positionAt(start + (duration * i) / slices),
    );
    const sliceMs = duration / slices;
    const speeds: number[] = [];
    const headings: number[] = [];
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      speeds.push(Math.hypot(dx, dy) / sliceMs);
      if (Math.hypot(dx, dy) > 0.5) headings.push(Math.atan2(dy, dx));
    }
    const mean = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
    const variance =
      speeds.reduce((sum, s) => sum + (s - mean) ** 2, 0) / speeds.length;
    let turn = 0;
    for (let i = 1; i < headings.length; i++) {
      turn += Math.abs(angleDelta(headings[i - 1], headings[i]));
    }
    return {
      meanSpeed: mean,
      variation: mean > 0 ? Math.sqrt(variance) / mean : 0,
      turn,
      duration,
    };
  }

  /**
   * How much the path curled over the last `windowMs`: the heading's signed
   * turn, positive clockwise on screen.
   */
  curl(windowMs = 160) {
    const kept = this.recent(windowMs);
    let turn = 0;
    let previous: number | null = null;
    for (let i = 1; i < kept.length; i++) {
      const dx = kept[i].x - kept[i - 1].x;
      const dy = kept[i].y - kept[i - 1].y;
      if (Math.hypot(dx, dy) < 0.8) continue;
      const heading = Math.atan2(dy, dx);
      if (previous !== null) turn += angleDelta(previous, heading);
      previous = heading;
    }
    return turn;
  }
}

/** The signed difference between two angles, in -π..π. */
export function angleDelta(from: number, to: number) {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}
