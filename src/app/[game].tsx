import { useToast } from "@/components/common/Toast";
import {
  clearGameLaunchPending,
  clearLastGameSession,
  GAME_LAUNCH_STABLE_MS,
  markGameLaunchPending,
} from "@/data/game-menu";
import { getGameComponentByPath } from "@/data/games-router";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import { Colors } from "@/styles/styles";
import {
  router,
  useLocalSearchParams,
  Redirect,
  type ErrorBoundaryProps,
} from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, View } from "react-native";
import { endGameLaunch } from "@/components/common/GameLaunchOverlay";

export function generateStaticParams() {
  return GAME_DEFINITIONS.map(({ path }) => ({ game: path.slice(1) }));
}

function GameSpinner() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.background,
      }}
    >
      <ActivityIndicator size="large" color={Colors.K400} />
    </View>
  );
}

/**
 * Catches render errors thrown by a game. The saved session is the most likely
 * cause (and would otherwise be resumed straight back into the same crash), so
 * drop it and return to the home screen.
 */
export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  const showToast = useToast();

  useEffect(() => {
    console.error("Game crashed, returning home:", error);
    let active = true;

    void clearLastGameSession()
      .catch(() => {})
      .finally(() => {
        if (!active) return;
        showToast("Something went wrong with that game.");
        router.replace("/");
      });

    return () => {
      active = false;
    };
  }, [error, showToast]);

  return <GameSpinner />;
}

export default function DynamicGameRoute() {
  const { game } = useLocalSearchParams<{ game: string }>();
  // On native, mounting a game screen blocks the JS thread for a noticeable
  // moment. Paint a spinner first so the tap responds immediately, then mount
  // the game two frames later. Web renders directly to keep static output.
  const [isReady, setIsReady] = useState(Platform.OS === "web");

  useEffect(() => {
    if (isReady) return;

    let secondFrame: number | undefined;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setIsReady(true));
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
    };
  }, [isReady]);

  // Native only: a fatal error there kills the app before any error boundary
  // or cleanup runs, so the flag survives and the next launch skips resume.
  // Web doesn't need it (a crash doesn't kill the page), and a quick refresh
  // there would otherwise discard the session.
  useEffect(() => {
    if (Platform.OS === "web" || !game) return;

    void markGameLaunchPending(game).catch(() => {});
    const timer = setTimeout(() => {
      void clearGameLaunchPending().catch(() => {});
    }, GAME_LAUNCH_STABLE_MS);

    return () => {
      clearTimeout(timer);
      void clearGameLaunchPending().catch(() => {});
    };
  }, [game]);

  // The tap-time overlay stays up until the game has loaded (LoadingOverlay
  // ends it), covering the screen transition and this route's spinner, which
  // otherwise flashed the home screen between them. End it here if the game is
  // left or never mounts.
  useEffect(() => endGameLaunch, []);

  // A game opened with nothing behind it (a deep link, or Android restoring
  // the app) would otherwise close the app on back; go home instead.
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (router.canGoBack()) return false;
        router.replace("/");
        return true;
      },
    );

    return () => subscription.remove();
  }, []);

  // Verify parameters exist in your core definitions structure
  const GameComponent = game ? getGameComponentByPath(game) : null;
  // Gracefully boot back to root if game routing configurations fail
  if (!GameComponent) {
    return <Redirect href="/" />;
  }

  if (!isReady) {
    return <GameSpinner />;
  }

  // Keyed by game: when one game replaces another on this screen, the new one
  // starts fresh instead of inheriting the previous game's state.
  return <GameComponent key={game} />;
}
