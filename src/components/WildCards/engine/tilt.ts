import { useEffect, useRef } from "react";
import { Platform } from "react-native";

type SensorsModule = typeof import("expo-sensors");

// Loaded lazily and optionally, as haptics are: a build without the native
// module (an older development client) just plays without tilt.
let sensorsModule: SensorsModule | null | undefined;

function getSensors(): SensorsModule | null {
  if (sensorsModule === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      sensorsModule = require("expo-sensors") as SensorsModule;
    } catch {
      sensorsModule = null;
    }
  }
  return sensorsModule;
}

export type Tilt = {
  /** Whether readings are coming in at all. */
  live: boolean;
  /** Right edge down is positive; about the sine of the angle. */
  x: number;
  /** Top edge down (tipped away) is positive; about the sine of the angle. */
  y: number;
  /**
   * How much the phone is being jolted: a quickly decaying measure of the
   * change between readings, about 0 held still and 1 or more when shaken.
   */
  jolt: number;
};

/**
 * The phone's tilt, read from the accelerometer into a ref (not state, so
 * readings never re-render anything). The platforms disagree on the axes'
 * signs; they are made to agree here.
 */
export function useTilt(enabled = true) {
  const tilt = useRef<Tilt>({ live: false, x: 0, y: 0, jolt: 0 });

  useEffect(() => {
    if (!enabled) return;
    const accelerometer = getSensors()?.Accelerometer;
    if (!accelerometer) return;

    let previous: { x: number; y: number; z: number } | null = null;
    let subscription: { remove: () => void } | null = null;
    try {
      // The web reports at the browser's own rate.
      if (Platform.OS !== "web") accelerometer.setUpdateInterval(20);
      subscription = accelerometer.addListener(({ x, y, z }) => {
        const reading = normalize(x, y, z);
        const state = tilt.current;
        state.live = true;
        // Smoothed a little: raw readings are jittery.
        state.x += (reading.x - state.x) * 0.35;
        state.y += (reading.y - state.y) * 0.35;
        if (previous) {
          const change =
            Math.abs(reading.x - previous.x) +
            Math.abs(reading.y - previous.y) +
            Math.abs(reading.z - previous.z);
          state.jolt = Math.max(state.jolt * 0.9, change * 6);
        }
        previous = reading;
      });
    } catch {
      subscription = null;
    }
    return () => subscription?.remove();
  }, [enabled]);

  return tilt;
}

function normalize(x: number, y: number, z: number) {
  if (Platform.OS === "android") return { x: -x, y: -y, z: -z };
  if (Platform.OS === "web") {
    // The web reports the orientation's angles (radians), not g-forces.
    return { x: Math.sin(x), y: -Math.sin(y), z: 0 };
  }
  return { x, y, z };
}

/**
 * Mobile Safari only reports motion once the player allows it, which it
 * asks for from a tap. Call from a touch; it does nothing elsewhere.
 */
export function requestTiltPermission() {
  if (Platform.OS !== "web") return;
  const accelerometer = getSensors()?.Accelerometer;
  accelerometer?.requestPermissionsAsync().catch(() => {});
}
