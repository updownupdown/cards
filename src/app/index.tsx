import Home from "@/components/Home/Home";
import { loadLastGameSession } from "@/data/game-menu";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { isLocalDevEnvironment } from "@/utils/utils";
import { router, type Href } from "expo-router";
import { useEffect, useRef } from "react";

export default function HomeScreen() {
  const { settings, isLoading } = useGlobalSettings();
  const hasCheckedResumeRef = useRef(false);
  const isDev = isLocalDevEnvironment();

  useEffect(() => {
    if (isLoading || hasCheckedResumeRef.current) return;

    hasCheckedResumeRef.current = true;
    if (!settings.resumeLastGame || isDev) return;

    let active = true;

    (async () => {
      const session = await loadLastGameSession();
      if (!active || !session) return;
      router.replace(session.path as Href);
    })();

    return () => {
      active = false;
    };
  }, [isLoading, settings.resumeLastGame]);

  return <Home />;
}
