import { ToastProvider } from "@/components/common/Toast";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { Colors } from "@/styles/styles";
import {
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function Layout() {
  const { cardBg } = useGameZoneBackground();
  const [fontsLoaded] = useFonts({
    Outfit_200ExtraLight,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const updateMeta = (name: string, content: string) => {
      const meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) return;
      meta.setAttribute("content", content);
    };

    updateMeta("theme-color", cardBg);
    updateMeta("msapplication-navbutton-color", cardBg);
  }, [cardBg]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    html.classList.toggle("fonts-loading", !fontsLoaded);
    html.classList.toggle("fonts-ready", fontsLoaded);
  }, [fontsLoaded]);

  if (!fontsLoaded && typeof document === "undefined") {
    return null;
  }

  return (
    <ToastProvider>
      <View
        style={[
          {
            flex: 1,
            userSelect: "none",
            backgroundColor: Colors.background,
          },
        ]}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
            fullScreenGestureEnabled: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        />
      </View>
    </ToastProvider>
  );
}
