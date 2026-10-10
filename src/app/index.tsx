import Home from "@/components/Home/Home";
import { useToast } from "@/components/common/Toast";
import {
  clearLastGameSession,
  consumeInterruptedGameLaunch,
  loadLastGameSession,
} from "@/data/game-menu";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { i18n } from "@/i18n";
import { reportMessage } from "@/utils/crash-reporting";
import { devModeReady } from "@/data/dev-mode";
import { isLocalDevEnvironment } from "@/utils/utils";
import { router, type Href } from "expo-router";
import { useEffect, useRef } from "react";

export default function HomeScreen() {
  const { settings, isLoading } = useGlobalSettings();
  const showToast = useToast();
  const hasCheckedResumeRef = useRef(false);

  useEffect(() => {
    if (isLoading || hasCheckedResumeRef.current) return;

    hasCheckedResumeRef.current = true;
    if (!settings.resumeLastGame || isLocalDevEnvironment()) return;

    let active = true;

    (async () => {
      try {
        // Dev mode starts at home; its saved choice may still be loading.
        if (await devModeReady()) return;
        // The app died while a game was opening last time: resuming it again
        // could crash-loop, so start from the home screen instead. A native
        // crash leaves no JavaScript error behind, so name the game here.
        const interruptedGame = await consumeInterruptedGameLaunch();
        if (interruptedGame) {
          reportMessage("Game launch never settled", { game: interruptedGame });
          await clearLastGameSession();
          if (active) showToast(i18n.t("game:errors.resumeFailed"));
          return;
        }

        const session = await loadLastGameSession();
        if (!active || !session) return;
        // Pushed (not replaced) so Android's back button from the resumed game
        // returns to the home screen instead of leaving the app.
        router.push(
          session.launchMode === "campaign"
            ? ({ pathname: session.path, params: { mode: "campaign" } } as Href)
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
