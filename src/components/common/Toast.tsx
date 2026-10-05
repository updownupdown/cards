import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import {
  Colors,
  FontWeight,
  getHeaderHeightWithInset,
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
import { Animated, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ToastOptions = {
  duration?: number;
  /** Shown before the message. */
  icon?: IconName;
  /**
   * "top" slides in over the top of the screen; "belowHeader" sits under a
   * game's header, leaving its buttons in reach.
   */
  placement?: "top" | "belowHeader";
};

// Define the type for the function our hook will return
type ShowToastFn = (
  message: string,
  durationOrOptions?: number | ToastOptions,
) => void;

const ToastContext = createContext<ShowToastFn | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

interface ToastState {
  visible: boolean;
  message: string;
  icon?: IconName;
  placement: "top" | "belowHeader";
}

const HIDDEN_TOAST: ToastState = {
  visible: false,
  message: "",
  placement: "top",
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { spacing, scale } = useResponsiveMetrics();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(HIDDEN_TOAST);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, durationOrOptions?: number | ToastOptions) => {
      const options =
        typeof durationOrOptions === "number"
          ? { duration: durationOrOptions }
          : (durationOrOptions ?? {});
      const { duration = 2500, icon, placement = "top" } = options;
      setToast({ visible: true, message, icon, placement });

      // A new toast replaces the one showing, and gets its full time.
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      opacity.stopAnimation();

      // Fade In
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== "web",
      }).start();

      // Auto-hide after duration
      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null;
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== "web",
        }).start(({ finished }) => {
          if (finished) setToast(HIDDEN_TOAST);
        });
      }, duration);
    },
    [opacity],
  );

  const restingTop =
    toast.placement === "belowHeader"
      ? getHeaderHeightWithInset(insets.top, scale) + spacing(4)
      : insets.top +
        spacing(layoutDims.pagePadding * 0.5 + layoutDims.menuBarPadding);

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
                outputRange:
                  toast.placement === "belowHeader"
                    ? [restingTop - spacing(12), restingTop]
                    : [spacing(-100), restingTop], // Slide in from top, below the status bar
              }),
              // Only a message: taps go through to what's underneath.
              pointerEvents: "none",
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing(8),
            }}
          >
            {toast.icon && (
              <Icon name={toast.icon} size={spacing(22)} color={Colors.K100} />
            )}
            <Text
              style={{
                color: Colors.K100,
                fontSize: 16,
                fontFamily: FontWeight[400],
                textAlign: "center",
                flexShrink: 1,
              }}
            >
              {toast.message}
            </Text>
          </View>
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
