/**
 * Portraits as Fourier series, for the quote reveal's "harmonics": the whole
 * line at once, gaining detail as term after term of the series is added.
 * Everything here is plain math, run once per portrait; the reveal only reads
 * the result on each frame.
 *
 * Portraits are open lines (bottom left to bottom right), and a Fourier series
 * draws a closed loop, so the series is taken of the line drawn there and
 * back: its first half is the line itself.
 */

/** Absolute M, L, C and Z path data -> one polyline. */
export function flattenPath(d: string, curveSteps = 16): number[] {
  const tokens = d.match(/[MLCZ]|-?[\d.]+/g) ?? [];
  const points: number[] = [];
  let command = "";
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Z]/.test(tokens[i])) command = tokens[i++];
    if (command === "Z") {
      points.push(startX, startY);
      x = startX;
      y = startY;
      continue;
    }
    if (command === "M") {
      x = startX = num();
      y = startY = num();
      points.push(x, y);
      command = "L";
    } else if (command === "L") {
      x = num();
      y = num();
      points.push(x, y);
    } else if (command === "C") {
      const [x1, y1, x2, y2, x3, y3] = [
        num(),
        num(),
        num(),
        num(),
        num(),
        num(),
      ];
      for (let step = 1; step <= curveSteps; step++) {
        const t = step / curveSteps;
        const u = 1 - t;
        points.push(
          u * u * u * x +
            3 * u * u * t * x1 +
            3 * u * t * t * x2 +
            t * t * t * x3,
          u * u * u * y +
            3 * u * u * t * y1 +
            3 * u * t * t * y2 +
            t * t * t * y3,
        );
      }
      x = x3;
      y = y3;
    } else {
      throw new Error(`Unsupported path command "${command}"`);
    }
  }
  return points;
}

/** Arc length at each point of a flat polyline, and its path data. */
export function measurePolyline(points: number[]) {
  const lengths = [0];
  let d = `M${points[0].toFixed(1)} ${points[1].toFixed(1)}`;
  for (let i = 2; i < points.length; i += 2) {
    lengths.push(
      lengths[lengths.length - 1] +
        Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]),
    );
    d += `L${points[i].toFixed(1)} ${points[i + 1].toFixed(1)}`;
  }
  return { lengths, length: lengths[lengths.length - 1], d };
}

/** Evenly spaced points along a polyline, by arc length. */
function resample(points: number[], count: number) {
  const { lengths, length } = measurePolyline(points);
  const re = new Float64Array(count);
  const im = new Float64Array(count);
  let segment = 0;
  for (let n = 0; n < count; n++) {
    const target = (length * n) / count;
    while (lengths[segment + 1] < target) segment++;
    const span = lengths[segment + 1] - lengths[segment] || 1;
    const t = (target - lengths[segment]) / span;
    re[n] =
      points[segment * 2] + (points[segment * 2 + 2] - points[segment * 2]) * t;
    im[n] =
      points[segment * 2 + 1] +
      (points[segment * 2 + 3] - points[segment * 2 + 1]) * t;
  }
  return { re, im };
}

/** In-place radix-2 FFT; `re.length` must be a power of two. */
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = (-2 * Math.PI) / size;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let start = 0; start < n; start += size) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < size / 2; k++) {
        const a = start + k;
        const b = a + size / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const next = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = next;
      }
    }
  }
}

export type PortraitModel = {
  width: number;
  height: number;
  /** The line as drawn by hand: flat [x0, y0, ...], its lengths and path. */
  outline: number[];
  outlineLengths: number[];
  outlineLength: number;
  outlineD: string;
  /**
   * Series terms by falling size, the constant (the drawing's centre) first.
   * Each term spins `freq` whole turns while the loop (there and back) is
   * drawn once.
   */
  freq: number[];
  re: number[];
  im: number[];
  /** The line as the series draws it (the loop's first half). */
  trace: number[];
  traceLengths: number[];
  traceLength: number;
  traceD: string;
};

const SAMPLES = 1024;

/**
 * Fits the portrait into `height` (keeping its shape) and computes the series
 * that draws it, with `termCount` terms.
 */
export function buildPortrait(
  d: string,
  height: number,
  termCount = 160,
  tracePoints = 900,
): PortraitModel {
  const raw = flattenPath(d);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < raw.length; i += 2) {
    minX = Math.min(minX, raw[i]);
    maxX = Math.max(maxX, raw[i]);
    minY = Math.min(minY, raw[i + 1]);
    maxY = Math.max(maxY, raw[i + 1]);
  }
  const scale = height / (maxY - minY);
  const width = (maxX - minX) * scale;
  const outline = raw.map((value, i) =>
    i % 2 === 0 ? (value - minX) * scale : (value - minY) * scale,
  );
  const measured = measurePolyline(outline);

  // There and back, so the loop's first half is the line.
  const back: number[] = [];
  for (let i = outline.length - 4; i >= 0; i -= 2) {
    back.push(outline[i], outline[i + 1]);
  }
  const { re, im } = resample([...outline, ...back], SAMPLES);
  fft(re, im);
  const terms = Array.from({ length: SAMPLES }, (_, k) => ({
    freq: k < SAMPLES / 2 ? k : k - SAMPLES,
    re: re[k] / SAMPLES,
    im: im[k] / SAMPLES,
    radius: Math.hypot(re[k], im[k]) / SAMPLES,
  }));
  terms.sort((a, b) =>
    a.freq === 0 ? -1 : b.freq === 0 ? 1 : b.radius - a.radius,
  );
  const kept = terms.slice(0, termCount);
  const series = {
    freq: kept.map((term) => term.freq),
    re: kept.map((term) => term.re),
    im: kept.map((term) => term.im),
  };

  const trace = seriesPoints(series, termCount, tracePoints, 0.5);
  const traced = measurePolyline(trace);
  return {
    width,
    height,
    outline,
    outlineLengths: measured.lengths,
    outlineLength: measured.length,
    outlineD: measured.d,
    ...series,
    trace,
    traceLengths: traced.lengths,
    traceLength: traced.length,
    traceD: traced.d,
  };
}

/**
 * The series with only its first `terms` terms (the last one partly, if
 * fractional), sampled at `count` points along `span` of the loop.
 */
export function seriesPoints(
  series: Pick<PortraitModel, "freq" | "re" | "im">,
  terms: number,
  count: number,
  span = 1,
) {
  const xs = new Float64Array(count + 1).fill(series.re[0]);
  const ys = new Float64Array(count + 1).fill(series.im[0]);
  const last = Math.min(series.freq.length - 1, Math.ceil(terms));
  for (let k = 1; k <= last; k++) {
    const weight = Math.min(1, Math.max(0, terms - (k - 1)));
    const step = (2 * Math.PI * series.freq[k] * span) / count;
    const sr = Math.cos(step);
    const si = Math.sin(step);
    // Rotate the term's phasor point by point instead of calling cos/sin.
    let zr = series.re[k] * weight;
    let zi = series.im[k] * weight;
    for (let m = 0; m <= count; m++) {
      xs[m] += zr;
      ys[m] += zi;
      const next = zr * sr - zi * si;
      zi = zr * si + zi * sr;
      zr = next;
    }
  }
  const points: number[] = [];
  for (let m = 0; m <= count; m++) points.push(xs[m], ys[m]);
  return points;
}
