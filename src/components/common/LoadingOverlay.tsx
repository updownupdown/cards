import { useFade } from "@/hooks/useFade";
import { layoutStyles } from "@/styles/layoutStyles";
import { Colors } from "@/styles/styles";
import { useEffect, useState } from "react";
import { ActivityIndicator, Animated } from "react-native";

interface Props {
  isLoaded: boolean;
}

export const LoadingOverlay = ({ isLoaded }: Props) => {
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(!isLoaded);
  const { isRendered: renderLoadingOverlay, opacity: loadingOpacity } = useFade(
    showLoadingOverlay,
    300,
  );

  useEffect(() => {
    if (isLoaded) {
      setShowLoadingOverlay(false);
    }
  }, [isLoaded]);

  return (
    renderLoadingOverlay && (
      <Animated.View
        style={[layoutStyles.gameLoadingOverlay, { opacity: loadingOpacity }]}
      >
        <ActivityIndicator size="large" color={Colors.K400} />
      </Animated.View>
    )
  );
};
