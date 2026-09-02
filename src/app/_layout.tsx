import { ToastProvider } from "@/components/common/Toast";
import { useGameColors } from "@/hooks/useGameColors";
import { getGameInfo, isGamePath } from "@/data/game-menu";
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
import { Stack, usePathname, SplashScreen } from "expo-router";
import { useEffect } from "react";
import { View, Platform } from "react-native";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const { colorDark } = useGameColors();
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

      const replacement = meta.cloneNode() as HTMLMetaElement;
      replacement.setAttribute("content", content);
      meta.replaceWith(replacement);
    };

    updateMeta("theme-color", colorDark);
    updateMeta("msapplication-navbutton-color", colorDark);

    // Tint the Android system navigation (bottom button) bar to match the
    // current screen. In a standalone PWA Chrome samples the page background
    // behind the bottom safe area, so keeping the body background in sync with
    // the active theme color colours the virtual buttons accordingly.
    document.body.style.backgroundColor = colorDark;
  }, [colorDark]);

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

    const rootTitle = "SoloSuite";
    const pageTitle = isGamePath(pathname)
      ? `${getGameInfo(pathname).title} ♠ ${rootTitle}`
      : rootTitle;

    document.title = pageTitle;
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === "function") {
      active.blur();
    }
  }, [pathname]);

  // Add this new useEffect to hide the splash screen once fonts are ready
  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Native apps will crash if fonts aren't loaded, so we return null.
  // Web browsers handle missing fonts gracefully, and returning null breaks SSR/Hydration.
  if (!fontsLoaded && Platform.OS !== "web") {
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
