import { ToastProvider } from "@/components/common/Toast";
import { useGameZoneBackground } from "@/hooks/useGameZoneBackground";
import { Colors } from "@/styles/styles";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function Layout() {
  const { cardBg } = useGameZoneBackground();
  const pathname = usePathname();
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

    // Tint the Android system navigation (bottom button) bar to match the
    // current screen. In a standalone PWA Chrome samples the page background
    // behind the bottom safe area, so keeping the body background in sync with
    // the active theme color colours the virtual buttons accordingly.
    document.body.style.backgroundColor = cardBg;
  }, [cardBg]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    html.classList.toggle("fonts-loading", !fontsLoaded);
    html.classList.toggle("fonts-ready", fontsLoaded);
  }, [fontsLoaded]);

  // On web, expo-router keeps previous screens mounted but hides them with
  // display:none (which react-native-web flags with aria-hidden). If the
  // element that triggered navigation still holds focus, Chromium warns that
  // focus is trapped inside an aria-hidden subtree. Blurring on route change
  // clears that focus before the outgoing screen is hidden.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === "function") {
      active.blur();
    }
  }, [pathname]);

  if (!fontsLoaded && typeof document === "undefined") {
    return null;
  }

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
