import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

type InstallOutcome = "accepted" | "dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: InstallOutcome;
    platform: string;
  }>;
};

/**
 * Which set of install instructions fits the current browser.
 * - iosSafari / iosOther: Share button → "Add to Home Screen"
 * - macSafari: File → "Add to Dock" (Safari 17+)
 * - android: browser menu → "Install app" / "Add to Home screen"
 * - desktop: install icon in the address bar or browser menu (Chrome, Edge…)
 * - inApp: in-app browsers (Instagram, Facebook…) can't install; open in a real browser
 * - unsupported: desktop Firefox has no way to install web apps
 */
export type InstallBrowser =
  | "iosSafari"
  | "iosOther"
  | "macSafari"
  | "android"
  | "desktop"
  | "inApp"
  | "unsupported";

const DISPLAY_MODE_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: fullscreen)",
  "(display-mode: minimal-ui)",
  "(display-mode: window-controls-overlay)",
];

function detectStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  const hasStandaloneNavigatorFlag =
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true;

  return (
    hasStandaloneNavigatorFlag ||
    DISPLAY_MODE_QUERIES.some(
      (query) => window.matchMedia?.(query).matches === true,
    )
  );
}

function detectInstallBrowser(): InstallBrowser {
  if (typeof navigator === "undefined") {
    return "desktop";
  }

  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  const isIos =
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);

  if (
    /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|MicroMessenger|TikTok|Snapchat/i.test(
      ua,
    )
  ) {
    return "inApp";
  }
  if (isIos) {
    return /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) ? "iosOther" : "iosSafari";
  }
  if (/android/i.test(ua)) {
    return "android";
  }
  if (/firefox/i.test(ua)) {
    return "unsupported";
  }
  if (
    /macintosh/i.test(ua) &&
    /safari/i.test(ua) &&
    !/chrome|chromium|edg\//i.test(ua)
  ) {
    return "macSafari";
  }
  return "desktop";
}

export function usePwaInstallPrompt() {
  const isWeb = Platform.OS === "web";
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  // Read synchronously so an installed app never flashes the notice.
  const [isStandalone, setIsStandalone] = useState(
    () => isWeb && detectStandalone(),
  );
  const [browser] = useState<InstallBrowser>(() =>
    isWeb ? detectInstallBrowser() : "desktop",
  );

  useEffect(() => {
    if (!isWeb || typeof window === "undefined") {
      return;
    }

    setIsStandalone(detectStandalone());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    const onDisplayModeChange = () => setIsStandalone(detectStandalone());
    const mediaQueries = DISPLAY_MODE_QUERIES.map((query) =>
      window.matchMedia?.(query),
    ).filter((mq): mq is MediaQueryList => mq != null);

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    mediaQueries.forEach((mq) =>
      mq.addEventListener?.("change", onDisplayModeChange),
    );

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      mediaQueries.forEach((mq) =>
        mq.removeEventListener?.("change", onDisplayModeChange),
      );
    };
  }, [isWeb]);

  const canPromptInstall = isWeb && !isStandalone && deferredPrompt != null;

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return null;
    }

    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;

    setDeferredPrompt(null);

    return result.outcome;
  }, [deferredPrompt]);

  return {
    isWeb,
    browser,
    isStandalone,
    canPromptInstall,
    promptInstall,
  };
}
