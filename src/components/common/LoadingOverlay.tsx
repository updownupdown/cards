import { useFade } from "@/hooks/useFade";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { useEffect, useState } from "react";
import { ActivityIndicator, Animated } from "react-native";

interface Props {
  isLoaded: boolean;
}

export const LoadingOverlay = ({ isLoaded }: Props) => {
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(!isLoaded);
  const [showSpinner, setShowSpinner] = useState(false);

  const { isRendered: renderLoadingOverlay, opacity: loadingOpacity } = useFade(
    showLoadingOverlay,
    300,
  );

  useEffect(() => {
    if (isLoaded) {
      setShowLoadingOverlay(false);
    } else {
      setShowLoadingOverlay(true);
    }
  }, [isLoaded]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (!isLoaded) {
      setShowSpinner(false);

      timeoutId = setTimeout(() => {
        setShowSpinner(true);
      }, 500);
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
          position: "fixed",
          zIndex: 13, // over the header
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
