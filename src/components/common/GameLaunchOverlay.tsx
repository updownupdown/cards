import { Colors, LayerZIndexes } from "@/styles/styles";
import { router, type Href } from "expo-router";
import { useSyncExternalStore } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

// Opening a game on native pushes a heavy screen, and the JS thread is busy
// mounting it before the game route's own spinner can paint — so a tap could
// look ignored for a second or more. This overlay shows a spinner immediately
// on tap, then navigates once it has painted; the game route hides it.

const LAUNCH_TIMEOUT_MS = 8000;

let isLaunching = false;
let timeoutId: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function setLaunching(next: boolean) {
  if (isLaunching === next) return;
  isLaunching = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Navigate to a game, showing a spinner straight away on native. */
export function launchGame(href: Href) {
  if (Platform.OS === "web") {
    router.push(href);
    return;
  }

  setLaunching(true);
  clearTimeout(timeoutId);
  // Safety net in case navigation never mounts the game route.
  timeoutId = setTimeout(() => setLaunching(false), LAUNCH_TIMEOUT_MS);

  // Two frames: let the overlay commit and paint before navigating.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => router.push(href));
  });
}

/** Called by the game route once its own spinner is on screen. */
export function endGameLaunch() {
  clearTimeout(timeoutId);
  setLaunching(false);
}

export function GameLaunchOverlay() {
  const visible = useSyncExternalStore(
    subscribe,
    () => isLaunching,
    () => false,
  );

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color={Colors.K400} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: LayerZIndexes.loadingOverlay,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});
