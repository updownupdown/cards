export function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
