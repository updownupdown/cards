import {
  LAUNCH_SPLASH_ID,
  SPLASH_MAX_WAIT_MS,
} from "@/components/common/launch-lockup";
import { SplashScreen } from "expo-router";
import { useEffect, useSyncExternalStore } from "react";
import { Platform } from "react-native";

// The splash (the system's on Android and iOS, the page's own on the web,
// +html.tsx) stays until the first screen is drawn, then goes at once: no
// intro after it, so the app is in reach as soon as it's ready.

let screenReady = false;
let done = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether the splash has gone. */
export function useLaunchSplashDone() {
  return useSyncExternalStore(
    subscribe,
    () => done,
    () => false,
  );
}

/** Home's first tab is drawn, pictures and all: the splash can go. */
export function markLaunchScreenReady() {
  if (screenReady) return;
  screenReady = true;
  notify();
}

/** Takes the splash away at once (also the error screen). */
export function dismissLaunchSplash() {
  if (done) return;
  done = true;
  if (Platform.OS === "web") {
    if (typeof document !== "undefined") {
      document.getElementById(LAUNCH_SPLASH_ID)?.remove();
    }
  } else {
    SplashScreen.hide();
  }
  notify();
}

/**
 * Mounted once the app can draw (fonts, language and colour theme ready).
 * With `waitForScreen` (the app opened on Home), the splash stays until Home
 * has drawn its first tab (markLaunchScreenReady), so its pictures don't pop
 * in; otherwise, or after SPLASH_MAX_WAIT_MS, it goes now.
 */
export function LaunchSplash({ waitForScreen }: { waitForScreen: boolean }) {
  useEffect(() => {
    if (done) return;
    if (!waitForScreen || screenReady) {
      dismissLaunchSplash();
      return;
    }
    const unsubscribe = subscribe(() => {
      if (screenReady) dismissLaunchSplash();
    });
    const timer = setTimeout(dismissLaunchSplash, SPLASH_MAX_WAIT_MS);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [waitForScreen]);
  return null;
}
