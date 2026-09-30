export type Stage = {
  /** The world's size, in world units. */
  W: number;
  H: number;
  /** Screen points per world unit. */
  scale: number;
  /** Where the world's top left corner sits on the screen. */
  offsetX: number;
  offsetY: number;
  /** World units at the top covered by the header. */
  topClear: number;
  /** World units at the bottom covered by the system bars. */
  bottomClear: number;
};

/**
 * Portrait games are 400 units wide and landscape ones 450 tall, whatever
 * the screen, so their physics play the same everywhere. The other side
 * follows the screen's shape within limits, and the world is centred when
 * the screen is shaped outside them.
 */
export function fitStage({
  width,
  height,
  orientation,
  headerHeight,
  bottomInset,
}: {
  width: number;
  height: number;
  orientation: "portrait" | "landscape";
  headerHeight: number;
  bottomInset: number;
}): Stage {
  let W: number;
  let H: number;
  if (orientation === "portrait") {
    W = 400;
    H = clamp((W * height) / width, 600, 900);
  } else {
    H = 450;
    W = clamp((H * width) / height, 700, 1000);
  }
  const scale = Math.min(width / W, height / H);
  const offsetX = (width - W * scale) / 2;
  const offsetY = (height - H * scale) / 2;
  return {
    W,
    H,
    scale,
    offsetX,
    offsetY,
    topClear: Math.max(0, (headerHeight - offsetY) / scale),
    bottomClear: Math.max(0, (bottomInset - offsetY) / scale),
  };
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number) =>
  from + (to - from) * t;

export const random = (min: number, max: number) =>
  min + Math.random() * (max - min);

export const pick = <T>(list: readonly T[]): T =>
  list[Math.floor(Math.random() * list.length)];
