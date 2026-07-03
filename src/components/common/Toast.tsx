import { Text } from "@/components/common/Text";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from "react-native";

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
            styles.toastContainer,
            {
              opacity,
              top: opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 10],
              }),
            },
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

interface Styles {
  toastContainer: ViewStyle;
  toastText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  toastContainer: {
    position: "absolute",
    zIndex: 999,
    top: -100,
    alignSelf: "center",
    marginHorizontal: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,

    borderRadius: 12,
    backgroundColor: rgba(Colors.K900, 0.8),
  },
  toastText: {
    color: Colors.K100,
    fontSize: 16,
    fontFamily: FontWeight[400],
    textAlign: "center",
  },
});

export const useToast = (): ShowToastFn => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
