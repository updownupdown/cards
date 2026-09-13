import Home from "@/components/Home/Home";
import { useToast } from "@/components/common/Toast";
import {
  clearLastGameSession,
  consumeInterruptedGameLaunch,
  loadLastGameSession,
} from "@/data/game-menu";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { isLocalDevEnvironment } from "@/utils/utils";
import { router, type Href } from "expo-router";
import { useEffect, useRef } from "react";

export default function HomeScreen() {
  const { settings, isLoading } = useGlobalSettings();
  const showToast = useToast();
  const hasCheckedResumeRef = useRef(false);
  const isDev = isLocalDevEnvironment();

  useEffect(() => {
    if (isLoading || hasCheckedResumeRef.current) return;

    hasCheckedResumeRef.current = true;
    if (!settings.resumeLastGame || isDev) return;

    let active = true;

    (async () => {
      try {
        // The app died while a game was opening last time: resuming it again
        // could crash-loop, so start from the home screen instead.
        if (await consumeInterruptedGameLaunch()) {
          await clearLastGameSession();
          if (active) showToast("Your last game couldn't be resumed.");
          return;
        }

        const session = await loadLastGameSession();
        if (!active || !session) return;
        // Pushed (not replaced) so Android's back button from the resumed game
        // returns to the home screen instead of leaving the app.
        router.push(
          session.launchMode === "nodes"
            ? ({ pathname: session.path, params: { mode: "nodes" } } as Href)
            : (session.path as Href),
        );
      } catch {
        // Storage failures just mean no resume; stay on the home screen.
      }
    })();

    return () => {
      active = false;
    };
  }, [isLoading, settings.resumeLastGame]);

  return <Home />;
}
