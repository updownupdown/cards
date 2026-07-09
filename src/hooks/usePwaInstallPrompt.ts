import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type InstallOutcome = "accepted" | "dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: InstallOutcome;
    platform: string;
  }>;
};

function isIosUserAgent(userAgent: string) {
  return /iphone|ipad|ipod/i.test(userAgent);
}

function detectStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  const hasStandaloneNavigatorFlag =
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true;

  return (
    hasStandaloneNavigatorFlag ||
    window.matchMedia?.("(display-mode: standalone)").matches === true
  );
}

export function usePwaInstallPrompt() {
  const isWeb = Platform.OS === "web";
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

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

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [isWeb]);

  const userAgent =
    isWeb && typeof navigator !== "undefined" ? navigator.userAgent : "";

  const isIos = useMemo(() => isIosUserAgent(userAgent), [userAgent]);
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
    isIos,
    isStandalone,
    canPromptInstall,
    promptInstall,
  };
}
