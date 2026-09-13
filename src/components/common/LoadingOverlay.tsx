import { endGameLaunch } from "@/components/common/GameLaunchOverlay";
import { useFade } from "@/hooks/useFade";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, LayerZIndexes } from "@/styles/styles";
import { useEffect, useState } from "react";
import { ActivityIndicator, Animated, Platform } from "react-native";

interface Props {
  isLoaded: boolean;
  /** A game's overlay: once loaded, it hides the tap-time launch overlay. */
  endsGameLaunch?: boolean;
}

export const LoadingOverlay = ({ isLoaded, endsGameLaunch = false }: Props) => {
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(!isLoaded);
  // Native shows the spinner from the first frame; starting hidden made it
  // blink off and on as the game opened.
  const [showSpinner, setShowSpinner] = useState(
    !isLoaded && Platform.OS !== "web",
  );

  // Short fade: it's the last thing between the tap and a playable game.
  const { isRendered: renderLoadingOverlay, opacity: loadingOpacity } = useFade(
    showLoadingOverlay,
    150,
  );

  useEffect(() => {
    if (isLoaded) {
      setShowLoadingOverlay(false);
      // The game is ready under this overlay's fade, so the tap-time one can go.
      if (endsGameLaunch) endGameLaunch();
    } else {
      setShowLoadingOverlay(true);
    }
  }, [isLoaded, endsGameLaunch]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    // Native game screens take long enough to mount that the spinner shows
    // straight away (initial state); on web the delay avoids a flash on fast
    // loads.
    if (!isLoaded && Platform.OS === "web") {
      setShowSpinner(false);
      timeoutId = setTimeout(() => setShowSpinner(true), 500);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isLoaded]);

  return renderLoadingOverlay ? (
    <Animated.View
      style={[
        flexStyles.rowCentered,
        {
          opacity: loadingOpacity,
          position: Platform.OS === "web" ? "fixed" : "absolute",
          zIndex: LayerZIndexes.loadingOverlay,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: Colors.background,
        },
      ]}
    >
      {showSpinner && <ActivityIndicator size="large" color={Colors.K400} />}
    </Animated.View>
  ) : null;
};
