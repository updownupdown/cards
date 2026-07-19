import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import {
  Colors,
  FontWeight,
  LayerZIndexes,
  layoutDims,
  rgba,
} from "@/styles/styles";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Animated, Platform } from "react-native";

// Define the type for the function our hook will return
type ShowToastFn = (message: string, duration?: number) => void;

const ToastContext = createContext<ShowToastFn | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

interface ToastState {
  visible: boolean;
  message: string;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { spacing } = useResponsiveMetrics();
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
  });
  const opacity = useRef(new Animated.Value(0)).current;

  const showToast = useCallback(
    (message: string, duration: number = 2500) => {
      setToast({ visible: true, message });

      // Fade In
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== "web",
      }).start();

      // Auto-hide after duration
      setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== "web",
        }).start(() => setToast({ visible: false, message: "" }));
      }, duration);
    },
    [opacity],
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast.visible && (
        <Animated.View
          style={[
            {
              opacity,
              top: opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  spacing(-100),
                  spacing(
                    layoutDims.pagePadding * 0.5 + layoutDims.menuBarPadding,
                  ),
                ], // Slide in from top
              }),
              position: "absolute",
              minHeight: spacing(
                layoutDims.menuBarHeight - layoutDims.menuBarPadding * 2,
              ),
              zIndex: LayerZIndexes.toast,
              alignSelf: "center",
              marginHorizontal: spacing(layoutDims.pagePadding),
              paddingHorizontal: spacing(20),
              paddingVertical: spacing(10),
              borderRadius: spacing(12),
              backgroundColor: rgba(Colors.K950, 0.9),
              boxShadow: `0 4px 6px ${rgba(Colors.black, 0.3)}`,
            },
          ]}
        >
          <Text
            style={{
              color: Colors.K100,
              fontSize: 16,
              fontFamily: FontWeight[400],
              textAlign: "center",
            }}
          >
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ShowToastFn => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
